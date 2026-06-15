/**
 * Vercel Edge Config – cliente para el frontend.
 *
 * En producción las peticiones van a la Serverless Edge Function
 * /api/edge-config/[key] que usa el SDK @vercel/edge-config.
 *
 * En desarrollo local (sin `vercel dev`) se puede apuntar a la
 * REST API directa usando VITE_EDGE_CONFIG_ID y VITE_EDGE_CONFIG_TOKEN,
 * o usar `vercel dev` para que las funciones estén disponibles.
 */

/**
 * Determina la URL base para obtener ítems de Edge Config.
 *
 * - Si existe `/api/edge-config` (producción / vercel dev) → la usa.
 * - Fallback: REST API directo con ID + Token (sólo dev local con vite).
 */
function getItemUrl(key: string): string {
  const id = import.meta.env.VITE_EDGE_CONFIG_ID;
  const token = import.meta.env.VITE_EDGE_CONFIG_TOKEN;

  // En producción y con `vercel dev` la serverless function está disponible
  // Usamos path relativo para que funcione en cualquier dominio
  if (!id || !token) {
    return `/api/edge-config/${key}`;
  }

  // Fallback: REST API directo (dev local sin vercel dev)
  return `https://edge-config.vercel.com/${id}/item/${key}?token=${token}`;
}

/**
 * Obtiene un ítem individual de Edge Config por su clave.
 */
export async function getEdgeConfigItem<T = unknown>(key: string): Promise<T> {
  const url = getItemUrl(key);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `[EdgeConfig] Error al obtener "${key}": ${res.status} ${res.statusText}`,
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Obtiene múltiples ítems de Edge Config haciendo llamadas en paralelo.
 */
export async function getEdgeConfigItems<T = Record<string, unknown>>(
  keys: string[],
): Promise<T> {
  const entries = await Promise.all(
    keys.map(async (key) => {
      const value = await getEdgeConfigItem(key);
      return [key, value] as const;
    }),
  );

  return Object.fromEntries(entries) as T;
}
