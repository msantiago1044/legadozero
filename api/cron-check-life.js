/**
 * LegadoZero — Vercel Cron Function
 * Route: /api/cron-check-life
 * Schedule: 0 9 * * *  (every day at 9:00 AM UTC — configure in vercel.json)
 *
 * This function:
 * 1. Queries Supabase for all active vaults past their pulse thresholds
 * 2. Sends email (Resend) + WhatsApp (Twilio) warnings at 7-day intervals
 * 3. Triggers vault release at 60 days — sends inheritance notification
 * 4. Calls GLM-4 API to generate heir summary before sending
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import Twilio from "twilio";

// ─── Clients ──────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role bypasses RLS
);

const resend = new Resend(process.env.RESEND_API_KEY);

const twilio = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_WHATSAPP_FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

// ─── Thresholds ───────────────────────────────────────────────────
const DAYS = (n) => n * 24 * 60 * 60 * 1000;
const WARNING_INTERVAL_DAYS = 7;     // Send warnings every 7 days
const MAX_WARNINGS = 8;              // Max 8 soft warnings
const CRITICAL_DAY_30 = 30;         // First critical alert
const TRIGGER_DAY = 60;             // Release vault

// ─── Main Handler ─────────────────────────────────────────────────
export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (not a random request)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  console.log(`[LegadoZero Cron] Starting life check at ${now.toISOString()}`);

  try {
    // Fetch all active, paid vaults
    const { data: vaults, error } = await supabase
      .from("vaults")
      .select("*")
      .eq("status", "active")
      .eq("is_paid", true)
      .not("last_pulse_at", "is", null);

    if (error) throw error;
    console.log(`[Cron] Checking ${vaults.length} active vaults`);

    const results = await Promise.allSettled(
      vaults.map((vault) => processVault(vault, now))
    );

    const summary = results.reduce(
      (acc, r) => {
        if (r.status === "fulfilled") acc.processed++;
        else { acc.errors++; console.error("[Cron] Error:", r.reason); }
        return acc;
      },
      { processed: 0, errors: 0 }
    );

    console.log(`[Cron] Done. Processed: ${summary.processed}, Errors: ${summary.errors}`);
    return res.status(200).json({ ok: true, ...summary });

  } catch (err) {
    console.error("[Cron] Fatal error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Per-Vault Logic ──────────────────────────────────────────────
async function processVault(vault, now) {
  const lastPulse = new Date(vault.last_pulse_at);
  const daysSince = (now - lastPulse) / (1000 * 60 * 60 * 24);
  const heirs = vault.heirs_contacts || [];

  console.log(`[Vault ${vault.id}] Days since pulse: ${daysSince.toFixed(1)}`);

  // ── Case 1: TRIGGER — 60 days elapsed ──────────────────────────
  if (daysSince >= TRIGGER_DAY) {
    await triggerVault(vault, heirs);
    return;
  }

  // ── Case 2: CRITICAL — Day 30–59 ────────────────────────────────
  if (daysSince >= CRITICAL_DAY_30) {
    const daysLeft = Math.ceil(TRIGGER_DAY - daysSince);
    await sendCriticalAlert(vault, daysLeft);
    return;
  }

  // ── Case 3: WARNING — every 7 days ─────────────────────────────
  if (
    daysSince >= WARNING_INTERVAL_DAYS &&
    vault.notifications_sent < MAX_WARNINGS
  ) {
    // Check if we already sent a warning recently (avoid duplicates)
    const daysSinceLastWarning = daysSince % WARNING_INTERVAL_DAYS;
    if (daysSinceLastWarning < 1) { // Within 24h window of the 7-day mark
      await sendWarningAlert(vault, daysSince);
    }
    return;
  }

  console.log(`[Vault ${vault.id}] No action needed. ${daysSince.toFixed(1)} days since pulse.`);
}

// ─── Trigger Vault (Day 60) ───────────────────────────────────────
async function triggerVault(vault, heirs) {
  console.log(`[Vault ${vault.id}] TRIGGERING — 60 days elapsed`);

  // 1. Generate GLM summary for heirs
  const glmSummary = await generateGLMSummary(vault);

  // 2. Update vault status in DB
  await supabase
    .from("vaults")
    .update({
      status: "triggered",
      triggered_at: new Date().toISOString(),
      alert_level: "normal", // Reset — vault is now in released state
      glm_heir_summary: glmSummary,
    })
    .eq("id", vault.id);

  // 3. Log the trigger event
  await supabase.from("pulse_log").insert({
    vault_id: vault.id,
    event_type: "triggered",
    metadata: { heirs_notified: heirs.length },
  });

  // 4. Notify all heirs
  const inheritanceUrl = `${process.env.APP_URL}/boveda/descifrar/${vault.id}`;

  await Promise.all(
    heirs.map((heir) =>
      notifyHeir(heir, vault, glmSummary, inheritanceUrl)
    )
  );

  console.log(`[Vault ${vault.id}] Triggered. ${heirs.length} heirs notified.`);
}

// ─── Notify a Single Heir ─────────────────────────────────────────
async function notifyHeir(heir, vault, glmSummary, inheritanceUrl) {
  const emailHtml = buildHeirEmail(heir, vault, glmSummary, inheritanceUrl);
  const whatsappMsg = buildHeirWhatsApp(heir, vault, inheritanceUrl);

  await Promise.allSettled([
    // Email
    resend.emails.send({
      from: `LegadoZero <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
      to: heir.email,
      subject: `📬 Has recibido el legado digital de ${vault.user_email}`,
      html: emailHtml,
    }),

    // WhatsApp (only if number provided)
    heir.whatsapp
      ? twilio.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${heir.whatsapp}`,
        body: whatsappMsg,
      })
      : Promise.resolve(),
  ]);
}

// ─── Warning Alert (7-day intervals) ─────────────────────────────
async function sendWarningAlert(vault, daysSince) {
  const daysLeft = Math.ceil(60 - daysSince);
  console.log(`[Vault ${vault.id}] Warning — ${daysLeft} days left`);

  await resend.emails.send({
    from: `LegadoZero <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
    to: vault.user_email,
    subject: `⚠️ LegadoZero — Renueva tu pulso (${daysLeft} días restantes)`,
    html: buildWarningEmail(vault, daysLeft),
  });

  await supabase
    .from("vaults")
    .update({
      notifications_sent: (vault.notifications_sent || 0) + 1,
      alert_level: "warning",
    })
    .eq("id", vault.id);

  await supabase.from("pulse_log").insert({
    vault_id: vault.id,
    event_type: "warning_sent",
    metadata: { days_since_pulse: daysSince, days_left: daysLeft },
  });
}

// ─── Critical Alert (Day 30+) ─────────────────────────────────────
async function sendCriticalAlert(vault, daysLeft) {
  console.log(`[Vault ${vault.id}] CRITICAL — ${daysLeft} days left`);

  await resend.emails.send({
    from: `LegadoZero <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
    to: vault.user_email,
    subject: `🚨 [ACCIÓN REQUERIDA] Tu bóveda se libera en ${daysLeft} días | LegadoZero`,
    html: buildCriticalEmail(vault, daysLeft),
  });

  await supabase
    .from("vaults")
    .update({ alert_level: "critical" })
    .eq("id", vault.id);

  await supabase.from("pulse_log").insert({
    vault_id: vault.id,
    event_type: "critical_sent",
    metadata: { days_left: daysLeft },
  });
}

// ─── GLM-4 Summary Generation ─────────────────────────────────────
async function generateGLMSummary(vault) {
  try {
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente empático que ayuda a redactar mensajes delicados para herederos de legados digitales. Sé sobrio, respetuoso y claro. Responde en el idioma del usuario. Máximo 150 palabras.",
          },
          {
            role: "user",
            content: `El titular de una bóveda digital en LegadoZero (${vault.user_email}) no ha respondido en 60 días y el sistema ha activado el protocolo de herencia. 
Número de archivos almacenados: ${vault.heir_packages?.length || 0} paquetes de herederos.
Redacta un breve mensaje introductorio para los herederos explicando que recibirán acceso al legado digital del titular y que deben usar el enlace para desencriptarlo.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("[GLM] Summary generation failed:", err);
    return null;
  }
}

// ─── Email Templates ──────────────────────────────────────────────
function buildHeirEmail(heir, vault, glmSummary, inheritanceUrl) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #020617 0%, #1e293b 100%); padding: 40px; text-align: center; }
  .header h1 { color: #f8fafc; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { color: #94a3b8; margin: 8px 0 0; font-size: 14px; }
  .badge { display: inline-block; background: #7c3aed; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 16px; }
  .body { padding: 40px; }
  .body h2 { color: #0f172a; font-size: 20px; margin: 0 0 16px; }
  .body p { color: #475569; line-height: 1.6; margin: 0 0 16px; }
  .summary-box { background: #f1f5f9; border-left: 4px solid #7c3aed; padding: 20px; border-radius: 0 8px 8px 0; margin: 24px 0; }
  .summary-box p { color: #334155; margin: 0; font-style: italic; }
  .cta { display: block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; text-align: center; font-weight: 700; font-size: 16px; margin: 32px 0; }
  .url-fallback { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 12px; color: #64748b; word-break: break-all; }
  .footer { padding: 24px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  .footer p { color: #94a3b8; font-size: 12px; margin: 0; text-align: center; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>🔐 LegadoZero</h1>
    <p>Custodia Criptográfica de Legados Digitales</p>
    <span class="badge">Protocolo de Herencia Activado</span>
  </div>
  <div class="body">
    <h2>Hola, ${heir.name}</h2>
    <p>Has sido designado/a como heredero/a en una bóveda digital de LegadoZero. El titular <strong>${vault.user_email}</strong> no ha confirmado su vitalidad en los últimos 60 días, por lo que el sistema ha activado automáticamente el protocolo de herencia.</p>
    ${glmSummary
      ? `<div class="summary-box"><p>${glmSummary}</p></div>`
      : ""
    }
    <p>Para acceder al legado digital, haz clic en el botón a continuación. El descifrado ocurre completamente en tu dispositivo — LegadoZero no puede ver el contenido.</p>
    <a href="${inheritanceUrl}" class="cta">🔓 Acceder al Legado Digital</a>
    <p style="font-size:13px;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
    <div class="url-fallback">${inheritanceUrl}</div>
    <p>Necesitarás el <strong>Token de Herencia</strong> que recibirás por separado (vía WhatsApp o un segundo correo) para completar el descifrado.</p>
  </div>
  <div class="footer">
    <p>LegadoZero — Cifrado de grado bancario. Tu privacidad, garantizada.<br>
    Este es un mensaje automático. Para soporte: soporte@legadozero.com</p>
  </div>
</div>
</body></html>`;
}

function buildWarningEmail(vault, daysLeft) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f8fafc;padding:40px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:48px;">⚠️</div>
    <h2 style="color:#0f172a;margin:16px 0 8px;">Confirma que sigues aquí</h2>
    <p style="color:#64748b;margin:0;">Tu bóveda se liberará en <strong>${daysLeft} días</strong> si no actúas.</p>
  </div>
  <a href="${process.env.APP_URL}/dashboard" style="display:block;background:#020617;color:white;text-decoration:none;padding:16px;border-radius:8px;text-align:center;font-weight:700;font-size:16px;margin:24px 0;">
    Estoy Vivo — Renovar Pulso
  </a>
  <p style="color:#94a3b8;font-size:13px;text-align:center;">Si no reconoces este servicio, ignora este correo.</p>
</div>
</body></html>`;
}

function buildCriticalEmail(vault, daysLeft) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#fef2f2;padding:40px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;border:2px solid #fca5a5;box-shadow:0 4px 24px rgba(239,68,68,0.12);">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:48px;">🚨</div>
    <h2 style="color:#dc2626;margin:16px 0 8px;">[ACCIÓN REQUERIDA]</h2>
    <p style="color:#0f172a;font-size:18px;font-weight:600;margin:0;">Tu bóveda se libera en <span style="color:#dc2626;">${daysLeft} días</span></p>
    <p style="color:#64748b;margin:8px 0 0;">Han pasado ${60 - daysLeft} días sin confirmación de vitalidad.</p>
  </div>
  <a href="${process.env.APP_URL}/dashboard" style="display:block;background:#dc2626;color:white;text-decoration:none;padding:20px;border-radius:8px;text-align:center;font-weight:700;font-size:18px;margin:24px 0;">
    ¡ESTOY VIVO! — Confirmar Ahora
  </a>
  <p style="color:#94a3b8;font-size:13px;text-align:center;">LegadoZero — Tu privacidad hoy. Tu certeza para siempre.</p>
</div>
</body></html>`;
}

function buildHeirWhatsApp(heir, vault, inheritanceUrl) {
  return `🔐 *LegadoZero — Protocolo de Herencia*

Hola ${heir.name}, has recibido acceso al legado digital de *${vault.user_email}*.

El titular no confirmó su vitalidad en 60 días, activando el protocolo automático.

🔗 Accede aquí:
${inheritanceUrl}

Necesitarás el *Token de Herencia* (te lo enviamos por correo) para descifrar el contenido.

_LegadoZero — Cifrado de grado bancario_`;
}