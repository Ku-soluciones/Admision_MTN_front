const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const buildUrl = (port: number, hashPath: string) => `http://${host}:${port}/#${hashPath}`;

export const microfrontendUrls = {
  home: buildUrl(5201, '/'),
  admissions: buildUrl(5201, '/postulacion'),
  admissionsComplementary: buildUrl(5201, '/postulacion/complementaria'),
  guardianLogin: buildUrl(5202, '/apoderado/login'),
  guardianDashboard: buildUrl(5202, '/familia'),
  studentExams: buildUrl(5203, '/examenes'),
  professorLogin: buildUrl(5204, '/profesor/login'),
  professorDashboard: buildUrl(5204, '/profesor'),
  adminLogin: buildUrl(5206, '/login'),
  adminDashboard: buildUrl(5206, '/admin'),
  interviews: buildUrl(5205, '/entrevistas'),
  calendar: buildUrl(5205, '/calendario'),
  reports: buildUrl(5207, '/reportes'),
  coordinator: buildUrl(5208, '/coordinador'),
  coordinatorTrends: buildUrl(5208, '/coordinador/tendencias'),
  coordinatorSearch: buildUrl(5208, '/coordinador/busqueda'),
};
