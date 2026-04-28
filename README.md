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
