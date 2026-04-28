import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import {
  FiBell,
  FiMail,
  FiMessageSquare,
  FiSmartphone,
  FiToggleLeft,
  FiToggleRight,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSave,
  FiX,
  FiUsers,
  FiClock,
  FiInfo
} from 'react-icons/fi';
import { notificationConfigService, NotificationConfig } from '../../services/notificationConfigService';
import { useNotifications } from '../../context/AppContext';

const NotificationConfigPanel: React.FC = () => {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<NotificationConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useNotifications();

  // Form state
  const [formData, setFormData] = useState<Partial<NotificationConfig>>({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await notificationConfigService.getAllConfigs();
      setConfigs(data);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error al cargar',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: NotificationConfig) => {
    setSelectedConfig(config);
    setFormData(config);
    setShowEditModal(true);
  };

  const handleToggle = async (id: number) => {
    try {
      const updated = await notificationConfigService.toggleConfig(id);
      setConfigs(prev => prev.map(c => c.id === id ? updated : c));
      addNotification({
        type: 'success',
        title: 'Configuración actualizada',
        message: `La notificación ha sido ${updated.enabled ? 'activada' : 'desactivada'}`
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error al actualizar',
        message: error.message
      });
    }
  };

  const handleSave = async () => {
    if (!selectedConfig) return;

    try {
      setIsSubmitting(true);
      const updated = await notificationConfigService.updateConfig(selectedConfig.id, formData);
      setConfigs(prev => prev.map(c => c.id === selectedConfig.id ? updated : c));
      addNotification({
        type: 'success',
        title: 'Configuración guardada',
        message: 'La configuración de notificación ha sido actualizada exitosamente'
      });
      setShowEditModal(false);
      setSelectedConfig(null);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error al guardar',
        message: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof NotificationConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getEventTypeColor = (eventType: string): 'blue' | 'green' | 'orange' | 'red' | 'purple' => {
    if (eventType.includes('APPROVED') || eventType.includes('ACCEPTED')) return 'green';
    if (eventType.includes('REJECTED') || eventType.includes('CANCELLED')) return 'red';
    if (eventType.includes('REMINDER') || eventType.includes('REQUIRED')) return 'orange';
    if (eventType.includes('INTERVIEW')) return 'purple';
    return 'blue';
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando configuraciones...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FiBell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Configuración de Notificaciones
              </h2>
              <p className="text-gray-600">
                Gestiona qué eventos generan notificaciones, a quién y por qué canal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="blue">{configs.length} configuraciones</Badge>
            <Badge variant="green">
              {configs.filter(c => c.enabled).length} activas
            </Badge>
          </div>
        </div>
      </Card>

      {/* Configurations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {configs.map(config => (
          <Card key={config.id} className="p-6 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {config.event_name}
                  </h3>
                  <Badge variant={getEventTypeColor(config.event_type)} size="sm">
                    {config.event_type}
                  </Badge>
                </div>
                {config.description && (
                  <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                )}
              </div>
              <button
                onClick={() => handleToggle(config.id)}
                className={`p-2 rounded-lg transition-colors ${
                  config.enabled
                    ? 'bg-green-50 text-green-600 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={config.enabled ? 'Desactivar' : 'Activar'}
              >
                {config.enabled ? (
                  <FiToggleRight size={24} />
                ) : (
                  <FiToggleLeft size={24} />
                )}
              </button>
            </div>

            {/* Channels */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Canales</p>
              <div className="flex flex-wrap gap-2">
                {config.send_email && (
                  <Badge variant="blue" icon={<FiMail size={12} />}>Email</Badge>
                )}
                {config.send_sms && (
                  <Badge variant="purple" icon={<FiMessageSquare size={12} />}>SMS</Badge>
                )}
                {config.send_push && (
                  <Badge variant="orange" icon={<FiSmartphone size={12} />}>Push</Badge>
                )}
              </div>
            </div>

            {/* Recipients */}
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Destinatarios</p>
              <div className="flex flex-wrap gap-2">
                {config.notify_applicant && <Badge variant="green">Apoderado</Badge>}
                {config.notify_admin && <Badge variant="red">Admin</Badge>}
                {config.notify_coordinator && <Badge variant="purple">Coordinador</Badge>}
                {config.notify_evaluator && <Badge variant="blue">Evaluador</Badge>}
                {config.custom_recipients && (
                  <Badge variant="gray" icon={<FiUsers size={12} />}>
                    Personalizados
                  </Badge>
                )}
              </div>
            </div>

            {/* Timing */}
            {!config.send_immediately && config.delay_minutes > 0 && (
              <div className="mb-4">
                <Badge variant="orange" icon={<FiClock size={12} />}>
                  Delay: {config.delay_minutes} minutos
                </Badge>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(config)}
                className="flex items-center gap-1"
              >
                <FiEdit size={14} />
                Editar
              </Button>
              {config.email_template_key && (
                <Badge variant="gray" size="sm">
                  Template: {config.email_template_key}
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          if (!isSubmitting) {
            setShowEditModal(false);
            setSelectedConfig(null);
          }
        }}
        title="Editar Configuración de Notificación"
        size="xl"
      >
        {selectedConfig && (
          <div className="space-y-6">
            {/* Event Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FiInfo className="text-blue-600" />
                <h4 className="font-semibold text-blue-900">{selectedConfig.event_name}</h4>
              </div>
              <p className="text-sm text-blue-700">Tipo: {selectedConfig.event_type}</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleFormChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>

            {/* Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Canales de Notificación
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_email ?? false}
                    onChange={(e) => handleFormChange('send_email', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <FiMail className="text-blue-600" />
                  <span className="text-sm">Email</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_sms ?? false}
                    onChange={(e) => handleFormChange('send_sms', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <FiMessageSquare className="text-purple-600" />
                  <span className="text-sm">SMS</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_push ?? false}
                    onChange={(e) => handleFormChange('send_push', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <FiSmartphone className="text-orange-600" />
                  <span className="text-sm">Push Notification</span>
                </label>
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Destinatarios
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notify_applicant ?? false}
                    onChange={(e) => handleFormChange('notify_applicant', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Apoderado/Aplicante</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notify_admin ?? false}
                    onChange={(e) => handleFormChange('notify_admin', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Administradores</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notify_coordinator ?? false}
                    onChange={(e) => handleFormChange('notify_coordinator', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Coordinadores</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notify_evaluator ?? false}
                    onChange={(e) => handleFormChange('notify_evaluator', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Evaluador Asignado</span>
                </label>
              </div>
            </div>

            {/* Custom Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destinatarios Personalizados
                <span className="text-xs text-gray-500 ml-2">(emails separados por coma)</span>
              </label>
              <input
                type="text"
                value={formData.custom_recipients || ''}
                onChange={(e) => handleFormChange('custom_recipients', e.target.value)}
                placeholder="email1@ejemplo.com, email2@ejemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Email Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template de Email
              </label>
              <input
                type="text"
                value={formData.email_template_key || ''}
                onChange={(e) => handleFormChange('email_template_key', e.target.value)}
                placeholder="NOMBRE_DEL_TEMPLATE"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Timing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tiempo de Envío
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_immediately ?? true}
                    onChange={(e) => handleFormChange('send_immediately', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Enviar inmediatamente</span>
                </label>
                {!formData.send_immediately && (
                  <div className="ml-6">
                    <label className="block text-xs text-gray-600 mb-1">
                      Delay (minutos)
                    </label>
                    <input
                      type="number"
                      value={formData.delay_minutes || 0}
                      onChange={(e) => handleFormChange('delay_minutes', parseInt(e.target.value))}
                      min="0"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedConfig(null);
                }}
                disabled={isSubmitting}
              >
                <FiX size={16} />
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <FiSave size={16} />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NotificationConfigPanel;
