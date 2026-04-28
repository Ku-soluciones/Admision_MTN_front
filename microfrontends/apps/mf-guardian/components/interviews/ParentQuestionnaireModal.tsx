import React, { useState, useEffect } from 'react';
import { FiX, FiUsers, FiHeart, FiSmile, FiAlertCircle } from 'react-icons/fi';
import Card from '../ui/Card';
import { applicationService } from '../../services/applicationService';

interface ChildDescription {
  childName: string;
  description: string;
  dream: string;
}

interface ComplementaryFormData {
  otherSchools?: string;
  fatherName?: string;
  fatherEducation?: string;
  fatherCurrentActivity?: string;
  motherName?: string;
  motherEducation?: string;
  motherCurrentActivity?: string;
  applicationReasons?: string;
  schoolChangeReason?: string;
  familyValues?: string;
  faithExperiences?: string;
  communityServiceExperiences?: string;
  childrenDescriptions?: ChildDescription[];
  isSubmitted?: boolean;
  submittedAt?: string;
}

interface ParentQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
}

type TabKey = 'family' | 'values' | 'children';

const ParentQuestionnaireModal: React.FC<ParentQuestionnaireModalProps> = ({
  isOpen,
  onClose,
  applicationId
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('family');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ComplementaryFormData | null>(null);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadQuestionnaireData();
    }
  }, [isOpen, applicationId]);

  const loadQuestionnaireData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await applicationService.getComplementaryForm(applicationId);

      if (data) {
        setFormData(data);
      } else {
        setFormData(null);
      }
    } catch (err: any) {
      console.error('Error loading questionnaire:', err);
      if (err.response?.status === 404) {
        setError('Los padres aún no han completado el cuestionario complementario.');
      } else {
        setError('Error al cargar el cuestionario. Por favor, intenta nuevamente.');
      }
      setFormData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { key: 'family' as TabKey, label: 'Información Familiar', icon: FiUsers },
    { key: 'values' as TabKey, label: 'Valores y Experiencias', icon: FiHeart },
    { key: 'children' as TabKey, label: 'Descripciones de Hijos', icon: FiSmile }
  ];

  const renderFieldValue = (value: string | undefined, placeholder: string = 'No respondido') => {
    return (
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="text-gray-800 whitespace-pre-wrap">
          {value || <span className="text-gray-400 italic">{placeholder}</span>}
        </p>
      </div>
    );
  };

  const renderFamilyTab = () => (
    <div className="space-y-6">
      {/* Información del Padre */}
      <div>
        <h3 className="text-lg font-semibold text-azul-monte-tabor mb-3 flex items-center gap-2">
          <FiUsers className="w-5 h-5" />
          Información del Padre
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            {renderFieldValue(formData?.fatherName)}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nivel de Educación
            </label>
            {renderFieldValue(formData?.fatherEducation)}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actividad Actual
            </label>
            {renderFieldValue(formData?.fatherCurrentActivity)}
          </div>
        </div>
      </div>

      {/* Información de la Madre */}
      <div>
        <h3 className="text-lg font-semibold text-azul-monte-tabor mb-3 flex items-center gap-2">
          <FiUsers className="w-5 h-5" />
          Información de la Madre
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            {renderFieldValue(formData?.motherName)}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nivel de Educación
            </label>
            {renderFieldValue(formData?.motherEducation)}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actividad Actual
            </label>
            {renderFieldValue(formData?.motherCurrentActivity)}
          </div>
        </div>
      </div>

      {/* Otros Colegios */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Otros colegios considerados
        </label>
        {renderFieldValue(formData?.otherSchools)}
      </div>
    </div>
  );

  const renderValuesTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿Por qué razones postula al Colegio?
        </label>
        {renderFieldValue(formData?.applicationReasons)}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿Por qué razón desea cambiar de establecimiento educacional?
        </label>
        {renderFieldValue(formData?.schoolChangeReason)}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿Qué valores son importantes para su familia?
        </label>
        {renderFieldValue(formData?.familyValues)}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Experiencias de fe de su familia
        </label>
        {renderFieldValue(formData?.faithExperiences)}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Experiencias de servicio comunitario
        </label>
        {renderFieldValue(formData?.communityServiceExperiences)}
      </div>
    </div>
  );

  const renderChildrenTab = () => {
    const children = formData?.childrenDescriptions || [];

    if (children.length === 0 || !children[0]?.childName) {
      return (
        <div className="text-center py-8">
          <FiSmile className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No hay descripciones de hijos registradas</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {children.map((child, index) => (
          <Card key={index} className="p-4 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-azul-monte-tabor mb-3 text-lg">
              {child.childName || `Hijo ${index + 1}`}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Cómo describiría a su hijo(a)?
                </label>
                {renderFieldValue(child.description)}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Cuál es el mayor anhelo/sueño que tiene para su hijo(a)?
                </label>
                {renderFieldValue(child.dream)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'family':
        return renderFamilyTab();
      case 'values':
        return renderValuesTab();
      case 'children':
        return renderChildrenTab();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-azul-monte-tabor">
                Cuestionario de los Padres
              </h2>
              {formData?.submittedAt && (
                <p className="text-sm text-gray-500 mt-1">
                  Completado el: {new Date(formData.submittedAt).toLocaleDateString('es-CL')}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-azul-monte-tabor mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando cuestionario...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <FiAlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Cuestionario No Disponible
                </h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={loadQuestionnaireData}
                  className="px-4 py-2 bg-azul-monte-tabor text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Intentar Nuevamente
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && formData && (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200 px-6">
                <div className="flex space-x-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`
                          flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors
                          ${activeTab === tab.key
                            ? 'border-azul-monte-tabor text-azul-monte-tabor'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {renderContent()}
              </div>
            </>
          )}

          {/* Empty State - cuando no hay loading, no hay error, pero tampoco hay datos */}
          {!loading && !error && !formData && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <FiAlertCircle className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Cuestionario No Completado
                </h3>
                <p className="text-gray-600 mb-4">
                  Los padres aún no han completado el cuestionario complementario para esta aplicación.
                </p>
                <p className="text-sm text-gray-500">
                  El cuestionario es necesario para continuar con el proceso de admisión. Por favor, solicite a los padres que lo completen.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentQuestionnaireModal;
