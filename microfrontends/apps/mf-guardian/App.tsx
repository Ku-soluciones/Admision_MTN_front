import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ApoderadoLogin from './pages/ApoderadoLogin';
import FamilyDashboard from './pages/FamilyDashboard';
import ProtectedApoderadoRoute from './components/auth/ProtectedApoderadoRoute';
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
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/familia') || location.pathname.startsWith('/dashboard-apoderado');
  const isLoginPage = location.pathname === '/apoderado/login';

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="flex min-h-screen flex-col bg-blanco-pureza text-gray-800">
            {!isLoginPage && !isDashboard && <Header />}
            <main className="flex-grow overflow-x-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>

        <Route path="/" element={<Navigate to="/apoderado/login" replace />} />
        <Route path="/apoderado/login" element={<ApoderadoLogin />} />
        <Route path="/dashboard-apoderado" element={<ProtectedApoderadoRoute><FamilyDashboard /></ProtectedApoderadoRoute>} />
        <Route path="/familia" element={<ProtectedApoderadoRoute><FamilyDashboard /></ProtectedApoderadoRoute>} />
        {legacyRedirects}
        <Route path="*" element={<Navigate to="/apoderado/login" replace />} />
    
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
