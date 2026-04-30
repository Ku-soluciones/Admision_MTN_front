# MTN Admisión Frontend

Repositorio reorganizado como microfrontends aislados. Cada proyecto vive bajo `microfrontends/apps/*`, tiene su propio `package.json`, su propio `vite.config.ts` y su propia copia del código que usa. No hay imports en runtime al monolito anterior.

## Proyectos

- `shell`: `http://localhost:5200/#/`
- `mf-admissions`: `http://localhost:5201/#/postulacion`
- `mf-guardian`: `http://localhost:5202/#/apoderado/login`
- `mf-student`: `http://localhost:5203/#/examenes`
- `mf-evaluations`: `http://localhost:5204/#/profesor/login`
- `mf-interviews`: `http://localhost:5205/#/entrevistas`
- `mf-admin`: `http://localhost:5206/#/login`
- `mf-reports`: `http://localhost:5207/#/reportes`
- `mf-coordinator`: `http://localhost:5208/#/coordinador`

## Cómo levantar todo

Prerequisito: Node.js 18+.

Instalar dependencias:

```bash
npm install
```

Levantar todos los microfrontends:

```bash
npm run dev
```

Eso inicia todos los proyectos en paralelo. Para navegar el conjunto completo, abre primero:

```text
http://localhost:5200/#/
```

El `shell` actúa como launchpad y enlaza a cada dominio.

Importante:

- no abras `file:///.../index.html`;
- abre siempre las URLs `http://localhost:52xx`;
- si algún puerto ya está ocupado, ahora Vite fallará explícitamente en vez de cambiarlo en silencio.

## Levantar un solo proyecto

```bash
npm run dev:mf:shell
npm run dev:mf:admissions
npm run dev:mf:guardian
npm run dev:mf:student
npm run dev:mf:evaluations
npm run dev:mf:interviews
npm run dev:mf:admin
npm run dev:mf:reports
npm run dev:mf:coordinator
```

## Build

Build de todo el conjunto:

```bash
npm run build
```

Build de un microfrontend específico:

```bash
cd microfrontends/apps/mf-admin
npx vite build
```

## Despliegue en Vercel

Este repositorio esta preparado para desplegar cada microfrontend como un proyecto independiente de Vercel, usando dominios custom separados.

La recomendacion para este proyecto es:

- Produccion: `microfrontend.admitia.dedyn.io`
- Ambientes: `microfrontend.ambiente.admitia.dedyn.io`
- Overrides puntuales: `VITE_MF_<APP>_URL` solo cuando un dominio no siga la convencion

Ejemplo:

```text
https://admision.admitia.dedyn.io
https://admision.staging.admitia.dedyn.io
https://admision.dev.admitia.dedyn.io
https://admision.uat.admitia.dedyn.io
```

Esto permite configurar DNS wildcard por ambiente, evita hardcodear URLs por deploy y corrige la navegacion entre proyectos.

```text
admision.admitia.dedyn.io       -> admision-mtn-front-mf-admissions
guard.admitia.dedyn.io          -> admision-mtn-front-mf-guardian
estudiantes.admitia.dedyn.io    -> admision-mtn-front-mf-student
evaluaciones.admitia.dedyn.io   -> admision-mtn-front-mf-evaluations
entrevistas.admitia.dedyn.io    -> admision-mtn-front-mf-interviews
admin.admitia.dedyn.io          -> admision-mtn-front-mf-admin
reportes.admitia.dedyn.io       -> admision-mtn-front-mf-reports
coordinadores.admitia.dedyn.io  -> admision-mtn-front-mf-coordinator
```

URLs finales principales:

```text
https://admision.admitia.dedyn.io/#/postulacion
https://guard.admitia.dedyn.io/#/apoderado/login
https://estudiantes.admitia.dedyn.io/#/examenes
https://evaluaciones.admitia.dedyn.io/#/profesor/login
https://entrevistas.admitia.dedyn.io/#/entrevistas
https://admin.admitia.dedyn.io/#/login
https://reportes.admitia.dedyn.io/#/reportes
https://coordinadores.admitia.dedyn.io/#/coordinador
```

El dominio recomendado para `mf-guardian` es `guard.admitia.dedyn.io`.

### 1. Crear cada proyecto en Vercel

En Vercel crea un proyecto por microfrontend. Usa esta tabla:

```text
Proyecto Vercel                         Root Directory
admision-mtn-front-mf-admissions        microfrontends/apps/mf-admissions
admision-mtn-front-mf-guardian          microfrontends/apps/mf-guardian
admision-mtn-front-mf-student           microfrontends/apps/mf-student
admision-mtn-front-mf-evaluations       microfrontends/apps/mf-evaluations
admision-mtn-front-mf-interviews        microfrontends/apps/mf-interviews
admision-mtn-front-mf-admin             microfrontends/apps/mf-admin
admision-mtn-front-mf-reports           microfrontends/apps/mf-reports
admision-mtn-front-mf-coordinator       microfrontends/apps/mf-coordinator
```

En cada proyecto usa:

```text
Framework Preset: Vite
Install Command: npm install
Build Command: vite build --mode production
Output Directory: dist
```

Cada carpeta `microfrontends/apps/*` incluye su propio `vercel.json` con el rewrite SPA hacia `index.html`.

