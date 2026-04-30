import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const envRoot = path.resolve(__dirname, '../../..');
  const env = loadEnv(mode, envRoot, '');

  return {
    envDir: envRoot,
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APP_VERSION__': JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@components': path.resolve(__dirname, 'components'),
        '@services': path.resolve(__dirname, 'services'),
        '@types': path.resolve(__dirname, 'types'),
        '@utils': path.resolve(__dirname, 'utils'),
        '@hooks': path.resolve(__dirname, 'hooks'),
        '@context': path.resolve(__dirname, 'context'),
        '@pages': path.resolve(__dirname, 'pages'),
      },
    },
    server: {
      port: 5201,
      host: true,
      strictPort: true,
    },
    preview: {
      port: 5301,
      host: true,
      strictPort: true,
    },
    build: {
      minify: mode === 'production' ? 'esbuild' : false,
      sourcemap: env.VITE_SOURCE_MAPS === 'true',
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios', '@heroicons/react'],
    },
    esbuild: {
      define: {
        global: 'globalThis',
      },
    },
    css: {
      devSourcemap: mode === 'development',
    },
    plugins: [react()],
    json: {
      stringify: false,
      namedExports: true,
    },
  };
});
