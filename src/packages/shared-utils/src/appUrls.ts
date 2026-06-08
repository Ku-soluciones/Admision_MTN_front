const buildHashUrl = (hashPath: string) => {
  const normalizedPath = hashPath.startsWith('/') ? hashPath : `/${hashPath}`;

  if (typeof window === 'undefined') {
    return `#${normalizedPath}`;
  }

  return `${window.location.origin}${window.location.pathname}#${normalizedPath}`;
};

export const appUrls = {
  home: buildHashUrl('/'),
  admissions: buildHashUrl('/postulacion'),
  freshAdmissions: `${buildHashUrl('/postulacion').replace('#', '?fresh=1#')}`,
  admissionsComplementary: buildHashUrl('/postulacion/complementaria'),
  guardianLogin: buildHashUrl('/apoderado/login'),
  guardianRegister: `${buildHashUrl('/apoderado/login').replace('#', '?register=1#')}`,
  guardianDashboard: buildHashUrl('/familia'),
  studentExams: buildHashUrl('/examenes'),
  professorLogin: buildHashUrl('/profesor/login'),
  professorDashboard: buildHashUrl('/profesor'),
  adminLogin: buildHashUrl('/login'),
  adminDashboard: buildHashUrl('/admin'),
  interviews: buildHashUrl('/entrevistas'),
  calendar: buildHashUrl('/calendario'),
  reports: buildHashUrl('/reportes'),
  coordinator: buildHashUrl('/coordinador'),
  coordinatorTrends: buildHashUrl('/coordinador/tendencias'),
  coordinatorSearch: buildHashUrl('/coordinador/busqueda'),
};
