/**
 * Document Gateway Service - Hybrid Monolith/Gateway Integration
 * Handles binary upload to monolith + metadata registration to gateway
 */

import httpClient from './http';
import { applicationWorkflowService } from './applicationWorkflowService';

export interface MonolithUploadResponse {
  externalId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadUrl: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  checksum?: string;
}

export interface DocumentUploadRequest {
  file: File;
  documentType: 'BIRTH_CERTIFICATE' | 'ACADEMIC_RECORD' | 'PHOTO' | 'MEDICAL_CERTIFICATE' | 'PSYCHOLOGICAL_REPORT' | 'OTHER';
  description?: string;
  applicationId: number;
  isRequired?: boolean;
}

export interface DocumentValidationResult {
  externalId: string;
  isValid: boolean;
  validationMessage?: string;
  validationDetails: Array<{
    rule: string;
    passed: boolean;
    message?: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
  }>;
  suggestedActions?: string[];
}

export interface DocumentMetadata {
  id: string;
  applicationId: number;
  externalId: string;
  documentType: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  uploadedAt: string;
  uploadedBy: number;
  validationStatus: 'PENDING' | 'VALID' | 'INVALID' | 'REQUIRES_REVIEW';
  validationMessage?: string;
  isRequired: boolean;
  downloadUrl?: string;
  thumbnailUrl?: string;
  expiresAt?: string;
}

class DocumentGatewayService {
  private readonly monolithBasePath = '/v1/documents'; // Direct to monolith
  private readonly gatewayBasePath = '/v1/applications'; // Through gateway

  /**
   * Complete document upload workflow:
   * 1. Upload binary to monolith → get external_id
   * 2. Register metadata to gateway with external_id
   */
  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentMetadata> {
    try {
      // Step 1: Upload binary to monolith
      const monolithResponse = await this.uploadToMonolith(request.file, {
        documentType: request.documentType,
        description: request.description
      });

      // Step 2: Register metadata in gateway
      const documentMetadata = await applicationWorkflowService.addDocumentMetadata(
        request.applicationId,
        {
          applicationId: request.applicationId,
          documentType: request.documentType,
          externalId: monolithResponse.externalId,
          fileName: monolithResponse.fileName,
          originalName: monolithResponse.originalName,
          fileSize: monolithResponse.fileSize,
          mimeType: monolithResponse.mimeType,
          uploadedBy: await this.getCurrentUserId(),
          notes: request.description
        }
      );

      // Step 3: Return combined metadata
      return {
        id: monolithResponse.externalId,
        applicationId: request.applicationId,
        externalId: monolithResponse.externalId,
        documentType: request.documentType,
        fileName: monolithResponse.fileName,
        originalName: monolithResponse.originalName,
        fileSize: monolithResponse.fileSize,
        mimeType: monolithResponse.mimeType,
        description: request.description,
        uploadedAt: monolithResponse.uploadedAt,
        uploadedBy: await this.getCurrentUserId(),
        validationStatus: 'PENDING',
        isRequired: request.isRequired || false,
        downloadUrl: monolithResponse.uploadUrl,
        thumbnailUrl: monolithResponse.thumbnailUrl
      };
    } catch (error: any) {
      // Enhanced error handling for hybrid architecture
      if (error.message?.includes('monolith')) {
        throw new Error(`Document upload failed at storage layer: ${error.message}`);
      } else if (error.message?.includes('gateway')) {
        // If metadata registration fails, we should clean up the monolith upload
        // This would require a cleanup endpoint in the monolith
        throw new Error(`Document registration failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Upload binary file to monolith
   * Returns external_id for gateway metadata registration
   */
  private async uploadToMonolith(
    file: File, 
    metadata: { documentType: string; description?: string }
  ): Promise<MonolithUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', metadata.documentType);
    if (metadata.description) {
      formData.append('description', metadata.description);
    }

    // Direct call to monolith (bypasses gateway for binary uploads)
    const response = await httpClient.post<{ data: MonolithUploadResponse }>(
      `${this.monolithBasePath}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Service-Route': 'monolith-direct' // Routing hint for gateway
        },
        timeout: 120000 // 2 minutes for large file uploads
      }
    );

    return response.data;
  }

  /**
   * Get document download URL from monolith using external_id
   */
  async getDocumentDownloadUrl(
    externalId: string, 
    options?: {
      downloadReason?: string;
      generateThumbnail?: boolean;
      expirationMinutes?: number;
    }
  ): Promise<{ downloadUrl: string; expiresAt: string; thumbnailUrl?: string }> {
    const response = await httpClient.post<{ 
      data: { downloadUrl: string; expiresAt: string; thumbnailUrl?: string }
    }>(
      `${this.monolithBasePath}/${externalId}/download-url`,
      {
        downloadReason: options?.downloadReason || 'VIEW',
        generateThumbnail: options?.generateThumbnail || false,
        expirationMinutes: options?.expirationMinutes || 60
      },
      {
        headers: {
          'X-Service-Route': 'monolith-direct'
        }
      }
    );

    return response.data;
  }

