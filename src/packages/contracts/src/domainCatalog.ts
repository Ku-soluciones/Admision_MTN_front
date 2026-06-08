import type { DomainOwnership } from './index';

export const domainCatalog: DomainOwnership[] = [
  {
    domain: 'admissions',
    displayName: 'Postulacion',
    roles: ['APODERADO', 'ADMIN'],
    routes: ['/postulacion'],
    capabilities: [
      { key: 'application-create', description: 'Crear y enviar postulaciones nuevas' },
      { key: 'application-read', description: 'Consultar postulaciones para seguimiento y backoffice' },
      { key: 'document-bootstrap', description: 'Iniciar flujo documental asociado a la postulacion' },
    ],
    apis: [
      {
        service: 'services/applicationService.ts',
        responsibilities: ['Alta de postulacion', 'Consulta de postulaciones', 'Estadisticas basicas'],
        endpoints: ['/v1/applications?size=1000', '/v1/applications/public/all'],
      },
      {
        service: 'src/api/applications.client.ts',
        responsibilities: ['CRUD tipado de postulaciones', 'Busquedas', 'Exportaciones', 'Asignacion a evaluacion'],
        endpoints: [
          '/v1/applications',
          '/v1/applications/{id}',
          '/v1/applications/export',
          '/v1/applications/search',
          '/v1/applications/statistics',
        ],
      },
    ],
  },
  {
    domain: 'guardian',
    displayName: 'Portal Apoderado',
    roles: ['APODERADO'],
    routes: ['/apoderado/login', '/dashboard-apoderado', '/familia'],
    capabilities: [
      { key: 'guardian-auth', description: 'Login, registro y recuperacion de sesion de apoderados' },
      { key: 'guardian-dashboard', description: 'Seguimiento de postulacion, documentos y citas' },
      { key: 'guardian-schedules', description: 'Confirmar y revisar evaluaciones/entrevistas' },
    ],
    apis: [
      {
        service: 'services/authService.ts',
        responsibilities: ['Firebase login', 'Firebase register', 'Check email'],
        endpoints: ['/v1/auth/firebase-login', '/v1/auth/firebase-register', '/v1/auth/check-email'],
      },
      {
        service: 'services/evaluationService.ts',
        responsibilities: ['Agenda familiar', 'Confirmacion de citas'],
        endpoints: [
          '/v1/schedules/family/{applicationId}',
          '/v1/schedules/{scheduleId}/confirm',
          '/v1/schedules/public/mock-schedules/{applicationId}',
        ],
      },
      {
        service: 'services/documentService.ts',
        responsibilities: ['Carga, listado y visualizacion de documentos del postulante'],
        endpoints: ['/v1/documents/*'],
      },
    ],
  },
  {
    domain: 'student',
    displayName: 'Alumno',
    roles: ['APODERADO'],
    routes: ['/examenes', '/examenes/:subjectId'],
    capabilities: [
      { key: 'exam-portal', description: 'Acceso al portal de examenes y material por materia' },
      { key: 'subject-detail', description: 'Detalle de examenes y recursos del alumno por asignatura' },
    ],
    apis: [
      {
        service: 'pages/ExamPortal.tsx y pages/ExamSubjectDetail.tsx',
        responsibilities: ['Presentacion del portal y lectura de configuracion/recursos del examen'],
        endpoints: ['Mantiene las mismas integraciones actuales del portal de examenes en el frontend legado'],
      },
    ],
  },
  {
    domain: 'evaluations',
    displayName: 'Profesores y Evaluaciones',
    roles: ['ADMIN', 'TEACHER', 'CYCLE_DIRECTOR', 'PSYCHOLOGIST', 'TEACHER_LANGUAGE', 'TEACHER_MATHEMATICS', 'TEACHER_ENGLISH'],
    routes: [
      '/profesor',
      '/profesor/evaluacion/:evaluationId',
      '/profesor/informe/:examId',
      '/profesor/informe-director/:evaluationId',
      '/profesor/entrevista-director/:examId',
      '/cycle-director-interview/:evaluationId',
      '/psychological-interview/:evaluationId',
      '/profesor/estudiante/:studentId',
    ],
    capabilities: [
      { key: 'professor-auth', description: 'Login y sesion de profesores/evaluadores' },
      { key: 'evaluation-forms', description: 'Responder formularios, informes y entrevistas de ciclo' },
      { key: 'evaluator-calendar', description: 'Gestionar calendario y programaciones de evaluacion' },
    ],
    apis: [
      {
        service: 'services/professorAuthService.ts',
        responsibilities: ['Login legacy profesor', 'Perfil del profesor actual'],
        endpoints: ['/v1/auth/login', '/v1/users/me'],
      },
      {
        service: 'services/evaluationService.ts',
        responsibilities: ['Programacion generica e individual', 'Calendario evaluador', 'Reprogramacion'],
        endpoints: [
          '/v1/schedules/generic',
          '/v1/schedules/individual',
          '/v1/schedules/evaluator/{evaluatorId}',
          '/v1/schedules/{scheduleId}/reschedule',
          '/v1/schedules/{scheduleId}/complete',
        ],
      },
      {
        service: 'services/professorEvaluationService.ts',
        responsibilities: ['Persistencia de evaluaciones por profesor'],
        endpoints: ['/v1/evaluations/*'],
      },
    ],
  },
  {
    domain: 'interviews',
    displayName: 'Entrevistas',
    roles: ['ADMIN', 'TEACHER', 'COORDINATOR', 'CYCLE_DIRECTOR', 'PSYCHOLOGIST'],
    routes: ['/entrevistas', '/profesor/entrevista-familiar/:evaluationId'],
    capabilities: [
      { key: 'interview-crud', description: 'Crear, reagendar, cancelar y cerrar entrevistas' },
      { key: 'interview-dashboard', description: 'Seguimiento de entrevistas y disponibilidad' },
      { key: 'interview-notifications', description: 'Envio de recordatorios y resumenes' },
    ],
    apis: [
      {
        service: 'services/interviewService.ts',
        responsibilities: ['CRUD de entrevistas', 'Busqueda', 'Estado y agenda'],
        endpoints: ['/v1/interviews', '/v1/interviews/{id}'],
      },
      {
        service: 'services/interviewerScheduleService.ts',
        responsibilities: ['Disponibilidad de entrevistadores'],
        endpoints: ['/interviewer-schedules/*'],
      },
      {
        service: 'services/notificationService.ts',
        responsibilities: ['Notificaciones asociadas a entrevistas'],
        endpoints: ['/v1/notifications/*'],
      },
    ],
  },
  {
    domain: 'admin',
    displayName: 'Administracion',
    roles: ['ADMIN'],
    routes: ['/admin'],
    capabilities: [
      { key: 'admin-dashboard', description: 'Operacion completa del backoffice' },
      { key: 'user-management', description: 'Gestionar usuarios staff y apoderados' },
      { key: 'application-ops', description: 'Asignacion, archivado y decision de postulaciones' },
      { key: 'email-ops', description: 'Gestion de plantillas y cola de correos institucionales' },
    ],
    apis: [
      {
        service: 'services/dashboardService.ts',
        responsibilities: ['Metricas detalladas', 'Resumen del postulante'],
        endpoints: ['/v1/dashboard/detailed-stats', '/v1/dashboard/available-years', '/v1/dashboard/applicant-summary/{id}'],
      },
      {
        service: 'services/staffService.ts',
        responsibilities: ['ABM de usuarios staff'],
        endpoints: ['/v1/users', '/v1/users/{id}', '/v1/users/stats', '/v1/users/roles'],
      },
      {
        service: 'services/guardianService.ts',
        responsibilities: ['ABM de usuarios apoderado'],
        endpoints: ['/v1/users/guardians', '/v1/users/{id}/activate', '/v1/users/{id}/deactivate', '/v1/users/{id}/reset-password'],
      },
      {
        service: 'services/institutionalEmailService.ts',
        responsibilities: ['Envio de emails y gestion de cola'],
        endpoints: [
          '/v1/institutional-email/application-received/{applicationId}',
          '/v1/institutional-email/interview-invitation/{interviewId}',
          '/v1/institutional-email/queue/statistics',
          '/v1/admin/email/status',
          '/v1/admin/email/test',
        ],
      },
    ],
  },
  {
    domain: 'reports',
    displayName: 'Reportes',
    roles: ['ADMIN'],
    routes: ['/reportes'],
    capabilities: [
      { key: 'report-dashboard', description: 'Ver y refrescar reportes de negocio' },
      { key: 'export', description: 'Exportar reportes y datasets operacionales' },
    ],
    apis: [
      {
        service: 'services/reportExportService.ts',
        responsibilities: ['Exportacion de reportes'],
        endpoints: ['/v1/reports/*', '/v1/export/*'],
      },
      {
        service: 'services/analyticsService.ts',
        responsibilities: ['Metricas y agregados para reporteria'],
        endpoints: ['/v1/analytics/*'],
      },
    ],
  },
  {
    domain: 'coordinator',
    displayName: 'Coordinacion',
    roles: ['COORDINATOR', 'ADMIN'],
    routes: ['/coordinador', '/coordinador/tendencias', '/coordinador/busqueda'],
    capabilities: [
      { key: 'advanced-search', description: 'Busqueda avanzada de postulantes y casos' },
      { key: 'temporal-trends', description: 'Consulta de tendencias y metricas de seguimiento' },
    ],
    apis: [
      {
        service: 'src/api/search.client.ts',
        responsibilities: ['Busqueda avanzada, filtros, exportacion'],
        endpoints: ['/v1/search/advanced', '/v1/search/quick', '/v1/search/export'],
      },
      {
        service: 'src/api/dashboard.client.ts',
        responsibilities: ['Metricas admin, tendencias temporales, insights'],
        endpoints: ['/v1/dashboard/stats', '/v1/dashboard/admin/stats', '/v1/analytics/temporal-trends'],
      },
    ],
  },
];
