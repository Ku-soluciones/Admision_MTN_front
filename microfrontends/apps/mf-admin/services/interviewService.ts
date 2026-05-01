import api from './api';
import axios, { AxiosInstance } from 'axios';
import { getApiBaseUrl } from '../config/api.config';

// Create a clean axios instance WITHOUT interceptors for interview deletion
const cleanAxios: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});
import {
  Interview,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  InterviewResult,
  InterviewFilters,
  InterviewStats,
  CreateInterviewRequest,
  UpdateInterviewRequest,
  CompleteInterviewRequest
} from '../types/interview';

export interface InterviewResponse {
  id: number;
  applicationId: number;
  studentName: string;
  parentNames: string;
  gradeApplied: string;
  interviewerId: number;
  interviewerName: string;
  status: InterviewStatus;
  type: InterviewType;
  mode: InterviewMode;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  location?: string;
  virtualMeetingLink?: string;
  notes?: string;
  preparation?: string;
  result?: InterviewResult;
  score?: number;
  recommendations?: string;
  followUpRequired: boolean;
  followUpNotes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  isUpcoming: boolean;
  isOverdue: boolean;
  canBeCompleted: boolean;
  canBeEdited: boolean;
  canBeCancelled: boolean;
}

export interface PaginatedInterviewResponse {
  content: InterviewResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

class InterviewService {
  private baseUrl = '/v1/interviews';

  // Convertir response del backend a formato frontend
  private mapInterviewResponse(response: InterviewResponse): Interview {
    return {
      id: response.id,
      applicationId: response.applicationId,
      studentName: response.studentName,
      parentNames: response.parentNames,
      gradeApplied: response.gradeApplied,
      interviewerId: response.interviewerId,
      interviewerName: response.interviewerName,
      secondInterviewerId: response.secondInterviewerId,
      secondInterviewerName: response.secondInterviewerName,
      status: response.status,
      type: response.interviewType || response.type || InterviewType.INDIVIDUAL,
      mode: response.mode,
      scheduledDate: response.scheduledDate,
      scheduledTime: response.scheduledTime,
      duration: response.duration,
      location: response.location,
      virtualMeetingLink: response.virtualMeetingLink,
      notes: response.notes,
      preparation: response.preparation,
      result: response.result,
      score: response.score,
      recommendations: response.recommendations,
      followUpRequired: response.followUpRequired,
      followUpNotes: response.followUpNotes,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
      completedAt: response.completedAt,
      isUpcoming: response.isUpcoming,
      isOverdue: response.isOverdue,
      canBeCompleted: response.canBeCompleted,
      canBeEdited: response.canBeEdited,
      canBeCancelled: response.canBeCancelled
    };
  }

  // Convertir response simple del backend a formato frontend
  private mapBackendResponse(backendData: any): Interview {
    // Guardar la fecha/hora completa original
    const fullScheduledDateTime = backendData.scheduledDate || '';

    // Extraer fecha y hora por separado para compatibilidad
    const scheduledDate = backendData.scheduledDate ? backendData.scheduledDate.split('T')[0] : '';
    // FIX: Usar scheduledTime del backend directamente (ya viene en formato HH:MM:SS o HH:MM)
    // No extraer de scheduledDate porque new Date() causa conversión de zona horaria
    const scheduledTime = backendData.scheduledTime
      ? (backendData.scheduledTime.length > 5 ? backendData.scheduledTime.substring(0, 5) : backendData.scheduledTime)
      : this.extractTimeFromDate(backendData.scheduledDate);

    return {
      id: parseInt(backendData.id) || 0,
      applicationId: parseInt(backendData.applicationId) || 0,
      studentName: backendData.studentName || 'Sin nombre',
      parentNames: backendData.parentNames || 'Sin información de padres',
      gradeApplied: backendData.gradeApplied || backendData.grade || 'Sin especificar',
      interviewerId: parseInt(backendData.interviewerId) || 0,
      interviewerName: backendData.interviewerName || 'Sin asignar',
      secondInterviewerId: backendData.secondInterviewerId ? parseInt(backendData.secondInterviewerId) : undefined,
      secondInterviewerName: backendData.secondInterviewerName || undefined,
      status: backendData.status || InterviewStatus.SCHEDULED,
      type: backendData.interviewType || InterviewType.INDIVIDUAL,
      mode: backendData.mode || InterviewMode.IN_PERSON,
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      // Agregar campo con fecha/hora completa para mostrar correctamente
      fullScheduledDateTime: fullScheduledDateTime,
      duration: backendData.duration || 60,
      location: backendData.location || '',
      virtualMeetingLink: backendData.virtualMeetingLink || '',
      notes: backendData.notes || '',
      preparation: backendData.preparation || '',
      result: backendData.result,
      score: backendData.score,
      recommendations: backendData.recommendations || '',
      followUpRequired: backendData.followUpRequired || false,
      followUpNotes: backendData.followUpNotes || '',
      createdAt: backendData.createdAt || '',
      updatedAt: backendData.updatedAt || '',
      completedAt: backendData.completedAt,
      isUpcoming: this.isUpcomingInterview(backendData.scheduledDate, backendData.status),
      isOverdue: this.isOverdueInterview(backendData.scheduledDate, backendData.status),
      canBeCompleted: this.canBeCompleted(backendData.status),
      canBeEdited: this.canBeEdited(backendData.status),
      canBeCancelled: this.canBeCancelled(backendData.status)
    };
  }

