# Integración Front ↔ BFF tras mejoras de seguridad

Este documento describe **cómo se aplicaron en este monorepo** los puntos de
la guía `Guía de integración del Front con el BFF — tras las mejoras de
seguridad`. Sirve como referencia para migrar los MFs restantes y como QA
checklist en cada release.

## 0. Mapa rápido de archivos

| Capa | Ubicación | Descripción |
|---|---|---|
| **Store de sesión en memoria** | `microfrontends/packages/backend-sdk/src/auth/store.ts` | `authStore` (vanilla + `useAuthStore` hook). Reemplaza el uso de `localStorage` para el access token. |
| **Refresh proactivo** | `…/auth/scheduleRefresh.ts` | Programa `POST /api/auth/refresh` antes del exp. |
| **Refresh reactivo (cola)** | `…/auth/refreshQueue.ts` | `createRefreshQueue` para interceptores HTTP — un solo refresh, las requests en vuelo esperan en la cola. |
| **Sincronización entre pestañas** | `…/auth/broadcast.ts` | `BroadcastChannel('admitia-auth')` con fallback a `storage` events. |
| **Rehidratación al F5** | `…/auth/bootstrap.ts` | `bootstrapAuth()` pega a `/api/auth/refresh` para recuperar la sesión via cookie HttpOnly. |
| **Hard-cap absoluto + inactividad** | `…/auth/useSessionTimeout.ts` | Hook React; lee `absoluteExpiresAt` del store y los ENV `VITE_SESSION_*`. |
| **Códigos de error normalizados** | `…/auth/errors.ts` | `extractAuthErrorCode`, `isAccessExpired`, `isSessionTerminal`, `reasonFromCode`. |

Todos los símbolos se reexportan desde `@mtn-mf/backend-sdk` (`microfrontends/packages/backend-sdk/src/index.ts`).

## 1. Variables de entorno

Añadir al `.env` de cada MF (o al `.env.local` para dev):

```env
VITE_API_BASE_URL=https://admitia-nginx-staging.up.railway.app
VITE_SESSION_INACTIVITY_MIN=20
VITE_SESSION_WARN_BEFORE_SEC=60
VITE_REFRESH_LEAD_SEC=60
# Activar SOLO cuando el BFF exponga /api/auth/* a través de NGINX:
# VITE_AUTH_TRY_NEW_API=true
```

Los tres últimos son opcionales: el SDK aplica los defaults indicados en la
guía si no se setean.

### Convención de rutas (NGINX)

Hoy el gateway NGINX enruta **`/v1/auth/*`** hacia el BFF. Por eso los MFs
usan esa familia como ruta primaria:

- Login → `/v1/auth/firebase-login`, `/v1/auth/login`
- Registro → `/v1/auth/firebase-register`
- Refresh → `/v1/auth/refresh`
- Logout → `/v1/auth/logout`
- Profile → `/v1/auth/check`
- CSRF → `/v1/auth/csrf-token`
- Linking → `/v1/auth/firebase/link`

Cuando el roadmap del BFF exponga `/api/auth/*` (sprint 1+ de
`SECURITY_TOKENS.md`), basta con setear `VITE_AUTH_TRY_NEW_API=true` en el
`.env` del MF para que `authService` intente primero `/api/auth/*` y caiga
de vuelta a `/v1/auth/*` si responde 404/405. Los archivos no requieren
cambios de código.

## 2. Estado de adopción por MF

| MF | api.ts | authService.ts | AuthContext.tsx | Build | Estado |
|---|---|---|---|---|---|
| `mf-guardian` | ✅ | ✅ | ✅ | ✅ | **Sprint 1 completo (referencia)** |
| `mf-admin` | ✅ | ✅ | ✅ (usa `microfrontendUrls.home`) | ✅ | Sprint 1 completo |
| `mf-admissions` | ✅ | ✅ | ✅ | ✅ | Sprint 1 completo |
| `mf-coordinator` | ✅ | ✅ | ✅ | ✅ | Sprint 1 completo |
| `mf-evaluations` | ✅ | ✅ | ✅ (logout → `/#/profesor/login`) | ✅ | Sprint 1 completo |
| `mf-interviews` | ✅ | ✅ | ✅ | ✅ | Sprint 1 completo |
| `mf-reports` | ✅ | ✅ | ✅ | ✅ | Sprint 1 completo |
| `mf-student` | ✅ | ✅ | ✅ (logout → `/#/examenes`) | ✅ | Sprint 1 completo |

> Como los archivos eran **idénticos** entre MFs (auditoría confirmada), la
> migración se hizo copiando los tres archivos de `mf-guardian` y ajustando
> sólo la URL de redirección post-logout y cross-tab por MF. Todos
> compilan TypeScript sin errores y construyen con Vite (`npx vite build`).

## 3. Compatibilidad transicional

Los cambios respetan el principio "sin breaking changes" del roadmap:

