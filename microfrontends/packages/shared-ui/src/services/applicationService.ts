import api from './api';
import { DataAdapter } from './dataAdapter';

export interface ApplicationRequest {
    // Datos del estudiante
    firstName: string;
    paternalLastName: string;
    maternalLastName: string;
    rut: string;
    birthDate: string;
    studentEmail?: string;
    studentAddress: string;
    grade: string;
    schoolApplied: string; // "MONTE_TABOR" para niños, "NAZARET" para niñas
    currentSchool?: string;
    additionalNotes?: string;

    // Datos del padre
    parent1Name: string;
    parent1Rut: string;
    parent1Email: string;
    parent1Phone: string;
    parent1Address: string;
    parent1Profession: string;

    // Datos de la madre
    parent2Name: string;
    parent2Rut: string;
    parent2Email: string;
    parent2Phone: string;
    parent2Address: string;
    parent2Profession: string;

    // Datos del sostenedor
    supporterName: string;
    supporterRut: string;
    supporterEmail: string;
    supporterPhone: string;
    supporterRelation: string;

    // Datos del apoderado
    guardianName: string;
    guardianRut: string;
    guardianEmail: string;
    guardianPhone: string;
    guardianRelation: string;
}

export interface ApplicationResponse {
    success: boolean;
    message: string;
    id?: number;
    studentName?: string;
    grade?: string;
    status?: string;
    submissionDate?: string;
    applicantEmail?: string;
}

export interface Application {
    id: number;
    student: {
        id?: string;
        fullName?: string;
        firstName: string;
        lastName: string;
        paternalLastName?: string;
        maternalLastName?: string;
        rut: string;
        birthDate: string;
        email?: string;
        address?: string;
        gradeApplied?: string;
        currentSchool?: string;
        additionalNotes?: string;
        // Campos de categorías especiales
        targetSchool?: string;
        isEmployeeChild?: boolean;
        employeeParentName?: string;
        isAlumniChild?: boolean;
        alumniParentYear?: number;
        isInclusionStudent?: boolean;
        inclusionType?: string;
        inclusionNotes?: string;
    };
    father: {
        fullName: string;
        rut: string;
        email: string;
        phone: string;
        address: string;
        profession: string;
    };
    mother: {
        fullName: string;
        rut: string;
        email: string;
        phone: string;
        address: string;
        profession: string;
    };
    supporter: {
        fullName: string;
        rut: string;
        email: string;
        phone: string;
        relationship: string;
    };
    guardian: {
        fullName: string;
        rut: string;
        email: string;
        phone: string;
        relationship: string;
    };
    status: string;
    paymentStatus?: 'UNPAID' | 'PAYMENT_PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
    paymentRequired?: boolean;
    paidAt?: string;
    canFillComplementaryForm?: boolean;
    hasComplementaryForm?: boolean;
    submissionDate: string;
    applicantUser: {
        email: string;
        firstName: string;
        lastName: string;
    };
    documents?: any[];
}

export interface PaymentCheckoutResponse {
    applicationId: number;
    paymentRequired: boolean;
    paymentStatus: 'UNPAID' | 'PAYMENT_PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
    paidAt?: string;
    canFillComplementaryForm: boolean;
    paymentId?: number;
    checkoutUrl?: string;
    amount?: number;
    currency?: string;
    expiresAt?: string;
    providerInvoiceId?: string;
}

class ApplicationService {

    // Helper function to transform frontend grade format to backend format
    private transformGradeToBackend(grade: string): string {
        // Frontend uses: "8basico", "1medio", etc.
        // Backend expects: "8_BASICO", "1_MEDIO", "PRE_KINDER", "KINDER"
        const gradeMap: Record<string, string> = {
            'PREKINDER': 'PRE_KINDER',
            'KINDER': 'KINDER',
            '1basico': '1_BASICO',
            '2basico': '2_BASICO',
            '3basico': '3_BASICO',
            '4basico': '4_BASICO',
            '5basico': '5_BASICO',
            '6basico': '6_BASICO',
            '7basico': '7_BASICO',
            '8basico': '8_BASICO',
            '1medio': '1_MEDIO',
            '2medio': '2_MEDIO',
            '3medio': '3_MEDIO',
            '4medio': '4_MEDIO'
        };

        return gradeMap[grade] || grade.toUpperCase().replace('BASICO', '_BASICO').replace('MEDIO', '_MEDIO');
    }

