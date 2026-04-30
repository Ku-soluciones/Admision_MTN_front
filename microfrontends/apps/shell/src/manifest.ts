import type { ShellManifest } from '../../../packages/contracts/src/index';
import { resolveBackendEndpoints } from '../../../packages/backend-sdk/src/index';

const backend = resolveBackendEndpoints(import.meta.env as Record<string, string | undefined>);

const isBrowser = typeof window !== 'undefined';

const isLocalhost = isBrowser && window.location.hostname === 'localhost';

// Auto-detect environment from current domain
const getEnvironmentFromDomain = () => {
  if (!isBrowser) return 'development';
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost') return 'development';
  if (hostname.includes('vercel.app')) {
    // Preview deployments have random subdomains
    if (hostname.includes('-git-') || hostname.match(/^[^-]+-[a-z0-9]+-mtn/)) return 'preview';
    return 'production';
  }
  if (hostname.includes('uat.')) return 'uat';
  if (hostname.includes('staging.')) return 'staging';
  if (hostname.includes('dev.')) return 'development';
  // Production domain (custom domain without prefixes)
  return 'production';
};

// Map environments to their microfrontend domains
const environmentDomains: Record<string, string> = {
  development: 'localhost',
  uat: 'uat.admitia.eu.org',
  staging: 'staging.admitia.eu.org', // Use staging for preview deployments
  production: 'admitia.eu.org',
};

const getMfUrl = (name: string, localPort: number, localPath: string, prodPath: string) => {
  // Priority 1: Individual URL from env var
  const individualUrl = (import.meta as any).env?.[`VITE_MF_${name.toUpperCase()}_URL`];
  if (individualUrl) return individualUrl;

  // Priority 2: Base domain from env var
  const envBaseDomain = (import.meta as any).env?.VITE_MF_BASE_DOMAIN;
  if (envBaseDomain) {
    if (envBaseDomain.includes('/')) {
      return `${envBaseDomain}/${name}/#${prodPath}`;
    }
    return `https://${name}.${envBaseDomain}/#${prodPath}`;
  }

  // Priority 3: Auto-detect from current domain
  const env = getEnvironmentFromDomain();
  const baseDomain = environmentDomains[env] || environmentDomains.development;
  
  if (env === 'development') {
    return `http://localhost:${localPort}/#${localPath}`;
  }
  
  return `https://${name}.${baseDomain}/#${prodPath}`;
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
