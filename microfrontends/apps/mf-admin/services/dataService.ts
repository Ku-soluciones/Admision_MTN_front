import api from './api';
import { applicationService } from './applicationService';
import { extractBffList } from '../src/api/bffResponse';

// Interfaces centralizadas
export interface DataServiceResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface EvaluationData {
    id: number;
    studentName: string;
    studentRut: string;
    gradeApplied: string;
    applicationStatus: string;
    evaluationType: string;
    status: string;
    score?: number;
    evaluationDate?: string;
    completionDate?: string;
    createdAt: string;
    updatedAt: string;
    evaluatorName: string;
    evaluatorRole: string;
    evaluatorSubject?: string;
    academicReadiness?: string;
    behavioralAssessment?: string;
    emotionalMaturity?: string;
    socialSkillsAssessment?: string;
    motivationAssessment?: string;
    familySupportAssessment?: string;
    integrationPotential?: string;
    strengths?: string;
    areasForImprovement?: string;
    observations?: string;
    recommendations?: string;
    finalRecommendation?: boolean;
}

export interface EmailNotificationData {
    id: number;
    recipientEmail: string;
    emailType: string;
    subject: string;
    studentName: string;
    studentGender: 'MALE' | 'FEMALE';
    targetSchool: 'MONTE_TABOR' | 'NAZARET';
    sentAt: string;
    opened: boolean;
    openedAt?: string;
    openCount: number;
    trackingToken: string;
    responseRequired: boolean;
    responded: boolean;
    responseValue?: 'ACCEPT' | 'REJECT' | 'RESCHEDULE' | 'NEED_MORE_INFO';
    respondedAt?: string;
    createdAt: string;
    application: {
        id: number;
        status: string;
    };
}

export interface PostulanteData {
    id: number;
    nombreCompleto: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    rut: string;
    fechaNacimiento: string;
    edad: number;
    esHijoFuncionario: boolean;
    nombrePadreFuncionario?: string;
    esHijoExalumno: boolean;
    anioEgresoExalumno?: number;
    esAlumnoInclusion: boolean;
    tipoInclusion?: string;
    notasInclusion?: string;
    email?: string;
    direccion: string;
    cursoPostulado: string;
    colegioActual?: string;
    colegioDestino: 'MONTE_TABOR' | 'NAZARET';
    añoAcademico: string;
    estadoPostulacion: string;
    fechaPostulacion: string;
    fechaActualizacion: string;
    nombreContactoPrincipal: string;
    emailContacto: string;
    telefonoContacto: string;
    relacionContacto: string;
    documentosCompletos: boolean;
    cantidadDocumentos: number;
    evaluacionPendiente: boolean;
    entrevistaProgramada: boolean;
    fechaEntrevista?: string;
}

class DataService {
    // ===== EVALUACIONES =====
    async getEvaluations(page: number = 1, size: number = 25): Promise<EvaluationData[]> {
        try {
            console.log('DataService: Cargando evaluaciones...');
            
            // Intentar cargar desde endpoint específico
            const response = await api.get(`/v1/evaluations`, {
                params: { page, size }
            });

            const rawList = extractBffList(response.data);
            const evaluations = rawList.map((row) =>
                this.transformBackendToEvaluation({
                    ...row,
                    evaluationType: (row as any).evaluationType || (row as any).type
                })
            );
            console.log(`Evaluaciones cargadas: ${evaluations.length}`);
            
            return evaluations;
            
        } catch (error: any) {
            console.warn('Endpoint de evaluaciones no disponible, usando datos mock');
            
            // Fallback: datos de ejemplo para desarrollo
            return this.getMockEvaluations();
        }
    }

