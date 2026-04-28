# Arquitectura de microfrontends para MTN Admisión

## Objetivo

Separar el frontend actual en proyectos independientes por dominio, manteniendo:

- Las rutas actuales y la experiencia de usuario existente.
- La autenticación ya desplegada con Firebase, OIDC y tokens legados.
- Las conexiones al backend BFF y a servicios específicos.
- Una migración incremental sin reescribir el sistema completo.

## Origen de la partición

La partición se hizo tomando como referencia el monolito original, que tenía límites de dominio visibles en rutas, componentes y servicios:

- `auth`: `context/AuthContext.tsx`, `services/authService.ts`, `services/oidcService.ts`, `components/auth/*`
- `admissions`: `pages/ApplicationForm.tsx`, `services/applicationService.ts`, `services/applicationWorkflowService.ts`
- `guardian`: `pages/FamilyDashboard.tsx`, `pages/ApoderadoLogin.tsx`, `services/guardianService.ts`
- `evaluations`: `pages/ProfessorDashboard.tsx`, `pages/EvaluationForm.tsx`, `components/evaluations/*`, `services/evaluationService.ts`, `services/professorEvaluationService.ts`
- `interviews`: `pages/InterviewModule.tsx`, `pages/FamilyInterviewPage.tsx`, `components/interviews/*`, `services/interviewService.ts`, `services/interviewWorkflowService.ts`
- `reports`: `pages/ReportsDashboard.tsx`, `components/reports/*`, `services/reportExportService.ts`, `services/analyticsService.ts`
- `admin`: `pages/AdminDashboard.tsx`, `components/admin/*`, `components/users/*`, `services/userService.ts`, `services/dashboardService.ts`
- `coordinator`: `src/components/coordinator/*`, `services/search.client.ts`, `services/dashboard.client.ts`
- `shared`: `components/ui/*`, `components/layout/*`, `hooks/*`, `utils/*`, `services/http.ts`

## Problemas que se resolvieron al separar

Los acoplamientos principales detectados son:

- El router vive en un solo `App.tsx`.
- La sesión se comparte vía `localStorage` con múltiples claves (`auth_token`, `professor_token`, `authenticated_user`, `currentProfessor`).
- Hay dos clientes HTTP y lógica repetida de `baseURL` (`services/http.ts`, `services/api.ts`, `src/services/http.ts`).
- Las rutas protegidas dependen directamente de `localStorage`, no de un contrato común de shell.
- Varios componentes llaman al backend armando headers manualmente en vez de pasar por un SDK común.

## Estructura objetivo

```text
microfrontends/
  apps/
    shell/             # Launchpad de acceso a los microfrontends
    mf-admissions/     # Formularios de postulación
    mf-guardian/       # Portal apoderados
    mf-student/        # Portal de exámenes para alumno
    mf-evaluations/    # Profesores y evaluaciones
    mf-interviews/     # Agenda y entrevistas
    mf-admin/          # Operación admin
    mf-reports/        # Reportería
    mf-coordinator/    # Búsqueda avanzada y tendencias
  packages/
    contracts/         # Tipos y catálogos de migración
    backend-sdk/       # Referencia de endpoints y sesión actual
```

## Base creada en este repo

El repositorio final quedó así:

- `microfrontends/apps/mf-*`: proyectos aislados con copia propia de `pages`, `components`, `services`, `context`, `hooks`, `types`, `utils`, `src` y `public`.
- `microfrontends/apps/shell`: launchpad para abrir cada microfrontend aislado.
- `scripts/dev-all-microfrontends.mjs`: arranque de todos los proyectos en paralelo.
- `scripts/build-all-microfrontends.mjs`: build secuencial del conjunto.
- `microfrontends/packages/contracts`: catálogo y contratos de migración.
- `microfrontends/packages/backend-sdk`: referencia para mantener consistencia de endpoints durante la transición.

## Estrategia aplicada

Para evitar choques entre proyectos, los microfrontends generados no importan código del monolito padre en runtime. Cada proyecto quedó con su propia copia del código legado y su propio `package.json`.

Esto implica:

- builds separados;
- evolución separada por dominio;
- menor riesgo de acoplamiento accidental;
- mayor costo de mantenimiento mientras no se consoliden librerías versionadas.

## Estado actual

Para evitar choques entre proyectos, los microfrontends generados no importan código del monolito padre en runtime. Cada proyecto quedó con su propia copia del código legado y su propio `package.json`.

Esto implica:

- builds separados;
- evolución separada por dominio;
- menor riesgo de acoplamiento accidental;
- mayor duplicación de código entre proyectos.

El monolito raíz ya no existe como aplicación operativa dentro de este repositorio.

## Evolución recomendada desde esta base

### Fase 1: Estabilizar shell y contratos

Objetivo:

- Centralizar el contrato de sesión y backend.
- Registrar qué dominio es dueño de cada ruta.

Estado:

- Ya quedó operativo en `microfrontends/apps/shell/src/manifest.ts`.

### Fase 2: Consolidar `admissions`

Motivo:

- Tiene ruta pública clara (`/postulacion`).
- Depende de pocos contextos globales.
- Permite validar despliegue independiente sin tocar el backoffice.

Revisar primero:

- `pages/ApplicationForm.tsx`
- `services/applicationService.ts`
- `services/applicationWorkflowService.ts`
- `components/documents/*` que dependan del flujo de postulación

### Fase 3: Consolidar `guardian`

Motivo:

- Tiene login y dashboard propios.
- Comparte backend, pero puede vivir como app separada consumiendo el mismo contrato de sesión.

Revisar:

- `pages/ApoderadoLogin.tsx`
- `pages/FamilyDashboard.tsx`
- `services/guardianService.ts`
- `services/documentService.ts` solo si queda acotado al portal de apoderados

### Fase 4: Consolidar `admin` y `reports`

Motivo:

- Son dominios grandes, pero internamente más cohesivos que el resto.
- Ya tienen muchas tablas, gestión de usuarios, evaluaciones y reportes en carpetas aisladas.

Revisar:

- `pages/AdminDashboard.tsx`
- `pages/ReportsDashboard.tsx`
- `components/admin/*`
- `components/users/*`
- `services/userService.ts`
- `services/dashboardService.ts`
- `services/reportExportService.ts`

### Fase 5: Consolidar `evaluations`, `interviews` y `coordinator`

Motivo:

- Hoy comparten más estado y más acceso a tokens legados.
- Conviene moverlos después de estabilizar `backend-sdk` y el contrato de sesión.

## Reglas para no romper integración con backend

- Todo microfrontend debe obtener endpoints desde `backend-sdk`, no hardcodear `baseURL`.
- Todo microfrontend debe consumir headers desde un helper compartido antes de crear clientes propios.
- El shell no debe conocer detalles de negocio; solo sesión, navegación, permisos y carga remota.
- La autorización por ruta debe decidirse sobre un contrato `AuthSession`, no leyendo `localStorage` disperso.
- Cualquier llamada nueva al backend debe pasar por un wrapper común y no por `axios` suelto en componentes.

## Comandos útiles

Levantar todos los microfrontends:

```bash
npm run dev
```

Levantar solo el shell:

```bash
npm run dev:mf:shell
```

## Siguiente trabajo recomendado en este repo

El siguiente paso con mejor retorno es reducir duplicación y endurecer despliegues por dominio, empezando por `mf-admissions`. Es el dominio menos riesgoso para:

- estabilizar despliegue independiente
- normalizar variables de entorno por proyecto
- limpiar dependencias sobrantes
- definir librerías versionadas solo cuando valga la pena