  /**
   * Delete document (removes from both monolith and gateway)
   */
  async deleteDocument(applicationId: number, documentId: string): Promise<void> {
    // Step 1: Get document metadata from gateway
    const documents = await applicationWorkflowService.getDocumentRequirements(applicationId);
    const document = documents.find(doc => doc.externalId === documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }

    try {
      // Step 2: Remove from gateway metadata
      await applicationWorkflowService.removeDocument(applicationId, documentId);
      
      // Step 3: Delete binary from monolith
      await httpClient.delete(`${this.monolithBasePath}/${documentId}`, {
        headers: {
          'X-Service-Route': 'monolith-direct'
        }
      });
    } catch (error: any) {
      // If gateway removal succeeded but monolith deletion failed,
      // log for manual cleanup but don't fail the operation
      if (error.status === 404) {
        console.warn(`Document ${documentId} not found in monolith, may have been already deleted`);
      } else {
        console.error(`Failed to delete document ${documentId} from monolith:`, error);
        // Re-add to gateway metadata since deletion failed
        // This would require a restore/rollback mechanism
        throw new Error('Document deletion partially failed, please contact support');
      }
    }
  }

  /**
   * Validate document using AI/ML services
   */
  async validateDocument(
    externalId: string,
    documentType: string,
    strictValidation: boolean = false
  ): Promise<DocumentValidationResult> {
    const response = await httpClient.post<{ data: DocumentValidationResult }>(
      `${this.monolithBasePath}/${externalId}/validate`,
      {
        documentType,
        strictValidation,
        validationRules: this.getValidationRules(documentType)
      },
      {
        headers: {
          'X-Service-Route': 'monolith-direct'
        }
      }
    );

    return response.data;
  }

  /**
   * Get validation rules for document type
   */
  private getValidationRules(documentType: string): string[] {
    const rules: Record<string, string[]> = {
      'BIRTH_CERTIFICATE': [
        'readable_text',
        'official_seal',
        'recent_issuance',
        'student_name_match'
      ],
      'ACADEMIC_RECORD': [
        'readable_text',
        'school_seal',
        'grade_completeness',
        'current_year'
      ],
      'PHOTO': [
        'face_visible',
        'appropriate_background',
        'high_resolution',
        'recent_photo'
      ],
      'MEDICAL_CERTIFICATE': [
        'readable_text',
        'doctor_signature',
        'recent_date',
        'complete_examination'
      ]
    };

    return rules[documentType] || ['readable_text', 'file_integrity'];
  }

  /**
   * Batch upload multiple documents
   */
  async batchUploadDocuments(
    requests: DocumentUploadRequest[]
  ): Promise<{
    successful: DocumentMetadata[];
    failed: Array<{
      request: DocumentUploadRequest;
      error: string;
    }>;
  }> {
    const results = await Promise.allSettled(
      requests.map(request => this.uploadDocument(request))
    );

    const successful: DocumentMetadata[] = [];
    const failed: Array<{ request: DocumentUploadRequest; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          request: requests[index],
          error: result.reason.message || 'Upload failed'
        });
      }
    });

    return { successful, failed };
  }

  /**
   * Get current user ID from token/session
   */
  private async getCurrentUserId(): Promise<number> {
    // This would typically extract from JWT token or session
    // For now, we'll make a call to get current user
    try {
      const profile = await httpClient.get<{ data: { id: number } }>('/v1/users/me');
      return profile.data.id;
    } catch {
      // Fallback - this should not happen in production
      throw new Error('Unable to identify current user for document upload');
    }
  }

  /**
   * Get upload progress (for large files)
   */
  async getUploadProgress(uploadId: string): Promise<{
    uploadId: string;
    progress: number;
    status: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    errorMessage?: string;
  }> {
    const response = await httpClient.get<{ 
      data: {
        uploadId: string;
        progress: number;
        status: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
        errorMessage?: string;
      }
    }>(
      `${this.monolithBasePath}/upload-progress/${uploadId}`,
      {
        headers: {
          'X-Service-Route': 'monolith-direct'
        }
      }
    );

    return response.data;
  }

  /**
   * Cancel ongoing upload
   */
  async cancelUpload(uploadId: string): Promise<void> {
    await httpClient.delete(`${this.monolithBasePath}/upload-progress/${uploadId}`, {
      headers: {
        'X-Service-Route': 'monolith-direct'
      }
    });
  }
}

// Export singleton instance
export const documentGatewayService = new DocumentGatewayService();
export default documentGatewayService;