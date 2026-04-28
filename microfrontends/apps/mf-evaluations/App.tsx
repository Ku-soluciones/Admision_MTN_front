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
import ToastContainer from './components/ui/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-azul-monte-tabor"></div>
  </div>
);

const Topbar = () => (
  <header className="border-b border-amber-200 bg-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Microfrontend independiente</p>
        <h1 className="font-serif text-2xl font-bold text-slate-900">Profesores y Evaluaciones</h1>
        <p className="text-sm text-slate-600">Proyecto aislado para login profesor, evaluaciones, informes y ficha de estudiante.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <a className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-amber-400 hover:text-amber-800" href="http://localhost:5200/#/">Shell</a>
        <a className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-amber-400 hover:text-amber-800" href="/">Recargar</a>
      </div>
    </div>
  </header>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="min-h-screen bg-[#f7f3ea] text-slate-800">
            <Topbar />
            <main className="min-h-[calc(100vh-88px)]">
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
        <Route path="*" element={<Navigate to="/profesor/login" replace />} />
    
                </Routes>
              </Suspense>
            </main>
            <ToastContainer />
          </div>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
