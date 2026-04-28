// Servicio de Recordatorios WhatsApp/SMS para Entrevistas
import { Interview } from '../types/interview';

export interface WhatsAppConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  phoneNumberId: string;
  accessToken: string;
}

export interface SMSConfig {
  enabled: boolean;
  provider: 'twilio' | 'aws-sns' | 'custom';
  apiKey: string;
  apiSecret: string;
  fromNumber: string;
}

export interface ReminderMessage {
  id: string;
  interviewId: number;
  recipientPhone: string;
  recipientName: string;
  messageType: 'whatsapp' | 'sms';
  templateId: string;
  message: string;
  scheduledFor: Date;
  sentAt?: Date;
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  errorMessage?: string;
  reminderType: '24h' | '2h' | '30m' | 'confirmation' | 'rescheduled' | 'cancelled';
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'whatsapp' | 'sms';
  reminderType: ReminderMessage['reminderType'];
  template: string;
  variables: string[];
  isDefault: boolean;
}

class WhatsAppSMSService {
  private whatsappConfig: WhatsAppConfig = {
    enabled: false,
    apiUrl: 'https://graph.facebook.com/v18.0',
    apiKey: '',
    phoneNumberId: '',
    accessToken: ''
  };

  private smsConfig: SMSConfig = {
    enabled: false,
    provider: 'twilio',
    apiKey: '',
    apiSecret: '',
    fromNumber: ''
  };

  private scheduledReminders: Map<string, NodeJS.Timeout> = new Map();
  private messageHistory: ReminderMessage[] = [];

  // Templates predefinidos
  private messageTemplates: MessageTemplate[] = [
    {
      id: 'whatsapp_24h',
      name: 'Recordatorio 24 horas - WhatsApp',
      type: 'whatsapp',
      reminderType: '24h',
      template: `🏫 *Colegio Monte Tabor y Nazaret*

¡Hola {{parentNames}}! 👋

Te recordamos que mañana tienes programada la entrevista de admisión para {{studentName}}.

📅 *Detalles de la entrevista:*
• Fecha: {{interviewDate}}
• Hora: {{interviewTime}}
• Modalidad: {{interviewMode}}
{{#if isVirtual}}• Enlace: {{meetingLink}}{{/if}}
{{#if isInPerson}}• Lugar: {{location}}{{/if}}
• Entrevistador(a): {{interviewerName}}

📝 *Recuerda traer:*
• Documentos de identidad
• Certificados académicos
• Cualquier documento solicitado previamente

Si necesitas reprogramar, contáctanos al +56 2 2345 6789

¡Te esperamos! 😊`,
      variables: ['parentNames', 'studentName', 'interviewDate', 'interviewTime', 'interviewMode', 'meetingLink', 'location', 'interviewerName'],
      isDefault: true
    },
    {
      id: 'sms_24h',
      name: 'Recordatorio 24 horas - SMS',
      type: 'sms',
      reminderType: '24h',
      template: `Colegio MTN: Recordatorio entrevista para {{studentName}} mañana {{interviewDate}} a las {{interviewTime}}. {{#if isVirtual}}Enlace: {{meetingLink}}{{/if}} Info: +56223456789`,
      variables: ['studentName', 'interviewDate', 'interviewTime', 'meetingLink'],
      isDefault: true
    },
    {
      id: 'whatsapp_2h',
      name: 'Recordatorio 2 horas - WhatsApp',
      type: 'whatsapp',
      reminderType: '2h',
      template: `🏫 *Recordatorio Urgente*

¡Hola {{parentNames}}! 

Tu entrevista para {{studentName}} es en 2 horas ⏰

🕐 {{interviewTime}} - {{interviewMode}}
{{#if isVirtual}}📞 {{meetingLink}}{{/if}}
{{#if isInPerson}}📍 {{location}}{{/if}}

¡Te esperamos!`,
      variables: ['parentNames', 'studentName', 'interviewTime', 'interviewMode', 'meetingLink', 'location'],
      isDefault: true
    },
    {
      id: 'sms_2h',
      name: 'Recordatorio 2 horas - SMS',
      type: 'sms',
      reminderType: '2h',
      template: `URGENTE: Entrevista {{studentName}} en 2 horas ({{interviewTime}}). {{#if isVirtual}}{{meetingLink}}{{/if}} Colegio MTN`,
      variables: ['studentName', 'interviewTime', 'meetingLink'],
      isDefault: true
    },
    {
      id: 'whatsapp_confirmation',
      name: 'Confirmación de entrevista - WhatsApp',
      type: 'whatsapp',
      reminderType: 'confirmation',
      template: `🎉 *¡Entrevista Confirmada!*

Hola {{parentNames}}, 

Hemos confirmado tu entrevista para {{studentName}}:

📅 {{interviewDate}} a las {{interviewTime}}
👩‍🏫 Entrevistador(a): {{interviewerName}}
{{#if isVirtual}}💻 Enlace: {{meetingLink}}{{/if}}
{{#if isInPerson}}📍 Ubicación: {{location}}{{/if}}

Recibirás recordatorios antes de la cita.

¡Estamos emocionados de conocer a {{studentName}}! 🌟`,
      variables: ['parentNames', 'studentName', 'interviewDate', 'interviewTime', 'interviewerName', 'meetingLink', 'location'],
      isDefault: true
    },
    {
      id: 'whatsapp_cancelled',
      name: 'Entrevista cancelada - WhatsApp',
      type: 'whatsapp',
      reminderType: 'cancelled',
      template: `❌ *Entrevista Cancelada*

Hola {{parentNames}},

Lamentamos informarte que la entrevista de {{studentName}} programada para el {{interviewDate}} ha sido cancelada.

{{#if reason}}Motivo: {{reason}}{{/if}}

Nos pondremos en contacto contigo pronto para reprogramar.

Disculpas por las molestias.

📞 Contacto: +56 2 2345 6789`,
      variables: ['parentNames', 'studentName', 'interviewDate', 'reason'],
      isDefault: true
    }
  ];

