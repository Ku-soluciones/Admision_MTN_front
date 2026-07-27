const REFRESH_FALLBACK_KEY = 'admitia_refresh_fallback';

/**
 * Fallback transicional para refresh cross-site.
 *
 * El camino principal sigue siendo la cookie HttpOnly `admitia_refresh`.
 * Este valor sólo cubre navegadores/proxies que no devuelven la cookie cuando
 * el front vive en `*.admitia.dedyn.io` y el BFF en `*.up.railway.app`.
 */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export function refreshFallbackStorageKey(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const env = host === 'localhost' || host === '127.0.0.1' ? 'development' : 'production';
  return `${REFRESH_FALLBACK_KEY}__${env}`;
}

export function persistRefreshTokenFallback(token?: unknown, expiresInSeconds?: unknown): void {
  if (typeof token !== 'string' || !token.trim()) return;
  const localStorage = storage();
  if (!localStorage) return;

  const ttlSeconds = typeof expiresInSeconds === 'number' && Number.isFinite(expiresInSeconds)
    ? expiresInSeconds
    : Number.parseInt(String(expiresInSeconds ?? ''), 10);
  const expiresAt = Number.isFinite(ttlSeconds) && ttlSeconds > 0
    ? Date.now() + ttlSeconds * 1000
    : null;

  try {
    localStorage.setItem(refreshFallbackStorageKey(), JSON.stringify({ token, expiresAt }));
  } catch {
    // no-op
  }
}

export function readRefreshTokenFallback(): string | null {
  const localStorage = storage();
  if (!localStorage) return null;

  const raw = localStorage.getItem(refreshFallbackStorageKey()) || localStorage.getItem('refreshToken');
  if (!raw) return null;

  if (!raw.startsWith('{')) return raw;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.expiresAt && Date.now() >= Number(parsed.expiresAt)) {
      clearRefreshTokenFallback();
      return null;
    }
    return typeof parsed?.token === 'string' && parsed.token.trim() ? parsed.token : null;
  } catch {
    return null;
  }
}

export function clearRefreshTokenFallback(): void {
  const localStorage = storage();
  if (!localStorage) return;
  try {
    localStorage.removeItem(refreshFallbackStorageKey());
    localStorage.removeItem('refreshToken');
  } catch {
    // no-op
  }
}
