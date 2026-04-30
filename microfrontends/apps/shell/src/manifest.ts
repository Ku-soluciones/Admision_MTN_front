import type { ShellManifest } from '../../../packages/contracts/src/index';
import { resolveBackendEndpoints } from '../../../packages/backend-sdk/src/index';

const backend = resolveBackendEndpoints(import.meta.env as Record<string, string | undefined>);

const isBrowser = typeof window !== 'undefined';

const subdomains: Record<string, string | undefined> = {
  admissions: 'admision',
  guardian: 'guard',
  student: 'estudiantes',
  evaluations: 'evaluaciones',
  interviews: 'entrevistas',
  admin: 'admin',
  reports: 'reportes',
  coordinator: 'coordinadores',
};

const defaultBaseDomain = 'admitia.dedyn.io';

const getEnvironmentDomain = () => {
  const baseDomain = ((import.meta as any).env?.VITE_MF_BASE_DOMAIN || defaultBaseDomain)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const environment = ((import.meta as any).env?.VITE_MF_ENV || '').trim().toLowerCase();

  if (!environment || environment === 'production' || environment === 'prod') {
    return baseDomain;
  }

  return `${environment}.${baseDomain}`;
};

const getMfUrl = (name: string, localPort: number, localPath: string, prodPath: string) => {
  const individualUrl = (import.meta as any).env?.[`VITE_MF_${name.toUpperCase()}_URL`];
  if (individualUrl) return `${individualUrl.replace(/\/$/, '')}/#${prodPath}`;

  if (!isBrowser || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:${localPort}/#${localPath}`;
  }

  const subdomain = subdomains[name];
  if (subdomain) {
    return `https://${subdomain}.${getEnvironmentDomain()}/#${prodPath}`;
  }

  return `${window.location.origin}/#${prodPath}`;
};

const appUrls = {
  admissions: getMfUrl('admissions', 5201, '/postulacion', '/postulacion'),
  guardian: getMfUrl('guardian', 5202, '/apoderado/login', '/apoderado/login'),
  student: getMfUrl('student', 5203, '/examenes', '/examenes'),
  evaluations: getMfUrl('evaluations', 5204, '/profesor/login', '/profesor/login'),
  interviews: getMfUrl('interviews', 5205, '/entrevistas', '/entrevistas'),
  admin: getMfUrl('admin', 5206, '/login', '/login'),
  reports: getMfUrl('reports', 5207, '/reportes', '/reportes'),
  coordinator: getMfUrl('coordinator', 5208, '/coordinador', '/coordinador'),
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
