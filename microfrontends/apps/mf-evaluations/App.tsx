import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProfessorLoginPage from './pages/ProfessorLoginPage';
import ProfessorDashboard from './pages/ProfessorDashboard';
import EvaluationForm from './pages/EvaluationForm';
import StudentProfile from './pages/StudentProfile';
import AdmissionReportForm from './components/evaluations/AdmissionReportForm';
import CycleDirectorReportForm from './components/evaluations/CycleDirectorReportForm';
import CycleDirectorInterviewForm from './components/evaluations/CycleDirectorInterviewForm';
import PsychologicalInterviewForm from './components/evaluations/PsychologicalInterviewForm';
import ProtectedProfessorRoute from './components/auth/ProtectedProfessorRoute';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ToastContainer from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createLegacyRedirectRoutes } from './routing/legacyRedirects';

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-azul-monte-tabor"></div>
  </div>
);

function App() {
  const legacyRedirects = createLegacyRedirectRoutes();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="flex min-h-screen flex-col bg-blanco-pureza text-gray-800">
            <Header />
            <main className="flex-grow overflow-x-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>

        <Route path="/" element={<Navigate to="/profesor/login" replace />} />
        <Route path="/profesor/login" element={<ProfessorLoginPage />} />
        <Route path="/profesor" element={<ProtectedProfessorRoute><ProfessorDashboard /></ProtectedProfessorRoute>} />
        <Route path="/profesor/evaluacion/:evaluationId" element={<ProtectedProfessorRoute><EvaluationForm /></ProtectedProfessorRoute>} />
        <Route path="/profesor/informe/:examId" element={<ProtectedProfessorRoute><AdmissionReportForm /></ProtectedProfessorRoute>} />
        <Route path="/profesor/informe-director/:evaluationId" element={<ProtectedProfessorRoute><CycleDirectorReportForm /></ProtectedProfessorRoute>} />
        <Route path="/profesor/entrevista-director/:examId" element={<ProtectedProfessorRoute><CycleDirectorInterviewForm /></ProtectedProfessorRoute>} />
        <Route path="/cycle-director-interview/:evaluationId" element={<ProtectedProfessorRoute><CycleDirectorInterviewForm /></ProtectedProfessorRoute>} />
        <Route path="/psychological-interview/:evaluationId" element={<ProtectedProfessorRoute><PsychologicalInterviewForm /></ProtectedProfessorRoute>} />
        <Route path="/profesor/estudiante/:studentId" element={<ProtectedProfessorRoute><StudentProfile /></ProtectedProfessorRoute>} />
        {legacyRedirects}
        <Route path="*" element={<Navigate to="/profesor/login" replace />} />
    
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <ToastContainer />
          </div>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
