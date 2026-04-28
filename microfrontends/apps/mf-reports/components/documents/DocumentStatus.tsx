import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS
} from '../../types/document';
import { documentService } from '../../services/documentService';
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, DocumentIcon } from '../icons/Icons';

interface DocumentStatusProps {
  applicationId: number;
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

interface DocumentProgress {
  totalRequired: number;
  uploadedRequired: number;
  totalOptional: number;
  uploadedOptional: number;
  missingRequired: DocumentType[];
  isComplete: boolean;
}

const DocumentStatus: React.FC<DocumentStatusProps> = ({
  applicationId,
  compact = false,
  showDetails = true,
  className = ''
}) => {
  const [progress, setProgress] = useState<DocumentProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocumentStatus();
  }, [applicationId]);

  const loadDocumentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await documentService.getDocumentStatus(applicationId);
      setProgress(status);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estado de documentos');
    } finally {
      setLoading(false);
    }
  };

  const getCompletionPercentage = (): number => {
    if (!progress || progress.totalRequired === 0) return 0;
    return (progress.uploadedRequired / progress.totalRequired) * 100;
  };

  const getStatusColor = (): string => {
    if (!progress) return 'text-gray-500';
    if (progress.isComplete) return 'text-green-600';
    if (progress.uploadedRequired > 0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (!progress) return <DocumentIcon className="w-5 h-5 text-gray-400" />;
    if (progress.isComplete) return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    if (progress.uploadedRequired > 0) return <AlertTriangleIcon className="w-5 h-5 text-orange-500" />;
    return <XCircleIcon className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = (): string => {
    if (!progress) return 'Cargando...';
    if (progress.isComplete) return 'Documentación completa';
    if (progress.uploadedRequired === 0) return 'Sin documentos subidos';
    return `${progress.missingRequired.length} documento(s) pendiente(s)`;
  };

  const renderCompactView = () => (
    <div className={`flex items-center gap-3 ${className}`}>
      {getStatusIcon()}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          <Badge variant={progress?.isComplete ? 'success' : 'warning'} size="sm">
            {progress ? `${progress.uploadedRequired}/${progress.totalRequired}` : '--'}
          </Badge>
        </div>
        {progress && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progress.isComplete ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderDetailedView = () => (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className="font-medium text-azul-monte-tabor">Estado de Documentos</h3>
          </div>
          <Badge variant={progress?.isComplete ? 'success' : 'warning'}>
            {progress?.isComplete ? 'Completo' : 'Pendiente'}
          </Badge>
        </div>

        {/* Progress Bar */}
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progreso</span>
              <span>{Math.round(getCompletionPercentage())}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  progress.isComplete ? 'bg-green-500' : 'bg-azul-monte-tabor'
                }`}
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Statistics */}
        {progress && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {progress.uploadedRequired}
              </div>
              <div className="text-sm text-green-700">Requeridos subidos</div>
              <div className="text-xs text-green-600">
                de {progress.totalRequired} necesarios
              </div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {progress.uploadedOptional}
              </div>
              <div className="text-sm text-blue-700">Opcionales subidos</div>
              <div className="text-xs text-blue-600">
                de {progress.totalOptional} disponibles
              </div>
            </div>
          </div>
        )}

        {/* Missing Documents */}
        {progress && progress.missingRequired.length > 0 && showDetails && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangleIcon className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                Documentos requeridos pendientes:
              </span>
            </div>
            <div className="space-y-1">
              {progress.missingRequired.map(docType => (
                <div key={docType} className="text-sm text-orange-700">
                  • {DOCUMENT_TYPE_LABELS[docType]}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {progress?.isComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                ¡Todos los documentos requeridos han sido subidos exitosamente!
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-600">Verificando documentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <XCircleIcon className="w-5 h-5 text-red-500" />
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  return compact ? renderCompactView() : renderDetailedView();
};

export default DocumentStatus;