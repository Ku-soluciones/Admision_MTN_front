import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { EmailTemplate, emailTemplateService } from '../../services/emailTemplateService';
import { FiX, FiSave, FiEye, FiUpload, FiPlus, FiCode, FiType } from 'react-icons/fi';

interface EmailTemplateEditorProps {
  template?: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: EmailTemplate) => void;
  mode: 'create' | 'edit';
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  template,
  isOpen,
  onClose,
  onSave,
  mode
}) => {
  const [formData, setFormData] = useState({
    templateKey: '',
    name: '',
    description: '',
    category: 'GENERAL_NOTIFICATION',
    type: 'NOTIFICATION',
    subject: '',
    htmlContent: '',
    textContent: '',
    language: 'es',
    active: true,
    isDefault: false
  });

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template && mode === 'edit') {
      setFormData({
        templateKey: template.templateKey,
        name: template.name,
        description: template.description || '',
        category: template.category,
        type: template.type,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent || '',
        language: template.language,
        active: template.active,
        isDefault: template.isDefault
      });
    } else if (mode === 'create') {
      setFormData({
        templateKey: '',
        name: '',
        description: '',
        category: 'GENERAL_NOTIFICATION',
        type: 'NOTIFICATION',
        subject: '',
        htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2563eb;">Título del Email</h2>
  <p>Estimado/a <strong>{{applicantName}}</strong>,</p>
  <p>Contenido del mensaje aquí...</p>
  <p>Saludos cordiales,<br>{{collegeName}}</p>
</div>`,
        textContent: '',
        language: 'es',
        active: true,
        isDefault: false
      });
    }
  }, [template, mode, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newTemplate: EmailTemplate = {
        id: template?.id || 0,
        ...formData,
        createdAt: template?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSave(newTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error al guardar el template');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/html') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleInputChange('htmlContent', content);
      };
      reader.readAsText(file);
    } else {
      alert('Por favor, seleccione un archivo HTML válido');
    }
  };

  const categories = emailTemplateService.getAvailableCategories();
  const types = emailTemplateService.getAvailableTypes();

  // Variables comunes para mostrar en ayuda
  const commonVariables = [
    '{{studentName}}', '{{studentFirstName}}', '{{studentLastName}}',
    '{{gradeApplied}}', '{{applicantName}}', '{{applicantEmail}}',
    '{{collegeName}}', '{{collegePhone}}', '{{collegeEmail}}',
    '{{currentDate}}', '{{currentYear}}'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 p-6 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-3">
            {mode === 'create' ? (
              <FiPlus className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <FiCode className="w-5 h-5 text-blue-600 flex-shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'create' ? 'Crear Nuevo Template' : 'Editar Template'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'create' 
                  ? 'Cree un nuevo template de email personalizado'
                  : `Editando: ${template?.name}`
                }
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              size="sm"
            >
              <FiEye className="w-4 h-4 mr-1" />
              {showPreview ? 'Ocultar' : 'Vista Previa'}
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              <FiX className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Formulario */}
            <div className="space-y-6">
              {/* Información básica */}
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <FiType className="w-4 h-4 mr-2" />
                  Información Básica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clave del Template *
                    </label>
                    <input
                      type="text"
                      value={formData.templateKey}
                      onChange={(e) => handleInputChange('templateKey', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="TEMPLATE_KEY"
                      required
                      disabled={mode === 'edit'}
                    />
                    <p className="text-xs text-gray-500 mt-1">Identificador único (no se puede cambiar)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Template *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nombre descriptivo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {types.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Describe el propósito de este template"
                  />
                </div>

                <div className="mt-4 flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => handleInputChange('active', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Template Activo</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Template por Defecto</span>
                  </label>
                </div>
              </Card>

              {/* Contenido del email */}
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Contenido del Email</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asunto *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Asunto del email (puede incluir variables como {{studentName}})"
                    required
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Contenido HTML *
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept=".html"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="html-upload"
                      />
                      <label
                        htmlFor="html-upload"
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <FiUpload className="w-3 h-3 mr-1" />
                        Subir HTML
                      </label>
                    </div>
                  </div>
                  <textarea
                    value={formData.htmlContent}
                    onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={12}
                    placeholder="Contenido HTML del email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contenido de Texto Plano (opcional)
                  </label>
                  <textarea
                    value={formData.textContent}
                    onChange={(e) => handleInputChange('textContent', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Versión en texto plano (fallback para clientes que no soportan HTML)"
                  />
                </div>
              </Card>

              {/* Variables disponibles */}
              <Card className="p-4">
                <h3 className="font-medium text-gray-900 mb-3">Variables Disponibles</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Puede usar estas variables en el asunto y contenido del email:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {commonVariables.map(variable => (
                    <code
                      key={variable}
                      className="text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-blue-100"
                      onClick={() => {
                        navigator.clipboard.writeText(variable);
                      }}
                      title="Clic para copiar"
                    >
                      {variable}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Haz clic en cualquier variable para copiarla
                </p>
              </Card>
            </div>

            {/* Vista previa */}
            {showPreview && (
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Vista Previa</h3>
                  
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">Asunto:</div>
                    <div className="p-2 bg-gray-50 border rounded text-sm">
                      {formData.subject || 'Sin asunto'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Contenido:</div>
                    <div className="border border-gray-200 rounded-md p-4 bg-white max-h-96 overflow-y-auto">
                      {formData.htmlContent ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                          className="prose prose-sm max-w-none"
                        />
                      ) : (
                        <div className="text-gray-400 italic">Sin contenido</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            * Campos requeridos
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving || !formData.templateKey || !formData.name || !formData.subject || !formData.htmlContent}
            >
              {saving ? (
                <>Guardando...</>
              ) : (
                <>
                  <FiSave className="w-4 h-4 mr-2" />
                  {mode === 'create' ? 'Crear Template' : 'Guardar Cambios'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;