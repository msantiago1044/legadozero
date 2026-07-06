import { useState, useEffect, useRef } from "react";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AdminPanel from "./pages/AdminPanel";
import { LogoFull, LogoIcon } from "./components/Logo";
import {
  ShieldOff, Heart, Upload, FileText, Users, Download,
  Lock, Unlock, AlertTriangle, CheckCircle, Trash2, Plus,
  Eye, EyeOff, Zap, HardDrive, ChevronRight, ChevronDown,
  X, Loader2, Sparkles, LogOut
} from "lucide-react";
import { encryptVaultPayload } from "./lib/crypto";
import { detectLanguage } from "./i18n/translations";
import mockData from "./lib/mockVault.json";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const LEMON_LINK    = import.meta.env.VITE_LEMON_CHECKOUT_URL;
const GLM_API_KEY   = import.meta.env.VITE_GLM_API_KEY;
const IS_DEMO       = import.meta.env.VITE_DEMO_MODE === "true";
const ADMIN_EMAILS  = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
const STORAGE_LIMIT = 1073741824;
const MAX_HEIRS     = 19;
const gold          = "#C8982A";

// Top country codes for the phone selector
const COUNTRY_CODES = [
  { code:"+1",   flag:"🇺🇸", name:"USA/Canada" },
  { code:"+52",  flag:"🇲🇽", name:"México" },
  { code:"+57",  flag:"🇨🇴", name:"Colombia" },
  { code:"+54",  flag:"🇦🇷", name:"Argentina" },
  { code:"+56",  flag:"🇨🇱", name:"Chile" },
  { code:"+51",  flag:"🇵🇪", name:"Perú" },
  { code:"+58",  flag:"🇻🇪", name:"Venezuela" },
  { code:"+593", flag:"🇪🇨", name:"Ecuador" },
  { code:"+591", flag:"🇧🇴", name:"Bolivia" },
  { code:"+595", flag:"🇵🇾", name:"Paraguay" },
  { code:"+598", flag:"🇺🇾", name:"Uruguay" },
  { code:"+34",  flag:"🇪🇸", name:"España" },
  { code:"+55",  flag:"🇧🇷", name:"Brasil" },
  { code:"+44",  flag:"🇬🇧", name:"UK" },
  { code:"+49",  flag:"🇩🇪", name:"Alemania" },
  { code:"+33",  flag:"🇫🇷", name:"Francia" },
  { code:"+39",  flag:"🇮🇹", name:"Italia" },
  { code:"+351", flag:"🇵🇹", name:"Portugal" },
  { code:"+506", flag:"🇨🇷", name:"Costa Rica" },
  { code:"+502", flag:"🇬🇹", name:"Guatemala" },
  { code:"+503", flag:"🇸🇻", name:"El Salvador" },
  { code:"+504", flag:"🇭🇳", name:"Honduras" },
  { code:"+505", flag:"🇳🇮", name:"Nicaragua" },
  { code:"+507", flag:"🇵🇦", name:"Panamá" },
  { code:"+53",  flag:"🇨🇺", name:"Cuba" },
  { code:"+1809",flag:"🇩🇴", name:"R. Dominicana" },
  { code:"+61",  flag:"🇦🇺", name:"Australia" },
  { code:"+81",  flag:"🇯🇵", name:"Japón" },
  { code:"+86",  flag:"🇨🇳", name:"China" },
  { code:"+91",  flag:"🇮🇳", name:"India" },
];

function formatBytes(b) {
  if (!b) return "0 B";
  if (b < 1048576)    return `${(b/1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b/1048576).toFixed(1)} MB`;
  return `${(b/1073741824).toFixed(2)} GB`;
}
function pad(n) { return String(n).padStart(2,"0"); }

async function supaFetch(path, options = {}) {
  const token = localStorage.getItem("lz_token");
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return {}; }
}

function getVaultState(vault) {
  if (!vault?.is_paid) return "unpaid";
  if (vault.status === "triggered") return "released";
  return vault.alert_level || "normal";
}

