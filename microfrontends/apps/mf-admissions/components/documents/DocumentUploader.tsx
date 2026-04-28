import React, { useState, useRef, useCallback } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  Document, 
  DocumentType, 
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  DocumentUtils,
  UploadStatus,
  DocumentUploadState,
  VALIDATION_MESSAGES
} from '../../types/document';
import { documentService } from '../../services/documentService';
import { UploadIcon, FileTextIcon, CheckCircleIcon, XCircleIcon } from '../icons/Icons';

interface DocumentUploaderProps {
  applicationId: number;
  documentType: DocumentType;
  existingDocument?: Document;
  onUploadSuccess: (document: Document) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  applicationId,
  documentType,
  existingDocument,
  onUploadSuccess,
  onUploadError,
  disabled = false
}) => {
  const [uploadState, setUploadState] = useState<DocumentUploadState>({
    status: UploadStatus.IDLE,
    progress: 0
  });
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRequired = DocumentUtils.isRequired(documentType);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [disabled]);

  const handleFileSelect = (file: File) => {
    if (disabled) return;

    const validation = documentService.validateDocumentBeforeUpload(file, documentType);
    
    if (!validation.isValid) {
      onUploadError(validation.error || 'Archivo inválido');
      return;
    }

    setSelectedFile(file);
    setValidationWarnings(validation.warnings || []);
    setUploadState({
      status: UploadStatus.IDLE,
      progress: 0
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || disabled) return;

    setUploadState({
      status: UploadStatus.UPLOADING,
      progress: 0
    });

    try {
      const response = await documentService.uploadDocumentWithTypes({
        file: selectedFile,
        documentType,
        applicationId,
        isRequired
      });

      if (response.success && response.document) {
        setUploadState({
          status: UploadStatus.SUCCESS,
          progress: 100,
          document: response.document
        });
        
        onUploadSuccess(response.document);
        setSelectedFile(null);
        setValidationWarnings([]);
      } else {
        throw new Error(response.message || 'Error en la respuesta del servidor');
      }
    } catch (error: any) {
      setUploadState({
        status: UploadStatus.ERROR,
        progress: 0,
        error: error.message
      });
      
      onUploadError(error.message);
    }
  };

  const handleReplace = async () => {
    if (!selectedFile || !existingDocument || disabled) return;

    setUploadState({
      status: UploadStatus.UPLOADING,
      progress: 0
    });

    try {
      // Eliminar documento existente y subir nuevo
      await documentService.deleteDocument(existingDocument.id);
      
      const response = await documentService.uploadDocumentWithTypes({
        file: selectedFile,
        documentType,
        applicationId,
        isRequired
      });

      if (response.success && response.document) {
        setUploadState({
          status: UploadStatus.SUCCESS,
          progress: 100,
          document: response.document
        });
        
        onUploadSuccess(response.document);
        setSelectedFile(null);
        setValidationWarnings([]);
      } else {
        throw new Error(response.message || 'Error en la respuesta del servidor');
      }
    } catch (error: any) {
      setUploadState({
        status: UploadStatus.ERROR,
        progress: 0,
        error: error.message
      });
      
      onUploadError(error.message);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setValidationWarnings([]);
    setUploadState({
      status: UploadStatus.IDLE,
      progress: 0
    });
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case UploadStatus.SUCCESS:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case UploadStatus.ERROR:
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case UploadStatus.UPLOADING:
        return <LoadingSpinner size="sm" />;
      default:
        return <UploadIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (existingDocument) return 'border-green-200 bg-green-50';
    if (uploadState.status === UploadStatus.ERROR) return 'border-red-200 bg-red-50';
    if (uploadState.status === UploadStatus.SUCCESS) return 'border-green-200 bg-green-50';
    if (dragActive) return 'border-azul-monte-tabor bg-blue-50';
    return 'border-gray-200 hover:border-gray-300';
  };

  return (
    <Card className={`p-6 transition-colors ${getStatusColor()} ${disabled ? 'opacity-50' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-azul-monte-tabor">
                {DOCUMENT_TYPE_LABELS[documentType]}
              </h3>
              <Badge variant={isRequired ? 'error' : 'info'}>
                {isRequired ? 'Requerido' : 'Opcional'}
              </Badge>
              {existingDocument && (
                <Badge variant="success">
                  ✓ Subido
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {DOCUMENT_TYPE_DESCRIPTIONS[documentType]}
            </p>
          </div>
          {getStatusIcon()}
        </div>

        {/* Existing Document Display */}
        {existingDocument && (
          <div className="p-3 bg-white rounded border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileTextIcon className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">{existingDocument.originalName}</p>
                  <p className="text-xs text-gray-500">
                    {DocumentUtils.formatFileSize(existingDocument.fileSize)} • 
                    Subido el {new Date(existingDocument.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(documentService.getDocumentViewUrlPublic(existingDocument.id), '_blank')}
                >
                  Ver
                </Button>
                {!disabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openFileDialog}
                  >
                    Reemplazar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* File Drop Zone (solo si no hay documento existente o se está reemplazando) */}
        {(!existingDocument || selectedFile) && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-azul-monte-tabor bg-blue-50' : 'border-gray-300'
            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              disabled={disabled}
            />
            
            {uploadState.status === UploadStatus.UPLOADING ? (
              <div className="space-y-2">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-gray-600">Subiendo archivo...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-azul-monte-tabor h-2 rounded-full transition-all"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            ) : selectedFile ? (
              <div className="space-y-3">
                <FileTextIcon className="w-12 h-12 text-azul-monte-tabor mx-auto" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {DocumentUtils.formatFileSize(selectedFile.size)}
                  </p>
                </div>
                
                {/* Warnings */}
                {validationWarnings.length > 0 && (
                  <div className="text-left">
                    {validationWarnings.map((warning, index) => (
                      <p key={index} className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        ⚠️ {warning}
                      </p>
                    ))}
                  </div>
                )}
                
                <div className="flex space-x-2 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={uploadState.status === UploadStatus.UPLOADING}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={existingDocument ? handleReplace : handleUpload}
                    disabled={uploadState.status === UploadStatus.UPLOADING}
                  >
                    {existingDocument ? 'Reemplazar' : 'Subir'} Archivo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadIcon className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Arrastra tu archivo aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos: PDF, JPG, PNG • Máximo: 10MB
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {uploadState.status === UploadStatus.ERROR && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700">
              ❌ {uploadState.error || VALIDATION_MESSAGES.UPLOAD_ERROR}
            </p>
          </div>
        )}

        {/* Success Display */}
        {uploadState.status === UploadStatus.SUCCESS && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-700">
              ✅ {VALIDATION_MESSAGES.UPLOAD_SUCCESS}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default DocumentUploader;