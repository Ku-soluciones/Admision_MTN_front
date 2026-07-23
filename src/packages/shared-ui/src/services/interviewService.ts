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
  CompleteInterviewRequest,
  NextAvailableSlotsResponse,
  WeeklyOverviewResponse,
  WeeklyOverviewDay,
  InterviewerInfo,
  AvailableInterviewerPair
} from '../types/interview';

export interface InterviewResponse {
  id: number;
  applicationId: number;
  studentName: string;
  parentNames: string;
  gradeApplied: string;
  interviewerId: number;
  interviewerName: string;
  secondInterviewerId?: number;
  secondInterviewerName?: string;
  interviewerPairId?: number;
  interviewerPairRevision?: number;
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
      interviewerPairId: response.interviewerPairId,
      interviewerPairRevision: response.interviewerPairRevision,
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
      interviewerPairId: backendData.interviewerPairId ? Number(backendData.interviewerPairId) : undefined,
      interviewerPairRevision: backendData.interviewerPairRevision ? Number(backendData.interviewerPairRevision) : undefined,
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

  private getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private assertSchedulableDate(date?: string): void {
    if (date && date < this.getTodayDateString()) {
      throw new Error('No se puede agendar entrevistas en fechas anteriores al dia actual.');
    }
  }

  // CRUD básico
  async createInterview(request: CreateInterviewRequest): Promise<Interview> {
    this.assertSchedulableDate(request.scheduledDate);

    // Asegurar que el status se establezca como SCHEDULED si no se especifica
    const requestWithStatus = {
      ...request,
      status: request.status || InterviewStatus.SCHEDULED
    };
    
    
    const response = await api.post<InterviewResponse>(this.baseUrl, requestWithStatus);
    
    // Backend retorna { success: true, data: {...interview} } o el interview directo
    const interviewData = response.data?.data ?? response.data;
    if (!interviewData || typeof interviewData !== 'object') {
      throw new Error('Respuesta inválida del servidor al crear entrevista');
    }
    
    return this.mapBackendResponse(interviewData);
  }

  // Enviar invitación con botones de confirmación (patrón pasarela)
  async sendInterviewInvitation(id: number, bffBaseUrl?: string): Promise<{ success: boolean; message: string; data?: Interview }> {
    try {
      const headers: Record<string, string> = {};
      if (bffBaseUrl) {
        headers['X-Base-Url'] = bffBaseUrl;
      }
      
      const response = await api.post<any>(`${this.baseUrl}/${id}/send-invitation`, {}, { headers });
      
      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message || 'Invitación enviada',
          data: response.data.data ? this.mapBackendResponse(response.data.data) : undefined
        };
      }
      
