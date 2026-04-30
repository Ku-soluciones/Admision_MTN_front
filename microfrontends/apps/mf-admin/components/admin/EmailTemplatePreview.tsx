import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { EmailTemplate } from '../../services/emailTemplateService';
import { FiX, FiEye, FiEdit2, FiSend, FiCode, FiMonitor, FiSmartphone } from 'react-icons/fi';

interface EmailTemplatePreviewProps {
  template: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (template: EmailTemplate) => void;
  onSend?: (templateKey: string) => void;
  studentData?: {
    studentName?: string;
    gradeApplied?: string;
    applicantName?: string;
    applicantEmail?: string;
  };
}

const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({
  template,
  isOpen,
  onClose,
  onEdit,
  onSend,
  studentData
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');

  if (!isOpen || !template) return null;

  // Variables de ejemplo para la vista previa
  const sampleVariables = {
    studentName: studentData?.studentName || 'María José González',
    studentFirstName: studentData?.studentName?.split(' ')[0] || 'María José',
    studentLastName: studentData?.studentName?.split(' ').slice(1).join(' ') || 'González',
    gradeApplied: studentData?.gradeApplied || '1° Básico',
    applicantName: studentData?.applicantName || 'Carlos González',
    applicantEmail: studentData?.applicantEmail || 'carlos.gonzalez@email.com',
    collegeName: 'Colegio Monte Tabor y Nazaret',
    collegePhone: '+56 2 2345 6789',
    collegeEmail: 'info@mtn.cl',
    currentDate: new Date().toLocaleDateString('es-CL'),
    currentYear: new Date().getFullYear().toString(),
    interviewDate: '15 de Marzo, 2024',
    interviewTime: '10:00 AM',
    interviewerName: 'Sra. Patricia Morales',
    interviewMode: 'Presencial',
    interviewLocation: 'Sala de Reuniones - Edificio Principal',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    admissionResult: 'SELECCIONADO/A',
    rejectionReason: 'Cupos completos para el nivel solicitado',
    additionalInfo: 'Información adicional sobre el proceso'
  };

  // Función para reemplazar variables en el template
  const processTemplate = (content: string): string => {
    let processedContent = content;
    Object.entries(sampleVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });
    return processedContent;
  };

  const processedSubject = processTemplate(template.subject);
  const processedContent = processTemplate(template.htmlContent);

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'INTERVIEW_ASSIGNMENT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'STUDENT_SELECTION':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'STUDENT_REJECTION':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'INTERVIEW_REMINDER':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <FiEye className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Vista Previa del Template</h2>
              <p className="text-sm text-gray-600">{template.name}</p>
            </div>
            <Badge className={getCategoryBadgeColor(template.category)}>
              {template.category.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Toggle de vista */}
            <div className="flex border border-gray-200 rounded-md">
              <Button
                variant={viewMode === 'preview' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('preview')}
                className="rounded-r-none"
              >
                <FiEye className="w-4 h-4 mr-1" />
                Vista Previa
              </Button>
              <Button
                variant={viewMode === 'code' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('code')}
                className="rounded-l-none border-l"
              >
                <FiCode className="w-4 h-4 mr-1" />
                Código HTML
              </Button>
            </div>

            {/* Toggle de dispositivo (solo en vista previa) */}
            {viewMode === 'preview' && (
              <div className="flex border border-gray-200 rounded-md">
                <Button
                  variant={deviceView === 'desktop' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDeviceView('desktop')}
                  className="rounded-r-none"
                >
                  <FiMonitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={deviceView === 'mobile' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDeviceView('mobile')}
                  className="rounded-l-none border-l"
                >
                  <FiSmartphone className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button onClick={onClose} variant="outline" size="sm">
              <FiX className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel izquierdo - Información del template */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Información del Template</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Clave:</span>
                    <p className="text-gray-900">{template.templateKey}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Categoría:</span>
                    <p className="text-gray-900">{template.category.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Tipo:</span>
                    <p className="text-gray-900">{template.type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Idioma:</span>
                    <p className="text-gray-900">{template.language}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Estado:</span>
                    <Badge variant={template.active ? 'success' : 'neutral'}>
                      {template.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {template.isDefault && (
                    <div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Template por Defecto
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>

              {template.description && (
                <Card className="p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Descripción</h3>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </Card>
              )}

              {/* Variables disponibles */}
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Variables Disponibles</h3>
                <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                  {Object.entries(sampleVariables).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-1 bg-gray-50 rounded">
                      <code className="text-blue-600">{`{{${key}}}`}</code>
                      <span className="text-gray-600 truncate ml-2">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Botones de acción */}
              <div className="space-y-2">
                {onEdit && (
                  <Button
                    onClick={() => onEdit(template)}
                    variant="outline"
                    className="w-full"
                  >
                    <FiEdit2 className="w-4 h-4 mr-2" />
                    Editar Template
                  </Button>
                )}
                {onSend && (
                  <Button
                    onClick={() => onSend(template.templateKey)}
                    className="w-full"
                  >
                    <FiSend className="w-4 h-4 mr-2" />
                    Enviar Email
                  </Button>
                )}
              </div>
            </div>

            {/* Panel derecho - Vista previa del email */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Vista Previa del Email</h3>
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50 mb-4">
                    <div className="text-sm text-gray-600 mb-1">Asunto:</div>
                    <div className="font-medium text-gray-900">{processedSubject}</div>
                  </div>
                </div>

                {viewMode === 'preview' ? (
                  <div className={`border border-gray-200 rounded-md overflow-hidden ${
                    deviceView === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                  }`}>
                    <div className="bg-white p-4" style={{
                      maxWidth: deviceView === 'mobile' ? '375px' : '100%',
                      fontSize: deviceView === 'mobile' ? '14px' : '16px'
                    }}>
                      <div
                        dangerouslySetInnerHTML={{ __html: processedContent }}
                        className="prose prose-sm max-w-none"
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          lineHeight: '1.5',
                          color: '#374151'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm">
                      <code>{template.htmlContent}</code>
                    </pre>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Creado el {new Date(template.createdAt).toLocaleDateString('es-CL')}
            {template.updatedAt && template.updatedAt !== template.createdAt && (
              <span> • Actualizado el {new Date(template.updatedAt).toLocaleDateString('es-CL')}</span>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {onSend && (
              <Button onClick={() => onSend(template.templateKey)}>
                <FiSend className="w-4 h-4 mr-2" />
                Usar Template
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreview;