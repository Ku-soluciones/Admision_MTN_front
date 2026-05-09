import api from './api';
import { Evaluation, EvaluationStatus, EvaluationType } from '../types/evaluation';

export interface ProfessorEvaluation {
    id: number;
    evaluationType: EvaluationType;
    status: EvaluationStatus;
    applicationId: number;
    studentId?: number;
    studentName: string;
    studentGrade: string;
    studentBirthDate?: string;
    currentSchool?: string;
    scheduledDate?: string;
    completedDate?: string;
    score?: number;
    maxScore?: number;
    grade?: string;
    observations?: string;
    strengths?: string;
    areasForImprovement?: string;
    recommendations?: string;
    requiresFollowUp?: boolean;
    followUpNotes?: string;
    evaluatorName?: string;
    evaluatorSubject?: string;
    application?: {
        student?: {
            birthDate?: string;
            currentSchool?: string;
        };
    };
    evaluator?: {
        firstName: string;
        lastName: string;
        subject?: string;
    };
    father?: {
        name: string;
        email?: string;
        phone?: string;
    } | null;
    mother?: {
        name: string;
        email?: string;
        phone?: string;
    } | null;
}

export interface ProfessorEvaluationStats {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    averageScore: number;
}

class ProfessorEvaluationService {
    
    /**
     * Obtener todas las evaluaciones asignadas al profesor actual
     */
    async getMyEvaluations(): Promise<ProfessorEvaluation[]> {
        try {

            const response = await api.get('/v1/evaluations/my-evaluations');
            // Handle response wrapper: {success, data}
            const evaluations = response.data?.data || response.data;


            const mappedEvaluations = this.mapToProfessorEvaluations(evaluations);

            return mappedEvaluations;

        } catch (error: any) {

            if (error.response?.status === 401) {
                throw new Error('No tienes permisos para acceder a las evaluaciones. Verifica tu autenticación.');
            } else if (error.response?.status === 404) {
                throw new Error('No se encontraron evaluaciones asignadas.');
            } else if (error.response?.status === 500) {
                throw new Error('Error del servidor al obtener evaluaciones.');
            }

            throw new Error('Error al obtener las evaluaciones asignadas. Verifica tu conexión.');
        }
    }
    
    /**
     * Obtener solo las evaluaciones pendientes del profesor
     */
    async getMyPendingEvaluations(): Promise<ProfessorEvaluation[]> {
        try {

            const response = await api.get('/v1/evaluations/my-pending');
            // Handle response wrapper: {success, data}
            const evaluations = response.data?.data || response.data;

            return this.mapToProfessorEvaluations(evaluations);

        } catch (error: any) {

            if (error.response?.status === 401) {
                throw new Error('No tienes permisos para acceder a las evaluaciones pendientes.');
            } else if (error.response?.status === 404) {
                throw new Error('No se encontraron evaluaciones pendientes.');
            }

            throw new Error('Error al obtener las evaluaciones pendientes.');
        }
    }
    
    /**
     * Obtener estadísticas de evaluaciones del profesor
     */
    async getMyEvaluationStats(): Promise<ProfessorEvaluationStats> {
        try {
            const evaluations = await this.getMyEvaluations();
            
            const total = evaluations.length;
            const pending = evaluations.filter(e => e.status === EvaluationStatus.PENDING).length;
            const inProgress = evaluations.filter(e => e.status === EvaluationStatus.IN_PROGRESS).length;
            const completed = evaluations.filter(e => e.status === EvaluationStatus.COMPLETED).length;
            
            const completedEvaluations = evaluations.filter(e => e.status === EvaluationStatus.COMPLETED && e.score);
            // Calculate average as percentage
            const averageScore = completedEvaluations.length > 0
                ? Math.round(completedEvaluations.reduce((sum, e) => {
                    const maxScore = e.maxScore || 100;
                    const percentage = ((e.score || 0) / maxScore) * 100;
                    return sum + percentage;
                }, 0) / completedEvaluations.length)
                : 0;
            
            return {
                total,
                pending,
                inProgress,
                completed,
                averageScore
            };
            
        } catch (error: any) {
            throw new Error('No se pudieron obtener las estadísticas de evaluaciones.');
        }
    }
    
    /**
     * Actualizar una evaluación (marcar como completada, agregar puntaje, etc.)
     */
    async updateEvaluation(evaluationId: number, evaluationData: Partial<ProfessorEvaluation>): Promise<ProfessorEvaluation> {
        try {

            const response = await api.put(`/v1/evaluations/${evaluationId}`, evaluationData);
            // Handle response wrapper: {success, data}
            const updatedEvaluation = response.data?.data || response.data;

            return this.mapToProfessorEvaluation(updatedEvaluation);

        } catch (error: any) {

            if (error.response?.status === 401) {
                throw new Error('No tienes permisos para actualizar esta evaluación.');
            } else if (error.response?.status === 404) {
                throw new Error('Evaluación no encontrada.');
            } else if (error.response?.status === 400) {
                throw new Error('Datos de evaluación inválidos.');
            }

            throw new Error('Error al actualizar la evaluación. Intenta nuevamente.');
        }
    }
    
    /**
     * Obtener una evaluación específica por ID
     */
    async getEvaluationById(evaluationId: number): Promise<ProfessorEvaluation> {
        try {

            const response = await api.get(`/v1/evaluations/${evaluationId}`);
            // Handle response wrapper: {success, data}
            const evaluation = response.data?.data || response.data;

            return this.mapToProfessorEvaluation(evaluation);

        } catch (error: any) {

            if (error.response?.status === 401) {
                throw new Error('No tienes permisos para acceder a esta evaluación.');
            } else if (error.response?.status === 404) {
                throw new Error('Evaluación no encontrada.');
            }

            throw new Error('Error al obtener la evaluación.');
        }
    }
    
    /**
     * Mapear respuesta de la API a formato del frontend
     */
    private mapToProfessorEvaluations(apiEvaluations: any[]): ProfessorEvaluation[] {
        return apiEvaluations.map((evaluation) => this.mapToProfessorEvaluation(evaluation));
    }
    
    private mapToProfessorEvaluation(apiEvaluation: any): ProfessorEvaluation {

        const mappedEvaluation = {
            id: apiEvaluation.id || apiEvaluation.evaluationId,
            evaluationType: apiEvaluation.evaluationType || apiEvaluation.type || apiEvaluation.evaluation_type,
            status: apiEvaluation.status || EvaluationStatus.PENDING,
            applicationId: apiEvaluation.applicationId || apiEvaluation.application_id || apiEvaluation.application?.id,
            studentId: this.getStudentId(apiEvaluation),
            studentName: this.getStudentName(apiEvaluation),
            studentGrade: this.getStudentGrade(apiEvaluation),
            studentBirthDate: this.getStudentBirthDate(apiEvaluation),
            currentSchool: this.getCurrentSchool(apiEvaluation),
            scheduledDate: apiEvaluation.scheduledDate || apiEvaluation.scheduledAt || apiEvaluation.evaluation_date || apiEvaluation.evaluationDate,
            completedDate: apiEvaluation.completedDate || apiEvaluation.completedAt || apiEvaluation.completion_date || apiEvaluation.completionDate,
            score: apiEvaluation.score,
            maxScore: apiEvaluation.maxScore || apiEvaluation.max_score,
            grade: apiEvaluation.grade,
            observations: apiEvaluation.observations,
            strengths: apiEvaluation.strengths,
            areasForImprovement: apiEvaluation.areasForImprovement || apiEvaluation.areas_for_improvement,
            recommendations: apiEvaluation.recommendations,
            requiresFollowUp: apiEvaluation.requiresFollowUp,
            followUpNotes: apiEvaluation.followUpNotes,
            evaluatorName: this.getEvaluatorName(apiEvaluation),
            evaluatorSubject: this.getEvaluatorSubject(apiEvaluation),
            application: apiEvaluation.application,
            evaluator: apiEvaluation.evaluator,
            father: apiEvaluation.father,
            mother: apiEvaluation.mother
        };

        return mappedEvaluation;
    }
    
    private getStudentId(apiEvaluation: any): number | undefined {
        // Primero intentar obtener del estudiante directo
        if (apiEvaluation.student?.id) return apiEvaluation.student.id;
        
        // Luego intentar obtener del estudiante anidado en application
        if (apiEvaluation.application?.student?.id) return apiEvaluation.application.student.id;
        
        // Finalmente intentar del campo directo
        if (apiEvaluation.studentId) return apiEvaluation.studentId;
        
        return undefined;
    }
    
