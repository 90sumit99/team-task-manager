import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production API URL — used by Vite's define to replace at build time
const PROD_API_URL = 'https://backend-production-e5dc6.up.railway.app';
const DEV_API_URL = 'http://localhost:5000';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  
  return {
    plugins: [react()],

    // define: replaces these strings at the JS AST level during build
    // This guarantees the right URL is embedded even if env vars aren't injected
    define: {
      '__API_BASE_URL__': JSON.stringify(
        process.env.VITE_API_URL || (isDev ? DEV_API_URL : PROD_API_URL)
      ),
    },

    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: DEV_API_URL,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
})