- El `authStore` es **opt-in**: si el BFF aún no devuelve `expiresIn`/`token`
  con el nuevo contrato, `authService.login()` cae al flujo viejo
  (idToken Firebase persistido en `localStorage`). Se documenta como
  "fallback transicional" y se removerá cuando los sprints 1–2 del BFF
  estén desplegados a prod.
- Los endpoints nuevos (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`,
  `/api/auth/firebase-login`, `/api/auth/firebase-register`,
  `/api/auth/firebase/link`, `/api/auth/check`, `/api/auth/check-email`)
  se intentan primero. Si retornan `404` o `405`, se cae al endpoint
  legacy (`/v1/auth/...`).
- La cookie `withCredentials: true` ya estaba en `services/api.ts` de todos
  los MFs. Se añadió explícitamente al cliente del SDK y a la llamada
  manual de refresh.
- Se mantiene el handoff cross-origin via `mf_token` en el hash de la URL
  (lo usaba el shell para pasar sesión a los MFs antes de tener cookie
  compartida). Se le añadió soporte opcional para `mf_expires_in` para que
  el `authStore` se hidrate también en ese flujo.

## 4. Checklist de QA — sprint 1

Sigue el mismo orden de la guía original. Los puntos marcados con ✅ ya
quedan cubiertos por la implementación actual; los marcados con ⚠️
requieren verificación manual contra el BFF desplegado.

- ✅ Login coloca el access token sólo en memoria (`authStore`); `localStorage`
  queda con `auth_token__<env>` **únicamente** mientras el BFF no entregue
  el nuevo contrato.
- ⚠️ DevTools muestra cookie `admitia_refresh` con flags `HttpOnly; Secure;
  SameSite=Strict; Path=/api/auth` — depende del BFF (sprint 1 server-side).
- ✅ A los `expiresIn - VITE_REFRESH_LEAD_SEC` se dispara `POST /api/auth/refresh`
  automáticamente.
- ⚠️ Tras 20 min sin actividad aparece el modal de aviso (componente UI a
  añadir donde se use `useSessionTimeout`; el hook ya está disponible).
- ✅ Hard-cap absoluto en `absoluteSessionSeconds`: `useSessionTimeout`
  lo respeta.
- ✅ Cerrar sesión en una pestaña cierra todas las demás (`broadcastLogout`
  + `onCrossTabLogout` en `AuthContext`).
- ✅ Cerrar pestaña → `sendBeacon('/api/auth/logout')` se dispara desde
  `authService.ts`.
- ✅ F5 en ruta privada NO expulsa al usuario si el refresh sigue vivo
  (`bootstrapAuth` en `AuthContext`).
- ✅ Login con Google → `data.firebaseLinked === true` adoptado en el store.
- ✅ Apoderado histórico: el contexto expone `firebaseLinked` y
  `linkFirebaseAccount()` para mostrar/ejecutar el banner.
- ✅ `SESSION_REVOKED` no se reintenta — el interceptor de `api.ts` redirige
  a `/login?reason=revoked` directamente.
- ⚠️ CORS / `Access-Control-Allow-Headers` — depende del BFF.

## 5. Cómo migrar los MFs restantes

Para cada MF (`mf-admin`, `mf-admissions`, `mf-coordinator`, `mf-evaluations`,
`mf-interviews`, `mf-reports`, `mf-student`):

1. **Copiar** `services/api.ts`, `services/authService.ts` y
   `context/AuthContext.tsx` desde `mf-guardian/`.
2. **Ajustar** la línea de redirección post-logout en `AuthContext.logout`:
   - `mf-admin` → `/admin/login`
   - `mf-coordinator` → `/coordinator/login`
   - resto → `/login`
3. **Verificar** que el MF tenga `services/csrfService.ts`, `config/api.config.ts`
   y `src/lib/firebase.ts` con la misma forma que `mf-guardian` (la auditoría
   confirma que sí).
4. **Compilar**: `npx tsc --noEmit -p microfrontends/apps/<mf>/tsconfig.json`
   y verificar que no aparezcan errores nuevos.
5. **Probar** login + F5 + logout en todas las pestañas.

## 6. Sprints siguientes

- **Sprint 2** — Filtro `jti` + sesión activa: ya está cubierto en el front
  porque `isSessionTerminal` cubre `SESSION_REVOKED`.
- **Sprint 3** — Hardening Firebase: añadir UI banner cuando
  `firebaseLinked === false` (consumir `useAuth().firebaseLinked` y llamar a
  `linkFirebaseAccount()`).
- **Sprint 4** — Rate-limit / lockout: el front ya muestra el `error.message`
  del BFF. Para el contador con `Retry-After`, leer
  `error.response.headers['retry-after']` (ya implementado en el catch del
  login).
- **Sprint 5** — RS256 + JWKS: si el BFF habilita JWKS público, el front
  puede consumirlo opcionalmente; **no es obligatorio** porque la
  validación seguirá ocurriendo server-side en el BFF.

---

_Última actualización: 2026-05-09_

