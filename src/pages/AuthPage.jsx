import { useState } from "react";
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Loader2 } from "lucide-react";
import { LogoFull } from "../components/Logo";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function supaFetch(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type":"application/json", apikey: SUPABASE_ANON },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function AuthPage({ onBack, onAuth, lang }) {
  const [mode, setMode] = useState("login"); // login | register | magic
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type:"", text:"" });

  const es = lang !== "en";
  const gold = "#C8982A";

  const T = {
    back: es ? "Volver al inicio" : "Back to home",
    loginTitle: es ? "Accede a tu bóveda" : "Access your vault",
    registerTitle: es ? "Crea tu cuenta" : "Create your account",
    magicTitle: es ? "Acceso sin contraseña" : "Passwordless access",
    emailLabel: es ? "Correo electrónico" : "Email address",
    passLabel: es ? "Contraseña" : "Password",
    loginBtn: es ? "Iniciar sesión" : "Sign in",
    registerBtn: es ? "Crear cuenta" : "Create account",
    magicBtn: es ? "Enviar enlace mágico" : "Send magic link",
    magicSent: es ? "Revisa tu correo — te enviamos un enlace de acceso." : "Check your email — we sent you an access link.",
    toRegister: es ? "¿No tienes cuenta? Crea una" : "No account? Create one",
    toLogin: es ? "¿Ya tienes cuenta? Accede" : "Already have an account? Sign in",
    toMagic: es ? "Acceder sin contraseña" : "Sign in without password",
    toPass: es ? "Usar contraseña" : "Use password",
    passMin: es ? "Mínimo 8 caracteres" : "Minimum 8 characters",
    privacy: es
      ? "Tu información se cifra localmente. LegadoZero no puede leer el contenido de tu bóveda."
      : "Your information is encrypted locally. LegadoZero cannot read the contents of your vault.",
  };

  async function handleSubmit() {
    if (!email) return setMsg({ type:"error", text: es?"Ingresa tu correo":"Enter your email" });
    setLoading(true);
    setMsg({ type:"", text:"" });

    try {
      // ── Magic link ──────────────────────────────────────────────
      if (mode === "magic") {
        const data = await supaFetch("/auth/v1/magiclink", { email });
        if (data.error) {
          setMsg({ type:"error", text: data.msg || data.error_description || data.error });
        } else {
          setMsg({ type:"ok", text: T.magicSent });
        }
        setLoading(false);
        return;
      }

      // ── Password validation ─────────────────────────────────────
      if (!password || password.length < 6) {
        setMsg({ type:"error", text: es?"Mínimo 6 caracteres":"Minimum 6 characters" });
        setLoading(false);
        return;
      }

      // ── Register ────────────────────────────────────────────────
      if (mode === "register") {
        const data = await supaFetch("/auth/v1/signup", { email, password });

        // Error explícito de Supabase
        if (data.error || data.code >= 400) {
          const errMsg = data.error_description || data.msg || data.message || data.error || (es?"Error al crear cuenta":"Error creating account");
          setMsg({ type:"error", text: errMsg });
          setLoading(false);
          return;
        }

        // Caso A: confirmación de email desactivada → token inmediato
        if (data.access_token) {
          localStorage.setItem("lz_token", data.access_token);
          localStorage.setItem("lz_user", JSON.stringify(data.user));
          // Crear bóveda
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_vault`, {
              method: "POST",
              headers: { "Content-Type":"application/json", apikey: SUPABASE_ANON, Authorization:`Bearer ${data.access_token}` },
              body: JSON.stringify({ p_email: email }),
            });
          } catch { /* vault creation optional at this stage */ }
          sessionStorage.setItem("lz_account_pass", password);
          onAuth(data.user, password);
          return;
        }

        // Caso B: confirmación de email activada → pedir que revise correo
        if (data.id || data.user?.id) {
          setMsg({
            type:"ok",
            text: es
              ? "✓ Cuenta creada. Revisa tu correo y confirma tu email para ingresar."
              : "✓ Account created. Check your email and confirm it to sign in.",
          });
          setLoading(false);
          return;
        }

        // Caso C: respuesta inesperada
        setMsg({ type:"error", text: es?"Respuesta inesperada. Contacta soporte.":"Unexpected response. Contact support." });
        setLoading(false);
        return;
      }

      // ── Login ───────────────────────────────────────────────────
      const data = await supaFetch("/auth/v1/token?grant_type=password", { email, password });

      if (data.access_token) {
        localStorage.setItem("lz_token", data.access_token);
        localStorage.setItem("lz_user", JSON.stringify(data.user));
        sessionStorage.setItem("lz_account_pass", password);
        onAuth(data.user, password);
      } else {
        const errMap = {
          "Invalid login credentials": es?"Correo o contraseña incorrectos":"Invalid email or password",
          "Email not confirmed": es?"Confirma tu correo antes de ingresar":"Please confirm your email first",
        };
        const raw = data.error_description || data.msg || data.message || data.error || "";
        const friendly = errMap[raw] || raw || (es?"Error al iniciar sesión":"Login error");
        setMsg({ type:"error", text: friendly });
      }

    } catch (err) {
      setMsg({ type:"error", text: es?`Error de conexión: ${err.message}`:`Connection error: ${err.message}` });
    }
    setLoading(false);
  }

  const inp = { width:"100%", padding:"14px 16px 14px 44px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(180,160,120,0.2)", borderRadius:8, color:"#e8e0d0", fontSize:15, fontFamily:"sans-serif", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" };
  const iconWrap = { position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#6a6058", pointerEvents:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", flexDirection:"column", fontFamily:"Georgia,'Times New Roman',serif" }}>

      {/* Header */}
      <div style={{ padding:"24px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(180,160,120,0.1)" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", color:"#8a7868", fontSize:14, cursor:"pointer", fontFamily:"sans-serif", padding:0 }}
          onMouseEnter={e=>e.currentTarget.style.color=gold} onMouseLeave={e=>e.currentTarget.style.color="#8a7868"}
        >
          <ArrowLeft size={16}/> {T.back}
        </button>
        <LogoFull size={32} showTagline />
      </div>

      {/* Form area */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
        <div style={{ width:"100%", maxWidth:420 }}>

          {/* Decorative line */}
          <div style={{ width:32, height:1, background:gold, marginBottom:32 }}/>

          <h1 style={{ fontSize:28, fontWeight:400, color:"#f0ece4", margin:"0 0 8px" }}>
            {mode === "register" ? T.registerTitle : mode === "magic" ? T.magicTitle : T.loginTitle}
          </h1>
          <p style={{ fontSize:14, color:"#6a6058", fontFamily:"sans-serif", margin:"0 0 36px", lineHeight:1.5 }}>
            {es ? "Tu bóveda digital protegida con cifrado de grado bancario." : "Your digital vault protected with banking-grade encryption."}
          </p>

          {/* Fields */}
          <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
            <div style={{ position:"relative" }}>
              <div style={iconWrap}><Mail size={16}/></div>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                placeholder={T.emailLabel} style={inp}
                onFocus={e=>e.target.style.borderColor=gold} onBlur={e=>e.target.style.borderColor="rgba(180,160,120,0.2)"}
              />
            </div>

            {mode !== "magic" && (
              <div style={{ position:"relative" }}>
                <div style={iconWrap}><Lock size={16}/></div>
                <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
                  placeholder={T.passLabel} style={{ ...inp, paddingRight:44 }}
                  onFocus={e=>e.target.style.borderColor=gold} onBlur={e=>e.target.style.borderColor="rgba(180,160,120,0.2)"}
                />
                <button onClick={()=>setShowPass(p=>!p)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#6a6058", cursor:"pointer", padding:0 }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            )}
          </div>

          {/* Message */}
          {msg.text && (
            <div style={{ padding:"12px 16px", borderRadius:8, marginBottom:20, fontSize:14, fontFamily:"sans-serif", background:msg.type==="ok"?"rgba(200,152,42,0.08)":"rgba(220,60,60,0.08)", border:`1px solid ${msg.type==="ok"?"rgba(200,152,42,0.2)":"rgba(220,60,60,0.2)"}`, color:msg.type==="ok"?gold:"#e06060" }}>
              {msg.text}
            </div>
          )}

          {/* Main button */}
          <button onClick={handleSubmit} disabled={loading}
            style={{ width:"100%", padding:"16px", background:gold, color:"#0a0a0f", border:"none", borderRadius:8, fontSize:16, fontWeight:600, cursor:"pointer", fontFamily:"sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:loading?0.8:1, transition:"background 0.2s" }}
            onMouseEnter={e=>!loading&&(e.currentTarget.style.background="#d4a832")}
            onMouseLeave={e=>e.currentTarget.style.background=gold}
          >
            {loading && <Loader2 size={18} style={{ animation:"spin 1s linear infinite" }}/>}
            {mode==="register" ? T.registerBtn : mode==="magic" ? T.magicBtn : T.loginBtn}
          </button>

          {/* Mode switchers */}
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:24, textAlign:"center" }}>
            {mode !== "register" && (
              <button onClick={()=>{setMode("register");setMsg({type:"",text:""})}}
                style={{ background:"none", border:"none", color:"#8a7868", fontSize:14, cursor:"pointer", fontFamily:"sans-serif", textDecoration:"underline" }}
                onMouseEnter={e=>e.target.style.color=gold} onMouseLeave={e=>e.target.style.color="#8a7868"}
              >{T.toRegister}</button>
            )}
            {mode !== "login" && (
              <button onClick={()=>{setMode("login");setMsg({type:"",text:""})}}
                style={{ background:"none", border:"none", color:"#8a7868", fontSize:14, cursor:"pointer", fontFamily:"sans-serif", textDecoration:"underline" }}
                onMouseEnter={e=>e.target.style.color=gold} onMouseLeave={e=>e.target.style.color="#8a7868"}
              >{T.toLogin}</button>
            )}
            {mode !== "magic" && (
              <button onClick={()=>{setMode("magic");setMsg({type:"",text:""})}}
                style={{ background:"none", border:"none", color:"#6a6058", fontSize:13, cursor:"pointer", fontFamily:"sans-serif" }}
                onMouseEnter={e=>e.target.style.color=gold} onMouseLeave={e=>e.target.style.color="#6a6058"}
              >{T.toMagic}</button>
            )}
            {mode === "magic" && (
              <button onClick={()=>{setMode("login");setMsg({type:"",text:""})}}
                style={{ background:"none", border:"none", color:"#6a6058", fontSize:13, cursor:"pointer", fontFamily:"sans-serif" }}
                onMouseEnter={e=>e.target.style.color=gold} onMouseLeave={e=>e.target.style.color="#6a6058"}
              >{T.toPass}</button>
            )}
          </div>

          {/* Privacy note */}
          <p style={{ fontSize:12, color:"#4a4038", fontFamily:"sans-serif", textAlign:"center", margin:"32px 0 0", lineHeight:1.5 }}>
            🔒 {T.privacy}
          </p>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
