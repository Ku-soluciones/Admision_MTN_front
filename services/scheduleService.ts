import api from './api';
import { API_ENDPOINTS } from './config';

export interface EvaluationSchedule {
  id: number;
  evaluationType: string;
  gradeLevel: string;
  subject?: string;
  application?: {
    id: number;
    student: {
      firstName: string;
      lastName: string;
      gradeApplied: string;
    };
  };
  evaluator: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  scheduledDate: string;
  durationMinutes: number;
  location?: string;
  meetingLink?: string;
  instructions?: string;
  scheduleType: 'GENERIC' | 'INDIVIDUAL' | 'GROUP' | 'MAKEUP';
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
  requiresConfirmation: boolean;
  confirmationDeadline?: string;
  confirmedAt?: string;
  attendeesRequired?: string;
  preparationMaterials?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenericScheduleRequest {
  evaluationType: string;
  gradeLevel: string;
  subject?: string;
  evaluatorId: number;
  scheduledDate: string;
  durationMinutes: number;
  location?: string;
  instructions?: string;
}

export interface CreateIndividualScheduleRequest {
  applicationId: number;
  evaluationType: string;
  evaluatorId: number;
  scheduledDate: string;
  durationMinutes: number;
  location?: string;
  instructions?: string;
  requiresConfirmation: boolean;
  attendeesRequired?: string;
}

export interface RescheduleRequest {
  newDate: string;
  reason: string;
}

class ScheduleService {
  // Obtener citas para una familia
  async getFamilySchedules(applicationId: number): Promise<EvaluationSchedule[]> {
    try {
      const response = await api.get(`${API_ENDPOINTS.SCHEDULES}/family/${applicationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching family schedules:', error);
      
      // Si no hay citas o es un error 404, devolver array vacío
      if (error.response?.status === 404) {
        return [];
      }
      
      // Intentar endpoint público como fallback
      if (error.code === 'ECONNREFUSED' || error.response?.status === 500) {
        console.log('Intentando endpoint público como fallback...');
        try {
          const response = await api.get(`${API_ENDPOINTS.SCHEDULES}/public/mock-schedules/${applicationId}`);
          return response.data;
        } catch (publicError) {
          console.log('Generando datos mock locales para demostración...');
          return this.generateMockFamilySchedules(applicationId);
        }
      }
      
      throw new Error('Error al obtener las citas de la familia');
    }
  }

  // Confirmar una cita
  async confirmSchedule(scheduleId: number, userId: number): Promise<EvaluationSchedule> {
    try {
      const response = await api.put(`${API_ENDPOINTS.SCHEDULES}/${scheduleId}/confirm`, null, {
        params: { userId }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error confirming schedule:', error);
      
      // Para demostración, simular confirmación exitosa si el backend no está disponible
      if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
        console.log('Simulando confirmación exitosa para demostración...');
        const mockConfirmedSchedule = this.generateMockFamilySchedules(1)
          .find(s => s.id === scheduleId);
        
        if (mockConfirmedSchedule) {
          return {
            ...mockConfirmedSchedule,
            status: 'CONFIRMED',
            confirmedAt: new Date().toISOString()
          };
        }
      }
      
      throw new Error('Error al confirmar la cita');
    }
  }

  // Crear programación genérica (solo administradores)
  async createGenericSchedule(request: CreateGenericScheduleRequest): Promise<EvaluationSchedule> {
    try {
      const response = await api.post(`${API_ENDPOINTS.SCHEDULES}/generic`, request);
      return response.data;
    } catch (error: any) {
      console.error('Error creating generic schedule:', error);
      throw new Error('Error al crear la programación genérica');
    }
  }

  // Crear programación individual
  async createIndividualSchedule(request: CreateIndividualScheduleRequest): Promise<EvaluationSchedule> {
    try {
      const response = await api.post(`${API_ENDPOINTS.SCHEDULES}/individual`, request);
      return response.data;
    } catch (error: any) {
      console.error('Error creating individual schedule:', error);
      throw new Error('Error al crear la programación individual');
    }
  }

  // Obtener calendario del evaluador
  async getEvaluatorSchedule(evaluatorId: number, startDate: string, endDate: string): Promise<EvaluationSchedule[]> {
    try {
      const response = await api.get(`${API_ENDPOINTS.SCHEDULES}/evaluator/${evaluatorId}`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching evaluator schedule:', error);
      throw new Error('Error al obtener el calendario del evaluador');
    }
  }

  // Reprogramar cita
  async rescheduleAppointment(scheduleId: number, request: RescheduleRequest): Promise<EvaluationSchedule> {
    try {
      const response = await api.put(`${API_ENDPOINTS.SCHEDULES}/${scheduleId}/reschedule`, request);
      return response.data;
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      throw new Error('Error al reprogramar la cita');
    }
  }

  // Marcar como completada
  async markAsCompleted(scheduleId: number): Promise<EvaluationSchedule> {
    try {
      const response = await api.put(`${API_ENDPOINTS.SCHEDULES}/${scheduleId}/complete`);
      return response.data;
    } catch (error: any) {
      console.error('Error marking as completed:', error);
      throw new Error('Error al marcar la cita como completada');
    }
  }

  // Obtener citas pendientes de confirmación
  async getPendingConfirmations(): Promise<EvaluationSchedule[]> {
    try {
      const response = await api.get(`${API_ENDPOINTS.SCHEDULES}/pending-confirmations`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching pending confirmations:', error);
      throw new Error('Error al obtener las citas pendientes de confirmación');
    }
  }

  // Generar datos mock para demostración
  private generateMockFamilySchedules(applicationId: number): EvaluationSchedule[] {
    const now = new Date();
    const futureDate1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 semana
    const futureDate2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 semanas
    const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 semana atrás

    return [
      {
        id: 1,
        evaluationType: 'MATHEMATICS_EXAM',
        gradeLevel: '4° Básico',
        application: {
          id: applicationId,
          student: {
            firstName: 'Juan',
            lastName: 'Pérez',
            gradeApplied: '4° Básico'
          }
        },
        evaluator: {
          id: 1,
          firstName: 'María',
          lastName: 'González',
          email: 'maria.gonzalez@mtn.cl'
        },
        scheduledDate: futureDate1.toISOString(),
        durationMinutes: 90,
        location: 'Sala de Matemáticas 201',
        instructions: 'Traer calculadora científica y útiles de escritura.',
        scheduleType: 'GENERIC',
        status: 'SCHEDULED',
        requiresConfirmation: true,
        confirmationDeadline: new Date(futureDate1.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        attendeesRequired: 'Solo el estudiante',
        preparationMaterials: 'Calculadora científica, lápices, goma de borrar',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 2,
        evaluationType: 'PSYCHOLOGICAL_INTERVIEW',
        gradeLevel: '4° Básico',
        application: {
          id: applicationId,
          student: {
            firstName: 'Juan',
            lastName: 'Pérez',
            gradeApplied: '4° Básico'
          }
        },
        evaluator: {
          id: 2,
          firstName: 'Carlos',
          lastName: 'López',
          email: 'carlos.lopez@mtn.cl'
        },
        scheduledDate: futureDate2.toISOString(),
        durationMinutes: 60,
        location: 'Oficina de Psicología',
        instructions: 'Entrevista individual con el estudiante. Los padres deben esperar en el hall.',
        scheduleType: 'INDIVIDUAL',
        status: 'CONFIRMED',
        requiresConfirmation: true,
        confirmedAt: now.toISOString(),
        attendeesRequired: 'Estudiante y al menos un apoderado',
        preparationMaterials: 'Ninguno específico',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 3,
        evaluationType: 'LANGUAGE_EXAM',
        gradeLevel: '4° Básico',
        application: {
          id: applicationId,
          student: {
            firstName: 'Juan',
            lastName: 'Pérez',
            gradeApplied: '4° Básico'
          }
        },
        evaluator: {
          id: 3,
          firstName: 'Ana',
          lastName: 'Silva',
          email: 'ana.silva@mtn.cl'
        },
        scheduledDate: pastDate.toISOString(),
        durationMinutes: 90,
        location: 'Sala de Lenguaje 102',
        instructions: 'Evaluación de comprensión lectora y redacción.',
        scheduleType: 'GENERIC',
        status: 'COMPLETED',
        requiresConfirmation: false,
        createdAt: pastDate.toISOString(),
        updatedAt: pastDate.toISOString()
      }
    ];
  }

  // Utilidades para formatear fechas y tipos
  getEvaluationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'LANGUAGE_EXAM': 'Examen de Lenguaje',
      'MATHEMATICS_EXAM': 'Examen de Matemáticas',
      'ENGLISH_EXAM': 'Examen de Inglés',
      'PSYCHOLOGICAL_INTERVIEW': 'Entrevista Psicológica',
      'CYCLE_DIRECTOR_REPORT': 'Informe Director de Ciclo',
      'CYCLE_DIRECTOR_INTERVIEW': 'Entrevista Director/a de Ciclo'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'SCHEDULED': 'Programada',
      'CONFIRMED': 'Confirmada',
      'COMPLETED': 'Completada',
      'CANCELLED': 'Cancelada',
      'RESCHEDULED': 'Reprogramada',
      'NO_SHOW': 'No asistió'
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'SCHEDULED': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'RESCHEDULED': 'bg-purple-100 text-purple-800',
      'NO_SHOW': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  formatDateTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Verificar si necesita confirmación y está pendiente
  needsConfirmation(schedule: EvaluationSchedule): boolean {
    return schedule.requiresConfirmation && !schedule.confirmedAt;
  }

  // Verificar si la confirmación está vencida
  isConfirmationExpired(schedule: EvaluationSchedule): boolean {
    if (!schedule.confirmationDeadline) return false;
    return new Date() > new Date(schedule.confirmationDeadline);
  }

  // Obtener tiempo restante para confirmar
  getTimeUntilConfirmation(schedule: EvaluationSchedule): string {
    if (!schedule.confirmationDeadline) return '';
    
    const now = new Date();
    const deadline = new Date(schedule.confirmationDeadline);
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return 'Vencido';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} día${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // ========================================================================
  // GESTIÓN DE HORARIOS DE DISPONIBILIDAD DE ENTREVISTADORES
  // ========================================================================

  /**
   * Obtener horarios de disponibilidad de un entrevistador
   */
  async getInterviewerAvailabilitySchedules(interviewerId: number): Promise<any[]> {
    try {
      const response = await api.get(`/api/interviewer-schedules/interviewer/${interviewerId}`);
      console.log(`Horarios de disponibilidad obtenidos para entrevistador ${interviewerId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo horarios de disponibilidad:', error);
      throw error;
    }
  }

  /**
   * Obtener horarios de disponibilidad por año
   */
  async getInterviewerAvailabilityByYear(interviewerId: number, year: number): Promise<any[]> {
    try {
      const response = await api.get(`/api/interviewer-schedules/interviewer/${interviewerId}/year/${year}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo horarios por año:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo horario de disponibilidad
   */
  async createAvailabilitySchedule(schedule: {
    interviewerId: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    year: number;
    scheduleType: string;
    isActive: boolean;
    notes?: string;
  }): Promise<any> {
    try {
      const response = await api.post('/api/interviewer-schedules', schedule);
      console.log('Horario de disponibilidad creado:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creando horario de disponibilidad:', error);
      throw error;
    }
  }

  /**
   * Actualizar horario de disponibilidad
   */
  async updateAvailabilitySchedule(scheduleId: number, updates: {
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    scheduleType?: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<any> {
    try {
      const response = await api.put(`/api/interviewer-schedules/${scheduleId}`, updates);
      console.log(`Horario ${scheduleId} actualizado:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Error actualizando horario:', error);
      throw error;
    }
  }

  /**
   * Eliminar horario de disponibilidad
   */
  async deleteAvailabilitySchedule(scheduleId: number): Promise<void> {
    try {
      await api.delete(`/api/interviewer-schedules/${scheduleId}`);
      console.log(`Horario ${scheduleId} eliminado`);
    } catch (error) {
      console.error('Error eliminando horario:', error);
      throw error;
    }
  }

  /**
   * Activar/Desactivar horario
   */
  async toggleAvailability(scheduleId: number, isActive: boolean): Promise<any> {
    return this.updateAvailabilitySchedule(scheduleId, { isActive });
  }
}

export const scheduleService = new ScheduleService();