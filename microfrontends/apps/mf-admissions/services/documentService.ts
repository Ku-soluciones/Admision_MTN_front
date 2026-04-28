import api from './api';
import { 
  Document, 
  DocumentType,
  UploadDocumentRequest,
  UploadDocumentResponse,
  DocumentTypesResponse,
  DocumentUtils
} from '../types/document';

export interface DocumentUploadRequest {
    file: File;
    documentType: string;
    isRequired?: boolean;
}

export interface DocumentResponse {
    id: number;
    fileName: string;
    originalName: string;
    fileSize: number;
    contentType: string;
    documentType: string;
    isRequired: boolean;
    createdAt: string;
}

export interface UploadResponse {
    success: boolean;
    message: string;
    document?: DocumentResponse;
}

export const DOCUMENT_TYPES = {
    // Documentos obligatorios
    BIRTH_CERTIFICATE: 'Certificado de Nacimiento',
    GRADES_2023: 'Notas 2023',
    GRADES_2024: 'Notas 2024',
    GRADES_2025_SEMESTER_1: 'Notas 1er Semestre 2025',
    PERSONALITY_REPORT_2024: 'Informe de Personalidad 2024',
    PERSONALITY_REPORT_2025_SEMESTER_1: 'Informe de Personalidad 1er Semestre 2025',
    
    // Documentos opcionales
    STUDENT_PHOTO: 'Foto del Estudiante',
    BAPTISM_CERTIFICATE: 'Certificado de Bautismo',
    PREVIOUS_SCHOOL_REPORT: 'Informe Colegio Anterior',
    MEDICAL_CERTIFICATE: 'Certificado Médico',
    PSYCHOLOGICAL_REPORT: 'Informe Psicológico'
} as const;

export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

class DocumentService {
    