  // Configurar servicios
  configureWhatsApp(config: Partial<WhatsAppConfig>): void {
    this.whatsappConfig = { ...this.whatsappConfig, ...config };
  }

  configureSMS(config: Partial<SMSConfig>): void {
    this.smsConfig = { ...this.smsConfig, ...config };
  }

  // Programar recordatorios automáticos para una entrevista
  scheduleReminders(interview: Interview, parentPhone: string): string[] {
    const reminderIds: string[] = [];
    const interviewDateTime = new Date(`${interview.scheduledDate}T${interview.scheduledTime}`);
    const now = new Date();

    // Recordatorio 24 horas antes
    const reminder24h = new Date(interviewDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > now) {
      const reminder24hId = this.scheduleReminder(
        interview,
        parentPhone,
        '24h',
        reminder24h
      );
      if (reminder24hId) reminderIds.push(reminder24hId);
    }

    // Recordatorio 2 horas antes
    const reminder2h = new Date(interviewDateTime.getTime() - 2 * 60 * 60 * 1000);
    if (reminder2h > now) {
      const reminder2hId = this.scheduleReminder(
        interview,
        parentPhone,
        '2h',
        reminder2h
      );
      if (reminder2hId) reminderIds.push(reminder2hId);
    }

    // Recordatorio 30 minutos antes (solo WhatsApp para no ser intrusivo)
    const reminder30m = new Date(interviewDateTime.getTime() - 30 * 60 * 1000);
    if (reminder30m > now && this.whatsappConfig.enabled) {
      const reminder30mId = this.scheduleReminder(
        interview,
        parentPhone,
        '30m',
        reminder30m,
        'whatsapp'
      );
      if (reminder30mId) reminderIds.push(reminder30mId);
    }

    return reminderIds;
  }

  // Programar un recordatorio específico
  private scheduleReminder(
    interview: Interview,
    parentPhone: string,
    reminderType: ReminderMessage['reminderType'],
    scheduledFor: Date,
    preferredMethod?: 'whatsapp' | 'sms'
  ): string | null {
    const reminderId = `${interview.id}_${reminderType}_${Date.now()}`;
    
    // Determinar método de envío
    const messageType = preferredMethod || this.getPreferredMessageType();
    
    // Crear mensaje programado
    const reminder: ReminderMessage = {
      id: reminderId,
      interviewId: interview.id,
      recipientPhone: parentPhone,
      recipientName: interview.parentNames,
      messageType,
      templateId: `${messageType}_${reminderType}`,
      message: this.generateMessage(interview, messageType, reminderType),
      scheduledFor,
      status: 'scheduled',
      reminderType
    };

    // Agregar a historial
    this.messageHistory.push(reminder);

    // Programar envío
    const timeUntilSend = scheduledFor.getTime() - Date.now();
    if (timeUntilSend > 0) {
      const timeout = setTimeout(() => {
        this.sendScheduledReminder(reminderId);
      }, timeUntilSend);

      this.scheduledReminders.set(reminderId, timeout);
    }

    return reminderId;
  }