    // Método mejorado para administradores: obtener todas las postulaciones desde microservicio
    async getAllApplications(): Promise<Application[]> {
        try {
            // Usar el endpoint principal con parámetros page y size (el que funciona correctamente)
            // Este es el mismo endpoint que usa "Gestión de evaluaciones"
            const response = await api.get('/v1/applications?page=0&size=2000');

            // El backend devuelve {success: true, data: [...], count: X}
            const applications = response.data?.data || response.data || [];

            // El endpoint /v1/applications ya devuelve la estructura correcta
            // Filtrar las aplicaciones válidas
            const validApplications = applications.filter((app: any) =>
                app &&
                app.id &&
                app.student &&
                app.student.firstName &&
                app.student.lastName &&
                app.student.firstName !== null &&
                app.student.lastName !== null
            );

            return validApplications;

        } catch (error: any) {
            // Como fallback, devolver un array vacío
            return [];
        }
    }
    
    // Método para administradores: obtener estadísticas del dashboard
    async getAdminDashboardStats(): Promise<{
        totalApplications: number;
        applicationsByStatus: Record<string, number>;
        applicationsByGrade: Record<string, number>;
        recentApplications: Application[];
    }> {
        try {
            
            const applications = await this.getAllApplications();
            
            // Calcular estadísticas
            const totalApplications = applications.length;
            
            const applicationsByStatus = applications.reduce((acc, app) => {
                acc[app.status] = (acc[app.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            const applicationsByGrade = applications.reduce((acc, app) => {
                const grade = app.student?.gradeApplied || 'Sin especificar';
                acc[grade] = (acc[grade] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            // Ordenar por fecha de envío para obtener las más recientes
            const recentApplications = applications
                .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
                .slice(0, 10);
            
            return {
                totalApplications,
                applicationsByStatus,
                applicationsByGrade,
                recentApplications
            };
            
        } catch (error: any) {
            return {
                totalApplications: 0,
                applicationsByStatus: {},
                applicationsByGrade: {},
                recentApplications: []
            };
        }
    }
    
    async createApplication(request: ApplicationRequest): Promise<ApplicationResponse> {
        try {
            
            const response = await api.post('/v1/applications', request);
            
            return response.data;
            
        } catch (error: any) {
            
            if (error.response?.status === 400) {
                const message = error.response?.data?.message || 'Datos de postulación inválidos';
                throw new Error(message);
            } else if (error.response?.status === 409) {
                throw new Error('Ya existe una postulación para este RUT');
            } else if (error.response?.status === 500) {
                throw new Error('Error del servidor al procesar la postulación');
            }
            
            throw new Error('Error al enviar la postulación');
        }
    }
    
    async getMyApplications(): Promise<Application[]> {
        try {

            const response = await api.get('/v1/applications/my-applications');

            // Backend devuelve {success: true, data: [...], count: X}
            const applications = response.data.data || response.data;

            if (!Array.isArray(applications)) {
                return [];
            }

            return applications;

        } catch (error: any) {
            throw new Error('Error al obtener las postulaciones');
        }
    }
    
    async getApplicationById(id: number): Promise<Application> {
        try {

            const response = await api.get(`/v1/applications/${id}`);

            // Desempaquetar el wrapper {success, data, timestamp} si existe
            return response.data.data || response.data;

        } catch (error: any) {
            throw new Error('Error al obtener la postulación');
        }
    }

    async startPaymentCheckout(applicationId: number): Promise<PaymentCheckoutResponse> {
        try {
            const response = await api.post(`/v1/payments/applications/${applicationId}/checkout`);
            return response.data.data || response.data;
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.error || 'Error al iniciar el pago';
            throw new Error(message);
        }
    }

    async getPaymentStatus(applicationId: number): Promise<PaymentCheckoutResponse> {
        try {
            const response = await api.get(`/v1/payments/applications/${applicationId}/status`);
            return response.data.data || response.data;
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.error || 'Error al consultar el pago';
            throw new Error(message);
        }
    }
    
    async getDashboardData(): Promise<{
        applications: Application[];
        hasApplications: boolean;
        primaryApplication?: Application;
    }> {
        try {
            
            // Primero intentar obtener las aplicaciones del usuario autenticado
            let applications: Application[] = [];
            
            try {
                applications = await this.getMyApplications();
            } catch (authError) {
                
                // Si falla la autenticación, intentar obtener datos públicos (solo para desarrollo)
                try {
                    const publicResponse = await api.get('/v1/applications/public/all');
                    // Backend devuelve {success: true, data: [...], pagination: {...}}
                    applications = publicResponse.data.data || publicResponse.data || [];
                } catch (publicError) {
                    
                    // Si falla, intentar obtener datos mock
                    try {
                        const mockResponse = await api.get('/v1/applications/public/mock-applications');
                        applications = mockResponse.data || [];
                    } catch (mockError) {
                    }
                }
            }
            
            
            if (!Array.isArray(applications)) {
                return {
                    applications: [],
                    hasApplications: false
                };
            }
            
            return {
                applications,
                hasApplications: applications.length > 0,
                primaryApplication: applications.length > 0 ? applications[0] : undefined
            };
            
        } catch (error: any) {
            return {
                applications: [],
                hasApplications: false
            };
        }
    }

    // Método para administradores: archivar postulación
    async archiveApplication(id: number): Promise<void> {
        try {

            await api.put(`/v1/applications/${id}/archive`);


        } catch (error: any) {

            if (error.response?.status === 404) {
                throw new Error('Postulación no encontrada');
            } else if (error.response?.status === 403) {
                throw new Error('No tienes permisos para archivar esta postulación');
            }

            throw new Error('Error al archivar la postulación');
        }
    }

    // US-9: Change application status with audit trail
    async updateApplicationStatus(
        id: number,
        newStatus: string,
        changeNote?: string
    ): Promise<{ success: boolean; message: string; data: any }> {
        try {

            const response = await api.patch(`/v1/applications/${id}/status`, {
                status: newStatus,  // Backend expects 'status', not 'newStatus'
                notes: changeNote   // Backend expects 'notes', not 'changeNote'
            });


            return response.data;

        } catch (error: any) {

            if (error.response?.status === 404) {
                throw new Error('Postulación no encontrada');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data?.error || 'Estado inválido');
            } else if (error.response?.status === 403) {
                throw new Error('No tienes permisos para cambiar el estado');
            }

            throw new Error('Error al actualizar el estado de la postulación');
        }
    }

    // US-9: Get status change history for an application
    async getApplicationStatusHistory(id: number): Promise<any[]> {
        try {

            const response = await api.get(`/v1/applications/${id}/status-history`);


            return response.data.data || [];

        } catch (error: any) {

            if (error.response?.status === 404) {
                throw new Error('Postulación no encontrada');
            }

            throw new Error('Error al obtener el historial de estados');
        }
    }

    // Función principal para enviar aplicaciones
    async submitApplication(data: ApplicationRequest): Promise<ApplicationResponse> {
        try {

            // Validar datos antes de enviar
            if (!data.firstName || !data.paternalLastName || !data.maternalLastName) {
                throw new Error('Faltan datos obligatorios del estudiante');
            }

            if (!data.rut || !data.birthDate || !data.grade) {
                throw new Error('Faltan datos básicos del estudiante');
            }

            // Transform data to match backend schema
            // Backend expects all data: student, parents, guardian, supporter
            const transformedData = {
                // Student data
                studentFirstName: data.firstName,
                studentPaternalLastName: data.paternalLastName,
                studentMaternalLastName: data.maternalLastName,
                studentRUT: data.rut,
                studentDateOfBirth: data.birthDate,
                gradeAppliedFor: this.transformGradeToBackend(data.grade),
                studentEmail: data.studentEmail || '',
                studentAddress: data.studentAddress || '',
                studentCurrentSchool: data.currentSchool || '',
                studentAdmissionPreference: data.admissionPreference || 'NINGUNA',
                studentPais: 'Chile',
                studentRegion: '',
                studentComuna: '',
                studentAdditionalNotes: data.additionalNotes || '',

                // Father data (parent1)
                parent1Name: data.parent1Name || '',
                parent1Rut: data.parent1Rut || '',
                parent1Email: data.parent1Email || '',
                parent1Phone: data.parent1Phone || '',
                parent1Address: data.parent1Address || '',
                parent1Profession: data.parent1Profession || '',

                // Mother data (parent2)
                parent2Name: data.parent2Name || '',
                parent2Rut: data.parent2Rut || '',
                parent2Email: data.parent2Email || '',
                parent2Phone: data.parent2Phone || '',
                parent2Address: data.parent2Address || '',
                parent2Profession: data.parent2Profession || '',

                // Guardian data
                guardianName: data.guardianName || '',
                guardianRut: data.guardianRut || '',
                guardianEmail: data.guardianEmail || '',
                guardianPhone: data.guardianPhone || '',
                guardianRelation: data.guardianRelation || 'OTRO',

                // Supporter data
                supporterName: data.supporterName || '',
                supporterRut: data.supporterRut || '',
                supporterEmail: data.supporterEmail || '',
                supporterPhone: data.supporterPhone || '',
                supporterRelation: data.supporterRelation || 'OTRO',

                // Additional notes
                additionalNotes: data.additionalNotes || ''
            };


            // Enviar al backend
            const response = await api.post('/v1/applications', transformedData);


            // Backend devuelve {success: true, data: {id, status, ...}}
            const applicationData = response.data.data || response.data;

            return {
                success: true,
                message: response.data.message || 'Postulación enviada exitosamente',
                id: applicationData.id,
                studentName: applicationData.studentName,
                grade: applicationData.grade
            };

        } catch (error: any) {

            // Manejo específico de errores HTTP
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                switch (status) {
                    case 400:
                        throw new Error(data.message || 'Datos de la postulación inválidos');
                    case 401:
                        throw new Error('No estás autorizado para enviar postulaciones');
                    case 403:
                        throw new Error('No tienes permisos para realizar esta acción');
                    case 409:
                        throw new Error(data.message || 'Ya existe una postulación con estos datos');
                    case 422:
                        // Errores de validación específicos
                        if (data.errors && Array.isArray(data.errors)) {
                            throw new Error(data.errors.join(', '));
                        }
                        throw new Error(data.message || 'Error de validación en los datos');
                    case 500:
                        throw new Error('Error interno del servidor. Intenta nuevamente.');
                    default:
                        throw new Error(data.message || 'Error desconocido al enviar la postulación');
                }
            } else if (error.request) {
                throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
            } else {
                throw new Error(error.message || 'Error inesperado al enviar la postulación');
            }
        }
    }

    // Función para actualizar una postulación existente
    async updateApplication(applicationId: number, applicationData: any): Promise<any> {
        try {

            // Convertir gradeApplied al formato esperado por el backend
            if (applicationData.student?.gradeApplied) {
                applicationData.student.gradeApplied = this.transformGradeToBackend(applicationData.student.gradeApplied);
            }

            const response = await api.put(`/v1/applications/${applicationId}`, applicationData);

            return response.data;
        } catch (error: any) {

            if (error.response) {
                const { status, data } = error.response;
                switch (status) {
                    case 400:
                        if (data.errors && Array.isArray(data.errors)) {
                            throw new Error(data.errors.join(', '));
                        }
                        throw new Error(data.message || 'Error de validación en los datos');
                    case 404:
                        throw new Error('Postulación no encontrada');
                    case 500:
                        throw new Error('Error interno del servidor. Intenta nuevamente.');
                    default:
                        throw new Error(data.message || 'Error desconocido al actualizar la postulación');
                }
            } else if (error.request) {
                throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
            } else {
                throw new Error(error.message || 'Error inesperado al actualizar la postulación');
            }
        }
    }

    // Función para subir documentos
    async uploadDocument(applicationId: number, file: File, documentType: string): Promise<any> {
        try {

            const formData = new FormData();
            formData.append('files', file); // Backend expects 'files' (plural) not 'file'
            formData.append('documentType', documentType);
            formData.append('applicationId', applicationId.toString());

            const response = await api.post('/v1/applications/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;

        } catch (error: any) {

            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                switch (status) {
                    case 400:
                        throw new Error(data.message || 'Archivo o tipo de documento inválido');
                    case 401:
                        throw new Error('No estás autorizado para subir documentos');
                    case 413:
                        throw new Error('El archivo es demasiado grande');
                    case 415:
                        throw new Error('Tipo de archivo no permitido');
                    case 422:
                        throw new Error(data.message || 'Error de validación del documento');
                    default:
                        throw new Error(data.message || 'Error al subir el documento');
                }
            }

            throw new Error('Error de conexión al subir el documento');
        }
    }

    async getApplicationDocuments(applicationId: number): Promise<any> {
        try {
            const response = await api.get(`/v1/applications/${applicationId}/documents`);
            return response.data;
        } catch (error: any) {
            if (error.response?.data) {
                const data = error.response.data;
                throw new Error(data.message || data.error || 'Error al cargar documentos');
            }
            throw new Error('Error de conexión al cargar documentos');
        }
    }

    // Update document approval status
    async updateDocumentApprovalStatus(
        documentId: number,
        approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
    ): Promise<any> {
        try {

            const response = await api.put(
                `/v1/applications/documents/${documentId}/approval`,
                { approvalStatus }
            );

            return response.data;

        } catch (error: any) {

            if (error.response) {
                const { status, data } = error.response;
                switch (status) {
                    case 400:
                        throw new Error(data.error || 'Datos inválidos');
                    case 403:
                        throw new Error('No tienes permisos para aprobar documentos');
                    case 404:
                        throw new Error('Documento no encontrado');
                    default:
                        throw new Error(data.error || 'Error al actualizar estado de aprobación');
                }
            }

            throw new Error('Error de conexión al actualizar estado de aprobación');
        }
    }

    // Get complementary form data for an application
    async getComplementaryForm(applicationId: number): Promise<any> {
        try {

            const response = await api.get(`/v1/applications/${applicationId}/complementary-form`);

            const backendData = response.data.data || response.data;

            // Transform snake_case backend fields to camelCase frontend fields
            if (backendData) {
                const transformedData = {
                    otherSchools: backendData.other_schools,
                    fatherEducation: backendData.father_education,
                    fatherCurrentActivity: backendData.father_current_activity,
                    motherEducation: backendData.mother_education,
                    motherCurrentActivity: backendData.mother_current_activity,
                    applicationReasons: backendData.application_reasons,
                    schoolChangeReason: backendData.school_change_reason,
                    familyValues: backendData.family_values,
                    faithExperiences: backendData.faith_experiences,
                    communityServiceExperiences: backendData.community_service_experiences,
                    childrenDescriptions: backendData.children_descriptions || [],
                    isSubmitted: backendData.is_submitted,
                    submittedAt: backendData.submitted_at,
                    // Also include camelCase versions if backend provides them (for compatibility)
                    ...backendData
                };
                return transformedData;
            }

            return backendData;

        } catch (error: any) {

            if (error.response?.status === 404) {
                // Formulario no existe todavía, eso es válido
                return null;
            }

            throw new Error('Error al obtener el formulario complementario');
        }
    }

    // Save complementary form data for an application
    async saveComplementaryForm(applicationId: number, formData: any): Promise<any> {
        try {

            const response = await api.post(`/v1/applications/${applicationId}/complementary-form`, formData);

            return response.data;

        } catch (error: any) {

            if (error.response) {
                const { status, data } = error.response;
                switch (status) {
                    case 400:
                        throw new Error(data.error || 'Datos del formulario inválidos');
                    case 403:
                        throw new Error('No tienes permisos para guardar este formulario');
                    case 404:
                        throw new Error('Postulación no encontrada');
                    default:
                        throw new Error(data.error || 'Error al guardar el formulario complementario');
                }
            }

            throw new Error('Error de conexión al guardar el formulario complementario');
        }
    }

    /**
     * Mark that document notification was sent for an application
     * This also automatically updates documentosCompletos field based on document approval status
     */
    async markDocumentNotificationSent(applicationId: number): Promise<any> {
        try {

            const response = await api.patch(
                `/v1/applications/${applicationId}/document-notification-sent`
            );

            return response.data;

        } catch (error: any) {

            if (error.response) {
                const { status, data } = error.response;
                switch (status) {
                    case 404:
                        throw new Error('Postulación no encontrada');
                    case 403:
                        throw new Error('No tienes permisos para realizar esta acción');
                    default:
                        throw new Error(data.error || 'Error al marcar notificación de documentos');
                }
            }

            throw new Error('Error de conexión al marcar notificación de documentos');
        }
    }
}

export const applicationService = new ApplicationService();
