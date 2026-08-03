import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Calendar, Clock, ArrowLeft } from 'lucide-react';

interface ConfirmationState {
  status: 'confirmed' | 'rejected' | 'error' | null;
  interviewId: string | null;
  message: string;
}

export default function InterviewConfirmationResult() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ConfirmationState>({
    status: null,
    interviewId: null,
    message: ''
  });

  useEffect(() => {
    const status = searchParams.get('status') as 'confirmed' | 'rejected' | 'error' | null;
    const interviewId = searchParams.get('interviewId');
    const message = searchParams.get('message') || '';

    // Debug logging
    console.log('InterviewConfirmationResult loaded:', { status, interviewId, message, allParams: Object.fromEntries(searchParams) });

    setState({
      status,
      interviewId,
      message: decodeURIComponent(message)
    });
  }, [searchParams]);

  const renderContent = () => {
    switch (state.status) {
      case 'confirmed':
        return (
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ¡Entrevista Confirmada!
            </h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-lg">
                {state.message || 'Su asistencia ha sido confirmada exitosamente.'}
              </p>
            </div>
            {state.interviewId && (
              <p className="text-sm text-gray-500 mb-6">
                ID de entrevista: {state.interviewId}
              </p>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Próximos pasos
              </h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Revise su correo para confirmación</li>
                <li>• Agregue la fecha a su calendario</li>
                <li>• Prepare la documentación necesaria</li>
              </ul>
            </div>
          </div>
        );

      case 'rejected':
        return (
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Solicitud de nuevo horario recibida
            </h1>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <p className="text-orange-800 text-lg">
                {state.message || 'Ha indicado que no puede asistir a la entrevista programada.'}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                ¿Qué sucede ahora?
              </h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• El coordinador fue notificado</li>
                <li>• Admisión propondrá una nueva fecha</li>
                <li>• Revise su correo en los próximos días</li>
              </ul>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Enlace Inválido
            </h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                {state.message || 'El enlace ha expirado o ya fue utilizado.'}
              </p>
            </div>
            <p className="text-gray-600 mb-6">
              Si necesita confirmar o reprogramar su entrevista, por favor contacte directamente a:
            </p>
            <a 
              href="mailto:admisiones@mtn.cl" 
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              admisiones@mtn.cl
            </a>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-gray-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Estado: {state.status ?? 'null'}
            </h1>
            <p className="text-gray-600">
              Estado no reconocido. Debug: status={state.status}, interviewId={state.interviewId}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ea] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
        {renderContent()}
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link 
            to="/apoderado/login" 
            className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir al portal del apoderado
          </Link>
        </div>
      </div>
    </div>
  );
}
