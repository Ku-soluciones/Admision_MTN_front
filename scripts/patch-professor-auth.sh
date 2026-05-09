#!/usr/bin/env bash
# Patch quirúrgico: aplica el fix de getCurrentProfessor + isAuthenticated a
# todos los `services/professorAuthService.ts` de los MFs, sin tocar el resto
# (login, listas de roles, mensajes 403 específicos, etc.).
#
# Cambios:
#   1. Importa `authStore` desde backend-sdk junto a getStorageKey y BASE_STORAGE_KEYS.
#   2. Reemplaza el cuerpo de `getCurrentProfessor` para preferir el access del
#      authStore y devolver null en silencio en 400/401/403.
#   3. Reemplaza el cuerpo de `isAuthenticated` para considerar el authStore.
#
# Idempotente: si los markers ya están aplicados, no hace nada.
set -eu

cd "$(dirname "$0")/.."
APPS="$(pwd)/microfrontends/apps"

PYTHON_BIN="${PYTHON_BIN:-python3}"

for d in mf-admin mf-admissions mf-coordinator mf-evaluations mf-guardian mf-interviews mf-reports mf-student; do
  f="$APPS/$d/services/professorAuthService.ts"
  if [ ! -f "$f" ]; then
    echo "$d: SKIP (no existe $f)"
    continue
  fi
  if grep -q "authStore.getValidAccessToken" "$f"; then
    echo "$d: ya parchado"
    continue
  fi
  "$PYTHON_BIN" - "$f" <<'PYEOF'
import re, sys, io
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as fh:
    src = fh.read()

# 1) Asegurar import de authStore
src = re.sub(
    r"from '../../../packages/backend-sdk/src/index'\;",
    r"from '../../../packages/backend-sdk/src/index';",
    src,
)
src = re.sub(
    r"import \{ getStorageKey, BASE_STORAGE_KEYS \} from '\.\./\.\./\.\./packages/backend-sdk/src/index';",
    "import { getStorageKey, BASE_STORAGE_KEYS, authStore } from '../../../packages/backend-sdk/src/index';",
    src,
)

# 2) Reemplazar getCurrentProfessor()
new_get = '''    async getCurrentProfessor(): Promise<ProfessorUser | null> {
        try {
            // Preferimos el access token del authStore (memoria, BFF). El
            // PROFESSOR_TOKEN legacy se mantiene como fallback durante la
            // transición; NO usamos el idToken Firebase aquí porque
            // /v1/users/me espera el JWT del BFF.
            const accessToken = authStore.getValidAccessToken();
            const legacyToken = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
            const token = accessToken || legacyToken;
            if (!token) {
                return null;
            }

            // El interceptor de `api` ya agrega el Authorization header
            // automáticamente y maneja el refresh reactivo en 401.
            const response = await api.get('/v1/users/me');
            return response.data.user || response.data;

        } catch (error: any) {
            const status = error?.response?.status;
            // 400/401/403 sin sesión válida es esperable durante la primera
            // carga o cuando la sesión venció. Devolvemos null en silencio.
            if (status === 400 || status === 401 || status === 403) {
                return null;
            }
            console.error('Error obteniendo profesor actual:', error);
            return null;
        }
    }'''

src, n = re.subn(
    r"    async getCurrentProfessor\(\)[\s\S]*?\n    \}\n",
    new_get + "\n",
    src,
    count=1,
)
if n == 0:
    sys.stderr.write(f"WARN: getCurrentProfessor no reemplazado en {path}\n")

# 3) Reemplazar isAuthenticated()
new_is = '''    isAuthenticated(): boolean {
        if (authStore.getValidAccessToken()) return true;
        const token = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PROFESSOR_TOKEN));
        return !!token;
    }'''

src, n2 = re.subn(
    r"    isAuthenticated\(\): boolean \{[\s\S]*?\n    \}",
    new_is,
    src,
    count=1,
)
if n2 == 0:
    sys.stderr.write(f"WARN: isAuthenticated no reemplazado en {path}\n")

with open(path, 'w', encoding='utf-8') as fh:
    fh.write(src)
print(f"OK: {path}")
PYEOF
done

echo "DONE"

