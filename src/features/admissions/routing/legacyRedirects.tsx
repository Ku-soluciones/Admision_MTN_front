import React, { useEffect } from 'react';
import { Route } from 'react-router-dom';
import { appUrls } from '../utils/appUrls';

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}

export function createLegacyRedirectRoutes() {
  return [
    <Route key="legacy-apoderado-login" path="/apoderado/login" element={<ExternalRedirect to={appUrls.guardianLogin} />} />,
    <Route key="legacy-apoderado-login-2" path="/apoderado-login" element={<ExternalRedirect to={appUrls.guardianLogin} />} />,
    <Route key="legacy-familia" path="/familia" element={<ExternalRedirect to={appUrls.guardianDashboard} />} />,
    <Route key="legacy-dashboard-apoderado" path="/dashboard-apoderado" element={<ExternalRedirect to={appUrls.guardianDashboard} />} />,
    <Route key="legacy-postulacion" path="/postulacion" element={<ExternalRedirect to={appUrls.admissions} />} />,
    <Route key="legacy-postulacion-complementaria" path="/postulacion/complementaria" element={<ExternalRedirect to={appUrls.admissionsComplementary} />} />,
    <Route key="legacy-examenes" path="/examenes" element={<ExternalRedirect to={appUrls.studentExams} />} />,
    <Route key="legacy-examenes-detail" path="/examenes/:subjectId" element={<ExternalRedirect to={appUrls.studentExams} />} />,
    <Route key="legacy-login" path="/login" element={<ExternalRedirect to={appUrls.adminLogin} />} />,
    <Route key="legacy-admin-login" path="/admin/login" element={<ExternalRedirect to={appUrls.adminLogin} />} />,
    <Route key="legacy-admin" path="/admin" element={<ExternalRedirect to={appUrls.adminLogin} />} />,
    <Route key="legacy-reportes" path="/reportes" element={<ExternalRedirect to={appUrls.reports} />} />,
    <Route key="legacy-profesor-login" path="/profesor/login" element={<ExternalRedirect to={appUrls.professorLogin} />} />,
    <Route key="legacy-profesor" path="/profesor" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-dashboard" path="/profesor/dashboard" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-evaluacion" path="/profesor/evaluacion/:evaluationId" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-informe" path="/profesor/informe/:examId" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-informe-director" path="/profesor/informe-director/:evaluationId" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-entrevista-director" path="/profesor/entrevista-director/:examId" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-cycle-director" path="/cycle-director-interview/:evaluationId" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-psychological" path="/psychological-interview/:evaluationId" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-profesor-estudiante" path="/profesor/estudiante/:studentId" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-entrevistas" path="/entrevistas" element={<ExternalRedirect to={appUrls.interviews} />} />,
    <Route key="legacy-calendario" path="/calendario" element={<ExternalRedirect to={appUrls.calendar} />} />,
    <Route key="legacy-familia-interview" path="/profesor/entrevista-familiar/:evaluationId" element={<ExternalRedirect to={appUrls.interviews} />} />,
    <Route key="legacy-coordinador" path="/coordinador" element={<ExternalRedirect to={appUrls.coordinator} />} />,
    <Route key="legacy-coordinador-tendencias" path="/coordinador/tendencias" element={<ExternalRedirect to={appUrls.coordinatorTrends} />} />,
    <Route key="legacy-coordinador-busqueda" path="/coordinador/busqueda" element={<ExternalRedirect to={appUrls.coordinatorSearch} />} />,
    <Route key="legacy-family" path="/family" element={<ExternalRedirect to={appUrls.guardianDashboard} />} />,
    <Route key="legacy-professor" path="/professor" element={<ExternalRedirect to={appUrls.professorDashboard} />} />,
    <Route key="legacy-dashboard" path="/dashboard" element={<ExternalRedirect to={appUrls.guardianDashboard} />} />,
    <Route key="legacy-unauthorized" path="/unauthorized" element={<ExternalRedirect to={appUrls.home} />} />,
  ];
}
