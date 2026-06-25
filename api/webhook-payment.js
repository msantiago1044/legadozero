/**
 * LegadoZero — Lemon Squeezy Webhook Handler
 * Route: /api/webhook-payment
 *
 * Triggered by Lemon Squeezy when a payment is completed.
 * Activates the vault (is_paid = true) in Supabase.
 *
 * Setup in Lemon Squeezy dashboard:
 *   Webhook URL: https://legadozero.com/api/webhook-payment
 *   Events: order_created
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Verify Lemon Squeezy signature ──────────────────────────────
  const rawBody = await getRawBody(req);
  const signature = req.headers["x-signature"];
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (
    !signature ||
    !crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex")
    )
  ) {
    console.error("[Webhook] Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody.toString());
  const eventName = event.meta?.event_name;

  console.log(`[Webhook] Received event: ${eventName}`);

  // ── Handle order_created ─────────────────────────────────────────
  if (eventName === "order_created") {
    const order = event.data?.attributes;
    const vaultId = event.meta?.custom_data?.vault_id;
    const customerEmail = order?.user_email;
    const orderId = event.data?.id;
    const status = order?.status;

    if (status !== "paid") {
      console.log(`[Webhook] Order ${orderId} not paid yet (status: ${status})`);
      return res.status(200).json({ ok: true, skipped: true });
    }

    if (!vaultId && !customerEmail) {
      console.error("[Webhook] No vault_id or email in order");
      return res.status(400).json({ error: "Missing vault identifier" });
    }

    // Update vault by vault_id (preferred) or by email
    const query = vaultId
      ? supabase.from("vaults").update({
          is_paid: true,
          lemon_order_id: orderId,
          last_pulse_at: new Date().toISOString(), // Start the 60-day clock
        }).eq("id", vaultId)
      : supabase.from("vaults").update({
          is_paid: true,
          lemon_order_id: orderId,
          last_pulse_at: new Date().toISOString(),
        }).eq("user_email", customerEmail);

    const { error } = await query;

    if (error) {
      console.error("[Webhook] Supabase update error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Webhook] Vault activated for ${vaultId || customerEmail}`);
    return res.status(200).json({ ok: true, activated: true });
  }

  // Handle subscription_cancelled (future use)
  if (eventName === "subscription_cancelled") {
    console.log("[Webhook] Subscription cancelled — one-time product, no action needed.");
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true, unhandled: eventName });
}

// Helper: read raw body for signature verification
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
