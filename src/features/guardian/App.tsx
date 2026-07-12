import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ApoderadoLogin from './pages/ApoderadoLogin';
import FamilyDashboard from './pages/FamilyDashboard';
import InterviewConfirmationResult from './pages/InterviewConfirmationResult';
import ProtectedApoderadoRoute from './components/auth/ProtectedApoderadoRoute';
import { AppProvider } from '../admin/context/AppContext';
import { AuthProvider } from '../coordinator/context/AuthContext';
import Header from '../coordinator/components/layout/Header';
import ToastContainer from '../admin/components/ui/ToastContainer';
import GlobalToastHost from '../admin/components/ui/GlobalToastHost';
import { ErrorBoundary } from '../admin/components/ErrorBoundary';

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-azul-monte-tabor"></div>
  </div>
);

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/familia') || location.pathname.startsWith('/dashboard-apoderado');
  const isLoginPage = location.pathname === '/apoderado/login';
  const isConfirmationResult = location.pathname === '/interview/confirmation-result';

  return (
    <ErrorBoundary>
      <AuthProvider portalType="GUARDIAN">
        <AppProvider>
          <div className="flex min-h-screen flex-col bg-blanco-pureza text-gray-800">
            {!isLoginPage && !isDashboard && !isConfirmationResult && <Header />}
            <main className="flex-grow overflow-x-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>

        <Route path="/" element={<Navigate to="/apoderado/login" replace />} />
        <Route path="/apoderado/login" element={<ApoderadoLogin />} />
        <Route path="/interview/confirmation-result" element={<InterviewConfirmationResult />} />
        <Route path="/dashboard-apoderado" element={<ProtectedApoderadoRoute><FamilyDashboard /></ProtectedApoderadoRoute>} />
        <Route path="/familia" element={<ProtectedApoderadoRoute><FamilyDashboard /></ProtectedApoderadoRoute>} />
        <Route path="*" element={<Navigate to="/apoderado/login" replace />} />
    
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
