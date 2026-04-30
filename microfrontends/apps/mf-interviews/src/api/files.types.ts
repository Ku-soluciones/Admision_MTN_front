/**
 * TypeScript types for FILES Service
 * Generated for MTN Admission System
 */

export interface FilesResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface FileUpload {
  id: number;
  applicationId?: number;
  userId?: number;
  fileName: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  size: number;
  type: 'BIRTH_CERTIFICATE' | 'ACADEMIC_RECORD' | 'PHOTO' | 'MEDICAL_CERTIFICATE' | 'PSYCHOLOGICAL_REPORT' | 'RECOMMENDATION_LETTER' | 'OTHER';
  status: 'UPLOADED' | 'PROCESSING' | 'VALIDATED' | 'REJECTED' | 'ARCHIVED';
  validationStatus?: 'PENDING' | 'VALID' | 'INVALID';
  validationMessage?: string;
  checksum?: string;
  uploadedAt: string;
  validatedAt?: string;
  expiresAt?: string;
  downloadCount: number;
  lastDownloadAt?: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  description?: string;
  tags?: string[];
  isRequired?: boolean;
  isConfidential?: boolean;
  retentionDays?: number;
  uploadedBy?: string;
  validatedBy?: string;
  version?: number;
  parentFileId?: number;
}

export interface UploadFileRequest {
  applicationId?: number;
  userId?: number;
  type: FileUpload['type'];
  description?: string;
  tags?: string[];
  isRequired?: boolean;
  isConfidential?: boolean;
}

export interface UpdateFileRequest {
  fileName?: string;
  type?: FileUpload['type'];
  status?: FileUpload['status'];
  validationStatus?: FileUpload['validationStatus'];
  validationMessage?: string;
  metadata?: Partial<FileMetadata>;
}

export interface FileSearchParams {
  applicationId?: number;
  userId?: number;
  type?: FileUpload['type'];
  status?: FileUpload['status'];
  validationStatus?: FileUpload['validationStatus'];
  fileName?: string;
  mimeType?: string;
  uploadedFrom?: string;
  uploadedTo?: string;
  sizeMin?: number;
  sizeMax?: number;
  tags?: string[];
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface FileValidationResult {
  fileId: number;
  isValid: boolean;
  validationMessage?: string;
  validationDetails?: ValidationDetail[];
  score?: number;
  suggestions?: string[];
}

export interface ValidationDetail {
  field: string;
  rule: string;
  passed: boolean;
  message?: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
}

export interface FileStatistics {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  filesByStatus: Record<string, number>;
  uploadsByMonth: Record<string, number>;
  averageFileSize: number;
  validationSuccessRate: number;
}

export interface FileBatch {
  id: string;
  applicationId?: number;
  userId: number;
  fileIds: number[];
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface FilePreview {
  fileId: number;
  previewType: 'THUMBNAIL' | 'PDF_FIRST_PAGE' | 'TEXT_EXCERPT' | 'IMAGE_PREVIEW';
  previewUrl: string;
  previewData?: string;
  generatedAt: string;
  expiresAt: string;
}

export interface FileDownloadRequest {
  fileId: number;
  downloadReason?: string;
  generatePreview?: boolean;
}

export interface FileDownloadResponse {
  downloadUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
  expiresAt: string;
  requiresAuth: boolean;
}