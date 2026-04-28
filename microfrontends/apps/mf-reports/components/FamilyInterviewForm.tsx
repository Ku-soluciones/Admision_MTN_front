import React, { useState, useEffect } from 'react';
import { FiSave, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { familyInterviewService } from '../services/familyInterviewService';
import { fullTemplateData } from '@/src/data/minified_template';

interface FamilyInterviewFormProps {
  evaluation: any; // Evaluation data with gradeApplied
  onSave?: (data: any, score: number) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  readonly?: boolean;
}

const FamilyInterviewForm: React.FC<FamilyInterviewFormProps> = ({
  evaluation,
  onSave,
  onCancel,
  disabled = false,
  readonly = false
}) => {
  const [template, setTemplate] = useState<any>(null);
  const [interviewData, setInterviewData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);

  // Load template and existing data when component mounts
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);

        // Template is now imported as TypeScript constant (not JSON)
        // This ensures it's bundled as native JS and works in Vercel production
        console.log('🔍 Loading FULL template (TypeScript constant, no grade filtering)');
        console.log('🔍 fullTemplateData imported:', fullTemplateData);
        console.log('🔍 typeof fullTemplateData:', typeof fullTemplateData);
        console.log('🔍 fullTemplateData keys:', fullTemplateData ? Object.keys(fullTemplateData) : 'NULL/UNDEFINED');

        // Use the statically imported template
        const templateData = fullTemplateData as any;

        if (!templateData) {
          console.error('❌ Template is null or undefined after import!');
          alert('Error: El template no se pudo cargar. Ver consola para detalles.');
          return;
        }

        setTemplate(templateData);
        console.log('✅ FULL Template loaded:', templateData);
        console.log('📋 Sections available:', Object.keys(templateData.sections || {}));
        console.log('👁️ Observations:', templateData.observations);

        // Load existing interview data if evaluation exists
        if (evaluation.id) {
          try {
            const { data, score } = await familyInterviewService.getInterviewData(evaluation.id);

            if (data && Object.keys(data).length > 0) {
              setInterviewData(data);
              setCurrentScore(score);
              console.log('✅ Existing interview data loaded:', data);
            } else {
              // Initialize empty structure
              setInterviewData(initializeEmptyData(templateData));
            }
          } catch (error) {
            console.log('ℹ️ No existing interview data found, starting fresh');
            setInterviewData(initializeEmptyData(templateData));
          }
        } else {
          setInterviewData(initializeEmptyData(templateData));
        }
      } catch (error: any) {
        console.error('❌ Error loading template:', error);
        alert(error.message || 'Error al cargar el template de entrevista');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [evaluation.id, evaluation.studentGrade, evaluation.gradeApplied, evaluation.student?.gradeApplied]);

  // Calculate percentage whenever interview data changes
  useEffect(() => {
    if (template && interviewData) {
      const percentage = familyInterviewService.getScorePercentage(interviewData);
      setCurrentScore(percentage);
    }
  }, [interviewData, template]);

  // Initialize empty data structure based on template
  const initializeEmptyData = (templateData: any) => {
    const data: any = {};

    // Initialize sections
    if (templateData.sections) {
      for (const [sectionKey, sectionData] of Object.entries(templateData.sections as any)) {
        data[sectionKey] = {};

        for (const questionKey of Object.keys(sectionData.questions)) {
          data[sectionKey][questionKey] = {
            score: 0,
            text: ''
          };
        }
      }
    }

    // Initialize observations
    data.observations = {
      checklist: {},
      overallOpinion: {
        score: 0,
        text: ''
      }
    };

    return data;
  };

  // Handle question score change
  const handleScoreChange = (sectionKey: string, questionKey: string, score: number) => {
    setInterviewData((prev: any) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [questionKey]: {
          ...prev[sectionKey]?.[questionKey],
          score
        }
      }
    }));
  };

  // Handle observation checklist change
  const handleChecklistChange = (itemKey: string, checked: boolean) => {
    setInterviewData((prev: any) => ({
      ...prev,
      observations: {
        ...prev.observations,
        checklist: {
          ...prev.observations?.checklist,
          [itemKey]: checked
        }
      }
    }));
  };

  // Handle overall opinion change
  const handleOverallOpinionChange = (score: number) => {
    setInterviewData((prev: any) => ({
      ...prev,
      observations: {
        ...prev.observations,
        overallOpinion: {
          score
        }
      }
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!evaluation.id) {
      console.error('ID de evaluación no encontrado');
      alert('ID de evaluación no encontrado');
      return;
    }

    try {
      setSaving(true);

      // Validate responses
      const validation = familyInterviewService.validateResponses(template, interviewData);

      if (!validation.valid) {
        console.warn('⚠️ Validation errors:', validation.errors);
        alert(`Formulario incompleto: ${validation.errors.length} campos faltantes`);
        return;
      }

      // Save to backend
      const result = await familyInterviewService.saveInterviewData(evaluation.id, interviewData);

      console.log('✅ Interview data saved:', result);

      // Call parent onSave callback if provided
      // Parent will handle navigation and success message
      if (onSave) {
        await onSave(result.interview_data, result.totalScore);
      }
    } catch (error: any) {
      console.error('❌ Error saving interview:', error);
      alert(error.message || 'Error al guardar la entrevista');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to get grade range label
  const getGradeRangeLabel = (applicableTo: string): string | null => {
    const rangeMap: Record<string, string> = {
      'PREKINDER_2BASICO': 'Pre Kinder a 2° Básico',
      '3BASICO_4BASICO': '3° Básico a 4° Básico',
      '5BASICO_3MEDIO': '5° Básico a IV Medio',
      '4MEDIO': 'IV Medio',
      'ALL_LEVELS': null, // Don't show for all levels
    };
    return rangeMap[applicableTo] || null;
  };

  // Render score selector for a question
  const renderScoreSelector = (
    sectionKey: string,
    questionKey: string,
    question: any
  ) => {
    const currentValue = interviewData[sectionKey]?.[questionKey]?.score || 0;
    const gradeRangeLabel = getGradeRangeLabel(question.applicableTo);

    return (
      <div className="space-y-3">
        {/* Question Title */}
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-gray-900">
            {question.number && `${question.number}. `}
            {question.title || question.text}
          </h4>
          {gradeRangeLabel && (
            <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
              {gradeRangeLabel}
            </span>
          )}
        </div>

        {/* Question Statement (if exists) */}
        {question.question && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
            <p className="text-sm text-gray-700 font-medium">
              Pregunta: {question.question}
            </p>
          </div>
        )}

        {/* Focus/Context (if exists) */}
        {question.focus && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              FOCO PARA EL ENTREVISTADOR:
            </p>
            <p className="text-sm text-gray-700">
              {question.focus}
            </p>
          </div>
        )}

        {/* Score Options */}
        <div className="space-y-2 mt-4">
          {Object.entries(question.rubric).map(([score, rubricData]) => {
            const scoreNum = parseInt(score);
            const isSelected = currentValue === scoreNum;
            const description = typeof rubricData === 'object' ? (rubricData as any).description : rubricData;

            return (
              <label
                key={score}
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                } ${readonly ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name={`${sectionKey}-${questionKey}`}
                  value={scoreNum}
                  checked={isSelected}
                  onChange={() => !readonly && handleScoreChange(sectionKey, questionKey, scoreNum)}
                  disabled={readonly || disabled}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {scoreNum} punto{scoreNum > 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-gray-600">{description}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <FiLoader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando formulario de entrevista...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <FiAlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">No se pudo cargar el template de entrevista</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6 space-y-8">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">
          {template.metadata?.title || 'Entrevista a Familias'}
        </h1>
        <p className="text-gray-600">
          Grado: <span className="font-semibold">{template.gradeApplied}</span>
          {' · '}
          Rango: <span className="font-semibold">{template.gradeRange}</span>
        </p>
      </div>

      {/* Presentación Familia Postulante */}
      <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center">
          <span className="mr-2">👥</span>
          PRESENTACIÓN FAMILIA POSTULANTE
        </h2>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 font-bold">•</span>
            <p>Se presenta cada una de los entrevistadores.</p>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 font-bold">•</span>
            <p>Luego una de ellos los invita a presentarse en forma personal: su familia de origen, paso por el colegio y universidad…</p>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 font-bold">•</span>
            <p className="font-medium">¿Cómo fue su experiencia en el colegio?</p>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 font-bold">•</span>
            <p>Ahondar en otras situaciones que resalten en su historia familiar.</p>
          </div>
        </div>
      </section>

      {/* Dynamic Sections */}
      {template.sections && Object.entries(template.sections).map(([sectionKey, sectionData]: [string, any]) => {
        // Calculate section score
        const sectionScore = Object.keys(sectionData.questions).reduce((total, qKey) => {
          return total + (interviewData[sectionKey]?.[qKey]?.score || 0);
        }, 0);

        const maxSectionScore = Object.keys(sectionData.questions).reduce((total, qKey) => {
          const question = sectionData.questions[qKey];
          const maxScore = Math.max(...Object.keys(question.rubric).map(Number));
          return total + maxScore;
        }, 0);

        return (
          <section key={sectionKey} className="border-t pt-6">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">
              {sectionData.title}
            </h2>

            <div className="space-y-6">
              {Object.entries(sectionData.questions).map(([questionKey, question]: [string, any]) => (
                <div key={questionKey} className="p-4 bg-gray-50 rounded-lg">
                  {renderScoreSelector(sectionKey, questionKey, question)}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold">
                Subtotal {sectionData.title}: {sectionScore} / {maxSectionScore} puntos
              </p>
            </div>
          </section>
        );
      })}

      {/* Observations Section */}
      {template.observations && template.observations.sections && (
        <section className="border-t pt-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">
            {template.observations.title || 'OBSERVACIONES DE LOS ENTREVISTADORES'}
          </h2>

          <p className="text-sm text-gray-600 mb-4">{template.observations.note}</p>

          {/* Checklist */}
          {template.observations.sections.observations_checklist && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {template.observations.sections.observations_checklist.title}
              </h3>
              <div className="space-y-3">
                {Array.isArray(template.observations.sections.observations_checklist.items) &&
                  template.observations.sections.observations_checklist.items.map((item: any, index: number) => {
                    const isChecked = interviewData.observations?.checklist?.[item.id] || false;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <span className="font-medium flex-1">{item.text}</span>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => !readonly && handleChecklistChange(item.id, e.target.checked)}
                              disabled={readonly || disabled}
                              className="mr-2"
                            />
                            {isChecked ? `Sí (${item.score} pt)` : 'No (0 pt)'}
                          </label>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold">
                  Subtotal Checklist: {
                    template.observations.sections.observations_checklist.items.filter((item: any) =>
                      interviewData.observations?.checklist?.[item.id]
                    ).reduce((total: number, item: any) => total + item.score, 0)
                  } / {template.observations.sections.observations_checklist.maxScore} puntos
                </p>
              </div>
            </div>
          )}

          {/* Overall Opinion */}
          {template.observations.sections.overall_opinion && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {template.observations.sections.overall_opinion.title}
              </h3>
              <div className="space-y-2">
                {Array.isArray(template.observations.sections.overall_opinion.options) &&
                  template.observations.sections.overall_opinion.options.map((option: any, index: number) => {
                    const isSelected = interviewData.observations?.overallOpinion?.score === option.score;

                    return (
                      <label
                        key={option.score}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="overallOpinion"
                          value={option.score}
                          checked={isSelected}
                          onChange={() => !readonly && handleOverallOpinionChange(option.score)}
                          disabled={readonly || disabled}
                          className="mr-3"
                        />
                        <span className="flex-1">{option.text}</span>
                        <span className="font-semibold text-blue-900">{option.score} pts</span>
                      </label>
                    );
                  })}
              </div>

              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold">
                  Subtotal Opinión: {interviewData.observations?.overallOpinion?.score || 0} / {template.observations.sections.overall_opinion.maxScore} puntos
                </p>
              </div>
            </div>
          )}

          {/* Justification Text Area */}
          {template.observations.sections.justification && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {template.observations.sections.justification.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{template.observations.sections.justification.note}</p>
              <textarea
                value={interviewData.observations?.justification || ''}
                onChange={(e) => !readonly && setInterviewData((prev: any) => ({
                  ...prev,
                  observations: {
                    ...prev.observations,
                    justification: e.target.value
                  }
                }))}
                disabled={readonly || disabled}
                rows={5}
                maxLength={500}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Escriba su justificación aquí (máximo 5 líneas)..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {interviewData.observations?.justification?.length || 0} / 500 caracteres
              </p>
            </div>
          )}
        </section>
      )}

      {/* Total Score */}
      <div className="border-t pt-6">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg">
          <h3 className="text-2xl font-bold mb-4">Porcentaje Total</h3>
          <div className="text-center">
            <p className="text-5xl font-bold">
              {currentScore}%
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!readonly && (
        <div className="flex items-center justify-end space-x-4 border-t pt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled || saving}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={disabled || saving}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <FiLoader className="mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <FiCheck className="mr-2" />
                Guardar Entrevista
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
};

export default FamilyInterviewForm;
