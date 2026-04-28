import api from './api';

export interface QueueStatistics {
  pendingEmails: number;
  emailsSentThisHour: number;
  emailsSentThisDay: number;
  emailsSentThisMonth: number;
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
  maxEmailsPerMonth: number;
  queueByType: Record<string, number>;
}

export interface EmailResponse {
  success: boolean;
  message: string;
  queueId?: string;
}

export interface StatisticsResponse {
  success: boolean;
  data: QueueStatistics;
}

class InstitutionalEmailService {
  private baseUrl = '/v1/institutional-emails';
  private adminBaseUrl = '/v1/admin/email-management';

  /**
   * Enviar email de aplicación recibida
   */
  async sendApplicationReceivedEmail(applicationId: number): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/application-received/${applicationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error sending application received email:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando email de aplicación recibida'
      };
    }
  }

  /**
   * Enviar invitación a entrevista
   */
  async sendInterviewInvitationEmail(interviewId: number): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/interview-invitation/${interviewId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error sending interview invitation email:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando invitación a entrevista'
      };
    }
  }

  /**
   * Enviar actualización de estado
   */
  async sendStatusUpdateEmail(applicationId: number, data: { newStatus: string }): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/status-update/${applicationId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending status update email:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando actualización de estado'
      };
    }
  }

  /**
   * Enviar recordatorio de documentos
   */
  async sendDocumentReminderEmail(applicationId: number, data: { pendingDocuments: string }): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/document-reminder/${applicationId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending document reminder email:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando recordatorio de documentos'
      };
    }
  }

  /**
   * Enviar resultado de admisión
   */
  async sendAdmissionResultEmail(applicationId: number, data: { result: string; message?: string }): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/admission-result/${applicationId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending admission result email:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando resultado de admisión'
      };
    }
  }

  /**
   * Enviar notificación sobre revisión de documentos
   */
  async sendDocumentReviewEmail(
    applicationId: number,
    data: {
      approvedDocuments: string[];
      rejectedDocuments: string[];
      allApproved: boolean;
    }
  ): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/document-review/${applicationId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending document review email:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando notificación de revisión de documentos'
      };
    }
  }

  /**
   * Obtener estadísticas de la cola
   */
  async getQueueStatistics(): Promise<StatisticsResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/queue/statistics`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting queue statistics:', error);
      return {
        success: false,
        data: {
          pendingEmails: 0,
          emailsSentThisHour: 0,
          emailsSentThisDay: 0,
          emailsSentThisMonth: 0,
          maxEmailsPerHour: 50,
          maxEmailsPerDay: 200,
          maxEmailsPerMonth: 5000,
          queueByType: {}
        }
      };
    }
  }

  /**
   * Forzar procesamiento de cola
   */
  async forceProcessQueue(): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/queue/process`);
      return response.data;
    } catch (error: any) {
      console.error('Error forcing queue process:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error procesando cola'
      };
    }
  }

  /**
   * Limpiar cola
   */
  async clearQueue(): Promise<EmailResponse> {
    try {
      const response = await api.delete(`${this.baseUrl}/queue/clear`);
      return response.data;
    } catch (error: any) {
      console.error('Error clearing queue:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error limpiando cola'
      };
    }
  }

  /**
   * Obtener estado del sistema de emails
   */
  async getSystemStatus(): Promise<any> {
    try {
      const response = await api.get(`${this.adminBaseUrl}/status`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting system status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error obteniendo estado del sistema'
      };
    }
  }

  /**
   * Enviar email de prueba
   */
  async sendTestEmail(email: string): Promise<EmailResponse> {
    try {
      const response = await api.post(`${this.adminBaseUrl}/test?email=${email}`);
      return response.data;
    } catch (error: any) {
      console.error('Error sending test email:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error enviando email de prueba'
      };
    }
  }

  /**
   * Obtener límites del sistema
   */
  getSystemLimits() {
    return {
      maxEmailsPerHour: 50,
      maxEmailsPerDay: 200,
      maxEmailsPerMonth: 5000,
      description: 'Sistema optimizado para 1000-5000 emails mensuales con SMTP institucional'
    };
  }

  /**
   * Validar si se puede enviar más emails
   */
  canSendMoreEmails(stats: QueueStatistics): { canSend: boolean; reason?: string } {
    if (stats.emailsSentThisHour >= stats.maxEmailsPerHour) {
      return {
        canSend: false,
        reason: 'Límite horario alcanzado'
      };
    }

    if (stats.emailsSentThisDay >= stats.maxEmailsPerDay) {
      return {
        canSend: false,
        reason: 'Límite diario alcanzado'
      };
    }

    if (stats.emailsSentThisMonth >= stats.maxEmailsPerMonth) {
      return {
        canSend: false,
        reason: 'Límite mensual alcanzado'
      };
    }

    if (stats.pendingEmails > 50) {
      return {
        canSend: false,
        reason: 'Demasiados emails en cola'
      };
    }

    return { canSend: true };
  }

  /**
   * Calcular tiempo estimado para envío
   */
  estimateDeliveryTime(stats: QueueStatistics): string {
    const queuePosition = stats.pendingEmails;
    const emailsPerMinute = 30; // 2 segundos por email + procesamiento
    
    if (queuePosition === 0) {
      return 'Inmediato';
    }

    const minutes = Math.ceil(queuePosition / emailsPerMinute);
    
    if (minutes < 60) {
      return `~${minutes} minutos`;
    }
    
    const hours = Math.ceil(minutes / 60);
    return `~${hours} horas`;
  }

  /**
   * Obtener recomendaciones de uso
   */
  getUsageRecommendations(stats: QueueStatistics): string[] {
    const recommendations: string[] = [];
    
    const hourlyUsage = (stats.emailsSentThisHour / stats.maxEmailsPerHour) * 100;
    const dailyUsage = (stats.emailsSentThisDay / stats.maxEmailsPerDay) * 100;
    const monthlyUsage = (stats.emailsSentThisMonth / stats.maxEmailsPerMonth) * 100;

    if (hourlyUsage > 80) {
      recommendations.push('Considere espaciar los envíos para evitar límites horarios');
    }

    if (dailyUsage > 70) {
      recommendations.push('Alto uso diario. Programe envíos para mañana si no son urgentes');
    }

    if (monthlyUsage > 90) {
      recommendations.push('ATENCIÓN: Cerca del límite mensual. Evalúe migrar a plan superior');
    }

    if (stats.pendingEmails > 20) {
      recommendations.push('Cola grande detectada. Los emails pueden tardar más en enviarse');
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistema funcionando óptimamente');
    }

    return recommendations;
  }
}

export const institutionalEmailService = new InstitutionalEmailService();
export default institutionalEmailService;