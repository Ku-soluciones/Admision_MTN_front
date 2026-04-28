import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { 
  FiBookOpen, 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiDownload, 
  FiUpload,
  FiStar,
  FiEye,
  FiCopy,
  FiFilter,
  FiSearch,
  FiBarChart,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { 
  InterviewTemplate, 
  interviewTemplateService, 
  EvaluationCriteria,
  Question 
} from '../../services/interviewTemplateService';
import { InterviewType, INTERVIEW_TYPE_LABELS, INTERVIEW_MODE_LABELS } from '../../types/interview';

interface InterviewTemplateManagerProps {
  onTemplateSelect?: (template: InterviewTemplate) => void;
  selectedTemplateId?: string;
  showSelector?: boolean;
  className?: string;
}

const InterviewTemplateManager: React.FC<InterviewTemplateManagerProps> = ({
  onTemplateSelect,
  selectedTemplateId,
  showSelector = false,
  className = ''
}) => {
  const [templates, setTemplates] = useState<InterviewTemplate[]>(
    interviewTemplateService.getTemplates()
  );
  const [selectedTemplate, setSelectedTemplate] = useState<InterviewTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filtros
  const [filterType, setFilterType] = useState<InterviewType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<InterviewTemplate['category'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyDefault, setShowOnlyDefault] = useState(false);

  // Templates filtrados
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Filtro por tipo
      if (filterType !== 'all' && template.type !== filterType) {
        return false;
      }

      // Filtro por categoría
      if (filterCategory !== 'all' && template.category !== filterCategory) {
        return false;
      }

      // Filtro por término de búsqueda
      if (searchTerm && !template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !template.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false;
      }

      // Filtro solo por defecto
      if (showOnlyDefault && !template.isDefault) {
        return false;
      }

      return true;
    });
  }, [templates, filterType, filterCategory, searchTerm, showOnlyDefault]);

  const handleTemplateView = (template: InterviewTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const handleTemplateSelect = (template: InterviewTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const handleTemplateDelete = (templateId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este template?')) {
      if (interviewTemplateService.deleteTemplate(templateId)) {
        setTemplates(interviewTemplateService.getTemplates());
      } else {
        alert('No se puede eliminar este template (es un template por defecto)');
      }
    }
  };

  const handleTemplateExport = (template: InterviewTemplate) => {
    try {
      const exportData = interviewTemplateService.exportTemplate(template.id);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template_${template.name.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error al exportar el template');
    }
  };

  const handleTemplateImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        interviewTemplateService.importTemplate(jsonString);
        setTemplates(interviewTemplateService.getTemplates());
        alert('Template importado exitosamente');
      } catch (error) {
        alert(`Error al importar template: ${error}`);
      }
    };
    reader.readAsText(file);
  };

  const getCategoryColor = (category: InterviewTemplate['category']) => {
    switch (category) {
      case 'academic': return 'text-blue-600 bg-blue-100';
      case 'psychological': return 'text-green-600 bg-green-100';
      case 'family': return 'text-purple-600 bg-purple-100';
      case 'behavioral': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPopularityIcon = (templateId: string) => {
    const stats = interviewTemplateService.getTemplateStats(templateId);
    if (!stats || stats.timesUsed === 0) return null;
    
    if (stats.timesUsed >= 10) {
      return <FiStar className="w-4 h-4 text-yellow-500" title="Template popular" />;
    }
    return null;
  };

  const renderTemplateCard = (template: InterviewTemplate) => {
    const stats = interviewTemplateService.getTemplateStats(template.id);
    const isSelected = selectedTemplateId === template.id;

    return (
      <Card 
        key={template.id} 
        className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        onClick={() => showSelector ? handleTemplateSelect(template) : handleTemplateView(template)}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium text-gray-900 text-sm leading-tight">
                  {template.name}
                </h3>
                {getPopularityIcon(template.id)}
                {isSelected && <FiCheck className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">
                {template.description}
              </p>
            </div>
            
            {!showSelector && (
              <div className="ml-2 flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateView(template);
                  }}
                  className="p-1"
                >
                  <FiEye className="w-3 h-3" />
                </Button>
                {!template.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTemplateDelete(template.id);
                    }}
                    className="p-1 text-red-600 hover:bg-red-50"
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="info" size="sm">
              {INTERVIEW_TYPE_LABELS[template.type]}
            </Badge>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
              {template.category}
            </span>
            {template.isDefault && (
              <Badge variant="success" size="sm">Por defecto</Badge>
            )}
          </div>

          {/* Detalles */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <span>⏱️ {template.recommendedDuration}min</span>
              <span>📍 {INTERVIEW_MODE_LABELS[template.recommendedMode]}</span>
            </div>
            {stats && (
              <span className="text-blue-600">
                📊 {stats.timesUsed} usos
              </span>
            )}
          </div>

          {/* Tags */}
          {template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map(tag => (
                <span 
                  key={tag} 
                  className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{template.tags.length - 3} más
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderTemplateDetails = (template: InterviewTemplate) => {
    const stats = interviewTemplateService.getTemplateStats(template.id);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
              <p className="text-gray-600 mt-1">{template.description}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTemplateExport(template)}
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              {showSelector && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleTemplateSelect(template);
                    setShowTemplateModal(false);
                  }}
                >
                  Usar Template
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{INTERVIEW_TYPE_LABELS[template.type]}</Badge>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
              {template.category}
            </span>
            <Badge variant="neutral">⏱️ {template.recommendedDuration} min</Badge>
            <Badge variant="neutral">📍 {INTERVIEW_MODE_LABELS[template.recommendedMode]}</Badge>
            {template.isDefault && <Badge variant="success">Por defecto</Badge>}
          </div>
        </div>

        {/* Estadísticas si están disponibles */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.timesUsed}</div>
              <div className="text-sm text-gray-600">Veces usado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.averageScore > 0 ? stats.averageScore.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Puntuación promedio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.successRate > 0 ? `${stats.successRate.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Tasa de éxito</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.feedbackRating > 0 ? stats.feedbackRating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Valoración</div>
            </div>
          </div>
        )}

        {/* Documentos requeridos */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2">📋 Documentos Requeridos</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {template.requiredDocuments.map((doc, index) => (
              <li key={index}>{doc}</li>
            ))}
          </ul>
        </div>

        {/* Notas de preparación */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2">🎯 Preparación</h3>
          <div className="bg-blue-50 p-3 rounded-lg">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
              {template.preparationNotes}
            </pre>
          </div>
        </div>

        {/* Criterios de evaluación */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">⚖️ Criterios de Evaluación</h3>
          <div className="space-y-3">
            {template.evaluationCriteria.map((criteria) => (
              <div key={criteria.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{criteria.name}</h4>
                  <Badge variant="info" size="sm">
                    Peso: {criteria.weight}/10
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{criteria.description}</p>
                <div className="text-xs text-gray-500">
                  Rango: {criteria.scoreRange.min}-{criteria.scoreRange.max}
                </div>
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Indicadores:</div>
                  <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                    {criteria.indicators.map((indicator, idx) => (
                      <li key={idx}>{indicator}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preguntas sugeridas */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">❓ Preguntas Sugeridas</h3>
          <div className="space-y-4">
            {template.suggestedQuestions.map((question) => (
              <div key={question.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" size="sm">
                    {question.category}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {question.expectedResponseType}
                  </Badge>
                </div>
                <p className="font-medium text-gray-900 mb-1">{question.question}</p>
                <p className="text-sm text-gray-600 mb-2">{question.purpose}</p>
                
                {question.followUpQuestions && question.followUpQuestions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-gray-700 mb-1">Seguimiento:</div>
                    <ul className="list-disc list-inside text-xs text-gray-600">
                      {question.followUpQuestions.map((followUp, idx) => (
                        <li key={idx}>{followUp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {question.positiveIndicators && question.positiveIndicators.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-green-700 mb-1">✅ Indicadores positivos:</div>
                    <ul className="list-disc list-inside text-xs text-green-600">
                      {question.positiveIndicators.map((indicator, idx) => (
                        <li key={idx}>{indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {question.redFlags && question.redFlags.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-red-700 mb-1">🚩 Señales de alerta:</div>
                    <ul className="list-disc list-inside text-xs text-red-600">
                      {question.redFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Acciones de seguimiento */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2">🔄 Acciones de Seguimiento</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            {template.followUpActions.map((action, index) => (
              <li key={index}>{action}</li>
            ))}
          </ul>
        </div>

        {/* Tags */}
        <div>
          <h3 className="font-medium text-gray-900 mb-2">🏷️ Tags</h3>
          <div className="flex flex-wrap gap-2">
            {template.tags.map(tag => (
              <span 
                key={tag} 
                className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FiBookOpen className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {showSelector ? 'Seleccionar Template' : 'Gestión de Templates'}
            </h2>
            <p className="text-sm text-gray-600">
              {showSelector 
                ? 'Elige un template predefinido para la entrevista'
                : 'Administra templates de entrevista predefinidos y personalizados'
              }
            </p>
          </div>
        </div>

        {!showSelector && (
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept=".json"
              onChange={handleTemplateImport}
              style={{ display: 'none' }}
              id="import-template"
            />
            <label htmlFor="import-template">
              <Button variant="outline" size="sm" as="span">
                <FiUpload className="w-4 h-4 mr-2" />
                Importar
              </Button>
            </label>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Crear Template
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, descripción o tags..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as InterviewType | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los tipos</option>
              {Object.values(InterviewType).map(type => (
                <option key={type} value={type}>
                  {INTERVIEW_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as InterviewTemplate['category'] | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="academic">Académica</option>
              <option value="psychological">Psicológica</option>
              <option value="family">Familiar</option>
              <option value="behavioral">Conductual</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOnlyDefault}
                onChange={(e) => setShowOnlyDefault(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Solo por defecto</span>
            </label>
          </div>

          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setFilterCategory('all');
                setShowOnlyDefault(false);
              }}
            >
              Limpiar
            </Button>
          </div>
        </div>
      </Card>

      {/* Grid de templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(renderTemplateCard)}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FiBookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron templates
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all' || filterCategory !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'No hay templates disponibles'
            }
          </p>
          {!showSelector && (
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Crear Primer Template
            </Button>
          )}
        </div>
      )}

      {/* Modal de detalles del template */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Detalles del Template"
        size="xl"
      >
        {selectedTemplate && renderTemplateDetails(selectedTemplate)}
      </Modal>

      {/* Modal de creación (placeholder) */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Template"
        size="lg"
      >
        <div className="text-center py-8">
          <FiPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Creador de Templates
          </h3>
          <p className="text-gray-600 mb-4">
            Esta funcionalidad estará disponible próximamente.
          </p>
          <p className="text-sm text-gray-500">
            Por ahora puedes importar templates existentes o usar los predefinidos.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default InterviewTemplateManager;