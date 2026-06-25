import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, ShieldAlert, ShieldOff, Heart, Upload, FileText,
  Users, Download, Lock, Unlock, AlertTriangle, CheckCircle,
  Trash2, Plus, Eye, EyeOff, Zap, Clock, HardDrive, Globe,
  ChevronRight, X, Loader2, Sparkles
} from "lucide-react";
import {
  deriveKey, encryptVaultPayload, decryptVaultPayload,
  encryptFile, decryptFile, generateSalt, bufferToBase64,
  base64ToBuffer, checkBiometricSupport
} from "./lib/crypto";
import { useTranslation } from "./i18n/translations";
import mockData from "./lib/mockVault.json";

// ─── Constants ────────────────────────────────────────────────────
const STORAGE_LIMIT = 1073741824; // 1 GB
const MAX_HEIRS = 19;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const LEMON_LINK = import.meta.env.VITE_LEMON_CHECKOUT_URL;
const GLM_API_KEY = import.meta.env.VITE_GLM_API_KEY;
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === "true";

// ─── Helpers ──────────────────────────────────────────────────────
function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
}

function pad(n) { return String(n).padStart(2, "0"); }

function getVaultState(vault) {
  if (!vault?.is_paid) return "unpaid";
  if (vault.status === "triggered") return "released";
  return vault.alert_level || "normal";
}

// ─── App Entry ────────────────────────────────────────────────────
export default function App() {
  const { t, tr, lang } = useTranslation();
  const path = window.location.pathname;
  const heirMatch = path.match(/^\/boveda\/descifrar\/([a-f0-9-]{36})$/i);

  if (heirMatch) return <HeirDecryptView vaultId={heirMatch[1]} t={t} tr={tr} />;
  return <OwnerDashboard t={t} tr={tr} lang={lang} />;
}

