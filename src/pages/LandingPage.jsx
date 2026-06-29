import { useState } from "react";
import { Shield, Lock, Heart, Clock, CheckCircle, ArrowRight, Star, ChevronDown } from "lucide-react";

export default function LandingPage({ onGoToAuth, lang }) {
  const [faqOpen, setFaqOpen] = useState(null);

  const es = lang !== "en";

  const t = {
    nav: es ? ["Cómo funciona","Seguridad","Precio","Preguntas"] : ["How it works","Security","Pricing","FAQ"],
    login: es ? "Acceder" : "Sign in",
    badge: es ? "Custodia Digital de Confianza" : "Trusted Digital Custody",
    h1a: es ? "Tu legado," : "Your legacy,",
    h1b: es ? "protegido para siempre." : "protected forever.",
    hero_p: es
      ? "Cuando ya no estés, tus seres queridos recibirán exactamente lo que decidiste dejarles. Documentos, contraseñas, últimas voluntades — cifrados con tecnología bancaria, liberados solo si es necesario."
      : "When you're gone, your loved ones will receive exactly what you decided to leave them. Documents, passwords, last wishes — encrypted with banking-grade technology, released only when necessary.",
    hero_cta: es ? "Proteger mi legado ahora" : "Protect my legacy now",
    hero_sub: es ? "Pago único desde $10 USD · Sin suscripciones · 1 GB de almacenamiento cifrado" : "One-time payment from $10 USD · No subscriptions · 1 GB encrypted storage",
    how_title: es ? "Paz mental en tres pasos" : "Peace of mind in three steps",
    how_sub: es ? "Un proceso diseñado con la misma seriedad que merece el momento." : "A process designed with the seriousness the moment deserves.",
    steps: es ? [
      { n:"01", t:"Crea tu bóveda", d:"Sube documentos, escribe tus últimas voluntades y designa herederos. Todo se cifra en tu dispositivo antes de salir." },
      { n:"02", t:"Confirma tu vitalidad", d:"Una vez cada 60 días confirmas que sigues aquí. Recibes recordatorios antes de que venza el plazo." },
      { n:"03", t:"Tu legado llega", d:"Si no respondes en 60 días, tus herederos reciben acceso seguro por correo y WhatsApp. El descifrado ocurre en su dispositivo." },
    ] : [
      { n:"01", t:"Create your vault", d:"Upload documents, write your last wishes, designate heirs. Everything is encrypted on your device before leaving." },
      { n:"02", t:"Confirm your vitality", d:"Once every 60 days you confirm you're still here. You receive reminders before the deadline." },
      { n:"03", t:"Your legacy arrives", d:"If you don't respond in 60 days, your heirs receive secure access by email and WhatsApp. Decryption happens on their device." },
    ],
    sec_title: es ? "Cifrado de grado bancario" : "Banking-grade encryption",
    sec_sub: es ? "El mismo estándar que protege los bancos más seguros del mundo." : "The same standard that protects the world's most secure banks.",
    sec_items: es ? [
      { t:"AES-256 local", d:"Tu información se cifra en tu dispositivo. El servidor nunca ve el contenido original." },
      { t:"PBKDF2 · 600.000 iteraciones", d:"Derivación de claves conforme al estándar OWASP 2024, el más exigente del sector." },
      { t:"Arquitectura Zero-Knowledge", d:"Conocimiento cero absoluto. Ni nuestro equipo técnico puede acceder a tu bóveda." },
      { t:"Interruptor automático", d:"El protocolo de herencia se activa solo tras 60 días exactos de inactividad verificada." },
    ] : [
      { t:"Local AES-256", d:"Your information is encrypted on your device. The server never sees the original content." },
      { t:"PBKDF2 · 600,000 iterations", d:"Key derivation meets the OWASP 2024 standard, the most demanding in the industry." },
      { t:"Zero-Knowledge architecture", d:"Absolute zero-knowledge. Even our technical team cannot access your vault." },
      { t:"Automatic switch", d:"The inheritance protocol activates only after exactly 60 verified days of inactivity." },
    ],
    price_title: es ? "Un solo pago. Para siempre." : "One payment. Forever.",
    price_sub: es ? "Sin sorpresas. Sin renovaciones. Sin riesgo de corte." : "No surprises. No renewals. No cutoff risk.",
    price_items: es
      ? ["1 GB de almacenamiento cifrado","Hasta 19 herederos designados","Notificación por correo y WhatsApp","60 días de interruptor de vida","Asistencia IA para tu testamento","Soporte de por vida"]
      : ["1 GB encrypted storage","Up to 19 designated heirs","Email and WhatsApp notification","60-day life switch","AI assistance for your testament","Lifetime support"],
    price_cta: es ? "Activar mi bóveda" : "Activate my vault",
    test_title: es ? "Lo que dicen quienes confían en nosotros" : "What those who trust us say",
    testimonials: es ? [
      { name:"María C.", loc:"Colombia", text:"Finalmente encontré una forma seria de dejar mis cuentas y documentos organizados. Mi familia sabrá exactamente qué hacer." },
      { name:"Andrés M.", loc:"México", text:"El proceso es sencillo pero la tecnología detrás es impresionante. Saber que mis datos están cifrados me da una tranquilidad enorme." },
      { name:"Lucía R.", loc:"España", text:"Lo que más me convenció es el pago único. No quería que un fallo bancario activara el protocolo por error." },
    ] : [
      { name:"María C.", loc:"Colombia", text:"I finally found a serious way to leave my accounts and documents organized. My family will know exactly what to do." },
      { name:"Andrés M.", loc:"Mexico", text:"The process is simple but the technology is impressive. Knowing my data is encrypted gives me enormous peace of mind." },
      { name:"Lucía R.", loc:"Spain", text:"What convinced me most is the one-time payment. I didn't want a banking failure to activate the protocol by mistake." },
    ],
    faq_title: es ? "Preguntas frecuentes" : "Frequently asked questions",
    faqs: es ? [
      { q:"¿Qué pasa si olvido confirmar mi vitalidad?", a:"El sistema te enviará 8 avisos progresivos por correo durante 60 días. Solo al cumplirse exactamente 60 días sin respuesta, el protocolo de herencia se activa." },
      { q:"¿Puede alguien acceder a mi bóveda sin permiso?", a:"No. Todo el cifrado ocurre en tu dispositivo con AES-256. Ni nuestro equipo puede leer tu contenido. Solo el heredero con el token correcto puede descifrar." },
      { q:"¿Qué reciben mis herederos exactamente?", a:"Reciben un correo y un WhatsApp con un enlace único y un token de acceso. Con esos dos elementos descifran tu legado localmente en su dispositivo." },
      { q:"¿Por qué un pago único y no suscripción?", a:"Porque si tu tarjeta vence mientras estás enfermo, no queremos que el sistema interprete eso como tu fallecimiento. Un pago único garantiza el servicio de por vida." },
      { q:"¿Cuántos archivos puedo guardar?", a:"Hasta 1 GB cifrado: documentos PDF, fotos, videos, hojas de cálculo, archivos de contraseñas, cualquier formato digital." },
    ] : [
      { q:"What happens if I forget to confirm my vitality?", a:"The system sends 8 progressive alerts over 60 days. Only after exactly 60 days without response does the inheritance protocol activate." },
      { q:"Can anyone access my vault without permission?", a:"No. All encryption happens on your device with AES-256. Even our team cannot read your content." },
      { q:"What do my heirs receive exactly?", a:"They receive an email and WhatsApp with a unique link and access token. With these two elements they decrypt your legacy locally." },
      { q:"Why a one-time payment?", a:"Because if your card expires while you're ill, we don't want the system to interpret that as your death. A one-time payment guarantees lifetime service." },
      { q:"How much can I store?", a:"Up to 1 GB encrypted: PDFs, photos, videos, spreadsheets, password files, any digital format." },
    ],
    footer_links: es
      ? ["Términos de uso","Privacidad","Seguridad","Soporte"]
      : ["Terms of use","Privacy","Security","Support"],
    footer_rights: es ? "Todos los derechos reservados." : "All rights reserved.",
    footer_tagline: es ? "Tu privacidad hoy. Tu certeza para siempre." : "Your privacy today. Your certainty forever.",
    cta2_h: es ? "El momento de actuar es hoy." : "The time to act is today.",
    cta2_p: es
      ? "El cuidado más profundo que puedes dar a quienes amas es dejarles claridad cuando más la necesiten."
      : "The deepest care you can give those you love is leaving them clarity when they need it most.",
    cta2_btn: es ? "Crear mi bóveda" : "Create my vault",
  };

  const S = {
    page: { fontFamily:"Georgia,'Times New Roman',serif", background:"#0a0a0f", color:"#e8e4dc", minHeight:"100vh" },
    nav: { position:"sticky", top:0, zIndex:100, background:"rgba(10,10,15,0.96)", borderBottom:"1px solid rgba(180,160,120,0.15)", backdropFilter:"blur(12px)" },
    navInner: { maxWidth:1100, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:68 },
    logo: { display:"flex", alignItems:"center", gap:12 },
    logoIcon: { width:38, height:38, background:"linear-gradient(135deg,#8B6914,#C8982A)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" },
    logoName: { fontSize:20, fontWeight:700, color:"#C8982A", letterSpacing:"0.5px" },
    logoSub: { fontSize:10, color:"#8a8070", letterSpacing:"1.5px", textTransform:"uppercase", fontFamily:"sans-serif" },
    navLinks: { display:"flex", alignItems:"center", gap:32 },
    navA: { color:"#a09080", fontSize:14, textDecoration:"none", fontFamily:"sans-serif", cursor:"pointer", transition:"color 0.15s" },
    loginBtn: { padding:"10px 24px", background:"transparent", border:"1px solid #C8982A", color:"#C8982A", borderRadius:6, fontSize:14, cursor:"pointer", fontFamily:"sans-serif", letterSpacing:"0.5px", transition:"all 0.2s" },
    section: (bg) => ({ padding:"100px 24px", borderBottom:"1px solid rgba(180,160,120,0.1)", ...(bg?{background:bg}:{}) }),
    inner: (w=1000) => ({ maxWidth:w, margin:"0 auto" }),
    center: { textAlign:"center" },
    h2: { fontSize:"clamp(28px,4vw,44px)", fontWeight:400, color:"#f0ece4", margin:"0 0 16px" },
    lead: { fontSize:16, color:"#8a7868", fontFamily:"sans-serif", margin:0, lineHeight:1.6 },
    gold: "#C8982A",
    goldBtn: { background:"#C8982A", color:"#0a0a0f", border:"none", borderRadius:8, fontWeight:600, cursor:"pointer", fontFamily:"sans-serif", transition:"background 0.2s" },
  };

  return (
    <div style={S.page}>

      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <div style={S.logo}>
            <div style={S.logoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={S.logoName}>LegadoZero</div>
              <div style={S.logoSub}>Custodia Digital</div>
            </div>
          </div>
          <div style={S.navLinks}>
            {t.nav.map((n, i) => (
              <a key={i} href={`#${["como","seguridad","precio","faq"][i]}`} style={S.navA}
                onMouseEnter={e=>e.target.style.color=S.gold} onMouseLeave={e=>e.target.style.color="#a09080"}
              >{n}</a>
            ))}
            <button onClick={onGoToAuth} style={S.loginBtn}
              onMouseEnter={e=>{e.target.style.background=S.gold;e.target.style.color="#0a0a0f"}}
              onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=S.gold}}
            >{t.login}</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight:"92vh", display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"80px 24px", borderBottom:"1px solid rgba(180,160,120,0.1)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:700, height:700, borderRadius:"50%", border:"1px solid rgba(200,152,42,0.05)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:1000, height:1000, borderRadius:"50%", border:"1px solid rgba(200,152,42,0.025)", pointerEvents:"none" }}/>
        <div style={{ maxWidth:700, position:"relative" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(200,152,42,0.08)", border:"1px solid rgba(200,152,42,0.2)", borderRadius:20, padding:"6px 18px", marginBottom:36, fontFamily:"sans-serif", fontSize:12, color:S.gold, letterSpacing:"1px", textTransform:"uppercase" }}>
            <div style={{ width:6, height:6, background:S.gold, borderRadius:"50%" }}/>
            {t.badge}
          </div>
          <h1 style={{ fontSize:"clamp(44px,8vw,82px)", fontWeight:400, lineHeight:1.08, margin:"0 0 28px", color:"#f0ece4" }}>
            {t.h1a}<br/>
            <em style={{ color:S.gold }}>{t.h1b}</em>
          </h1>
          <p style={{ fontSize:18, lineHeight:1.8, color:"#a09080", margin:"0 0 52px", fontFamily:"sans-serif", fontWeight:300, maxWidth:560, marginLeft:"auto", marginRight:"auto" }}>
            {t.hero_p}
          </p>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
            <button onClick={onGoToAuth}
              style={{ ...S.goldBtn, display:"inline-flex", alignItems:"center", gap:10, padding:"18px 44px", fontSize:16 }}
              onMouseEnter={e=>e.currentTarget.style.background="#d4a832"}
              onMouseLeave={e=>e.currentTarget.style.background=S.gold}
            >{t.hero_cta} <ArrowRight size={18}/></button>
            <p style={{ fontSize:13, color:"#6a6058", fontFamily:"sans-serif", margin:0 }}>{t.hero_sub}</p>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como" style={S.section()}>
        <div style={S.inner()}>
          <div style={{ ...S.center, marginBottom:60 }}>
            <h2 style={S.h2}>{t.how_title}</h2>
            <p style={S.lead}>{t.how_sub}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:2 }}>
            {t.steps.map((s,i) => (
              <div key={i} style={{ padding:"48px 36px", background:i===1?"rgba(200,152,42,0.05)":"rgba(255,255,255,0.015)", border:"1px solid rgba(180,160,120,0.1)", borderRadius:i===0?"12px 0 0 12px":i===2?"0 12px 12px 0":"0" }}>
                <div style={{ fontSize:12, color:S.gold, fontFamily:"sans-serif", letterSpacing:"2px", marginBottom:24 }}>{s.n}</div>
                <h3 style={{ fontSize:22, fontWeight:400, color:"#f0ece4", margin:"0 0 14px" }}>{s.t}</h3>
                <p style={{ fontSize:15, color:"#8a7868", lineHeight:1.7, margin:0, fontFamily:"sans-serif" }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEGURIDAD */}
      <section id="seguridad" style={S.section("rgba(255,255,255,0.01)")}>
        <div style={S.inner()}>
          <div style={{ ...S.center, marginBottom:60 }}>
            <h2 style={S.h2}>{t.sec_title}</h2>
            <p style={S.lead}>{t.sec_sub}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:20 }}>
            {t.sec_items.map((s,i) => (
              <div key={i} style={{ padding:"32px 24px", border:"1px solid rgba(180,160,120,0.1)", borderRadius:12, background:"rgba(10,10,15,0.5)" }}>
                <div style={{ width:40, height:40, background:"rgba(200,152,42,0.1)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                  {[<Lock size={20} color={S.gold}/>,<Shield size={20} color={S.gold}/>,<Heart size={20} color={S.gold}/>,<Clock size={20} color={S.gold}/>][i]}
                </div>
                <h4 style={{ fontSize:15, fontWeight:500, color:"#e8e0d0", margin:"0 0 10px", fontFamily:"sans-serif" }}>{s.t}</h4>
                <p style={{ fontSize:13, color:"#6a6058", lineHeight:1.6, margin:0, fontFamily:"sans-serif" }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIO */}
      <section id="precio" style={S.section()}>
        <div style={{ ...S.inner(520), textAlign:"center" }}>
          <h2 style={S.h2}>{t.price_title}</h2>
          <p style={{ ...S.lead, marginBottom:48 }}>{t.price_sub}</p>
          <div style={{ border:"1px solid rgba(200,152,42,0.25)", borderRadius:16, padding:"48px 40px", background:"rgba(200,152,42,0.03)" }}>
            <p style={{ fontSize:12, color:"#8a7868", fontFamily:"sans-serif", letterSpacing:"1px", textTransform:"uppercase", margin:"0 0 8px" }}>{es?"Desde":"From"}</p>
            <div style={{ fontSize:68, fontWeight:300, color:S.gold, lineHeight:1, margin:"0 0 8px" }}>$10 USD</div>
            <p style={{ fontSize:13, color:"#6a6058", fontFamily:"sans-serif", margin:"0 0 40px" }}>{es?"El precio se ajusta según tu país":"Price adjusts to your country"}</p>
            <div style={{ textAlign:"left", marginBottom:40 }}>
              {t.price_items.map((item,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:i<t.price_items.length-1?"1px solid rgba(180,160,120,0.07)":"none" }}>
                  <CheckCircle size={16} color={S.gold}/>
                  <span style={{ fontSize:15, color:"#a09080", fontFamily:"sans-serif" }}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={onGoToAuth}
              style={{ ...S.goldBtn, width:"100%", padding:"18px", fontSize:16 }}
              onMouseEnter={e=>e.target.style.background="#d4a832"}
              onMouseLeave={e=>e.target.style.background=S.gold}
            >{t.price_cta}</button>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section style={S.section("rgba(255,255,255,0.01)")}>
        <div style={S.inner()}>
          <h2 style={{ ...S.h2, ...S.center, marginBottom:60 }}>{t.test_title}</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:20 }}>
            {t.testimonials.map((tm,i) => (
              <div key={i} style={{ padding:"32px", border:"1px solid rgba(180,160,120,0.1)", borderRadius:12, background:"rgba(10,10,15,0.4)" }}>
                <div style={{ display:"flex", gap:3, marginBottom:20 }}>
                  {[...Array(5)].map((_,j) => <Star key={j} size={13} fill={S.gold} color={S.gold}/>)}
                </div>
                <p style={{ fontSize:15, color:"#a09080", lineHeight:1.7, margin:"0 0 24px", fontStyle:"italic" }}>"{tm.text}"</p>
                <div style={{ fontSize:14, color:"#e8e0d0", fontFamily:"sans-serif", fontWeight:500 }}>{tm.name}</div>
                <div style={{ fontSize:12, color:"#6a6058", fontFamily:"sans-serif" }}>{tm.loc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={S.section()}>
        <div style={{ ...S.inner(680) }}>
          <h2 style={{ ...S.h2, ...S.center, marginBottom:48 }}>{t.faq_title}</h2>
          {t.faqs.map((f,i) => (
            <div key={i} style={{ borderBottom:"1px solid rgba(180,160,120,0.1)" }}>
              <button onClick={()=>setFaqOpen(faqOpen===i?null:i)}
                style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"22px 0", background:"none", border:"none", color:"#e8e0d0", fontSize:16, cursor:"pointer", textAlign:"left", fontFamily:"Georgia,serif" }}>
                {f.q}
                <ChevronDown size={18} color={S.gold} style={{ transition:"transform 0.2s", transform:faqOpen===i?"rotate(180deg)":"none", flexShrink:0, marginLeft:16 }}/>
              </button>
              {faqOpen===i && <p style={{ fontSize:15, color:"#8a7868", lineHeight:1.7, padding:"0 0 22px", margin:0, fontFamily:"sans-serif" }}>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding:"100px 24px", textAlign:"center" }}>
        <div style={S.inner(560)}>
          <div style={{ width:48, height:1, background:S.gold, margin:"0 auto 32px" }}/>
          <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:400, color:"#f0ece4", margin:"0 0 16px" }}>{t.cta2_h}</h2>
          <p style={{ fontSize:16, color:"#8a7868", margin:"0 0 40px", fontFamily:"sans-serif", lineHeight:1.7 }}>{t.cta2_p}</p>
          <button onClick={onGoToAuth}
            style={{ ...S.goldBtn, padding:"18px 48px", fontSize:16 }}
            onMouseEnter={e=>e.target.style.background="#d4a832"}
            onMouseLeave={e=>e.target.style.background=S.gold}
          >{t.cta2_btn}</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding:"48px 24px", borderTop:"1px solid rgba(180,160,120,0.1)", background:"rgba(5,5,8,0.9)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"flex-start", gap:32, marginBottom:36 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:28, height:28, background:"linear-gradient(135deg,#8B6914,#C8982A)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span style={{ fontSize:16, color:S.gold, fontFamily:"Georgia,serif" }}>LegadoZero</span>
              </div>
              <p style={{ fontSize:13, color:"#6a6058", fontFamily:"sans-serif", maxWidth:220, lineHeight:1.6, margin:0 }}>{t.footer_tagline}</p>
            </div>
            <div style={{ display:"flex", gap:28, flexWrap:"wrap", alignItems:"center" }}>
              {t.footer_links.map((l,i) => (
                <a key={i} href="#" style={{ fontSize:13, color:"#6a6058", textDecoration:"none", fontFamily:"sans-serif" }}
                  onMouseEnter={e=>e.target.style.color=S.gold} onMouseLeave={e=>e.target.style.color="#6a6058"}
                >{l}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop:"1px solid rgba(180,160,120,0.07)", paddingTop:24, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            <p style={{ fontSize:12, color:"#4a4038", fontFamily:"sans-serif", margin:0 }}>© {new Date().getFullYear()} LegadoZero — {t.footer_rights}</p>
            <p style={{ fontSize:12, color:"#4a4038", fontFamily:"sans-serif", margin:0 }}>AES-256 · Zero-Knowledge · PBKDF2</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
