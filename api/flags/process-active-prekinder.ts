import { resolveFlagValue } from '../../src/packages/shared-utils/src/server/resolveFlagValue';

export const config = { runtime: 'edge' };

/**
 * GET /api/flags/process-active-prekinder
 *
 * Falla de forma segura: si Vercel Flags no responde o FLAGS no está
 * configurado, el proceso público de Prekínder permanece deshabilitado.
 */
export default async function handler(_req: Request) {
  try {
    const flag = await resolveFlagValue('process-active-prekinder');
    return jsonResponse(flag);
  } catch (error) {
    console.error('[Flags] Error evaluating process-active-prekinder:', error);
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
