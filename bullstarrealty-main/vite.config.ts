import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  build: {
    sourcemap: false,
    target: "es2019",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor_react: ["react", "react-dom", "react-router-dom"],
          vendor_supabase: ["@supabase/supabase-js"],
          vendor_charts: ["recharts"],
          vendor_excel: ["xlsx"],
          vendor_ui: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
