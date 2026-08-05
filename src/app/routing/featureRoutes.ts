import type { ComponentType, LazyExoticComponent } from 'react';
import { featureApps } from './featureApps';

type FeatureApp = LazyExoticComponent<ComponentType>;

type FeatureRoute = {
  app: FeatureApp;
  matches: (pathname: string) => boolean;
};

const isRootOrAdmissions = (pathname: string) => pathname === '/' || pathname.startsWith('/postulacion');

const isGuardianRoute = (pathname: string) =>
  pathname === '/apoderado/login'
  || pathname.startsWith('/dashboard-apoderado')
  || pathname.startsWith('/familia')
  || pathname === '/interview/confirmation-result';

const isStudentRoute = (pathname: string) => pathname.startsWith('/examenes');

const isInterviewRoute = (pathname: string) =>
  pathname.startsWith('/entrevistas')
  || pathname.startsWith('/calendario')
  || pathname.startsWith('/profesor/entrevista-familiar/');

const isEvaluationRoute = (pathname: string) =>
  pathname === '/profesor/login'
  || pathname.startsWith('/profesor')
  || pathname.startsWith('/cycle-director-interview/')
  || pathname.startsWith('/psychological-interview/');

const isAdminRoute = (pathname: string) => pathname === '/login' || pathname.startsWith('/admin');

export const featureRoutes: FeatureRoute[] = [
  { app: featureApps.prekinder, matches: (pathname) => pathname.startsWith('/prekinder') },
  { app: featureApps.admissions, matches: isRootOrAdmissions },
  { app: featureApps.guardian, matches: isGuardianRoute },
  { app: featureApps.student, matches: isStudentRoute },
  { app: featureApps.interviews, matches: isInterviewRoute },
  { app: featureApps.evaluations, matches: isEvaluationRoute },
  { app: featureApps.admin, matches: isAdminRoute },
  { app: featureApps.reports, matches: (pathname) => pathname.startsWith('/reportes') },
  { app: featureApps.coordinator, matches: (pathname) => pathname.startsWith('/coordinador') },
];
