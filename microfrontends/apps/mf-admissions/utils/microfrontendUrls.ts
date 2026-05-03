import { resolveEnvironmentDomain } from '../../../packages/backend-sdk/src/index';

const isBrowser = typeof window !== 'undefined';
const host = isBrowser ? window.location.hostname : 'localhost';
const protocol = isBrowser ? window.location.protocol : 'http:';

const localPorts = {
  admissions: 5201,
  guardian: 5202,
  student: 5203,
  evaluations: 5204,
  interviews: 5205,
  admin: 5206,
  reports: 5207,
  coordinator: 5208,
} as const;

const subdomains: Partial<Record<keyof typeof localPorts, string>> = {
  admissions: 'admision',
  guardian: 'guard',
  student: 'estudiantes',
  evaluations: 'evaluaciones',
  interviews: 'entrevistas',
  admin: 'admin',
  reports: 'reportes',
  coordinator: 'coordinadores',
};

const buildUrl = (app: keyof typeof localPorts, hashPath: string) => {
  const envUrl = (import.meta as any).env?.[`VITE_MF_${app.toUpperCase()}_URL`];
  if (envUrl) return `${envUrl.replace(/\/$/, '')}/#${hashPath}`;

  if (host === 'localhost' || host === '127.0.0.1') {
    return `http://${host}:${localPorts[app]}/#${hashPath}`;
  }

  const subdomain = subdomains[app];
  if (subdomain) {
    return `https://${subdomain}.${resolveEnvironmentDomain((import.meta as any).env)}/#${hashPath}`;
  }

  return `${protocol}//${host}/#${hashPath}`;
};

export const microfrontendUrls = {
  home: buildUrl('admissions', '/'),
  admissions: buildUrl('admissions', '/apoderado/login'),
  admissionsComplementary: buildUrl('admissions', '/postulacion/complementaria'),
  guardianLogin: buildUrl('guardian', '/apoderado/login'),
  guardianDashboard: buildUrl('guardian', '/familia'),
  studentExams: buildUrl('student', '/examenes'),
  professorLogin: buildUrl('evaluations', '/profesor/login'),
  professorDashboard: buildUrl('evaluations', '/profesor'),
  adminLogin: buildUrl('admin', '/login'),
  adminDashboard: buildUrl('admin', '/admin'),
  interviews: buildUrl('interviews', '/entrevistas'),
  calendar: buildUrl('interviews', '/calendario'),
  reports: buildUrl('reports', '/reportes'),
  coordinator: buildUrl('coordinator', '/coordinador'),
  coordinatorTrends: buildUrl('coordinator', '/coordinador/tendencias'),
  coordinatorSearch: buildUrl('coordinator', '/coordinador/busqueda'),
};
