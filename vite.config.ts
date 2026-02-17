import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente
  // Fix: Cast process to any to avoid TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
    },
    build: {
      outDir: 'dist',
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.AI_INTEGRATIONS_GEMINI_API_KEY || env.API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.API_KEY || ""),
      'process.env.GEMINI_BASE_URL': JSON.stringify(env.AI_INTEGRATIONS_GEMINI_BASE_URL || process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || ""),
    }
  }
})