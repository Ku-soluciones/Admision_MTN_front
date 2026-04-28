// Tipos específicos para documentos - correspondientes con la entidad backend

export interface Document {
  id: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  documentType: DocumentType;
  isRequired: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Relación con aplicación (opcional para responses)
  applicationId?: number;
}

// Enum que corresponde exactamente con el backend
export enum DocumentType {
  // Documentos obligatorios
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  GRADES_2023 = 'GRADES_2023',
  GRADES_2024 = 'GRADES_2024',
  GRADES_2025_SEMESTER_1 = 'GRADES_2025_SEMESTER_1',
  PERSONALITY_REPORT_2024 = 'PERSONALITY_REPORT_2024',
  PERSONALITY_REPORT_2025_SEMESTER_1 = 'PERSONALITY_REPORT_2025_SEMESTER_1',
  
  // Documentos opcionales
  STUDENT_PHOTO = 'STUDENT_PHOTO',
  BAPTISM_CERTIFICATE = 'BAPTISM_CERTIFICATE',
  PREVIOUS_SCHOOL_REPORT = 'PREVIOUS_SCHOOL_REPORT',
  MEDICAL_CERTIFICATE = 'MEDICAL_CERTIFICATE',
  PSYCHOLOGICAL_REPORT = 'PSYCHOLOGICAL_REPORT'
}

// Labels para mostrar en la UI
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.BIRTH_CERTIFICATE]: 'Certificado de Nacimiento',
  [DocumentType.GRADES_2023]: 'Notas 2023',
  [DocumentType.GRADES_2024]: 'Notas 2024',
  [DocumentType.GRADES_2025_SEMESTER_1]: 'Notas 2025 - Primer Semestre',
  [DocumentType.PERSONALITY_REPORT_2024]: 'Informe de Personalidad 2024',
  [DocumentType.PERSONALITY_REPORT_2025_SEMESTER_1]: 'Informe de Personalidad 2025 - Primer Semestre',
  [DocumentType.STUDENT_PHOTO]: 'Foto del Estudiante',
  [DocumentType.BAPTISM_CERTIFICATE]: 'Certificado de Bautismo',
  [DocumentType.PREVIOUS_SCHOOL_REPORT]: 'Informe Colegio Anterior',
  [DocumentType.MEDICAL_CERTIFICATE]: 'Certificado Médico',
  [DocumentType.PSYCHOLOGICAL_REPORT]: 'Informe Psicológico'
};

// Descripción de cada tipo de documento
export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  [DocumentType.BIRTH_CERTIFICATE]: 'Certificado de nacimiento del estudiante emitido por el Registro Civil',
  [DocumentType.GRADES_2023]: 'Certificado de notas del año escolar 2023',
  [DocumentType.GRADES_2024]: 'Certificado de notas del año escolar 2024',
  [DocumentType.GRADES_2025_SEMESTER_1]: 'Certificado de notas del primer semestre 2025',
  [DocumentType.PERSONALITY_REPORT_2024]: 'Informe de desarrollo personal y social del año 2024',
  [DocumentType.PERSONALITY_REPORT_2025_SEMESTER_1]: 'Informe de desarrollo personal y social del primer semestre 2025',
  [DocumentType.STUDENT_PHOTO]: 'Fotografía reciente del estudiante (tamaño carnet)',
  [DocumentType.BAPTISM_CERTIFICATE]: 'Certificado de bautismo (opcional para familias católicas)',
  [DocumentType.PREVIOUS_SCHOOL_REPORT]: 'Informe de conducta y rendimiento del colegio anterior',
  [DocumentType.MEDICAL_CERTIFICATE]: 'Certificado médico que acredite el estado de salud del estudiante',
  [DocumentType.PSYCHOLOGICAL_REPORT]: 'Evaluación psicológica del estudiante (si corresponde)'
};

// Clasificación de documentos requeridos vs opcionales
export const REQUIRED_DOCUMENTS: DocumentType[] = [
  DocumentType.BIRTH_CERTIFICATE,
  DocumentType.GRADES_2023,
  DocumentType.GRADES_2024,
  DocumentType.GRADES_2025_SEMESTER_1
];

export const OPTIONAL_DOCUMENTS: DocumentType[] = [
  DocumentType.PERSONALITY_REPORT_2024,
  DocumentType.PERSONALITY_REPORT_2025_SEMESTER_1,
  DocumentType.STUDENT_PHOTO,
  DocumentType.BAPTISM_CERTIFICATE,
  DocumentType.PREVIOUS_SCHOOL_REPORT,
  DocumentType.MEDICAL_CERTIFICATE,
  DocumentType.PSYCHOLOGICAL_REPORT
];

