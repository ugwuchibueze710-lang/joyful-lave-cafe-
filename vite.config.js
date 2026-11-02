import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900, // three.js lives in its own lazy-loaded chunk
  },
});