    private getStudentName(apiEvaluation: any): string {
        // Primero intentar del campo directo (snake_case y camelCase)
        if (apiEvaluation.student_name) {
            return apiEvaluation.student_name;
        }
        if (apiEvaluation.studentName) {
            return apiEvaluation.studentName;
        }

        // Intentar obtener del estudiante anidado en application (PRIORIDAD)
        if (apiEvaluation.application?.student) {
            const student = apiEvaluation.application.student;
            const firstName = student.firstName || '';
            const paternalLastName = student.paternalLastName || '';
            const maternalLastName = student.maternalLastName || '';
            const fullName = `${firstName} ${paternalLastName} ${maternalLastName}`.trim();
            if (fullName) return fullName;

            // Fallback a lastName si existe
            if (student.lastName) {
                return `${firstName} ${student.lastName}`.trim();
            }
        }

        // Luego intentar obtener del estudiante directo
        if (apiEvaluation.student) {
            const student = apiEvaluation.student;
            const firstName = student.firstName || '';
            const paternalLastName = student.paternalLastName || '';
            const maternalLastName = student.maternalLastName || '';
            const fullName = `${firstName} ${paternalLastName} ${maternalLastName}`.trim();
            if (fullName) return fullName;

            // Fallback a lastName si existe
            if (student.lastName) {
                return `${firstName} ${student.lastName}`.trim();
            }
        }

        return 'Estudiante no especificado';
    }
    
    private getStudentGrade(apiEvaluation: any): string {
        // Primero intentar obtener del campo directo grade (lo que retorna /my-evaluations)
        if (apiEvaluation.grade) return apiEvaluation.grade;

        // Luego intentar student_grade (snake_case del backend)
        if (apiEvaluation.student_grade) return apiEvaluation.student_grade;
        if (apiEvaluation.studentGrade) return apiEvaluation.studentGrade;

        // Luego intentar obtener del estudiante directo
        if (apiEvaluation.student?.grade) return apiEvaluation.student.grade;
        if (apiEvaluation.student?.grade_applied) return apiEvaluation.student.grade_applied;
        if (apiEvaluation.student?.gradeApplied) return apiEvaluation.student.gradeApplied;

        // Luego intentar obtener del estudiante anidado en application
        if (apiEvaluation.application?.student?.gradeApplied) return apiEvaluation.application.student.gradeApplied;
        if (apiEvaluation.application?.student?.grade_applied) return apiEvaluation.application.student.grade_applied;
        if (apiEvaluation.application?.student?.grade) return apiEvaluation.application.student.grade;

        // Finalmente intentar de otros campos
        if (apiEvaluation.gradeLevel) return apiEvaluation.gradeLevel;

        return 'Grado no especificado';
    }
    
    private getStudentBirthDate(apiEvaluation: any): string | undefined {
        // Primero intentar del campo directo (snake_case y camelCase)
        if (apiEvaluation.student_birthdate) return apiEvaluation.student_birthdate;
        if (apiEvaluation.studentBirthDate) return apiEvaluation.studentBirthDate;
        if (apiEvaluation.student_birth_date) return apiEvaluation.student_birth_date;
        if (apiEvaluation.studentBirthdate) return apiEvaluation.studentBirthdate;

        // Luego intentar de application.student
        if (apiEvaluation.application?.student?.birthDate) return apiEvaluation.application.student.birthDate;
        if (apiEvaluation.application?.student?.birth_date) return apiEvaluation.application.student.birth_date;

        // Finalmente intentar del estudiante directo
        if (apiEvaluation.student?.birthDate) return apiEvaluation.student.birthDate;
        if (apiEvaluation.student?.birth_date) return apiEvaluation.student.birth_date;

        return undefined;
    }
    
    private getCurrentSchool(apiEvaluation: any): string | undefined {
        // Primero intentar de application.student (PRIORIDAD - lo que retorna el backend ahora)
        if (apiEvaluation.application?.student?.currentSchool) return apiEvaluation.application.student.currentSchool;
        if (apiEvaluation.application?.student?.current_school) return apiEvaluation.application.student.current_school;

        // Luego intentar del campo directo (snake_case y camelCase)
        if (apiEvaluation.current_school) return apiEvaluation.current_school;
        if (apiEvaluation.currentSchool) return apiEvaluation.currentSchool;

        // Finalmente intentar del estudiante directo
        if (apiEvaluation.student?.currentSchool) return apiEvaluation.student.currentSchool;
        if (apiEvaluation.student?.current_school) return apiEvaluation.student.current_school;

        return undefined;
    }

    private getEvaluatorName(apiEvaluation: any): string | undefined {
        // Obtener nombre del evaluador
        if (apiEvaluation.evaluator) {
            const firstName = apiEvaluation.evaluator.firstName || '';
            const lastName = apiEvaluation.evaluator.lastName || '';
            return `${firstName} ${lastName}`.trim() || undefined;
        }
        return undefined;
    }

    private getEvaluatorSubject(apiEvaluation: any): string | undefined {
        // Obtener asignatura del evaluador
        return apiEvaluation.evaluator?.subject || undefined;
    }
}

export const professorEvaluationService = new ProfessorEvaluationService();
