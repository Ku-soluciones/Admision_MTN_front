import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../../admin/components/ui/Card';
import Button from '../../../admin/components/ui/Button';
import Input from '../../../admissions/components/ui/Input';
import TextArea from '../../../admin/components/ui/TextArea';
import StepWizard from '../../../admin/components/ui/StepWizard';
import { ArrowLeftIcon, SaveIcon, PrinterIcon } from '../../../admin/components/icons/Icons';
import { useNotifications } from '../../../admin/context/AppContext';
import { professorEvaluationService, ProfessorEvaluation } from '../../../admin/services/professorEvaluationService';
import { useAutoSave } from '../../../../packages/shared-ui/src/hooks/useAutoSave';
import ConfirmDialog from '../../../admissions/components/ui/ConfirmDialog';

// Define wizard steps
const WIZARD_STEPS = [
    { id: 'estudiante', title: 'Estudiante' },
    { id: 'antecedentes', title: 'Antecedentes' },
    { id: 'familia', title: 'Familia' },
    { id: 'escolar', title: 'Escolar' },
    { id: 'expectativas', title: 'Expectativas' },
    { id: 'observaciones', title: 'Observaciones' }
];

interface CycleDirectorInterviewData {
    // Datos básicos del estudiante (auto-rellenados)
    studentName: string;
    birthDate: string;
    age: string;
    currentSchool: string;
    gradeApplied: string;
    
    // Antecedentes relevantes
    relevantBackground: string;
    
    // Área Familiar
    familyDescription: string;
    familyActivities: string;
    parentalDiscipline: string;
    spiritualLife: string;
    
    // Área Integración/Adaptación al Colegio
    currentSchoolDescription: string;
    schoolLikesAndDislikes: string;
    peerRelationships: string;
    subjectPreferences: string;
    teacherOpinions: string;
    schoolChangeReason: string;
    groupWorkPreference: string;
    socialHistory: string;
    selfDescription: string;
    emotionalTriggers: string;
    magicWishes: string;
    
    // Expectativas del cambio
    schoolKnowledge: string;
    personalContribution: string;
    changeConcerns: string;
    
    // Observaciones
    affectiveContact: string;
    interviewAdaptation: string;
    vocabularyLanguage: string;
    socialIndividualObservations: string;
}

