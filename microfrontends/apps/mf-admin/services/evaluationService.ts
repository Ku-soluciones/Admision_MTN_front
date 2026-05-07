import api from './api';
import {
  EvaluationSchedule,
  CreateGenericScheduleRequest,
  CreateIndividualScheduleRequest,
  RescheduleRequest,
  ScheduleResponse,
  ScheduleListResponse,
  EvaluationType,
  EvaluationStatus,
  ScheduleStatus,
  ScheduleType,
  Evaluation,
  EVALUATION_TYPE_LABELS,
  EVALUATION_STATUS_LABELS
} from '../types/evaluation';

export enum UserRole {
    APODERADO = 'APODERADO',
    ADMIN = 'ADMIN',
    TEACHER_LANGUAGE = 'TEACHER_LANGUAGE',
    TEACHER_MATHEMATICS = 'TEACHER_MATHEMATICS',
    TEACHER_ENGLISH = 'TEACHER_ENGLISH',
    CYCLE_DIRECTOR = 'CYCLE_DIRECTOR',
    PSYCHOLOGIST = 'PSYCHOLOGIST'
}

export const USER_ROLE_LABELS = {
    [UserRole.APODERADO]: 'Apoderado',
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.TEACHER_LANGUAGE]: 'Profesor de Lenguaje',
    [UserRole.TEACHER_MATHEMATICS]: 'Profesor de Matemáticas',
    [UserRole.TEACHER_ENGLISH]: 'Profesor de Inglés',
    [UserRole.CYCLE_DIRECTOR]: 'Director de Ciclo',
    [UserRole.PSYCHOLOGIST]: 'Psicólogo/a'
};

class EvaluationService {

    // ============= PROGRAMACIÓN DE EVALUACIONES (SCHEDULES) =============

    /**
     * Crear programación genérica (solo administradores)
     */
    async createGenericSchedule(request: CreateGenericScheduleRequest): Promise<ScheduleResponse> {
      try {
        console.log('Creando programación genérica:', request);

        const response = await api.post('/v1/schedules/generic', request);
        return response.data;
      } catch (error: any) {
        console.error('Error creando programación genérica:', error);
        throw new Error(
          error.response?.data?.message ||
          error.message ||
          'Error al crear la programación'
        );
      }
    }

    /**
     * Crear programación individual
     */
    async createIndividualSchedule(request: CreateIndividualScheduleRequest): Promise<ScheduleResponse> {
      try {
        console.log('Creando programación individual:', request);

        const response = await api.post('/v1/schedules/individual', request);
        return response.data;
      } catch (error: any) {
        console.error('Error creando programación individual:', error);
        throw new Error(
          error.response?.data?.message ||
          error.message ||
          'Error al crear la programación individual'
        );
      }
    }

    /**
     * Obtener próximas citas para una familia
     */
    async getFamilySchedules(applicationId: number): Promise<EvaluationSchedule[]> {
      try {
        console.log('Obteniendo citas para aplicación:', applicationId);

        const response = await api.get(`/v1/schedules/family/${applicationId}`);
        return response.data;
      } catch (error: any) {
        console.error('Error obteniendo citas familiares:', error);
        throw new Error('Error al obtener las citas programadas');
      }
    }

    /**
     * Obtener calendario del evaluador
     */
    async getEvaluatorSchedule(
      evaluatorId: number,
      startDate: string,
      endDate: string
    ): Promise<EvaluationSchedule[]> {
      try {
        console.log('Obteniendo calendario del evaluador:', evaluatorId);

        const response = await api.get(`/v1/schedules/evaluator/${evaluatorId}`, {
          params: { startDate, endDate }
        });
        return response.data;
      } catch (error: any) {
        console.error('Error obteniendo calendario del evaluador:', error);
        throw new Error('Error al obtener el calendario del evaluador');
      }
    }

    /**
     * Confirmar cita (familias)
     */
    async confirmSchedule(scheduleId: number, userId: number): Promise<EvaluationSchedule> {
      try {
        console.log('Confirmando cita:', scheduleId);

        const response = await api.put(`/v1/schedules/${scheduleId}/confirm`, null, {
          params: { userId }
        });
        return response.data;
      } catch (error: any) {
        console.error('Error confirmando cita:', error);
        throw new Error(
          error.response?.data?.message ||
          'Error al confirmar la cita'
        );
      }
    }

