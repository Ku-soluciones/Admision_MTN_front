import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLoginPage from './pages/AdminLoginPage';
import ReportsDashboard from './pages/ReportsDashboard';
import ProtectedAdminRoute from './components/auth/ProtectedAdminRoute';
import { AppProvider } from '../admin/context/AppContext';
import { AuthProvider } from '../coordinator/context/AuthContext';
import Header from '../coordinator/components/layout/Header';
import ToastContainer from '../admin/components/ui/ToastContainer';
import GlobalToastHost from '../evaluations/components/ui/GlobalToastHost';
import { ErrorBoundary } from '../admin/components/ErrorBoundary';

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-azul-monte-tabor"></div>
  </div>
);

function App() {
  const location = useLocation();
  const isPortalPage = location.pathname !== '/login';

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="flex min-h-screen flex-col bg-blanco-pureza text-gray-800">
            {!isPortalPage && <Header />}
            <main className="flex-grow overflow-x-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>

        <Route path="/" element={<Navigate to="/reportes" replace />} />
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/reportes" element={<ProtectedAdminRoute><ReportsDashboard /></ProtectedAdminRoute>} />
        <Route path="*" element={<Navigate to="/reportes" replace />} />
    
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
