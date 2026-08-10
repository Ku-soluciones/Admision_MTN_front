import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { applicationService } from '../../../packages/shared-ui/src/services/applicationService';
import { guardianPrekinderService } from '../../guardian/services/guardianPrekinderService';

const LOGIN_REDIRECT = `/apoderado/login?redirect=${encodeURIComponent('/postulacion/inicio')}`;

type EntryDestination = '/dashboard-apoderado' | '/postulacion/elegir' | null;

const ApplicationEntryRedirect = () => {
  const { isAuthenticated, isLoading: sessionLoading } = useAuth();
  const [destination, setDestination] = useState<EntryDestination>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  const resolveDestination = useCallback(async () => {
    setChecking(true);
    setError('');

    const [generalResult, prekinderResult] = await Promise.allSettled([
      applicationService.getMyApplications(),
      guardianPrekinderService.applications(),
    ]);

    const hasGeneralApplications =
      generalResult.status === 'fulfilled'
      && generalResult.value.some(application => application.status !== 'ARCHIVED');
    const hasPrekinderApplications =
      prekinderResult.status === 'fulfilled' && prekinderResult.value.length > 0;

    if (hasGeneralApplications || hasPrekinderApplications) {
      setDestination('/dashboard-apoderado');
      return;
    }

    if (generalResult.status === 'fulfilled' && prekinderResult.status === 'fulfilled') {
      setDestination('/postulacion/elegir');
      return;
    }

    setError('No pudimos verificar tus postulaciones. Revisa tu conexión e inténtalo nuevamente.');
    setChecking(false);
  }, []);

  useEffect(() => {
    if (sessionLoading || !isAuthenticated) return;
    void resolveDestination();
  }, [isAuthenticated, resolveDestination, sessionLoading]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center gap-3 text-azul-monte-tabor" role="status">
        <RefreshCw className="animate-spin motion-reduce:animate-none" size={22} aria-hidden="true" />
        Verificando tu sesión
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to={LOGIN_REDIRECT} replace />;
  if (destination) return <Navigate to={destination} replace />;

  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4">
      <div className="max-w-md text-center" aria-live="polite">
        {checking ? (
          <>
            <RefreshCw className="mx-auto animate-spin text-azul-monte-tabor motion-reduce:animate-none" size={28} aria-hidden="true" />
            <p className="mt-4 font-semibold text-azul-monte-tabor">Buscando tus postulaciones activas</p>
            <p className="mt-2 text-sm leading-6 text-gris-piedra">Te llevaremos al lugar correcto automáticamente.</p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-bold text-azul-monte-tabor">No pudimos continuar</h1>
            <p className="mt-3 text-sm leading-6 text-gris-piedra" role="alert">{error}</p>
            <button
              type="button"
              onClick={() => void resolveDestination()}
              className="mt-6 min-h-11 rounded-xl bg-azul-monte-tabor px-5 py-2.5 font-bold text-white transition-colors hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:ring-offset-2"
            >
              Reintentar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ApplicationEntryRedirect;
