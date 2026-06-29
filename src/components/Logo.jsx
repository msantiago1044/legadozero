/**
 * LegadoZero — Logo Component
 * Uso: <Logo size={40} /> o <Logo size={32} showText /> o <Logo size={64} showText showTagline />
 */

export function LogoIcon({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="LegadoZero"
    >
      <defs>
        <linearGradient id="lz-sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4A82A"/>
          <stop offset="100%" stopColor="#8B6010"/>
        </linearGradient>
        <linearGradient id="lz-si" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1408"/>
          <stop offset="100%" stopColor="#0d0b06"/>
        </linearGradient>
        <linearGradient id="lz-lk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ECC84A"/>
          <stop offset="100%" stopColor="#C8920A"/>
        </linearGradient>
      </defs>
      {/* Glow ring */}
      <circle cx="100" cy="100" r="90" fill="#C8982A" opacity="0.06"/>
      {/* Shield outer */}
      <path d="M100 28 L158 50 L158 108 Q158 158 100 182 Q42 158 42 108 L42 50 Z"
            fill="url(#lz-sg)" stroke="#ECC84A" strokeWidth="1"/>
      {/* Shield inner fill */}
      <path d="M100 38 L148 57 L148 107 Q148 151 100 172 Q52 151 52 107 L52 57 Z"
            fill="url(#lz-si)"/>
      {/* Shield inner border */}
      <path d="M100 44 L144 62 L144 107 Q144 147 100 167 Q56 147 56 107 L56 62 Z"
            fill="none" stroke="#C8982A" strokeWidth="0.6" opacity="0.5"/>
      {/* Lock shackle */}
      <path d="M86 98 L86 85 Q86 70 100 70 Q114 70 114 85 L114 98"
            fill="none" stroke="url(#lz-lk)" strokeWidth="5" strokeLinecap="round"/>
      {/* Lock body */}
      <rect x="78" y="97" width="44" height="34" rx="7"
            fill="url(#lz-lk)" stroke="#ECC84A" strokeWidth="0.5"/>
      {/* Keyhole */}
      <circle cx="100" cy="111" r="6.5" fill="#0a0a0f"/>
      <rect x="97.5" y="111" width="5" height="10" rx="2.5" fill="#0a0a0f"/>
    </svg>
  );
}

export function LogoFull({ size = 40, showTagline = false }) {
  const gold = "#C8982A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <LogoIcon size={size} />
      <div>
        <div style={{
          fontSize: size * 0.48,
          fontWeight: 700,
          color: gold,
          fontFamily: "Georgia, 'Times New Roman', serif",
          letterSpacing: "0.5px",
          lineHeight: 1.1,
        }}>
          LegadoZero
        </div>
        {showTagline && (
          <div style={{
            fontSize: size * 0.24,
            color: "#6a6058",
            fontFamily: "sans-serif",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            marginTop: 2,
          }}>
            Custodia Digital
          </div>
        )}
      </div>
    </div>
  );
}

export default LogoFull;
