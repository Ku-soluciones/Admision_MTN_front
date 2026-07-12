import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProfessorLoginPage from './pages/ProfessorLoginPage';
import InterviewModule from './pages/InterviewModule';
import CalendarNotifications from './pages/CalendarNotifications';
import FamilyInterviewPage from './pages/FamilyInterviewPage';
import ProtectedProfessorRoute from './components/auth/ProtectedProfessorRoute';
import ProcessActiveGuard from '../../packages/shared-ui/src/components/auth/ProcessActiveGuard';
import { AppProvider } from '../admin/context/AppContext';
import { AuthProvider } from '../coordinator/context/AuthContext';
import ToastContainer from '../admin/components/ui/ToastContainer';
import GlobalToastHost from '../admin/components/ui/GlobalToastHost';
import { ErrorBoundary } from '../admin/components/ErrorBoundary';

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-azul-monte-tabor"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="flex min-h-screen flex-col bg-blanco-pureza text-gray-800">
            <main className="flex-grow overflow-x-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>

        <Route path="/" element={<Navigate to="/entrevistas" replace />} />
        <Route path="/profesor/login" element={<ProcessActiveGuard><ProfessorLoginPage /></ProcessActiveGuard>} />
        <Route path="/entrevistas" element={<ProtectedProfessorRoute><InterviewModule /></ProtectedProfessorRoute>} />
        <Route path="/calendario" element={<ProtectedProfessorRoute><CalendarNotifications /></ProtectedProfessorRoute>} />
        <Route path="/profesor/entrevista-familiar/:evaluationId" element={<ProtectedProfessorRoute><FamilyInterviewPage /></ProtectedProfessorRoute>} />
        <Route path="*" element={<Navigate to="/entrevistas" replace />} />
    
                </Routes>
              </Suspense>
            </main>
            <ToastContainer />
            <GlobalToastHost />
          </div>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
