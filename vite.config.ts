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
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-xlsx': ['xlsx'],
          'vendor-motion': ['framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
          ],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-pdfjs': ['pdfjs-dist'],
          'vendor-date': ['date-fns'],
          'vendor-qr': ['qrcode', 'qrcode.react'],
          'vendor-purify': ['dompurify'],
        },
      },
    },
  },
}));
