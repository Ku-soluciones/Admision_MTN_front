#!/usr/bin/env bash
# Patch quirúrgico #2: hacer que `professorAuthService.login()` pueble el
# `authStore` con el JWT del BFF, igual que `authService.login()` lo hace
# para el portal apoderado. Esto evita que las requests posteriores caigan
# al fallback Firebase y disparen el rechazo `auth_time excedido`.
#
# Idempotente: si ya está aplicado (detecta `authStore.setSession`), omite.
set -eu

cd "$(dirname "$0")/.."
APPS="$(pwd)/microfrontends/apps"
PYTHON_BIN="${PYTHON_BIN:-python3}"

for d in mf-admin mf-admissions mf-coordinator mf-evaluations mf-guardian mf-interviews mf-reports mf-student; do
  f="$APPS/$d/services/professorAuthService.ts"
  if [ ! -f "$f" ]; then echo "$d: SKIP"; continue; fi
  if grep -q "authStore.setSession" "$f"; then echo "$d: ya parchado"; continue; fi
  "$PYTHON_BIN" - "$f" <<'PYEOF'
import re, sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as fh:
    src = fh.read()

# 1) Asegurar imports adicionales del SDK (scheduleRefresh, broadcastLogin)
old_import = "import { getStorageKey, BASE_STORAGE_KEYS, authStore } from '../../../packages/backend-sdk/src/index';"
new_import = "import { getStorageKey, BASE_STORAGE_KEYS, authStore, scheduleRefresh, broadcastLogin } from '../../../packages/backend-sdk/src/index';"
if old_import in src and new_import not in src:
    src = src.replace(old_import, new_import)

# 2) Insertar bloque de hidratación del authStore justo después del setItem de
#    PROFESSOR_TOKEN. Patrón flexible: localizamos el bloque `if (data.token)`
#    y luego del cierre del setItem PROFESSOR_USER inyectamos la hidratación
#    del store + scheduleRefresh + broadcastLogin.
hydrate_block = """\

            // Hidratar authStore con el JWT del BFF (el mismo flujo que
            // authService.adoptSession() para el portal apoderado). Esto
            // evita que las requests posteriores caigan al fallback Firebase
            // y disparen el rechazo `auth_time excedido` del filtro del BFF.
            if (data.token && typeof data.expiresIn === 'number') {
                authStore.setSession({
                    token: data.token,
                    expiresIn: data.expiresIn,
                    absoluteSessionSeconds: data.absoluteSessionSeconds,
                    user: data.user,
                    firebaseLinked: data.firebaseLinked,
                    sessionId: data.sessionId ?? null,
                    permissions: data.permissions ?? [],
                });
                scheduleRefresh(data.expiresIn, {
                    refresh: async () => {
                        const r = await api.post('/v1/auth/refresh');
                        const rd = r.data || {};
                        return rd.token && typeof rd.expiresIn === 'number'
                            ? { token: rd.token, expiresIn: rd.expiresIn, user: rd.user, firebaseLinked: rd.firebaseLinked }
                            : null;
                    },
                    onFailure: () => { authStore.clear(); },
                });
                broadcastLogin(data.token, data.expiresIn, data.user, data.firebaseLinked);
            }
"""

# Insertar después del bloque que hace setItem(PROFESSOR_USER, ...) cerrado
# por }));
pattern = r"(localStorage\.setItem\(getStorageKey\(BASE_STORAGE_KEYS\.PROFESSOR_USER\), JSON\.stringify\(\{[\s\S]*?\}\)\);)"
src, n = re.subn(pattern, r"\1" + hydrate_block, src, count=1)
if n == 0:
    sys.stderr.write(f"WARN: no se encontró el setItem PROFESSOR_USER en {path}\n")

# 3) Logout server-side: añadir intento `POST /v1/auth/logout` antes de
#    limpiar el storage local. Es best-effort.
old_logout = """    logout() {
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
    }"""
new_logout = """    async logout() {
        try { await api.post('/v1/auth/logout'); } catch { /* idempotente */ }
        authStore.clear();
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_USER));
        localStorage.removeItem(getStorageKey(BASE_STORAGE_KEYS.CURRENT_PROFESSOR));
    }"""
if old_logout in src:
    src = src.replace(old_logout, new_logout)

with open(path, 'w', encoding='utf-8') as fh:
    fh.write(src)
print(f"OK: {path}")
PYEOF
done

echo "DONE"

