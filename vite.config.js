import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  server: {
    // `npm run dev:server` runs the order server on :3001
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: false } },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900, // three.js lives in its own lazy-loaded chunk
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        track: resolve(import.meta.dirname, 'track.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
      },
    },
  },
});
