import React from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedAdminRoute from './components/auth/ProtectedAdminRoute';
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
        <h1 className="font-serif text-2xl font-bold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-600">Proyecto aislado para operacion administrativa, usuarios y postulaciones.</p>
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

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
    
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
