/**
 * API Types Index - Auto-generated
 * Re-exports all generated API types for MTN Admission System
 * Generated at: 2025-01-31 19:47:00
 */

// Service Types
export * from './users.types';
export * from './applications.types';
export * from './evaluations.types';
export * from './interviews.types';
export * from './notifications.types';
export * from './files.types';
export * from './auth.types';
export * from './dashboard.types';
export * from './search.types';

// Service Clients
export * from './users.client';
export * from './applications.client';
export * from './evaluations.client';
export * from './dashboard.client';
export * from './search.client';

// Unified API Client
export * from './client';
export { default as apiClient } from './client';

// Common types used across services
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  correlationId?: string;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  sort?: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
}

// Common query parameters
export interface BaseSearchParams extends PaginationParams {
  query?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

// Common entity fields
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// HTTP Client response wrapper
export interface HttpResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  correlationId?: string;
}

// Error types for consistent error handling
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  rejectedValue?: any;
}

export interface BusinessError {
  type: 'BUSINESS_RULE_VIOLATION' | 'RESOURCE_NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN';
  message: string;
  details?: Record<string, any>;
}

export interface SystemError {
  type: 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'TIMEOUT' | 'NETWORK_ERROR';
  message: string;
  cause?: string;
  retryable: boolean;
}