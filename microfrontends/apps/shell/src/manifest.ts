import type { ShellManifest } from '../../../packages/contracts/src/index';
import { resolveBackendEndpoints } from '../../../packages/backend-sdk/src/index';

const backend = resolveBackendEndpoints(import.meta.env as Record<string, string | undefined>);

const appUrls = {
  admissions: import.meta.env.VITE_MF_ADMISSIONS_URL || 'http://localhost:5201/#/postulacion',
  guardian: import.meta.env.VITE_MF_GUARDIAN_URL || 'http://localhost:5202/#/apoderado/login',
  student: import.meta.env.VITE_MF_STUDENT_URL || 'http://localhost:5203/#/examenes',
  evaluations: import.meta.env.VITE_MF_EVALUATIONS_URL || 'http://localhost:5204/#/profesor/login',
  interviews: import.meta.env.VITE_MF_INTERVIEWS_URL || 'http://localhost:5205/#/entrevistas',
  admin: import.meta.env.VITE_MF_ADMIN_URL || 'http://localhost:5206/#/login',
  reports: import.meta.env.VITE_MF_REPORTS_URL || 'http://localhost:5207/#/reportes',
  coordinator: import.meta.env.VITE_MF_COORDINATOR_URL || 'http://localhost:5208/#/coordinador',
};

export const shellManifest: ShellManifest = {
  shell: {
    appName: 'mtn-admission-shell',
    domain: 'shared',
    basePath: '/',
    backend,
  },
  remotes: [
    {
      name: 'admissions',
      domain: 'admissions',
      entry: appUrls.admissions,
      basePath: '/postulacion',
      routes: [
        {
          path: '/postulacion',
          remote: 'admissions',
          module: './ApplicationRoot',
        },
      ],
      nav: [
        {
          label: 'Postulacion',
          to: '/postulacion',
        },
      ],
    },
    {
      name: 'guardian',
      domain: 'guardian',
      entry: appUrls.guardian,
      basePath: '/familia',
      routes: [
        {
          path: '/familia',
          remote: 'guardian',
          module: './FamilyRoot',
          roles: ['APODERADO'],
        },
      ],
    },
    {
      name: 'student',
      domain: 'student',
      entry: appUrls.student,
      basePath: '/examenes',
      routes: [
        {
          path: '/examenes',
          remote: 'student',
          module: './StudentRoot',
        },
      ],
      nav: [
        {
          label: 'Alumno',
          to: '/examenes',
        },
      ],
    },
    {
      name: 'admin',
      domain: 'admin',
      entry: appUrls.admin,
      basePath: '/admin',
      routes: [
        {
          path: '/admin',
          remote: 'admin',
          module: './AdminRoot',
          roles: ['ADMIN'],
        },
        {
          path: '/reportes',
          remote: 'admin',
          module: './ReportsRoot',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      name: 'evaluations',
      domain: 'evaluations',
      entry: appUrls.evaluations,
      basePath: '/profesor',
      routes: [
        {
          path: '/profesor',
          remote: 'evaluations',
          module: './ProfessorRoot',
          roles: ['ADMIN', 'TEACHER', 'CYCLE_DIRECTOR', 'PSYCHOLOGIST', 'TEACHER_LANGUAGE', 'TEACHER_MATHEMATICS', 'TEACHER_ENGLISH'],
        },
      ],
    },
    {
      name: 'interviews',
      domain: 'interviews',
      entry: appUrls.interviews,
      basePath: '/entrevistas',
      routes: [
        {
          path: '/entrevistas',
          remote: 'interviews',
          module: './InterviewRoot',
          roles: ['ADMIN', 'TEACHER', 'COORDINATOR', 'CYCLE_DIRECTOR', 'PSYCHOLOGIST'],
        },
      ],
    },
    {
      name: 'reports',
      domain: 'reports',
      entry: appUrls.reports,
      basePath: '/reportes',
      routes: [
        {
          path: '/reportes',
          remote: 'reports',
          module: './ReportsRoot',
          roles: ['ADMIN'],
        },
      ],
      nav: [
        {
          label: 'Reportes',
          to: '/reportes',
          roles: ['ADMIN'],
        },
      ],
    },
    {
      name: 'coordinator',
      domain: 'coordinator',
      entry: appUrls.coordinator,
      basePath: '/coordinador',
      routes: [
        {
          path: '/coordinador',
          remote: 'coordinator',
          module: './CoordinatorRoot',
          roles: ['COORDINATOR', 'ADMIN'],
        },
      ],
    },
  ],
};
