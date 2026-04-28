import React, { useState } from 'react';
import { Evaluation, EvaluationType, EVALUATION_TYPE_LABELS } from '../../types/evaluation';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface CycleDirectorFormProps {
  evaluation: Evaluation;
  onSave: (data: Partial<Evaluation>) => void;
  onComplete: (data: Partial<Evaluation>) => void;
  isSubmitting: boolean;
}

const CycleDirectorForm: React.FC<CycleDirectorFormProps> = ({
  evaluation,
  onSave,
  onComplete,
  isSubmitting
}) => {
  const [formData, setFormData] = useState<Partial<Evaluation>>({
    observations: evaluation.observations || '',
    strengths: evaluation.strengths || '',
    areasForImprovement: evaluation.areasForImprovement || '',
    recommendations: evaluation.recommendations || '',
    academicReadiness: evaluation.academicReadiness || '',
    behavioralAssessment: evaluation.behavioralAssessment || '',
    integrationPotential: evaluation.integrationPotential || '',
    finalRecommendation: evaluation.finalRecommendation || false
  });

  const [errors, setErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    const requiredFields = [
      { field: 'observations', label: 'Observaciones generales' },
      { field: 'academicReadiness', label: 'Preparación académica' },
      { field: 'behavioralAssessment', label: 'Evaluación conductual' },
      { field: 'integrationPotential', label: 'Potencial de integración' },
      { field: 'strengths', label: 'Fortalezas identificadas' },
      { field: 'areasForImprovement', label: 'Áreas de mejora' },
      { field: 'recommendations', label: 'Recomendaciones' }
    ];

    requiredFields.forEach(({ field, label }) => {
      const value = formData[field as keyof Evaluation] as string;
      if (!value || value.trim().length < 15) {
        newErrors.push(`${label} debe tener al menos 15 caracteres`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleComplete = () => {
    if (validateForm()) {
      onComplete(formData);
    }
  };

  const isInterviewType = evaluation.evaluationType === EvaluationType.CYCLE_DIRECTOR_INTERVIEW;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <h3 className="text-lg font-bold text-azul-monte-tabor mb-2">
          {isInterviewType ? '👥 Entrevista Director/a de Ciclo' : '📊 Informe Director de Ciclo'}
        </h3>
        {evaluation.application && evaluation.application.student && (
          <div className="text-sm text-gris-piedra">
            <p><strong>Estudiante:</strong> {evaluation.application.student.firstName} {evaluation.application.student.paternalLastName || evaluation.application.student.lastName || ''} {evaluation.application.student.maternalLastName || ''}</p>
            <p><strong>RUT:</strong> {evaluation.application.student.rut}</p>
            <p><strong>Curso al que postula:</strong> {evaluation.application.student.gradeApplied}</p>
          </div>
        )}
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <h4 className="font-semibold text-red-800 mb-2">⚠️ Campos requeridos:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">📋 Guía para la Evaluación Directorial</h4>
        <div className="text-sm text-blue-700 space-y-1">
          {isInterviewType ? (
            <>
              <p>• Evalúe la comunicación y presencia del estudiante durante la entrevista</p>
              <p>• Observe las habilidades de liderazgo y trabajo en equipo</p>
              <p>• Analice la motivación y compromiso con la institución</p>
              <p>• Considere la madurez y responsabilidad personal</p>
              <p>• Evalúe el potencial de adaptación al ambiente escolar</p>
            </>
          ) : (
            <>
              <p>• Analice la preparación académica general del estudiante</p>
              <p>• Evalúe el comportamiento y actitud hacia el aprendizaje</p>
              <p>• Considere el potencial de integración social y académica</p>
              <p>• Identifique fortalezas y áreas de desarrollo</p>
              <p>• Proporcione una recomendación fundamentada</p>
            </>
          )}
        </div>
      </Card>

      {/* Observaciones Generales */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">
          {isInterviewType ? '🗣️ Observaciones de la Entrevista' : '📝 Observaciones Generales'}
        </h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isInterviewType 
              ? 'Impresiones y observaciones durante la entrevista personal *'
              : 'Evaluación general del estudiante y su perfil académico *'
            }
          </label>
          <textarea
            value={formData.observations || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
            rows={4}
            placeholder={isInterviewType 
              ? "Describe la actitud, comunicación, presencia y desenvolvimiento del estudiante durante la entrevista..."
              : "Proporciona una evaluación integral del perfil del estudiante basada en la documentación y antecedentes..."
            }
          />
          <p className="text-xs text-gray-500 mt-1">
            Mínimo 15 caracteres • Actual: {(formData.observations || '').length}
          </p>
        </div>
      </Card>

      {/* Evaluaciones Específicas */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">🎯 Evaluación Específica del Director</h4>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📚 Preparación Académica y Readiness *
            </label>
            <textarea
              value={formData.academicReadiness || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, academicReadiness: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={4}
              placeholder="Evalúa la preparación académica del estudiante, conocimientos previos, hábitos de estudio, capacidad de seguir instrucciones..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Considera: nivel académico previo, madurez para el grado, autonomía en el aprendizaje...
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎭 Evaluación Conductual y Social *
            </label>
            <textarea
              value={formData.behavioralAssessment || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, behavioralAssessment: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={4}
              placeholder="Describe el comportamiento, habilidades sociales, respeto por las normas, interacción con autoridad..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Evalúa: disciplina, respeto, colaboración, resolución de conflictos, adaptabilidad...
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🤝 Potencial de Integración Institucional *
            </label>
            <textarea
              value={formData.integrationPotential || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, integrationPotential: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={4}
              placeholder="Analiza la capacidad del estudiante para integrarse a la comunidad educativa, valores institucionales, participación..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Considera: alineación con valores institucionales, potencial de liderazgo, participación en actividades...
            </p>
          </div>
        </div>
      </Card>

      {/* Análisis y Recomendaciones */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">💡 Análisis Directorial</h4>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ✅ Fortalezas Principales del Estudiante *
            </label>
            <textarea
              value={formData.strengths || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Identifica las principales fortalezas académicas, personales y sociales del estudiante..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 Áreas de Desarrollo y Acompañamiento *
            </label>
            <textarea
              value={formData.areasForImprovement || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, areasForImprovement: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Señala aspectos que requieren apoyo, desarrollo o seguimiento especial..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📋 Recomendaciones Institucionales *
            </label>
            <textarea
              value={formData.recommendations || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={4}
              placeholder="Proporciona recomendaciones específicas para el acompañamiento y desarrollo del estudiante en la institución..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Incluye estrategias de apoyo académico, social, emocional y de integración institucional...
            </p>
          </div>
        </div>
      </Card>

      {/* Recomendación Final */}
      <Card className="p-6 border-2 border-purple-200">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">🎯 Decisión Directorial</h4>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              Como Director de Ciclo, basándose en esta evaluación, ¿recomendaría la admisión de este estudiante?
            </p>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="finalRecommendation"
                  checked={formData.finalRecommendation === true}
                  onChange={() => setFormData(prev => ({ ...prev, finalRecommendation: true }))}
                  className="mr-2"
                />
                <span className="text-green-700 font-medium">✅ SÍ - Recomiendo la admisión</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="finalRecommendation"
                  checked={formData.finalRecommendation === false}
                  onChange={() => setFormData(prev => ({ ...prev, finalRecommendation: false }))}
                  className="mr-2"
                />
                <span className="text-red-700 font-medium">❌ NO - No recomiendo la admisión</span>
              </label>
            </div>
          </div>

          {formData.finalRecommendation !== undefined && (
            <div className={`p-3 rounded-lg ${formData.finalRecommendation ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <Badge 
                variant={formData.finalRecommendation ? 'success' : 'error'}
                size="sm"
              >
                {formData.finalRecommendation 
                  ? '✅ Recomendación Positiva' 
                  : '❌ Recomendación Negativa'
                }
              </Badge>
              <p className={`text-xs mt-2 ${formData.finalRecommendation ? 'text-green-700' : 'text-red-700'}`}>
                {formData.finalRecommendation 
                  ? 'El estudiante cumple con los criterios institucionales y se recomienda su admisión.'
                  : 'El estudiante no cumple con los criterios institucionales en este momento.'
                }
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Criterios de Evaluación */}
      <Card className="p-6 bg-gray-50">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">📊 Criterios de Evaluación Directorial</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Preparación Académica:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Conocimientos previos apropiados</li>
              <li>• Hábitos de estudio establecidos</li>
              <li>• Capacidad de seguir instrucciones</li>
              <li>• Autonomía en el aprendizaje</li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Desarrollo Social:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Habilidades de comunicación</li>
              <li>• Respeto por las normas</li>
              <li>• Colaboración y trabajo en equipo</li>
              <li>• Resolución de conflictos</li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Integración Institucional:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Alineación con valores institucionales</li>
              <li>• Potencial de participación</li>
              <li>• Adaptabilidad al ambiente escolar</li>
              <li>• Compromiso con la excelencia</li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Madurez Personal:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Responsabilidad personal</li>
              <li>• Autocontrol y disciplina</li>
              <li>• Motivación intrínseca</li>
              <li>• Perspectiva de futuro</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => handleSave()}
          disabled={isSubmitting}
          className="flex-1"
        >
          💾 Guardar Borrador
        </Button>
        <Button
          variant="primary"
          onClick={() => handleComplete()}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Procesando...' : '✅ Completar Evaluación'}
        </Button>
      </div>
    </div>
  );
};

export default CycleDirectorForm;