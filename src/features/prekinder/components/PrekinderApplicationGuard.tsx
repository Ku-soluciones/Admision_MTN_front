import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useProcessActivePrekinder } from '../../../packages/shared-utils/src/hooks/useProcessActivePrekinder';

export function PrekinderApplicationGuard({ children }: PropsWithChildren) {
  const { isProcessActive, isLoading } = useProcessActivePrekinder();

  if (isLoading) {
    return (
      <div className="pk-page flex items-center justify-center px-6" role="status">
        <RefreshCw
          className="mr-3 animate-spin text-azul-monte-tabor motion-reduce:animate-none"
          size={22}
          aria-hidden="true"
        />
        Verificando disponibilidad de Prekínder
      </div>
    );
  }

  if (!isProcessActive) {
    return <Navigate to="/postulacion/elegir" replace />;
  }

  return <>{children}</>;
}
