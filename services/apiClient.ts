/**
 * API Client - Wrapper simplificado para operaciones comunes
 * Cliente HTTP con métodos de conveniencia para el Sistema de Admisión MTN
 */

import httpClient, { HttpError } from './http';

/**
 * Tipos de respuesta de la API
 */
interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  correlationId?: string;
}

interface PaginatedResponse<T = any> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

/**
 * Parámetros de paginación
 */
interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

/**
 * Cliente API con métodos de conveniencia
 */
class ApiClient {
  
  // ============= AUTHENTICATION =============
  
  /**
   * Verificar estado de autenticación
   */
  async checkAuth(): Promise<boolean> {
    try {
      await httpClient.get('/v1/auth/check');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtener perfil del usuario actual
   */
  async getCurrentUser(): Promise<any> {
    return httpClient.get('/v1/auth/me');
  }

  // ============= USERS =============
  
  /**
   * Obtener usuarios con paginación
   */
  async getUsers(params?: PaginationParams): Promise<PaginatedResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page !== undefined) queryParams.set('page', params.page.toString());
    if (params?.size !== undefined) queryParams.set('size', params.size.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.direction) queryParams.set('direction', params.direction);
    
    const url = `/v1/users${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return httpClient.get(url);
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(id: number): Promise<any> {
    return httpClient.get(`/v1/users/${id}`);
  }

  /**
   * Crear nuevo usuario
   */
  async createUser(userData: any): Promise<any> {
    return httpClient.post('/v1/users', userData);
  }

  /**
   * Actualizar usuario existente
   */
  async updateUser(id: number, userData: any): Promise<any> {
    return httpClient.put(`/v1/users/${id}`, userData);
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(id: number): Promise<void> {
    return httpClient.delete(`/v1/users/${id}`);
  }

  // ============= APPLICATIONS =============
  
  /**
   * Obtener aplicaciones con paginación
   */
  async getApplications(params?: PaginationParams & { status?: string }): Promise<PaginatedResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page !== undefined) queryParams.set('page', params.page.toString());
    if (params?.size !== undefined) queryParams.set('size', params.size.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.direction) queryParams.set('direction', params.direction);
    if (params?.status) queryParams.set('status', params.status);
    
    const url = `/v1/applications${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return httpClient.get(url);
  }

  /**
   * Obtener aplicación por ID
   */
  async getApplicationById(id: number): Promise<any> {
    return httpClient.get(`/v1/applications/${id}`);
  }

  /**
   * Crear nueva aplicación
   */
  async createApplication(applicationData: any): Promise<any> {
    return httpClient.post('/v1/applications', applicationData);
  }

  /**
   * Actualizar aplicación
   */
  async updateApplication(id: number, applicationData: any): Promise<any> {
    return httpClient.put(`/v1/applications/${id}`, applicationData);
  }

  /**
   * Cambiar estado de aplicación
   */
  async changeApplicationStatus(id: number, status: string, reason?: string): Promise<any> {
    return httpClient.patch(`/v1/applications/${id}/status`, { status, reason });
  }

  /**
   * Archivar aplicación
   */
  async archiveApplication(id: number): Promise<void> {
    return httpClient.put(`/v1/applications/${id}/archive`);
  }

  // ============= EVALUATIONS =============
  
  /**
   * Obtener evaluaciones
   */
  async getEvaluations(params?: PaginationParams): Promise<PaginatedResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page !== undefined) queryParams.set('page', params.page.toString());
    if (params?.size !== undefined) queryParams.set('size', params.size.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.direction) queryParams.set('direction', params.direction);
    
    const url = `/v1/evaluations${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return httpClient.get(url);
  }

  /**
   * Crear evaluación
   */
  async createEvaluation(evaluationData: any): Promise<any> {
    return httpClient.post('/v1/evaluations', evaluationData);
  }

  /**
   * Actualizar evaluación
   */
  async updateEvaluation(id: number, evaluationData: any): Promise<any> {
    return httpClient.put(`/v1/evaluations/${id}`, evaluationData);
  }

  // ============= INTERVIEWS =============
  
  /**
   * Obtener entrevistas
   */
  async getInterviews(params?: PaginationParams): Promise<PaginatedResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page !== undefined) queryParams.set('page', params.page.toString());
    if (params?.size !== undefined) queryParams.set('size', params.size.toString());
    if (params?.sort) queryParams.set('sort', params.sort);
    if (params?.direction) queryParams.set('direction', params.direction);
    
    const url = `/v1/interviews${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return httpClient.get(url);
  }

  /**
   * Programar entrevista
   */
  async scheduleInterview(interviewData: any): Promise<any> {
    return httpClient.post('/v1/interviews', interviewData);
  }

  /**
   * Actualizar entrevista
   */
  async updateInterview(id: number, interviewData: any): Promise<any> {
    return httpClient.put(`/v1/interviews/${id}`, interviewData);
  }

  // ============= FILE UPLOADS =============
  
  /**
   * Subir archivo
   */
  async uploadFile(file: File, type: string, applicationId?: number): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (applicationId) formData.append('applicationId', applicationId.toString());
    
    return httpClient.post('/v1/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Descargar archivo
   */
  async downloadFile(fileId: number): Promise<Blob> {
    return httpClient.get(`/v1/files/${fileId}/download`, {
      responseType: 'blob',
    });
  }

  // ============= STATISTICS =============
  
  /**
   * Obtener estadísticas del dashboard
   */
  async getDashboardStats(): Promise<any> {
    return httpClient.get('/v1/dashboard/stats');
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats(): Promise<any> {
    return httpClient.get('/v1/dashboard/users/stats');
  }

  /**
   * Obtener estadísticas de aplicaciones
   */
  async getApplicationStats(): Promise<any> {
    return httpClient.get('/v1/dashboard/applications/stats');
  }

  // ============= UTILITIES =============
  
  /**
   * Validar RUT chileno
   */
  async validateRut(rut: string): Promise<{ valid: boolean; formatted?: string }> {
    return httpClient.post('/v1/utils/validate-rut', { rut });
  }

  /**
   * Health check de la API
   */
  async healthCheck(): Promise<boolean> {
    return httpClient.healthCheck();
  }

  /**
   * Obtener información del sistema
   */
  async getSystemInfo(): Promise<any> {
    return httpClient.get('/actuator/info');
  }

  // ============= ERROR HANDLING =============
  
  /**
   * Manejar errores de manera consistente
   */
  handleError(error: any): string {
    if (error instanceof Error) {
      // Es un HttpError de nuestro cliente
      const httpError = error as HttpError;
      
      switch (httpError.status) {
        case 400:
          return 'Datos inválidos. Por favor revisa la información ingresada.';
        case 401:
          return 'Sesión expirada. Por favor inicia sesión nuevamente.';
        case 403:
          return 'No tienes permisos para realizar esta acción.';
        case 404:
          return 'El recurso solicitado no fue encontrado.';
        case 409:
          return 'El recurso ya existe o hay un conflicto.';
        case 429:
          return 'Demasiadas peticiones. Por favor intenta más tarde.';
        case 500:
          return 'Error interno del servidor. Por favor contacta soporte.';
        case 502:
        case 503:
        case 504:
          return 'Servicio temporalmente no disponible. Intenta nuevamente.';
        default:
          return httpError.message || 'Error desconocido en la comunicación con el servidor.';
      }
    }
    
    return 'Error de conexión. Verifica tu conexión a internet.';
  }
}

// Instancia singleton
const apiClient = new ApiClient();

export default apiClient;
export { 
  ApiClient,
  type ApiResponse, 
  type PaginatedResponse, 
  type PaginationParams 
};