    private transformBackendToEvaluation(backendEval: any): EvaluationData {
        return {
            id: backendEval.id,
            studentName: `${backendEval.application?.student?.firstName || ''} ${backendEval.application?.student?.lastName || ''}`.trim() || 'N/A',
            studentRut: backendEval.application?.student?.rut || 'N/A',
            gradeApplied: backendEval.grade || backendEval.application?.student?.gradeApplied || 'N/A',
            applicationStatus: backendEval.application?.status || 'PENDING',
            evaluationType: backendEval.evaluationType || backendEval.type,
            status: backendEval.status,
            score: backendEval.score,
            evaluationDate: backendEval.evaluationDate,
            completionDate: backendEval.completionDate,
            createdAt: backendEval.createdAt,
            updatedAt: backendEval.updatedAt,
            evaluatorName: `${backendEval.evaluator?.firstName || ''} ${backendEval.evaluator?.lastName || ''}`.trim() || 'N/A',
            evaluatorRole: backendEval.evaluator?.role || 'N/A',
            evaluatorSubject: backendEval.evaluator?.subject,
            academicReadiness: backendEval.academicReadiness,
            behavioralAssessment: backendEval.behavioralAssessment,
            emotionalMaturity: backendEval.emotionalMaturity,
            socialSkillsAssessment: backendEval.socialSkillsAssessment,
            motivationAssessment: backendEval.motivationAssessment,
            familySupportAssessment: backendEval.familySupportAssessment,
            integrationPotential: backendEval.integrationPotential,
            strengths: backendEval.strengths,
            areasForImprovement: backendEval.areasForImprovement,
            observations: backendEval.observations,
            recommendations: backendEval.recommendations,
            finalRecommendation: backendEval.finalRecommendation
        };
    }

    private getMockEvaluations(): EvaluationData[] {
        return [
            {
                id: 1,
                studentName: 'Ana María Pérez',
                studentRut: '20123456-7',
                gradeApplied: 'Prekinder',
                applicationStatus: 'UNDER_REVIEW',
                evaluationType: 'MATHEMATICS_EXAM',
                status: 'COMPLETED',
                score: 90,
                evaluationDate: '2025-08-20',
                completionDate: '2025-08-20',
                createdAt: '2025-08-15T10:00:00',
                updatedAt: '2025-08-20T15:30:00',
                evaluatorName: 'Roberto Silva',
                evaluatorRole: 'TEACHER',
                evaluatorSubject: 'MATHEMATICS',
                academicReadiness: 'Excelente dominio de conceptos numéricos básicos',
                behavioralAssessment: 'Muy concentrada durante la evaluación',
                emotionalMaturity: 'Maneja bien la frustración',
                socialSkillsAssessment: 'Excelentes habilidades sociales',
                motivationAssessment: 'Alta motivación por aprender',
                strengths: 'Razonamiento lógico, concentración',
                areasForImprovement: 'Mejorar velocidad de cálculo',
                observations: 'Estudiante destacada con gran potencial',
                recommendations: 'Continuar con estimulación matemática',
                finalRecommendation: true
            }
        ];
    }

    // ===== NOTIFICACIONES EMAIL =====
    async getEmailNotifications(page: number = 1, size: number = 25): Promise<EmailNotificationData[]> {
        try {
            console.log('DataService: Cargando notificaciones email...');
            
            const response = await api.get(`/v1/email-notifications`, {
                params: { page, size }
            });
            
            return response.data;
            
        } catch (error: any) {
            console.warn('Endpoint de email notifications no disponible, usando datos mock');
            return this.getMockEmailNotifications();
        }
    }

    private getMockEmailNotifications(): EmailNotificationData[] {
        return [
            {
                id: 1,
                recipientEmail: 'maria.gonzalez@email.com',
                emailType: 'INTERVIEW_SCHEDULED',
                subject: 'Entrevista programada para Ana María',
                studentName: 'Ana María Pérez',
                studentGender: 'FEMALE',
                targetSchool: 'MONTE_TABOR',
                sentAt: '2025-08-20T10:00:00',
                opened: true,
                openedAt: '2025-08-20T10:05:00',
                openCount: 3,
                trackingToken: 'track-123',
                responseRequired: true,
                responded: true,
                responseValue: 'ACCEPT',
                respondedAt: '2025-08-20T11:00:00',
                createdAt: '2025-08-20T10:00:00',
                application: {
                    id: 1,
                    status: 'INTERVIEW_SCHEDULED'
                }
            }
        ];
    }

