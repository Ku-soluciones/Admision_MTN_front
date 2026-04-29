import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLoginPage from './pages/AdminLoginPage';
import CoordinatorLayout from './components/layout/CoordinatorLayout';
import ProtectedCoordinatorRoute from './components/auth/ProtectedCoordinatorRoute';
import CoordinatorDashboard from './src/components/coordinator/CoordinatorDashboard';
import TemporalTrendsView from './src/components/coordinator/TemporalTrendsView';
import AdvancedSearchView from './src/components/coordinator/AdvancedSearchView';
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

        <Route path="/" element={<Navigate to="/coordinador" replace />} />
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/coordinador" element={<ProtectedCoordinatorRoute><CoordinatorLayout /></ProtectedCoordinatorRoute>}>
          <Route index element={<CoordinatorDashboard />} />
          <Route path="tendencias" element={<TemporalTrendsView />} />
          <Route path="busqueda" element={<AdvancedSearchView />} />
        </Route>
        {legacyRedirects}
        <Route path="*" element={<Navigate to="/coordinador" replace />} />
    
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
