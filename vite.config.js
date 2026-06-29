import { defineConfig } from 'vite';

// base: './' -> Capacitor/APK icinde file:// ile dogru calismasi icin
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2019',
    chunkSizeWarningLimit: 1500,
  },
  server: { host: true, port: 5173 },
});