  // Métodos auxiliares para el mapeo
  private extractTimeFromDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Asegurar que la fecha sea válida
      if (isNaN(date.getTime())) return '';

      // Formatear hora en formato 24h (HH:MM)
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  }

  private isUpcomingInterview(scheduledDate: string, status: string): boolean {
    if (!scheduledDate || status === 'COMPLETED' || status === 'CANCELLED') return false;
    const now = new Date();
    const interviewDate = new Date(scheduledDate);
    return interviewDate > now;
  }

  private isOverdueInterview(scheduledDate: string, status: string): boolean {
    if (!scheduledDate || status === 'COMPLETED' || status === 'CANCELLED') return false;
    const now = new Date();
    const interviewDate = new Date(scheduledDate);
    return interviewDate < now && status === 'SCHEDULED';
  }

  private canBeCompleted(status: string): boolean {
    return status === 'SCHEDULED' || status === 'CONFIRMED' || status === 'IN_PROGRESS';
  }

  private canBeEdited(status: string): boolean {
    return status === 'SCHEDULED' || status === 'CONFIRMED';
  }

  private canBeCancelled(status: string): boolean {
    return status === 'SCHEDULED' || status === 'CONFIRMED';
  }

  // CRUD básico
  async createInterview(request: CreateInterviewRequest): Promise<Interview> {
    // Asegurar que el status se establezca como SCHEDULED si no se especifica
    const requestWithStatus = {
      ...request,
      status: request.status || InterviewStatus.SCHEDULED
    };
    
    console.log('Creando entrevista con estado:', requestWithStatus.status);
    console.log('Request completo enviado al backend:', JSON.stringify(requestWithStatus, null, 2));
    
    const response = await api.post<InterviewResponse>(this.baseUrl, requestWithStatus);
    
    console.log('Response recibido del backend:', JSON.stringify(response.data, null, 2));
    return this.mapInterviewResponse(response.data);
  }

  async getInterviewById(id: number): Promise<Interview> {
    const response = await api.get<InterviewResponse>(`${this.baseUrl}/${id}`);
    return this.mapInterviewResponse(response.data);
  }

  async getAllInterviews(
    page: number = 0,
    size: number = 20,
    sortBy: string = 'scheduledDate',
    sortDir: 'asc' | 'desc' = 'desc',
    search?: string
  ): Promise<{ interviews: Interview[]; totalElements: number; totalPages: number }> {
    try {
      console.log('Obtaining interviews from backend...');

      // Use correct API instance instead of hardcoded URL
      const response = await api.get<any>(this.baseUrl);

      console.log('Backend response:', response.data);

      // Backend returns: { success: true, data: [...], count: number }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        console.log('Found interviews from backend:', response.data.data.length);

        // Apply search filter if provided
        let interviews = response.data.data;
        if (search && search.trim()) {
          const searchLower = search.toLowerCase();
          interviews = interviews.filter((interview: any) =>
            interview.studentName?.toLowerCase().includes(searchLower) ||
            interview.interviewerName?.toLowerCase().includes(searchLower) ||
            interview.notes?.toLowerCase().includes(searchLower)
          );
        }

        // Apply sorting
        interviews.sort((a: any, b: any) => {
          let aValue = a[sortBy];
          let bValue = b[sortBy];

          if (sortBy === 'scheduledDate') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }

          if (sortDir === 'desc') {
            return bValue > aValue ? 1 : -1;
          }
          return aValue > bValue ? 1 : -1;
        });

        // Apply pagination
        const totalElements = interviews.length;
        const totalPages = Math.ceil(totalElements / size);
        const startIndex = page * size;
        const endIndex = startIndex + size;
        const paginatedInterviews = interviews.slice(startIndex, endIndex);

        const mappedInterviews = paginatedInterviews.map((item: any) => this.mapBackendResponse(item));
        console.log('Mapped interviews for frontend:', mappedInterviews);

        return {
          interviews: mappedInterviews,
          totalElements,
          totalPages
        };
      }

