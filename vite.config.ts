import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router-dom") || id.includes("react-dom") || id.includes("react")) {
              return "react-core";
            }
            if (id.includes("@supabase") || id.includes("@lovable.dev")) {
              return "supabase";
            }
            if (id.includes("@tanstack")) {
              return "react-query";
            }
            if (id.includes("recharts")) {
              return "recharts";
            }
            if (id.includes("jspdf") || id.includes("xlsx") || id.includes("html2canvas")) {
              return "document-tools";
            }
            if (id.includes("lucide-react")) {
              return "lucide";
            }
            if (id.includes("framer-motion")) {
              return "framer-motion";
            }
            return "vendor";
          }
        },
      },
    },
  },
}));
