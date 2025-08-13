import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://localhost:3001', 
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    __REQUIRED_ENVS__: (() => {
      const required = ['VITE_SQUDY_TOKEN_ADDRESS', 'VITE_CAMPAIGN_MANAGER_ADDRESS'];
      const missing = required.filter((k) => !(process.env as any)[k]);
      if (missing.length) {
        console.warn(`[build] Missing envs: ${missing.join(', ')}`);
      }
      return JSON.stringify({ missing });
    })(),
  },
  optimizeDeps: {
    include: ['buffer'],
  },
}));
