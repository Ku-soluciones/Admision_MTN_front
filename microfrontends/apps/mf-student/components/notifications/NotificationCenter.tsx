import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { 
  FiBell, 
  FiBellOff,
  FiCheck, 
  FiX, 
  FiTrash2, 
  FiEye,
  FiEdit,
  FiCalendar,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCw
} from 'react-icons/fi';
import { PushNotification, useNotifications, notificationService } from '../../services/notificationService';

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');
  const [error, setError] = useState<string | null>(null);

  // Usar el hook con manejo de errores
  let notifications: any[] = [];
  let unreadCount = 0;
  let markAsRead = () => {};
  let markAllAsRead = () => {};
  let removeNotification = () => {};
  let clearAll = () => {};

  try {
    const notificationHook = useNotifications();
    notifications = notificationHook.notifications;
    unreadCount = notificationHook.unreadCount;
    markAsRead = notificationHook.markAsRead;
    markAllAsRead = notificationHook.markAllAsRead;
    removeNotification = notificationHook.removeNotification;
    clearAll = notificationHook.clearAll;
  } catch (err: any) {
    console.error('Error in useNotifications hook:', err);
    setError(err.message || 'Error al cargar notificaciones');
  }

  const getNotificationIcon = (type: PushNotification['type'], priority: PushNotification['priority']) => {
    const iconClass = priority === 'urgent' ? 'text-red-500' : 
                     priority === 'high' ? 'text-orange-500' : 
                     priority === 'normal' ? 'text-blue-500' : 'text-gray-500';

    switch (type) {
      case 'interview_scheduled':
        return <FiCalendar className={`w-5 h-5 ${iconClass}`} />;
      case 'interview_reminder':
        return <FiClock className={`w-5 h-5 ${iconClass}`} />;
      case 'interview_cancelled':
        return <FiX className={`w-5 h-5 ${iconClass}`} />;
      case 'interview_completed':
        return <FiCheckCircle className={`w-5 h-5 ${iconClass}`} />;
      case 'interview_updated':
        return <FiRefreshCw className={`w-5 h-5 ${iconClass}`} />;
      default:
        return <FiBell className={`w-5 h-5 ${iconClass}`} />;
    }
  };

  const getPriorityColor = (priority: PushNotification['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'normal': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now.getTime() - notificationTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return notificationTime.toLocaleDateString('es-CL');
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'high':
        return notification.priority === 'high' || notification.priority === 'urgent';
      default:
        return true;
    }
  });

  const handleNotificationAction = (notification: PushNotification, actionId: string) => {
    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) return;

    markAsRead(notification.id);

    switch (action.action) {
      case 'view':
        if (action.url) {
          window.location.href = action.url;
        } else {
          // Trigger custom event for view action
          window.dispatchEvent(new CustomEvent('view-interview', {
            detail: { interviewId: notification.data.interviewId }
          }));
        }
        break;
      case 'edit':
        window.dispatchEvent(new CustomEvent('edit-interview', {
          detail: { interviewId: notification.data.interviewId }
        }));
        break;
      case 'confirm':
        window.dispatchEvent(new CustomEvent('confirm-interview', {
          detail: { interviewId: notification.data.interviewId }
        }));
        break;
      case 'reschedule':
        window.dispatchEvent(new CustomEvent('reschedule-interview', {
          detail: { interviewId: notification.data.interviewId }
        }));
        break;
    }
  };

  // Si hay error, mostrar botón deshabilitado
  if (error) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          disabled
          className="relative p-2 opacity-50"
          title={`Error: ${error}`}
        >
          <FiBellOff className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Botón de notificaciones en el header */}
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setShowModal(true)}
          className="relative p-2"
        >
          <FiBell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="error" 
              size="sm" 
              className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 flex items-center justify-center text-xs font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Modal de centro de notificaciones */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Centro de Notificaciones"
        size="lg"
      >
        <div className="space-y-4">
          {/* Header con filtros y acciones */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todas ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                No leídas ({unreadCount})
              </Button>
              <Button
                variant={filter === 'high' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilter('high')}
              >
                Prioritarias
              </Button>
            </div>

            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <FiCheck className="w-4 h-4 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="text-red-600 hover:bg-red-50"
              >
                <FiTrash2 className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8">
                <FiBellOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay notificaciones</p>
                <p className="text-sm text-gray-400 mt-1">
                  {filter === 'unread' ? 'Todas las notificaciones están leídas' : 
                   filter === 'high' ? 'No hay notificaciones prioritarias' : 
                   'El centro de notificaciones está vacío'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`p-4 border-l-4 cursor-pointer transition-all hover:shadow-md ${
                    getPriorityColor(notification.priority)
                  } ${notification.read ? 'opacity-75' : ''}`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        
                        <p className={`text-sm ${notification.read ? 'text-gray-500' : 'text-gray-700'} mb-2`}>
                          {notification.message}
                        </p>

                        {notification.data.scheduledDate && notification.data.scheduledTime && (
                          <div className="text-xs text-gray-500 mb-2">
                            📅 {new Date(notification.data.scheduledDate).toLocaleDateString('es-CL')} a las {notification.data.scheduledTime}
                          </div>
                        )}

                        {/* Acciones de la notificación */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex space-x-2 mt-2">
                            {notification.actions.map((action) => (
                              <Button
                                key={action.id}
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationAction(notification, action.id);
                                }}
                                className="text-xs py-1 px-2"
                              >
                                {action.action === 'view' && <FiEye className="w-3 h-3 mr-1" />}
                                {action.action === 'edit' && <FiEdit className="w-3 h-3 mr-1" />}
                                {action.action === 'confirm' && <FiCheck className="w-3 h-3 mr-1" />}
                                {action.action === 'reschedule' && <FiCalendar className="w-3 h-3 mr-1" />}
                                {action.title}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-3">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {getTimeAgo(notification.timestamp)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <FiX className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Indicador de prioridad */}
                  {notification.priority === 'urgent' && (
                    <div className="mt-2 flex items-center text-red-600">
                      <FiAlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">URGENTE</span>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>

          {/* Footer con estadísticas */}
          {notifications.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm text-gray-500">
                <span>{notifications.length} notificaciones totales</span>
                <span>{unreadCount} sin leer</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default NotificationCenter;