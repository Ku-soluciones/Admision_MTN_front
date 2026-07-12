/**
 * useAuthBootstrap — hook compartido de hidratación + listeners de auth.
 *
 * Encapsula los 4 `useEffect` que estaban duplicados en cada
 * `AuthContext.tsx` (admin, admissions, student, shared-ui):
 *
 *   1. Rehidratación al montar: pide /api/auth/refresh para recuperar
 *      la sesión si la cookie HttpOnly del refresh sigue viva. Si hay
 *      un idToken legacy en localStorage, lo intercambia.
 *   2. Listener Firebase: persistencia por-origen del SDK + intercambio
 *      del idToken por JWT del BFF cuando aplica.
 *   3. Sincronización entre pestañas (`onCrossTabLogout`).
 *   4. Suscripción a `authStore.subscribe` para mantener `user` en sync.
 *
 * Diferencias por feature se exponen como opciones:
 *
 *   - `waitForFirebase`: si true (admin), `isLoading=false` SÓLO cuando
 *     bootstrap Y firebase terminaron. Sin esto, hay un race donde
 *     ProtectedAdminRoute redirige al login antes de que Firebase
 *     pueda restaurar la sesión.
 *
 *   - `respectFreshSession`: si true (admissions), respeta la bandera
 *     `?fresh=1` (consultada vía `wasFreshSessionRequested()`): rechaza
 *     toda rehidratación, fuerza login limpio.
 *
 *   - `legacyIdTokenExchange`: estrategia para el idToken Firebase
 *     persistido en `AUTH_TOKEN` (transición):
 *     - 'sdk-helper'    → usa `exchangeFirebaseToken()` del SDK (admin, student).
 *     - 'firebase-login'→ usa `api.post('/api/auth/firebase-login', { idToken })` (admissions).
 *     - 'none'          → no intenta intercambio (shared-ui).
 *
 *   - `clearStoreOnRefreshFailure`: si false (admin), NO limpia el store
 *     cuando el refresh falla, porque Firebase puede rehidratar después.
 *
 *   - `crossTabLogoutRedirectUrl`: función que recibe `reason` y devuelve
 *     la URL absoluta a la que navegar tras un logout en otra pestaña.
 *
 * El hook NO maneja login/register/logout — esos quedan en cada feature
 * porque sus side-effects (redirect, mensajes) son específicos.
 */
import { useEffect, useRef, useState } from 'react';
import { AxiosInstance } from 'axios';
import { onAuthStateChanged, signOut as firebaseAuthSignOut } from 'firebase/auth';
import type { Auth as FirebaseAuth } from 'firebase/auth';
import {
  getStorageKey,
  BASE_STORAGE_KEYS,
  authStore,
  useAuthStore,
  onCrossTabLogout,
  bootstrapAuth,
  cancelScheduledRefresh,
  scheduleRefresh,
  purgeLegacyAuthStorage,
  exchangeFirebaseToken,
  runSharedRefresh,
  persistRefreshTokenFallback,
  clearRefreshTokenFallback,
} from '../../../../backend-sdk/src/index';
import type { AuthUser } from './types';
import { buildUserFromBff, setAdminCompat } from './helpers';

export type LegacyIdTokenExchangeStrategy = 'sdk-helper' | 'firebase-login' | 'none';
export type AuthPortalType = 'ADMIN' | 'STAFF' | 'GUARDIAN';

