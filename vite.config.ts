import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Vite embeds these public values in browser assets at build time. Keep
// production deployments usable when the Vercel project has no VITE_* settings.
// Explicit environment variables still take precedence, and preview builds
// never inherit this production database configuration.
if (process.env.VERCEL_ENV === "production") {
  process.env.VITE_SUPABASE_URL ||= "https://rlfewneisuezsamhosct.supabase.co";
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= "sb_publishable_3I_Wf9MjrbRC54g6PNhlbA_CoSwT6UC";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    watch: {
      ignored: ["**/.testsprite/**"],
    },
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
    outDir: "dist",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Pin Rollup/Vite virtual helpers and core React/class utilities to vendor-react
          // so heavy lazy chunks (vendor-charts, vendor-pdf) are never pulled into initial boot.
          if (
            id.includes("vite/preload-helper") ||
            id.includes("commonjsHelpers") ||
            /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router|clsx|tailwind-merge|class-variance-authority)[\\/]/.test(
              id
            )
          ) {
            return "vendor-react";
          }
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|react-smooth)[\\/]/.test(id)) {
            return "vendor-charts";
          }
          if (/[\\/]node_modules[\\/](jspdf|html2canvas|canvg|fflate|fast-png|rgbcolor|stackblur-canvas)[\\/]/.test(id)) {
            return "vendor-pdf";
          }
          if (/[\\/]node_modules[\\/]xlsx[\\/]/.test(id)) return "vendor-xlsx";
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return "vendor-motion";
          if (/[\\/]node_modules[\\/](gsap|@gsap[\\/]react)[\\/]/.test(id)) return "vendor-gsap";
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return "vendor-three";
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return "vendor-supabase";
          if (/[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/.test(id)) return "vendor-query";
          if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return "vendor-radix";
          if (/[\\/]node_modules[\\/]@dnd-kit[\\/]/.test(id)) return "vendor-dnd";
          if (/[\\/]node_modules[\\/]pdfjs-dist[\\/]/.test(id)) return "vendor-pdfjs";
          if (/[\\/]node_modules[\\/]date-fns[\\/]/.test(id)) return "vendor-date";
          if (/[\\/]node_modules[\\/](qrcode|qrcode\.react)[\\/]/.test(id)) return "vendor-qr";
          if (/[\\/]node_modules[\\/]dompurify[\\/]/.test(id)) return "vendor-purify";
          return undefined;
        },
      },
    },
  },
}));
