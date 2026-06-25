// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          crypto: ["./src/lib/crypto"],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
