import React, { useState, useEffect } from 'react';
import { 
  AcademicEvaluation, 
  EvaluationType, 
  EvaluationStatus,
  EVALUATION_TYPE_LABELS,
  GRADE_OPTIONS,
  MIN_SCORE,
  MAX_SCORE,
  ValidationRules,
  UpdateEvaluationRequest
} from '../../types/evaluation';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface AcademicEvaluationFormProps {
  evaluation: AcademicEvaluation;
  onSave: (data: UpdateEvaluationRequest) => Promise<void>;
  onCancel: () => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
}

const AcademicEvaluationForm: React.FC<AcademicEvaluationFormProps> = ({
  evaluation,
  onSave,
  onCancel,
  isReadOnly = false,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<UpdateEvaluationRequest>({
    score: evaluation.score || 0,
    grade: evaluation.grade || '',
    observations: evaluation.observations || '',
    strengths: evaluation.strengths || '',
    areasForImprovement: evaluation.areasForImprovement || '',
    recommendations: evaluation.recommendations || '',
    status: evaluation.status
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.score || formData.score < 0 || formData.score > 100) {
      newErrors.push('El puntaje debe estar entre 0 y 100');
    }

    if (!formData.grade) {
      newErrors.push('Debe seleccionar una calificación');
    }

    if (!formData.observations || formData.observations.trim().length < 10) {
      newErrors.push('Las observaciones deben tener al menos 10 caracteres');
    }

    if (!formData.strengths || formData.strengths.trim().length < 10) {
      newErrors.push('Debe describir las fortalezas identificadas');
    }

    if (!formData.areasForImprovement || formData.areasForImprovement.trim().length < 10) {
      newErrors.push('Debe identificar áreas de mejora');
    }

    if (!formData.recommendations || formData.recommendations.trim().length < 10) {
      newErrors.push('Debe proporcionar recomendaciones');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleComplete = () => {
    if (validateForm()) {
      onComplete(formData);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-bold text-azul-monte-tabor mb-2">
          📚 {EVALUATION_TYPE_LABELS[evaluation.evaluationType]}
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
          <h4 className="font-semibold text-red-800 mb-2">⚠️ Errores de validación:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Score and Grade Section */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">🎯 Calificación y Puntaje</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Puntaje Numérico (0-100) *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.score || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              placeholder="Ingrese el puntaje obtenido"
            />
            {formData.score !== undefined && (
              <p className={`text-sm mt-1 font-medium ${getScoreColor(formData.score)}`}>
                {formData.score >= 90 ? '🟢 Excelente' :
                 formData.score >= 70 ? '🔵 Bueno' :
                 formData.score >= 60 ? '🟡 Satisfactorio' :
                 formData.score >= 40 ? '🟠 Insuficiente' : '🔴 Reprobado'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calificación Cualitativa *
            </label>
            <select
              value={formData.grade || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
            >
              <option value="">Seleccionar calificación...</option>
              <option value="A">A - Excelente (90-100)</option>
              <option value="B">B - Bueno (70-89)</option>
              <option value="C">C - Satisfactorio (60-69)</option>
              <option value="D">D - Insuficiente (40-59)</option>
              <option value="F">F - Reprobado (0-39)</option>
            </select>
            {formData.grade && (
              <div className={`mt-2 ${getGradeColor(formData.grade)}`}>
                <Badge variant={
                  formData.grade === 'A' ? 'success' :
                  formData.grade === 'B' ? 'info' :
                  formData.grade === 'C' ? 'warning' : 'error'
                } size="sm">
                  Calificación: {formData.grade}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Detailed Evaluation */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">📝 Evaluación Detallada</h4>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones Generales del Examen *
            </label>
            <textarea
              value={formData.observations || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={4}
              placeholder={`Describe el desempeño general del estudiante en el examen de ${EVALUATION_TYPE_LABELS[evaluation.evaluationType].toLowerCase()}...`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Mínimo 10 caracteres • Actual: {(formData.observations || '').length}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ✅ Fortalezas Identificadas *
            </label>
            <textarea
              value={formData.strengths || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Menciona las principales fortalezas académicas demostradas..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Ejemplo: Comprensión lectora avanzada, razonamiento lógico, creatividad en respuestas...
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 Áreas de Mejora *
            </label>
            <textarea
              value={formData.areasForImprovement || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, areasForImprovement: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Identifica aspectos específicos que requieren refuerzo..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Ejemplo: Resolución de problemas complejos, comprensión de enunciados, organización de ideas...
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💡 Recomendaciones Pedagógicas *
            </label>
            <textarea
              value={formData.recommendations || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={4}
              placeholder="Proporciona recomendaciones específicas para el desarrollo académico del estudiante..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Incluye estrategias de apoyo, recursos recomendados, enfoques pedagógicos...
            </p>
          </div>
        </div>
      </Card>

      {/* Subject-Specific Criteria */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">
          🔍 Criterios Específicos - {EVALUATION_TYPE_LABELS[evaluation.evaluationType]}
        </h4>
        
        {evaluation.evaluationType === EvaluationType.LANGUAGE_EXAM && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Comprensión Lectora:</h5>
              <ul className="text-gray-600 space-y-1">
                <li>• Interpretación de textos</li>
                <li>• Inferencias y conclusiones</li>
                <li>• Vocabulario y contexto</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Expresión Escrita:</h5>
              <ul className="text-gray-600 space-y-1">
                <li>• Coherencia y cohesión</li>
                <li>• Ortografía y gramática</li>
                <li>• Creatividad y originalidad</li>
              </ul>
            </div>
          </div>
        )}

        {evaluation.evaluationType === EvaluationType.MATHEMATICS_EXAM && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Razonamiento Lógico:</h5>
              <ul className="text-gray-600 space-y-1">
                <li>• Resolución de problemas</li>
                <li>• Pensamiento abstracto</li>
                <li>• Estrategias de solución</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Conocimientos:</h5>
              <ul className="text-gray-600 space-y-1">
                <li>• Operaciones básicas</li>
                <li>• Conceptos matemáticos</li>
                <li>• Aplicación práctica</li>
              </ul>
            </div>
          </div>
        )}

        {evaluation.evaluationType === EvaluationType.ENGLISH_EXAM && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Comprensión:</h5>
              <ul className="text-gray-600 space-y-1">
                <li>• Listening comprehension</li>
                <li>• Reading comprehension</li>
                <li>• Vocabulary range</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-gray-700">Expresión:</h5>
              <ul className="text-gray-600 space-y-1">
                <li>• Speaking fluency</li>
                <li>• Written expression</li>
                <li>• Grammar accuracy</li>
              </ul>
            </div>
          </div>
        )}
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

export default AcademicEvaluationForm;