const CycleDirectorInterviewForm: React.FC = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const [evaluation, setEvaluation] = useState<ProfessorEvaluation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const notificationShownRef = useRef(false);
    
    const [interviewData, setInterviewData] = useState<CycleDirectorInterviewData>({
        // Datos básicos del estudiante
        studentName: '',
        birthDate: '',
        age: '',
        currentSchool: '',
        gradeApplied: '',
        
        // Antecedentes relevantes
        relevantBackground: '',
        
        // Área Familiar
        familyDescription: '',
        familyActivities: '',
        parentalDiscipline: '',
        spiritualLife: '',
        
        // Área Integración/Adaptación
        currentSchoolDescription: '',
        schoolLikesAndDislikes: '',
        peerRelationships: '',
        subjectPreferences: '',
        teacherOpinions: '',
        schoolChangeReason: '',
        groupWorkPreference: '',
        socialHistory: '',
        selfDescription: '',
        emotionalTriggers: '',
        magicWishes: '',
        
        // Expectativas del cambio
        schoolKnowledge: '',
        personalContribution: '',
        changeConcerns: '',
        
        // Observaciones
        affectiveContact: '',
        interviewAdaptation: '',
        vocabularyLanguage: '',
        socialIndividualObservations: ''
    });

    // Obtener profesor actual del localStorage
    const [currentProfessor] = useState(() => {
        const storedProfessor = localStorage.getItem('currentProfessor');
        return storedProfessor ? JSON.parse(storedProfessor) : null;
    });

    // Auto-save draft to localStorage
    const autoSave = useAutoSave({
        key: `cycle_director_interview_${evaluationId}`,
        data: interviewData,
        interval: 30000, // 30 seconds
        enabled: !isLoading && !isSubmitting
    });

    // Draft restoration dialog
    const [showDraftDialog, setShowDraftDialog] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);

    // Wizard step state
    const [currentStep, setCurrentStep] = useState(WIZARD_STEPS[0].id);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const loadEvaluation = async () => {
            if (!evaluationId) return;

            try {
                setIsLoading(true);

                const foundEvaluation = await professorEvaluationService.getEvaluationById(parseInt(evaluationId));

                if (foundEvaluation) {
                    setEvaluation(foundEvaluation);

                    // Calcular edad automáticamente si hay fecha de nacimiento
                    const calculateAge = (birthDate: string): string => {
                        if (!birthDate) return '';
                        const birth = new Date(birthDate);
                        const today = new Date();
                        let age = today.getFullYear() - birth.getFullYear();
                        const monthDiff = today.getMonth() - birth.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                            age--;
                        }
                        return age.toString();
                    };

                    // Formatear fecha para input type="date" (YYYY-MM-DD)
                    const formatDateForInput = (dateString: string | undefined): string => {
                        if (!dateString) return '';
                        // Si ya está en formato YYYY-MM-DD, retornar tal cual
                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
                        // Si es ISO format, extraer la fecha
                        return dateString.split('T')[0];
                    };

                    // Auto-rellenar datos básicos del estudiante desde la postulación
                    const birthDate = foundEvaluation.studentBirthDate || foundEvaluation.application?.student?.birthDate;
                    const formattedBirthDate = formatDateForInput(birthDate);

                    // Intentar recuperar datos guardados desde el campo strengths (JSON)
                    let savedInterviewData = null;
                    if (foundEvaluation.strengths) {
                        try {
                            // Intentar parsear como JSON
                            savedInterviewData = JSON.parse(foundEvaluation.strengths);
                        } catch (e) {
                            // Si no es JSON válido, puede ser texto plano de una versión anterior
                            // En este caso, simplemente no usamos datos guardados y permitimos editar
                            savedInterviewData = null;
                            // NO establecer error - esto es normal para entrevistas antiguas
                        }
                    }

                    setInterviewData(prev => ({
                        ...prev,
                        // Datos básicos del estudiante (siempre desde la evaluación)
                        studentName: foundEvaluation.studentName || '',
                        gradeApplied: foundEvaluation.studentGrade || '',
                        birthDate: formattedBirthDate,
                        currentSchool: foundEvaluation.currentSchool || foundEvaluation.application?.student?.currentSchool || '',
                        age: formattedBirthDate ? calculateAge(formattedBirthDate) : '',

                        // Si hay datos guardados en JSON, restaurarlos
                        ...(savedInterviewData || {})
                    }));

                } else {
                    setEvaluation(null);
                    setLoadError('not_found');
                }

            } catch (error: any) {
                setEvaluation(null);
                setLoadError('network_error');
            } finally {
                setIsLoading(false);
            }
        };

        loadEvaluation();
    }, [evaluationId]); // Solo evaluationId como dependencia - SIN addNotification para evitar bucle infinito

    // Effect separado para mostrar notificaciones (se ejecuta solo cuando cambia loadError)
    useEffect(() => {
        if (!isLoading && loadError && !notificationShownRef.current) {
            notificationShownRef.current = true; // Marcar como mostrado para evitar repetición

            if (loadError === 'not_found') {
                addNotification({
                    type: 'error',
                    title: 'Evaluación no encontrada',
                    message: 'No se encontró la evaluación solicitada'
                });
            } else if (loadError === 'network_error') {
                addNotification({
                    type: 'error',
                    title: 'Error de conexión',
                    message: 'No se pudo cargar la evaluación'
                });
            } else if (loadError === 'json_parse_error') {
                addNotification({
                    type: 'warning',
                    title: 'Datos previos corruptos',
                    message: 'No se pudieron recuperar los datos guardados previamente. Puedes llenar la entrevista nuevamente.'
                });
            }
        }
    }, [isLoading, loadError]); // NO incluir addNotification aquí tampoco

    // Effect para detectar y ofrecer restaurar borrador
    useEffect(() => {
        if (!isLoading && evaluation && !draftRestored && autoSave.hasDraft) {
            setShowDraftDialog(true);
        }
    }, [isLoading, evaluation, autoSave.hasDraft, draftRestored]);

    // Restaurar borrador
    const handleRestoreDraft = () => {
        const savedData = autoSave.restoreDraft();
        if (savedData) {
            // Solo restaurar campos editables, mantener datos del estudiante
            const { studentName, birthDate, age, currentSchool, gradeApplied, ...editableFields } = savedData as CycleDirectorInterviewData;
            setInterviewData(prev => ({
                ...prev,
                ...editableFields
            }));
            setDraftRestored(true);
            addNotification({
                type: 'success',
                title: 'Borrador restaurado',
                message: 'Se recuperó tu trabajo anterior'
            });
        }
        setShowDraftDialog(false);
    };

    // Descartar borrador
    const handleDiscardDraft = () => {
        autoSave.clearDraft();
        setDraftRestored(true);
        setShowDraftDialog(false);
    };

    const updateInterviewData = (field: keyof CycleDirectorInterviewData, value: string) => {
        setInterviewData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        if (!evaluation) return;
        
        setIsSubmitting(true);
        
        try {
            // Guardar datos estructurados en JSON para recuperación posterior
            const interviewDataJSON = JSON.stringify(interviewData);
            const storedProfessorName = [currentProfessor?.firstName, currentProfessor?.lastName]
                .filter((part): part is string => typeof part === 'string' && part.trim().length > 0 && !['undefined', 'null'].includes(part.trim().toLowerCase()))
                .join(' ');
            const interviewerName = storedProfessorName || evaluation.evaluatorName?.trim() || '';

            // Consolidar toda la información de la entrevista en los campos de la evaluación
            const updatedEvaluation: Partial<ProfessorEvaluation> = {
                // Guardar datos estructurados en JSON en el campo strengths
                strengths: interviewDataJSON,

                // Mantener formato legible en observations para revisión
                observations: `ENTREVISTA DIRECTOR DE CICLO

ANTECEDENTES RELEVANTES:
${interviewData.relevantBackground}

ÁREA FAMILIAR:
• Descripción de la familia: ${interviewData.familyDescription}
• Actividades familiares: ${interviewData.familyActivities}
• Disciplina parental: ${interviewData.parentalDiscipline}
• Vida espiritual: ${interviewData.spiritualLife}

ÁREA INTEGRACIÓN/ADAPTACIÓN:
• Colegio actual: ${interviewData.currentSchoolDescription}
• Gustos del colegio: ${interviewData.schoolLikesAndDislikes}
• Relación con compañeros: ${interviewData.peerRelationships}
• Asignaturas preferidas: ${interviewData.subjectPreferences}
• Opinión de profesores: ${interviewData.teacherOpinions}
• Razón del cambio: ${interviewData.schoolChangeReason}
• Trabajo en grupo: ${interviewData.groupWorkPreference}
• Historia social: ${interviewData.socialHistory}
• Autodescripción: ${interviewData.selfDescription}
• Emociones: ${interviewData.emotionalTriggers}
• Deseos mágicos: ${interviewData.magicWishes}

EXPECTATIVAS DEL CAMBIO:
• Conocimiento del colegio: ${interviewData.schoolKnowledge}
• Aporte personal: ${interviewData.personalContribution}
• Preocupaciones: ${interviewData.changeConcerns}`,

                recommendations: `OBSERVACIONES DE LA ENTREVISTA:
• Contacto afectivo: ${interviewData.affectiveContact}
• Adaptación a la entrevista: ${interviewData.interviewAdaptation}
• Vocabulario/Lenguaje: ${interviewData.vocabularyLanguage}
• Observaciones sociales/individuales: ${interviewData.socialIndividualObservations}${interviewerName ? `\n\nEntrevistador: ${interviewerName}` : ''}`,

                status: 'COMPLETED'
            };

            
            await professorEvaluationService.updateEvaluation(evaluation.id, updatedEvaluation);

            // Clear draft after successful save
            autoSave.clearDraft();

            setIsComplete(true);
            addNotification({
                type: 'success',
                title: 'Entrevista guardada',
                message: 'La entrevista del Director de Ciclo ha sido guardada exitosamente'
            });

            // Navigate back to dashboard after successful save
            setTimeout(() => {
                navigate('/profesor');
            }, 1500);
            
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Error al guardar',
                message: 'No se pudo guardar la entrevista. Intenta nuevamente.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('interview-form');
        if (printContent) {
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>Pauta Entrevista - Examen de Admisión ${new Date().getFullYear() + 1}</title>
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
                            <style>
                                :root {
                                    --azul-monte-tabor: #1e3a8a;
                                    --dorado-nazaret: #f59e0b;
                                    --gris-piedra: #6b7280;
                                }
                                body { font-family: 'Montserrat', sans-serif; margin: 20px; color: #1f2937; }
                                .header { text-align: center; margin-bottom: 30px; }
                                .section { margin-bottom: 30px; page-break-inside: avoid; }
                                .section-title { font-weight: 700; margin-bottom: 15px; border-bottom: 2px solid var(--azul-monte-tabor); padding-bottom: 5px; color: var(--azul-monte-tabor); }
                                .field { margin-bottom: 15px; }
                                .field-label { font-weight: 600; margin-bottom: 5px; display: block; color: var(--gris-piedra); }
                                textarea, input { border: none; outline: none; font-family: inherit; width: 100%; min-height: 20px; }
                                .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                                .question { font-style: italic; margin-bottom: 10px; color: var(--gris-piedra); }
                                @media print { .no-print { display: none; } }
                            </style>
                        </head>
                        <body>
                            ${printContent.innerHTML}
                        </body>
                    </html>
                `);
                newWindow.document.close();
                newWindow.print();
            }
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gray-50 min-h-screen py-12">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-2xl font-bold text-azul-monte-tabor mb-4">
                        Cargando Entrevista...
                    </h1>
                    <p className="text-azul-monte-tabor">Por favor, espera mientras cargamos la información.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-8">
            <div className="container mx-auto px-6 max-w-4xl">
                {/* Header con navegación */}
                <div className="mb-6">
                    <button 
                        onClick={() => navigate('/profesor')}
                        className="inline-flex items-center text-azul-monte-tabor hover:text-blue-800 transition-colors mb-4"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Volver al Dashboard
                    </button>
                    
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-azul-monte-tabor">
                                Pauta Entrevista - Director de Ciclo
                            </h1>
                            {/* Auto-save indicator */}
                            {autoSave.lastSaved && !autoSave.isSaving && (
                                <p className="text-xs text-gris-piedra mt-1">
                                    ✓ Guardado automáticamente hace {Math.round((Date.now() - autoSave.lastSaved.getTime()) / 1000)}s
                                </p>
                            )}
                            {autoSave.isSaving && (
                                <p className="text-xs text-dorado-nazaret mt-1">
                                    Guardando...
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3 no-print">
                            <Button
                                variant="outline"
                                onClick={handlePrint}
                                leftIcon={<PrinterIcon className="w-4 h-4" />}
                            >
                                Imprimir
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                isLoading={isSubmitting}
                                loadingText="Guardando..."
                                leftIcon={<SaveIcon className="w-4 h-4" />}
                            >
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Formulario de entrevista */}
                <Card className="p-8" id="interview-form">
                    {/* Encabezado del formulario */}
                    <div className="text-center mb-6 header">
                        <h1 className="text-2xl font-bold text-azul-monte-tabor mb-2">
                            PAUTA ENTREVISTA
                        </h1>
                        <h2 className="text-xl font-bold text-azul-monte-tabor">
                            EXAMEN DE ADMISIÓN {new Date().getFullYear() + 1}
                        </h2>
                    </div>

                    {/* Wizard */}
                    <StepWizard
                        steps={WIZARD_STEPS}
                        currentStep={currentStep}
                        onStepChange={setCurrentStep}
                        onComplete={handleSave}
                        isComplete={isComplete}
                    >
                        {/* Step 1: Estudiante */}
                        {currentStep === 'estudiante' && (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-blue-800">
                                        Los datos del estudiante se completan automáticamente desde la postulación.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
                                            <div className="px-3 py-2 font-medium text-gray-900 bg-gray-100 rounded-lg">
                                                {interviewData.studentName || 'No disponible'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Fecha de nacimiento</label>
                                            <div className="px-3 py-2 text-gray-900 bg-gray-100 rounded-lg">
                                                {interviewData.birthDate ? new Date(interviewData.birthDate).toLocaleDateString('es-CL') : 'No disponible'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Edad</label>
                                            <div className="px-3 py-2 font-medium text-azul-monte-tabor bg-blue-50 rounded-lg">
                                                {interviewData.age ? `${interviewData.age} años` : 'No disponible'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Colegio actual</label>
                                            <div className="px-3 py-2 text-gray-900 bg-gray-100 rounded-lg">
                                                {interviewData.currentSchool || 'No disponible'}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">Curso al que postula</label>
                                            <div className="px-3 py-2 font-medium text-azul-monte-tabor bg-blue-50 rounded-lg">
                                                {interviewData.gradeApplied || 'No disponible'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Antecedentes */}
                        {currentStep === 'antecedentes' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="field-label">Antecedentes relevantes</label>
                                    <p className="text-xs text-gray-500 mb-2">Información relevante sobre el estudiante que deba conocer antes de la entrevista.</p>
                                    <textarea
                                        rows={5}
                                        value={interviewData.relevantBackground}
                                        onChange={(e) => updateInterviewData('relevantBackground', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Ej: repitencia, cambios de colegio, situación familiar especial, etc."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 3: Familia */}
                        {currentStep === 'familia' && (
                            <div className="space-y-6">
                                <div>
                                    <div className="question mb-2">Cuéntame de tu familia: ¿Quiénes se llevan mejor?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.familyDescription}
                                        onChange={(e) => updateInterviewData('familyDescription', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Descripción de la dinámica familiar..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Qué cosas te gusta hacer con tu familia?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.familyActivities}
                                        onChange={(e) => updateInterviewData('familyActivities', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Actividades familiares..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">Si tus papás se enojan por algo contigo ¿Qué pasa?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.parentalDiscipline}
                                        onChange={(e) => updateInterviewData('parentalDiscipline', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Manejo de disciplina parental..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Cómo viven la vida espiritual en tu familia?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.spiritualLife}
                                        onChange={(e) => updateInterviewData('spiritualLife', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Vida espiritual familiar..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Escolar */}
                        {currentStep === 'escolar' && (
                            <div className="space-y-6">
                                <div>
                                    <div className="question mb-2">¿Cómo es tu colegio actual?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.currentSchoolDescription}
                                        onChange={(e) => updateInterviewData('currentSchoolDescription', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Descripción del colegio actual..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Qué te gusta de tu colegio? ¿Qué no te gusta tanto?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.schoolLikesAndDislikes}
                                        onChange={(e) => updateInterviewData('schoolLikesAndDislikes', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Gustos y disgustos del colegio actual..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Cómo te llevas con tus compañeros? ¿Qué piensan ellos de ti?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.peerRelationships}
                                        onChange={(e) => updateInterviewData('peerRelationships', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Relaciones con compañeros..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Qué asignaturas son las que más/menos te gustan?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.subjectPreferences}
                                        onChange={(e) => updateInterviewData('subjectPreferences', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Preferencias de asignaturas..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Qué piensan tus profesoras de ti?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.teacherOpinions}
                                        onChange={(e) => updateInterviewData('teacherOpinions', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Opinión de los profesores..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Por qué te cambias de colegio?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.schoolChangeReason}
                                        onChange={(e) => updateInterviewData('schoolChangeReason', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Razones para el cambio de colegio..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Te gusta hacer trabajos en grupos? ¿Por qué?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.groupWorkPreference}
                                        onChange={(e) => updateInterviewData('groupWorkPreference', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Preferencias sobre trabajo en grupo..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">Historia de relaciones sociales</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.socialHistory}
                                        onChange={(e) => updateInterviewData('socialHistory', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Historia de relaciones sociales..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Cómo te describirías a ti mismo/a?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.selfDescription}
                                        onChange={(e) => updateInterviewData('selfDescription', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Autodescripción..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Qué cosas te hacen sentir feliz/triste/enojado/asustado?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.emotionalTriggers}
                                        onChange={(e) => updateInterviewData('emotionalTriggers', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Disparadores emocionales..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">Si tuvieras una varita mágica que te concediera 3 deseos ¿qué le pedirías?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.magicWishes}
                                        onChange={(e) => updateInterviewData('magicWishes', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Tres deseos mágicos..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 5: Expectativas */}
                        {currentStep === 'expectativas' && (
                            <div className="space-y-6">
                                <div>
                                    <div className="question mb-2">¿Qué sabes de este Colegio?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.schoolKnowledge}
                                        onChange={(e) => updateInterviewData('schoolKnowledge', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Conocimiento sobre el colegio..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Qué puedes aportar tú a este Colegio?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.personalContribution}
                                        onChange={(e) => updateInterviewData('personalContribution', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Aporte personal al colegio..."
                                    />
                                </div>
                                <div>
                                    <div className="question mb-2">¿Qué no te gustaría que pasara en este cambio de colegio?</div>
                                    <textarea
                                        rows={3}
                                        value={interviewData.changeConcerns}
                                        onChange={(e) => updateInterviewData('changeConcerns', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Preocupaciones sobre el cambio..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 6: Observaciones */}
                        {currentStep === 'observaciones' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="field-label">Contacto afectivo</label>
                                    <textarea
                                        rows={3}
                                        value={interviewData.affectiveContact}
                                        onChange={(e) => updateInterviewData('affectiveContact', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Observaciones sobre el contacto afectivo durante la entrevista..."
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Adaptación a situación entrevista</label>
                                    <textarea
                                        rows={3}
                                        value={interviewData.interviewAdaptation}
                                        onChange={(e) => updateInterviewData('interviewAdaptation', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Cómo se adaptó el estudiante a la situación de entrevista..."
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Vocabulario, lenguaje</label>
                                    <textarea
                                        rows={3}
                                        value={interviewData.vocabularyLanguage}
                                        onChange={(e) => updateInterviewData('vocabularyLanguage', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Observaciones sobre vocabulario y lenguaje del estudiante..."
                                    />
                                </div>
                                <div>
                                    <label className="field-label">Observaciones en el área social/individual</label>
                                    <textarea
                                        rows={4}
                                        value={interviewData.socialIndividualObservations}
                                        onChange={(e) => updateInterviewData('socialIndividualObservations', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                        placeholder="Observaciones generales sobre aspectos sociales e individuales..."
                                    />
                                </div>
                            </div>
                        )}
                    </StepWizard>

                    {/* Información adicional para el pie */}
                    <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
                        <p>Fecha de entrevista: {new Date().toLocaleDateString('es-CL')}</p>
                        <p>
                            {currentProfessor?.role === 'PSYCHOLOGIST' ? 'Psicólogo' : 'Director de Ciclo'}: {currentProfessor?.firstName} {currentProfessor?.lastName}
                        </p>
                        <p>Colegio Monte Tabor y Nazaret - Sistema de Admisión {new Date().getFullYear() + 1}</p>
                    </div>
                </Card>

                {/* Dialog para restaurar borrador */}
                <ConfirmDialog
                    isOpen={showDraftDialog}
                    title="¿Restaurar borrador?"
                    message="Encontramos un borrador guardado previamente. ¿Deseas continuar donde lo dejaste?"
                    confirmText="Restaurar borrador"
                    cancelText="Descartar y comenzar de nuevo"
                    variant="warning"
                    onConfirm={handleRestoreDraft}
                    onClose={handleDiscardDraft}
                />
            </div>
        </div>
    );
};

export default CycleDirectorInterviewForm;
