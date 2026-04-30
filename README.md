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

Este repositorio queda preparado para desplegar todos los microfrontends en un solo proyecto de Vercel. El build raíz genera un `dist` único con esta estructura:

```text
dist/
  index.html          # shell
  admissions/
  guardian/
  student/
  evaluations/
  interviews/
  admin/
  reports/
  coordinator/
```

Las URLs públicas quedan bajo el mismo dominio:

```text
https://tu-dominio.vercel.app/#/
https://tu-dominio.vercel.app/admissions/#/postulacion
https://tu-dominio.vercel.app/guardian/#/apoderado/login
https://tu-dominio.vercel.app/student/#/examenes
https://tu-dominio.vercel.app/evaluations/#/profesor/login
https://tu-dominio.vercel.app/interviews/#/entrevistas
https://tu-dominio.vercel.app/admin/#/login
https://tu-dominio.vercel.app/reports/#/reportes
https://tu-dominio.vercel.app/coordinator/#/coordinador
```

### 1. Crear el proyecto en Vercel

1. Entra a Vercel y crea un proyecto desde este repositorio.
2. Deja `Root Directory` apuntando a la raíz del repositorio.
3. Usa estos valores de build:

```text
Framework Preset: Other
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

El archivo `vercel.json` ya define esos valores y los rewrites necesarios para las SPAs.

### 2. Configurar variables de entorno

En Vercel, agrega las variables en `Project Settings > Environment Variables`. Como mínimo configura:

```text
VITE_API_BASE_URL=https://gateway-service-production-a753.up.railway.app
VITE_API_GATEWAY_URL=https://gateway-service-production-a753.up.railway.app
VITE_API_TIMEOUT=30000
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
VITE_SOURCE_MAPS=false
```

Si usas OIDC/login federado, configura también las URLs finales del dominio de Vercel o del dominio custom:

```text
VITE_OIDC_ISSUER=https://tu-issuer
VITE_OIDC_CLIENT_ID=web-guardianes
VITE_OIDC_REDIRECT_URI=https://tu-dominio.vercel.app/guardian/#/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=https://tu-dominio.vercel.app/
VITE_OIDC_SCOPE=openid profile email roles
VITE_OIDC_RESPONSE_TYPE=code
VITE_OIDC_RESPONSE_MODE=query
VITE_OIDC_ADMIN_CLIENT_ID=web-admin
VITE_OIDC_ADMIN_REDIRECT_URI=https://tu-dominio.vercel.app/admin/#/admin/callback
```

No subas secretos reales al repositorio. Las variables `VITE_*` se embeben en el bundle del navegador, por lo que no deben contener secrets privados.

### 3. Deploy

Puedes desplegar desde el dashboard de Vercel o con CLI:

```bash
npm install
npm run build
npx vercel
```

Para producción:

```bash
npx vercel --prod
```

### 4. Verificacion post-deploy

Después del deploy, abre estas rutas y confirma que no haya errores 404 en assets:

```text
https://tu-dominio.vercel.app/#/
https://tu-dominio.vercel.app/admissions/#/postulacion
https://tu-dominio.vercel.app/guardian/#/apoderado/login
https://tu-dominio.vercel.app/student/#/examenes
https://tu-dominio.vercel.app/evaluations/#/profesor/login
https://tu-dominio.vercel.app/interviews/#/entrevistas
https://tu-dominio.vercel.app/admin/#/login
https://tu-dominio.vercel.app/reports/#/reportes
https://tu-dominio.vercel.app/coordinator/#/coordinador
```

También revisa en DevTools que las llamadas al backend salgan a `VITE_API_BASE_URL` y no a `localhost`.

### 5. Dominios separados opcionales

Por defecto todo funciona en un solo dominio. Si en el futuro quieres publicar microfrontends en dominios separados, puedes definir variables como:

```text
VITE_MF_ADMISSIONS_URL=https://admissions.tu-dominio.cl
VITE_MF_GUARDIAN_URL=https://guardian.tu-dominio.cl
VITE_MF_STUDENT_URL=https://student.tu-dominio.cl
VITE_MF_EVALUATIONS_URL=https://evaluations.tu-dominio.cl
VITE_MF_INTERVIEWS_URL=https://interviews.tu-dominio.cl
VITE_MF_ADMIN_URL=https://admin.tu-dominio.cl
VITE_MF_REPORTS_URL=https://reports.tu-dominio.cl
VITE_MF_COORDINATOR_URL=https://coordinator.tu-dominio.cl
```

Si no defines esas variables, la app usa automaticamente las subrutas del mismo dominio.

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