    async uploadDocument(applicationId: number, request: DocumentUploadRequest): Promise<UploadResponse> {
        try {
            // Validaciones del lado del cliente
            if (!request.file) {
                throw new Error('Debe seleccionar un archivo');
            }

            if (request.file.size > MAX_FILE_SIZE) {
                throw new Error('El archivo no puede exceder 10MB');
            }

            if (!ALLOWED_FILE_TYPES.includes(request.file.type)) {
                throw new Error('Solo se permiten archivos PDF, JPG y PNG');
            }

            console.log('📤 Subiendo documento:', {
                applicationId,
                fileName: request.file.name,
                fileSize: request.file.size,
                documentType: request.documentType
            });

            const formData = new FormData();
            formData.append('files', request.file); // Backend expects 'files' (array)
            formData.append('applicationId', String(applicationId));
            formData.append('documentType', request.documentType);

            const response = await api.post(`/v1/documents`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('✅ Documento subido exitosamente');
            return response.data;
            
        } catch (error: any) {
            console.error('❌ Error subiendo documento:', error);
            
            if (error.response?.status === 400) {
                const message = error.response?.data?.message || 'Archivo inválido';
                throw new Error(message);
            } else if (error.response?.status === 413) {
                throw new Error('El archivo es demasiado grande');
            } else if (error.response?.status === 500) {
                throw new Error('Error del servidor al subir el archivo');
            }
            
            throw new Error(error.message || 'Error al subir el documento');
        }
    }

    async replaceDocument(documentId: number, newFile: File): Promise<UploadResponse> {
        try {
            // Validaciones del lado del cliente
            if (!newFile) {
                throw new Error('Debe seleccionar un archivo');
            }

            if (newFile.size > MAX_FILE_SIZE) {
                throw new Error('El archivo no puede exceder 10MB');
            }

            if (!ALLOWED_FILE_TYPES.includes(newFile.type)) {
                throw new Error('Solo se permiten archivos PDF, JPG y PNG');
            }

            console.log('🔄 Reemplazando documento:', {
                documentId,
                fileName: newFile.name,
                fileSize: newFile.size
            });

            const formData = new FormData();
            formData.append('file', newFile);

            const response = await api.put(`/v1/documents/${documentId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('✅ Documento reemplazado exitosamente');
            return response.data;

        } catch (error: any) {
            console.error('❌ Error reemplazando documento:', error);

            if (error.response?.status === 400) {
                const message = error.response?.data?.message || 'Archivo inválido';
                throw new Error(message);
            } else if (error.response?.status === 404) {
                throw new Error('Documento no encontrado');
            } else if (error.response?.status === 413) {
                throw new Error('El archivo es demasiado grande');
            } else if (error.response?.status === 500) {
                throw new Error('Error del servidor al reemplazar el archivo');
            }

            throw new Error(error.message || 'Error al reemplazar el documento');
        }
    }

    async getDocumentsByApplication(applicationId: number): Promise<DocumentResponse[]> {
        try {
            console.log('📋 Obteniendo documentos para aplicación:', applicationId);
            
            const response = await api.get(`/v1/documents/application/${applicationId}`);
            return response.data;
            
        } catch (error: any) {
            console.error('❌ Error obteniendo documentos:', error);
            throw new Error('Error al obtener los documentos');
        }
    }

    async getMyDocuments(): Promise<DocumentResponse[]> {
        try {
            console.log('📋 Obteniendo mis documentos');
            
            const response = await api.get('/v1/documents/my-documents');
            return response.data;
            
        } catch (error: any) {
            console.error('❌ Error obteniendo mis documentos:', error);
            throw new Error('Error al obtener los documentos');
        }
    }

    async viewDocument(documentId: number): Promise<Blob> {
        try {
            console.log('👁️ Visualizando documento:', documentId);
            
            const response = await api.get(`/v1/documents/view/${documentId}`, {
                responseType: 'blob'
            });
            
            return response.data;
            
        } catch (error: any) {
            console.error('❌ Error visualizando documento:', error);
            throw new Error('Error al visualizar el documento');
        }
    }

    async downloadDocument(documentId: number, fileName: string): Promise<void> {
        try {
            console.log('💾 Descargando documento:', documentId);
            
            const response = await api.get(`/v1/documents/download/${documentId}`, {
                responseType: 'blob'
            });
            
            // Crear URL temporal para descargar
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
        } catch (error: any) {
            console.error('❌ Error descargando documento:', error);
            throw new Error('Error al descargar el documento');
        }
    }

    async deleteDocument(documentId: number): Promise<void> {
        try {
            console.log('🗑️ Eliminando documento:', documentId);

            await api.delete(`/v1/documents/${documentId}`);

            console.log('✅ Documento eliminado exitosamente');

        } catch (error: any) {
            console.error('❌ Error eliminando documento:', error);
            throw new Error('Error al eliminar el documento');
        }
    }

    async updateDocumentApproval(
        documentId: number,
        approvalStatus: 'APPROVED' | 'REJECTED' | 'PENDING',
        rejectionReason?: string
    ): Promise<DocumentResponse> {
        try {
            console.log('✅ Actualizando estado de aprobación:', {
                documentId,
                approvalStatus,
                rejectionReason
            });

            const response = await api.put(`/v1/documents/${documentId}/approval`, {
                approvalStatus,
                rejectionReason
            });

            console.log('✅ Estado de aprobación actualizado exitosamente');
            return response.data.data;

        } catch (error: any) {
            console.error('❌ Error actualizando estado de aprobación:', error);
            throw new Error('Error al actualizar el estado de aprobación del documento');
        }
    }

    getDocumentTypeLabel(type: string): string {
        return DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES] || type;
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    isImageFile(contentType: string): boolean {
        return contentType.startsWith('image/');
    }

    isPdfFile(contentType: string): boolean {
        return contentType === 'application/pdf';
    }

    // Nuevos métodos con tipos específicos
    async uploadDocumentWithTypes(request: UploadDocumentRequest): Promise<UploadDocumentResponse> {
        try {
            // Validar archivo antes de subir
            const validation = DocumentUtils.validateFile(request.file);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            const formData = new FormData();
            formData.append('file', request.file);
            formData.append('documentType', request.documentType);
            formData.append('isRequired', (request.isRequired || DocumentUtils.isRequired(request.documentType)).toString());

            const response = await api.post(`/documents/upload/${request.applicationId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;
        } catch (error: any) {
            console.error('Error uploading document:', error);
            throw new Error(
                error.response?.data?.message || 
                error.message || 
                'Error al subir el documento'
            );
        }
    }

    // Ver documento público (para desarrollo)
    getDocumentViewUrlPublic(documentId: number): string {
        return `${api.defaults.baseURL}/v1/documents/public/view/${documentId}`;
    }

    // Obtener tipos de documentos disponibles
    async getDocumentTypes(): Promise<DocumentTypesResponse> {
        try {
            const response = await api.get('/documents/public/types');
            return response.data;
        } catch (error) {
            console.error('Error getting document types:', error);
            throw error;
        }
    }

    // Verificar estado de documentos de una aplicación
    async getDocumentStatus(applicationId: number): Promise<{
        totalRequired: number;
        uploadedRequired: number;
        totalOptional: number;
        uploadedOptional: number;
        missingRequired: DocumentType[];
        isComplete: boolean;
    }> {
        try {
            const documents = await this.getDocumentsByApplication(applicationId);
            
            // Mapear DocumentResponse a Document para usar utilidades
            const mappedDocs: Document[] = documents.map(doc => ({
                ...doc,
                documentType: doc.documentType as DocumentType,
                updatedAt: undefined
            }));
            
            const missingRequired = DocumentUtils.getMissingRequiredDocuments(mappedDocs);
            const optionalPresent = DocumentUtils.getOptionalDocumentsPresent(mappedDocs);
            
            return {
                totalRequired: DocumentUtils.REQUIRED_DOCUMENTS.length,
                uploadedRequired: DocumentUtils.REQUIRED_DOCUMENTS.length - missingRequired.length,
                totalOptional: DocumentUtils.OPTIONAL_DOCUMENTS.length,
                uploadedOptional: optionalPresent.length,
                missingRequired,
                isComplete: missingRequired.length === 0
            };
        } catch (error) {
            console.error('Error getting document status:', error);
            throw error;
        }
    }

    // Validar documento antes de subir
    validateDocumentBeforeUpload(file: File, documentType: DocumentType): {
        isValid: boolean;
        error?: string;
        warnings?: string[];
    } {
        const warnings: string[] = [];
        
        // Validación básica del archivo
        const basicValidation = DocumentUtils.validateFile(file);
        if (!basicValidation.isValid) {
            return basicValidation;
        }

        // Validaciones específicas por tipo de documento
        if (documentType === DocumentType.STUDENT_PHOTO) {
            if (!file.type.startsWith('image/')) {
                return {
                    isValid: false,
                    error: 'La foto del estudiante debe ser una imagen (JPG, PNG)'
                };
            }
            
            if (file.size > 2 * 1024 * 1024) { // 2MB para fotos
                warnings.push('La foto es bastante grande. Se recomienda una imagen más pequeña para mejor rendimiento.');
            }
        }

        if ([DocumentType.GRADES_2023, DocumentType.GRADES_2024, DocumentType.GRADES_2025_SEMESTER_1].includes(documentType)) {
            if (file.type !== 'application/pdf') {
                warnings.push('Se recomienda que las notas estén en formato PDF para mejor legibilidad.');
            }
        }

        return {
            isValid: true,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    // Crear datos mock para desarrollo
    createMockDocuments(applicationId: number): Document[] {
        return [
            {
                id: 1,
                fileName: 'certificado_nacimiento_juan_perez.pdf',
                originalName: 'Certificado de Nacimiento - Juan Pérez.pdf',
                filePath: '/uploads/documents/cert_nacimiento_1.pdf',
                fileSize: 245760,
                contentType: 'application/pdf',
                documentType: DocumentType.BIRTH_CERTIFICATE,
                isRequired: true,
                createdAt: new Date().toISOString(),
                applicationId
            },
            {
                id: 2,
                fileName: 'notas_2024_juan_perez.pdf',
                originalName: 'Notas 2024 - Juan Pérez.pdf',
                filePath: '/uploads/documents/notas_2024_1.pdf',
                fileSize: 512000,
                contentType: 'application/pdf',
                documentType: DocumentType.GRADES_2024,
                isRequired: true,
                createdAt: new Date().toISOString(),
                applicationId
            },
            {
                id: 3,
                fileName: 'foto_juan_perez.jpg',
                originalName: 'Foto Juan Pérez.jpg',
                filePath: '/uploads/documents/foto_1.jpg',
                fileSize: 156780,
                contentType: 'image/jpeg',
                documentType: DocumentType.STUDENT_PHOTO,
                isRequired: false,
                createdAt: new Date().toISOString(),
                applicationId
            }
        ];
    }
}

export const documentService = new DocumentService();