  // Enviar recordatorio programado
  private async sendScheduledReminder(reminderId: string): Promise<void> {
    const reminder = this.messageHistory.find(r => r.id === reminderId);
    if (!reminder) return;

    try {
      reminder.status = 'sent';
      reminder.sentAt = new Date();

      if (reminder.messageType === 'whatsapp') {
        await this.sendWhatsAppMessage(reminder.recipientPhone, reminder.message);
      } else {
        await this.sendSMSMessage(reminder.recipientPhone, reminder.message);
      }

      // Simular confirmación de entrega después de 30 segundos
      setTimeout(() => {
        reminder.status = 'delivered';
      }, 30000);

    } catch (error: any) {
      reminder.status = 'failed';
      reminder.errorMessage = error.message;
      console.error(`Error enviando recordatorio ${reminderId}:`, error);
    } finally {
      // Limpiar timeout programado
      this.scheduledReminders.delete(reminderId);
    }
  }

  // Enviar confirmación inmediata de entrevista
  async sendInterviewConfirmation(interview: Interview, parentPhone: string): Promise<void> {
    const messageType = this.getPreferredMessageType();
    const message = this.generateMessage(interview, messageType, 'confirmation');

    const confirmation: ReminderMessage = {
      id: `${interview.id}_confirmation_${Date.now()}`,
      interviewId: interview.id,
      recipientPhone: parentPhone,
      recipientName: interview.parentNames,
      messageType,
      templateId: `${messageType}_confirmation`,
      message,
      scheduledFor: new Date(),
      status: 'sent',
      sentAt: new Date(),
      reminderType: 'confirmation'
    };

    this.messageHistory.push(confirmation);

    try {
      if (messageType === 'whatsapp') {
        await this.sendWhatsAppMessage(parentPhone, message);
      } else {
        await this.sendSMSMessage(parentPhone, message);
      }
      confirmation.status = 'delivered';
    } catch (error: any) {
      confirmation.status = 'failed';
      confirmation.errorMessage = error.message;
      throw error;
    }
  }

  // Notificar cancelación de entrevista
  async sendCancellationNotice(
    interview: Interview, 
    parentPhone: string, 
    reason?: string
  ): Promise<void> {
    const messageType = this.getPreferredMessageType();
    const message = this.generateMessage(interview, messageType, 'cancelled', { reason });

    const cancellation: ReminderMessage = {
      id: `${interview.id}_cancelled_${Date.now()}`,
      interviewId: interview.id,
      recipientPhone: parentPhone,
      recipientName: interview.parentNames,
      messageType,
      templateId: `${messageType}_cancelled`,
      message,
      scheduledFor: new Date(),
      status: 'sent',
      sentAt: new Date(),
      reminderType: 'cancelled'
    };

    this.messageHistory.push(cancellation);

    // Cancelar recordatorios programados para esta entrevista
    this.cancelScheduledReminders(interview.id);

    try {
      if (messageType === 'whatsapp') {
        await this.sendWhatsAppMessage(parentPhone, message);
      } else {
        await this.sendSMSMessage(parentPhone, message);
      }
      cancellation.status = 'delivered';
    } catch (error: any) {
      cancellation.status = 'failed';
      cancellation.errorMessage = error.message;
      throw error;
    }
  }

  // Generar mensaje usando template
  private generateMessage(
    interview: Interview,
    messageType: 'whatsapp' | 'sms',
    reminderType: ReminderMessage['reminderType'],
    extraData?: Record<string, any>
  ): string {
    const templateId = `${messageType}_${reminderType}`;
    const template = this.messageTemplates.find(t => t.id === templateId);
    
    if (!template) {
      return `Recordatorio: Entrevista para ${interview.studentName} el ${interview.scheduledDate} a las ${interview.scheduledTime}`;
    }

    // Variables para reemplazo
    const variables = {
      parentNames: interview.parentNames,
      studentName: interview.studentName,
      interviewDate: new Date(interview.scheduledDate).toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      interviewTime: interview.scheduledTime,
      interviewMode: interview.mode === 'VIRTUAL' ? 'Virtual' : 'Presencial',
      isVirtual: interview.mode === 'VIRTUAL',
      isInPerson: interview.mode === 'IN_PERSON',
      meetingLink: interview.virtualMeetingLink || 'Se enviará por separado',
      location: interview.location || 'Colegio Monte Tabor y Nazaret',
      interviewerName: interview.interviewerName,
      collegeName: 'Colegio Monte Tabor y Nazaret',
      collegePhone: '+56 2 2345 6789',
      ...extraData
    };

    return this.processTemplate(template.template, variables);
  }

