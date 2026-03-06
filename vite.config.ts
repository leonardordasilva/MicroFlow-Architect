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
  // lovable-tagger: Required by Lovable platform for component tracking in dev mode
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-flow': ['@xyflow/react'],
          'dagre-layout': ['dagre'], // elkjs é carregado dinamicamente (lazy)
          'export-utils': ['html-to-image'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
}));
