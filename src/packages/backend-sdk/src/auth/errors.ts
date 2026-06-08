/**
 * Códigos de error definidos por el contrato del BFF tras las mejoras de
 * SECURITY_TOKENS.md. El front los usa para decidir el flujo de UI
 * (login silencioso, modal de seguridad, banner de bloqueo, etc.).
 */
export const AUTH_ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REFRESH_INVALID: 'REFRESH_INVALID',
  SESSION_REVOKED: 'SESSION_REVOKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALIDATED: 'SESSION_INVALIDATED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * Extrae el código de error normalizado a partir de la respuesta de Axios o de
 * un payload genérico del BFF. El BFF devuelve `{ success:false, error:{ code, message } }`.
 */
export function extractAuthErrorCode(payload: unknown): AuthErrorCode | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const anyPayload = payload as Record<string, any>;
  const code: unknown =
    anyPayload?.error?.code ??
    anyPayload?.code ??
    anyPayload?.response?.data?.error?.code ??
    anyPayload?.response?.data?.code;
  if (typeof code !== 'string') return undefined;
  return Object.values(AUTH_ERROR_CODES).includes(code as AuthErrorCode)
    ? (code as AuthErrorCode)
    : undefined;
}

/**
 * Indica si una respuesta 401 corresponde a un access token expirado y por lo
 * tanto el front debe intentar el refresh reactivo.
 */
export function isAccessExpired(status: number | undefined, code: AuthErrorCode | undefined): boolean {
  if (status !== 401) return false;
  return code === AUTH_ERROR_CODES.UNAUTHORIZED || code === AUTH_ERROR_CODES.TOKEN_EXPIRED || code === undefined;
}

/**
 * Indica si la sesión es irrecuperable y el front debe limpiar y forzar
 * un nuevo login.
 */
export function isSessionTerminal(code: AuthErrorCode | undefined): boolean {
  return (
    code === AUTH_ERROR_CODES.REFRESH_INVALID ||
    code === AUTH_ERROR_CODES.SESSION_REVOKED ||
    code === AUTH_ERROR_CODES.SESSION_EXPIRED ||
    code === AUTH_ERROR_CODES.SESSION_INVALIDATED
  );
}

/**
 * Convierte un código de error en una "razón" para el query param
 * `?reason=` en la página de login. Útil para que la UI muestre el
 * mensaje correcto sin parsear el código directamente.
 */
export function reasonFromCode(code: AuthErrorCode | undefined): string {
  if (!code) return 'expired';
  switch (code) {
    case AUTH_ERROR_CODES.SESSION_REVOKED:
      return 'revoked';
    case AUTH_ERROR_CODES.REFRESH_INVALID:
      return 'invalid';
    case AUTH_ERROR_CODES.SESSION_EXPIRED:
      return 'expired';
    case AUTH_ERROR_CODES.SESSION_INVALIDATED:
      return 'other-tab';
    default:
      return code.toLowerCase();
  }
}

