import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log detallado del error con stack trace
    console.error('🔴 ErrorBoundary caught an error:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Guardar errorInfo en el state para mostrarlo en desarrollo
    this.setState({ errorInfo });

    // En producción, aquí se podría enviar a un servicio de logging externo
    // Ejemplo: Sentry, LogRocket, etc.
  }

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Algo salió mal</h1>
                <p className="text-gray-600">La aplicación encontró un error inesperado</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Lo sentimos, ocurrió un error al procesar tu solicitud. Puedes intentar:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                <li>Recargar la página</li>
                <li>Volver al inicio</li>
                <li>Contactar al soporte técnico si el problema persiste</li>
              </ul>
            </div>

            {/* Mostrar detalles del error solo en desarrollo */}
            {isDevelopment && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold text-red-800 mb-2">Detalles del Error (Desarrollo):</h3>
                <p className="text-sm font-mono text-red-700 mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                      Ver Component Stack
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto p-2 bg-white border border-red-200 rounded">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-azul-monte-tabor text-white rounded-lg hover:bg-azul-monte-tabor/90 transition-colors font-medium"
              >
                Recargar Página
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