  // Procesar template con variables
  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;

    // Reemplazar variables simples
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value || '');
    });

    // Procesar condicionales simples
    processed = processed.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    return processed.trim();
  }

  // Enviar mensaje WhatsApp
  private async sendWhatsAppMessage(phone: string, message: string): Promise<void> {
    if (!this.whatsappConfig.enabled || !this.whatsappConfig.accessToken) {
      throw new Error('WhatsApp no está configurado');
    }

    const formattedPhone = this.formatPhoneNumber(phone);
    
    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: { body: message }
    };

    const response = await fetch(
      `${this.whatsappConfig.apiUrl}/${this.whatsappConfig.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.whatsappConfig.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error WhatsApp: ${error}`);
    }
  }

  // Enviar SMS
  private async sendSMSMessage(phone: string, message: string): Promise<void> {
    if (!this.smsConfig.enabled) {
      throw new Error('SMS no está configurado');
    }

    const formattedPhone = this.formatPhoneNumber(phone);

    switch (this.smsConfig.provider) {
      case 'twilio':
        await this.sendTwilioSMS(formattedPhone, message);
        break;
      case 'aws-sns':
        await this.sendAWSSMS(formattedPhone, message);
        break;
      default:
        throw new Error('Proveedor SMS no soportado');
    }
  }

  // Enviar SMS via Twilio
  private async sendTwilioSMS(phone: string, message: string): Promise<void> {
    const auth = btoa(`${this.smsConfig.apiKey}:${this.smsConfig.apiSecret}`);
    
    const payload = new URLSearchParams({
      To: phone,
      From: this.smsConfig.fromNumber,
      Body: message
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.smsConfig.apiKey}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error Twilio: ${error}`);
    }
  }

  // Enviar SMS via AWS SNS
  private async sendAWSSMS(phone: string, message: string): Promise<void> {
    // Implementación AWS SNS requeriría AWS SDK
    console.log('AWS SNS no implementado aún');
    throw new Error('AWS SNS no disponible');
  }

  // Formatear número de teléfono
  private formatPhoneNumber(phone: string): string {
    // Remover caracteres no numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Agregar código de país si no existe
    if (!cleaned.startsWith('56') && cleaned.length === 9) {
      cleaned = '56' + cleaned;
    }
    
    return '+' + cleaned;
  }

  // Determinar método preferido de envío
  private getPreferredMessageType(): 'whatsapp' | 'sms' {
    if (this.whatsappConfig.enabled) return 'whatsapp';
    if (this.smsConfig.enabled) return 'sms';
    return 'sms'; // fallback
  }

  // Cancelar recordatorios programados para una entrevista
  cancelScheduledReminders(interviewId: number): void {
    const toCancel = Array.from(this.scheduledReminders.keys())
      .filter(id => id.startsWith(`${interviewId}_`));

    toCancel.forEach(id => {
      const timeout = this.scheduledReminders.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.scheduledReminders.delete(id);
      }

      // Marcar como cancelado en historial
      const reminder = this.messageHistory.find(r => r.id === id);
      if (reminder && reminder.status === 'scheduled') {
        reminder.status = 'cancelled';
      }
    });
  }

  // Obtener historial de mensajes
  getMessageHistory(): ReminderMessage[] {
    return [...this.messageHistory];
  }

  // Obtener estadísticas de envío
  getDeliveryStats(): {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  } {
    const total = this.messageHistory.length;
    const sent = this.messageHistory.filter(m => m.status === 'sent' || m.status === 'delivered').length;
    const delivered = this.messageHistory.filter(m => m.status === 'delivered').length;
    const failed = this.messageHistory.filter(m => m.status === 'failed').length;
    
    return {
      total,
      sent,
      delivered,
      failed,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0
    };
  }

  // Verificar configuración
  isConfigured(): { whatsapp: boolean; sms: boolean; anyEnabled: boolean } {
    const whatsapp = this.whatsappConfig.enabled && !!this.whatsappConfig.accessToken;
    const sms = this.smsConfig.enabled && !!this.smsConfig.apiKey;
    
    return {
      whatsapp,
      sms,
      anyEnabled: whatsapp || sms
    };
  }
}

// Instancia singleton
export const whatsappSmsService = new WhatsAppSMSService();

export default whatsappSmsService;