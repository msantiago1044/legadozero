/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Georgia", '"Times New Roman"', "serif"],
        sans: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        mono: ['"Fira Code"', '"Cascadia Code"', "monospace"],
      },
      colors: {
        vault: {
          bg: "#0a0a0f",
          bgsoft: "#12121a",
          ink: "#e8e4dc",
          muted: "#a09080",
          faint: "#8a8070",
          border: "rgba(180,160,120,0.15)",
        },
        gold: {
          DEFAULT: "#c8982a", // acento principal — coincide con LandingPage.jsx
          dark: "#8b6914",
          light: "#e0b84f",
          soft: "rgba(200,152,42,0.12)",
        },
        danger: "#b34a3a",
      },
      fontSize: {
        hero: ["clamp(2rem, 1.4rem + 3vw, 3.75rem)", { lineHeight: "1.05" }],
        h2: ["clamp(1.5rem, 1.2rem + 1.5vw, 2.5rem)", { lineHeight: "1.15" }],
        h3: ["clamp(1.15rem, 1.05rem + 0.5vw, 1.5rem)", { lineHeight: "1.3" }],
      },
      spacing: {
        "section-y": "clamp(48px, 6vw + 16px, 100px)",
      },
      transitionTimingFunction: {
        "vault-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "vault-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2.5s cubic-bezier(0.65,0,0.35,1) infinite alternate",
        "reveal": "reveal 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
      },
      keyframes: {
        glow: {
          "0%": { "box-shadow": "0 0 20px rgba(200, 152, 42, 0.25)" },
          "100%": { "box-shadow": "0 0 36px rgba(200, 152, 42, 0.5)" },
        },
        reveal: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "vault-gradient": "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #1a140a 100%)",
        "gold-gradient": "linear-gradient(135deg, #8b6914, #c8982a)",
        "critical-gradient": "linear-gradient(135deg, #1c0a0a 0%, #1f0000 100%)",
      },
    },
  },
  plugins: [],
};
