# Mapeo funcional por dominio y APIs actuales

Este documento fija qué funcionalidades deben mantenerse al separar el frontend en microfrontends y qué APIs actuales deben seguir consumiendo.

## Regla de migración

Cada dominio nuevo debe:

- conservar las mismas rutas funcionales de su rol;
- reutilizar los mismos servicios y endpoints ya probados;
- mover la lógica de UI, no reescribir el comportamiento del backend;
- reemplazar accesos directos a `localStorage` por el contrato compartido gradualmente.

## Alumno / Postulación

Microfrontend objetivo: `mf-admissions`

Debe conservar:

- formulario completo de postulación;
- consulta de postulaciones;
- carga y seguimiento documental inicial;
- estadísticas básicas usadas por admin sobre postulaciones.

APIs actuales a preservar:

- `services/applicationService.ts`
  - `GET /v1/applications?size=1000`
  - `GET /v1/applications/public/all`
- `src/api/applications.client.ts`
  - `GET /v1/applications`
  - `GET /v1/applications/{id}`
  - `POST /v1/applications`
  - `PUT /v1/applications/{id}`
  - `GET /v1/applications/search`
  - `GET /v1/applications/statistics`
  - `GET /v1/applications/export`

## Apoderado

Microfrontend objetivo: `mf-guardian`

Debe conservar:

- login y registro;
- dashboard familiar;
- seguimiento de postulacion;
- visualizacion y carga de documentos;
- confirmacion y consulta de citas.

APIs actuales a preservar:

- `services/authService.ts`
  - `POST /v1/auth/firebase-login`
  - `POST /v1/auth/firebase-register`
  - `GET /v1/auth/check-email`
- `services/evaluationService.ts`
  - `GET /v1/schedules/family/{applicationId}`
  - `PUT /v1/schedules/{scheduleId}/confirm`
  - `GET /v1/schedules/public/mock-schedules/{applicationId}`
- `services/documentService.ts`
  - `GET/POST/PUT/DELETE /v1/documents/*`

## Profesor / Evaluador

Microfrontend objetivo: `mf-evaluations`

Debe conservar:

- login de profesor/evaluador;
- dashboard de profesor;
- formularios de evaluación;
- informes de admisión y director de ciclo;
- agenda del evaluador;
- visualización de estudiante.

APIs actuales a preservar:

- `services/professorAuthService.ts`
  - `POST /v1/auth/login`
  - `GET /v1/users/me`
- `services/evaluationService.ts`
  - `POST /v1/schedules/generic`
  - `POST /v1/schedules/individual`
  - `GET /v1/schedules/evaluator/{evaluatorId}`
  - `PUT /v1/schedules/{scheduleId}/reschedule`
  - `PUT /v1/schedules/{scheduleId}/complete`
- `services/professorEvaluationService.ts`
  - `GET/POST/PUT /v1/evaluations/*`

## Entrevistas

Microfrontend objetivo: `mf-interviews`

Debe conservar:

- crear entrevistas;
- ver calendario y disponibilidad;
- reprogramar, cancelar y completar;
- enviar recordatorios y resúmenes;
- entrevista familiar cuando aplica.

APIs actuales a preservar:

- `services/interviewService.ts`
  - `GET /v1/interviews`
  - `GET /v1/interviews/{id}`
  - `POST /v1/interviews`
  - `PUT /v1/interviews/{id}`
  - endpoints de acciones adicionales del módulo
- `services/interviewerScheduleService.ts`
  - `/interviewer-schedules/*`
- `services/notificationService.ts`
  - `/v1/notifications/*`

## Admin

Microfrontend objetivo: `mf-admin`

Debe conservar:

- dashboard operativo;
- gestión de usuarios;
- gestión de apoderados;
- asignación de evaluadores;
- archivado y decisión de postulaciones;
- gestión de plantillas y envío institucional.

APIs actuales a preservar:

- `services/dashboardService.ts`
  - `GET /v1/dashboard/detailed-stats`
  - `GET /v1/dashboard/available-years`
  - `GET /v1/dashboard/applicant-summary/{id}`
- `services/staffService.ts`
  - `/v1/users`
  - `/v1/users/{id}`
  - `/v1/users/stats`
  - `/v1/users/roles`
- `services/guardianService.ts`
  - `/v1/users/guardians`
  - `/v1/users/{id}/activate`
  - `/v1/users/{id}/deactivate`
  - `/v1/users/{id}/reset-password`
- `services/institutionalEmailService.ts`
  - `/v1/institutional-email/*`
  - `/v1/admin/email/*`

## Reportes

Microfrontend objetivo: `mf-reports`

Debe conservar:

- dashboard de reportes;
- refresh de reportes;
- exportaciones operativas y analíticas.

APIs actuales a preservar:

- `services/reportExportService.ts`
  - `/v1/reports/*`
  - `/v1/export/*`
- `services/analyticsService.ts`
  - `/v1/analytics/*`

## Coordinación

Microfrontend objetivo: `mf-coordinator`

Debe conservar:

- dashboard de coordinación;
- tendencias temporales;
- búsqueda avanzada;
- exportación de resultados.

APIs actuales a preservar:

- `src/api/search.client.ts`
  - `GET /v1/search/advanced`
  - `GET /v1/search/quick`
  - `GET /v1/search/export`
- `src/api/dashboard.client.ts`
  - `GET /v1/dashboard/stats`
  - `GET /v1/dashboard/admin/stats`
  - `GET /v1/analytics/temporal-trends`

## Criterio de aceptación para cada extracción

Un dominio solo se considera migrado si:

- todas sus rutas siguen resolviendo;
- el rol correspondiente puede autenticarse;
- las pantallas principales conservan sus casos de uso;
- las llamadas salen a los mismos endpoints del monolito;
- no introduce nuevas URLs hardcodeadas ni nuevos tokens paralelos.
