import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const SPRING_BACKEND = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080';

export default defineConfig({
  base: '/dashboard/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/admin': {
        target: SPRING_BACKEND,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