// ═══════════════════════════════════════════════════════════════════
//  OWNER DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function OwnerDashboard({ t, tr, lang }) {
  const [vault, setVault] = useState(null);
  const [tab, setTab] = useState("pulse");
  const [loading, setLoading] = useState(true);
  const [masterPassword, setMasterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pulseMsg, setPulseMsg] = useState("");
  const [pulsing, setPulsing] = useState(false);
  const [demoState, setDemoState] = useState("active");

  useEffect(() => {
    loadVault();
  }, [demoState]);

  async function loadVault() {
    setLoading(true);
    if (IS_DEMO) {
      await new Promise(r => setTimeout(r, 600));
      setVault(mockData.states[demoState]);
    } else {
      // Real Supabase fetch
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/vaults?select=*&limit=1`, {
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        });
        const data = await res.json();
        setVault(data[0] || null);
      } catch { setVault(null); }
    }
    setLoading(false);
  }

  async function handlePulse() {
    setPulsing(true);
    setPulseMsg("");
    try {
      if (!IS_DEMO) {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/renew_pulse`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
          },
          body: JSON.stringify({ p_vault_id: vault.id }),
        });
      }
      setPulseMsg(t.pulse.confirmed);
      setVault(v => ({ ...v, last_pulse_at: new Date().toISOString(), days_remaining: 60, alert_level: "normal" }));
    } catch { setPulseMsg("Error al renovar pulso. Intenta de nuevo."); }
    setPulsing(false);
  }

  if (loading) return <LoadingScreen t={t} />;

  const vaultState = getVaultState(vault);
  const isCritical = vaultState === "critical";
  const isReleased = vaultState === "released";

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${
      isCritical ? "bg-red-950" : isReleased ? "bg-slate-950" : "bg-slate-950"
    }`}>
      {/* Ambient glow for critical */}
      {isCritical && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-red-900/20 animate-pulse" />
        </div>
      )}

      {/* ── Header ── */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              isCritical ? "bg-red-500/20" : isReleased ? "bg-slate-700/40" : "bg-violet-500/20"
            }`}>
              {isReleased ? (
                <ShieldOff size={22} className="text-slate-400" />
              ) : isCritical ? (
                <ShieldAlert size={22} className="text-red-400" />
              ) : (
                <Shield size={22} className="text-violet-400" />
              )}
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">LegadoZero</h1>
              <p className="text-slate-500 text-xs">{t.tagline}</p>
            </div>
          </div>

          {/* Demo state switcher */}
          {IS_DEMO && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs">Demo:</span>
              {["active","warning","critical","released","unpaid"].map(s => (
                <button
                  key={s}
                  onClick={() => setDemoState(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    demoState === s
                      ? "bg-violet-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >{s}</button>
              ))}
            </div>
          )}

          <StatusBadge state={vaultState} t={t} />
        </div>
      </header>

      {/* ── Unpaid banner ── */}
      {vaultState === "unpaid" && (
        <div className="bg-amber-500/10 border-b border-amber-500/30">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <p className="text-amber-400 text-sm">{t.payment.readonlyBanner}</p>
            <PaymentButton t={t} vaultId={vault?.id} />
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Released State ── */}
        {isReleased && <ReleasedBanner vault={vault} t={t} />}

        {/* ── Pulse Widget ── */}
        {!isReleased && (
          <PulseWidget
            vault={vault}
            t={t}
            tr={tr}
            onPulse={handlePulse}
            pulsing={pulsing}
            pulseMsg={pulseMsg}
            isCritical={isCritical}
          />
        )}

        {/* ── Tabs ── */}
        {!isReleased && vault?.is_paid && (
          <>
            <div className="flex gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
              {[
                { id: "vault", icon: Lock, label: t.nav.vault },
                { id: "heirs", icon: Users, label: t.nav.heirs },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    tab === id
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {tab === "vault" && (
              <VaultTab
                vault={vault}
                t={t}
                masterPassword={masterPassword}
                setMasterPassword={setMasterPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                unlocked={unlocked}
                setUnlocked={setUnlocked}
                onVaultUpdate={setVault}
              />
            )}
            {tab === "heirs" && (
              <HeirsTab vault={vault} t={t} onVaultUpdate={setVault} />
            )}
          </>
        )}

        {/* ── Payment CTA (unpaid) ── */}
        {vaultState === "unpaid" && (
          <PaymentCard t={t} vaultId={vault?.id} />
        )}
      </main>
    </div>
  );
}

// ─── Pulse Widget ─────────────────────────────────────────────────
function PulseWidget({ vault, t, tr, onPulse, pulsing, pulseMsg, isCritical }) {
  const [timeDisplay, setTimeDisplay] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calc() {
      if (!vault?.last_pulse_at) return;
      const deadline = new Date(vault.last_pulse_at).getTime() + 60 * 24 * 60 * 60 * 1000;
      const diff = Math.max(0, deadline - Date.now());
      setTimeDisplay({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [vault?.last_pulse_at]);

  const { days, hours, minutes, seconds } = timeDisplay;
  const urgent = days < 7;

  return (
    <div className={`rounded-2xl border p-8 transition-all duration-500 ${
      isCritical
        ? "bg-red-950/60 border-red-500/40 shadow-2xl shadow-red-500/10"
        : urgent
        ? "bg-amber-950/40 border-amber-500/30"
        : "bg-slate-900/60 border-slate-700/50"
    }`}>
      <p className={`text-center text-sm font-medium mb-6 ${
        isCritical ? "text-red-400" : urgent ? "text-amber-400" : "text-slate-400"
      }`}>
        {isCritical ? `🚨 ${t.status.critical}` : t.pulse.title}
      </p>

      {/* Countdown */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[
          { val: days, label: t.pulse.days },
          { val: hours, label: t.pulse.hours },
          { val: minutes, label: t.pulse.minutes },
          { val: seconds, label: "seg" },
        ].map(({ val, label }) => (
          <div key={label} className="text-center">
            <div className={`text-4xl md:text-6xl font-black tabular-nums tracking-tighter ${
              isCritical ? "text-red-300" : urgent ? "text-amber-300" : "text-white"
            }`}>
              {pad(val)}
            </div>
            <div className="text-slate-500 text-xs mt-1 uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>

      {/* Pulse button */}
      <button
        onClick={onPulse}
        disabled={pulsing || !vault?.is_paid}
        className={`w-full py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 active:scale-95 disabled:opacity-50 ${
          isCritical
            ? "bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-500/30"
            : "bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-500/20"
        }`}
      >
        {pulsing ? (
          <><Loader2 size={22} className="animate-spin" />{t.pulse.confirming}</>
        ) : (
          <><Heart size={22} className={isCritical ? "animate-pulse" : ""} />{t.pulse.button}</>
        )}
      </button>

      {pulseMsg && (
        <p className={`text-center text-sm mt-4 font-medium ${
          pulseMsg.includes("✓") ? "text-emerald-400" : "text-red-400"
        }`}>{pulseMsg}</p>
      )}

      {vault?.last_pulse_at && (
        <p className="text-center text-slate-600 text-xs mt-4">
          {t.pulse.lastPulse}: {new Date(vault.last_pulse_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ─── Vault Tab ────────────────────────────────────────────────────
function VaultTab({ vault, t, masterPassword, setMasterPassword, showPassword, setShowPassword, unlocked, setUnlocked, onVaultUpdate }) {
  const [files, setFiles] = useState([]);
  const [testament, setTestament] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [glmLoading, setGlmLoading] = useState(false);
  const [storageUsed, setStorageUsed] = useState(vault?.storage_used_bytes || 0);
  const dropRef = useRef();

  const storagePercent = Math.min(100, (storageUsed / STORAGE_LIMIT) * 100);

  async function handleUnlock() {
    if (!masterPassword) return;
    setUnlocked(true); // In real app, verify against stored hash
  }

  async function handleDrop(e) {
    e.preventDefault();
    const newFiles = [...(e.dataTransfer?.files || e.target.files)];
    const totalNew = newFiles.reduce((s, f) => s + f.size, 0);
    if (storageUsed + totalNew > STORAGE_LIMIT) {
      setSaveMsg(t.errors.storageExceeded);
      return;
    }
    setFiles(prev => [...prev, ...newFiles]);
    setStorageUsed(prev => prev + totalNew);
  }

  async function handleSave() {
    if (!masterPassword) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const key = await deriveKey(masterPassword, base64ToBuffer(vault.payload_salt || bufferToBase64(new Uint8Array(32))));
      const encFiles = await Promise.all(files.map(f => encryptFile(f, key)));
      const payload = { testament, files: encFiles, savedAt: new Date().toISOString() };
      const { encryptedPayload, salt } = await encryptVaultPayload(payload, masterPassword);
      // In real app: POST to Supabase
      setSaveMsg(t.vault.saved);
    } catch { setSaveMsg(t.errors.encryptionFailed); }
    setSaving(false);
  }

  async function handleGLMAssist() {
    setGlmLoading(true);
    try {
      const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GLM_API_KEY}` },
        body: JSON.stringify({
          model: "glm-4",
          messages: [
            { role: "system", content: "Eres un asistente que ayuda a redactar testamentos digitales. Sé claro, empático y organizado. Sugiere una estructura básica." },
            { role: "user", content: `Ayúdame a estructurar un testamento digital. Contexto actual: "${testament || 'Sin contenido aún'}". Sugiere cómo organizarlo mejor.` },
          ],
          max_tokens: 400,
        }),
      });
      const data = await res.json();
      const suggestion = data.choices?.[0]?.message?.content;
      if (suggestion) setTestament(prev => prev + (prev ? "\n\n---\n" : "") + suggestion);
    } catch { setSaveMsg("Error al conectar con IA. Intenta de nuevo."); }
    setGlmLoading(false);
  }

  async function handleDownloadKey() {
    const pkg = {
      vaultId: vault.id,
      salt: vault.payload_salt,
      algorithm: "AES-GCM-256-PBKDF2-600k",
      version: "1.0",
      generatedAt: new Date().toISOString(),
      _note: "Este archivo es necesario para desencriptar el legado. Guárdalo en lugar seguro.",
    };
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `legadozero-herencia-${vault.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Storage bar */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-slate-400" />
            <span className="text-slate-400 text-sm">{t.vault.storageUsed}</span>
          </div>
          <span className="text-white text-sm font-medium">
            {formatBytes(storageUsed)} / 1 GB
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              storagePercent > 90 ? "bg-red-500" : storagePercent > 70 ? "bg-amber-500" : "bg-violet-500"
            }`}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
      </div>

      {/* Password unlock */}
      {!unlocked && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={18} className="text-violet-400" />
            <h3 className="text-white font-semibold">Contraseña Maestra</h3>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type={showPassword ? "text" : "password"}
                value={masterPassword}
                onChange={e => setMasterPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleUnlock()}
                placeholder="Ingresa tu contraseña maestra para cifrar"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 pr-10"
              />
              <button
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={handleUnlock}
              className="px-5 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Unlock size={16} />
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-3">
            🔒 Tu contraseña nunca sale de este dispositivo. Se usa para cifrar localmente.
          </p>
        </div>
      )}

      {/* File dropzone */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-xl p-10 text-center cursor-pointer transition-colors group"
        onClick={() => document.getElementById("file-input").click()}
      >
        <input id="file-input" type="file" multiple onChange={handleDrop} className="hidden" />
        <Upload size={32} className="mx-auto text-slate-600 group-hover:text-violet-400 transition-colors mb-3" />
        <p className="text-slate-400 text-sm">{t.vault.dropzone}</p>
        <p className="text-slate-600 text-xs mt-1">{t.vault.dropzoneHint}</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 last:border-0">
              <FileText size={16} className="text-slate-500 shrink-0" />
              <span className="text-slate-300 text-sm flex-1 truncate">{file.name}</span>
              <span className="text-slate-500 text-xs">{formatBytes(file.size)}</span>
              <button
                onClick={() => {
                  setStorageUsed(p => p - file.size);
                  setFiles(p => p.filter((_, j) => j !== i));
                }}
                className="text-slate-600 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Testament */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            <h3 className="text-white font-semibold text-sm">{t.vault.testament}</h3>
          </div>
          <button
            onClick={handleGLMAssist}
            disabled={glmLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {glmLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className="text-violet-400" />}
            {glmLoading ? t.vault.glmAssisting : t.vault.glmAssist}
          </button>
        </div>
        <textarea
          value={testament}
          onChange={e => setTestament(e.target.value)}
          placeholder={t.vault.testamentPlaceholder}
          rows={8}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !masterPassword}
          className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" />{t.vault.encrypting}</> : <><Lock size={16} />{t.vault.encrypt}</>}
        </button>
        <button
          onClick={handleDownloadKey}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
          title={t.vault.downloadKeyDesc}
        >
          <Download size={16} />
          <span className="hidden sm:inline">{t.vault.downloadKey}</span>
        </button>
      </div>

      {saveMsg && (
        <p className={`text-center text-sm font-medium ${saveMsg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>
          {saveMsg}
        </p>
      )}
    </div>
  );
}

// ─── Heirs Tab ────────────────────────────────────────────────────
function HeirsTab({ vault, t, onVaultUpdate }) {
  const [heirs, setHeirs] = useState(vault?.heirs || []);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  function addHeir() {
    if (heirs.length >= MAX_HEIRS) return;
    setHeirs(p => [...p, { id: crypto.randomUUID(), name: "", email: "", whatsapp: "" }]);
  }

  function updateHeir(id, field, val) {
    setHeirs(p => p.map(h => h.id === id ? { ...h, [field]: val } : h));
  }

  function removeHeir(id) {
    setHeirs(p => p.filter(h => h.id !== id));
  }

  async function saveHeirs() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    onVaultUpdate(v => ({ ...v, heirs }));
    setSaveMsg(t.heirs.saved);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{t.heirs.title}</h3>
          <p className="text-slate-500 text-xs mt-1">{t.heirs.subtitle}</p>
        </div>
        <button
          onClick={addHeir}
          disabled={heirs.length >= MAX_HEIRS}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          {t.heirs.addHeir}
        </button>
      </div>

      {heirs.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <Users size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm">Sin herederos designados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {heirs.map((heir, i) => (
            <div key={heir.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Heredero {i + 1}</span>
                <button onClick={() => removeHeir(heir.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { field: "name", placeholder: t.heirs.name },
                  { field: "email", placeholder: t.heirs.email, type: "email" },
                  { field: "whatsapp", placeholder: t.heirs.whatsapp, type: "tel" },
                ].map(({ field, placeholder, type = "text" }) => (
                  <input
                    key={field}
                    type={type}
                    value={heir[field]}
                    onChange={e => updateHeir(heir.id, field, e.target.value)}
                    placeholder={placeholder}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {heirs.length > 0 && (
        <button
          onClick={saveHeirs}
          disabled={saving}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" />Guardando…</> : <><CheckCircle size={16} />{t.heirs.save}</>}
        </button>
      )}

      {saveMsg && <p className="text-center text-emerald-400 text-sm font-medium">{saveMsg}</p>}

      {heirs.length >= MAX_HEIRS && (
        <p className="text-center text-amber-400 text-xs">{t.heirs.limitReached}</p>
      )}
    </div>
  );
}

// ─── Released Banner ──────────────────────────────────────────────
function ReleasedBanner({ vault, t }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-8 text-center">
      <ShieldOff size={48} className="mx-auto text-slate-600 mb-4" />
      <h2 className="text-white font-bold text-xl mb-2">{t.status.released}</h2>
      <p className="text-slate-400 text-sm max-w-sm mx-auto">{t.status.releasedDesc}</p>
      {vault?.triggered_at && (
        <p className="text-slate-600 text-xs mt-4">
          Protocolo activado: {new Date(vault.triggered_at).toLocaleString()}
        </p>
      )}
      {vault?.heirs?.map(h => (
        <div key={h.id} className="mt-3 text-xs text-slate-500">
          ✓ {h.name} notificado {h.notified_at ? new Date(h.notified_at).toLocaleString() : ""}
        </div>
      ))}
    </div>
  );
}

// ─── Payment ──────────────────────────────────────────────────────
function PaymentButton({ t, vaultId }) {
  return (
    <a
      href={`${LEMON_LINK}?checkout[custom][vault_id]=${vaultId || ""}`}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
    >
      {t.payment.cta}
    </a>
  );
}

function PaymentCard({ t, vaultId }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-500/20 rounded-2xl mb-5">
        <Lock size={28} className="text-violet-400" />
      </div>
      <h2 className="text-white font-bold text-2xl mb-2">{t.payment.title}</h2>
      <p className="text-slate-400 text-sm mb-1">{t.payment.desc}</p>
      <p className="text-slate-500 text-xs mb-6">{t.payment.pppNote}</p>
      <div className="text-4xl font-black text-white mb-2">{t.payment.price}</div>
      <a
        href={`${LEMON_LINK}?checkout[custom][vault_id]=${vaultId || ""}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 mt-6 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-lg transition-colors shadow-xl shadow-violet-500/20"
      >
        <Zap size={20} />
        {t.payment.cta}
        <ChevronRight size={18} />
      </a>
      <div className="flex items-center justify-center gap-4 mt-6">
        {["Lemon Squeezy", "128-bit SSL", "Sin suscripción"].map(b => (
          <span key={b} className="text-slate-600 text-xs flex items-center gap-1">
            <CheckCircle size={11} className="text-emerald-600" />{b}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────
function StatusBadge({ state, t }) {
  const config = {
    normal: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: t.status.active },
    warning: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: t.status.warning },
    critical: { color: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse", label: t.status.critical },
    released: { color: "bg-slate-700/40 text-slate-400 border-slate-700", label: t.status.released },
    unpaid: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Sin activar" },
  };
  const { color, label } = config[state] || config.normal;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>{label}</span>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────
function LoadingScreen({ t }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 bg-violet-500/20 rounded-2xl flex items-center justify-center">
        <Shield size={28} className="text-violet-400" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  HEIR DECRYPT VIEW  —  /boveda/descifrar/[UUID]
// ═══════════════════════════════════════════════════════════════════
function HeirDecryptView({ vaultId, t, tr }) {
  const [token, setToken] = useState("");
  const [heirEmail, setHeirEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | success | error
  const [decryptedData, setDecryptedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDecrypt() {
    if (!token || !heirEmail) return;
    setState("loading");
    setErrorMsg("");

    try {
      // 1. Fetch vault from Supabase (public function, triggered vaults only)
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/get_heir_vault`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON,
          },
          body: JSON.stringify({ p_vault_id: vaultId }),
        }
      );
      const vaultData = await res.json();
      if (!vaultData?.[0]) throw new Error("Vault not found or not triggered");

      const { encrypted_payload, payload_salt, heir_packages, glm_heir_summary } = vaultData[0];

      // 2. Find the heir's package by email
      const packages = Array.isArray(heir_packages) ? heir_packages : JSON.parse(heir_packages || "[]");
      const heirPkg = packages.find(p => p.heir_email?.toLowerCase() === heirEmail.toLowerCase());
      if (!heirPkg) throw new Error("Email not found in heir list");

      // 3. Reconstruct vault key using heir email + server token
      const { reconstructVaultKey } = await import("./lib/crypto");
      const vaultKey = await reconstructVaultKey(heirPkg, heirEmail, token);

      // 4. Decrypt payload
      const { decryptData } = await import("./lib/crypto");
      const rawDecrypted = await decryptData(encrypted_payload, vaultKey);
      const payload = JSON.parse(new TextDecoder().decode(rawDecrypted));

      setDecryptedData({ ...payload, glm_summary: glm_heir_summary });
      setState("success");
    } catch (err) {
      console.error(err);
      setErrorMsg(t.heir.error);
      setState("error");
    }
  }

  async function downloadFile(encFile) {
    const { decryptFile: df } = await import("./lib/crypto");
    // In real app, use the reconstructed key stored in state
    // For demo: just show name
    const a = document.createElement("a");
    a.href = "#";
    a.download = encFile.name;
    a.click();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-500/20 rounded-2xl mb-4">
            <Unlock size={28} className="text-violet-400" />
          </div>
          <h1 className="text-white font-bold text-2xl">{t.heir.title}</h1>
          <p className="text-slate-400 text-sm mt-2">{t.heir.subtitle}</p>
          <p className="text-slate-600 text-xs mt-1">ID: {vaultId}</p>
        </div>

        {state !== "success" ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">
                Tu correo electrónico (el que el propietario registró)
              </label>
              <input
                type="email"
                value={heirEmail}
                onChange={e => setHeirEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Token */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">
                {t.heir.tokenLabel}
              </label>
              <textarea
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder={t.heir.tokenPlaceholder}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 resize-none font-mono"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-500/30 rounded-lg">
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={handleDecrypt}
              disabled={state === "loading" || !token || !heirEmail}
              className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
            >
              {state === "loading"
                ? <><Loader2 size={18} className="animate-spin" />{t.heir.decrypting}</>
                : <><Unlock size={18} />{t.heir.decrypt}</>
              }
            </button>

            <p className="text-slate-600 text-xs text-center flex items-center justify-center gap-1.5">
              <Lock size={11} />
              {t.heir.privacy}
            </p>
          </div>
        ) : (
          /* ── Success: Show decrypted content ── */
          <div className="space-y-4">
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-center">
              <CheckCircle size={24} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-emerald-400 font-semibold text-sm">{t.heir.success}</p>
            </div>

            {/* GLM Summary */}
            {decryptedData?.glm_summary && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-violet-400" />
                  <h3 className="text-white font-semibold text-sm">Resumen del Legado (IA)</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{decryptedData.glm_summary}</p>
              </div>
            )}

            {/* Testament */}
            {decryptedData?.testament && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-slate-400" />
                  <h3 className="text-white font-semibold text-sm">{t.heir.testament}</h3>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {decryptedData.testament}
                </p>
              </div>
            )}

            {/* Files */}
            {decryptedData?.files?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                  <Download size={16} className="text-slate-400" />
                  <h3 className="text-white font-semibold text-sm">{t.heir.files}</h3>
                </div>
                {decryptedData.files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 last:border-0">
                    <FileText size={16} className="text-slate-500" />
                    <span className="text-slate-300 text-sm flex-1 truncate">{file.name}</span>
                    <span className="text-slate-600 text-xs">{formatBytes(file.size)}</span>
                    <button
                      onClick={() => downloadFile(file)}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      {t.heir.download}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
