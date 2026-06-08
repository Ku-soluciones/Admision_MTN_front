// Exportaciones principales del sistema de documentos
export { default as DocumentUploader } from './DocumentUploader';
export { default as DocumentManager } from './DocumentManager';
export { default as DocumentStatus } from './DocumentStatus';

// Re-exportar tipos y utilidades relacionadas
export type {
  Document,
  DocumentType,
  UploadDocumentRequest,
  UploadDocumentResponse,
  DocumentTypesResponse,
  UploadStatus,
  DocumentUploadState
} from '../../types/document';

export {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  REQUIRED_DOCUMENTS,
  OPTIONAL_DOCUMENTS,
  DocumentUtils,
  VALIDATION_MESSAGES
} from '../../types/document';

// Re-exportar servicio de documentos
export { documentService } from '../../services/documentService';