export interface UseAuthBootstrapOptions {
  /** Cliente axios con `withCredentials: true` configurado para llamar al BFF. */
  api: AxiosInstance;
  /** Instancia Firebase Auth. Si es null, se saltea toda la lógica Firebase. */
  firebaseAuth: FirebaseAuth | null;
  /** `true` si la app inicializó la config Firebase correctamente. */
  hasFirebaseConfig: boolean;
  /**
   * Si true, espera a que AMBOS (bootstrap BFF + Firebase) terminen antes
   * de marcar `isLoading=false`. Necesario para admin para que
   * ProtectedAdminRoute no expulse al usuario en F5.
   */
  waitForFirebase?: boolean;
  /**
   * Si true (admissions), respeta la bandera `?fresh=1` en la URL:
   * descarta toda hidratación y fuerza login explícito. El módulo de
   * admissions también ejecuta `wipeLocalAuthArtifacts()` antes del
   * primer render, así que aquí sólo se evita re-hidratar.
   */
  respectFreshSession?: boolean;
  /**
   * Lector externo de la bandera fresh. Devuelve `true` si la sesión
   * debe ser limpia. Se inyecta porque vive en cada feature.
   */
  isFreshSessionRequested?: () => boolean;
  /** Estrategia para idToken Firebase persistido en `AUTH_TOKEN`. */
  legacyIdTokenExchange?: LegacyIdTokenExchangeStrategy;
  /**
   * Si false, el callback `onRefreshFailure` NO limpia el `authStore`.
   * Necesario para admin (deja que Firebase intente rehidratar después).
   * Default: true.
   */
  clearStoreOnRefreshFailure?: boolean;
  /**
   * URL a la que navegar (con `window.location.assign`) cuando otra
   * pestaña hace logout. Recibe el `reason` ya escapado.
   */
  crossTabLogoutRedirectUrl: (reason: string) => string;
  /** Portal que se envía al BFF al intercambiar Firebase por sesión BFF. */
  portalType?: AuthPortalType;
}

export interface UseAuthBootstrapResult {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  firebaseLinked: boolean;
}