      console.log('No valid response from backend, returning empty data');
      return {
        interviews: [],
        totalElements: 0,
        totalPages: 0
      };

    } catch (error) {
      console.error('Error fetching interviews:', error);
      return {
        interviews: [],
        totalElements: 0,
        totalPages: 0
      };
    }
  }

  async getInterviewsWithFilters(
    filters: InterviewFilters,
    page: number = 0,
    size: number = 20,
    sortBy: string = 'scheduledDate',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Promise<{ interviews: Interview[]; totalElements: number; totalPages: number }> {
    try {
      console.log('Getting interviews with filters:', filters);

      // Get all interviews first
      const response = await api.get<any>(this.baseUrl);

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        let interviews = response.data.data;

        // Apply filters
        if (filters.status) {
          interviews = interviews.filter((interview: any) => interview.status === filters.status);
        }
        if (filters.type) {
          interviews = interviews.filter((interview: any) => interview.type === filters.type);
        }
        if (filters.mode) {
          interviews = interviews.filter((interview: any) => interview.mode === filters.mode);
        }
        if (filters.interviewerId) {
          interviews = interviews.filter((interview: any) =>
            parseInt(interview.interviewerId) === filters.interviewerId
          );
        }
        if (filters.startDate) {
          interviews = interviews.filter((interview: any) =>
            new Date(interview.scheduledDate) >= new Date(filters.startDate!)
          );
        }
        if (filters.endDate) {
          interviews = interviews.filter((interview: any) =>
            new Date(interview.scheduledDate) <= new Date(filters.endDate!)
          );
        }

        // Apply sorting
        interviews.sort((a: any, b: any) => {
          let aValue = a[sortBy];
          let bValue = b[sortBy];

          if (sortBy === 'scheduledDate') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }

          if (sortDir === 'desc') {
            return bValue > aValue ? 1 : -1;
          }
          return aValue > bValue ? 1 : -1;
        });

        // Apply pagination
        const totalElements = interviews.length;
        const totalPages = Math.ceil(totalElements / size);
        const startIndex = page * size;
        const endIndex = startIndex + size;
        const paginatedInterviews = interviews.slice(startIndex, endIndex);

        return {
          interviews: paginatedInterviews.map((item: any) => this.mapBackendResponse(item)),
          totalElements,
          totalPages
        };
      }

      return {
        interviews: [],
        totalElements: 0,
        totalPages: 0
      };

    } catch (error) {
      console.error('Error fetching interviews with filters:', error);
      return {
        interviews: [],
        totalElements: 0,
        totalPages: 0
      };
    }
  }

  async updateInterview(id: number, request: UpdateInterviewRequest): Promise<Interview> {
    const response = await api.put<InterviewResponse>(`${this.baseUrl}/${id}`, request);
    return this.mapInterviewResponse(response.data);
  }

  async deleteInterview(id: number): Promise<void> {
    // Use clean axios instance WITHOUT interceptors
    // Backend DELETE endpoint does NOT require CSRF validation
    const token = localStorage.getItem('auth_token') || localStorage.getItem('professor_token');

    console.log(`🗑️ [deleteInterview] Using clean axios instance (no CSRF) for DELETE /v1/interviews/${id}`);

    await cleanAxios.delete(`${this.baseUrl}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`[deleteInterview] Interview ${id} deleted successfully (no CSRF token sent)`);
  }

  // Operaciones de estado
  async confirmInterview(id: number): Promise<Interview> {
    const response = await api.post<InterviewResponse>(`${this.baseUrl}/${id}/confirm`);
    return this.mapInterviewResponse(response.data);
  }

  async startInterview(id: number): Promise<Interview> {
    const response = await api.post<InterviewResponse>(`${this.baseUrl}/${id}/start`);
    return this.mapInterviewResponse(response.data);
  }

  async completeInterview(id: number, request: CompleteInterviewRequest): Promise<Interview> {
    const response = await api.post<InterviewResponse>(`${this.baseUrl}/${id}/complete`, request);
    return this.mapInterviewResponse(response.data);
  }

  async cancelInterview(id: number, cancellationReason: string): Promise<Interview> {
    console.log(`🚫 Cancelando entrevista ${id} con razón: ${cancellationReason}`);
    const response = await api.patch<any>(`${this.baseUrl}/${id}/cancel`, {
      cancellationReason
    });

    // Backend devuelve { success: true, data: { message, interview } }
    if (response.data && response.data.success && response.data.data && response.data.data.interview) {
      console.log('Entrevista cancelada exitosamente');
      return this.mapBackendResponse(response.data.data.interview);
    }

    // Fallback si la estructura es diferente
    if (response.data && response.data.interview) {
      return this.mapBackendResponse(response.data.interview);
    }

    console.warn('Estructura de respuesta inesperada al cancelar entrevista');
    return this.mapBackendResponse(response.data);
  }

  async rescheduleInterview(id: number, newDate: string, newTime: string, reason: string): Promise<Interview> {
    console.log(`Reagendando entrevista ${id} a ${newDate} ${newTime} con razón: ${reason}`);
    const response = await api.patch<any>(`${this.baseUrl}/${id}/reschedule`, {
      newDate,
      newTime,
      reason
    });

    // Backend devuelve { success: true, data: { message, interview } }
    if (response.data && response.data.success && response.data.data && response.data.data.interview) {
      console.log('Entrevista reagendada exitosamente');
      return this.mapBackendResponse(response.data.data.interview);
    }

    // Fallback si la estructura es diferente
    if (response.data && response.data.interview) {
      return this.mapBackendResponse(response.data.interview);
    }

    console.warn('Estructura de respuesta inesperada al reagendar entrevista');
    return this.mapBackendResponse(response.data);
  }

  async markAsNoShow(id: number): Promise<Interview> {
    const response = await api.post<InterviewResponse>(`${this.baseUrl}/${id}/no-show`);
    return this.mapInterviewResponse(response.data);
  }

  // Consultas especiales
  async getTodaysInterviews(): Promise<Interview[]> {
    const response = await api.get<InterviewResponse[]>(`${this.baseUrl}/today`);
    return response.data.map(item => this.mapInterviewResponse(item));
  }

  async getUpcomingInterviews(): Promise<Interview[]> {
    const response = await api.get<InterviewResponse[]>(`${this.baseUrl}/upcoming`);
    return response.data.map(item => this.mapInterviewResponse(item));
  }

  async getOverdueInterviews(): Promise<Interview[]> {
    const response = await api.get<InterviewResponse[]>(`${this.baseUrl}/overdue`);
    return response.data.map(item => this.mapInterviewResponse(item));
  }

  async getInterviewsRequiringFollowUp(): Promise<Interview[]> {
    const response = await api.get<InterviewResponse[]>(`${this.baseUrl}/follow-up`);
    return response.data.map(item => this.mapInterviewResponse(item));
  }

  async getInterviewsByInterviewer(interviewerId: number): Promise<Interview[]> {
    try {
      // Add cache-busting headers and timestamp to force fresh data
      const timestamp = Date.now();
      console.log(`[getInterviewsByInterviewer] Fetching with timestamp: ${timestamp} for interviewer ${interviewerId}`);

      const response = await api.get<InterviewResponse[]>(
        `${this.baseUrl}/interviewer/${interviewerId}?_t=${timestamp}`,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );

      // Verificar si la respuesta es del placeholder (microservicio no implementado)
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        console.log('Interviews by interviewer service no implementado, devolviendo array vacío');
        return [];
      }

      // Verificar si es un array válido
      if (Array.isArray(response.data)) {
        console.log(`[getInterviewsByInterviewer] Received ${response.data.length} interviews for interviewer ${interviewerId}`);
        return response.data.map(item => this.mapInterviewResponse(item));
      }

      console.log('Estructura de respuesta inesperada para interviews by interviewer');
      return [];
    } catch (error) {
      console.error('Error fetching interviews by interviewer:', error);
      return [];
    }
  }

  async getInterviewsByApplication(applicationId: number): Promise<{ interviews: Interview[] }> {
    try {
      console.log('Getting interviews for application:', applicationId);

      // Use path parameter (backend expects /v1/interviews/application/:applicationId)
      const response = await api.get<any>(`${this.baseUrl}/application/${applicationId}`);

      console.log(`Direct response for application ${applicationId}:`, response.data);

      // CASE 1: Backend returns wrapped format { success: true, data: [...] }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        console.log(`Found ${response.data.data.length} interviews for application ${applicationId} (wrapped format)`);

        const mappedInterviews = response.data.data.map((item: any) => {
          console.log(`Mapping interview ${item.id}:`, item);
          const mapped = this.mapBackendResponse(item);
          console.log(`Mapped interview:`, mapped);
          return mapped;
        });

        console.log(`Final mapped interviews for application ${applicationId}:`, mappedInterviews);

        return {
          interviews: mappedInterviews
        };
      }

      // CASE 2: Backend returns direct array [{...}, {...}]
      if (Array.isArray(response.data)) {
        console.log(`Found ${response.data.length} interviews for application ${applicationId} (direct array)`);

        const mappedInterviews = response.data.map((item: any) => {
          console.log(`Mapping interview ${item.id}:`, item);
          const mapped = this.mapBackendResponse(item);
          console.log(`Mapped interview:`, mapped);
          return mapped;
        });

        console.log(`Final mapped interviews for application ${applicationId}:`, mappedInterviews);

        return {
          interviews: mappedInterviews
        };
      }

      console.log('No valid response from backend for getInterviewsByApplication');
      return { interviews: [] };

    } catch (error) {
      console.error('Error fetching interviews by application:', error);
      return { interviews: [] };
    }
  }

  async getInterviewsByDateRange(startDate: string, endDate: string): Promise<Interview[]> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    const response = await api.get<InterviewResponse[]>(`${this.baseUrl}/date-range?${params}`);
    return response.data.map(item => this.mapInterviewResponse(item));
  }

  // Estadísticas
  async getInterviewStatistics(): Promise<InterviewStats> {
    try {
      const response = await api.get<any>(`${this.baseUrl}/statistics`);

      // Backend returns: { success: true, data: { overview: {...}, byType: {...}, ... } }
      if (response.data && response.data.success && response.data.data) {
        const statsData = response.data.data;

        // Map backend statistics to frontend format
        return {
          totalInterviews: statsData.overview?.total || 0,
          scheduledInterviews: statsData.overview?.scheduled || 0,
          completedInterviews: statsData.overview?.completed || 0,
          cancelledInterviews: statsData.overview?.cancelled || 0,
          noShowInterviews: 0,
          pendingInterviews: statsData.overview?.scheduled || 0,
          positiveResults: 0,
          neutralResults: 0,
          negativeResults: 0,
          pendingReviewResults: 0,
          requiresFollowUpResults: 0,
          averageScore: 0,
          completionRate: parseFloat(statsData.overview?.completionRate) || 0,
          cancellationRate: parseFloat(statsData.overview?.cancellationRate) || 0,
          successRate: parseFloat(statsData.overview?.completionRate) || 0,
          statusDistribution: {
            'SCHEDULED': statsData.overview?.scheduled || 0,
            'COMPLETED': statsData.overview?.completed || 0,
            'CANCELLED': statsData.overview?.cancelled || 0
          },
          typeDistribution: {
            'FAMILY': statsData.byType?.FAMILY || 0,
            'PSYCHOLOGICAL': statsData.byType?.PSYCHOLOGICAL || 0,
            'ACADEMIC': statsData.byType?.ACADEMIC || 0
          },
          modeDistribution: {
            'IN_PERSON': statsData.byMode?.IN_PERSON || 0,
            'VIRTUAL': statsData.byMode?.VIRTUAL || 0
          },
          resultDistribution: {},
          monthlyTrends: statsData.monthlyTrends || {},
          followUpRequired: 0,
          upcomingInterviews: 0,
          overdueInterviews: 0,
          averageDuration: statsData.timeAnalysis?.averageDuration || 0,
          popularTimeSlots: statsData.timeAnalysis?.popularTimeSlots || [],
          interviewerPerformance: Object.entries(statsData.byInterviewer || {}).map(([id, data]: [string, any]) => ({
            interviewerId: parseInt(id),
            interviewerName: data.name,
            totalInterviews: data.totalInterviews || 0,
            completedInterviews: data.completed || 0,
            averageScore: 0,
            completionRate: data.totalInterviews > 0 ?
              ((data.completed || 0) / data.totalInterviews * 100) : 0
          }))
        };
      }

      // Fallback stats if no data
      return {
        totalInterviews: 0,
        scheduledInterviews: 0,
        completedInterviews: 0,
        cancelledInterviews: 0,
        noShowInterviews: 0,
        pendingInterviews: 0,
        positiveResults: 0,
        neutralResults: 0,
        negativeResults: 0,
        pendingReviewResults: 0,
        requiresFollowUpResults: 0,
        averageScore: 0,
        completionRate: 0,
        cancellationRate: 0,
        successRate: 0,
        statusDistribution: {},
        typeDistribution: {},
        modeDistribution: {},
        resultDistribution: {},
        monthlyTrends: {},
        followUpRequired: 0,
        upcomingInterviews: 0,
        overdueInterviews: 0,
        averageDuration: 0,
        popularTimeSlots: [],
        interviewerPerformance: []
      };
    } catch (error) {
      console.error('Error fetching interview statistics:', error);
      // Return empty stats instead of throwing error
      return {
        totalInterviews: 0,
        scheduledInterviews: 0,
        completedInterviews: 0,
        cancelledInterviews: 0,
        noShowInterviews: 0,
        pendingInterviews: 0,
        positiveResults: 0,
        neutralResults: 0,
        negativeResults: 0,
        pendingReviewResults: 0,
        requiresFollowUpResults: 0,
        averageScore: 0,
        completionRate: 0,
        cancellationRate: 0,
        successRate: 0,
        statusDistribution: {},
        typeDistribution: {},
        modeDistribution: {},
        resultDistribution: {},
        monthlyTrends: {},
        followUpRequired: 0,
        upcomingInterviews: 0,
        overdueInterviews: 0,
        averageDuration: 0,
        popularTimeSlots: [],
        interviewerPerformance: []
      };
    }
  }

  // Para calendario
  async getCalendarInterviews(startDate: string, endDate: string, interviewerId?: number): Promise<Interview[]> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });

    if (interviewerId) {
      params.append('interviewerId', interviewerId.toString());
    }

    const response = await api.get<any>(`${this.baseUrl}/calendar?${params}`);

    // Backend returns { success: true, data: [...], count: N }
    // Extract the array from response.data.data
    const interviews = response.data?.data || response.data || [];

    if (!Array.isArray(interviews)) {
      console.error('Calendar response is not an array:', response.data);
      return [];
    }

    // Use mapBackendResponse to properly map secondInterviewerId and secondInterviewerName
    return interviews.map(item => this.mapBackendResponse(item));
  }

  // Validación de disponibilidad
  async checkInterviewerAvailability(
    interviewerId: number,
    date: string,
    time: string,
    excludeInterviewId?: number
  ): Promise<boolean> {
    const params = new URLSearchParams({
      interviewerId: interviewerId.toString(),
      date,
      time
    });

    if (excludeInterviewId) {
      params.append('excludeInterviewId', excludeInterviewId.toString());
    }

    const response = await api.get<boolean>(`${this.baseUrl}/availability?${params}`);
    return response.data;
  }

  // Búsqueda
  async searchInterviews(searchTerm: string, page: number = 0, size: number = 20): Promise<{ interviews: Interview[]; totalElements: number; totalPages: number }> {
    return this.getAllInterviews(page, size, 'scheduledDate', 'desc', searchTerm);
  }

  // Notificaciones
  async sendNotification(id: number, notificationType: 'scheduled' | 'confirmed' | 'reminder'): Promise<string> {
    const params = new URLSearchParams({ notificationType });
    const response = await api.post<string>(`${this.baseUrl}/${id}/send-notification?${params}`);
    return response.data;
  }

  async sendReminder(id: number): Promise<string> {
    const response = await api.post<string>(`${this.baseUrl}/${id}/send-reminder`);
    return response.data;
  }

  // Horarios disponibles
  async getAvailableTimeSlots(
    interviewerId: number,
    date: string,
    duration: number = 60
  ): Promise<string[]> {
    try {
      console.log(`[getAvailableTimeSlots] INICIO - Parámetros recibidos:`, { interviewerId, date, duration });

      // Validar formato de fecha antes de enviar al backend
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        console.error(`getAvailableTimeSlots: Formato de fecha inválido "${date}". Se esperaba YYYY-MM-DD`);
        return [];
      }

      // Verificar que el año sea razonable
      const year = parseInt(date.split('-')[0]);
      if (year < 2020 || year > 2100) {
        console.error(`getAvailableTimeSlots: Año inválido ${year}. Debe estar entre 2020 y 2100`);
        return [];
      }

      // Validar y usar duración por defecto si es inválida
      const validDuration = (duration && !isNaN(duration) && duration > 0) ? duration : 60;

      const params = new URLSearchParams({
        interviewerId: interviewerId.toString(),
        date,
        duration: validDuration.toString()
      });

      console.log(`[getAvailableTimeSlots] Llamando al backend con URL: ${this.baseUrl}/available-slots?${params.toString()}`);

      const response = await api.get<any>(`${this.baseUrl}/available-slots?${params}`);

      console.log('Respuesta completa de available-slots:', response);
      console.log('Data de respuesta:', response.data);
      console.log('Tipo de data:', typeof response.data, Array.isArray(response.data));

      // Verificar si la respuesta es del placeholder (microservicio no implementado)
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        console.log('Available slots service no implementado, devolviendo horarios vacíos');
        return [];
      }

      // CASO 1: Backend devuelve estructura { success: true, data: { availableSlots: [...] } }
      if (response.data && response.data.success && response.data.data && response.data.data.availableSlots) {
        const slots = response.data.data.availableSlots;
        console.log('Slots extraídos de response.data.data.availableSlots:', slots);

        // Si los slots son objetos con estructura { time, display } o { time, available, duration }
        if (Array.isArray(slots) && slots.length > 0 && typeof slots[0] === 'object' && 'time' in slots[0]) {
          console.log('Procesando slots con formato completo del backend');
          console.log(`[getAvailableTimeSlots] Total de slots recibidos: ${slots.length}`);
          // El backend ya filtra los slots disponibles, solo necesitamos extraer el campo display
          const availableSlots = slots.map(slot => slot.display || slot.time);
          console.log(`[getAvailableTimeSlots] Slots disponibles extraídos (${availableSlots.length}):`, availableSlots);
          return availableSlots;
        }

        // Si los slots ya son strings
        if (Array.isArray(slots) && (slots.length === 0 || typeof slots[0] === 'string')) {
          console.log(`[getAvailableTimeSlots] Devolviendo slots del backend (strings, ${slots.length}):`, slots);
          return slots;
        }
      }

      // CASO 2: Verificar si es un array directo (legacy)
      if (Array.isArray(response.data)) {
        // Si es un array de strings (formato esperado)
        if (response.data.length === 0 || typeof response.data[0] === 'string') {
          console.log('Devolviendo slots del backend (strings directo):', response.data);
          return response.data;
        }

        // Si es un array con objetos que contienen message/slots (formato backend sin horarios)
        if (response.data.length > 0 && response.data[0] && typeof response.data[0] === 'object' && 'slots' in response.data[0]) {
          const slotsData = response.data[0].slots;
          console.log('Extrayendo slots de respuesta estructurada:', slotsData);
          if (Array.isArray(slotsData)) {
            return slotsData;
          }
        }

        // Si es un array de objetos slot directos (formato backend con horarios)
        if (response.data.length > 0 && response.data[0] && typeof response.data[0] === 'object' && 'time' in response.data[0]) {
          console.log('Procesando slots con formato completo del backend (array directo)');
          // El backend ya filtra los disponibles, solo extraemos display o time
          const availableSlots = response.data.map(slot => slot.display || slot.time);
          console.log('Slots disponibles extraídos:', availableSlots);
          return availableSlots;
        }
      }

      console.log('Estructura de respuesta inesperada para available slots, devolviendo horarios vacíos');
      console.log('Data recibida:', response.data);
      return [];
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return [];
    }
  }

  async getInterviewerAvailability(
    interviewerId: number,
    startDate: string,
    endDate: string
  ): Promise<{ date: string; availableSlots: string[] }[]> {
    try {
      const params = new URLSearchParams({
        interviewerId: interviewerId.toString(),
        startDate,
        endDate
      });
      
      const response = await api.get<{ date: string; availableSlots: string[] }[]>(
        `${this.baseUrl}/interviewer-availability?${params}`
      );
      
      // Verificar si la respuesta es del placeholder (microservicio no implementado)
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        console.log('Interviewer availability service no implementado, devolviendo datos vacíos');
        return [];
      }
      
      // Verificar si es un array válido
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      console.log('Estructura de respuesta inesperada para interviewer availability');
      return [];
    } catch (error) {
      console.error('Error fetching interviewer availability:', error);
      return [];
    }
  }

  // Validar conflictos de horarios antes de crear/editar entrevista
  async validateTimeSlot(
    interviewerId: number,
    date: string,
    time: string,
    duration: number,
    excludeInterviewId?: number
  ): Promise<{ isValid: boolean; conflictMessage?: string }> {
    try {
      const params = new URLSearchParams({
        interviewerId: interviewerId.toString(),
        date,
        time,
        duration: duration.toString()
      });
      
      if (excludeInterviewId) {
        params.append('excludeId', excludeInterviewId.toString());
      }
      
      const response = await api.get<{ isValid: boolean; conflictMessage?: string }>(
        `${this.baseUrl}/validate-slot?${params}`
      );
      return response.data;
    } catch (error) {
      console.error('Error validating time slot:', error);
      // En caso de error, permitir la creación pero mostrar advertencia
      return { 
        isValid: true, 
        conflictMessage: 'No se pudo validar el horario. Proceda con precaución.' 
      };
    }
  }

  // Método auxiliar para horarios por defecto
  private getDefaultTimeSlots(): string[] {
    return [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];
  }

  // Obtener horarios comunes entre dos entrevistadores (para entrevistas familiares)
  async getCommonTimeSlots(
    interviewer1Id: number,
    interviewer2Id: number,
    date: string,
    duration: number = 60
  ): Promise<string[]> {
    try {
      console.log(`Obteniendo horarios comunes para entrevistadores ${interviewer1Id} y ${interviewer2Id} el ${date}`);

      // Validar formato de fecha antes de procesar
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        console.error(`getCommonTimeSlots: Formato de fecha inválido "${date}". Se esperaba YYYY-MM-DD`);
        return [];
      }

      // Verificar que el año sea razonable
      const year = parseInt(date.split('-')[0]);
      if (year < 2020 || year > 2100) {
        console.error(`getCommonTimeSlots: Año inválido ${year}. Debe estar entre 2020 y 2100`);
        return [];
      }

      // Obtener los horarios disponibles de ambos entrevistadores
      const [slots1, slots2] = await Promise.all([
        this.getAvailableTimeSlots(interviewer1Id, date, duration),
        this.getAvailableTimeSlots(interviewer2Id, date, duration)
      ]);

      console.log(`Horarios entrevistador 1:`, slots1);
      console.log(`Horarios entrevistador 2:`, slots2);

      // Encontrar la intersección (horarios comunes)
      const commonSlots = slots1.filter(slot => slots2.includes(slot));

      console.log(`Horarios comunes encontrados:`, commonSlots);

      return commonSlots;
    } catch (error) {
      console.error('Error obteniendo horarios comunes:', error);
      return [];
    }
  }

  /**
   * Enviar resumen de entrevistas al apoderado
   * @param applicationId ID de la aplicación
   * @returns Promise con resultado del envío
   */
  async sendInterviewSummary(applicationId: number): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
    details?: any;
  }> {
    try {
      console.log(` Enviando resumen de entrevistas para aplicación ${applicationId}`);
      const response = await api.post(`/v1/interviews/application/${applicationId}/send-summary`);
      console.log('Resumen de entrevistas enviado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error enviando resumen de entrevistas:', error);

      // Extraer mensaje de error del backend
      const errorMessage = error.response?.data?.error || 'Error al enviar resumen de entrevistas';
      const errorDetails = error.response?.data?.details || null;

      return {
        success: false,
        message: errorMessage,
        error: errorMessage,
        details: errorDetails
      };
    }
  }
}

export const interviewService = new InterviewService();
export default interviewService;
