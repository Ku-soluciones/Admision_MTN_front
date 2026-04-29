import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLoginPage from './pages/AdminLoginPage';
import ReportsDashboard from './pages/ReportsDashboard';
import ProtectedAdminRoute from './components/auth/ProtectedAdminRoute';
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

        <Route path="/" element={<Navigate to="/reportes" replace />} />
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/reportes" element={<ProtectedAdminRoute><ReportsDashboard /></ProtectedAdminRoute>} />
        {legacyRedirects}
        <Route path="*" element={<Navigate to="/reportes" replace />} />
    
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