export function useAuthBootstrap(options: UseAuthBootstrapOptions): UseAuthBootstrapResult {
  const {
    api,
    firebaseAuth,
    hasFirebaseConfig,
    waitForFirebase = false,
    respectFreshSession = false,
    isFreshSessionRequested,
    legacyIdTokenExchange = 'none',
    clearStoreOnRefreshFailure = true,
    crossTabLogoutRedirectUrl,
    portalType,
  } = options;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Banderas de coordinación SOLO cuando `waitForFirebase=true`. Replica
  // exactamente el comportamiento del AuthContext de admin pre-refactor.
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [firebaseDone, setFirebaseDone] = useState(!hasFirebaseConfig);
  const firebaseLinked = useAuthStore((s) => s.firebaseLinked);

  // Usamos un ref para que el callback del store.subscribe vea siempre
  // el último `user` sin necesidad de re-suscribirse en cada render.
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  const isFreshHelper = (): boolean => {
    if (!respectFreshSession) return false;
    try { return Boolean(isFreshSessionRequested?.()); } catch { return false; }
  };

  const resolvePortalType = (): AuthPortalType => {
    if (portalType) return portalType;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (
      path.startsWith('/profesor') ||
      path.startsWith('/entrevistas') ||
      path.startsWith('/calendario') ||
      path.startsWith('/coordinador') ||
      path.startsWith('/reportes')
    ) {
      return 'STAFF';
    }
    if (path.startsWith('/admin') || path === '/login') return 'ADMIN';
    return 'GUARDIAN';
  };

  // Cuando ambos terminan (modo waitForFirebase), recién bajamos isLoading.
  useEffect(() => {
    if (!waitForFirebase) return;
    if (bootstrapDone && firebaseDone) setIsLoading(false);
  }, [waitForFirebase, bootstrapDone, firebaseDone]);

  // ─── 1. Bootstrap (refresh + opcional exchange legacy idToken) ───────
  useEffect(() => {
    let cancelled = false;

    // Modo fresh (admissions): saltarse toda la rehidratación.
    if (isFreshHelper()) {
      try { authStore.clear(); } catch { /* no-op */ }
      try { clearRefreshTokenFallback(); } catch { /* no-op */ }
      setUser(null);
      setIsLoading(false);
      if (waitForFirebase) setBootstrapDone(true);
      return () => { cancelled = true; };
    }

    const storedAccessToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
    const hasValidBffSession = authStore.getValidAccessToken();

    if (
      storedAccessToken &&
      !hasValidBffSession &&
      legacyIdTokenExchange !== 'none'
    ) {
      (async () => {
        let firebaseLoginExchangeFailed = false;
        try {
          if (legacyIdTokenExchange === 'sdk-helper') {
            const session = await exchangeFirebaseToken(storedAccessToken, api, true, resolvePortalType());
            if (session && !cancelled) {
              const userData = buildUserFromBff(session.user);
              setAdminCompat(userData, session.token, session.user?.subject);
              setUser(userData);
            }
          } else {
            // 'firebase-login': llamada directa, como en admissions previo.
            const res = await api.post('/api/auth/firebase-login', {
              idToken: storedAccessToken,
              portalType: resolvePortalType(),
            });
            const data = res.data;
            if (data?.token && typeof data.expiresIn === 'number') {
              authStore.setSession({
                token: data.token,
                expiresIn: data.expiresIn,
                absoluteSessionSeconds: data.absoluteSessionSeconds,
                user: data.user,
                firebaseLinked: data.firebaseLinked ?? true,
                sessionId: data.sessionId ?? null,
                permissions: data.permissions ?? [],
              });
              persistRefreshTokenFallback(data.refreshToken, data.refreshExpiresIn);
              // Cola compartida: evita refresh simultáneo con el interceptor.
              // No onFailure: un refresh proactivo fallido no debe cerrar la sesión.
              scheduleRefresh(data.expiresIn);
              if (!cancelled && data.user) {
                const userData = buildUserFromBff(data.user);
                setAdminCompat(userData, data.token, data.user?.subject);
                setUser(userData);
              }
            }
          }
        } catch {
          firebaseLoginExchangeFailed = true;
        }
        // Comportamiento previo de admissions: si el intercambio directo
        // /api/auth/firebase-login falló, descartar el idToken Firebase
        // persistido para no reintentar en futuros bootstraps.
        if (firebaseLoginExchangeFailed && legacyIdTokenExchange === 'firebase-login') {
          try { localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN)); } catch { /* no-op */ }
        }
        if (cancelled) return;
        if (waitForFirebase) setBootstrapDone(true);
        else setIsLoading(false);
      })();
      return () => { cancelled = true; };
    }

    // Flujo normal: rehidratar desde refresh cookie usando la cola compartida
    // para evitar que el bootstrap compita con el interceptor reactivo.
    bootstrapAuth({
      refresh: async () => runSharedRefresh(),
      // El admin NO limpia store en fallo (deja que Firebase rehidrate).
      ...(clearStoreOnRefreshFailure
        ? { onRefreshFailure: () => { authStore.clear(); clearRefreshTokenFallback(); } }
        : {}),
    }).then((ok) => {
      if (cancelled) return;
      if (ok) {
        const u = authStore.getState().user;
        if (u) {
          const userData = buildUserFromBff(u);
          setAdminCompat(userData, authStore.getState().accessToken ?? '', (u as any)?.subject);
          setUser(userData);
        }
      }
      if (waitForFirebase) setBootstrapDone(true);
      else setIsLoading(false);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 2. Firebase onAuthStateChanged ──────────────────────────────────
  useEffect(() => {
    if (!firebaseAuth || !hasFirebaseConfig) {
      // Sin Firebase: marcamos el slot como completado.
      if (waitForFirebase) setFirebaseDone(true);
      else setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        // Modo fresh: salir con Firebase signOut.
        if (isFreshHelper()) {
          try { await firebaseAuthSignOut(firebaseAuth); } catch { /* no-op */ }
          try { authStore.clear(); } catch { /* no-op */ }
          try { clearRefreshTokenFallback(); } catch { /* no-op */ }
          setUser(null);
          if (waitForFirebase) setFirebaseDone(true);
          else setIsLoading(false);
          return;
        }
        try {
          // Si ya tenemos sesión BFF en memoria, no hace falta tocar
          // localStorage ni re-autenticar.
          if (authStore.getValidAccessToken()) {
            const stored = authStore.getState().user;
            if (!userRef.current && stored) {
              setUser(buildUserFromBff(stored));
            }
            if (waitForFirebase) setFirebaseDone(true);
            else setIsLoading(false);
            return;
          }

          // Firebase tiene sesión pero el BFF no — intercambiar idToken
          // por JWT del BFF. NO persistimos el idToken en localStorage
          // (BFF lo rechaza si `auth_time` supera 8h).
          const idToken = await firebaseUser.getIdToken(/* forceRefresh */ false);
          let response: any = null;
          try {
            const r = await api.post('/api/auth/firebase-login', {
              idToken,
              portalType: resolvePortalType(),
            });
            const data = r.data;
            if (data?.token && typeof data.expiresIn === 'number') {
              authStore.setSession({
                token: data.token,
                expiresIn: data.expiresIn,
                absoluteSessionSeconds: data.absoluteSessionSeconds,
                user: data.user,
                firebaseLinked: data.firebaseLinked ?? true,
                sessionId: data.sessionId ?? null,
                permissions: data.permissions ?? [],
              });
              persistRefreshTokenFallback(data.refreshToken, data.refreshExpiresIn);
              // Cola compartida: evita refresh simultáneo con el interceptor.
              // No onFailure: un refresh proactivo fallido no debe cerrar la sesión.
              scheduleRefresh(data.expiresIn);
              response = { data: { success: true, user: data.user, firebaseLinked: data.firebaseLinked } };
            }
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 400 || status === 401 || status === 403) {
              try { await firebaseAuthSignOut(firebaseAuth); } catch { /* no-op */ }
              setUser(null);
              if (waitForFirebase) setFirebaseDone(true);
              else setIsLoading(false);
              return;
            }
            throw err;
          }

          if (response?.data?.success && response.data?.user) {
            const userData = buildUserFromBff(response.data.user);
            localStorage.setItem(
              getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER),
              JSON.stringify(userData),
            );
            const tokenForCompat = authStore.getValidAccessToken() || '';
            setAdminCompat(userData, tokenForCompat, response.data.user?.subject);
            if (typeof response.data.firebaseLinked === 'boolean') {
              authStore.setFirebaseLinked(response.data.firebaseLinked);
            }
            setUser(userData);
          }
        } catch {
          // Para admin (clearStoreOnRefreshFailure=false), si bootstrapAuth
          // ya restauró la sesión BFF, la mantenemos aunque Firebase falle.
          if (!clearStoreOnRefreshFailure) {
            if (!authStore.getValidAccessToken()) setUser(null);
          } else {
            try {
              localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
              localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
            } catch { /* no-op */ }
            setUser(null);
          }
        }
      } else {
        // Firebase sin usuario en este origen. Si el BFF tiene sesión, mantener.
        if (authStore.getValidAccessToken()) {
          if (!clearStoreOnRefreshFailure) {
            // Admin: hidratar user desde authStore si faltaba.
            const stored = authStore.getState().user;
            if (!userRef.current && stored) {
              setUser(buildUserFromBff(stored));
            }
          }
          if (waitForFirebase) setFirebaseDone(true);
          else setIsLoading(false);
          return;
        }
        // Token histórico en localStorage: intentar validar silenciosamente.
        const existingToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
        if (existingToken) {
          try {
            const response = await api.get('/api/auth/check');
            if (response.data?.success && response.data?.user) {
              const userData = buildUserFromBff(response.data.user);
              localStorage.setItem(
                getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER),
                JSON.stringify(userData),
              );
              const tokenForCompat = authStore.getValidAccessToken() || existingToken;
              setAdminCompat(userData, tokenForCompat, response.data.user?.subject);
              setUser(userData);
              if (waitForFirebase) setFirebaseDone(true);
              else setIsLoading(false);
              return;
            }
          } catch {
            // token inválido o sin sesión — limpiamos en silencio
          }
          // Sólo borramos si la validación legacy falla.
          try {
            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTH_TOKEN));
            localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.AUTHENTICATED_USER));
          } catch { /* no-op */ }
        }
        setUser(null);
      }
      if (waitForFirebase) setFirebaseDone(true);
      else setIsLoading(false);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 3. Cross-tab logout ─────────────────────────────────────────────
  useEffect(() => {
    const off = onCrossTabLogout((reason) => {
      cancelScheduledRefresh();
      setUser(null);
      // `broadcast.ts` ya emitió cross-tab-logout. AuthNavigationBridge es
      // el único dueño de la navegación, evitando competir con un hard reload.
      void reason;
      void crossTabLogoutRedirectUrl;
    });
    return off;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 4. Suscripción al store (sincroniza user externo ↔ context) ─────
  useEffect(() => {
    return authStore.subscribe(() => {
      const stored = authStore.getState().user;
      const current = userRef.current;
      if (stored && (!current || String(stored.id ?? '') !== current.id)) {
        setUser(buildUserFromBff(stored));
      } else if (!stored && current) {
        setUser(null);
      }
    });
  }, []);

  return { user, setUser, isLoading, setIsLoading, firebaseLinked };
}

// Re-export del helper de limpieza para que cada feature lo invoque
// en su IIFE al cargar el módulo. (No se puede hacer side-effect en
// el hook porque depende del feature.)
export { purgeLegacyAuthStorage };
