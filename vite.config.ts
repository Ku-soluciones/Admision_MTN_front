import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Connect } from 'vite';
import { createClient } from '@vercel/flags-core';

/**
 * Middleware que simula las Edge Functions de /api/flags/* en desarrollo local.
 * Lee Vercel Flags mediante FLAGS. FLAGS_SECRET sólo sirve para overrides,
 * no para obtener el valor configurado del flag.
 */
function flagsDevMiddleware(env: Record<string, string>): Connect.NextHandleFunction {
  const flagsSdkKey = env.FLAGS || process.env.FLAGS;
  const flagsClientPromise = flagsSdkKey
    ? (async () => {
        try {
          const client = createClient(flagsSdkKey);
          await client.initialize();
          return client;
        } catch (err) {
          console.warn('[Flags Dev] No se pudo inicializar @vercel/flags-core:', err);
          return null;
        }
      })()
    : null;

  return async (req, res, next) => {
    // Solo interceptar rutas /api/flags/*
    if (!req.url?.startsWith('/api/flags/')) {
      return next();
    }

    const flagKey = req.url.replace('/api/flags/', '').split('?')[0];

    if (!flagKey || flagKey === '') {
      return next();
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    try {
      if (flagsClientPromise) {
        const flagsClient = await flagsClientPromise;
        const result = await flagsClient.evaluate<boolean>(flagKey, false);
        const enabled = Boolean(result.value);
        console.log(`[Flags Dev] "${flagKey}" (Vercel Flags) → ${enabled}`);
        res.end(JSON.stringify({ enabled, source: 'vercel-flags' }));
        return;
      }

      console.warn(
        `[Flags Dev] FLAGS no está configurado. FLAGS_SECRET no permite evaluar "${flagKey}". ` +
        `Flag "${flagKey}" → false (dev default)`,
      );
      res.end(JSON.stringify({ enabled: false, source: 'default' }));
    } catch (error) {
      console.error(`[Flags Dev] Error evaluando flag "${flagKey}":`, error);
      res.end(JSON.stringify({ enabled: false, source: 'default' }));
    }
  };
}

export default defineConfig(({ mode }) => {
  const envRoot = __dirname;
  const env = loadEnv(mode, envRoot, '');

  return {
    root: __dirname,
    envDir: envRoot,
    // BrowserRouter requiere assets absolutos: una ruta relativa haría que
    // /profesor/login busque el bundle en /profesor/assets y falle al recargar.
    base: '/',
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/features/interviews'),
      },
    },
    server: {
      port: 5200,
      host: true,
      strictPort: true,
    },
    preview: {
      port: 5300,
      host: true,
      strictPort: true,
    },
    build: {
      minify: mode === 'production' ? 'esbuild' : false,
      sourcemap: env.VITE_SOURCE_MAPS === 'true',
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
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
    plugins: [
      react(),
      {
        name: 'flags-dev-middleware',
        configureServer(server) {
          server.middlewares.use(flagsDevMiddleware(env));
        },
      },
    ],
    json: {
      stringify: false,
      namedExports: true,
    },
  };
});
