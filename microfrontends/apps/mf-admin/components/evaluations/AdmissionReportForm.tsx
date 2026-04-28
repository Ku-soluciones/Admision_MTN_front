import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { ArrowLeftIcon, SaveIcon, FileTextIcon, PrinterIcon } from '../icons/Icons';
import { useNotifications } from '../../context/AppContext';
import { professorEvaluationService, ProfessorEvaluation } from '../../services/professorEvaluationService';
import { EvaluationType } from '../../types/evaluation';

interface AdmissionReportData {
    studentName: string;
    birthDate: string;
    age: string;
    currentSchool: string;
    gradeApplied: string;
    evaluatorName: string;

    // Actitud frente al examen
    strengths: string;
    difficulties: string;
    examAdaptation: string;
    observations: string;

    // Resultados académicos
    subject: string;
    score: number;
    maxScore: number;
    percentage: number;
    comments: string;
    areasToWork: string;

    // Recomendaciones finales (nueva sección)
    finalRecommendations: string;
    admissionDecision: string;
    entranceGrade: string;
}

const AdmissionReportForm: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const { addNotification } = useNotifications();
    
    const [evaluation, setEvaluation] = useState<ProfessorEvaluation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [reportData, setReportData] = useState<AdmissionReportData>({
        studentName: '',
        birthDate: '',
        age: '',
        currentSchool: '',
        gradeApplied: '',
        evaluatorName: '',
        strengths: '',
        difficulties: '',
        examAdaptation: '',
        observations: '',
        subject: '',
        score: 0,
        maxScore: 30,
        percentage: 0,
        comments: '',
        areasToWork: '',
        finalRecommendations: '',
        admissionDecision: '',
        entranceGrade: ''
    });

    // Obtener profesor actual del localStorage
    const [currentProfessor] = useState(() => {
        const storedProfessor = localStorage.getItem('currentProfessor');
        return storedProfessor ? JSON.parse(storedProfessor) : null;
    });

    useEffect(() => {
        const loadEvaluation = async () => {
            if (!examId) return;

            try {
                setIsLoading(true);
                console.log('🔄 Cargando evaluación para informe:', examId);

                // Cargar usando el servicio (que maneja la URL correctamente)
                const evaluationData = await professorEvaluationService.getEvaluationById(parseInt(examId));
                console.log('✅ Evaluación cargada:', evaluationData);

                if (evaluationData) {
                    setEvaluation(evaluationData);

                    // Obtener puntaje máximo por defecto para el tipo de evaluación
                    const defaultMaxScore = getMaxScore(evaluationData.evaluationType);

                    // Calcular edad
                    const birthDate = evaluationData.studentBirthDate;
                    const age = birthDate ? calculateAge(birthDate) : '';

                    // Mapear datos del backend al formato del informe
                    setReportData(prev => ({
                        ...prev,
                        // Datos del estudiante desde el backend
                        studentName: evaluationData.studentName || '',
                        gradeApplied: evaluationData.studentGrade || '',
                        birthDate: birthDate || '',
                        age: age,
                        currentSchool: evaluationData.currentSchool || '',

                        // Datos del evaluador
                        evaluatorName: evaluationData.evaluatorName || (currentProfessor ? `${currentProfessor.firstName} ${currentProfessor.lastName}` : ''),

                        // Datos académicos - usar subject del profesor si está disponible
                        subject: evaluationData.evaluatorSubject ?
                            getSubjectName(evaluationData.evaluatorSubject) :
                            getSubjectName(evaluationData.evaluationType),
                        score: evaluationData.score || 0,
                        maxScore: evaluationData.maxScore || defaultMaxScore,
                        percentage: evaluationData.score && (evaluationData.maxScore || defaultMaxScore) ?
                            Math.round((evaluationData.score / (evaluationData.maxScore || defaultMaxScore)) * 100) : 0,

                        // Campos específicos de evaluación - mapeo desde evaluación del profesor
                        strengths: evaluationData.strengths || '',
                        difficulties: '', // Campo que completa el director, no auto-poblar
                        examAdaptation: '', // Campo que completa el director, no auto-poblar
                        observations: '', // Campo que completa el director, no auto-poblar desde profesor
                        comments: evaluationData.recommendations || '', // COMENTARIOS ← Recomendaciones del profesor (jorge gangale)
                        areasToWork: evaluationData.areasForImprovement || '' // ÁREAS A TRABAJAR ← Áreas de mejora del profesor (chatgpt)
                    }));

                    console.log('✅ Informe cargado con datos:', evaluationData);
                    console.log('🔍 DEBUG - Campo recommendations de BD:', evaluationData.recommendations);
                    console.log('🔍 DEBUG - Campo areasForImprovement de BD:', evaluationData.areasForImprovement);
                    console.log('🔍 DEBUG - Mapeado a comments (COMENTARIOS):', evaluationData.recommendations);
                    console.log('🔍 DEBUG - Mapeado a areasToWork (ÁREAS A TRABAJAR):', evaluationData.areasForImprovement);
                } else {
                    console.error('❌ Evaluación no encontrada');
                    addNotification({
                        type: 'error',
                        title: 'Error',
                        message: 'Evaluación no encontrada'
                    });
                }
                
            } catch (error: any) {
                console.error('❌ Error cargando evaluación:', error);
                addNotification({
                    type: 'error',
                    title: 'Error',
                    message: 'No se pudo cargar la evaluación'
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadEvaluation();
    }, [examId]); // ✅ SOLO examId como dependencia

    const getSubjectName = (evaluationType: string): string => {
        const subjects: { [key: string]: string } = {
            'MATHEMATICS_EXAM': 'Matemática',
            'MATHEMATICS': 'Matemática',
            'LANGUAGE_EXAM': 'Lenguaje y Comunicación',
            'LANGUAGE': 'Lenguaje y Comunicación',
            'ENGLISH_EXAM': 'Inglés',
            'ENGLISH': 'Inglés',
            'PSYCHOLOGICAL_INTERVIEW': 'Evaluación Psicológica',
            'CYCLE_DIRECTOR_INTERVIEW': 'Entrevista Director de Ciclo'
        };
        return subjects[evaluationType] || evaluationType;
    };

    const getMaxScore = (evaluationType: string): number => {
        const maxScores: { [key: string]: number } = {
            'MATHEMATICS_EXAM': 30,
            'LANGUAGE_EXAM': 35,
            'ENGLISH_EXAM': 25,
            'PSYCHOLOGICAL_INTERVIEW': 100,
            'CYCLE_DIRECTOR_INTERVIEW': 100
        };
        return maxScores[evaluationType] || 30;
    };

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

    const updateReportData = (field: keyof AdmissionReportData, value: string | number) => {
        setReportData(prev => {
            const newData = { ...prev, [field]: value };
            
            // Calcular porcentaje automáticamente si se cambia el score o maxScore
            if (field === 'score' || field === 'maxScore') {
                const currentScore = field === 'score' ? Number(value) : prev.score;
                const currentMaxScore = field === 'maxScore' ? Number(value) : prev.maxScore;
                newData.percentage = currentMaxScore > 0 ? Math.round((currentScore / currentMaxScore) * 100) : 0;
            }
            
            // Calcular edad automáticamente si se cambia la fecha de nacimiento
            if (field === 'birthDate') {
                newData.age = calculateAge(String(value));
            }
            
            return newData;
        });
    };

    const handleSave = async () => {
        if (!evaluation) return;

        setIsSubmitting(true);

        try {
            // Actualizar la evaluación con los datos del informe y marcar como completada
            const updatedEvaluation: Partial<ProfessorEvaluation> = {
                score: reportData.score,
                maxScore: reportData.maxScore, // Guardar el puntaje máximo personalizado
                strengths: reportData.strengths,
                areasForImprovement: reportData.areasToWork,  // SAVE: Director's ÁREAS A TRABAJAR → Backend areasForImprovement
                observations: `${reportData.observations}\n\nAdecuación al examen: ${reportData.examAdaptation}\nDificultades: ${reportData.difficulties}\n\n=== RECOMENDACIONES FINALES ===\nDecisión: ${reportData.admissionDecision}\nCurso ingreso: ${reportData.entranceGrade}\nComentarios finales: ${reportData.finalRecommendations}`,
                recommendations: reportData.comments,  // SAVE: Director's COMENTARIOS → Backend recommendations
                status: 'COMPLETED' // Cambiar estado a COMPLETED
            };

            await professorEvaluationService.updateEvaluation(evaluation.id, updatedEvaluation);

            addNotification({
                type: 'success',
                title: 'Informe guardado',
                message: 'El informe de admisión ha sido guardado y marcado como completado'
            });

            // Navegar de regreso al dashboard del profesor después de guardar exitosamente
            setTimeout(() => {
                navigate('/profesor');
            }, 1500);

        } catch (error) {
            console.error('❌ Error al guardar informe:', error);
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
        const printContent = document.getElementById('admission-report');
        if (printContent) {
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>Informe de Admisión 2025 - ${reportData.subject}</title>
                            <style>
                                body { font-family: Arial, sans-serif; margin: 20px; }
                                .header { text-align: center; margin-bottom: 30px; }
                                .info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 10px; margin-bottom: 20px; }
                                .section { margin-bottom: 30px; }
                                .section-title { font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #000; }
                                .table { width: 100%; border-collapse: collapse; }
                                .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
                                .field { margin-bottom: 10px; }
                                .field-label { font-weight: bold; }
                                textarea, input { border: none; outline: none; font-family: inherit; }
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
                            Informe de Admisión 2025
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
                <Card className="p-8" id="admission-report">
                    {/* Encabezado del informe */}
                    <div className="text-center mb-8 pb-4 border-b-4 border-azul-monte-tabor">
                        <h1 className="text-3xl font-bold text-azul-monte-tabor mb-2">
                            INFORME ADMISIÓN 2026
                        </h1>
                        <h2 className="text-xl font-semibold text-gris-piedra">
                            {reportData.subject}
                        </h2>
                    </div>

                    {/* Información del estudiante - Vertical */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8 border-l-4 border-azul-monte-tabor">
                        <h3 className="text-lg font-bold text-azul-monte-tabor mb-4">Información del Estudiante</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="text-sm font-bold text-gray-700">Nombre:</label>
                                <div className="col-span-2">
                                    <p className="text-base font-medium text-gray-900">{reportData.studentName || 'No disponible'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="text-sm font-bold text-gray-700">Fecha de Nacimiento:</label>
                                <div className="col-span-2">
                                    <p className="text-base text-gray-900">{reportData.birthDate ? new Date(reportData.birthDate).toLocaleDateString('es-CL') : 'No disponible'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="text-sm font-bold text-gray-700">Edad:</label>
                                <div className="col-span-2">
                                    <p className="text-base font-medium text-azul-monte-tabor">{reportData.age ? `${reportData.age} años` : 'No disponible'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="text-sm font-bold text-gray-700">Colegio Actual:</label>
                                <div className="col-span-2">
                                    <p className="text-base text-gray-900">{reportData.currentSchool || 'No disponible'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="text-sm font-bold text-gray-700">Curso al que postula:</label>
                                <div className="col-span-2">
                                    <p className="text-base font-medium text-azul-monte-tabor">{reportData.gradeApplied || 'No disponible'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center border-t pt-3 mt-2">
                                <label className="text-sm font-bold text-gray-700">Profesor evaluador:</label>
                                <div className="col-span-2">
                                    <p className="text-base font-bold text-gray-900">{reportData.evaluatorName || 'No disponible'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 items-center">
                                <label className="text-sm font-bold text-gray-700">Asignatura:</label>
                                <div className="col-span-2">
                                    <p className="text-base font-bold text-azul-monte-tabor">{reportData.subject || 'No disponible'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actitud frente al examen - Grid 2x2 */}
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-azul-monte-tabor mb-3 border-b-2 border-azul-monte-tabor pb-2">
                            ACTITUD FRENTE AL EXAMEN
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Fortalezas observadas</label>
                                <textarea
                                    rows={3}
                                    value={reportData.strengths}
                                    onChange={(e) => updateReportData('strengths', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor text-sm"
                                    placeholder="Ej: Perseverancia, concentración, estrategias organizadas..."
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Dificultades observadas</label>
                                <textarea
                                    rows={3}
                                    value={reportData.difficulties}
                                    onChange={(e) => updateReportData('difficulties', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor text-sm"
                                    placeholder="Ej: Frustración, ansiedad, dificultad para organizar..."
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Adecuación al examen</label>
                                <textarea
                                    rows={3}
                                    value={reportData.examAdaptation}
                                    onChange={(e) => updateReportData('examAdaptation', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor text-sm"
                                    placeholder="Ej: Comprensión de instrucciones, manejo de tiempos..."
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label>
                                <textarea
                                    rows={3}
                                    value={reportData.observations}
                                    onChange={(e) => updateReportData('observations', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor text-sm"
                                    placeholder="Observaciones generales sobre el comportamiento y actitud del estudiante..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Resultados académicos del examen */}
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-azul-monte-tabor mb-6 border-b-2 border-azul-monte-tabor pb-2">
                            Resultados Académicos del Examen
                        </h2>

                        {/* Cards de Puntajes */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {/* Asignatura Card */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow-lg">
                                <div className="text-sm font-medium opacity-90 mb-1">Asignatura</div>
                                <div className="text-2xl font-bold">{reportData.subject}</div>
                            </div>

                            {/* Puntaje */}
                            <div className="bg-white rounded-lg p-4 border-2 border-azul-monte-tabor shadow-md">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Puntaje Obtenido <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => updateReportData('score', Math.min(reportData.score + 1, reportData.maxScore))}
                                            className="px-2 py-0.5 bg-azul-monte-tabor text-white rounded-t hover:bg-blue-700 text-xs"
                                        >
                                            ▲
                                        </button>
                                        <Input
                                            type="number"
                                            value={reportData.score}
                                            onChange={(e) => updateReportData('score', parseInt(e.target.value) || 0)}
                                            className="text-center font-bold text-2xl border-2 border-gray-300 focus:border-azul-monte-tabor w-20"
                                            placeholder="0"
                                            min="0"
                                            max={reportData.maxScore}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateReportData('score', Math.max(reportData.score - 1, 0))}
                                            className="px-2 py-0.5 bg-azul-monte-tabor text-white rounded-b hover:bg-blue-700 text-xs"
                                        >
                                            ▼
                                        </button>
                                    </div>
                                    <span className="text-2xl font-bold text-gray-400">/</span>
                                    <div className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => updateReportData('maxScore', Math.min(reportData.maxScore + 1, 200))}
                                            className="px-2 py-0.5 bg-azul-monte-tabor text-white rounded-t hover:bg-blue-700 text-xs"
                                        >
                                            ▲
                                        </button>
                                        <Input
                                            type="number"
                                            value={reportData.maxScore}
                                            onChange={(e) => updateReportData('maxScore', parseInt(e.target.value) || 1)}
                                            className="text-center font-bold text-2xl border-2 border-gray-300 focus:border-azul-monte-tabor w-20"
                                            placeholder="30"
                                            min="1"
                                            max="200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateReportData('maxScore', Math.max(reportData.maxScore - 1, 1))}
                                            className="px-2 py-0.5 bg-azul-monte-tabor text-white rounded-b hover:bg-blue-700 text-xs"
                                        >
                                            ▼
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Puntaje obtenido / Puntaje máximo</p>
                            </div>

                            {/* Porcentaje */}
                            <div className={`rounded-lg p-4 shadow-lg ${
                                reportData.percentage >= 80 ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                reportData.percentage >= 60 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                                'bg-gradient-to-br from-red-500 to-red-600'
                            }`}>
                                <div className="text-sm font-medium text-white opacity-90 mb-1">Porcentaje de Logro</div>
                                <div className="text-4xl font-bold text-white">{reportData.percentage}%</div>
                                <div className="text-xs text-white opacity-90 mt-1">
                                    {reportData.percentage >= 80 ? 'Excelente' :
                                     reportData.percentage >= 60 ? 'Bueno' : 'Por mejorar'}
                                </div>
                            </div>
                        </div>
                        
                        {/* Sección de Comentarios */}
                        <div className="mb-6">
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                                <div className="mb-2">
                                    <span className="font-bold text-azul-monte-tabor text-sm">COMENTARIOS</span>
                                    <span className="text-xs text-gray-600 ml-2">(Se llena automáticamente con las recomendaciones del profesor)</span>
                                </div>
                                <textarea
                                    rows={6}
                                    value={reportData.comments}
                                    onChange={(e) => updateReportData('comments', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor text-sm resize-y min-h-[100px]"
                                    placeholder="Comentarios sobre el desempeño del estudiante en el examen..."
                                />
                            </div>
                        </div>

                        {/* Sección de Áreas a Trabajar */}
                        <div className="mb-6">
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                <div className="mb-2">
                                    <span className="font-bold text-azul-monte-tabor text-sm">ÁREAS A TRABAJAR / RECOMENDACIONES</span>
                                    <span className="text-xs text-gray-600 ml-2">(Se llena automáticamente con las áreas de mejora del profesor)</span>
                                </div>
                                <textarea
                                    rows={6}
                                    value={reportData.areasToWork}
                                    onChange={(e) => updateReportData('areasToWork', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor text-sm resize-y min-h-[100px]"
                                    placeholder="Áreas a trabajar y recomendaciones para el estudiante..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* III. RECOMENDACIONES - Solo para Director de Ciclo */}
                    {evaluation?.evaluationType === 'CYCLE_DIRECTOR_INTERVIEW' && (
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-azul-monte-tabor mb-6 border-b-2 border-azul-monte-tabor pb-2">
                                III. RECOMENDACIONES
                            </h2>

                            {/* Decisión de Admisión */}
                            <div className="mb-6">
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-azul-monte-tabor rounded-lg p-5">
                                    <label className="block text-sm font-bold text-azul-monte-tabor mb-3">
                                        Decisión de Admisión <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
                                            <input
                                                type="radio"
                                                name="admissionDecision"
                                                value="ACEPTADO"
                                                checked={reportData.admissionDecision === 'ACEPTADO'}
                                                onChange={(e) => updateReportData('admissionDecision', e.target.value)}
                                                className="w-5 h-5 text-green-600"
                                            />
                                            <span className="font-semibold text-green-700">✓ Aceptación - Postulante cumple con los requisitos</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-yellow-500 hover:bg-yellow-50 transition-all">
                                            <input
                                                type="radio"
                                                name="admissionDecision"
                                                value="REPAROS"
                                                checked={reportData.admissionDecision === 'REPAROS'}
                                                onChange={(e) => updateReportData('admissionDecision', e.target.value)}
                                                className="w-5 h-5 text-yellow-600"
                                            />
                                            <span className="font-semibold text-yellow-700">⚠ Con Reparos - Requiere seguimiento o condiciones</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-red-500 hover:bg-red-50 transition-all">
                                            <input
                                                type="radio"
                                                name="admissionDecision"
                                                value="NO_ACEPTADO"
                                                checked={reportData.admissionDecision === 'NO_ACEPTADO'}
                                                onChange={(e) => updateReportData('admissionDecision', e.target.value)}
                                                className="w-5 h-5 text-red-600"
                                            />
                                            <span className="font-semibold text-red-700">✗ No Aceptación - Postulante no cumple requisitos</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Curso de Ingreso */}
                            <div className="mb-6">
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                    <label className="block text-sm font-bold text-azul-monte-tabor mb-2">
                                        Curso de Ingreso Recomendado <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={reportData.entranceGrade}
                                        onChange={(e) => updateReportData('entranceGrade', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-azul-monte-tabor text-base font-medium"
                                    >
                                        <option value="">Seleccionar curso...</option>
                                        <option value="PRE_KINDER">Pre-Kínder</option>
                                        <option value="KINDER">Kínder</option>
                                        <option value="1_BASICO">1° Básico</option>
                                        <option value="2_BASICO">2° Básico</option>
                                        <option value="3_BASICO">3° Básico</option>
                                        <option value="4_BASICO">4° Básico</option>
                                        <option value="5_BASICO">5° Básico</option>
                                        <option value="6_BASICO">6° Básico</option>
                                        <option value="7_BASICO">7° Básico</option>
                                        <option value="8_BASICO">8° Básico</option>
                                        <option value="I_MEDIO">I Medio</option>
                                        <option value="II_MEDIO">II Medio</option>
                                        <option value="III_MEDIO">III Medio</option>
                                        <option value="IV_MEDIO">IV Medio</option>
                                        <option value="NO_APLICA">No Aplica (No Aceptado)</option>
                                    </select>
                                    <p className="text-xs text-gray-600 mt-2">
                                        Indicar el curso al que debería ingresar el estudiante si es aceptado
                                    </p>
                                </div>
                            </div>

                            {/* Comentarios Finales */}
                            <div className="mb-6">
                                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                                    <label className="block text-sm font-bold text-azul-monte-tabor mb-2">
                                        Comentarios y Observaciones Finales
                                    </label>
                                    <textarea
                                        rows={5}
                                        value={reportData.finalRecommendations}
                                        onChange={(e) => updateReportData('finalRecommendations', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor text-sm resize-y min-h-[120px]"
                                        placeholder="Comentarios adicionales sobre la decisión de admisión, condiciones especiales, seguimiento requerido, etc..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Información adicional para el pie */}
                    <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600">
                        <p>Fecha de evaluación: {new Date().toLocaleDateString('es-CL')}</p>
                        <p>Evaluador: {reportData.evaluatorName}</p>
                        <p>Colegio Monte Tabor y Nazaret - Sistema de Admisión 2025</p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdmissionReportForm;