import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { 
  FiMail, 
  FiSend, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiActivity,
  FiRefreshCw,
  FiTrash2,
  FiInfo,
  FiSettings,
  FiBarChart2,
  FiArrowLeft,
  FiEye,
  FiEdit,
  FiPlus,
  FiUpload,
  FiCode
} from 'react-icons/fi';
import { institutionalEmailService } from '../../services/institutionalEmailService';
import { applicationService } from '../../services/applicationService';
import { emailTemplateService, EmailTemplate } from '../../services/emailTemplateService';
import EmailTemplatePreview from './EmailTemplatePreview';
import EmailTemplateEditor from './EmailTemplateEditor';

interface EmailStatistics {
  pendingEmails: number;
  emailsSentThisHour: number;
  emailsSentThisDay: number;
  emailsSentThisMonth: number;
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
  maxEmailsPerMonth: number;
  queueByType: Record<string, number>;
}

interface Application {
  id: number;
  student: {
    firstName: string;
    paternalLastName?: string;
    lastName?: string;
  };
  father?: {
    email: string;
  };
  mother?: {
    email: string;
  };
  applicantUser?: {
    email: string;
  };
  status: string;
}

interface InstitutionalEmailManagerProps {
  onBack?: () => void;
}

const InstitutionalEmailManager: React.FC<InstitutionalEmailManagerProps> = ({ onBack }) => {
  const [statistics, setStatistics] = useState<EmailStatistics | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Estados para formularios
  const [testEmail, setTestEmail] = useState('');
  const [statusUpdateData, setStatusUpdateData] = useState({ newStatus: '' });
  const [documentReminderData, setDocumentReminderData] = useState({ pendingDocuments: '' });
  const [admissionResultData, setAdmissionResultData] = useState({ result: '', message: '' });

  // Estados para modales de templates
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedApplicationForTemplate, setSelectedApplicationForTemplate] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load applications first (this endpoint works)
      const appsResponse = await applicationService.getAllApplications();
      console.log('Aplicaciones recibidas:', appsResponse);
      
      // Manejar tanto el formato directo como el formato { data: [] }
      let apps = [];
      if (Array.isArray(appsResponse)) {
        apps = appsResponse;
      } else if (appsResponse && Array.isArray(appsResponse.data)) {
        apps = appsResponse.data;
      } else if (appsResponse && appsResponse.applications) {
        apps = appsResponse.applications;
      }
      
      setApplications(apps);
      console.log('Aplicaciones procesadas:', apps.length);

      // Load email templates
      try {
        const templatesResponse = await emailTemplateService.getAllTemplates();
        if (templatesResponse.success) {
          setTemplates(templatesResponse.data);
          console.log('Templates cargados:', templatesResponse.data.length);
        }
      } catch (templateError: any) {
        console.warn('Error loading email templates:', templateError.message);
      }
      
      // Try to load email statistics, but handle gracefully if service is disabled
      try {
        const statsResponse = await institutionalEmailService.getQueueStatistics();
        if (statsResponse.success) {
          setStatistics(statsResponse.data);
        } else {
          // Service is disabled or not available - use default statistics
          setStatistics({
            pendingEmails: 0,
            emailsSentThisHour: 0,
            emailsSentThisDay: 0,
            emailsSentThisMonth: 0,
            maxEmailsPerHour: 50,
            maxEmailsPerDay: 200,
            maxEmailsPerMonth: 5000,
            queueByType: {}
          });
        }
      } catch (emailError: any) {
        console.warn('Institutional email service not available:', emailError.message);
        // Set default statistics when service is disabled
        setStatistics({
          pendingEmails: 0,
          emailsSentThisHour: 0,
          emailsSentThisDay: 0,
          emailsSentThisMonth: 0,
          maxEmailsPerHour: 50,
          maxEmailsPerDay: 200,
          maxEmailsPerMonth: 5000,
          queueByType: {}
        });
      }
    } catch (error) {
      console.error('Error loading application data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (type: string, applicationId: number, data?: any) => {
    try {
      setSending(`${type}-${applicationId}`);
      
      let response;
      switch (type) {
        case 'application-received':
          response = await institutionalEmailService.sendApplicationReceivedEmail(applicationId);
          break;
        case 'status-update':
          response = await institutionalEmailService.sendStatusUpdateEmail(applicationId, data);
          break;
        case 'document-reminder':
          response = await institutionalEmailService.sendDocumentReminderEmail(applicationId, data);
          break;
        case 'admission-result':
          response = await institutionalEmailService.sendAdmissionResultEmail(applicationId, data);
          break;
        default:
          throw new Error('Tipo de email no válido');
      }

      if (response.success) {
        alert(`Email agregado a cola institucional exitosamente. ID: ${response.queueId}`);
        loadData(); // Recargar estadísticas
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        alert('Sistema de emails institucionales no disponible en este momento');
      } else {
        alert('Error enviando email: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setSending(null);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      alert('Ingrese un email válido');
      return;
    }

    try {
      setSending('test');
      const response = await institutionalEmailService.sendTestEmail(testEmail);
      if (response.success) {
        alert(`Email de prueba enviado a ${testEmail}. ID: ${response.queueId}`);
        setTestEmail('');
        loadData();
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        alert('Sistema de emails institucionales no disponible en este momento');
      } else {
        alert('Error enviando email de prueba: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setSending(null);
    }
  };

  const handleForceProcessQueue = async () => {
    try {
      setSending('process');
      const response = await institutionalEmailService.forceProcessQueue();
      if (response.success) {
        alert('Procesamiento de cola forzado exitosamente');
        loadData();
      }
    } catch (error: any) {
      console.error('Error processing queue:', error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        alert('Sistema de emails institucionales no disponible en este momento');
      } else {
        alert('Error procesando cola: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setSending(null);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('¿Está seguro de que desea limpiar toda la cola de emails? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setSending('clear');
      const response = await institutionalEmailService.clearQueue();
      if (response.success) {
        alert('Cola de emails limpiada exitosamente');
        loadData();
      }
    } catch (error: any) {
      console.error('Error clearing queue:', error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        alert('Sistema de emails institucionales no disponible en este momento');
      } else {
        alert('Error limpiando cola: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setSending(null);
    }
  };

  const handleSendTemplatedEmail = async (templateKey: string, applicationId: number, variables?: any) => {
    try {
      setSending(`template-${templateKey}-${applicationId}`);
      
      const response = await emailTemplateService.sendTemplatedEmail(templateKey, applicationId, variables);
      
      if (response.success) {
        alert(`Email templated agregado a cola institucional exitosamente. ID: ${response.queueId}`);
        loadData(); // Recargar estadísticas
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error: any) {
      console.error('Error sending templated email:', error);
      if (error.response?.status === 401 || error.response?.status === 404) {
        alert('Sistema de emails institucionales no disponible en este momento');
      } else {
        alert('Error enviando email templated: ' + (error.message || 'Error desconocido'));
      }
    } finally {
      setSending(null);
    }
  };

  const getUsagePercentage = (used: number, max: number): number => {
    return Math.round((used / max) * 100);
  };

  const getUsageBadgeVariant = (percentage: number): 'success' | 'warning' | 'destructive' => {
    if (percentage < 60) return 'success';
    if (percentage < 85) return 'warning';
    return 'destructive';
  };

  // Funciones para manejo de templates
  const handlePreviewTemplate = (template: EmailTemplate, applicationData?: any) => {
    setPreviewTemplate(template);
    setSelectedApplicationForTemplate(applicationData);
    setShowPreview(true);
  };

  const handleEditTemplate = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setEditorMode('edit');
    } else {
      setEditingTemplate(null);
      setEditorMode('create');
    }
    setShowEditor(true);
  };

  const handleSaveTemplate = async (template: EmailTemplate) => {
    try {
      let result;
      
      if (editorMode === 'create') {
        console.log('📝 Creando nuevo template:', template.templateKey);
        result = await emailTemplateService.createTemplate(template);
      } else {
        console.log('✏️ Actualizando template:', template.templateKey);
        result = await emailTemplateService.updateTemplate(template.id, template);
      }
      
      if (result.success) {
        // Actualizar la lista local
        if (editorMode === 'create') {
          setTemplates(prev => [...prev, result.data]);
        } else {
          setTemplates(prev => 
            prev.map(t => t.id === template.id ? result.data : t)
          );
        }
        
        // Recargar templates desde el servicio para asegurar consistencia
        try {
          const templatesResponse = await emailTemplateService.getAllTemplates();
          if (templatesResponse.success) {
            setTemplates(templatesResponse.data);
          }
        } catch (reloadError) {
          console.warn('No se pudieron recargar templates desde backend:', reloadError);
        }
        
        alert(result.message || (editorMode === 'create' ? 'Template creado exitosamente' : 'Template actualizado exitosamente'));
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar el template');
    }
  };

  const handleSendWithTemplate = (templateKey: string, applicationId?: number) => {
    if (applicationId) {
      handleSendTemplatedEmail(templateKey, applicationId);
    } else {
      alert('Por favor seleccione un estudiante para enviar el email');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FiRefreshCw className="animate-spin w-8 h-8 text-blue-600" />
        <span className="ml-2">Cargando sistema de emails institucionales...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start space-x-4">
          {onBack && (
            <Button 
              onClick={onBack}
              variant="outline"
              className="flex items-center mt-1"
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FiMail className="mr-2 text-blue-600" />
              Sistema de Emails Institucionales
            </h2>
            <p className="text-gray-600">
              Gestión profesional de emails para 1000-5000 emails mensuales
            </p>
            {statistics && statistics.pendingEmails === 0 && statistics.emailsSentThisHour === 0 && statistics.emailsSentThisDay === 0 && statistics.emailsSentThisMonth === 0 && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                <p className="text-yellow-800 text-sm flex items-center">
                  <FiInfo className="mr-1 w-4 h-4" />
                  Sistema de emails institucionales en modo demostración (servicio backend deshabilitado)
                </p>
              </div>
            )}
          </div>
        </div>
        <Button onClick={loadData} variant="outline">
          <FiRefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Cola Actual
              </h3>
            </div>
            <div>
              <div className="flex items-center">
                <FiClock className="w-5 h-5 text-orange-500 mr-2" />
                <span className="text-2xl font-bold">{statistics.pendingEmails}</span>
                <Badge variant="outline" className="ml-2">emails</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Esta Hora
              </h3>
            </div>
            <div>
              <div className="flex items-center">
                <FiActivity className="w-5 h-5 text-blue-500 mr-2" />
                <span className="text-2xl font-bold">{statistics.emailsSentThisHour}</span>
                <Badge 
                  variant={getUsageBadgeVariant(getUsagePercentage(statistics.emailsSentThisHour, statistics.maxEmailsPerHour))}
                  className="ml-2"
                >
                  {getUsagePercentage(statistics.emailsSentThisHour, statistics.maxEmailsPerHour)}%
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Hoy
              </h3>
            </div>
            <div>
              <div className="flex items-center">
                <FiBarChart2 className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-2xl font-bold">{statistics.emailsSentThisDay}</span>
                <Badge 
                  variant={getUsageBadgeVariant(getUsagePercentage(statistics.emailsSentThisDay, statistics.maxEmailsPerDay))}
                  className="ml-2"
                >
                  {getUsagePercentage(statistics.emailsSentThisDay, statistics.maxEmailsPerDay)}%
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-gray-600">
                Este Mes
              </h3>
            </div>
            <div>
              <div className="flex items-center">
                <FiCheckCircle className="w-5 h-5 text-purple-500 mr-2" />
                <span className="text-2xl font-bold">{statistics.emailsSentThisMonth}</span>
                <Badge 
                  variant={getUsageBadgeVariant(getUsagePercentage(statistics.emailsSentThisMonth, statistics.maxEmailsPerMonth))}
                  className="ml-2"
                >
                  {getUsagePercentage(statistics.emailsSentThisMonth, statistics.maxEmailsPerMonth)}%
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Controles de Cola */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FiSettings className="mr-2" />
            Controles de Cola Institucional
          </h3>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleForceProcessQueue}
              disabled={sending === 'process'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending === 'process' ? (
                <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <FiSend className="w-4 h-4 mr-2" />
              )}
              Procesar Cola
            </Button>

            <Button 
              onClick={handleClearQueue}
              disabled={sending === 'clear'}
              variant="destructive"
            >
              {sending === 'clear' ? (
                <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <FiTrash2 className="w-4 h-4 mr-2" />
              )}
              Limpiar Cola
            </Button>

            <div className="flex items-center space-x-2">
              <input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button 
                onClick={handleTestEmail}
                disabled={sending === 'test' || !testEmail.trim()}
                variant="outline"
              >
                {sending === 'test' ? (
                  <FiRefreshCw className="animate-spin w-4 h-4 mr-2" />
                ) : (
                  <FiMail className="w-4 h-4 mr-2" />
                )}
                Email Prueba
              </Button>
            </div>
          </div>

          {statistics && statistics.queueByType && Object.keys(statistics.queueByType).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Distribución de Cola por Tipo:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statistics.queueByType).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Templates de Correo */}
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold flex items-center">
              <FiMail className="mr-2" />
              Templates de Correo Institucional
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {templates.length > 0 ? `${templates.length} templates disponibles` : 'Cargando templates...'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleEditTemplate()}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <FiPlus className="w-4 h-4 mr-1" />
              Nuevo Template
            </Button>
            <Button
              onClick={loadData}
              size="sm"
              variant="outline"
            >
              <FiRefreshCw className="w-4 h-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="p-4 border hover:shadow-md transition-shadow">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {template.category} • {template.type}
                </p>
              </div>
              <div className="mb-3">
                <p className="text-sm text-gray-700 font-medium">{template.subject}</p>
                {template.description && (
                  <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant={template.active ? "success" : "outline"}>
                  {template.active ? "Activo" : "Inactivo"}
                </Badge>
                {template.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Por defecto
                  </Badge>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <FiEye className="w-3 h-3 mr-1" />
                    Vista Previa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <FiEdit className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (applications.length > 0) {
                      handleSendWithTemplate(template.templateKey, applications[0].id);
                    } else {
                      alert('No hay estudiantes disponibles para enviar el email');
                    }
                  }}
                >
                  <FiSend className="w-3 h-3 mr-1" />
                  Usar Template
                </Button>
              </div>
            </Card>
          ))}
        </div>
        
        {templates.length === 0 && (
          <div className="text-center py-8">
            <FiMail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron templates de correo</p>
            <p className="text-sm text-gray-400 mt-1">
              Los templates se cargan automáticamente desde la base de datos
            </p>
          </div>
        )}
      </Card>

      {/* Lista de Aplicaciones para Envío de Emails */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FiSend className="mr-2" />
            Envío de Emails Institucionales
          </h3>
        </div>
        <div>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Estudiante
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.slice(0, 20).map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        {app.student?.firstName} {app.student?.paternalLastName || app.student?.lastName}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {app.father?.email || app.mother?.email || app.applicantUser?.email || 'Sin email'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <Badge variant="outline">{app.status}</Badge>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendEmail('application-received', app.id)}
                            disabled={sending === `application-received-${app.id}`}
                            title="Email de aplicación recibida"
                          >
                            {sending === `application-received-${app.id}` ? (
                              <FiRefreshCw className="animate-spin w-3 h-3" />
                            ) : (
                              <FiCheckCircle className="w-3 h-3" />
                            )}
                          </Button>
                          
                          {/* Botones para templates específicos */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendTemplatedEmail('STUDENT_SELECTION', app.id)}
                            disabled={sending === `template-STUDENT_SELECTION-${app.id}`}
                            title="Enviar notificación de selección"
                            className="bg-green-50 hover:bg-green-100 border-green-200"
                          >
                            {sending === `template-STUDENT_SELECTION-${app.id}` ? (
                              <FiRefreshCw className="animate-spin w-3 h-3" />
                            ) : (
                              <FiCheckCircle className="w-3 h-3 text-green-600" />
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendTemplatedEmail('STUDENT_REJECTION', app.id, { rejectionReason: 'No cumple con los criterios académicos' })}
                            disabled={sending === `template-STUDENT_REJECTION-${app.id}`}
                            title="Enviar notificación de rechazo"
                            className="bg-red-50 hover:bg-red-100 border-red-200"
                          >
                            {sending === `template-STUDENT_REJECTION-${app.id}` ? (
                              <FiRefreshCw className="animate-spin w-3 h-3" />
                            ) : (
                              <FiXCircle className="w-3 h-3 text-red-600" />
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const selectionTemplate = templates.find(t => t.templateKey === 'STUDENT_SELECTION');
                              if (selectionTemplate) {
                                handlePreviewTemplate(selectionTemplate, app);
                              } else {
                                alert('Template de selección no encontrado');
                              }
                            }}
                            title="Vista previa de email con datos del estudiante"
                            className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                          >
                            <FiEye className="w-3 h-3 text-purple-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {applications.length > 20 && (
              <div className="text-center text-sm text-gray-500 mt-4">
                Mostrando 20 de {applications.length} aplicaciones
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Información del Sistema */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FiInfo className="mr-2" />
            Información del Sistema Institucional
          </h3>
        </div>
        <div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Características del Sistema:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ✅ Sistema de cola profesional con rate limiting</li>
              <li>• ✅ Emails personalizados por género y colegio</li>
              <li>• ✅ Tracking de apertura y respuestas automáticas</li>
              <li>• ✅ Reintentos automáticos con backoff exponencial</li>
              <li>• ✅ Límites institucionales: 50/hora, 200/día, 5000/mes</li>
              <li>• ✅ SMTP institucional con autenticación segura</li>
              <li>• ✅ Templates HTML responsive con branding del colegio</li>
            </ul>
          </div>
          
          {statistics && (
            <div className="mt-4 bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Estado Actual:</h4>
              <div className="text-sm text-green-800 space-y-1">
                <p>• Capacidad disponible esta hora: {statistics.maxEmailsPerHour - statistics.emailsSentThisHour} emails</p>
                <p>• Capacidad disponible hoy: {statistics.maxEmailsPerDay - statistics.emailsSentThisDay} emails</p>
                <p>• Capacidad disponible este mes: {statistics.maxEmailsPerMonth - statistics.emailsSentThisMonth} emails</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Modales */}
      <EmailTemplatePreview
        template={previewTemplate}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onEdit={handleEditTemplate}
        onSend={handleSendWithTemplate}
        studentData={selectedApplicationForTemplate ? {
          studentName: `${selectedApplicationForTemplate.student?.firstName} ${selectedApplicationForTemplate.student?.lastName}`,
          gradeApplied: selectedApplicationForTemplate.student?.gradeApplied,
          applicantName: selectedApplicationForTemplate.applicantUser?.firstName + ' ' + selectedApplicationForTemplate.applicantUser?.lastName,
          applicantEmail: selectedApplicationForTemplate.applicantUser?.email
        } : undefined}
      />

      <EmailTemplateEditor
        template={editingTemplate}
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSaveTemplate}
        mode={editorMode}
      />
    </div>
  );
};

export default InstitutionalEmailManager;