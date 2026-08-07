const buildAppUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window === 'undefined') {
    return normalizedPath;
  }

  return `${window.location.origin}${normalizedPath}`;
};

export const appUrls = {
  home: buildAppUrl('/'),
  admissions: buildAppUrl('/postulacion'),
  freshAdmissions: `${buildAppUrl('/postulacion')}?fresh=1`,
  admissionsComplementary: buildAppUrl('/postulacion/complementaria'),
  applicationChoice: buildAppUrl('/postulacion/elegir'),
  guardianApplicationEntry: `${buildAppUrl('/apoderado/login')}?register=1&redirect=${encodeURIComponent('/postulacion/elegir')}`,
  prekinderApplication: buildAppUrl('/prekinder/postular'),
  prekinderResults: buildAppUrl('/prekinder/resultado'),
  guardianLogin: buildAppUrl('/apoderado/login'),
  guardianRegister: `${buildAppUrl('/apoderado/login')}?register=1`,
  guardianDashboard: buildAppUrl('/familia'),
  studentExams: buildAppUrl('/examenes'),
  professorLogin: buildAppUrl('/profesor/login'),
  professorDashboard: buildAppUrl('/profesor'),
  adminLogin: buildAppUrl('/login'),
  adminDashboard: buildAppUrl('/admin'),
  adminPrekinder: `${buildAppUrl('/admin')}?section=prekinder`,
  interviews: buildAppUrl('/entrevistas'),
  calendar: buildAppUrl('/calendario'),
  reports: buildAppUrl('/reportes'),
  coordinator: buildAppUrl('/coordinador'),
  coordinatorTrends: buildAppUrl('/coordinador/tendencias'),
  coordinatorSearch: buildAppUrl('/coordinador/busqueda'),
};