### 2. Asignar dominios custom

En cada proyecto Vercel entra a `Settings > Domains` y agrega el dominio correspondiente:

```text
admision-mtn-front-mf-admissions   -> admision.admitia.dedyn.io
admision-mtn-front-mf-guardian     -> guard.admitia.dedyn.io
admision-mtn-front-mf-student      -> estudiantes.admitia.dedyn.io
admision-mtn-front-mf-evaluations  -> evaluaciones.admitia.dedyn.io
admision-mtn-front-mf-interviews   -> entrevistas.admitia.dedyn.io
admision-mtn-front-mf-admin        -> admin.admitia.dedyn.io
admision-mtn-front-mf-reports      -> reportes.admitia.dedyn.io
admision-mtn-front-mf-coordinator  -> coordinadores.admitia.dedyn.io
```

### 3. Configurar variables de entorno

En todos los proyectos Vercel agrega las mismas variables base en `Settings > Environment Variables`:

```text
VITE_API_BASE_URL=https://gateway-service-production-a753.up.railway.app
VITE_API_GATEWAY_URL=https://gateway-service-production-a753.up.railway.app
VITE_API_TIMEOUT=30000
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
VITE_SOURCE_MAPS=false
VITE_MF_BASE_DOMAIN=admitia.dedyn.io
VITE_MF_ENV=production
```

Con `VITE_MF_BASE_DOMAIN` y `VITE_MF_ENV`, la app construye automaticamente las URLs:

```text
production -> https://admision.admitia.dedyn.io
staging    -> https://admision.staging.admitia.dedyn.io
dev        -> https://admision.dev.admitia.dedyn.io
uat        -> https://admision.uat.admitia.dedyn.io
```

Para staging/dev/uat cambia solo `VITE_MF_ENV`:

```text
VITE_MF_BASE_DOMAIN=admitia.dedyn.io
VITE_MF_ENV=staging
```

Si un microfrontend queda en un dominio excepcional, usa override puntual. Estos overrides tienen prioridad sobre la convencion:

```text
VITE_MF_ADMISSIONS_URL=https://admision.admitia.dedyn.io
VITE_MF_GUARDIAN_URL=https://guard.admitia.dedyn.io
VITE_MF_STUDENT_URL=https://estudiantes.admitia.dedyn.io
VITE_MF_EVALUATIONS_URL=https://evaluaciones.admitia.dedyn.io
VITE_MF_INTERVIEWS_URL=https://entrevistas.admitia.dedyn.io
VITE_MF_ADMIN_URL=https://admin.admitia.dedyn.io
VITE_MF_REPORTS_URL=https://reportes.admitia.dedyn.io
VITE_MF_COORDINATOR_URL=https://coordinadores.admitia.dedyn.io
```

Si usas OIDC/login federado, configura las URLs finales con el dominio que corresponda:

```text
VITE_OIDC_ISSUER=https://tu-issuer
VITE_OIDC_CLIENT_ID=web-guardianes
VITE_OIDC_REDIRECT_URI=https://guard.admitia.dedyn.io/#/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=https://admision.admitia.dedyn.io/
VITE_OIDC_SCOPE=openid profile email roles
VITE_OIDC_RESPONSE_TYPE=code
VITE_OIDC_RESPONSE_MODE=query
VITE_OIDC_ADMIN_CLIENT_ID=web-admin
VITE_OIDC_ADMIN_REDIRECT_URI=https://admin.admitia.dedyn.io/#/admin/callback
```

No subas secretos reales al repositorio. Las variables `VITE_*` se embeben en el bundle del navegador, por lo que no deben contener secrets privados.

### 4. Deploy

Puedes desplegar desde el dashboard de Vercel. Si usas CLI, entra al root directory de cada microfrontend y ejecuta:

```bash
npm install
npx vercel
```

Para producción:

```bash
npx vercel --prod
```

### 5. Verificacion post-deploy

Después del deploy, abre estas rutas y confirma que no haya errores 404 en assets:

```text
https://admision.admitia.dedyn.io/#/postulacion
https://guard.admitia.dedyn.io/#/apoderado/login
https://estudiantes.admitia.dedyn.io/#/examenes
https://evaluaciones.admitia.dedyn.io/#/profesor/login
https://entrevistas.admitia.dedyn.io/#/entrevistas
https://admin.admitia.dedyn.io/#/login
https://reportes.admitia.dedyn.io/#/reportes
https://coordinadores.admitia.dedyn.io/#/coordinador
```

También revisa en DevTools que las llamadas al backend salgan a `VITE_API_BASE_URL` y no a `localhost`.

## Estructura

```text
microfrontends/
  apps/
    shell/
    mf-admissions/
    mf-guardian/
    mf-student/
    mf-evaluations/
    mf-interviews/
    mf-admin/
    mf-reports/
    mf-coordinator/
  packages/
    backend-sdk/
    contracts/
```

## Notas

- La integración con backend se mantiene con los mismos servicios y endpoints que usaba el frontend original.
- El código legado raíz fue reemplazado por proyectos aislados; la evolución debe hacerse dentro de `microfrontends/apps/*`.
- El repositorio ya no conserva el monolito original; la fuente de trabajo es cada microfrontend por separado.
