/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
        mono: ['"Fira Code"', '"Cascadia Code"', "monospace"],
      },
      colors: {
        brand: {
          DEFAULT: "#7c3aed", // violet-600
          dark: "#6d28d9",
          light: "#8b5cf6",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slow": "bounce 2s infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { "box-shadow": "0 0 20px rgba(124, 58, 237, 0.3)" },
          "100%": { "box-shadow": "0 0 40px rgba(124, 58, 237, 0.6)" },
        },
      },
      backgroundImage: {
        "vault-gradient": "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)",
        "critical-gradient": "linear-gradient(135deg, #1c0a0a 0%, #1f0000 100%)",
      },
    },
  },
  plugins: [],
};
