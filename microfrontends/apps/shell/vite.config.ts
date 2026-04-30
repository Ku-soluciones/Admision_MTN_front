import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Load env files from project root (3 levels up from shell location)
  envDir: path.resolve(__dirname, '../../..'),
  base: './',
  server: {
    port: 5200,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5300,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