    // ===== POSTULANTES =====
    async getPostulantes(page: number = 1, size: number = 25): Promise<PostulanteData[]> {
        try {
            console.log('DataService: Cargando postulantes...');
            
            // Usar applicationService existente que ya funciona
            const applications = await applicationService.getAllApplications();
            
            // Transformar applications a postulantes
            const postulantes = applications.map(this.transformApplicationToPostulante);
            
            return postulantes;
            
        } catch (error: any) {
            console.error('Error cargando postulantes:', error);
            throw error; // Propagar el error para que useDataTable lo maneje
        }
    }

    private transformApplicationToPostulante(app: any): PostulanteData {
        const student = app.student || {};
        const father = app.father || {};
        const mother = app.mother || {};
        const guardian = app.guardian || {};

        return {
            id: app.id,
            nombreCompleto: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Sin nombre',
            nombres: student.firstName || 'Sin nombre',
            apellidoPaterno: student.lastName?.split(' ')[0] || 'Sin apellido',
            apellidoMaterno: student.lastName?.split(' ')[1] || '',
            rut: student.rut || 'Sin RUT',
            fechaNacimiento: student.birthDate || '',
            edad: this.calculateAge(student.birthDate),
            
            // Categorías especiales (usando campos específicos del backend)
            esHijoFuncionario: student.isEmployeeChild || false,
            nombrePadreFuncionario: student.employeeParentName || undefined,
            esHijoExalumno: student.isAlumniChild || false,
            anioEgresoExalumno: student.alumniParentYear || undefined,
            esAlumnoInclusion: student.isInclusionStudent || false,
            tipoInclusion: student.inclusionType || undefined,
            notasInclusion: student.inclusionNotes || undefined,
            
            email: student.email || '',
            direccion: student.address || 'Sin dirección',
            cursoPostulado: student.gradeApplied || 'No especificado',
            colegioActual: student.currentSchool || undefined,
            colegioDestino: student.targetSchool || 'MONTE_TABOR',
            añoAcademico: '2025',
            estadoPostulacion: app.status || 'PENDING',
            fechaPostulacion: app.submissionDate || app.createdAt || '',
            fechaActualizacion: app.updatedAt || '',
            
            // Contacto principal (preferir guardian, luego madre, luego padre)
            nombreContactoPrincipal: guardian.firstName && guardian.lastName 
                ? `${guardian.firstName} ${guardian.lastName}` 
                : mother.firstName && mother.lastName 
                    ? `${mother.firstName} ${mother.lastName}`
                    : father.firstName && father.lastName 
                        ? `${father.firstName} ${father.lastName}`
                        : 'Sin contacto',
            emailContacto: guardian.email || mother.email || father.email || 'sin-email@temp.com',
            telefonoContacto: guardian.phone || mother.phone || father.phone || 'Sin teléfono',
            relacionContacto: guardian.firstName ? 'Apoderado' : mother.firstName ? 'Madre' : 'Padre',
            
            // Estado de documentos y evaluaciones
            documentosCompletos: this.areDocumentsComplete(app.documents || []),
            cantidadDocumentos: (app.documents || []).length,
            evaluacionPendiente: true, // Por defecto pendiente
            entrevistaProgramada: app.status === 'INTERVIEW_SCHEDULED',
            fechaEntrevista: app.interviewDate || undefined
        };
    }

    private calculateAge(birthDate?: string): number {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return Math.max(0, age);
    }

    private areDocumentsComplete(documents: any[]): boolean {
        // Documentos requeridos básicos
        const requiredDocs = ['BIRTH_CERTIFICATE', 'STUDENT_PHOTO'];
        const uploadedTypes = documents.map(doc => doc.documentType);
        return requiredDocs.every(type => uploadedTypes.includes(type));
    }
}

// Singleton instance
export const dataService = new DataService();