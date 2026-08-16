import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
          // Charting library (recharts + d3 dependencies)
          'vendor-charts': ['recharts'],
          // PDF & document export
          'vendor-pdf': ['jspdf', 'html2canvas'],
          // Excel processing
          'vendor-xlsx': ['xlsx'],
          // Animation library
          'vendor-motion': ['framer-motion'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // TanStack Query
          'vendor-query': ['@tanstack/react-query'],
          // Radix UI primitives
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
          // DnD kit for pipeline
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // PDF viewer
          'vendor-pdfjs': ['pdfjs-dist'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // QR code generation
          'vendor-qr': ['qrcode', 'qrcode.react'],
          // DOMPurify
          'vendor-purify': ['dompurify'],
        },
      },
    },
  },
}));