    /**
     * Reprogramar cita
     */
    async rescheduleAppointment(scheduleId: number, request: RescheduleRequest): Promise<EvaluationSchedule> {
      try {
        console.log('Reprogramando cita:', scheduleId, request);

        const response = await api.put(`/v1/schedules/${scheduleId}/reschedule`, request);
        return response.data;
      } catch (error: any) {
        console.error('Error reprogramando cita:', error);
        throw new Error(
          error.response?.data?.message ||
          'Error al reprogramar la cita'
        );
      }
    }

    /**
     * Obtener citas pendientes de confirmación
     */
    async getPendingConfirmations(): Promise<EvaluationSchedule[]> {
      try {
        console.log('Obteniendo citas pendientes de confirmación');

        const response = await api.get('/v1/schedules/pending-confirmations');
        return response.data;
      } catch (error: any) {
        console.error('Error obteniendo citas pendientes:', error);
        throw new Error('Error al obtener las citas pendientes de confirmación');
      }
    }

    /**
     * Marcar cita como completada
     */
    async markAsCompleted(scheduleId: number): Promise<EvaluationSchedule> {
      try {
        console.log('Marcando cita como completada:', scheduleId);

        const response = await api.put(`/v1/schedules/${scheduleId}/complete`);
        return response.data;
      } catch (error: any) {
        console.error('Error marcando cita como completada:', error);
        throw new Error('Error al marcar la cita como completada');
      }
    }

    /**
     * Obtener citas mock para demostración
     */
    async getMockFamilySchedules(applicationId: number): Promise<EvaluationSchedule[]> {
      try {
        console.log('Obteniendo citas mock para aplicación:', applicationId);

        const response = await api.get(`/v1/schedules/public/mock-schedules/${applicationId}`);

        // Convertir datos mock a formato TypeScript
        return response.data.map((mockSchedule: any) => this.convertMockToSchedule(mockSchedule));
      } catch (error: any) {
        console.error('Error obteniendo citas mock:', error);
        throw new Error('Error al obtener las citas de demostración');
      }
    }

