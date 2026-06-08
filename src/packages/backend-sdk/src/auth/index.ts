/**
 * Punto de entrada del subpaquete `auth` del backend-sdk.
 *
 * Contiene todo lo necesario para que un MF se acople al BFF tras las mejoras
 * de SECURITY_TOKENS.md: store en memoria, refresh proactivo + reactivo,
 * sincronización entre pestañas, hard-cap absoluto y manejo de códigos de
 * error normalizados.
 */
export * from './store';
export * from './errors';
export * from './scheduleRefresh';
export * from './broadcast';
export * from './bootstrap';
export * from './refreshQueue';
export * from './useSessionTimeout';

