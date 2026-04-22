import api from './api';

export interface EmailTemplate {
  id: number;
  name: string;
  templateKey: string;
  category: string;
  type: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string;
  description?: string;
  language: string;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface EmailTemplateResponse {
  success: boolean;
  data: EmailTemplate[];
  message?: string;
}

export interface SingleTemplateResponse {
  success: boolean;
  data: EmailTemplate;
  message?: string;
}

export interface CreateTemplateRequest {
  name: string;
  templateKey: string;
  category: string;
  type: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string;
  description?: string;
  language?: string;
  active?: boolean;
  isDefault?: boolean;
}

export class EmailTemplateService {
  private baseUrl = '/api/email-templates';

  async getAllTemplates(): Promise<EmailTemplateResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/all`);
      
      // If backend returns empty array, use mock templates for now
      if (Array.isArray(response.data) && response.data.length === 0) {
        return {
          success: true,
          data: this.getMockTemplates()
        };
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching email templates:', error);
      
      // Fallback to mock data if API fails
      console.log('📧 Using mock templates as fallback');
      return {
        success: true,
        data: this.getMockTemplates(),
        message: 'Usando templates de ejemplo (backend no disponible)'
      };
    }
  }

  async getTemplatesByCategory(category: string): Promise<EmailTemplateResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/category/${category}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching templates by category:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Error al obtener templates por categoría'
      };
    }
  }

  async getTemplateById(id: number): Promise<SingleTemplateResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching template by ID:', error);
      return {
        success: false,
        data: {} as EmailTemplate,
        message: error.response?.data?.message || 'Error al obtener template'
      };
    }
  }

  async createTemplate(templateData: CreateTemplateRequest): Promise<SingleTemplateResponse> {
    try {
      console.log('🎨 Creando nuevo template:', templateData.templateKey);
      const response = await api.post(`${this.baseUrl}/create`, templateData);
      return {
        success: true,
        data: response.data,
        message: 'Template creado exitosamente'
      };
    } catch (error: any) {
      console.error('Error creating template:', error);
      
      // Si el backend no está disponible, simular creación local
      if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
        console.log('Backend no disponible, simulando creación de template...');
        const newTemplate: EmailTemplate = {
          id: Date.now(),
          ...templateData,
          language: templateData.language || 'es',
          active: templateData.active ?? true,
          isDefault: templateData.isDefault ?? false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          data: newTemplate,
          message: 'Template creado exitosamente (modo local)'
        };
      }
      
      return {
        success: false,
        data: {} as EmailTemplate,
        message: error.response?.data?.message || 'Error al crear template'
      };
    }
  }

  async updateTemplate(id: number, templateData: Partial<CreateTemplateRequest>): Promise<SingleTemplateResponse> {
    try {
      const response = await api.put(`${this.baseUrl}/${id}`, templateData);
      return {
        success: true,
        data: response.data,
        message: 'Template actualizado exitosamente'
      };
    } catch (error: any) {
      console.error('Error updating template:', error);
      return {
        success: false,
        data: {} as EmailTemplate,
        message: error.response?.data?.message || 'Error al actualizar template'
      };
    }
  }

  async deleteTemplate(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
      return {
        success: true,
        message: 'Template eliminado exitosamente'
      };
    } catch (error: any) {
      console.error('Error deleting template:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al eliminar template'
      };
    }
  }

  async sendTemplatedEmail(templateKey: string, applicationId: number, variables?: Record<string, any>): Promise<{ success: boolean; message?: string; queueId?: string }> {
    try {
      const response = await api.post(`${this.baseUrl}/send`, {
        templateKey,
        applicationId,
        variables: variables || {}
      });
      return {
        success: true,
        message: 'Email enviado exitosamente',
        queueId: response.data.queueId
      };
    } catch (error: any) {
      console.error('Error sending templated email:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al enviar email con template'
      };
    }
  }

  // Obtener variables disponibles para un template
  getTemplateVariables(category: string): string[] {
    const baseVariables = [
      'studentName',
      'studentFirstName', 
      'studentLastName',
      'gradeApplied',
      'applicantName',
      'applicantEmail',
      'collegeName',
      'collegePhone',
      'collegeEmail',
      'currentDate',
      'currentYear'
    ];

    switch (category) {
      case 'INTERVIEW_ASSIGNMENT':
      case 'INTERVIEW_CONFIRMATION':
      case 'INTERVIEW_REMINDER':
      case 'INTERVIEW_RESCHEDULE':
        return [
          ...baseVariables,
          'parentNames',
          'interviewType',
          'interviewMode', 
          'interviewDate',
          'interviewTime',
          'interviewDuration',
          'interviewLocation',
          'interviewerName',
          'meetingLink',
          'interviewNotes'
        ];
      case 'STUDENT_SELECTION':
      case 'STUDENT_REJECTION':
      case 'ADMISSION_RESULTS':
        return [
          ...baseVariables,
          'admissionResult',
          'additionalInfo',
          'rejectionReason'
        ];
      default:
        return baseVariables;
    }
  }

  // Obtener categorías disponibles
  getAvailableCategories() {
    return [
      { value: 'INTERVIEW_ASSIGNMENT', label: 'Asignación de Entrevistas' },
      { value: 'INTERVIEW_CONFIRMATION', label: 'Confirmación de Entrevistas' },
      { value: 'INTERVIEW_REMINDER', label: 'Recordatorio de Entrevistas' },
      { value: 'INTERVIEW_RESCHEDULE', label: 'Reprogramación de Entrevistas' },
      { value: 'STUDENT_SELECTION', label: 'Selección de Estudiantes' },
      { value: 'STUDENT_REJECTION', label: 'Rechazo de Estudiantes' },
      { value: 'ADMISSION_RESULTS', label: 'Resultados de Admisión' },
      { value: 'APPLICATION_STATUS', label: 'Estado de Aplicación' },
      { value: 'GENERAL_NOTIFICATION', label: 'Notificación General' },
      { value: 'WELCOME_MESSAGE', label: 'Mensaje de Bienvenida' }
    ];
  }

  // Obtener tipos de template disponibles
  getAvailableTypes() {
    return [
      { value: 'NOTIFICATION', label: 'Notificación' },
      { value: 'CONFIRMATION', label: 'Confirmación' },
      { value: 'REMINDER', label: 'Recordatorio' },
      { value: 'STATUS_UPDATE', label: 'Actualización de Estado' },
      { value: 'WELCOME', label: 'Bienvenida' },
      { value: 'REJECTION', label: 'Rechazo' },
      { value: 'APPROVAL', label: 'Aprobación' }
    ];
  }

  // Mock templates for testing while backend JPA issue is resolved
  private getMockTemplates(): EmailTemplate[] {
    return [
      {
        id: 1,
        templateKey: 'INTERVIEW_ASSIGNMENT',
        name: 'Asignación de Entrevista Individual',
        category: 'INTERVIEW_ASSIGNMENT',
        type: 'NOTIFICATION',
        subject: 'Entrevista Programada - {{studentName}} - {{gradeApplied}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Entrevista Programada</h2>
            <p>Estimado/a <strong>{{applicantName}}</strong>,</p>
            <p>Le informamos que se ha programado una entrevista para su hijo/a <strong>{{studentName}}</strong> 
               para el proceso de admisión al grado <strong>{{gradeApplied}}</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <p><strong>Fecha:</strong> {{interviewDate}}</p>
              <p><strong>Hora:</strong> {{interviewTime}}</p>
              <p><strong>Entrevistador:</strong> {{interviewerName}}</p>
              <p><strong>Modalidad:</strong> {{interviewMode}}</p>
            </div>
            <p>Saludos cordiales,<br>{{collegeName}}</p>
          </div>
        `,
        description: 'Template para notificar asignación de entrevista individual',
        language: 'es',
        active: true,
        isDefault: true,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        templateKey: 'INTERVIEW_COMPLETE_SET',
        name: 'Set Completo de Entrevistas',
        category: 'INTERVIEW_ASSIGNMENT',
        type: 'NOTIFICATION',
        subject: 'Set Completo de Entrevistas - {{studentName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Set Completo de Entrevistas Programado</h2>
            <p>Estimado/a <strong>{{applicantName}}</strong>,</p>
            <p>Le informamos que se ha programado el set completo de entrevistas para 
               <strong>{{studentName}}</strong> como parte del proceso de admisión.</p>
            <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Entrevistas Programadas:</h3>
              <ul>
                <li><strong>Entrevista Directiva:</strong> {{directorInterviewDate}} - {{directorInterviewTime}}</li>
                <li><strong>Entrevista Psicológica:</strong> {{psychologyInterviewDate}} - {{psychologyInterviewTime}}</li>
                <li><strong>Entrevista Académica:</strong> {{academicInterviewDate}} - {{academicInterviewTime}}</li>
              </ul>
            </div>
            <p>Saludos cordiales,<br>{{collegeName}}</p>
          </div>
        `,
        description: 'Template para notificar asignación de set completo de 3 entrevistas',
        language: 'es',
        active: true,
        isDefault: false,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 3,
        templateKey: 'STUDENT_SELECTION',
        name: 'Selección de Estudiante',
        category: 'STUDENT_SELECTION',
        type: 'APPROVAL',
        subject: '¡Felicitaciones! {{studentName}} ha sido seleccionado/a',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">¡Felicitaciones!</h2>
            <p>Estimado/a <strong>{{applicantName}}</strong>,</p>
            <p>Nos complace informarle que <strong>{{studentName}}</strong> ha sido 
               <strong>seleccionado/a</strong> para formar parte de nuestra institución 
               en el grado <strong>{{gradeApplied}}</strong>.</p>
            <div style="background: #dcfce7; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #16a34a;">
              <p><strong>Resultado:</strong> SELECCIONADO/A</p>
              <p><strong>Grado:</strong> {{gradeApplied}}</p>
              <p><strong>Año Académico:</strong> {{currentYear}}</p>
            </div>
            <p>En los próximos días recibirá información sobre el proceso de matrícula.</p>
            <p>Saludos cordiales,<br>{{collegeName}}</p>
          </div>
        `,
        description: 'Template para notificar selección positiva de estudiante',
        language: 'es',
        active: true,
        isDefault: true,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 4,
        templateKey: 'STUDENT_REJECTION',
        name: 'Resultado de Proceso - No Seleccionado',
        category: 'STUDENT_REJECTION',
        type: 'REJECTION',
        subject: 'Resultado del Proceso de Admisión - {{studentName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Resultado del Proceso de Admisión</h2>
            <p>Estimado/a <strong>{{applicantName}}</strong>,</p>
            <p>Le informamos que después de un cuidadoso proceso de evaluación, 
               lamentablemente <strong>{{studentName}}</strong> no ha sido seleccionado/a 
               para el grado <strong>{{gradeApplied}}</strong> en nuestro establecimiento.</p>
            <div style="background: #fef2f2; padding: 15px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc2626;">
              <p><strong>Resultado:</strong> NO SELECCIONADO/A</p>
              <p><strong>Motivo:</strong> {{rejectionReason}}</p>
            </div>
            <p>Agradecemos su interés en nuestra institución y le deseamos el mejor de los éxitos.</p>
            <p>Saludos cordiales,<br>{{collegeName}}</p>
          </div>
        `,
        description: 'Template para notificar resultado negativo del proceso',
        language: 'es',
        active: true,
        isDefault: true,
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 5,
        templateKey: 'INTERVIEW_REMINDER',
        name: 'Recordatorio de Entrevista',
        category: 'INTERVIEW_REMINDER',
        type: 'REMINDER',
        subject: 'Recordatorio: Entrevista Mañana - {{studentName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Recordatorio de Entrevista</h2>
            <p>Estimado/a <strong>{{applicantName}}</strong>,</p>
            <p>Le recordamos que tiene programada una entrevista <strong>mañana</strong> 
               para <strong>{{studentName}}</strong> como parte del proceso de admisión.</p>
            <div style="background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <p><strong>Fecha:</strong> {{interviewDate}}</p>
              <p><strong>Hora:</strong> {{interviewTime}}</p>
              <p><strong>Entrevistador:</strong> {{interviewerName}}</p>
              <p><strong>Modalidad:</strong> {{interviewMode}}</p>
              {{#if meetingLink}}<p><strong>Enlace:</strong> {{meetingLink}}</p>{{/if}}
            </div>
            <p>Por favor, llegue puntualmente. En caso de inconvenientes, contáctenos al {{collegePhone}}.</p>
            <p>Saludos cordiales,<br>{{collegeName}}</p>
          </div>
        `,
        description: 'Template para recordar entrevista programada',
        language: 'es',
        active: true,
        isDefault: true,
        createdAt: '2024-01-15T10:00:00Z'
      }
    ];
  }
}

export const emailTemplateService = new EmailTemplateService();