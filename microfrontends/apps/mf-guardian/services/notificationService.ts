// Sistema de Notificaciones Push en Tiempo Real para Entrevistas
import React from 'react';
import { Interview, InterviewStatus } from '../types/interview';

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: 'interview_scheduled' | 'interview_reminder' | 'interview_cancelled' | 'interview_completed' | 'interview_updated';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data: {
    interviewId?: number;
    applicationId?: number;
    studentName?: string;
    scheduledDate?: string;
    scheduledTime?: string;
  };
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  title: string;
  action: 'view' | 'edit' | 'confirm' | 'cancel' | 'reschedule';
  url?: string;
}

class NotificationService {
  private notifications: PushNotification[] = [];
  private listeners: ((notifications: PushNotification[]) => void)[] = [];
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
    this.loadStoredNotifications();
  }

  // Verificar permisos de notificación del navegador
  async checkPermission(): Promise<void> {
    if ('Notification' in window) {
      this.permission = await Notification.requestPermission();
    }
  }

  // Registrar listener para cambios en notificaciones
  subscribe(callback: (notifications: PushNotification[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notificar a todos los listeners
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback([...this.notifications]));
    this.storeNotifications();
  }

  // Crear notificación para entrevista programada
  notifyInterviewScheduled(interview: Interview): void {
    const notification: PushNotification = {
      id: `interview_scheduled_${interview.id}_${Date.now()}`,
      title: '📅 Nueva Entrevista Programada',
      message: `Entrevista programada para ${interview.studentName} el ${new Date(interview.scheduledDate).toLocaleDateString('es-CL')} a las ${interview.scheduledTime}`,
      type: 'interview_scheduled',
      priority: 'high',
      data: {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        studentName: interview.studentName,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime
      },
      timestamp: new Date().toISOString(),
      read: false,
      actions: [
        { id: 'view', title: 'Ver Detalles', action: 'view', url: `/admin/entrevistas/${interview.id}` },
        { id: 'edit', title: 'Editar', action: 'edit' }
      ]
    };

    this.addNotification(notification);
    this.showBrowserNotification(notification);
  }

  // Crear notificación de recordatorio
  notifyInterviewReminder(interview: Interview, hoursUntil: number): void {
    const urgency = hoursUntil <= 2 ? 'urgent' : hoursUntil <= 24 ? 'high' : 'normal';
    const timeText = hoursUntil <= 2 ? `${hoursUntil} horas` : `${Math.floor(hoursUntil / 24)} días`;
    
    const notification: PushNotification = {
      id: `interview_reminder_${interview.id}_${hoursUntil}h_${Date.now()}`,
      title: '⏰ Recordatorio de Entrevista',
      message: `Entrevista con ${interview.studentName} en ${timeText}`,
      type: 'interview_reminder',
      priority: urgency,
      data: {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        studentName: interview.studentName,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime
      },
      timestamp: new Date().toISOString(),
      read: false,
      actions: [
        { id: 'view', title: 'Ver Entrevista', action: 'view' },
        { id: 'confirm', title: 'Confirmar', action: 'confirm' }
      ]
    };

    this.addNotification(notification);
    this.showBrowserNotification(notification);
  }

  // Notificar cancelación de entrevista
  notifyInterviewCancelled(interview: Interview, reason?: string): void {
    const notification: PushNotification = {
      id: `interview_cancelled_${interview.id}_${Date.now()}`,
      title: '❌ Entrevista Cancelada',
      message: `La entrevista con ${interview.studentName} ha sido cancelada${reason ? `: ${reason}` : ''}`,
      type: 'interview_cancelled',
      priority: 'high',
      data: {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        studentName: interview.studentName
      },
      timestamp: new Date().toISOString(),
      read: false,
      actions: [
        { id: 'reschedule', title: 'Reprogramar', action: 'reschedule' }
      ]
    };

    this.addNotification(notification);
    this.showBrowserNotification(notification);
  }

  // Notificar entrevista completada
  notifyInterviewCompleted(interview: Interview): void {
    const notification: PushNotification = {
      id: `interview_completed_${interview.id}_${Date.now()}`,
      title: '✅ Entrevista Completada',
      message: `Entrevista con ${interview.studentName} completada exitosamente`,
      type: 'interview_completed',
      priority: 'normal',
      data: {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        studentName: interview.studentName
      },
      timestamp: new Date().toISOString(),
      read: false,
      actions: [
        { id: 'view', title: 'Ver Resultado', action: 'view' }
      ]
    };

    this.addNotification(notification);
    this.showBrowserNotification(notification);
  }

  // Notificar actualización de entrevista
  notifyInterviewUpdated(interview: Interview, changes: string[]): void {
    const notification: PushNotification = {
      id: `interview_updated_${interview.id}_${Date.now()}`,
      title: '🔄 Entrevista Actualizada',
      message: `Entrevista con ${interview.studentName} ha sido modificada: ${changes.join(', ')}`,
      type: 'interview_updated',
      priority: 'normal',
      data: {
        interviewId: interview.id,
        applicationId: interview.applicationId,
        studentName: interview.studentName,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime
      },
      timestamp: new Date().toISOString(),
      read: false,
      actions: [
        { id: 'view', title: 'Ver Cambios', action: 'view' }
      ]
    };

    this.addNotification(notification);
    this.showBrowserNotification(notification);
  }

  // Agregar notificación a la lista
  private addNotification(notification: PushNotification): void {
    this.notifications.unshift(notification);
    // Mantener solo las últimas 50 notificaciones
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    this.notifyListeners();
  }

  // Mostrar notificación del navegador
  private showBrowserNotification(notification: PushNotification): void {
    if (this.permission === 'granted' && 'Notification' in window) {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        actions: notification.actions?.slice(0, 2).map(action => ({
          action: action.id,
          title: action.title
        }))
      });

      // Auto-cerrar después de 10 segundos (excepto urgentes)
      if (notification.priority !== 'urgent') {
        setTimeout(() => {
          browserNotification.close();
        }, 10000);
      }

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actions?.[0]?.url) {
          window.location.href = notification.actions[0].url;
        }
        browserNotification.close();
      };
    }
  }

  // Marcar notificación como leída
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Marcar todas como leídas
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  // Eliminar notificación
  removeNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
  }

  // Limpiar todas las notificaciones
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  // Obtener notificaciones no leídas
  getUnreadNotifications(): PushNotification[] {
    return this.notifications.filter(n => !n.read);
  }

  // Obtener count de no leídas
  getUnreadCount(): number {
    return this.getUnreadNotifications().length;
  }

  // Obtener todas las notificaciones
  getAllNotifications(): PushNotification[] {
    return [...this.notifications];
  }

  // Obtener notificaciones por tipo
  getNotificationsByType(type: PushNotification['type']): PushNotification[] {
    return this.notifications.filter(n => n.type === type);
  }

  // Programar recordatorios automáticos
  scheduleReminders(interview: Interview): void {
    const interviewDateTime = new Date(`${interview.scheduledDate}T${interview.scheduledTime}`);
    const now = new Date();

    // Recordatorio 24 horas antes
    const reminderTime24h = new Date(interviewDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminderTime24h > now) {
      const timeUntil24h = reminderTime24h.getTime() - now.getTime();
      setTimeout(() => {
        this.notifyInterviewReminder(interview, 24);
      }, timeUntil24h);
    }

    // Recordatorio 2 horas antes
    const reminderTime2h = new Date(interviewDateTime.getTime() - 2 * 60 * 60 * 1000);
    if (reminderTime2h > now) {
      const timeUntil2h = reminderTime2h.getTime() - now.getTime();
      setTimeout(() => {
        this.notifyInterviewReminder(interview, 2);
      }, timeUntil2h);
    }

    // Recordatorio 30 minutos antes (solo para urgente)
    const reminderTime30m = new Date(interviewDateTime.getTime() - 30 * 60 * 1000);
    if (reminderTime30m > now) {
      const timeUntil30m = reminderTime30m.getTime() - now.getTime();
      setTimeout(() => {
        this.notifyInterviewReminder(interview, 0.5);
      }, timeUntil30m);
    }
  }

  // Almacenar notificaciones en localStorage
  private storeNotifications(): void {
    try {
      localStorage.setItem('interview_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      // No se pudo guardar las notificaciones
    }
  }

  // Cargar notificaciones desde localStorage
  private loadStoredNotifications(): void {
    try {
      const stored = localStorage.getItem('interview_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filtrar notificaciones de los últimos 7 días
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          this.notifications = parsed.filter(n => 
            new Date(n.timestamp) > weekAgo
          );
        }
      }
    } catch (error) {
      // No se pudieron cargar las notificaciones
      this.notifications = [];
    }
  }

  // Configurar notificaciones automáticas para cambios de estado
  setupStatusChangeNotifications(): void {
    // Este método se integraría con el sistema de eventos del backend
    // Por ahora, simulamos con eventos del frontend
    
    window.addEventListener('interview-status-changed', (event: any) => {
      const { interview, oldStatus, newStatus } = event.detail;
      
      const changes = [`Estado: ${oldStatus} → ${newStatus}`];
      this.notifyInterviewUpdated(interview, changes);

      if (newStatus === InterviewStatus.SCHEDULED) {
        this.scheduleReminders(interview);
      }
    });
  }
}

// Instancia singleton del servicio
export const notificationService = new NotificationService();

// Hook de React para usar las notificaciones
export function useNotifications() {
  const [notifications, setNotifications] = React.useState<PushNotification[]>([]);
  
  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    setNotifications(notificationService.getAllNotifications());
    
    return unsubscribe;
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead: notificationService.markAsRead.bind(notificationService),
    markAllAsRead: notificationService.markAllAsRead.bind(notificationService),
    removeNotification: notificationService.removeNotification.bind(notificationService),
    clearAll: notificationService.clearAll.bind(notificationService)
  };
}

export default notificationService;