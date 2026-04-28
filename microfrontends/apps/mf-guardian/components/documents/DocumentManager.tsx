import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import DocumentUploader from './DocumentUploader';
import {
  Document,
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  REQUIRED_DOCUMENTS,
  OPTIONAL_DOCUMENTS,
  DocumentUtils
} from '../../types/document';
import { documentService } from '../../services/documentService';
import { CheckCircleIcon, XCircleIcon, DocumentIcon, AlertTriangleIcon } from '../icons/Icons';

interface DocumentManagerProps {
  applicationId: number;
  disabled?: boolean;
  onDocumentChange?: (documents: Document[]) => void;
}

interface DocumentProgress {
  totalRequired: number;
  uploadedRequired: number;
  totalOptional: number;
  uploadedOptional: number;
  missingRequired: DocumentType[];
  isComplete: boolean;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({
  applicationId,
  disabled = false,
  onDocumentChange
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<DocumentProgress | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    required: true,
    optional: false
  });

  useEffect(() => {
    loadDocuments();
  }, [applicationId]);

  useEffect(() => {
    updateProgress();
    onDocumentChange?.(documents);
  }, [documents, onDocumentChange]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const docs = await documentService.getDocumentsByApplication(applicationId);
      const mappedDocs: Document[] = docs.map(doc => ({
        ...doc,
        documentType: doc.documentType as DocumentType,
        updatedAt: undefined
      }));
      
      setDocuments(mappedDocs);
    } catch (err: any) {
      setError(err.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async () => {
    try {
      const status = await documentService.getDocumentStatus(applicationId);
      setProgress(status);
    } catch (err) {
      console.error('Error updating document progress:', err);
    }
  };

  const handleDocumentUpload = (newDocument: Document) => {
    setDocuments(prev => {
      // Eliminar documento existente del mismo tipo si existe
      const filtered = prev.filter(doc => doc.documentType !== newDocument.documentType);
      return [...filtered, newDocument];
    });
  };

  const handleDocumentError = (error: string) => {
    setError(error);
    // Auto-clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      await documentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (err: any) {
      setError(err.message || 'Error al eliminar documento');
    }
  };

  const getExistingDocument = (documentType: DocumentType): Document | undefined => {
    return documents.find(doc => doc.documentType === documentType);
  };

  const renderProgressBar = () => {
    if (!progress) return null;

    const completionPercentage = progress.totalRequired > 0 
      ? (progress.uploadedRequired / progress.totalRequired) * 100 
      : 0;

    return (
      <Card className="p-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-azul-monte-tabor">Progreso de Documentación</h3>
            <Badge variant={progress.isComplete ? 'success' : 'warning'}>
              {progress.isComplete ? 'Completo' : 'Pendiente'}
            </Badge>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                progress.isComplete ? 'bg-green-500' : 'bg-azul-monte-tabor'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          
          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span>Requeridos: {progress.uploadedRequired}/{progress.totalRequired}</span>
            </div>
            <div className="flex items-center gap-2">
              <DocumentIcon className="w-4 h-4 text-blue-500" />
              <span>Opcionales: {progress.uploadedOptional}/{progress.totalOptional}</span>
            </div>
          </div>
          
          {/* Documentos faltantes */}
          {progress.missingRequired.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangleIcon className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Documentos requeridos pendientes:
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {progress.missingRequired.map(docType => (
                  <Badge key={docType} variant="warning" size="sm">
                    {DOCUMENT_TYPE_LABELS[docType]}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderDocumentSection = (
    title: string,
    documentTypes: DocumentType[],
    sectionKey: 'required' | 'optional'
  ) => {
    const isExpanded = expandedSections[sectionKey];
    const completedCount = documentTypes.filter(type => getExistingDocument(type)).length;

    return (
      <Card className="mb-4">
        <button
          className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:ring-inset"
          onClick={() => setExpandedSections(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
          }))}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-azul-monte-tabor">{title}</h3>
            <div className="flex items-center gap-3">
              <Badge variant={sectionKey === 'required' ? 'error' : 'info'}>
                {completedCount}/{documentTypes.length}
              </Badge>
              <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </div>
          </div>
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
            {documentTypes.map(documentType => (
              <DocumentUploader
                key={documentType}
                applicationId={applicationId}
                documentType={documentType}
                existingDocument={getExistingDocument(documentType)}
                onUploadSuccess={handleDocumentUpload}
                onUploadError={handleDocumentError}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Cargando documentos...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-azul-monte-tabor">
          Gestión de Documentos
        </h2>
        <Button
          variant="outline"
          onClick={loadDocuments}
          disabled={disabled}
        >
          🔄 Actualizar
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2">
            <XCircleIcon className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Instructions */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <DocumentIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Instrucciones para subir documentos:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Los documentos requeridos son obligatorios para completar la postulación</li>
              <li>Formatos permitidos: PDF, JPG, PNG (máximo 10MB)</li>
              <li>Puedes reemplazar documentos ya subidos haciendo clic en "Reemplazar"</li>
              <li>Los documentos opcionales pueden ayudar en el proceso de evaluación</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Required Documents */}
      {renderDocumentSection('Documentos Requeridos', REQUIRED_DOCUMENTS, 'required')}

      {/* Optional Documents */}
      {renderDocumentSection('Documentos Opcionales', OPTIONAL_DOCUMENTS, 'optional')}

      {/* Summary Footer */}
      {progress && (
        <Card className="p-4">
          <div className="text-center">
            {progress.isComplete ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <CheckCircleIcon className="w-6 h-6" />
                <span className="font-medium">
                  ¡Documentación completa! Todos los documentos requeridos han sido subidos.
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-orange-700">
                <AlertTriangleIcon className="w-6 h-6" />
                <span className="font-medium">
                  Faltan {progress.missingRequired.length} documento(s) requerido(s) para completar la postulación.
                </span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default DocumentManager;