// Formatos de archivo permitidos
export const ALLOWED_FILE_FORMATS = {
  PDF: 'application/pdf',
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
  PNG: 'image/png'
} as const;

export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'] as const;

// Tamaño máximo de archivo (10MB en bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Interface para subir documentos
export interface UploadDocumentRequest {
  file: File;
  documentType: DocumentType;
  isRequired?: boolean;
  applicationId: number;
}

// Interface para la respuesta de subida
export interface UploadDocumentResponse {
  success: boolean;
  message: string;
  document?: Document;
}

// Interface para obtener tipos de documentos
export interface DocumentTypesResponse {
  documentTypes: DocumentType[];
  allowedFormats: string[];
  maxFileSize: string;
}

// Estados de carga de documentos
export enum UploadStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

// Interface para el estado de carga
export interface DocumentUploadState {
  status: UploadStatus;
  progress: number;
  error?: string;
  document?: Document;
}

// Funciones de utilidad
export const DocumentUtils = {
  // Verificar si es un documento requerido
  isRequired: (documentType: DocumentType): boolean => {
    return REQUIRED_DOCUMENTS.includes(documentType);
  },

  // Verificar si el formato de archivo es válido
  isValidFileFormat: (file: File): boolean => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension ? ALLOWED_FILE_EXTENSIONS.includes(extension as any) : false;
  },

  // Verificar si el tamaño del archivo es válido
  isValidFileSize: (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  },

  // Obtener el icono apropiado para el tipo de archivo
  getFileIcon: (contentType: string): string => {
    if (contentType.startsWith('image/')) {
      return '🖼️';
    } else if (contentType === 'application/pdf') {
      return '📄';
    }
    return '📎';
  },

  // Formatear el tamaño del archivo
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Obtener la extensión del archivo
  getFileExtension: (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  },

  // Validar archivo completo
  validateFile: (file: File): { isValid: boolean; error?: string } => {
    if (!DocumentUtils.isValidFileFormat(file)) {
      return {
        isValid: false,
        error: `Formato de archivo no válido. Formatos permitidos: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`
      };
    }

    if (!DocumentUtils.isValidFileSize(file)) {
      return {
        isValid: false,
        error: `El archivo es demasiado grande. Tamaño máximo: ${DocumentUtils.formatFileSize(MAX_FILE_SIZE)}`
      };
    }

    return { isValid: true };
  },

  // Obtener el color del badge según el tipo de documento
  getDocumentTypeColor: (documentType: DocumentType): 'success' | 'warning' | 'info' | 'error' => {
    if (REQUIRED_DOCUMENTS.includes(documentType)) {
      return 'error'; // Rojo para documentos requeridos
    }
    return 'info'; // Azul para documentos opcionales
  },

  // Verificar si todos los documentos requeridos están presentes
  areAllRequiredDocumentsPresent: (documents: Document[]): boolean => {
    const presentTypes = documents.map(doc => doc.documentType);
    return REQUIRED_DOCUMENTS.every(reqType => presentTypes.includes(reqType));
  },

  // Obtener documentos faltantes
  getMissingRequiredDocuments: (documents: Document[]): DocumentType[] => {
    const presentTypes = documents.map(doc => doc.documentType);
    return REQUIRED_DOCUMENTS.filter(reqType => !presentTypes.includes(reqType));
  },

  // Obtener documentos opcionales presentes
  getOptionalDocumentsPresent: (documents: Document[]): DocumentType[] => {
    const presentTypes = documents.map(doc => doc.documentType);
    return OPTIONAL_DOCUMENTS.filter(optType => presentTypes.includes(optType));
  }
};

// Constantes para validación
export const VALIDATION_MESSAGES = {
  REQUIRED_DOCUMENT: 'Este documento es obligatorio',
  INVALID_FORMAT: 'Formato de archivo no válido',
  FILE_TOO_LARGE: 'El archivo es demasiado grande',
  UPLOAD_ERROR: 'Error al subir el archivo',
  UPLOAD_SUCCESS: 'Archivo subido exitosamente',
  DELETE_SUCCESS: 'Documento eliminado exitosamente',
  DELETE_ERROR: 'Error al eliminar el documento'
} as const;