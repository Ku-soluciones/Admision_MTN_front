import api from './api';

export interface NotificationConfig {
  id: number;
  event_type: string;
  event_name: string;
  description?: string;
  enabled: boolean;

  // Canales
  send_email: boolean;
  send_sms: boolean;
  send_push: boolean;

  // Destinatarios
  notify_applicant: boolean;
  notify_admin: boolean;
  notify_coordinator: boolean;
  notify_evaluator: boolean;
  custom_recipients?: string;

  // Template y timing
  email_template_key?: string;
  send_immediately: boolean;
  delay_minutes: number;

  created_at: string;
  updated_at?: string;
}

export interface NotificationConfigResponse {
  success: boolean;
  data: NotificationConfig[];
  total: number;
  message?: string;
}

export interface SingleNotificationConfigResponse {
  success: boolean;
  data: NotificationConfig;
  message?: string;
}

export class NotificationConfigService {
  private baseUrl = '/v1/notifications/config';

  /**
   * Get all notification configurations
   */
  async getAllConfigs(): Promise<NotificationConfig[]> {
    try {
      const response = await api.get<NotificationConfigResponse>(this.baseUrl);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error fetching notification configs:', error);
      throw new Error(error.response?.data?.error || 'Error al obtener configuraciones de notificaciones');
    }
  }

  /**
   * Get single notification configuration by event type
   */
  async getConfigByEventType(eventType: string): Promise<NotificationConfig> {
    try {
      const response = await api.get<SingleNotificationConfigResponse>(`${this.baseUrl}/${eventType}`);
      return response.data.data;
    } catch (error: any) {
      console.error(`❌ Error fetching config for ${eventType}:`, error);
      throw new Error(error.response?.data?.error || 'Error al obtener configuración de notificación');
    }
  }

  /**
   * Update notification configuration
   */
  async updateConfig(id: number, updates: Partial<NotificationConfig>): Promise<NotificationConfig> {
    try {
      const response = await api.put<SingleNotificationConfigResponse>(`${this.baseUrl}/${id}`, updates);
      return response.data.data;
    } catch (error: any) {
      console.error(`❌ Error updating config ${id}:`, error);
      throw new Error(error.response?.data?.error || 'Error al actualizar configuración de notificación');
    }
  }

  /**
   * Create new notification configuration
   */
  async createConfig(config: Omit<NotificationConfig, 'id' | 'created_at' | 'updated_at'>): Promise<NotificationConfig> {
    try {
      const response = await api.post<SingleNotificationConfigResponse>(this.baseUrl, config);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error creating config:', error);
      throw new Error(error.response?.data?.error || 'Error al crear configuración de notificación');
    }
  }

  /**
   * Delete notification configuration
   */
  async deleteConfig(id: number): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
    } catch (error: any) {
      console.error(`❌ Error deleting config ${id}:`, error);
      throw new Error(error.response?.data?.error || 'Error al eliminar configuración de notificación');
    }
  }

  /**
   * Toggle notification configuration enabled/disabled
   */
  async toggleConfig(id: number): Promise<NotificationConfig> {
    try {
      const response = await api.patch<SingleNotificationConfigResponse>(`${this.baseUrl}/${id}/toggle`);
      return response.data.data;
    } catch (error: any) {
      console.error(`❌ Error toggling config ${id}:`, error);
      throw new Error(error.response?.data?.error || 'Error al cambiar estado de configuración');
    }
  }
}

export const notificationConfigService = new NotificationConfigService();
export default notificationConfigService;
