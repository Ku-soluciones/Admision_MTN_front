import React, { useState } from 'react';
import { Evaluation, EvaluationType } from '../../types/evaluation';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

interface PsychologicalInterviewFormProps {
  evaluation: Evaluation;
  onSave: (data: Partial<Evaluation>) => void;
  onComplete: (data: Partial<Evaluation>) => void;
  isSubmitting: boolean;
}

const PsychologicalInterviewForm: React.FC<PsychologicalInterviewFormProps> = ({
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
    socialSkillsAssessment: evaluation.socialSkillsAssessment || '',
    emotionalMaturity: evaluation.emotionalMaturity || '',
    motivationAssessment: evaluation.motivationAssessment || '',
    familySupportAssessment: evaluation.familySupportAssessment || ''
  });

  const [errors, setErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    const requiredFields = [
      { field: 'observations', label: 'Observaciones generales' },
      { field: 'socialSkillsAssessment', label: 'Evaluación de habilidades sociales' },
      { field: 'emotionalMaturity', label: 'Madurez emocional' },
      { field: 'motivationAssessment', label: 'Evaluación de motivación' },
      { field: 'familySupportAssessment', label: 'Evaluación del apoyo familiar' },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4 bg-purple-50 border-purple-200">
        <h3 className="text-lg font-bold text-azul-monte-tabor mb-2">
          🧠 Entrevista Psicológica
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
        <h4 className="font-semibold text-blue-800 mb-2">📋 Guía para la Evaluación Psicológica</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Observe el comportamiento del estudiante durante la entrevista</p>
          <p>• Evalúe la capacidad de comunicación y expresión emocional</p>
          <p>• Considere la madurez apropiada para la edad</p>
          <p>• Analice la motivación para el aprendizaje y la integración social</p>
          <p>• Identifique el nivel de apoyo familiar percibido</p>
        </div>
      </Card>

      {/* Observaciones Generales */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">👁️ Observaciones Generales de la Entrevista</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Impresión general y comportamiento durante la entrevista *
          </label>
          <textarea
            value={formData.observations || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
            rows={4}
            placeholder="Describe el comportamiento general, actitud, nivel de cooperación, comunicación verbal y no verbal..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Mínimo 15 caracteres • Actual: {(formData.observations || '').length}
          </p>
        </div>
      </Card>

      {/* Evaluación Psicológica Específica */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">🧠 Evaluación Psicológica Específica</h4>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🤝 Habilidades Sociales y Comunicación *
            </label>
            <textarea
              value={formData.socialSkillsAssessment || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, socialSkillsAssessment: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Evalúa la capacidad de interacción social, expresión de ideas, escucha activa, empatía..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Considera: contacto visual, expresión verbal, capacidad de diálogo, respeto por turnos...
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💭 Madurez Emocional *
            </label>
            <textarea
              value={formData.emotionalMaturity || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, emotionalMaturity: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Describe el nivel de madurez emocional apropiado para la edad, autorregulación, manejo de emociones..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Evalúa: autocontrol, expresión emocional apropiada, tolerancia a la frustración...
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 Motivación y Actitud hacia el Aprendizaje *
            </label>
            <textarea
              value={formData.motivationAssessment || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, motivationAssessment: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Evalúa el interés por aprender, curiosidad, disposición a enfrentar desafíos académicos..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Considera: entusiasmo, perseverancia, actitud hacia las tareas, metas personales...
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👨‍👩‍👧‍👦 Evaluación del Apoyo Familiar *
            </label>
            <textarea
              value={formData.familySupportAssessment || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, familySupportAssessment: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Describe la percepción del estudiante sobre el apoyo familiar, estructura familiar, expectativas..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Evalúa: comunicación familiar, apoyo académico, estabilidad del entorno familiar...
            </p>
          </div>
        </div>
      </Card>

      {/* Análisis y Recomendaciones */}
      <Card className="p-6">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">💡 Análisis y Recomendaciones</h4>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ✅ Fortalezas Psicológicas Identificadas *
            </label>
            <textarea
              value={formData.strengths || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, strengths: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Identifica las principales fortalezas emocionales, sociales y cognitivas del estudiante..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 Áreas de Desarrollo *
            </label>
            <textarea
              value={formData.areasForImprovement || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, areasForImprovement: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={3}
              placeholder="Señala aspectos emocionales o sociales que podrían beneficiarse de apoyo adicional..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📋 Recomendaciones Psicopedagógicas *
            </label>
            <textarea
              value={formData.recommendations || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-monte-tabor"
              rows={4}
              placeholder="Proporciona recomendaciones específicas para el apoyo psicológico y la integración escolar..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Incluye estrategias de apoyo emocional, recomendaciones para padres y profesores...
            </p>
          </div>
        </div>
      </Card>

      {/* Criterios de Evaluación */}
      <Card className="p-6 bg-gray-50">
        <h4 className="font-semibold text-azul-monte-tabor mb-4">📊 Criterios de Evaluación Psicológica</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Desarrollo Emocional:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Autoconciencia emocional</li>
              <li>• Regulación emocional</li>
              <li>• Expresión apropiada de emociones</li>
              <li>• Resiliencia y adaptabilidad</li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Habilidades Sociales:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Comunicación efectiva</li>
              <li>• Empatía y comprensión social</li>
              <li>• Habilidades de colaboración</li>
              <li>• Resolución de conflictos</li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Motivación y Actitud:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Interés por el aprendizaje</li>
              <li>• Perseverancia ante dificultades</li>
              <li>• Autonomía y autorregulación</li>
              <li>• Actitud positiva hacia la escuela</li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Contexto Familiar:</h5>
            <ul className="text-gray-600 space-y-1">
              <li>• Apoyo familiar percibido</li>
              <li>• Comunicación familiar</li>
              <li>• Estabilidad del entorno</li>
              <li>• Expectativas familiares</li>
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
          {isSubmitting ? 'Procesando...' : '✅ Completar Entrevista'}
        </Button>
      </div>
    </div>
  );
};

export default PsychologicalInterviewForm;