// ── Phone field with country code selector ────────────────────────
function PhoneField({ value, onChange, placeholder = "+57..." }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(COUNTRY_CODES[2]); // Colombia default
  const [local, setLocal] = useState("");
  const ref = useRef();

  // Parse existing value into code + local
  useEffect(() => {
    if (value) {
      const match = COUNTRY_CODES.find(c => value.startsWith(c.code));
      if (match) {
        setSelected(match);
        setLocal(value.slice(match.code.length).trim());
      } else {
        setLocal(value);
      }
    }
  }, []);

  function update(code, num) {
    const full = num ? `${code}${num.replace(/\s/g,"")}` : "";
    onChange(full);
  }

  // Close on outside click
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative", display:"flex", gap:0 }}>
      {/* Country selector */}
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:6, padding:"11px 10px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(180,160,120,0.12)", borderRight:"none", borderRadius:"7px 0 0 7px", cursor:"pointer", color:"#e8e0d0", fontSize:13, fontFamily:"sans-serif", whiteSpace:"nowrap", minWidth:90 }}>
        <span>{selected.flag}</span>
        <span style={{ color:"#C8982A" }}>{selected.code}</span>
        <ChevronDown size={12} color="#6a6058" style={{ transform: open?"rotate(180deg)":"none", transition:"0.2s" }}/>
      </button>
      {/* Number input */}
      <input type="tel" value={local}
        onChange={e => { setLocal(e.target.value); update(selected.code, e.target.value); }}
        placeholder={es_global ? "Número sin código" : "Number without code"}
        style={{ flex:1, padding:"11px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(180,160,120,0.12)", borderRadius:"0 7px 7px 0", color:"#e8e0d0", fontSize:13, fontFamily:"sans-serif", outline:"none" }}
        onFocus={e=>e.target.style.borderColor=gold} onBlur={e=>e.target.style.borderColor="rgba(180,160,120,0.12)"}
      />
      {/* Dropdown */}
      {open && (
        <div style={{ position:"absolute", top:"100%", left:0, zIndex:100, background:"#12120f", border:"1px solid rgba(180,160,120,0.2)", borderRadius:8, maxHeight:220, overflowY:"auto", width:220, marginTop:4, boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }}>
          {COUNTRY_CODES.map(c => (
            <button key={c.code} type="button"
              onClick={() => { setSelected(c); update(c.code, local); setOpen(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:selected.code===c.code?"rgba(200,152,42,0.1)":"none", border:"none", cursor:"pointer", color:"#e8e0d0", fontSize:13, fontFamily:"sans-serif", textAlign:"left" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(200,152,42,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.background=selected.code===c.code?"rgba(200,152,42,0.1)":"none"}
            >
              <span>{c.flag}</span>
              <span style={{ color:gold, minWidth:48 }}>{c.code}</span>
              <span style={{ color:"#8a7868", fontSize:12 }}>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

let es_global = true; // set by Dashboard

// ── App Router ────────────────────────────────────────────────────
export default function App() {
  const lang = detectLanguage();
  es_global = lang !== "en";
  const path = window.location.pathname;
  const heirMatch = path.match(/^\/boveda\/descifrar\/([a-f0-9-]{36})$/i);
  if (heirMatch) return <HeirDecryptView vaultId={heirMatch[1]} lang={lang} />;
  return <MainApp lang={lang} />;
}

function MainApp({ lang }) {
  const [screen, setScreen] = useState("loading");
  const [user,   setUser]   = useState(null);
  es_global = lang !== "en";

  useEffect(() => {
    const stored = localStorage.getItem("lz_user");
    const token  = localStorage.getItem("lz_token");
    if (stored && token) {
      const u = JSON.parse(stored);
      setUser(u);
      setScreen(ADMIN_EMAILS.includes(u.email?.toLowerCase()) ? "admin" : "dashboard");
    } else {
      setScreen("landing");
    }
  }, []);

  function handleAuth(u, accountPassword) {
    setUser(u);
    if (accountPassword) sessionStorage.setItem("lz_account_pass", accountPassword);
    setScreen(ADMIN_EMAILS.includes(u?.email?.toLowerCase()) ? "admin" : "dashboard");
    document.title = "🔒 LegadoZero | Bóveda Activa & Asegurada";
  }

  function handleSignOut() {
    ["lz_token","lz_user","lz_alert_level"].forEach(k=>localStorage.removeItem(k));
    sessionStorage.removeItem("lz_account_pass");
    setUser(null);
    setScreen("landing");
  }

  if (screen === "loading")  return <FullScreenLoader />;
  if (screen === "landing")  return <LandingPage lang={lang} onGoToAuth={() => setScreen("auth")} />;
  if (screen === "auth")     return <AuthPage lang={lang} onBack={() => setScreen("landing")} onAuth={handleAuth} />;
  if (screen === "admin")    return <AdminPanel user={user} lang={lang} onSignOut={handleSignOut} />;
  return <Dashboard user={user} lang={lang} onSignOut={handleSignOut} />;
}

// ── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ state, es }) {
  const cfg = {
    normal:   { bg:"rgba(92,184,144,0.1)",  border:"rgba(92,184,144,0.25)",  color:"#5cb890", label: es?"Bóveda Activa":"Vault Active" },
    warning:  { bg:"rgba(200,152,42,0.1)",  border:"rgba(200,152,42,0.25)",  color:gold,      label: es?"Confirmar identidad":"Confirm identity" },
    critical: { bg:"rgba(220,60,60,0.1)",   border:"rgba(220,60,60,0.25)",   color:"#e06060", label: es?"¡Acción requerida!":"Action required!" },
    released: { bg:"rgba(120,120,130,0.1)", border:"rgba(120,120,130,0.25)", color:"#8a7868", label: es?"Bóveda Liberada":"Vault Released" },
    unpaid:   { bg:"rgba(200,152,42,0.08)", border:"rgba(200,152,42,0.2)",   color:gold,      label: es?"Sin activar":"Not activated" },
  };
  const c = cfg[state] || cfg.normal;
  return <span style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontFamily:"sans-serif", background:c.bg, border:`1px solid ${c.border}`, color:c.color }}>{c.label}</span>;
}

// ── Dashboard ─────────────────────────────────────────────────────
function Dashboard({ user, lang, onSignOut }) {
  const [vault,     setVault]     = useState(null);
  const [tab,       setTab]       = useState("pulse");
  const [loading,   setLoading]   = useState(true);
  const [demoState, setDemoState] = useState("active");
  const [pulseMsg,  setPulseMsg]  = useState("");
  const [pulsing,   setPulsing]   = useState(false);
  const es = lang !== "en";
  es_global = es;

  // Lifted vault state to prevent unmount loss when switching tabs
  const [decryptedTestament, setDecryptedTestament] = useState("");
  const [decryptedFiles, setDecryptedFiles] = useState([]);
  const [vaultPassword, setVaultPassword] = useState(() => sessionStorage.getItem("lz_account_pass") || "");
  const [derivedKey, setDerivedKey] = useState(null);
  const [isVaultLocked, setIsVaultLocked] = useState(true);

  useEffect(() => {
    if (vault) {
      // Only lock when both encrypted_payload AND payload_salt exist
      // Old saves without salt are unrecoverable — let user re-encrypt fresh
      setIsVaultLocked(!!vault.encrypted_payload && !!vault.payload_salt && !derivedKey);
    }
  }, [vault, derivedKey]);

  useEffect(() => {
    const stored = sessionStorage.getItem("lz_account_pass");
    if (stored && !vaultPassword) setVaultPassword(stored);
  }, [vaultPassword]);

  // Load vault once on mount (not on tab change)
  useEffect(() => { loadVault(); }, [IS_DEMO ? demoState : undefined]);

  async function loadVault() {
    setLoading(true);
    if (IS_DEMO) {
      await new Promise(r => setTimeout(r,400));
      setVault(mockData.states[demoState]);
    } else {
      try {
        const data = await supaFetch("/rest/v1/vaults?select=*&limit=1");
        if (Array.isArray(data) && data.length > 0) {
          // Parse heirs_contacts JSON if it's a string
          const v = data[0];
          if (typeof v.heirs_contacts === "string") {
            try { v.heirs_contacts = JSON.parse(v.heirs_contacts); } catch { v.heirs_contacts = []; }
          }
          setVault(v);
        } else {
          // No vault found — auto-create one
          await supaFetch("/rest/v1/rpc/create_vault", {
            method: "POST",
            body: JSON.stringify({ p_email: user?.email || "" }),
          });
          const retry = await supaFetch("/rest/v1/vaults?select=*&limit=1");
          setVault(Array.isArray(retry) ? retry[0] : null);
        }
      } catch (e) { console.error("loadVault error:", e); setVault(null); }
    }
    setLoading(false);
  }

  async function handlePulse() {
    if (!vault?.id) return;
    setPulsing(true); setPulseMsg("");
    try {
      if (!IS_DEMO) {
        const res = await supaFetch("/rest/v1/rpc/renew_pulse", {
          method: "POST",
          body: JSON.stringify({ p_vault_id: vault.id }),
        });
        // Check for error in response
        if (res?.message || res?.error) throw new Error(res.message || res.error);
      }
      const now = new Date().toISOString();
      setVault(v => ({ ...v, last_pulse_at: now, alert_level: "normal" }));
      setPulseMsg(es ? "✓ Pulso renovado. Bóveda asegurada." : "✓ Pulse renewed. Vault secured.");
      document.title = "🔒 LegadoZero | Bóveda Activa & Asegurada";
    } catch(e) {
      setPulseMsg(es ? `Error: ${e.message || "Intenta de nuevo"}` : `Error: ${e.message || "Try again"}`);
    }
    setPulsing(false);
  }

  const state    = getVaultState(vault);
  const isCrit   = state === "critical";
  const isRel    = state === "released";
  const isUnpaid = state === "unpaid";

  useEffect(() => {
    const titles = {
      normal:"🔒 LegadoZero | Bóveda Activa & Asegurada",
      warning:"⚠️ LegadoZero | Se requiere confirmación",
      critical:"🚨 [ACCIÓN REQUERIDA] LegadoZero",
      released:"📬 LegadoZero | Protocolo Activado",
      unpaid:"🔓 LegadoZero | Activa tu Bóveda",
    };
    document.title = titles[state] || titles.normal;
    localStorage.setItem("lz_alert_level", state);
  }, [state]);

  if (loading) return <FullScreenLoader />;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", color:"#e8e4dc", fontFamily:"Georgia,'Times New Roman',serif" }}>
      {isCrit && <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:"rgba(180,20,20,0.04)", animation:"critPulse 3s ease-in-out infinite", zIndex:0 }}/>}

      {/* Header */}
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(10,10,15,0.97)", borderBottom:"1px solid rgba(180,160,120,0.12)", backdropFilter:"blur(12px)" }}>
        <div style={{ maxWidth:960, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
          <LogoFull size={34} showTagline />
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {IS_DEMO && (
              <div style={{ display:"flex", gap:3 }}>
                {["active","warning","critical","released","unpaid"].map(s=>(
                  <button key={s} onClick={()=>setDemoState(s)} style={{ padding:"3px 7px", borderRadius:4, border:"none", cursor:"pointer", fontSize:10, fontFamily:"sans-serif", background:demoState===s?gold:"rgba(255,255,255,0.06)", color:demoState===s?"#0a0a0f":"#8a7868" }}>{s}</button>
                ))}
              </div>
            )}
            <StatusBadge state={state} es={es}/>
            <button onClick={onSignOut} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", color:"#6a6058", cursor:"pointer", fontSize:13, fontFamily:"sans-serif" }}
              onMouseEnter={e=>e.currentTarget.style.color="#e06060"} onMouseLeave={e=>e.currentTarget.style.color="#6a6058"}>
              <LogOut size={14}/>{es?"Salir":"Sign out"}
            </button>
          </div>
        </div>
      </header>

      {isUnpaid && (
        <div style={{ background:"rgba(200,152,42,0.07)", borderBottom:"1px solid rgba(200,152,42,0.18)", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <p style={{ margin:0, fontSize:14, color:gold, fontFamily:"sans-serif" }}>{es?"Bóveda en modo lectura. Activa el servicio para proteger tu legado.":"Vault in read-only mode. Activate to protect your legacy."}</p>
          <a href={`${LEMON_LINK}?checkout[custom][vault_id]=${vault?.id||""}`} target="_blank" rel="noopener noreferrer"
            style={{ padding:"9px 20px", background:gold, color:"#0a0a0f", borderRadius:6, fontSize:13, fontWeight:600, textDecoration:"none", fontFamily:"sans-serif" }}>
            {es?"Activar — $10 USD":"Activate — $10 USD"}
          </a>
        </div>
      )}

      <main style={{ maxWidth:960, margin:"0 auto", padding:"40px 24px", position:"relative", zIndex:1 }}>
        {isRel && <ReleasedBanner vault={vault} es={es}/>}
        {!isRel && <PulseWidget vault={vault} es={es} onPulse={handlePulse} pulsing={pulsing} pulseMsg={pulseMsg} isCrit={isCrit}/>}

        {!isRel && vault?.is_paid && (
          <>
            <div style={{ display:"flex", gap:4, padding:4, background:"rgba(255,255,255,0.03)", borderRadius:10, border:"1px solid rgba(180,160,120,0.1)", marginTop:32, marginBottom:32 }}>
              {[{id:"pulse",icon:Heart,label:es?"Pulso":"Pulse"},{id:"vault",icon:Lock,label:es?"Mi Bóveda":"My Vault"},{id:"heirs",icon:Users,label:es?"Herederos":"Heirs"}].map(({id,icon:Icon,label})=>(
                <button key={id} onClick={()=>setTab(id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px", borderRadius:8, border:"none", cursor:"pointer", fontSize:14, fontFamily:"sans-serif", transition:"all 0.15s", background:tab===id?gold:"transparent", color:tab===id?"#0a0a0f":"#8a7868", fontWeight:tab===id?600:400 }}>
                  <Icon size={15}/>{label}
                </button>
              ))}
            </div>
            {tab==="vault" && (
              <VaultTab
                vault={vault}
                user={user}
                es={es}
                onVaultUpdate={setVault}
                testament={decryptedTestament}
                setTestament={setDecryptedTestament}
                files={decryptedFiles}
                setFiles={setDecryptedFiles}
                password={vaultPassword}
                setPassword={setVaultPassword}
                isLocked={isVaultLocked}
                setIsLocked={setIsVaultLocked}
                derivedKey={derivedKey}
                setDerivedKey={setDerivedKey}
              />
            )}
            {tab==="heirs" && <HeirsTab vault={vault} es={es} onVaultUpdate={setVault}/>}
          </>
        )}
        {isUnpaid && <PaymentCard vault={vault} es={es}/>}
      </main>
      <style>{`@keyframes critPulse{0%,100%{opacity:.5}50%{opacity:1}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  );
}

// ── Pulse Widget ──────────────────────────────────────────────────
function PulseWidget({ vault, es, onPulse, pulsing, pulseMsg, isCrit }) {
  const [time, setTime] = useState({ d:0,h:0,m:0,s:0 });
  useEffect(()=>{
    function calc(){
      if (!vault?.last_pulse_at) return;
      const deadline = new Date(vault.last_pulse_at).getTime()+60*24*60*60*1000;
      const diff = Math.max(0,deadline-Date.now());
      setTime({ d:Math.floor(diff/86400000), h:Math.floor((diff%86400000)/3600000), m:Math.floor((diff%3600000)/60000), s:Math.floor((diff%60000)/1000) });
    }
    calc(); const id=setInterval(calc,1000); return()=>clearInterval(id);
  },[vault?.last_pulse_at]);
  const urgent = time.d < 7;
  return (
    <div style={{ borderRadius:16, border:`1px solid ${isCrit?"rgba(220,60,60,0.3)":urgent?"rgba(200,152,42,0.25)":"rgba(180,160,120,0.12)"}`, padding:"48px 32px", textAlign:"center", background:isCrit?"rgba(40,5,5,0.5)":urgent?"rgba(40,30,5,0.3)":"rgba(255,255,255,0.02)" }}>
      <p style={{ fontSize:12, color:isCrit?"#e06060":urgent?gold:"#8a7868", fontFamily:"sans-serif", letterSpacing:"1.5px", textTransform:"uppercase", margin:"0 0 28px" }}>
        {isCrit?(es?"🚨 ACCIÓN REQUERIDA":"🚨 ACTION REQUIRED"):(es?"Próxima confirmación en":"Next confirmation in")}
      </p>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:24, marginBottom:40 }}>
        {[[time.d,es?"días":"days"],[time.h,es?"horas":"hours"],[time.m,"min"],[time.s,"seg"]].map(([v,l])=>(
          <div key={l}>
            <div style={{ fontSize:"clamp(44px,8vw,72px)", fontWeight:300, color:isCrit?"#e06060":urgent?gold:"#f0ece4", lineHeight:1, fontVariantNumeric:"tabular-nums", fontFamily:"Georgia,serif" }}>{pad(v)}</div>
            <div style={{ fontSize:11, color:"#6a6058", fontFamily:"sans-serif", letterSpacing:"1px", textTransform:"uppercase", marginTop:6 }}>{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onPulse} disabled={pulsing||!vault?.is_paid}
        style={{ padding:"18px 48px", background:isCrit?"#dc2626":gold, color:"#0a0a0f", border:"none", borderRadius:10, fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"sans-serif", display:"inline-flex", alignItems:"center", gap:10, opacity:(pulsing||!vault?.is_paid)?0.6:1, transition:"all 0.2s" }}>
        {pulsing?<><Loader2 size={20} style={{ animation:"spin 1s linear infinite"}}/>{es?"Registrando...":"Recording..."}</>:<><Heart size={20}/>{es?"Estoy Vivo — Renovar Pulso":"I'm Alive — Renew Pulse"}</>}
      </button>
      {pulseMsg && <p style={{ margin:"20px 0 0", fontSize:14, fontFamily:"sans-serif", color:pulseMsg.includes("✓")?"#5cb890":"#e06060" }}>{pulseMsg}</p>}
      {vault?.last_pulse_at && <p style={{ margin:"14px 0 0", fontSize:12, color:"#4a4038", fontFamily:"sans-serif" }}>{es?"Último pulso":"Last pulse"}: {new Date(vault.last_pulse_at).toLocaleString()}</p>}
    </div>
  );
}

// ── Vault Tab ─────────────────────────────────────────────────────
function VaultTab({
  vault,
  user,
  es,
  onVaultUpdate,
  testament,
  setTestament,
  files,
  setFiles,
  password,
  setPassword,
  isLocked,
  setIsLocked,
  derivedKey,
  setDerivedKey
}) {
  const [showPass,    setShowPass]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState("");
  const [glmLoading,  setGlmLoading]  = useState(false);
  const [unlocking,   setUnlocking]   = useState(false);
  const [filesToDelete, setFilesToDelete] = useState([]);
  const autoUnlockRef = useRef(false);

  const storageUsed = vault?.storage_used_bytes || 0;
  const pct = Math.min(100,(storageUsed/STORAGE_LIMIT)*100);

  async function unlockWithPassword(pass) {
    if (!pass) {
      setSaveMsg(es ? "Ingresa la contraseña de tu cuenta." : "Enter your account password.");
      return false;
    }
    setUnlocking(true);
    setSaveMsg("");
    try {
      const { deriveKey, decryptVaultPayload } = await import("./lib/crypto");
      const salt = vault.payload_salt;
      if (!salt) throw new Error("No salt found in vault");

      const decrypted = await decryptVaultPayload(vault.encrypted_payload, salt, pass);
      const key = await deriveKey(pass, salt);

      setTestament(decrypted.testament || "");
      setFiles(decrypted.files || []);
      setDerivedKey(key);
      setIsLocked(false);
      setSaveMsg(es ? "✓ Bóveda desbloqueada." : "✓ Vault unlocked.");
      return true;
    } catch (e) {
      console.error(e);
      setSaveMsg(es ? "Contraseña incorrecta. Usa la misma contraseña con la que inicias sesión." : "Incorrect password. Use the same password you use to sign in.");
      autoUnlockRef.current = false;
      return false;
    } finally {
      setUnlocking(false);
    }
  }

  async function handleUnlock() {
    await unlockWithPassword(password);
  }

  useEffect(() => {
    if (autoUnlockRef.current || !isLocked || !password) return;
    if (!vault?.encrypted_payload || !vault?.payload_salt) return;
    autoUnlockRef.current = true;
    unlockWithPassword(password);
  }, [isLocked, password, vault?.encrypted_payload, vault?.payload_salt]);

  async function handleFiles(e){
    const picked=[...(e.dataTransfer?.files||e.target.files||[])];
    const ns=picked.reduce((s,f)=>s+f.size,0);
    if(storageUsed+ns>STORAGE_LIMIT){setSaveMsg(es?"Límite de 1 GB alcanzado.":"1 GB limit reached.");return;}
    
    const newFiles = picked.map(f => ({
      id: window.crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type,
      fileObject: f,
      isPending: true
    }));
    setFiles(p=>[...p,...newFiles]);
  }

  async function handleSave(){
    if(!password){setSaveMsg(es?"Inicia sesión de nuevo para cifrar tu bóveda.":"Sign in again to encrypt your vault.");return;}
    setSaving(true);setSaveMsg("");
    try{
      const { deriveKey, generateSalt, encryptData, createHeirPackage, encryptFile, bufferToBase64 } = await import("./lib/crypto");
      
      let saltStr = vault?.payload_salt;
      let activeKey = derivedKey;
      
      if (!activeKey) {
        if (!saltStr) {
          const newSalt = generateSalt();
          saltStr = bufferToBase64(newSalt.buffer);
        }
        activeKey = await deriveKey(password, saltStr);
        setDerivedKey(activeKey);
      }

      // 1. Upload pending files
      const token = localStorage.getItem("lz_token");
      const updatedFiles = [...files];
      
      for (let i = 0; i < updatedFiles.length; i++) {
        const file = updatedFiles[i];
        if (file.isPending) {
          const encrypted = await encryptFile(file.fileObject, activeKey);
          const filePath = `${vault.user_id}/${file.id}`;
          const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/vault-files/${filePath}`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON,
              Authorization: `Bearer ${token}`,
              "x-upsert": "true",
              "Content-Type": "text/plain"
            },
            body: encrypted.encryptedBase64
          });
          if (!uploadRes.ok) throw new Error(`Upload failed for ${file.name}`);
          
          // Clear fileObject and pending flag after upload
          delete file.fileObject;
          delete file.isPending;
        }
      }

      // 2. Delete removed files
      if (filesToDelete.length > 0) {
        const deleteRes = await fetch(`${SUPABASE_URL}/storage/v1/object/vault-files`, {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ prefixes: filesToDelete.map(id => `${vault.user_id}/${id}`) })
        });
        if (!deleteRes.ok) console.warn("Failed to delete some files from storage");
        setFilesToDelete([]);
      }

      // 3. Compile file metadata
      const filesMetadata = updatedFiles.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type
      }));

      // 4. Encrypt payload (testament + files metadata)
      const payload = {
        testament,
        files: filesMetadata,
        savedAt: new Date().toISOString()
      };
      const json = JSON.stringify(payload);
      const encryptedPayload = await encryptData(json, activeKey);

      // 5. Generate heir packages
      const currentHeirs = vault.heirs_contacts || [];
      let updatedHeirs = [...currentHeirs];

      // Assign tokens to heirs if missing
      updatedHeirs = updatedHeirs.map(heir => {
        if (!heir.token) {
          return { ...heir, token: window.crypto.randomUUID().replace(/-/g, "") };
        }
        return heir;
      });

      const heirPackages = [];
      for (const heir of updatedHeirs) {
        const pkg = await createHeirPackage(activeKey, heir.email, heir.token);
        heirPackages.push({
          heir_email: heir.email,
          ...pkg
        });
      }

      // 6. Calculate total storage used
      const totalStorageUsed = filesMetadata.reduce((sum, f) => sum + f.size, 0);

      // 7. Save to database
      const updateData = {
        encrypted_payload: encryptedPayload,
        payload_salt: saltStr,
        heir_packages: heirPackages,
        heirs_contacts: updatedHeirs,
        storage_used_bytes: totalStorageUsed
      };

      const patchRes = await supaFetch(`/rest/v1/vaults?id=eq.${vault.id}`, {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });

      if (Array.isArray(patchRes) && patchRes.length > 0) {
        onVaultUpdate(patchRes[0]);
      } else {
        onVaultUpdate(v => ({
          ...v,
          ...updateData
        }));
      }

      setFiles(updatedFiles);
      setSaveMsg(es?"✓ Guardado y cifrado correctamente.":"✓ Saved and encrypted successfully.");
    }catch(e){
      console.error(e);
      setSaveMsg(es?"Error al guardar.":"Error saving.");
    }
    setSaving(false);
  }

  async function handleDownloadFile(file) {
    if (!derivedKey) return;
    try {
      const token = localStorage.getItem("lz_token");
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/vault-files/${vault.user_id}/${file.id}`, {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Download failed");
      const encryptedBase64 = await res.text();
      
      const { decryptFile } = await import("./lib/crypto");
      const decrypted = await decryptFile({ name: file.name, type: file.type, encryptedBase64 }, derivedKey);
      
      const url = URL.createObjectURL(decrypted.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decrypted.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(es ? "Error al descargar o descifrar el archivo." : "Error downloading or decrypting file.");
    }
  }

  async function handleGLM(){
    setGlmLoading(true);
    try{
      const res=await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${GLM_API_KEY}`},body:JSON.stringify({model:"glm-4",messages:[{role:"system",content:"Ayuda a redactar testamentos digitales. Empático y organizado."},{role:"user",content:`Organiza este testamento: "${testament||"vacío"}"`}],max_tokens:400})});
      const d=await res.json();
      const sug=d.choices?.[0]?.message?.content;
      if(sug)setTestament(p=>p+(p?"\n\n---\n":"")+sug);
    }catch{setSaveMsg(es?"Error IA.":"AI error.");}
    setGlmLoading(false);
  }

  function downloadKey(){
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify({vaultId:vault.id,salt:vault.payload_salt,algorithm:"AES-GCM-256-PBKDF2-600k",version:"1.0",generatedAt:new Date().toISOString()},null,2)],{type:"application/json"}));
    a.download=`legadozero-herencia-${vault.id?.slice(0,8)||"demo"}.json`;
    a.click();
  }

  const inp={padding:"12px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(180,160,120,0.15)",borderRadius:8,color:"#e8e0d0",fontSize:14,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box",width:"100%"};

  // If vault is locked, show the lock screen
  if (isLocked) {
    if (unlocking && password) {
      return (
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,padding:48,textAlign:"center"}}>
            <Loader2 size={32} color={gold} style={{animation:"spin 1s linear infinite",margin:"0 auto 16px",display:"block"}}/>
            <p style={{fontSize:14,color:"#8a7868",fontFamily:"sans-serif",margin:0}}>{es?"Descifrando tu bóveda...":"Decrypting your vault..."}</p>
          </div>
        </div>
      );
    }
    return (
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,padding:24,textAlign:"center"}}>
          <div style={{width:52,height:52,background:"rgba(200,152,42,0.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Lock size={24} color={gold}/></div>
          <h3 style={{fontSize:18,fontWeight:400,color:"#f0ece4",margin:"0 0 8px"}}>{es?"Bóveda Cifrada y Bloqueada":"Vault Encrypted and Locked"}</h3>
          <p style={{fontSize:13,color:"#8a7868",fontFamily:"sans-serif",maxWidth:400,margin:"0 auto 20px",lineHeight:1.5}}>
            {es?"Tu bóveda está protegida con cifrado de conocimiento cero. Introduce la contraseña de tu cuenta para descifrar y ver tus voluntades y archivos.":"Your vault is protected with zero-knowledge encryption. Enter your account password to decrypt and view your wishes and files."}
          </p>
          <div style={{position:"relative",maxWidth:360,margin:"0 auto 16px"}}>
            <input type={showPass?"text":"password"} value={password} onChange={e=>{ setPassword(e.target.value); sessionStorage.setItem("lz_account_pass", e.target.value); }}
              placeholder={es?"Contraseña de la cuenta":"Account password"}
              style={{...inp,paddingRight:44}}
              onFocus={e=>e.target.style.borderColor=gold} onBlur={e=>e.target.style.borderColor="rgba(180,160,120,0.15)"}
              onKeyDown={e=>e.key==="Enter"&&handleUnlock()}/>
            <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#6a6058",cursor:"pointer"}}>{showPass?<EyeOff size={16}/>:<Eye size={16}/>}</button>
          </div>
          <button onClick={handleUnlock} disabled={unlocking||!password}
            style={{padding:"12px 32px",background:gold,color:"#0a0a0f",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif",opacity:(unlocking||!password)?0.6:1,display:"inline-flex",alignItems:"center",gap:8}}>
            {unlocking?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>{es?"Descifrando...":"Decrypting..."}</>:<><Unlock size={16}/>{es?"Desbloquear Bóveda":"Unlock Vault"}</>}
          </button>
          {saveMsg&&<p style={{textAlign:"center",fontSize:13,fontFamily:"sans-serif",color:"#e06060",marginTop:14,marginBottom:0}}>{saveMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Storage */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><HardDrive size={14} color="#6a6058"/><span style={{fontSize:13,color:"#8a7868",fontFamily:"sans-serif"}}>{es?"Almacenamiento":"Storage"}</span></div>
          <span style={{fontSize:13,color:"#e8e0d0",fontFamily:"sans-serif"}}>{formatBytes(storageUsed)} / 1 GB</span>
        </div>
        <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:pct>90?"#e06060":pct>70?gold:"#5cb890",borderRadius:2,transition:"width 0.4s"}}/>
        </div>
      </div>

      {/* Dropzone */}
      <div onDrop={e=>{e.preventDefault();handleFiles(e);}} onDragOver={e=>e.preventDefault()}
        onClick={()=>document.getElementById("lz-fi").click()}
        style={{border:"2px dashed rgba(180,160,120,0.18)",borderRadius:12,padding:"40px 24px",textAlign:"center",cursor:"pointer"}}
        onMouseEnter={e=>e.currentTarget.style.borderColor=gold} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(180,160,120,0.18)"}>
        <input id="lz-fi" type="file" multiple style={{display:"none"}} onChange={handleFiles}/>
        <Upload size={26} color="#6a6058" style={{marginBottom:10}}/>
        <p style={{fontSize:14,color:"#8a7868",fontFamily:"sans-serif",margin:"0 0 4px"}}>{es?"Arrastra archivos o haz clic":"Drag files or click"}</p>
        <p style={{fontSize:12,color:"#4a4038",fontFamily:"sans-serif",margin:0}}>Max 1 GB · AES-256</p>
      </div>

      {/* File list */}
      {files.length>0&&(
        <div style={{border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,overflow:"hidden"}}>
          {files.map((f,i)=>(
            <div key={f.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:i<files.length-1?"1px solid rgba(180,160,120,0.06)":"none"}}>
              <FileText size={14} color="#6a6058"/>
              <span style={{fontSize:13,color:"#a09080",fontFamily:"sans-serif",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
              <span style={{fontSize:12,color:"#6a6058",fontFamily:"sans-serif",flexShrink:0}}>{formatBytes(f.size)}</span>
              {!f.isPending && (
                <button onClick={()=>handleDownloadFile(f)} style={{background:"none",border:"none",color:gold,cursor:"pointer",display:"flex",alignItems:"center"}} title={es?"Descargar y Descifrar":"Download and Decrypt"}>
                  <Download size={14}/>
                </button>
              )}
              <button onClick={()=>{
                if (!f.isPending) {
                  setFilesToDelete(p => [...p, f.id]);
                }
                setFiles(p=>p.filter((_,j)=>j!==i));
              }} style={{background:"none",border:"none",color:"#6a6058",cursor:"pointer"}}><X size={14}/></button>
            </div>
          ))}
        </div>
      )}

      {/* Testament */}
      <div style={{border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(180,160,120,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.01)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><FileText size={14} color="#6a6058"/><span style={{fontSize:14,color:"#e8e0d0",fontFamily:"sans-serif"}}>{es?"Testamento":"Testament"}</span></div>
          <button onClick={handleGLM} disabled={glmLoading} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:"rgba(200,152,42,0.1)",border:"1px solid rgba(200,152,42,0.2)",borderRadius:6,color:gold,fontSize:12,cursor:"pointer",fontFamily:"sans-serif",opacity:glmLoading?0.6:1}}>
            {glmLoading?<Loader2 size={13} style={{animation:"spin 1s linear infinite"}}/>:<Sparkles size={13}/>}{glmLoading?(es?"Generando...":"Generating..."):(es?"Asistir con IA":"AI Assist")}
          </button>
        </div>
        <textarea value={testament} onChange={e=>setTestament(e.target.value)} rows={7}
          placeholder={es?"Escribe tus últimas voluntades…":"Write your last wishes…"}
          style={{width:"100%",padding:"16px",background:"rgba(255,255,255,0.01)",border:"none",color:"#e8e0d0",fontSize:14,fontFamily:"sans-serif",resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.7}}/>
      </div>

      {/* Actions */}
      <div style={{display:"flex",gap:12}}>
        <button onClick={handleSave} disabled={saving||!password}
          style={{flex:1,padding:"14px",background:gold,color:"#0a0a0f",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:(saving||!password)?0.6:1}}>
          {saving?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>{es?"Guardando...":"Saving..."}</>:<><Lock size={16}/>{es?"Cifrar y Guardar":"Encrypt & Save"}</>}
        </button>
        <button onClick={downloadKey} title={es?"Descargar protocolo de herencia":"Download inheritance protocol"}
          style={{padding:"14px 18px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(180,160,120,0.15)",borderRadius:8,color:"#a09080",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:"sans-serif"}}>
          <Download size={15}/>{es?"Protocolo":"Protocol"}
        </button>
      </div>
      {saveMsg&&<p style={{textAlign:"center",fontSize:14,fontFamily:"sans-serif",color:saveMsg.includes("✓")?"#5cb890":"#e06060",margin:0}}>{saveMsg}</p>}
    </div>
  );
}



// ── Heirs Tab — with country code selector ────────────────────────
function HeirsTab({ vault, es, onVaultUpdate }) {
  const raw = vault?.heirs_contacts || vault?.heirs || [];
  const [heirs,   setHeirs]   = useState(Array.isArray(raw) ? raw : []);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function save() {
    setSaving(true);
    try {
      if (!IS_DEMO) {
        await supaFetch(`/rest/v1/vaults?id=eq.${vault.id}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ heirs_contacts: heirs }),
        });
      }
      onVaultUpdate(v => ({ ...v, heirs_contacts: heirs, heirs }));
      setSaveMsg(es ? "✓ Herederos guardados correctamente." : "✓ Heirs saved successfully.");
    } catch {
      setSaveMsg(es ? "Error al guardar. Intenta de nuevo." : "Error saving. Try again.");
    }
    setSaving(false);
  }

  function addHeir() {
    if (heirs.length >= MAX_HEIRS) return;
    setHeirs(p => [...p, { id: crypto.randomUUID(), name:"", email:"", whatsapp:"" }]);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h3 style={{fontSize:18,fontWeight:400,color:"#f0ece4",margin:"0 0 4px"}}>{es?"Herederos Designados":"Designated Heirs"}</h3>
          <p style={{fontSize:13,color:"#6a6058",fontFamily:"sans-serif",margin:0}}>{es?`Máximo ${MAX_HEIRS} personas. Solo reciben acceso si el interruptor se activa.`:`Maximum ${MAX_HEIRS} people. Access only if the switch activates.`}</p>
        </div>
        <button onClick={addHeir} disabled={heirs.length>=MAX_HEIRS}
          style={{display:"flex",alignItems:"center",gap:6,padding:"10px 18px",background:gold,color:"#0a0a0f",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif",opacity:heirs.length>=MAX_HEIRS?0.5:1}}>
          <Plus size={15}/>{es?"Añadir":"Add"}
        </button>
      </div>

      {heirs.length===0 ? (
        <div style={{border:"2px dashed rgba(180,160,120,0.15)",borderRadius:12,padding:"60px 24px",textAlign:"center"}}>
          <Users size={30} color="#4a4038" style={{marginBottom:10}}/>
          <p style={{fontSize:14,color:"#6a6058",fontFamily:"sans-serif",margin:0}}>{es?"Sin herederos. Añade personas que recibirán tu legado.":"No heirs. Add people who will receive your legacy."}</p>
        </div>
      ) : heirs.map((h,i)=>(
        <div key={h.id||i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:11,color:"#6a6058",fontFamily:"sans-serif",letterSpacing:"1px",textTransform:"uppercase"}}>{es?"Heredero":"Heir"} {i+1}</span>
            <button onClick={()=>setHeirs(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#6a6058",cursor:"pointer"}}
              onMouseEnter={e=>e.target.style.color="#e06060"} onMouseLeave={e=>e.target.style.color="#6a6058"}><Trash2 size={14}/></button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {/* Name */}
            <input type="text" value={h.name} onChange={e=>setHeirs(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
              placeholder={es?"Nombre completo":"Full name"}
              style={{padding:"11px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(180,160,120,0.12)",borderRadius:7,color:"#e8e0d0",fontSize:13,fontFamily:"sans-serif",outline:"none"}}
              onFocus={e=>e.target.style.borderColor=gold} onBlur={e=>e.target.style.borderColor="rgba(180,160,120,0.12)"}/>
            {/* Email */}
            <input type="email" value={h.email} onChange={e=>setHeirs(p=>p.map((x,j)=>j===i?{...x,email:e.target.value}:x))}
              placeholder={es?"Correo electrónico":"Email address"}
              style={{padding:"11px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(180,160,120,0.12)",borderRadius:7,color:"#e8e0d0",fontSize:13,fontFamily:"sans-serif",outline:"none"}}
              onFocus={e=>e.target.style.borderColor=gold} onBlur={e=>e.target.style.borderColor="rgba(180,160,120,0.12)"}/>
            {/* WhatsApp with country selector */}
            <div>
              <p style={{fontSize:11,color:"#6a6058",fontFamily:"sans-serif",margin:"0 0 6px",letterSpacing:"0.5px"}}>WhatsApp</p>
              <PhoneField
                value={h.whatsapp}
                onChange={val=>setHeirs(p=>p.map((x,j)=>j===i?{...x,whatsapp:val}:x))}
              />
            </div>
          </div>
        </div>
      ))}

      {heirs.length>0&&(
        <button onClick={save} disabled={saving}
          style={{padding:"14px",background:gold,color:"#0a0a0f",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          {saving?<><Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>{es?"Guardando...":"Saving..."}</>:<><CheckCircle size={16}/>{es?"Guardar Herederos":"Save Heirs"}</>}
        </button>
      )}
      {saveMsg&&<p style={{textAlign:"center",fontSize:14,fontFamily:"sans-serif",color:saveMsg.includes("✓")?"#5cb890":"#e06060",margin:0}}>{saveMsg}</p>}
    </div>
  );
}

function ReleasedBanner({ vault, es }) {
  return (
    <div style={{border:"1px solid rgba(180,160,120,0.12)",borderRadius:16,padding:"48px 32px",textAlign:"center",marginBottom:32}}>
      <ShieldOff size={44} color="#4a4038" style={{marginBottom:16}}/>
      <h2 style={{fontSize:22,fontWeight:400,color:"#f0ece4",margin:"0 0 10px"}}>{es?"Protocolo de Herencia Activado":"Inheritance Protocol Activated"}</h2>
      <p style={{fontSize:14,color:"#8a7868",fontFamily:"sans-serif",maxWidth:400,margin:"0 auto 16px",lineHeight:1.6}}>{es?"Los herederos fueron notificados con acceso seguro.":"Heirs were notified with secure access."}</p>
      {vault?.triggered_at&&<p style={{fontSize:12,color:"#4a4038",fontFamily:"sans-serif"}}>{es?"Activado":"Triggered"}: {new Date(vault.triggered_at).toLocaleString()}</p>}
    </div>
  );
}

function PaymentCard({ vault, es }) {
  return (
    <div style={{border:"1px solid rgba(200,152,42,0.2)",borderRadius:16,padding:"48px 32px",textAlign:"center",background:"rgba(200,152,42,0.02)",marginTop:32}}>
      <div style={{width:52,height:52,background:"rgba(200,152,42,0.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Lock size={24} color={gold}/></div>
      <h2 style={{fontSize:22,fontWeight:400,color:"#f0ece4",margin:"0 0 8px"}}>{es?"Activa tu Bóveda":"Activate your Vault"}</h2>
      <p style={{fontSize:14,color:"#8a7868",fontFamily:"sans-serif",margin:"0 0 8px"}}>{es?"Pago único · Sin suscripciones · Vitalicio":"One-time payment · No subscriptions · Lifetime"}</p>
      <div style={{fontSize:52,fontWeight:300,color:gold,fontFamily:"Georgia,serif",margin:"24px 0"}}>$10 USD</div>
      <a href={`${LEMON_LINK}?checkout[custom][vault_id]=${vault?.id||""}`} target="_blank" rel="noopener noreferrer"
        style={{display:"inline-flex",alignItems:"center",gap:8,padding:"16px 40px",background:gold,color:"#0a0a0f",borderRadius:10,fontSize:15,fontWeight:700,textDecoration:"none",fontFamily:"sans-serif"}}>
        <Zap size={18}/>{es?"Activar ahora":"Activate now"}<ChevronRight size={16}/>
      </a>
    </div>
  );
}

function HeirDecryptView({ vaultId, lang }) {
  // Auto-extract token from URL query param so heirs just click the link
  const urlToken = new URLSearchParams(window.location.search).get("token") || "";
  const [token,setToken]=useState(urlToken); const [email,setEmail]=useState(""); const [state,setState]=useState("idle"); const [data,setData]=useState(null); const [errMsg,setErrMsg]=useState("");
  const es=lang!=="en";
  const [vKey,setVKey]=useState(null);

  async function handleDecrypt(){
    if(!token||!email)return; setState("loading");
    try{
      const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_heir_vault`,{method:"POST",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON},body:JSON.stringify({p_vault_id:vaultId})});
      const rows=await res.json(); if(!rows?.[0])throw new Error("Not found");
      const v=rows[0]; const pkgs=Array.isArray(v.heir_packages)?v.heir_packages:JSON.parse(v.heir_packages||"[]");
      const pkg=pkgs.find(p=>p.heir_email?.toLowerCase()===email.toLowerCase()); if(!pkg)throw new Error("Email not in heir list");
      const {reconstructVaultKey,decryptData}=await import("./lib/crypto");
      const key=await reconstructVaultKey(pkg,email,token);
      const raw=await decryptData(v.encrypted_payload,key);
      setData({...JSON.parse(new TextDecoder().decode(raw)),glm_summary:v.glm_heir_summary});
      setVKey(key);
      setState("success");
    }catch{ setErrMsg(es?"Token o correo inválido.":"Invalid token or email."); setState("error"); }
  }

  async function handleDownloadHeirFile(file) {
    if (!vKey) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/authenticated/vault-files/${vaultId}/${file.id}`, {
        headers: {
          apikey: SUPABASE_ANON
        }
      });
      if (!res.ok) throw new Error("Download failed");
      const encryptedBase64 = await res.text();
      
      const { decryptFile } = await import("./lib/crypto");
      const decrypted = await decryptFile({ name: file.name, type: file.type, encryptedBase64 }, vKey);
      
      const url = URL.createObjectURL(decrypted.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decrypted.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(es ? "Error al descargar o descifrar el archivo." : "Error downloading or decrypting file.");
    }
  }

  const inp={width:"100%",padding:"14px 16px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(180,160,120,0.15)",borderRadius:8,color:"#e8e0d0",fontSize:14,fontFamily:"sans-serif",outline:"none",boxSizing:"border-box"};
  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"Georgia,'Times New Roman',serif"}}>
      <div style={{width:"100%",maxWidth:460}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:52,height:52,background:"rgba(200,152,42,0.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Unlock size={24} color={gold}/></div>
          <h1 style={{fontSize:24,fontWeight:400,color:"#f0ece4",margin:"0 0 6px"}}>{es?"Descifrar Legado":"Decrypt Legacy"}</h1>
          <p style={{fontSize:12,color:"#4a4038",fontFamily:"monospace",margin:0}}>ID: {vaultId}</p>
        </div>
        {state!=="success"?(
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(180,160,120,0.1)",borderRadius:16,padding:24,display:"flex",flexDirection:"column",gap:12}}>
            <p style={{fontSize:14,color:"#a09080",fontFamily:"sans-serif",margin:0,lineHeight:1.6,textAlign:"center"}}>
              {es?"Ingresa tu correo para verificar tu identidad y acceder al legado.":"Enter your email to verify your identity and access the legacy."}
            </p>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={es?"Tu correo electrónico":"Your email"} style={inp}
              onFocus={e=>e.target.style.borderColor=gold} onBlur={e=>e.target.style.borderColor="rgba(180,160,120,0.15)"}/>
            {urlToken ? (
              <div style={{padding:"10px 14px",background:"rgba(92,184,144,0.06)",border:"1px solid rgba(92,184,144,0.15)",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
                <CheckCircle size={15} color="#5cb890"/>
                <span style={{fontSize:13,color:"#5cb890",fontFamily:"sans-serif"}}>{es?"Token de seguridad detectado automáticamente":"Security token detected automatically"}</span>
              </div>
            ) : (
              <textarea value={token} onChange={e=>setToken(e.target.value)} rows={3} placeholder={es?"Token recibido por correo o WhatsApp":"Token received by email or WhatsApp"}
                style={{...inp,resize:"none",fontFamily:"monospace",fontSize:12}}
                onFocus={e=>e.target.style.borderColor=gold} onBlur={e=>e.target.style.borderColor="rgba(180,160,120,0.15)"}/>
            )}
            {state==="error"&&<div style={{padding:"12px",background:"rgba(220,60,60,0.08)",border:"1px solid rgba(220,60,60,0.2)",borderRadius:8}}><p style={{margin:0,fontSize:13,color:"#e06060",fontFamily:"sans-serif"}}>{errMsg}</p></div>}
            <button onClick={handleDecrypt} disabled={state==="loading"||!token||!email}
              style={{padding:"16px",background:gold,color:"#0a0a0f",border:"none",borderRadius:8,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:(state==="loading"||!token||!email)?0.6:1}}>
              {state==="loading"?<><Loader2 size={18} style={{animation:"spin 1s linear infinite"}}/>{es?"Descifrando...":"Decrypting..."}</>:<><Unlock size={18}/>{es?"Descifrar Legado":"Decrypt Legacy"}</>}
            </button>
            <p style={{fontSize:12,color:"#4a4038",fontFamily:"sans-serif",textAlign:"center",margin:0}}>🔒 {es?"El descifrado ocurre en tu dispositivo.":"Decryption happens on your device."}</p>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{padding:"14px",background:"rgba(92,184,144,0.08)",border:"1px solid rgba(92,184,144,0.2)",borderRadius:10,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <CheckCircle size={18} color="#5cb890"/><span style={{fontSize:14,color:"#5cb890",fontFamily:"sans-serif",fontWeight:600}}>{es?"Legado descifrado":"Legacy decrypted"}</span>
            </div>
            {data?.glm_summary&&<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,padding:18}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><Sparkles size={15} color={gold}/><span style={{fontSize:14,color:"#e8e0d0",fontFamily:"sans-serif"}}>Resumen IA</span></div><p style={{fontSize:14,color:"#a09080",fontFamily:"sans-serif",lineHeight:1.7,margin:0}}>{data.glm_summary}</p></div>}
            {data?.testament&&<div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,padding:18}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><FileText size={15} color="#6a6058"/><span style={{fontSize:14,color:"#e8e0d0",fontFamily:"sans-serif"}}>{es?"Mensaje":"Message"}</span></div><p style={{fontSize:14,color:"#a09080",fontFamily:"sans-serif",lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{data.testament}</p></div>}
            {data?.files&&data.files.length>0&&(
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(180,160,120,0.1)",borderRadius:12,padding:18}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <HardDrive size={15} color={gold}/>
                  <span style={{fontSize:14,color:"#e8e0d0",fontFamily:"sans-serif"}}>{es?"Archivos del Legado":"Legacy Files"}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {data.files.map((f,idx)=>(
                    <div key={f.id||idx} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"rgba(255,255,255,0.01)",border:"1px solid rgba(180,160,120,0.06)",borderRadius:8}}>
                      <FileText size={14} color="#6a6058"/>
                      <span style={{fontSize:13,color:"#a09080",fontFamily:"sans-serif",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                      <span style={{fontSize:12,color:"#6a6058",fontFamily:"sans-serif",flexShrink:0}}>{formatBytes(f.size)}</span>
                      <button onClick={()=>handleDownloadHeirFile(f)} style={{background:"none",border:"none",color:gold,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:12,fontFamily:"sans-serif"}}>
                        <Download size={14}/>{es?"Descargar":"Download"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <LogoIcon size={64}/>
      <div style={{display:"flex",gap:6}}>
        {[0,1,2].map(i=><div key={i} style={{width:6,height:6,background:gold,borderRadius:"50%",animation:"bounce 1.2s ease-in-out infinite",animationDelay:`${i*200}ms`}}/>)}
      </div>
      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  );
}
