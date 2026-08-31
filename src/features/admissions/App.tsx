import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ApplicationForm from './pages/ApplicationForm';
import ComplementaryApplicationForm from '../admin/pages/ComplementaryApplicationForm';
import ApoderadoLogin from './pages/ApoderadoLogin';
import ApplicationTypeChooser from './pages/ApplicationTypeChooser';
import ApplicationEntryRedirect from './pages/ApplicationEntryRedirect';
import { AppProvider } from '../admin/context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ToastContainer from '../admin/components/ui/ToastContainer';
import GlobalToastHost from '../admin/components/ui/GlobalToastHost';
import { ErrorBoundary } from '../admin/components/ErrorBoundary';

const LoadingFallback = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-[#f7f3ea]"
    style={{ animation: 'mtn-fade-in 200ms ease-out 80ms both' }}
  >
    <div
      className="h-10 w-10 rounded-full border-2 border-transparent border-t-azul-monte-tabor"
      style={{ animation: 'spin 600ms linear infinite' }}
    />
    <style>{`
      @keyframes mtn-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  </div>
);

function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/apoderado/login';

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="flex min-h-screen flex-col bg-blanco-pureza text-gray-800">
            <Header />
            <main className="flex-grow overflow-x-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>

        <Route path="/" element={<HomePage />} />
        <Route path="/apoderado/login" element={<ApoderadoLogin />} />
        <Route path="/postulacion" element={<ApplicationForm />} />
        <Route path="/postulacion/inicio" element={<ApplicationEntryRedirect />} />
        <Route path="/postulacion/elegir" element={<ApplicationTypeChooser />} />
        <Route path="/postulacion/complementaria" element={<ComplementaryApplicationForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
    
                </Routes>
              </Suspense>
            </main>
            {!isLoginPage && <Footer />}
            <ToastContainer />
            <GlobalToastHost />
          </div>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
