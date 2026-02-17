import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente
  // Fix: Cast process to any to avoid TS error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    // Define process.env para o cliente (API Key)
    // O fallback para "" garante que o código não quebre com "process is not defined" se a variável faltar
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || "")
    }
  }
})