      return {
        success: false,
        message: response.data?.message || 'Error enviando invitación'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando invitación con confirmación'
      };
    }
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

      // Use correct API instance instead of hardcoded URL
      const response = await api.get<any>(this.baseUrl);


      // Backend returns: { success: true, data: [...], count: number }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {

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

        return {
          interviews: mappedInterviews,
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
      return {
        interviews: [],
        totalElements: 0,
        totalPages: 0
      };
    }
  }

  async updateInterview(id: number, request: UpdateInterviewRequest): Promise<Interview> {
    this.assertSchedulableDate(request.scheduledDate);

    const response = await api.put<InterviewResponse>(`${this.baseUrl}/${id}`, request);
    return this.mapInterviewResponse(response.data);
  }

  async deleteInterview(id: number): Promise<void> {
    // Use clean axios instance WITHOUT interceptors
    // Backend DELETE endpoint does NOT require CSRF validation
    const token = localStorage.getItem('auth_token') || localStorage.getItem('professor_token');


    await cleanAxios.delete(`${this.baseUrl}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

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
    const response = await api.patch<any>(`${this.baseUrl}/${id}/cancel`, {
      cancellationReason
    });

    // Backend devuelve { success: true, data: { message, interview } }
    if (response.data && response.data.success && response.data.data && response.data.data.interview) {
      return this.mapBackendResponse(response.data.data.interview);
    }

    // Fallback si la estructura es diferente
    if (response.data && response.data.interview) {
      return this.mapBackendResponse(response.data.interview);
    }

    return this.mapBackendResponse(response.data);
  }

  async rescheduleInterview(id: number, newDate: string, newTime: string, reason: string): Promise<Interview> {
    this.assertSchedulableDate(newDate);

    const response = await api.patch<any>(`${this.baseUrl}/${id}/reschedule`, {
      newDate,
      newTime,
      reason
    });

    // Backend devuelve { success: true, data: { message, interview } }
    if (response.data && response.data.success && response.data.data && response.data.data.interview) {
      return this.mapBackendResponse(response.data.data.interview);
    }

    // Fallback si la estructura es diferente
    if (response.data && response.data.interview) {
      return this.mapBackendResponse(response.data.interview);
    }

    return this.mapBackendResponse(response.data);
  }

  async markAsNoShow(id: number): Promise<Interview> {
    const response = await api.post<InterviewResponse>(`${this.baseUrl}/${id}/no-show`);
    return this.mapInterviewResponse(response.data);
  }

  async releaseRejectedInterview(id: number, notes?: string): Promise<Interview> {
    const response = await api.patch<any>(`${this.baseUrl}/${id}/release`, {
      notes
    });

    if (response.data && response.data.success && response.data.data && response.data.data.interview) {
      return this.mapBackendResponse(response.data.data.interview);
    }

    if (response.data && response.data.interview) {
      return this.mapBackendResponse(response.data.interview);
    }

    return this.mapBackendResponse(response.data);
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
        return [];
      }

      // Verificar si es un array válido
      if (Array.isArray(response.data)) {
        return response.data.map(item => this.mapInterviewResponse(item));
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  async getInterviewsByApplication(applicationId: number): Promise<{ interviews: Interview[] }> {
    try {

      // Use path parameter (backend expects /v1/interviews/application/:applicationId)
      const response = await api.get<any>(`${this.baseUrl}/application/${applicationId}`);


      // CASE 1: Backend returns wrapped format { success: true, data: [...] }
      if (response.data && response.data.success && Array.isArray(response.data.data)) {

        const mappedInterviews = response.data.data.map((item: any) => {
          const mapped = this.mapBackendResponse(item);
          return mapped;
        });


        return {
          interviews: mappedInterviews
        };
      }

      // CASE 2: Backend returns direct array [{...}, {...}]
      if (Array.isArray(response.data)) {

        const mappedInterviews = response.data.map((item: any) => {
          const mapped = this.mapBackendResponse(item);
          return mapped;
        });


        return {
          interviews: mappedInterviews
        };
      }

      return { interviews: [] };

    } catch (error) {
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
  async getCalendarInterviews(startDate: string, endDate: string, interviewerId?: number, includeRejected?: boolean): Promise<Interview[]> {
    const params = new URLSearchParams({
      startDate,
      endDate
    });

    if (interviewerId) {
      params.append('interviewerId', interviewerId.toString());
    }

    if (includeRejected) {
      params.append('includeRejected', 'true');
    }

    const response = await api.get<any>(`${this.baseUrl}/calendar?${params}`);

    // Backend returns { success: true, data: [...], count: N }
    // Extract the array from response.data.data
    const interviews = response.data?.data || response.data || [];

    if (!Array.isArray(interviews)) {
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

      // Validar formato de fecha antes de enviar al backend
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return [];
      }

      // Verificar que el año sea razonable
      const year = parseInt(date.split('-')[0]);
      if (year < 2020 || year > 2100) {
        return [];
      }

      // Validar y usar duración por defecto si es inválida
      const validDuration = (duration && !isNaN(duration) && duration > 0) ? duration : 60;

      const params = new URLSearchParams({
        interviewerId: interviewerId.toString(),
        date,
        duration: validDuration.toString()
      });


      const response = await api.get<any>(`${this.baseUrl}/available-slots?${params}`);


      // Verificar si la respuesta es del placeholder (microservicio no implementado)
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        return [];
      }

      // CASO 1: Backend devuelve estructura { success: true, data: { availableSlots: [...] } }
      if (response.data && response.data.success && response.data.data && response.data.data.availableSlots) {
        const slots = response.data.data.availableSlots;

        // Si los slots son objetos con estructura { time, display } o { time, available, duration }
        if (Array.isArray(slots) && slots.length > 0 && typeof slots[0] === 'object' && 'time' in slots[0]) {
          // El backend ya filtra los slots disponibles, solo necesitamos extraer el campo display
          const availableSlots = slots.map(slot => slot.display || slot.time);
          return availableSlots;
        }

        // Si los slots ya son strings
        if (Array.isArray(slots) && (slots.length === 0 || typeof slots[0] === 'string')) {
          return slots;
        }
      }

      // CASO 2: Verificar si es un array directo (legacy)
      if (Array.isArray(response.data)) {
        // Si es un array de strings (formato esperado)
        if (response.data.length === 0 || typeof response.data[0] === 'string') {
          return response.data;
        }

        // Si es un array con objetos que contienen message/slots (formato backend sin horarios)
        if (response.data.length > 0 && response.data[0] && typeof response.data[0] === 'object' && 'slots' in response.data[0]) {
          const slotsData = response.data[0].slots;
          if (Array.isArray(slotsData)) {
            return slotsData;
          }
        }

        // Si es un array de objetos slot directos (formato backend con horarios)
        if (response.data.length > 0 && response.data[0] && typeof response.data[0] === 'object' && 'time' in response.data[0]) {
          // El backend ya filtra los disponibles, solo extraemos display o time
          const availableSlots = response.data.map(slot => slot.display || slot.time);
          return availableSlots;
        }
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  async getNextAvailableSlots(params?: {
    date?: string;
    days?: number;
    duration?: number;
  }): Promise<NextAvailableSlotsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.set('date', params.date);
    if (params?.days) queryParams.set('days', params.days.toString());
    if (params?.duration) queryParams.set('duration', params.duration.toString());

    const query = queryParams.toString();
    const response = await api.get<any>(`${this.baseUrl}/next-available-slots${query ? `?${query}` : ''}`);
    return response.data?.data ?? response.data;
  }

  async getSlotAvailability(date: string, time: string, duration: number): Promise<{
    availableInterviewers: InterviewerInfo[];
    interviewerCount: number;
    availablePairs: AvailableInterviewerPair[];
    availablePairCount: number;
  }> {
    const params = new URLSearchParams({ date, time, duration: duration.toString() });
    const response = await api.get<any>(`${this.baseUrl}/slot-availability?${params}`);
    const data = response.data?.data ?? response.data;
    return {
      availableInterviewers: data?.availableInterviewers ?? [],
      interviewerCount: data?.interviewerCount ?? 0,
      availablePairs: data?.availablePairs ?? [],
      availablePairCount: data?.availablePairCount ?? 0
    };
  }

  async getWeeklyOverview(params: {
    startDate: string;
    endDate: string;
    duration?: number;
  }): Promise<WeeklyOverviewResponse> {
    const queryParams = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      duration: (params.duration || 30).toString()
    });

    try {
      const response = await api.get<any>(`${this.baseUrl}/weekly-overview?${queryParams}`);
      const overview = response.data?.data ?? response.data;

      if (overview?.range && Array.isArray(overview.days)) {
        return overview;
      }
    } catch (error) {
      // The admin dashboard can still render from existing interview APIs while
      // the aggregate endpoint is deployed.
    }

    return this.buildWeeklyOverviewFallback(params.startDate, params.endDate, params.duration || 30);
  }

  private async buildWeeklyOverviewFallback(
    startDate: string,
    endDate: string,
    duration: number
  ): Promise<WeeklyOverviewResponse> {
    const [interviews, nextSlots] = await Promise.all([
      this.getCalendarInterviews(startDate, endDate).catch(() => []),
      this.getNextAvailableSlots({ date: startDate, days: this.diffDays(startDate, endDate) + 1, duration }).catch(() => null)
    ]);

    const dates = this.getBusinessDates(startDate, endDate);
    const days: WeeklyOverviewDay[] = dates.map(date => ({
      date,
      dayOfWeek: this.getDayName(date),
      dayLabel: this.formatDayLabel(date),
      scheduled: [],
      available: []
    }));

    const interviewerMap = new Map<number, { info: InterviewerInfo; scheduledCount: number }>();

    interviews.forEach(interview => {
      const day = days.find(item => item.date === interview.scheduledDate);
      if (!day) return;

      const interviewer1: InterviewerInfo = {
        id: interview.interviewerId,
        name: interview.interviewerName || 'Entrevistador sin nombre',
        role: 'ENTREVISTADOR'
      };
      const interviewer2 = interview.secondInterviewerId
        ? {
            id: interview.secondInterviewerId,
            name: interview.secondInterviewerName || 'Segundo entrevistador',
            role: 'ENTREVISTADOR'
          }
        : undefined;

      day.scheduled.push({
        id: interview.id,
        time: interview.scheduledTime?.substring(0, 5) || '00:00',
        endTime: this.addMinutes(interview.scheduledTime?.substring(0, 5) || '00:00', interview.duration || duration),
        interviewer1,
        interviewer2,
        studentName: interview.studentName,
        applicationId: interview.applicationId,
        interviewType: interview.type,
        mode: interview.mode,
        status: interview.status
      });

      [interviewer1, interviewer2].forEach(interviewer => {
        if (!interviewer) return;
        const current = interviewerMap.get(interviewer.id) || { info: interviewer, scheduledCount: 0 };
        current.scheduledCount += 1;
        interviewerMap.set(interviewer.id, current);
      });
    });

    nextSlots?.slotsByDate?.forEach(slotDay => {
      const day = days.find(item => item.date === slotDay.date);
      if (!day) return;
      day.available = slotDay.slots.map(slot => ({
        time: slot.time,
        availableInterviewers: slot.availableInterviewers,
        interviewerCount: slot.interviewerCount,
        suggestedPair: slot.suggestedPair
      }));
    });

    const availableSlotsCount = days.reduce((total, day) => total + day.available.filter(slot => slot.interviewerCount >= 2).length, 0);
    const scheduledCount = interviews.filter(interview => interview.status === InterviewStatus.SCHEDULED || interview.status === InterviewStatus.CONFIRMED).length;
    const completedCount = interviews.filter(interview => interview.status === InterviewStatus.COMPLETED).length;
    const cancelledCount = interviews.filter(interview => interview.status === InterviewStatus.CANCELLED).length;

    return {
      range: {
        startDate,
        endDate,
        totalDays: dates.length
      },
      summary: {
        scheduledCount,
        completedCount,
        cancelledCount,
        availableSlotsCount,
        singleInterviewerSlotsCount: 0
      },
      interviewerLoad: Array.from(interviewerMap.values()).map(({ info, scheduledCount: count }) => {
        const capacity = Math.max(10, availableSlotsCount + count);
        return {
          id: info.id,
          name: info.name,
          role: info.role,
          scheduledCount: count,
          capacity,
          loadPercentage: Math.min(100, Math.round((count / capacity) * 100))
        };
      }),
      days
    };
  }

  private getBusinessDates(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(cursor.toISOString().split('T')[0]);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }

  private diffDays(startDate: string, endDate: string): number {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end = new Date(`${endDate}T00:00:00`).getTime();
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  private formatDayLabel(date: string): string {
    const formatter = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric' });
    return formatter.format(new Date(`${date}T00:00:00`)).replace('.', '');
  }

  private getDayName(date: string): string {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(`${date}T00:00:00`)).toUpperCase();
  }

  private addMinutes(time: string, minutes: number): string {
    const [hours = '0', rawMinutes = '0'] = time.split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(rawMinutes) + minutes, 0, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
        return [];
      }
      
      // Verificar si es un array válido
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
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

      // Validar formato de fecha antes de procesar
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return [];
      }

      // Verificar que el año sea razonable
      const year = parseInt(date.split('-')[0]);
      if (year < 2020 || year > 2100) {
        return [];
      }

      // Obtener los horarios disponibles de ambos entrevistadores
      const [slots1, slots2] = await Promise.all([
        this.getAvailableTimeSlots(interviewer1Id, date, duration),
        this.getAvailableTimeSlots(interviewer2Id, date, duration)
      ]);


      // Encontrar la intersección (horarios comunes)
      const commonSlots = slots1.filter(slot => slots2.includes(slot));


      return commonSlots;
    } catch (error) {
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
      const response = await api.post(`/v1/interviews/application/${applicationId}/send-summary`);
      return response.data;
    } catch (error: any) {

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
