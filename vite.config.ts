import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Prevent crash if API_KEY is missing by defaulting to empty string
      'process.env.API_KEY': JSON.stringify(env.API_KEY || "")
    }
  };
});