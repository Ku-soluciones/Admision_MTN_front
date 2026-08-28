import { resolveFlagValue } from '../../src/packages/shared-utils/src/server/resolveFlagValue';

export const config = { runtime: 'edge' };

/**
 * GET /api/flags/process-active-guard
 *
 * Evalúa el flag `process-active-guard`.
 *
 * Estrategia de resolución (en orden de prioridad):
 * 1. Vercel Flags usando FLAGS
 * 2. Fallback: false (bloquear por seguridad)
 *
 * Para que siga el estado del dashboard de Vercel Flags, la variable de entorno
 * FLAGS debe estar configurada. FLAGS_SECRET no evalúa valores de flags.
 *
 * Response: { "enabled": boolean, "source": "vercel-flags" | "default" }
 */
export default async function handler(_req: Request) {
  try {
    const flag = await resolveFlagValue('process-active-guard');
    return jsonResponse(flag);
  } catch (error) {
    console.error('[Flags] Error evaluating process-active-guard:', error);
    return jsonResponse({ enabled: false, source: 'default' });
  }
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}
