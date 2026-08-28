import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLoginPage from './pages/AdminLoginPage';
import CoordinatorLayout from './components/layout/CoordinatorLayout';
import ProtectedCoordinatorRoute from './components/auth/ProtectedCoordinatorRoute';
import CoordinatorDashboard from '../admin/src/components/coordinator/CoordinatorDashboard';
import TemporalTrendsView from '../admin/src/components/coordinator/TemporalTrendsView';
import AdvancedSearchView from '../admin/src/components/coordinator/AdvancedSearchView';
import { AppProvider } from '../admin/context/AppContext';
import { AuthProvider } from './context/AuthContext';
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
      <AuthProvider portalType="STAFF">
        <AppProvider>
          <div className="flex min-h-screen flex-col bg-blanco-pureza text-gray-800">
            <main className="flex-grow overflow-x-hidden">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>

        <Route path="/" element={<Navigate to="/coordinador" replace />} />
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/coordinador" element={<ProtectedCoordinatorRoute><CoordinatorLayout /></ProtectedCoordinatorRoute>}>
          <Route index element={<CoordinatorDashboard />} />
          <Route path="tendencias" element={<TemporalTrendsView />} />
          <Route path="busqueda" element={<AdvancedSearchView />} />
        </Route>
        <Route path="*" element={<Navigate to="/coordinador" replace />} />
    
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
