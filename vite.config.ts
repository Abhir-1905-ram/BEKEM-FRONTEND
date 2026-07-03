import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@afios/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_PROXY_TARGET ||
          'https://bekem-backend-production.up.railway.app',
        changeOrigin: true,
      },
    },
  },
});
