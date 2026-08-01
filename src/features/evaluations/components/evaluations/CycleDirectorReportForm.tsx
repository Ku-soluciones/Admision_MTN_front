import React, { useState, useEffect } from 'react';
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
import api from '../../../admin/services/api';
import { getTargetYear } from '../../../../packages/shared-ui/src/types/document';

interface CycleDirectorReportData {
    studentName: string;
    birthDate: string;
    age: string;
    currentSchool: string;
    gradeApplied: string;

    // Antecedentes relevantes
    strengths: string;
    difficulties: string;
    interviewAdaptation: string;
    outstandingTraits: string;
    familyBackground: string;

    // Antecedentes académicos
    academicBackground: string;

    // Recomendaciones finales
    finalDecision: string;
    entryCourse: string;
}

interface SubjectResult {
    subject: string;
    score: number;
    percentage: number;
    comments: string;
    recommendations: string;
}

const WIZARD_STEPS = [
    { id: 'student', title: 'Estudiante' },
    { id: 'antecedentes', title: 'Antecedentes' },
    { id: 'academico', title: 'Académico' },
    { id: 'recomendaciones', title: 'Recomendaciones' }
];

const CycleDirectorReportForm: React.FC = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    
    const [evaluation, setEvaluation] = useState<ProfessorEvaluation | null>(null);
    const [subjectEvaluations, setSubjectEvaluations] = useState<ProfessorEvaluation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [reportData, setReportData] = useState<CycleDirectorReportData>({
        studentName: '',
        birthDate: '',
        age: '',
        currentSchool: '',
        gradeApplied: '',
        strengths: '',
        difficulties: '',
        interviewAdaptation: '',
        outstandingTraits: '',
        familyBackground: '',
        academicBackground: '',
        finalDecision: '',
        entryCourse: ''
    });

    const [currentStep, setCurrentStep] = useState(WIZARD_STEPS[0].id);

    // Auto-guardado cada 30 segundos
    useAutoSave({
        key: `cycle-director-report-${evaluationId}`,
        data: reportData,
        interval: 30000,
        enabled: !isLoading
    });

    // Obtener profesor actual del localStorage
    const [currentProfessor] = useState(() => {
        const storedProfessor = localStorage.getItem('currentProfessor');
        return storedProfessor ? JSON.parse(storedProfessor) : null;
    });

    useEffect(() => {
        const loadEvaluationData = async () => {
            if (!evaluationId) return;
            
            try {
                setIsLoading(true);
                
                // Cargar la evaluación del director de ciclo
                const directorEvaluation = await professorEvaluationService.getEvaluationById(parseInt(evaluationId));
                
                if (directorEvaluation) {
                    setEvaluation(directorEvaluation);


                    // Parsear recommendations para extraer finalDecision y entryCourse
                    const recommendations = directorEvaluation.recommendations || '';
                    let finalDecision = '';
                    let entryCourse = '';

                    // Extraer Decisión Final y Curso de Ingreso del campo recommendations
                    const decisionMatch = recommendations.match(/Decisión Final:\s*(.+?)(?:\n|$)/);
                    const courseMatch = recommendations.match(/Curso de Ingreso:\s*(.+?)(?:\n|$)/);

                    if (decisionMatch) {
                        finalDecision = decisionMatch[1].trim();
                    }
                    if (courseMatch) {
                        entryCourse = courseMatch[1].trim();
                    }

                    // Parsear observations para extraer campos individuales
                    const observations = directorEvaluation.observations || '';
                    let academicBackground = '';
                    let interviewAdaptation = '';
                    let outstandingTraits = '';
                    let familyBackground = '';

                    // El formato guardado es: academicBackground\n\nAdaptación a entrevista: valor\nRasgos sobresalientes: valor\nAntecedentes familiares: valor
                    const parts = observations.split('\n\n');
                    if (parts.length > 0) {
                        academicBackground = parts[0].trim();
                    }
                    if (parts.length > 1) {
                        const detailsPart = parts[1];
                        const adaptationMatch = detailsPart.match(/Adaptación a entrevista:\s*(.+?)(?:\n|$)/);
                        const traitsMatch = detailsPart.match(/Rasgos sobresalientes:\s*(.+?)(?:\n|$)/);
                        const familyMatch = detailsPart.match(/Antecedentes familiares:\s*(.+?)(?:\n|$)/);

                        if (adaptationMatch) interviewAdaptation = adaptationMatch[1].trim();
                        if (traitsMatch) outstandingTraits = traitsMatch[1].trim();
                        if (familyMatch) familyBackground = familyMatch[1].trim();
                    }

                    // Primero mapear datos de la evaluación
                    const evaluationData = {
                        strengths: directorEvaluation.strengths || '',
                        difficulties: directorEvaluation.areasForImprovement || '',
                        interviewAdaptation,
                        outstandingTraits,
                        familyBackground,
                        academicBackground,
                        finalDecision,
                        entryCourse
                    };

                    // Cargar información completa del estudiante desde la aplicación embebida
                    const studentInfo = loadStudentInfo(directorEvaluation.application);

                    // Combinar ambos conjuntos de datos - studentInfo primero para que evaluationData lo sobrescriba
                    setReportData(prev => ({
                        ...prev,
                        ...studentInfo,    // Datos básicos del estudiante (nombre, edad, etc.)
                        ...evaluationData  // Datos editables (strengths, difficulties, etc.) - tienen prioridad
                    }));

                    // Cargar todas las evaluaciones del mismo estudiante para obtener resultados académicos
                    await loadSubjectEvaluations(directorEvaluation.applicationId);

                } else {
                    addNotification({
                        type: 'error',
                        title: 'Error',
                        message: 'Evaluación no encontrada'
                    });
                }
                
            } catch (error: any) {
                addNotification({
                    type: 'error',
                    title: 'Error',
                    message: 'No se pudo cargar la evaluación'
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadEvaluationData();
    }, [evaluationId]); // SOLO evaluationId como dependencia

    const loadStudentInfo = (application: any): Partial<CycleDirectorReportData> => {
        if (application && application.student) {
            const student = application.student;

            // Calcular edad si hay fecha de nacimiento
            let age = '';
            if (student.birthDate) {
                const birthDate = new Date(student.birthDate);
                const today = new Date();
                let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    calculatedAge--;
                }
                age = `${calculatedAge} años`;
            }

            return {
                studentName: `${student.firstName} ${student.paternalLastName || student.lastName || ''} ${student.maternalLastName || ''}`.trim(),
                birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
                age: age,
                currentSchool: student.currentSchool || '',
                gradeApplied: student.gradeApplied || ''
            };
        }

        return {};
    };

    const loadSubjectEvaluations = async (applicationId: number) => {
        try {
            // Obtener todas las evaluaciones de esta aplicación desde el backend
            const response = await api.get(`/api/evaluations?applicationId=${applicationId}`);
            const data = response.data;
            const allEvaluations = data.data || data;

            // Filtrar solo las evaluaciones académicas completadas de ESTA aplicación
            // IMPORTANTE: el backend usa 'type' no 'evaluationType'
            const subjectEvals = allEvaluations.filter((evalItem: any) =>
                evalItem.applicationId === applicationId &&
                ['MATHEMATICS_EXAM', 'LANGUAGE_EXAM', 'ENGLISH_EXAM'].includes(evalItem.type) &&
                evalItem.status === 'COMPLETED'
            );

            // Mapear al formato esperado por el componente
            const mappedEvals = subjectEvals.map((evalItem: any) => ({
                id: evalItem.id,
                applicationId: evalItem.applicationId,
                evaluationType: evalItem.type, // Usar 'type' del backend
                status: evalItem.status,
                score: evalItem.score,
                maxScore: evalItem.maxScore || getMaxScoreForType(evalItem.type),
                observations: evalItem.observations || '',
                recommendations: evalItem.recommendations || evalItem.observations || '',
                strengths: evalItem.strengths || '',
                areasForImprovement: evalItem.areasForImprovement || '',
                studentName: evalItem.student ? `${evalItem.student.firstName} ${evalItem.student.lastName}` : '',
                studentGrade: evalItem.student ? evalItem.student.gradeApplied : ''
            }));

            setSubjectEvaluations(mappedEvals as any);
        } catch (error) {
            addNotification({
                type: 'warning',
                title: 'Atención',
                message: 'No se pudieron cargar algunas evaluaciones académicas. Los resultados pueden estar incompletos.'
            });
        }
    };

    const getSubjectResults = (): SubjectResult[] => {
        const subjects = ['Matemática', 'Lenguaje', 'Inglés'];
        const evaluationTypes = ['MATHEMATICS_EXAM', 'LANGUAGE_EXAM', 'ENGLISH_EXAM'];

        return subjects.map((subject, index) => {
            // Buscar por evaluationType (que ahora viene del mapeo como 'type')
            const evaluation = subjectEvaluations.find(evalItem =>
                evalItem.evaluationType === evaluationTypes[index]
            );

            if (!evaluation) {
                return {
                    subject,
                    score: 0,
                    percentage: 0,
                    comments: 'Evaluación pendiente',
                    recommendations: ''
                };
            }

            const maxScore = (evaluation as any).maxScore || getMaxScoreForType(evaluationTypes[index]);
            const score = evaluation.score || 0;
            const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

            return {
                subject,
                score,
                percentage,
                comments: evaluation.recommendations || '', // COMENTARIOS ← recommendations de BD (Jorge Gangale)
                recommendations: evaluation.areasForImprovement || '' // ÁREAS A TRABAJAR ← areasForImprovement de BD (chatgpt)
            };
        });
    };

    const getMaxScoreForType = (evaluationType: string): number => {
        const maxScores: { [key: string]: number } = {
            'MATHEMATICS_EXAM': 30,
            'LANGUAGE_EXAM': 35,
            'ENGLISH_EXAM': 25
        };
        return maxScores[evaluationType] || 30;
    };

    const updateReportData = (field: keyof CycleDirectorReportData, value: string) => {
        setReportData(prev => {
            const newData = { ...prev, [field]: value };
            return newData;
        });
    };

    const handleSave = async () => {
        if (!evaluation) return;

        setIsSubmitting(true);

        try {
            // Actualizar la evaluación con los datos del informe
            const updatedEvaluation: Partial<ProfessorEvaluation> = {
                strengths: reportData.strengths,
                areasForImprovement: reportData.difficulties,
                observations: `${reportData.academicBackground}\n\nAdaptación a entrevista: ${reportData.interviewAdaptation}\nRasgos sobresalientes: ${reportData.outstandingTraits}\nAntecedentes familiares: ${reportData.familyBackground}`,
                recommendations: `Informe completado por Director de Ciclo: ${currentProfessor?.firstName} ${currentProfessor?.lastName}\n\nDecisión Final: ${reportData.finalDecision}\nCurso de Ingreso: ${reportData.entryCourse}`,
                status: 'COMPLETED'
            };

            const response = await professorEvaluationService.updateEvaluation(evaluation.id, updatedEvaluation);

            // Actualizar el objeto evaluation local con los datos guardados
            setEvaluation(prev => prev ? {
                ...prev,
                strengths: reportData.strengths,
                areasForImprovement: reportData.difficulties,
                observations: updatedEvaluation.observations,
                recommendations: updatedEvaluation.recommendations,
                status: 'COMPLETED'
            } : null);


            addNotification({
                type: 'success',
                title: 'Informe guardado',
                message: 'El informe ha sido guardado exitosamente. Puedes seguir editándolo si es necesario.'
            });
            
        } catch (error) {
            addNotification({
                type: 'error',
                title: 'Error al guardar',
                message: 'No se pudo guardar el informe. Intenta nuevamente.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('cycle-director-report');
        if (printContent) {
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>Informe Admisión ${new Date().getFullYear() + 1} - Director de Ciclo</title>
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
                            <style>
                                :root {
                                    --azul-monte-tabor: #1e3a8a;
                                    --gris-piedra: #6b7280;
                                }
                                body { font-family: 'Montserrat', sans-serif; margin: 20px; color: #1f2937; }
                                .header { text-align: center; margin-bottom: 30px; }
                                .info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 10px; margin-bottom: 20px; }
                                .section { margin-bottom: 30px; }
                                .section-title { font-weight: 700; margin-bottom: 15px; border-bottom: 2px solid var(--azul-monte-tabor); padding-bottom: 5px; color: var(--azul-monte-tabor); }
                                .table { width: 100%; border-collapse: collapse; }
                                .table th, .table td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
                                .field { margin-bottom: 15px; }
                                .field-label { font-weight: 600; margin-bottom: 5px; color: var(--gris-piedra); }
                                textarea, input { border: none; outline: none; font-family: inherit; width: 100%; }
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
                        Cargando Informe...
                    </h1>
                    <p className="text-azul-monte-tabor">Por favor, espera mientras cargamos la información.</p>
                </div>
            </div>
        );
    }

    const subjectResults = getSubjectResults();

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
                    
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-azul-monte-tabor">
                            Informe Director de Ciclo {new Date().getFullYear() + 1}
                        </h1>
                        <div className="flex gap-3">
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

                {/* Informe imprimible */}
                <Card className="p-8" id="cycle-director-report">
                    {/* Encabezado del informe */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-azul-monte-tabor mb-2">
                            INFORME ADMISIÓN {new Date().getFullYear() + 1} - DIRECTOR DE CICLO
                        </h1>
                    </div>

                    <StepWizard
                        steps={WIZARD_STEPS}
                        currentStep={currentStep}
                        onStepChange={setCurrentStep}
                        onComplete={handleSave}
                        isComplete={reportData.finalDecision !== ''}
                    >
                        {/* Paso 1: Información del estudiante */}
                        {currentStep === 'student' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-azul-monte-tabor border-b-2 border-azul-monte-tabor pb-2">
                                    INFORMACIÓN DEL ESTUDIANTE
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Nombre"
                                        value={reportData.studentName}
                                        onChange={(e) => updateReportData('studentName', e.target.value)}
                                        placeholder="Nombre completo del estudiante"
                                    />
                                    <Input
                                        label="Fecha de Nacimiento"
                                        type="date"
                                        value={reportData.birthDate}
                                        onChange={(e) => updateReportData('birthDate', e.target.value)}
                                    />
                                    <Input
                                        label="Edad"
                                        value={reportData.age}
                                        onChange={(e) => updateReportData('age', e.target.value)}
                                        placeholder="Edad en años"
                                    />
                                    <Input
                                        label="Colegio Actual"
                                        value={reportData.currentSchool}
                                        onChange={(e) => updateReportData('currentSchool', e.target.value)}
                                        placeholder="Nombre del colegio actual"
                                    />
                                    <Input
                                        label="Curso al que postula"
                                        value={reportData.gradeApplied}
                                        onChange={(e) => updateReportData('gradeApplied', e.target.value)}
                                        placeholder={`Ej: 1 Básico ${getTargetYear()}`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Paso 2: Antecedentes relevantes */}
                        {currentStep === 'antecedentes' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-azul-monte-tabor border-b-2 border-azul-monte-tabor pb-2">
                                    ANTECEDENTES RELEVANTES
                                </h2>
                                <TextArea
                                    label="Fortalezas"
                                    value={reportData.strengths}
                                    onChange={(e) => updateReportData('strengths', e.target.value)}
                                    placeholder="Describe las fortalezas observadas..."
                                    rows={4}
                                />
                                <TextArea
                                    label="Dificultades"
                                    value={reportData.difficulties}
                                    onChange={(e) => updateReportData('difficulties', e.target.value)}
                                    placeholder="Describe las dificultades observadas..."
                                    rows={4}
                                />
                                <TextArea
                                    label="Adecuación a la entrevista"
                                    value={reportData.interviewAdaptation}
                                    onChange={(e) => updateReportData('interviewAdaptation', e.target.value)}
                                    placeholder="Describe cómo se adaptó el estudiante a la entrevista..."
                                    rows={3}
                                />
                                <TextArea
                                    label="Rasgos sobresalientes"
                                    value={reportData.outstandingTraits}
                                    onChange={(e) => updateReportData('outstandingTraits', e.target.value)}
                                    placeholder="Menciona rasgos sobresalientes del estudiante..."
                                    rows={3}
                                />
                                <TextArea
                                    label="Familiares"
                                    value={reportData.familyBackground}
                                    onChange={(e) => updateReportData('familyBackground', e.target.value)}
                                    placeholder="Información relevante sobre el contexto familiar..."
                                    rows={3}
                                />
                            </div>
                        )}

                        {/* Paso 3: Antecedentes académicos */}
                        {currentStep === 'academico' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-azul-monte-tabor border-b-2 border-azul-monte-tabor pb-2">
                                    ANTECEDENTES ACADÉMICOS
                                </h2>
                                <TextArea
                                    label="Antecedentes relevantes"
                                    value={reportData.academicBackground}
                                    onChange={(e) => updateReportData('academicBackground', e.target.value)}
                                    placeholder="Describe los antecedentes académicos relevantes del estudiante..."
                                    rows={5}
                                />

                                {/* Tabla de resultados académicos */}
                                <div className="mt-6">
                                    <h3 className="text-md font-bold text-azul-monte-tabor mb-4">Resultados académicos del examen</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-gray-400">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-gray-400 px-4 py-2 text-left font-bold">ASIGNATURA</th>
                                                    <th className="border border-gray-400 px-4 py-2 text-center font-bold">PORCENTAJE</th>
                                                    <th className="border border-gray-400 px-4 py-2 text-left font-bold">COMENTARIOS</th>
                                                    <th className="border border-gray-400 px-4 py-2 text-left font-bold">ÁREAS A TRABAJAR</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {subjectResults.map((result, index) => (
                                                    <tr key={index}>
                                                        <td className="border border-gray-400 px-4 py-2 font-medium">
                                                            {result.subject}
                                                        </td>
                                                        <td className="border border-gray-400 px-4 py-2 text-center font-semibold text-blue-600">
                                                            {result.percentage > 0 ? `${result.percentage}%` : '-'}
                                                        </td>
                                                        <td className="border border-gray-400 px-4 py-2">
                                                            {result.comments || 'Sin evaluación'}
                                                        </td>
                                                        <td className="border border-gray-400 px-4 py-2">
                                                            {result.recommendations || 'Sin recomendaciones'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Paso 4: Recomendaciones */}
                        {currentStep === 'recomendaciones' && (
                            <div className="space-y-6">
                                <h2 className="text-lg font-bold text-azul-monte-tabor border-b-2 border-azul-monte-tabor pb-2">
                                    RECOMENDACIONES
                                </h2>
                                <TextArea
                                    label="Aceptación / No aceptación / Reparos"
                                    value={reportData.finalDecision}
                                    onChange={(e) => setReportData({ ...reportData, finalDecision: e.target.value })}
                                    placeholder="Ingrese la decisión final (Aceptación, No aceptación, Reparos)..."
                                    rows={3}
                                />
                                <Input
                                    label="Curso de ingreso"
                                    value={reportData.entryCourse}
                                    onChange={(e) => setReportData({ ...reportData, entryCourse: e.target.value })}
                                    placeholder="Ej: 1 Básico, 5 Básico, etc."
                                />

                                <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
                                    <p>Fecha de evaluación: {new Date().toLocaleDateString('es-CL')}</p>
                                    <p>Director de Ciclo: {currentProfessor?.firstName} {currentProfessor?.lastName}</p>
                                    <p>Colegio Monte Tabor y Nazaret - Sistema de Admisión {new Date().getFullYear() + 1}</p>
                                </div>
                            </div>
                        )}
                    </StepWizard>
                </Card>
            </div>
        </div>
    );
};

export default CycleDirectorReportForm;