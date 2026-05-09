#!/usr/bin/env bash
# Propaga los archivos de auth desde mf-guardian a los demás MFs y aplica las
# customizaciones por MF (URL de redirección post-logout y cross-tab).
# Idempotente: se puede ejecutar las veces necesarias.
# Compatible con bash 3 (macOS por defecto: sin `declare -A`).
set -eu

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
APPS="$ROOT/microfrontends/apps"
SRC="$APPS/mf-guardian"

copy_files() {
  local target="$1"
  cp "$SRC/services/api.ts"          "$APPS/$target/services/api.ts"
  cp "$SRC/services/authService.ts"  "$APPS/$target/services/authService.ts"
  cp "$SRC/context/AuthContext.tsx"  "$APPS/$target/context/AuthContext.tsx"
}

apply_url_redirect() {
  # $1 = MF dir; $2 = URL literal a usar en logout y cross-tab
  local d="$1" url="$2"
  local ctx="$APPS/$d/context/AuthContext.tsx"
  sed -i.bak "s|window.location.href = '/apoderado-login';|window.location.href = '${url}';|g" "$ctx"
  sed -i.bak "s|/apoderado-login?reason=|${url}?reason=|g" "$ctx"
  rm -f "$ctx.bak"
}

# 1) MFs con redirección estándar igual a guardian (/apoderado-login)
for d in mf-admissions mf-coordinator mf-interviews mf-reports; do
  copy_files "$d"
  echo "$d: copiado (sin cambios extra)"
done

# 2) mf-evaluations -> /#/profesor/login
copy_files mf-evaluations
apply_url_redirect mf-evaluations '/#/profesor/login'
echo "mf-evaluations: copiado y redirección -> /#/profesor/login"

# 3) mf-student -> /#/examenes
copy_files mf-student
apply_url_redirect mf-student '/#/examenes'
echo "mf-student: copiado y redirección -> /#/examenes"

# 4) mf-admin -> microfrontendUrls.home (variable, no literal)
copy_files mf-admin
ctx="$APPS/mf-admin/context/AuthContext.tsx"
if ! grep -q "from '../utils/microfrontendUrls'" "$ctx"; then
  sed -i.bak "s|^import api from '../services/api';|import api from '../services/api';\\
import { microfrontendUrls } from '../utils/microfrontendUrls';|" "$ctx"
  rm -f "$ctx.bak"
fi
sed -i.bak "s|window.location.assign(\`/apoderado-login?reason=\${reason ?? 'other-tab'}\`);|window.location.assign(\`\${microfrontendUrls.home}?reason=\${reason ?? 'other-tab'}\`);|g" "$ctx"
sed -i.bak "s|window.location.href = '/apoderado-login';|window.location.href = microfrontendUrls.home;|g" "$ctx"
rm -f "$ctx.bak"
echo "mf-admin: copiado y redirección -> microfrontendUrls.home"

echo "DONE"

