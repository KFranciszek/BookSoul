import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    // Make environment variables available to the frontend
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(process.env.SENTRY_DSN),
    'import.meta.env.VITE_SENTRY_ENVIRONMENT': JSON.stringify(process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV),
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(process.env.SENTRY_RELEASE),
  },
  build: {
    // Optimize bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
          api: ['axios', '@supabase/supabase-js'],
          sentry: ['@sentry/react']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for production debugging
    sourcemap: true
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
});