    /**
     * Crear datos mock locales para desarrollo
     */
    createLocalMockSchedules(applicationId: number): EvaluationSchedule[] {
      const now = new Date();
      const futureDate1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 días
      const futureDate2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 días
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // -7 días

      return [
        {
          id: 1,
          evaluationType: EvaluationType.MATHEMATICS_EXAM,
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
          scheduleType: ScheduleType.GENERIC,
          status: ScheduleStatus.SCHEDULED,
          requiresConfirmation: true,
          confirmationDeadline: new Date(futureDate1.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          attendeesRequired: 'Solo el estudiante',
          preparationMaterials: 'Calculadora científica, lápices, goma de borrar',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        {
          id: 2,
          evaluationType: EvaluationType.PSYCHOLOGICAL_INTERVIEW,
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
          scheduleType: ScheduleType.INDIVIDUAL,
          status: ScheduleStatus.CONFIRMED,
          requiresConfirmation: true,
          confirmedAt: now.toISOString(),
          attendeesRequired: 'Estudiante y al menos un apoderado',
          preparationMaterials: 'Ninguno específico',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
        {
          id: 3,
          evaluationType: EvaluationType.LANGUAGE_EXAM,
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
          scheduleType: ScheduleType.GENERIC,
          status: ScheduleStatus.COMPLETED,
          requiresConfirmation: false,
          createdAt: pastDate.toISOString(),
          updatedAt: pastDate.toISOString()
        }
      ];
    }

    /**
     * Convertir datos mock del backend a formato TypeScript
     */
    private convertMockToSchedule(mockData: any): EvaluationSchedule {
      return {
        id: mockData.id,
        evaluationType: mockData.evaluationType as EvaluationType,
        gradeLevel: mockData.gradeLevel,
        subject: mockData.subject,
        application: mockData.application ? {
          id: mockData.application.id,
          student: mockData.application.student
        } : undefined,
        evaluator: mockData.evaluator,
        scheduledDate: mockData.scheduledDate,
        durationMinutes: mockData.durationMinutes,
        location: mockData.location,
        meetingLink: mockData.meetingLink,
        instructions: mockData.instructions,
        scheduleType: mockData.scheduleType,
        status: mockData.status as ScheduleStatus,
        requiresConfirmation: mockData.requiresConfirmation,
        confirmationDeadline: mockData.confirmationDeadline,
        confirmedAt: mockData.confirmedAt,
        confirmedBy: mockData.confirmedBy,
        attendeesRequired: mockData.attendeesRequired,
        preparationMaterials: mockData.preparationMaterials,
        createdAt: mockData.createdAt,
        updatedAt: mockData.updatedAt
      };
    }

    // ============= ADMIN: GESTIÓN DE EVALUACIONES =============

    /**
     * Obtener todas las evaluaciones (para administradores)
     * GET /v1/evaluations
     */
    async getAllEvaluations(): Promise<Evaluation[]> {
        try {
            console.log('Obteniendo todas las evaluaciones...');

            const response = await api.get('/v1/evaluations');

            if (response.data.success) {
                // console.log(`${response.data.count} evaluaciones obtenidas`);
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error obteniendo evaluaciones:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al obtener evaluaciones'
            );
        }
    }

    /**
     * Obtener una evaluación por ID con detalles completos
     * GET /v1/evaluations/:evaluationId
     */
    async getEvaluationById(evaluationId: number): Promise<Evaluation> {
        try {
            console.log(`Obteniendo evaluación ${evaluationId}...`);

            const response = await api.get(`/v1/evaluations/${evaluationId}`);

            if (response.data.success) {
                console.log('Evaluación obtenida');
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error obteniendo evaluación:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al obtener la evaluación'
            );
        }
    }

    /**
     * Obtener evaluaciones por application_id
     * GET /v1/evaluations/application/:applicationId
     */
    async getEvaluationsByApplicationId(applicationId: number): Promise<Evaluation[]> {
        try {
            console.log(`Obteniendo evaluaciones para application ${applicationId}...`);

            const response = await api.get(`/v1/evaluations/application/${applicationId}`);

            const raw = response.data?.data ?? response.data;
            const list = Array.isArray(raw) ? raw : [];
            return list.map((e: Record<string, unknown>) => ({
                ...e,
                evaluationType: (e.evaluationType || e.type) as string
            })) as Evaluation[];
        } catch (error: any) {
            console.error('Error obteniendo evaluaciones por application:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al obtener evaluaciones de la aplicación'
            );
        }
    }

    /**
     * CORREGIDO: Obtener estadísticas de evaluaciones
     * GET /v1/evaluations/statistics
     */
    async getEvaluationStatistics(): Promise<{
        total: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        averageScore: string;
    }> {
        try {
            console.log('Obteniendo estadísticas de evaluaciones...');

            const response = await api.get('/v1/evaluations/statistics');

            if (response.data.success) {
                console.log('Estadísticas obtenidas');
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error obteniendo estadísticas:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al obtener estadísticas de evaluaciones'
            );
        }
    }

    /**
     * NUEVO: Obtener asignaciones activas (PENDING, IN_PROGRESS)
     * GET /v1/evaluations/assignments
     */
    async getActiveAssignments(): Promise<Evaluation[]> {
        try {
            console.log('Obteniendo asignaciones activas...');

            const response = await api.get('/v1/evaluations/assignments');

            if (response.data.success) {
                console.log(`${response.data.count} asignaciones activas`);
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error obteniendo asignaciones:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al obtener asignaciones activas'
            );
        }
    }

    /**
     * NUEVO: Exportar evaluaciones a JSON o CSV
     * GET /v1/evaluations/export?status=X&type=Y&format=csv
     */
    async exportEvaluations(filters?: {
        status?: string;
        type?: string;
        format?: 'json' | 'csv';
    }): Promise<Blob | any> {
        try {
            console.log('Exportando evaluaciones...', filters);

            const params = new URLSearchParams();
            if (filters?.status) params.append('status', filters.status);
            if (filters?.type) params.append('type', filters.type);
            if (filters?.format) params.append('format', filters.format);

            const response = await api.get(`/v1/evaluations/export?${params.toString()}`, {
                responseType: filters?.format === 'csv' ? 'blob' : 'json'
            });

            console.log('Evaluaciones exportadas');
            return response.data;
        } catch (error: any) {
            console.error('Error exportando evaluaciones:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al exportar evaluaciones'
            );
        }
    }

    /**
     * CORREGIDO: Obtener evaluaciones por evaluador
     * GET /v1/evaluations/evaluator/:evaluatorId
     * (antes: getMyEvaluations - endpoint incorrecto)
     */
    async getEvaluationsByEvaluator(evaluatorId: number): Promise<Evaluation[]> {
        try {
            console.log(`Obteniendo evaluaciones del evaluador ${evaluatorId}...`);

            const response = await api.get(`/v1/evaluations/evaluator/${evaluatorId}`);

            if (response.data.success) {
                // console.log(`${response.data.count} evaluaciones obtenidas`);
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error obteniendo evaluaciones del evaluador:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al obtener evaluaciones del evaluador'
            );
        }
    }

    /**
     * CORREGIDO: Obtener evaluaciones pendientes de un evaluador
     * GET /v1/evaluations/evaluator/:id/pending
     * (antes: getMyPendingEvaluations - endpoint incorrecto)
     */
    async getPendingEvaluationsByEvaluator(evaluatorId: number): Promise<Evaluation[]> {
        try {
            console.log(`Obteniendo evaluaciones pendientes del evaluador ${evaluatorId}...`);

            const response = await api.get(`/v1/evaluations/evaluator/${evaluatorId}/pending`);

            if (response.data.success) {
                console.log(`${response.data.count} evaluaciones pendientes`);
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error obteniendo evaluaciones pendientes:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al obtener evaluaciones pendientes'
            );
        }
    }

    /**
     * NUEVO: Obtener evaluaciones completadas de un evaluador
     * GET /v1/evaluations/evaluator/:id/completed
     */
    async getCompletedEvaluationsByEvaluator(evaluatorId: number): Promise<Evaluation[]> {
        try {
            console.log(`Obteniendo evaluaciones completadas del evaluador ${evaluatorId}...`);

            const response = await api.get(`/v1/evaluations/evaluator/${evaluatorId}/completed`);

            if (response.data.success) {
                console.log(`${response.data.count} evaluaciones completadas`);
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error obteniendo evaluaciones completadas:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al obtener evaluaciones completadas'
            );
        }
    }

    /**
     * NUEVO: Filtrar evaluaciones por tipo
     * GET /v1/evaluations/type/:type
     */
    async getEvaluationsByType(type: EvaluationType): Promise<Evaluation[]> {
        try {
            console.log(`Filtrando evaluaciones por tipo: ${type}...`);

            const response = await api.get(`/v1/evaluations/type/${type}`);

            if (response.data.success) {
                console.log(`${response.data.count} evaluaciones encontradas`);
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error filtrando por tipo:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al filtrar evaluaciones por tipo'
            );
        }
    }

    /**
     * NUEVO: Filtrar evaluaciones por materia
     * GET /v1/evaluations/subject/:subject
     */
    async getEvaluationsBySubject(subject: 'LANGUAGE' | 'MATHEMATICS' | 'ENGLISH'): Promise<Evaluation[]> {
        try {
            console.log(`Filtrando evaluaciones por materia: ${subject}...`);

            const response = await api.get(`/v1/evaluations/subject/${subject}`);

            if (response.data.success) {
                console.log(`${response.data.count} evaluaciones encontradas`);
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error filtrando por materia:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al filtrar evaluaciones por materia'
            );
        }
    }

    /**
     * CORREGIDO: Actualizar una evaluación
     * PUT /v1/evaluations/:id
     */
    async updateEvaluation(evaluationId: number, evaluationData: Partial<Evaluation>): Promise<Evaluation> {
        try {
            console.log(`Actualizando evaluación ${evaluationId}...`);

            const response = await api.put(`/v1/evaluations/${evaluationId}`, evaluationData);

            if (response.data.success) {
                console.log('Evaluación actualizada');
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error actualizando evaluación:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al actualizar la evaluación'
            );
        }
    }

    /**
     * NUEVO: Marcar evaluación como completada
     * POST /v1/evaluations/:id/complete
     */
    async completeEvaluation(
        evaluationId: number,
        data: {
            score?: number;
            recommendations?: string;
            observations?: string;
        }
    ): Promise<Evaluation> {
        try {
            console.log(`Completando evaluación ${evaluationId}...`);

            const response = await api.post(`/v1/evaluations/${evaluationId}/complete`, data);

            if (response.data.success) {
                console.log('Evaluación completada exitosamente');
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error completando evaluación:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al completar la evaluación'
            );
        }
    }

    /**
     * CORREGIDO: Asignar evaluación a evaluador
     * POST /v1/evaluations/:id/assign
     * (antes: reassignEvaluation con PUT - endpoint incorrecto)
     */
    async assignEvaluation(
        evaluationId: number,
        evaluatorId: number,
        evaluationDate?: string
    ): Promise<Evaluation> {
        try {
            console.log(`Asignando evaluación ${evaluationId} al evaluador ${evaluatorId}...`);

            const response = await api.post(`/v1/evaluations/${evaluationId}/assign`, {
                evaluatorId,
                evaluationDate
            });

            if (response.data.success) {
                console.log('Evaluación asignada exitosamente');
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error asignando evaluación:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al asignar la evaluación'
            );
        }
    }

    /**
     * NUEVO: Reprogramar evaluación
     * POST /v1/evaluations/:id/reschedule
     */
    async rescheduleEvaluation(evaluationId: number, evaluationDate: string): Promise<Evaluation> {
        try {
            console.log(`Reprogramando evaluación ${evaluationId}...`);

            const response = await api.post(`/v1/evaluations/${evaluationId}/reschedule`, {
                evaluationDate
            });

            if (response.data.success) {
                console.log('Evaluación reprogramada exitosamente');
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error reprogramando evaluación:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al reprogramar la evaluación'
            );
        }
    }

    /**
     * NUEVO: Cancelar evaluación
     * POST /v1/evaluations/:id/cancel
     */
    async cancelEvaluation(evaluationId: number, reason?: string): Promise<Evaluation> {
        try {
            console.log(`Cancelando evaluación ${evaluationId}...`);

            const response = await api.post(`/v1/evaluations/${evaluationId}/cancel`, {
                reason
            });

            if (response.data.success) {
                console.log('Evaluación cancelada exitosamente');
                return response.data.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error cancelando evaluación:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al cancelar la evaluación'
            );
        }
    }

    /**
     * CORREGIDO: Asignar evaluaciones en lote
     * POST /v1/evaluations/bulk/assign
     * PARÁMETROS CORREGIDOS: evaluationIds (no applicationIds), evaluatorId, evaluationDate
     */
    async assignBulkEvaluations(
        evaluationIds: number[],
        evaluatorId: number,
        evaluationDate?: string
    ): Promise<{
        success: boolean;
        message: string;
        data: Evaluation[];
    }> {
        try {
            console.log(`Asignando ${evaluationIds.length} evaluaciones en lote...`);

            const response = await api.post('/v1/evaluations/bulk/assign', {
                evaluationIds,
                evaluatorId,
                evaluationDate
            });

            if (response.data.success) {
                console.log(`${response.data.data.length} evaluaciones asignadas`);
                return response.data;
            }

            throw new Error('Respuesta inválida del servidor');
        } catch (error: any) {
            console.error('Error asignando evaluaciones en lote:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Error al asignar evaluaciones en lote'
            );
        }
    }

    /**
     * NUEVO: Crear y asignar evaluación específica (flujo de 2 pasos)
     * Paso 1: Crear evaluación con POST /v1/evaluations
     * Paso 2: Asignar evaluación con POST /v1/evaluations/:id/assign
     *
     * Este método es útil para el dashboard de admin cuando se asignan evaluadores a estudiantes.
     */
    async assignSpecificEvaluation(
        applicationId: number,
        evaluationType: string,
        evaluatorId: number
    ): Promise<Evaluation> {
        try {
            console.log(`Creating evaluation for application ${applicationId}, type ${evaluationType}`);

            // Paso 1: Crear la evaluación con el evaluatorId
            const createResponse = await api.post('/v1/evaluations', {
                applicationId: Number(applicationId), // Asegurar que sea número
                evaluatorId: Number(evaluatorId), // ID del evaluador asignado
                evaluationType,
                score: 0, // Score inicial (requerido por el backend)
                maxScore: 100, // Score máximo (requerido por el backend)
                status: 'PENDING',
                strengths: '',
                areasForImprovement: '',
                observations: '',
                recommendations: ''
            });

            const createdEvaluation = createResponse.data.data;
            const evaluationId = createdEvaluation.id;

            console.log(`Evaluation created with ID: ${evaluationId}`);
            console.log(`Assigning to evaluator ${evaluatorId}...`);

            // Paso 2: Asignar al evaluador
            const assignResponse = await api.post(`/v1/evaluations/${evaluationId}/assign`, {
                evaluatorId,
                evaluationDate: new Date().toISOString().split('T')[0],
            });

            console.log('Evaluation assigned successfully');
            return assignResponse.data.data;
        } catch (error: any) {
            console.error('Error assigning specific evaluation:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
            });
            throw error;
        }
    }

    // ============= MÉTODOS AUXILIARES =============

    getEvaluationTypeLabel(type: EvaluationType): string {
        return EVALUATION_TYPE_LABELS[type] || type;
    }

    getEvaluationStatusLabel(status: EvaluationStatus): string {
        return EVALUATION_STATUS_LABELS[status] || status;
    }

    getUserRoleLabel(role: UserRole): string {
        return USER_ROLE_LABELS[role] || role;
    }

    getStatusColor(status: EvaluationStatus): string {
        switch (status) {
            case EvaluationStatus.PENDING:
                return 'bg-yellow-100 text-yellow-800';
            case EvaluationStatus.IN_PROGRESS:
                return 'bg-blue-100 text-blue-800';
            case EvaluationStatus.COMPLETED:
                return 'bg-green-100 text-green-800';
            case EvaluationStatus.REVIEWED:
                return 'bg-purple-100 text-purple-800';
            case EvaluationStatus.APPROVED:
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    getRequiredFieldsForEvaluationType(type: EvaluationType): string[] {
        const commonFields = ['observations', 'strengths', 'areasForImprovement', 'recommendations'];

        switch (type) {
            case EvaluationType.LANGUAGE_EXAM:
            case EvaluationType.MATHEMATICS_EXAM:
            case EvaluationType.ENGLISH_EXAM:
                return [...commonFields, 'score', 'grade'];

            case EvaluationType.PSYCHOLOGICAL_INTERVIEW:
                return [...commonFields, 'socialSkillsAssessment', 'emotionalMaturity', 'motivationAssessment', 'familySupportAssessment'];

            case EvaluationType.CYCLE_DIRECTOR_REPORT:
            case EvaluationType.CYCLE_DIRECTOR_INTERVIEW:
                return [...commonFields, 'academicReadiness', 'behavioralAssessment', 'integrationPotential', 'finalRecommendation'];

            default:
                return commonFields;
        }
    }

    validateEvaluationData(type: EvaluationType, data: Partial<Evaluation>): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const requiredFields = this.getRequiredFieldsForEvaluationType(type);

        for (const field of requiredFields) {
            if (!data[field as keyof Evaluation] || data[field as keyof Evaluation] === '') {
                errors.push(`El campo ${field} es requerido`);
            }
        }

        // Validaciones específicas
        if ((type === EvaluationType.LANGUAGE_EXAM || type === EvaluationType.MATHEMATICS_EXAM || type === EvaluationType.ENGLISH_EXAM)) {
            if (data.score !== undefined && (data.score < 0 || data.score > 100)) {
                errors.push('El puntaje debe estar entre 0 y 100');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export const evaluationService = new EvaluationService();
export default evaluationService;
