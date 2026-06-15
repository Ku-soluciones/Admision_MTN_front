/**
 * Vercel Edge Config – cliente REST para lectura desde el browser.
 *
 * Usa las variables VITE_EDGE_CONFIG_ID y VITE_EDGE_CONFIG_TOKEN que exponen
 * únicamente un token de sólo lectura, por lo que es seguro incluirlas en el
 * bundle del cliente.
 *
 * Documentación del REST API:
 * https://vercel.com/docs/edge-config/read-edge-config#rest-api
 */

const BASE = 'https://edge-config.vercel.com';

function getConnectionParams() {
  const id = import.meta.env.VITE_EDGE_CONFIG_ID;
  const token = import.meta.env.VITE_EDGE_CONFIG_TOKEN;

  if (!id || !token) {
    throw new Error(
      '[EdgeConfig] Faltan las variables VITE_EDGE_CONFIG_ID o VITE_EDGE_CONFIG_TOKEN',
    );
  }

  return { id, token };
}

/**
 * Obtiene un ítem individual de Edge Config por su clave.
 */
export async function getEdgeConfigItem<T = unknown>(key: string): Promise<T> {
  const { id, token } = getConnectionParams();
  const url = `${BASE}/${id}/item/${key}?token=${token}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `[EdgeConfig] Error al obtener "${key}": ${res.status} ${res.statusText}`,
    );
  }

  return res.json() as Promise<T>;
}

/**
 * Obtiene múltiples ítems de Edge Config de una sola vez.
 * Si no se pasan claves, devuelve todos los ítems.
 */
export async function getEdgeConfigItems<T = Record<string, unknown>>(
  keys?: string[],
): Promise<T> {
  const { id, token } = getConnectionParams();
  const params = new URLSearchParams({ token });
  if (keys?.length) {
    params.set('keys', keys.join(','));
  }
  const url = `${BASE}/${id}/items?${params.toString()}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `[EdgeConfig] Error al obtener items: ${res.status} ${res.statusText}`,
    );
  }

  return res.json() as Promise<T>;
}

