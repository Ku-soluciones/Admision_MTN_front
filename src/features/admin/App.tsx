import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import ProfessorLoginPage from './pages/ProfessorLoginPage';
import ApoderadoLogin from './pages/ApoderadoLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedAdminRoute from './components/auth/ProtectedAdminRoute';
import ProcessActiveGuard from '../../packages/shared-ui/src/components/auth/ProcessActiveGuard';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import ToastContainer from './components/ui/ToastContainer';
import GlobalToastHost from './components/ui/GlobalToastHost';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PrekinderAdminGuard } from '../prekinder/components/PrekinderAdminGuard';

const PrekinderOperations = lazy(() =>
  import('../prekinder/pages/PrekinderOperations')
    .then((module) => ({ default: module.PrekinderOperations }))
);

const PrekinderPage: React.FC = () => (
  <PrekinderAdminGuard roles={['ADMIN', 'COORDINATOR', 'CYCLE_DIRECTOR']}>
    <PrekinderOperations />
  </PrekinderAdminGuard>
);

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f7f3ea]">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-azul-monte-tabor"></div>
  </div>
);

function App() {
  const location = useLocation();
  const hideHeader = location.pathname === '/login'
    || location.pathname === '/admin/login'
    || location.pathname === '/profesor'
    || location.pathname === '/apoderado/login'
    || location.pathname === '/admin'
    || location.pathname.startsWith('/admin/')
    || location.pathname === '/familia';

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="flex min-h-screen flex-col bg-blanco-pureza text-gray-800 font-sans">
            {!hideHeader && <Header />}
            <main className="flex-grow overflow-x-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/profesor" element={<ProcessActiveGuard><ProfessorLoginPage /></ProcessActiveGuard>} />
        <Route path="/apoderado/login" element={<ApoderadoLogin />} />
        <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
        <Route path="/admin/prekinder" element={<PrekinderPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

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
