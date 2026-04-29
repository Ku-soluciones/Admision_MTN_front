import React, { useEffect } from 'react';
import { Route } from 'react-router-dom';
import { microfrontendUrls } from '../utils/microfrontendUrls';

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

export function createLegacyRedirectRoutes() {
  return [
    <Route key="legacy-apoderado-login" path="/apoderado/login" element={<ExternalRedirect to={microfrontendUrls.guardianLogin} />} />,
    <Route key="legacy-apoderado-login-2" path="/apoderado-login" element={<ExternalRedirect to={microfrontendUrls.guardianLogin} />} />,
    <Route key="legacy-familia" path="/familia" element={<ExternalRedirect to={microfrontendUrls.guardianDashboard} />} />,
    <Route key="legacy-dashboard-apoderado" path="/dashboard-apoderado" element={<ExternalRedirect to={microfrontendUrls.guardianDashboard} />} />,
    <Route key="legacy-postulacion" path="/postulacion" element={<ExternalRedirect to={microfrontendUrls.admissions} />} />,
    <Route key="legacy-postulacion-complementaria" path="/postulacion/complementaria" element={<ExternalRedirect to={microfrontendUrls.admissionsComplementary} />} />,
    <Route key="legacy-examenes" path="/examenes" element={<ExternalRedirect to={microfrontendUrls.studentExams} />} />,
    <Route key="legacy-examenes-detail" path="/examenes/:subjectId" element={<ExternalRedirect to={microfrontendUrls.studentExams} />} />,
    <Route key="legacy-login" path="/login" element={<ExternalRedirect to={microfrontendUrls.adminLogin} />} />,
    <Route key="legacy-admin-login" path="/admin/login" element={<ExternalRedirect to={microfrontendUrls.adminLogin} />} />,
    <Route key="legacy-admin" path="/admin" element={<ExternalRedirect to={microfrontendUrls.adminLogin} />} />,
    <Route key="legacy-reportes" path="/reportes" element={<ExternalRedirect to={microfrontendUrls.reports} />} />,
    <Route key="legacy-profesor-login" path="/profesor/login" element={<ExternalRedirect to={microfrontendUrls.professorLogin} />} />,
    <Route key="legacy-profesor" path="/profesor" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-dashboard" path="/profesor/dashboard" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-evaluacion" path="/profesor/evaluacion/:evaluationId" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-informe" path="/profesor/informe/:examId" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-informe-director" path="/profesor/informe-director/:evaluationId" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-entrevista-director" path="/profesor/entrevista-director/:examId" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-cycle-director" path="/cycle-director-interview/:evaluationId" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-psychological" path="/psychological-interview/:evaluationId" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-estudiante" path="/profesor/estudiante/:studentId" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-entrevistas" path="/entrevistas" element={<ExternalRedirect to={microfrontendUrls.interviews} />} />,
    <Route key="legacy-calendario" path="/calendario" element={<ExternalRedirect to={microfrontendUrls.calendar} />} />,
    <Route key="legacy-familia-interview" path="/profesor/entrevista-familiar/:evaluationId" element={<ExternalRedirect to={microfrontendUrls.interviews} />} />,
    <Route key="legacy-coordinador" path="/coordinador" element={<ExternalRedirect to={microfrontendUrls.coordinator} />} />,
    <Route key="legacy-coordinador-tendencias" path="/coordinador/tendencias" element={<ExternalRedirect to={microfrontendUrls.coordinatorTrends} />} />,
    <Route key="legacy-coordinador-busqueda" path="/coordinador/busqueda" element={<ExternalRedirect to={microfrontendUrls.coordinatorSearch} />} />,
    <Route key="legacy-family" path="/family" element={<ExternalRedirect to={microfrontendUrls.guardianDashboard} />} />,
    <Route key="legacy-professor" path="/professor" element={<ExternalRedirect to={microfrontendUrls.professorDashboard} />} />,
    <Route key="legacy-dashboard" path="/dashboard" element={<ExternalRedirect to={microfrontendUrls.guardianDashboard} />} />,
    <Route key="legacy-unauthorized" path="/unauthorized" element={<ExternalRedirect to={microfrontendUrls.home} />} />,
  ];
}
