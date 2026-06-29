import { useState, useEffect } from "react";
import { Shield, Users, CreditCard, Clock, AlertTriangle, CheckCircle, LogOut, RefreshCw, Loader2, ChevronDown } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day:"2-digit", month:"short", year:"numeric" });
}

function daysSince(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d)) / 86400000);
}

function statusColor(v) {
  if (v.status === "triggered") return { bg:"rgba(220,60,60,0.08)", border:"rgba(220,60,60,0.2)", text:"#e06060", label:"Liberada" };
  if (!v.is_paid) return { bg:"rgba(180,160,120,0.06)", border:"rgba(180,160,120,0.15)", text:"#8a7868", label:"Sin pago" };
  const d = daysSince(v.last_pulse_at);
  if (d >= 50) return { bg:"rgba(220,60,60,0.08)", border:"rgba(220,60,60,0.2)", text:"#e06060", label:"Crítico" };
  if (d >= 30) return { bg:"rgba(200,152,42,0.08)", border:"rgba(200,152,42,0.2)", text:"#C8982A", label:"Alerta" };
  return { bg:"rgba(60,180,120,0.06)", border:"rgba(60,180,120,0.15)", text:"#5cb890", label:"Activa" };
}

export default function AdminPanel({ user, onSignOut, lang }) {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [expanded, setExpanded] = useState(null);
  const [stats, setStats] = useState({ total:0, paid:0, active:0, triggered:0, warning:0 });

  const gold = "#C8982A";
  const es = lang !== "en";

  useEffect(() => { fetchVaults(); }, []);

  async function fetchVaults() {
    setLoading(true);
    try {
      const token = localStorage.getItem("lz_token");
      const res = await fetch(`${SUPABASE_URL}/rest/v1/vaults?select=id,user_email,is_paid,status,last_pulse_at,alert_level,storage_used_bytes,created_at,triggered_at,notifications_sent,heirs_contacts&order=created_at.desc&limit=200`, {
        headers: { apikey: SUPABASE_ANON, Authorization:`Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setVaults(data);
        const d = daysSince;
        setStats({
          total: data.length,
          paid: data.filter(v=>v.is_paid).length,
          active: data.filter(v=>v.status==="active"&&v.is_paid).length,
          triggered: data.filter(v=>v.status==="triggered").length,
          warning: data.filter(v=>v.status==="active"&&v.is_paid&&d(v.last_pulse_at)>=30).length,
        });
      }
    } catch { console.error("Admin fetch error"); }
    setLoading(false);
  }

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(180,160,120,0.1)", borderRadius:12, padding:"24px 20px", textAlign:"center" }}>
      <div style={{ width:40, height:40, background:`${color}18`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
        <Icon size={20} color={color}/>
      </div>
      <div style={{ fontSize:32, fontWeight:300, color:"#f0ece4", fontFamily:"Georgia,serif" }}>{value}</div>
      <div style={{ fontSize:12, color:"#6a6058", fontFamily:"sans-serif", marginTop:4, letterSpacing:"0.5px" }}>{label}</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", color:"#e8e4dc", fontFamily:"Georgia,'Times New Roman',serif" }}>

      {/* Header */}
      <header style={{ borderBottom:"1px solid rgba(180,160,120,0.12)", background:"rgba(10,10,15,0.98)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, background:"linear-gradient(135deg,#8B6914,#C8982A)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{ fontSize:16, color:gold }}>LegadoZero</span>
            <span style={{ fontSize:11, color:"#6a6058", fontFamily:"sans-serif", padding:"3px 8px", border:"1px solid rgba(180,160,120,0.15)", borderRadius:4, letterSpacing:"1px", textTransform:"uppercase" }}>Admin</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ fontSize:13, color:"#6a6058", fontFamily:"sans-serif" }}>{user?.email}</span>
            <button onClick={fetchVaults} style={{ background:"none", border:"1px solid rgba(180,160,120,0.2)", borderRadius:6, padding:"6px 10px", color:"#8a7868", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:"sans-serif" }}>
              <RefreshCw size={14}/>{es?"Actualizar":"Refresh"}
            </button>
            <button onClick={onSignOut} style={{ background:"none", border:"none", color:"#6a6058", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:"sans-serif" }}
              onMouseEnter={e=>e.currentTarget.style.color="#e06060"} onMouseLeave={e=>e.currentTarget.style.color="#6a6058"}
            ><LogOut size={14}/>{es?"Salir":"Sign out"}</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1200, margin:"0 auto", padding:"40px 24px" }}>

        <div style={{ marginBottom:40 }}>
          <h1 style={{ fontSize:28, fontWeight:400, color:"#f0ece4", margin:"0 0 6px" }}>{es?"Panel de administración":"Administration panel"}</h1>
          <p style={{ fontSize:14, color:"#6a6058", fontFamily:"sans-serif", margin:0 }}>{es?"Visión general de bóvedas, usuarios y estado del sistema.":"Overview of vaults, users and system status."}</p>
        </div>

        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0", gap:12, color:"#6a6058", fontFamily:"sans-serif" }}>
            <Loader2 size={20} style={{ animation:"spin 1s linear infinite" }}/>{es?"Cargando datos...":"Loading data..."}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:16, marginBottom:40 }}>
              <StatCard icon={Users}       label={es?"Total bóvedas":"Total vaults"}  value={stats.total}     color="#8a7868"/>
              <StatCard icon={CreditCard}  label={es?"Pagadas":"Paid"}               value={stats.paid}      color={gold}/>
              <StatCard icon={CheckCircle} label={es?"Activas":"Active"}             value={stats.active}    color="#5cb890"/>
              <StatCard icon={AlertTriangle} label={es?"En alerta":"Warning"}        value={stats.warning}   color={gold}/>
              <StatCard icon={Shield}      label={es?"Liberadas":"Triggered"}        value={stats.triggered} color="#e06060"/>
            </div>

            {/* Vault table */}
            <div style={{ border:"1px solid rgba(180,160,120,0.1)", borderRadius:12, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(180,160,120,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <h2 style={{ fontSize:16, fontWeight:400, color:"#e8e0d0", margin:0 }}>{es?"Bóvedas registradas":"Registered vaults"}</h2>
                <span style={{ fontSize:12, color:"#6a6058", fontFamily:"sans-serif" }}>{vaults.length} {es?"registros":"records"}</span>
              </div>

              {/* Table header */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 80px", gap:0, padding:"12px 20px", borderBottom:"1px solid rgba(180,160,120,0.08)", background:"rgba(255,255,255,0.01)" }}>
                {[es?"Usuario":"User", es?"Estado":"Status", es?"Días sin pulso":"Days since pulse", es?"Registro":"Registered", ""].map((h,i) => (
                  <div key={i} style={{ fontSize:11, color:"#6a6058", fontFamily:"sans-serif", letterSpacing:"0.5px", textTransform:"uppercase" }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {vaults.length === 0 ? (
                <div style={{ padding:"48px", textAlign:"center", color:"#6a6058", fontFamily:"sans-serif", fontSize:14 }}>
                  {es?"No hay bóvedas registradas aún.":"No vaults registered yet."}
                </div>
              ) : vaults.map((v, i) => {
                const sc = statusColor(v);
                const ds = daysSince(v.last_pulse_at);
                const heirs = Array.isArray(v.heirs_contacts) ? v.heirs_contacts : [];
                const isExp = expanded === v.id;

                return (
                  <div key={v.id} style={{ borderBottom:"1px solid rgba(180,160,120,0.06)" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 80px", gap:0, padding:"14px 20px", cursor:"pointer", transition:"background 0.15s" }}
                      onClick={()=>setExpanded(isExp?null:v.id)}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    >
                      <div>
                        <div style={{ fontSize:14, color:"#e8e0d0", fontFamily:"sans-serif", marginBottom:2 }}>{v.user_email}</div>
                        <div style={{ fontSize:11, color:"#6a6058", fontFamily:"sans-serif" }}>
                          {v.is_paid ? (es?"Activo":"Paid") : (es?"Sin pago":"Unpaid")} · {heirs.length} {es?"herederos":"heirs"}
                        </div>
                      </div>
                      <div>
                        <span style={{ display:"inline-block", padding:"4px 10px", borderRadius:20, fontSize:11, fontFamily:"sans-serif", background:sc.bg, border:`1px solid ${sc.border}`, color:sc.text }}>
                          {sc.label}
                        </span>
                      </div>
                      <div style={{ fontSize:14, color: ds>=50?"#e06060":ds>=30?gold:"#8a7868", fontFamily:"sans-serif", display:"flex", alignItems:"center" }}>
                        {ds !== null ? `${ds}d` : "—"}
                      </div>
                      <div style={{ fontSize:13, color:"#6a6058", fontFamily:"sans-serif", display:"flex", alignItems:"center" }}>
                        {formatDate(v.created_at)}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
                        <ChevronDown size={16} color="#6a6058" style={{ transform:isExp?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExp && (
                      <div style={{ padding:"0 20px 20px", background:"rgba(255,255,255,0.01)", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
                        <div>
                          <div style={{ fontSize:11, color:"#6a6058", fontFamily:"sans-serif", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:8 }}>{es?"Detalles":"Details"}</div>
                          <div style={{ fontSize:13, color:"#a09080", fontFamily:"sans-serif", lineHeight:1.8 }}>
                            <div>ID: <span style={{ color:"#6a6058", fontFamily:"monospace", fontSize:11 }}>{v.id}</span></div>
                            <div>{es?"Último pulso":"Last pulse"}: {formatDate(v.last_pulse_at)}</div>
                            <div>{es?"Avisos enviados":"Alerts sent"}: {v.notifications_sent}</div>
                            <div>{es?"Almacenamiento":"Storage"}: {v.storage_used_bytes ? `${(v.storage_used_bytes/1048576).toFixed(1)} MB` : "0 MB"}</div>
                            {v.triggered_at && <div style={{ color:"#e06060" }}>{es?"Liberada":"Released"}: {formatDate(v.triggered_at)}</div>}
                          </div>
                        </div>
                        {heirs.length > 0 && (
                          <div>
                            <div style={{ fontSize:11, color:"#6a6058", fontFamily:"sans-serif", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:8 }}>{es?"Herederos":"Heirs"}</div>
                            {heirs.map((h,j) => (
                              <div key={j} style={{ fontSize:13, color:"#a09080", fontFamily:"sans-serif", padding:"6px 0", borderBottom:"1px solid rgba(180,160,120,0.06)" }}>
                                <div style={{ color:"#e8e0d0" }}>{h.name}</div>
                                <div style={{ fontSize:12, color:"#6a6058" }}>{h.email} {h.whatsapp && `· ${h.whatsapp}`}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
