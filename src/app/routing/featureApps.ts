import { lazy } from 'react';

export const featureApps = {
  admissions: lazy(() => import('../../features/admissions/App')),
  guardian: lazy(() => import('../../features/guardian/App')),
  student: lazy(() => import('../../features/student/App')),
  evaluations: lazy(() => import('../../features/evaluations/App')),
  interviews: lazy(() => import('../../features/interviews/App')),
  admin: lazy(() => import('../../features/admin/App')),
  reports: lazy(() => import('../../features/reports/App')),
  coordinator: lazy(() => import('../../features/coordinator/App')),
};
