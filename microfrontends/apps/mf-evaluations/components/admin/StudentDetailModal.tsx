import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import {
    FiUser, FiPhone, FiMail, FiMapPin, FiHome, FiBookOpen, FiCalendar,
    FiFileText, FiEdit, FiDownload, FiClock, FiCheckCircle, FiAlertCircle,
    FiUsers, FiBriefcase, FiHeart, FiStar, FiEye, FiCheck,
    FiX, FiChevronRight, FiInfo, FiMessageSquare, FiAward, FiRefreshCw
} from 'react-icons/fi';
import { useNotifications } from '../../context/AppContext';
import { applicationService, Application } from '../../services/applicationService';
import interviewService from '../../services/interviewService';
import { Interview, InterviewStatus, INTERVIEW_TYPE_LABELS } from '../../types/interview';
import evaluationService from '../../services/evaluationService';
import { Evaluation, EvaluationType } from '../../types/evaluation';
import institutionalEmailService from '../../services/institutionalEmailService';
import { userService } from '../../services/userService';
import { documentService } from '../../services/documentService';
import { DocumentType } from '../../types/document';

interface Postulante {
    id: number;
    nombreCompleto: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    rut: string;
    fechaNacimiento: string;
    edad: number;
    esHijoFuncionario: boolean;
    nombrePadreFuncionario?: string;
    esHijoExalumno: boolean;
    anioEgresoExalumno?: number;
    esAlumnoInclusion: boolean;
    tipoInclusion?: string;
    notasInclusion?: string;
    email?: string;
    direccion: string;
    cursoPostulado: string;
    colegioActual?: string;
    colegioDestino: 'MONTE_TABOR' | 'NAZARET';
    añoAcademico: string;
    estadoPostulacion: string;
    fechaPostulacion: string;
    fechaActualizacion: string;
    nombreContactoPrincipal: string;
    emailContacto: string;
    telefonoContacto: string;
    relacionContacto: string;
    nombrePadre?: string;
    emailPadre?: string;
    telefonoPadre?: string;
    profesionPadre?: string;
    nombreMadre?: string;
    emailMadre?: string;
    telefonoMadre?: string;
    profesionMadre?: string;
    documentosCompletos: boolean;
    cantidadDocumentos: number;
    evaluacionPendiente: boolean;
    entrevistaProgramada: boolean;
    fechaEntrevista?: string;
    necesidadesEspeciales: boolean;
    observaciones?: string;
    notasInternas?: string;
    creadoPor: string;
    fechaCreacion: string;
}

// Tipos de entrevistas requeridas
const REQUIRED_INTERVIEW_TYPES = [
  { type: 'FAMILY', title: 'Familiar', icon: '', required: true },
  { type: 'CYCLE_DIRECTOR', title: 'Director de Ciclo', icon: '👔', required: true }
];

interface StudentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    postulante?: Postulante;
    onEdit?: (postulante: Postulante) => void;
    onUpdateStatus?: (postulante: Postulante, newStatus: string) => void;
    onScheduleInterview?: (postulante: Postulante, interviewType?: string) => void;
    onAssignEvaluator?: (applicationId: number, evaluationType: string, evaluatorId: number) => Promise<void>;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    isOpen,
    onClose,
    postulante,
    onEdit,
    onUpdateStatus,
    onScheduleInterview,
    onAssignEvaluator
}) => {
    const [activeTab, setActiveTab] = useState<'info' | 'familia' | 'academico' | 'entrevistas' | 'evaluaciones' | 'documentos' | 'historial'>('info');
    const [documentSubTab, setDocumentSubTab] = useState<'academic' | 'other'>('academic');
    const [fullApplication, setFullApplication] = useState<Application | null>(null);
    const [interviews, setInterviews] = useState<Interview[]>([]);
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(false);
    const [interviewsLoading, setInterviewsLoading] = useState(false);
    const [evaluationsLoading, setEvaluationsLoading] = useState(false);
    const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
    const [showEvaluationDetail, setShowEvaluationDetail] = useState(false);
    const [documentApprovalStatus, setDocumentApprovalStatus] = useState<Record<number, boolean>>({});
    const [sendingNotification, setSendingNotification] = useState(false);
    const [showAssignEvaluatorModal, setShowAssignEvaluatorModal] = useState(false);
    const [selectedEvaluationType, setSelectedEvaluationType] = useState<string | null>(null);
    const [availableEvaluators, setAvailableEvaluators] = useState<any[]>([]);
    const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<number>(0);
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignMessage, setAssignMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sendingReminders, setSendingReminders] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<any>(null);
    const [showDocumentViewer, setShowDocumentViewer] = useState(false);
    const { addNotification } = useNotifications();

    // Cargar información completa de la aplicación, entrevistas y evaluaciones
    useEffect(() => {
        if (postulante && isOpen) {
            console.log('StudentDetailModal - postulante recibido:', postulante);
            loadFullApplication();
            loadInterviews();
            loadEvaluations();
        }
    }, [postulante, isOpen]);

    const loadFullApplication = async () => {
        if (!postulante) return;

        setLoading(true);
        try {
            console.log('Cargando aplicación completa para postulante ID:', postulante.id);
            const app = await applicationService.getApplicationById(postulante.id);
            console.log('Aplicación cargada:', app);
            console.log('Documentos recibidos:', app?.documents);
            console.log('Cantidad de documentos:', app?.documents?.length);
            setFullApplication(app);

            // Initialize document approval status from database
            if (app?.documents) {
                const approvalStatus: Record<number, boolean> = {};
                app.documents.forEach((doc: any, index: number) => {
                    // approval_status from DB: 'PENDING', 'APPROVED', 'REJECTED'
                    if (doc.approval_status === 'APPROVED') {
                        approvalStatus[index] = true;
                    } else if (doc.approval_status === 'REJECTED') {
                        approvalStatus[index] = false;
                    }
                    // PENDING documents are not set (undefined) so checkbox is unchecked
                });
                console.log('Estado de aprobación inicializado:', approvalStatus);
                setDocumentApprovalStatus(approvalStatus);
            }
        } catch (error) {
            console.error('Error loading full application:', error);
            addNotification({
                type: 'warning',
                title: 'Información limitada',
                message: 'No se pudo cargar toda la información del estudiante'
            });
        } finally {
            setLoading(false);
        }
    };

    const loadInterviews = async () => {
        if (!postulante) return;

        setInterviewsLoading(true);
        try {
            const response = await interviewService.getInterviewsByApplication(postulante.id);
            setInterviews(response.interviews || []);
        } catch (error) {
            console.error('Error loading interviews:', error);
            setInterviews([]);
        } finally {
            setInterviewsLoading(false);
        }
    };

    const loadEvaluations = async () => {
        if (!postulante) return;

        setEvaluationsLoading(true);
        try {
            const evaluationsData = await evaluationService.getEvaluationsByApplicationId(postulante.id);
            setEvaluations(evaluationsData || []);
        } catch (error) {
            console.error('Error loading evaluations:', error);
            setEvaluations([]);
        } finally {
            setEvaluationsLoading(false);
        }
    };

    const handleAssignEvaluatorFromDetail = async (evaluationType: string) => {
        if (!postulante) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se puede asignar evaluador en este momento'
            });
            return;
        }

        // Configurar el tipo de evaluación seleccionado
        setSelectedEvaluationType(evaluationType);
        setSelectedEvaluatorId(0);
        setAssignMessage(null);

        // Cargar evaluadores disponibles para este tipo de evaluación
        try {
            const staffResponse = await userService.getSchoolStaffUsersPublic();
            const allStaff = staffResponse.content || [];

            // Filtrar evaluadores según el tipo de evaluación
            let filteredEvaluators: any[] = [];

            switch (evaluationType) {
                case 'MATHEMATICS_EXAM':
                    filteredEvaluators = allStaff.filter(user =>
                        user.role === 'TEACHER' && user.subject === 'MATHEMATICS'
                    );
                    break;
                case 'LANGUAGE_EXAM':
                    filteredEvaluators = allStaff.filter(user =>
                        user.role === 'TEACHER' && user.subject === 'LANGUAGE'
                    );
                    break;
                case 'ENGLISH_EXAM':
                    filteredEvaluators = allStaff.filter(user =>
                        user.role === 'TEACHER' && user.subject === 'ENGLISH'
                    );
                    break;
                case 'PSYCHOLOGICAL_INTERVIEW':
                    filteredEvaluators = allStaff.filter(user => user.role === 'PSYCHOLOGIST');
                    break;
                case 'CYCLE_DIRECTOR_INTERVIEW':
                case 'CYCLE_DIRECTOR_REPORT':
                    filteredEvaluators = allStaff.filter(user => user.role === 'CYCLE_DIRECTOR');
                    break;
                default:
                    filteredEvaluators = allStaff.filter(user =>
                        user.role === 'TEACHER' || user.role === 'COORDINATOR'
                    );
            }

            setAvailableEvaluators(filteredEvaluators);
            setShowAssignEvaluatorModal(true);
        } catch (error) {
            console.error('Error loading evaluators:', error);
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudieron cargar los evaluadores disponibles'
            });
        }
    };

    const handleConfirmAssignment = async () => {
        if (!postulante || !selectedEvaluationType || selectedEvaluatorId === 0) {
            setAssignMessage({ type: 'error', text: 'Debe seleccionar un evaluador' });
            return;
        }

        setIsAssigning(true);
        setAssignMessage({ type: 'success', text: 'Asignando evaluador... Por favor espere.' });

        try {
            await evaluationService.assignSpecificEvaluation(
                postulante.id,
                selectedEvaluationType as EvaluationType,
                selectedEvaluatorId
            );

            setAssignMessage({
                type: 'success',
                text: 'Evaluador asignado correctamente. Se ha enviado notificación por email.'
            });

            // Recargar evaluaciones para mostrar la nueva asignación
            await loadEvaluations();

            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                setShowAssignEvaluatorModal(false);
                setAssignMessage(null);
                setIsAssigning(false);
            }, 2000);
        } catch (error: any) {
            console.error('Error assigning evaluator:', error);
            setAssignMessage({
                type: 'error',
                text: `Error: ${error.message || 'No se pudo asignar el evaluador'}`
            });
            setIsAssigning(false);
        }
    };

    const handleSendReminders = async () => {
        if (!postulante) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se puede enviar recordatorios en este momento'
            });
            return;
        }

        // Filtrar evaluaciones pendientes o en progreso que tengan evaluador asignado
        const pendingEvaluations = evaluations.filter(
            e => (e.status === 'PENDING' || e.status === 'IN_PROGRESS') && e.evaluator
        );

        if (pendingEvaluations.length === 0) {
            addNotification({
                type: 'info',
                title: 'Sin Recordatorios',
                message: 'No hay evaluaciones pendientes con evaluadores asignados'
            });
            return;
        }

        setSendingReminders(true);

        try {
            // Reenviar la asignación (que automáticamente envía el email)
            const promises = pendingEvaluations.map(async (evaluation) => {
                // Usamos el servicio de asignación que ya envía el email automáticamente
                return evaluationService.assignSpecificEvaluation(
                    postulante.id,
                    evaluation.evaluationType,
                    evaluation.evaluator.id
                );
            });

            await Promise.all(promises);

            addNotification({
                type: 'success',
                title: 'Recordatorios Enviados',
                message: `Se enviaron ${pendingEvaluations.length} recordatorio(s) por email a los evaluadores`
            });
        } catch (error: any) {
            console.error('Error sending reminders:', error);
            addNotification({
                type: 'error',
                title: 'Error',
                message: error.message || 'No se pudieron enviar los recordatorios'
            });
        } finally {
            setSendingReminders(false);
        }
    };

    const toggleDocumentApproval = async (docIndex: number) => {
        console.log('🔘 toggleDocumentApproval called with docIndex:', docIndex);

        if (!fullApplication?.documents) {
            console.log('No documents in fullApplication');
            return;
        }

        const document = fullApplication.documents[docIndex];
        if (!document) {
            console.log('No document at index', docIndex);
            return;
        }

        console.log('Document:', document);

        // LOCK: Prevent toggling if document is already approved in database (permanent lock)
        if (document.approval_status === 'APPROVED') {
            console.log('Document already approved, showing notification');
            addNotification({
                type: 'info',
                title: 'Documento Bloqueado',
                message: 'Este documento ya fue aprobado y no puede ser modificado. Solo se permite aprobar una vez.'
            });
            return;
        }

        // Get current approval status
        const currentStatus = documentApprovalStatus[docIndex];
        console.log('Current status at index', docIndex, ':', currentStatus);

        // Determine new status:
        // undefined/null -> true (APPROVED)
        // true (APPROVED) -> false (REJECTED)
        // false (REJECTED) -> undefined (PENDING)
        let newLocalStatus: boolean | undefined;

        if (currentStatus === undefined || currentStatus === null) {
            newLocalStatus = true;
        } else if (currentStatus === true) {
            newLocalStatus = false;
        } else {
            newLocalStatus = undefined;
        }

        // Update local state only - NO backend call yet
        // Changes will be persisted when "Enviar Notificación" button is clicked
        setDocumentApprovalStatus(prev => ({
            ...prev,
            [docIndex]: newLocalStatus
        }));

        console.log(`Documento ${document.id} marcado localmente como:`,
            newLocalStatus === true ? 'APPROVED' : newLocalStatus === false ? 'REJECTED' : 'PENDING');
    };

    const handleViewDocument = (doc: any) => {
        console.log('Abriendo visor para documento:', doc);
        setViewingDocument(doc);
        setShowDocumentViewer(true);
    };

    const getDocumentViewUrl = (doc: any) => {
        // Documents are now stored in Vercel Blob
        // filePath contains the direct Vercel Blob URL
        if (doc.filePath) {
            // If filePath is already a full URL (starts with http), use it directly
            if (doc.filePath.startsWith('http')) {
                return doc.filePath;
            }

            // Otherwise, construct gateway URL to fetch from backend
            const gatewayUrl = import.meta.env.VITE_API_URL || 'https://admitia-bff-staging.up.railway.app';
            return `${gatewayUrl}/v1/documents/view/${doc.id}`;
        }

        return null;
    };

    const handleSendDocumentNotification = async () => {
        if (!fullApplication || !postulante) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudo cargar la información de la postulación'
            });
            return;
        }

        // Caso 1: No hay documentos subidos - enviar recordatorio
        if (!fullApplication.documents || fullApplication.documents.length === 0) {
            setSendingNotification(true);
            try {
                // Enviar recordatorio de que debe subir documentos (todos rechazados = debe subir)
                const response = await institutionalEmailService.sendDocumentReviewEmail(
                    postulante.id,
                    {
                        approvedDocuments: [],
                        rejectedDocuments: ['Certificado de Nacimiento', 'Certificado de Notas', 'Informe de Personalidad'],
                        allApproved: false
                    }
                );

                if (response.success) {
                    addNotification({
                        type: 'success',
                        title: 'Recordatorio Enviado',
                        message: 'Se notificó al apoderado que debe subir los documentos requeridos'
                    });
                } else {
                    addNotification({
                        type: 'error',
                        title: 'Error',
                        message: response.message || 'No se pudo enviar el recordatorio'
                    });
                }
            } catch (error) {
                console.error('Error sending reminder:', error);
                addNotification({
                    type: 'error',
                    title: 'Error',
                    message: 'Ocurrió un error al enviar el recordatorio'
                });
            } finally {
                setSendingNotification(false);
            }
            return;
        }

        // Caso 2: Hay documentos subidos - validar revisión

        // CRÍTICO: Refrescar datos de la aplicación desde el backend ANTES de calcular
        // Esto previene race conditions cuando múltiples administradores trabajan simultáneamente
        console.log('Refrescando datos de la aplicación desde el backend...');
        await loadFullApplication();

        if (!fullApplication || !fullApplication.documents) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudieron cargar los datos actualizados de la postulación'
            });
            return;
        }

        const totalDocuments = fullApplication.documents.length;

        // IMPORTANTE: Solo incluir documentos MODIFICADOS en esta sesión (no los ya aprobados en BD)
        // - approvedDocsNow: Documentos marcados como aprobados EN ESTA SESIÓN
        // - rejectedDocsNow: Documentos marcados como rechazados EN ESTA SESIÓN
        const approvedDocsNow = fullApplication.documents.filter((doc, index) => {
            const currentStatus = documentApprovalStatus[index];
            const dbStatus = doc.approvalStatus;
            // Solo incluir si fue marcado como aprobado AHORA (no si ya estaba aprobado en BD)
            return currentStatus === true && dbStatus !== 'APPROVED';
        });

        const rejectedDocsNow = fullApplication.documents.filter((doc, index) => {
            const currentStatus = documentApprovalStatus[index];
            // Incluir todos los rechazados (nuevos o que cambiaron de aprobado a rechazado)
            return currentStatus === false;
        });

        // Contar todos los documentos actualmente aprobados (en BD + en sesión)
        const allApprovedDocs = fullApplication.documents.filter((doc, index) => {
            return documentApprovalStatus[index] === true || doc.approvalStatus === 'APPROVED';
        });

        console.log('DEBUG - documentApprovalStatus:', documentApprovalStatus);
        console.log('DEBUG - approvedDocsNow (new):', approvedDocsNow.length, approvedDocsNow);
        console.log('DEBUG - rejectedDocsNow (new/changed):', rejectedDocsNow.length, rejectedDocsNow);
        console.log('DEBUG - allApprovedDocs (total):', allApprovedDocs.length);

        // Validar que haya ALGO que notificar
        if (approvedDocsNow.length === 0 && rejectedDocsNow.length === 0) {
            console.log('BLOCKED: No new documents reviewed in current session');
            addNotification({
                type: 'warning',
                title: 'Sin cambios',
                message: 'No hay documentos nuevos marcados como aprobados o rechazados. Debes revisar al menos un documento antes de enviar la notificación.'
            });
            return;
        }

        setSendingNotification(true);
        try {
            // Todos aprobados = TODOS los documentos están aprobados (ninguno rechazado, ninguno pendiente)
            const allApproved = allApprovedDocs.length === totalDocuments && rejectedDocsNow.length === 0;

            console.log(' Preparando notificación de revisión de documentos:', {
                applicationId: postulante.id,
                totalDocuments,
                approvedDocsNow: approvedDocsNow.length,
                rejectedDocsNow: rejectedDocsNow.length,
                allApproved
            });

            // STEP 1: Save all document approval statuses to database FIRST
            console.log('Guardando estados de aprobación en la base de datos...');
            const savePromises = fullApplication.documents.map(async (doc, index) => {
                const isApproved = documentApprovalStatus[index] === true;
                const isRejected = documentApprovalStatus[index] === false;

                if (isApproved || isRejected) {
                    const approvalStatus = isApproved ? 'APPROVED' : 'REJECTED';
                    console.log(`  - Documento ${doc.id}: ${approvalStatus}`);

                    await documentService.updateDocumentApproval(
                        doc.id,
                        approvalStatus,
                        isRejected ? 'Documento rechazado por el coordinador' : undefined
                    );
                }
            });

            await Promise.all(savePromises);
            console.log('Todos los estados de aprobación guardados en la base de datos');

            // STEP 2: Now send the email notification
            // IMPORTANTE: Solo enviar al backend los documentos REVISADOS en esta sesión
            console.log(' Enviando notificación de revisión de documentos...');
            const response = await institutionalEmailService.sendDocumentReviewEmail(
                postulante.id,
                {
                    approvedDocuments: approvedDocsNow.map(doc => doc.fileName || doc.name || 'Documento'),
                    rejectedDocuments: rejectedDocsNow.map(doc => doc.fileName || doc.name || 'Documento'),
                    allApproved
                }
            );

            console.log(' Respuesta del servicio de email:', response);

            if (response.success) {
                // STEP 3: Mark that notification was sent in database
                console.log('Marking document notification as sent in database...');
                try {
                    const markResponse = await applicationService.markDocumentNotificationSent(postulante.id);
                    console.log('Document notification marked:', markResponse);
                } catch (markError: any) {
                    console.error('Error marking notification (non-critical):', markError);
                    // Don't block the user flow if this fails
                }

                // Mensaje según el contexto
                let successMessage;
                if (allApproved) {
                    successMessage = 'Se notificó al apoderado que todos los documentos fueron aprobados';
                } else if (rejectedDocsNow.length > 0 && approvedDocsNow.length > 0) {
                    successMessage = `Se notificó al apoderado: ${approvedDocsNow.length} documento(s) aprobados y ${rejectedDocsNow.length} requieren corrección`;
                } else if (rejectedDocsNow.length > 0) {
                    successMessage = `Se notificó al apoderado que ${rejectedDocsNow.length} documento(s) deben ser corregidos y resubidos`;
                } else {
                    successMessage = `Se notificó al apoderado sobre ${approvedDocsNow.length} documento(s) aprobados`;
                }

                addNotification({
                    type: 'success',
                    title: 'Notificación Enviada',
                    message: successMessage
                });

                // STEP 4: Refresh application data to show updated approval status with locked state
                await loadFullApplication();
            } else {
                console.error('Error en respuesta del servicio:', response);
                addNotification({
                    type: 'error',
                    title: 'Error al enviar notificación',
                    message: response.message || 'No se pudo enviar la notificación. Verifica que el email del apoderado sea válido.'
                });
            }
        } catch (error: any) {
            console.error('Error enviando notificación de documentos:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            // Provide more detailed error messages based on the error type
            let errorMessage = 'No se pudo enviar la notificación';

            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const status = error.response.status;
                const data = error.response.data;

                if (status === 404) {
                    errorMessage = 'No se encontró la postulación o el email del apoderado';
                } else if (status === 400) {
                    errorMessage = data?.message || 'Datos inválidos para enviar la notificación';
                } else if (status === 500) {
                    errorMessage = 'Error del servidor al enviar el email. Intenta nuevamente en unos momentos.';
                } else {
                    errorMessage = data?.message || error.message || errorMessage;
                }
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = error.message || errorMessage;
            }

            addNotification({
                type: 'error',
                title: 'Error al enviar notificación',
                message: errorMessage
            });
        } finally {
            setSendingNotification(false);
        }
    };

    const refreshData = async () => {
        await Promise.all([loadFullApplication(), loadInterviews(), loadEvaluations()]);
    };

    if (!postulante) {
        return null;
    }

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'green';
            case 'REJECTED': return 'red';
            case 'UNDER_REVIEW': return 'blue';
            case 'INTERVIEW_SCHEDULED': return 'purple';
            case 'EXAM_SCHEDULED': return 'orange';
            case 'DOCUMENTS_REQUESTED': return 'yellow';
            case 'WAITLIST': return 'gray';
            default: return 'gray';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'PENDING': return 'Pendiente';
            case 'UNDER_REVIEW': return 'En Revisión';
            case 'DOCUMENTS_REQUESTED': return 'Documentos Solicitados';
            case 'INTERVIEW_SCHEDULED': return 'Entrevista Programada';
            case 'EXAM_SCHEDULED': return 'Examen Programado';
            case 'APPROVED': return 'Aprobado';
            case 'REJECTED': return 'Rechazado';
            case 'WAITLIST': return 'Lista de Espera';
            default: return status;
        }
    };

    const renderSpecialCategories = () => {
        const studentData = fullApplication?.student || {};
        const isEmployeeChild = studentData.isEmployeeChild || postulante.esHijoFuncionario;
        const isAlumniChild = studentData.isAlumniChild || postulante.esHijoExalumno;
        const isInclusionStudent = studentData.isInclusionStudent || postulante.esAlumnoInclusion;

        return (
            <div className="space-y-2">
                {isEmployeeChild && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <FiBriefcase className="w-4 h-4 text-blue-600" />
                        <div>
                            <Badge variant="blue" size="sm">Hijo de Funcionario</Badge>
                            <div className="text-sm text-gray-600 mt-1">
                                {studentData.employeeParentName || postulante.nombrePadreFuncionario || 'Funcionario no especificado'}
                            </div>
                        </div>
                    </div>
                )}
                {isAlumniChild && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <FiAward className="w-4 h-4 text-green-600" />
                        <div>
                            <Badge variant="green" size="sm">Hijo de Exalumno</Badge>
                            <div className="text-sm text-gray-600 mt-1">
                                Egreso: {studentData.alumniParentYear || postulante.anioEgresoExalumno || 'Año no especificado'}
                            </div>
                        </div>
                    </div>
                )}
                {isInclusionStudent && (
                    <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                        <FiHeart className="w-4 h-4 text-purple-600" />
                        <div>
                            <Badge variant="purple" size="sm">Alumno de Inclusión</Badge>
                            <div className="text-sm text-gray-600 mt-1">
                                {studentData.inclusionType || postulante.tipoInclusion || 'Tipo no especificado'}
                            </div>
                            {(studentData.inclusionNotes || postulante.notasInclusion) && (
                                <div className="text-xs text-gray-500 mt-1">
                                    {studentData.inclusionNotes || postulante.notasInclusion}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {!isEmployeeChild && !isAlumniChild && !isInclusionStudent && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <FiStar className="w-4 h-4 text-gray-600" />
                        <Badge variant="gray" size="sm">Postulante Regular</Badge>
                    </div>
                )}
            </div>
        );
    };

    const renderInfoTab = () => {
        console.log('renderInfoTab called');
        console.log('fullApplication:', fullApplication);
        console.log('postulante:', postulante);

        // Use fullApplication data when available, fallback to postulante
        const studentData = fullApplication?.student || {};
        console.log('studentData:', studentData);
        console.log('birthDate from studentData:', studentData.birthDate);
        console.log('birthDate from postulante:', postulante.fechaNacimiento);

        const birthDate = studentData.birthDate || postulante.fechaNacimiento;
        const email = studentData.email || postulante.email;
        const address = studentData.address || postulante.direccion;
        const currentSchool = studentData.currentSchool || postulante.colegioActual;
        const submissionDate = fullApplication?.submissionDate || postulante.fechaPostulacion;

        console.log('Final values:');
        console.log('  birthDate:', birthDate);
        console.log('  email:', email);
        console.log('  address:', address);
        console.log('  currentSchool:', currentSchool);

        // Helper function to format dates safely
        const formatDate = (dateString: string | undefined) => {
            if (!dateString) return 'No especificado';
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return 'No especificado';
                return date.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (error) {
                return 'No especificado';
            }
        };

        return (
        <div className="space-y-6">
            {/* Header con foto y datos básicos */}
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                    <FiUser className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{postulante.nombreCompleto}</h2>
                    <div className="flex items-center gap-4 mt-2">
                        <Badge variant={getStatusVariant(postulante.estadoPostulacion)} size="lg">
                            {getStatusText(postulante.estadoPostulacion)}
                        </Badge>
                        <span className="text-gray-600">RUT: {postulante.rut}</span>
                        <span className="text-gray-600">{postulante.edad} años</span>
                    </div>
                </div>
            </div>

            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiUser className="w-5 h-5" />
                        Datos Personales
                    </h3>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Fecha de Nacimiento:</span>
                            <span className="font-medium">
                                {formatDate(birthDate)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium">{email || 'No especificado'}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-gray-600">Dirección:</span>
                            <span className="font-medium text-right flex-1 ml-2">{address || 'No especificada'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiBookOpen className="w-5 h-5" />
                        Información Académica
                    </h3>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Curso Postulado:</span>
                            <Badge variant="blue" size="sm">{postulante.cursoPostulado}</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Colegio Destino:</span>
                            <Badge variant="green" size="sm">
                                {postulante.colegioDestino === 'MONTE_TABOR' ? 'Monte Tabor' : 'Nazaret'}
                            </Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Colegio Actual:</span>
                            <span className="font-medium">{currentSchool || 'No especificado'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Categorías especiales */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <FiStar className="w-5 h-5" />
                    Categorías Especiales
                </h3>
                {renderSpecialCategories()}
            </div>

            {/* Estado y fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiClock className="w-5 h-5" />
                        Fechas Importantes
                    </h3>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Fecha Postulación:</span>
                            <span className="font-medium">
                                {formatDate(submissionDate)}
                            </span>
                        </div>
                        {postulante.fechaEntrevista && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Fecha Entrevista:</span>
                                <span className="font-medium text-purple-600">
                                    {formatDate(postulante.fechaEntrevista)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiCheckCircle className="w-5 h-5" />
                        Estado del Proceso
                    </h3>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Documentos:</span>
                            <Badge variant={postulante.documentosCompletos ? 'green' : 'red'} size="sm">
                                {postulante.documentosCompletos ? 'Completos' : 'Incompletos'} ({postulante.cantidadDocumentos})
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Evaluación:</span>
                            <Badge variant={postulante.evaluacionPendiente ? 'yellow' : 'green'} size="sm">
                                {postulante.evaluacionPendiente ? 'Pendiente' : 'Completada'}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Entrevista:</span>
                            <Badge variant={postulante.entrevistaProgramada ? 'purple' : 'gray'} size="sm">
                                {postulante.entrevistaProgramada ? 'Programada' : 'No programada'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        );
    };

    const renderFamiliaTab = () => {
        // Use fullApplication data when available, fallback to postulante
        const guardianData = fullApplication?.guardian || {};
        const fatherData = fullApplication?.father || {};
        const motherData = fullApplication?.mother || {};

        return (
        <div className="space-y-6">
            {/* Contacto Principal (Guardian) */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <FiUsers className="w-5 h-5" />
                    Contacto Principal / Apoderado
                </h3>
                <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <FiUser className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                                {guardianData.fullName || postulante.nombreContactoPrincipal || 'No especificado'}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                                Relación: {guardianData.relationship || postulante.relacionContacto || 'No especificada'}
                            </p>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <FiPhone className="w-4 h-4 text-gray-400" />
                                    <span>{guardianData.phone || postulante.telefonoContacto || 'No especificado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <FiMail className="w-4 h-4 text-gray-400" />
                                    <span>{guardianData.email || postulante.emailContacto || 'No especificado'}</span>
                                </div>
                                {guardianData.rut && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <FiInfo className="w-4 h-4 text-gray-400" />
                                        <span>RUT: {guardianData.rut}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Información de Padres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Padre */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <FiUser className="w-5 h-5" />
                        Información del Padre
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">
                            {fatherData.fullName || postulante.nombrePadre || 'No especificado'}
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <FiBriefcase className="w-4 h-4 text-gray-400" />
                                <span>Profesión: {fatherData.profession || postulante.profesionPadre || 'No especificada'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FiPhone className="w-4 h-4 text-gray-400" />
                                <span>Teléfono: {fatherData.phone || postulante.telefonoPadre || 'No especificado'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FiMail className="w-4 h-4 text-gray-400" />
                                <span>Email: {fatherData.email || postulante.emailPadre || 'No especificado'}</span>
                            </div>
                            {fatherData.rut && (
                                <div className="flex items-center gap-2">
                                    <FiInfo className="w-4 h-4 text-gray-400" />
                                    <span>RUT: {fatherData.rut}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Madre */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <FiUser className="w-5 h-5" />
                        Información de la Madre
                    </h3>
                    <div className="bg-pink-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">
                            {motherData.fullName || postulante.nombreMadre || 'No especificado'}
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <FiBriefcase className="w-4 h-4 text-gray-400" />
                                <span>Profesión: {motherData.profession || postulante.profesionMadre || 'No especificada'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FiPhone className="w-4 h-4 text-gray-400" />
                                <span>Teléfono: {motherData.phone || postulante.telefonoMadre || 'No especificado'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FiMail className="w-4 h-4 text-gray-400" />
                                <span>Email: {motherData.email || postulante.emailMadre || 'No especificado'}</span>
                            </div>
                            {motherData.rut && (
                                <div className="flex items-center gap-2">
                                    <FiInfo className="w-4 h-4 text-gray-400" />
                                    <span>RUT: {motherData.rut}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sostenedor */}
                {fullApplication?.supporter && (fullApplication.supporter.firstName || fullApplication.supporter.lastName) && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                            <FiShield className="w-5 h-5" />
                            Información del Sostenedor
                        </h3>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 mb-2">
                                {fullApplication.supporter.firstName && fullApplication.supporter.lastName
                                    ? `${fullApplication.supporter.firstName} ${fullApplication.supporter.lastName}`
                                    : 'No especificado'}
                            </h4>
                            <div className="space-y-2 text-sm">
                                {fullApplication.supporter.relationship && (
                                    <div className="flex items-center gap-2">
                                        <FiUsers className="w-4 h-4 text-gray-400" />
                                        <span>Relación: {fullApplication.supporter.relationship}</span>
                                    </div>
                                )}
                                {fullApplication.supporter.phone && (
                                    <div className="flex items-center gap-2">
                                        <FiPhone className="w-4 h-4 text-gray-400" />
                                        <span>Teléfono: {fullApplication.supporter.phone}</span>
                                    </div>
                                )}
                                {fullApplication.supporter.email && (
                                    <div className="flex items-center gap-2">
                                        <FiMail className="w-4 h-4 text-gray-400" />
                                        <span>Email: {fullApplication.supporter.email}</span>
                                    </div>
                                )}
                                {fullApplication.supporter.rut && (
                                    <div className="flex items-center gap-2">
                                        <FiInfo className="w-4 h-4 text-gray-400" />
                                        <span>RUT: {fullApplication.supporter.rut}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        );
    };

    const renderAcademicoTab = () => (
        <div className="space-y-6">
            {/* Estado Académico */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <FiAward className="w-5 h-5" />
                    Estado Académico
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <FiCheckCircle className={`w-5 h-5 ${postulante.evaluacionPendiente ? 'text-yellow-500' : 'text-green-500'}`} />
                            <span className="font-medium">Evaluación Académica</span>
                        </div>
                        <Badge variant={postulante.evaluacionPendiente ? 'yellow' : 'green'} size="sm">
                            {postulante.evaluacionPendiente ? 'Pendiente' : 'Completada'}
                        </Badge>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <FiCalendar className={`w-5 h-5 ${postulante.entrevistaProgramada ? 'text-purple-500' : 'text-gray-400'}`} />
                            <span className="font-medium">Entrevista</span>
                        </div>
                        <Badge variant={postulante.entrevistaProgramada ? 'purple' : 'gray'} size="sm">
                            {postulante.entrevistaProgramada ? 'Programada' : 'No programada'}
                        </Badge>
                        {postulante.fechaEntrevista && (
                            <div className="text-sm text-gray-600 mt-1">
                                {new Date(postulante.fechaEntrevista).toLocaleDateString('es-ES')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Observaciones */}
            {(postulante.observaciones || postulante.necesidadesEspeciales || fullApplication?.student?.specialNeeds) && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <FiMessageSquare className="w-5 h-5" />
                        Observaciones y Necesidades
                    </h3>
                    <div className="space-y-4">
                        {(fullApplication?.student?.specialNeeds || postulante.necesidadesEspeciales) && (
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <FiAlertCircle className="w-5 h-5 text-yellow-600" />
                                    <span className="font-medium text-yellow-800">Necesidades Especiales</span>
                                </div>
                                <p className="text-sm text-yellow-700">
                                    {fullApplication?.student?.specialNeedsDescription || 'Este estudiante tiene necesidades especiales que requieren atención.'}
                                </p>
                            </div>
                        )}
                        {postulante.observaciones && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Observaciones</h4>
                                <p className="text-sm text-gray-700">{postulante.observaciones}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderEntrevistasTab = () => {
        const requiredTypes = REQUIRED_INTERVIEW_TYPES.filter(t => t.required);
        const completedInterviews = interviews.filter(i => i.status === InterviewStatus.COMPLETED).length;
        const scheduledInterviews = interviews.filter(i =>
            i.status === InterviewStatus.SCHEDULED || i.status === InterviewStatus.CONFIRMED
        ).length;
        const missingInterviews = requiredTypes.filter(type =>
            !interviews.some(interview => interview.type === type.type)
        ).length;

        // CRITICAL: Cap progress at 100% to prevent overflow in UI
        const progress = Math.min(100, Math.round(((completedInterviews + scheduledInterviews) / requiredTypes.length) * 100));

        // VALIDATION: Verify sum of interview categories matches required types
        const totalInterviewsAssigned = completedInterviews + scheduledInterviews + missingInterviews;
        if (totalInterviewsAssigned !== requiredTypes.length) {
            console.warn(
                `Interview counter mismatch detected!`,
                `\n  Required types: ${requiredTypes.length}`,
                `\n  Completed: ${completedInterviews}`,
                `\n  Scheduled: ${scheduledInterviews}`,
                `\n  Missing: ${missingInterviews}`,
                `\n  Sum: ${totalInterviewsAssigned}`,
                `\n  Difference: ${requiredTypes.length - totalInterviewsAssigned}`,
                `\n  This indicates an interview may be counted in multiple categories or filter logic error`
            );
        }

        return (
            <div className="space-y-6">
                {/* Header con refresh */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiCalendar className="w-5 h-5" />
                        Sistema de 4 Entrevistas
                    </h3>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={loadInterviews}
                        disabled={interviewsLoading}
                    >
                        <FiRefreshCw className={`w-4 h-4 mr-1 ${interviewsLoading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                </div>

                {/* Progreso general */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progreso de Entrevistas Obligatorias</span>
                        <span className="text-sm text-gray-600">{completedInterviews + scheduledInterviews} de {requiredTypes.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>{completedInterviews} completadas</span>
                        <span>{scheduledInterviews} programadas</span>
                        <span>{missingInterviews} pendientes</span>
                    </div>
                </div>

                {/* Estado de cada tipo de entrevista */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {REQUIRED_INTERVIEW_TYPES.map(type => {
                        const interview = interviews.find(i => i.type === type.type);
                        const hasInterview = !!interview;
                        const isCompleted = interview?.status === InterviewStatus.COMPLETED;
                        const isScheduled = interview?.status === InterviewStatus.SCHEDULED ||
                                          interview?.status === InterviewStatus.CONFIRMED;

                        return (
                            <div key={type.type} className={`p-4 rounded-lg border-2 ${
                                isCompleted ? 'border-green-200 bg-green-50' :
                                isScheduled ? 'border-blue-200 bg-blue-50' :
                                type.required ? 'border-orange-200 bg-orange-50' :
                                'border-gray-200 bg-gray-50'
                            }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{type.title}</span>
                                        {type.required && <span className="text-red-500 text-xs">*</span>}
                                    </div>
                                    <Badge
                                        variant="neutral"
                                        size="sm"
                                        className={`text-xs ${
                                            isCompleted ? 'text-green-700 bg-green-100' :
                                            isScheduled ? 'text-blue-700 bg-blue-100' :
                                            type.required ? 'text-orange-700 bg-orange-100' :
                                            'text-gray-600 bg-gray-100'
                                        }`}
                                    >
                                        {isCompleted ? 'Completada' :
                                         isScheduled ? 'Programada' :
                                         type.required ? 'Requerida' : 'Opcional'}
                                    </Badge>
                                </div>

                                {interview && (
                                    <div className="space-y-1 text-xs text-gray-600">
                                        <p>{new Date(interview.scheduledDate).toLocaleDateString('es-CL')}</p>
                                        <p>{interview.scheduledTime}</p>
                                        <p>{interview.interviewerName}</p>
                                        {interview.status === InterviewStatus.COMPLETED && interview.score && (
                                            <p className="text-green-600 font-medium">⭐ {interview.score}/10</p>
                                        )}
                                    </div>
                                )}

                                <div className="mt-3">
                                    {hasInterview ? (
                                        <Button size="sm" variant="outline" className="w-full text-xs">
                                            <FiEye className="w-3 h-3 mr-1" />
                                            Ver Detalles
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            className="w-full text-xs"
                                            onClick={() => onScheduleInterview?.(postulante, type.type)}
                                        >
                                            <FiCalendar className="w-3 h-3 mr-1" />
                                            Programar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Lista de entrevistas */}
                {interviews.length > 0 && (
                    <div>
                        <h4 className="font-medium text-gray-900 mb-3">Historial de Entrevistas ({interviews.length})</h4>
                        <div className="space-y-3">
                            {interviews.map(interview => (
                                <div key={interview.id} className="border rounded-lg p-3 bg-white">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <h5 className="font-medium text-gray-900">
                                                    {INTERVIEW_TYPE_LABELS[interview.type as keyof typeof INTERVIEW_TYPE_LABELS] || interview.type}
                                                </h5>
                                                <p className="text-sm text-gray-600">{interview.interviewerName}</p>
                                            </div>
                                        </div>
                                        <Badge variant="info" size="sm">
                                            {interview.status === InterviewStatus.COMPLETED ? 'Completada' :
                                             interview.status === InterviewStatus.SCHEDULED ? 'Programada' :
                                             interview.status === InterviewStatus.CONFIRMED ? 'Confirmada' :
                                             interview.status}
                                        </Badge>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                        {new Date(interview.scheduledDate).toLocaleDateString('es-CL')}
                                        {interview.scheduledTime}
                                        {interview.status === InterviewStatus.COMPLETED && interview.score && (
                                            <span className="ml-2 text-green-600 font-medium">⭐ {interview.score}/10</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {interviewsLoading && (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-2">Cargando entrevistas...</p>
                    </div>
                )}
            </div>
        );
    };

    // Helper function to classify academic documents (grades only)
    const isAcademicDocument = (doc: any): boolean => {
        const academicTypes = [
            DocumentType.GRADES_2023,
            DocumentType.GRADES_2024,
            DocumentType.GRADES_2025_SEMESTER_1
        ];
        // Backend sends 'name' field, not 'documentType'
        return doc.name && academicTypes.includes(doc.name);
    };

    // Helper function to classify other documents (non-academic)
    const isOtherDocument = (doc: any): boolean => {
        return !isAcademicDocument(doc);
    };

    const renderDocumentosTab = () => {
        console.log('renderDocumentosTab - fullApplication:', fullApplication);
        console.log('renderDocumentosTab - fullApplication?.documents:', fullApplication?.documents);

        const hasDocuments = fullApplication?.documents && fullApplication.documents.length > 0;
        console.log('hasDocuments:', hasDocuments);

        // Filter documents based on active sub-tab
        const filteredDocuments = hasDocuments
            ? fullApplication.documents.filter(doc =>
                documentSubTab === 'academic' ? isAcademicDocument(doc) : isOtherDocument(doc)
              )
            : [];

        console.log('filteredDocuments:', filteredDocuments);
        console.log('documentSubTab:', documentSubTab);

        const approvedCount = hasDocuments ? fullApplication.documents.filter((_, index) => documentApprovalStatus[index]).length : 0;
        const rejectedCount = hasDocuments ? fullApplication.documents.filter((_, index) => documentApprovalStatus[index] === false).length : 0;

        // Get counts for each category
        const academicDocsCount = hasDocuments ? fullApplication.documents.filter(isAcademicDocument).length : 0;
        const otherDocsCount = hasDocuments ? fullApplication.documents.filter(isOtherDocument).length : 0;

        console.log('academicDocsCount:', academicDocsCount, 'otherDocsCount:', otherDocsCount);

        // VALIDATION: Verify sum of categories matches total
        const totalDocuments = fullApplication?.documents?.length || 0;
        const sumCategories = academicDocsCount + otherDocsCount;
        if (sumCategories !== totalDocuments) {
            console.warn(
                `Document counter mismatch detected!`,
                `\n  Total documents: ${totalDocuments}`,
                `\n  Academic: ${academicDocsCount}`,
                `\n  Other: ${otherDocsCount}`,
                `\n  Sum: ${sumCategories}`,
                `\n  Difference: ${totalDocuments - sumCategories}`,
                `\n  This indicates a classification error in isAcademicDocument() or isOtherDocument()`
            );
        }

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiFileText className="w-5 h-5" />
                        Documentos de la Postulación
                    </h3>
                    <Badge variant={postulante.documentosCompletos ? 'green' : 'red'} size="sm">
                        {postulante.documentosCompletos ? 'Completos' : 'Incompletos'}
                    </Badge>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <FiInfo className="w-5 h-5 text-blue-500" />
                        <span className="font-medium">Estado de Documentos</span>
                    </div>
                    <div className="text-sm text-gray-700">
                        <p>Total de documentos: <span className="font-medium">{fullApplication?.documents?.length || postulante.cantidadDocumentos || 0}</span></p>
                        <p className="mt-1">
                            Estado: <Badge variant={postulante.documentosCompletos ? 'green' : 'red'} size="xs">
                                {postulante.documentosCompletos ? 'Documentación completa' : 'Faltan documentos'}
                            </Badge>
                        </p>
                    </div>
                </div>

                {hasDocuments ? (
                    <>
                        {/* Sub-tabs for document categories */}
                        <div className="flex gap-2 border-b border-gray-200">
                            <button
                                onClick={() => setDocumentSubTab('academic')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    documentSubTab === 'academic'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <FiBookOpen className="w-4 h-4" />
                                Documentos Académicos
                                <Badge variant={documentSubTab === 'academic' ? 'blue' : 'gray'} size="xs">
                                    {academicDocsCount}
                                </Badge>
                            </button>
                            <button
                                onClick={() => setDocumentSubTab('other')}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    documentSubTab === 'other'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <FiFileText className="w-4 h-4" />
                                Otros Documentos
                                <Badge variant={documentSubTab === 'other' ? 'blue' : 'gray'} size="xs">
                                    {otherDocsCount}
                                </Badge>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">
                                    {documentSubTab === 'academic' ? 'Notas y Certificados Académicos' : 'Certificados y Documentos Adicionales'}
                                </h4>
                                {approvedCount > 0 && (
                                    <div className="text-sm text-gray-600">
                                        <span className="text-green-600 font-medium">{approvedCount} aprobados</span>
                                        {rejectedCount > 0 && <span className="text-red-600 font-medium ml-2">{rejectedCount} rechazados</span>}
                                    </div>
                                )}
                            </div>

                            {filteredDocuments.length > 0 ? (
                                <>
                                    {filteredDocuments.map((doc, docIndex) => {
                                        // Get original index from full documents array
                                        const originalIndex = fullApplication.documents.indexOf(doc);
                                        const isApproved = documentApprovalStatus[originalIndex];
                                        const isRejected = documentApprovalStatus[originalIndex] === false;
                                        // Show if document was previously approved in database (visual indicator only)
                                        const wasPreviouslyApproved = doc.approvalStatus === 'APPROVED';

                                        return (
                                            <div
                                                key={originalIndex}
                                                className={`flex items-center justify-between p-3 bg-white border-2 rounded-lg transition-all ${
                                                    isApproved ? 'border-green-300 bg-green-50' :
                                                    isRejected ? 'border-red-300 bg-red-50' :
                                                    wasPreviouslyApproved ? 'border-green-200 bg-green-50/50' :
                                                    'border-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    {/* Status Button (NO LOCK - always editable) */}
                                                    <button
                                                        onClick={() => toggleDocumentApproval(originalIndex)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                            isApproved
                                                                ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer shadow-sm'
                                                                : isRejected
                                                                ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer shadow-sm'
                                                                : wasPreviouslyApproved
                                                                ? 'bg-green-400 text-white hover:bg-green-500 cursor-pointer shadow-sm'
                                                                : 'bg-gray-400 text-white hover:bg-gray-500 cursor-pointer shadow-sm'
                                                        }`}
                                                        title="Click para cambiar estado (Pendiente → Aprobado → Rechazado → Pendiente)"
                                                    >
                                                        {isApproved ? 'Aprobado' : isRejected ? 'Rechazado' : wasPreviouslyApproved ? 'Ya Aprobado' : '⏱ Pendiente'}
                                                    </button>

                                                    <FiFileText className={`w-4 h-4 ${
                                                        isApproved ? 'text-green-600' :
                                                        isRejected ? 'text-red-600' :
                                                        wasPreviouslyApproved ? 'text-green-500' :
                                                        'text-blue-500'
                                                    }`} />
                                                    <div className="flex-1">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {doc.fileName || `Documento ${originalIndex + 1}`}
                                                        </span>
                                                        <div className="text-xs text-gray-500">
                                                            {doc.name || 'Tipo no especificado'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewDocument(doc)}
                                                        title="Ver documento"
                                                    >
                                                        <FiEye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={async () => {
                                                            try {
                                                                // Use Vercel Blob URL directly for download
                                                                const url = doc.filePath;
                                                                if (url && url.startsWith('http')) {
                                                                    // For Vercel Blob, add download=1 parameter
                                                                    const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=1`;
                                                                    const link = document.createElement('a');
                                                                    link.href = downloadUrl;
                                                                    link.download = doc.fileName || doc.originalName || 'documento.pdf';
                                                                    link.target = '_blank';
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                } else {
                                                                    // Fallback: use gateway endpoint
                                                                    const gatewayUrl = import.meta.env.VITE_API_URL || 'https://admitia-bff-staging.up.railway.app';
                                                                    const downloadUrl = `${gatewayUrl}/v1/documents/${doc.id}/download`;
                                                                    window.open(downloadUrl, '_blank');
                                                                }
                                                            } catch (error) {
                                                                console.error('Error downloading document:', error);
                                                                addNotification({
                                                                    type: 'error',
                                                                    title: 'Error',
                                                                    message: 'No se pudo descargar el documento'
                                                                });
                                                            }
                                                        }}
                                                        title="Descargar documento"
                                                    >
                                                        <FiDownload className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                    <FiFileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p className="mb-2">No hay documentos en esta categoría</p>
                                    <p className="text-sm text-gray-400">
                                        {documentSubTab === 'academic'
                                            ? 'No se han subido certificados de notas'
                                            : 'No se han subido otros documentos'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Botón de enviar notificación */}
                        <div className="border-t pt-4">
                            <div className="bg-blue-50 p-4 rounded-lg mb-3">
                                <div className="flex items-start gap-2">
                                    <FiInfo className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-1">Instrucciones:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            <li>Marca cada documento con para aprobar o sin marcar para rechazar</li>
                                            <li>Una vez revisados todos, presiona el botón para notificar al apoderado</li>
                                            <li>Si todos están aprobados, se enviará confirmación</li>
                                            <li>Si hay rechazados, se solicitará resubir los documentos pendientes</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Notification Sent Indicator */}
                            {fullApplication.lastDocumentNotificationAt && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <FiCheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-green-900 mb-1">
                                                Notificación ya enviada
                                            </p>
                                            <p className="text-sm text-green-700">
                                                Última notificación enviada el{' '}
                                                {new Date(fullApplication.lastDocumentNotificationAt).toLocaleDateString('es-CL', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                            <p className="text-xs text-green-600 mt-1">
                                                Puedes enviar otra notificación si hay cambios nuevos en los documentos
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleSendDocumentNotification}
                                disabled={sendingNotification}
                                isLoading={sendingNotification}
                                loadingText="Enviando notificación..."
                                className="w-full"
                            >
                                <FiMail className="w-5 h-5 mr-2" />
                                {fullApplication.lastDocumentNotificationAt ? 'Reenviar Notificación al Apoderado' : 'Enviar Notificación al Apoderado'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center py-8 text-gray-500">
                            <FiFileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="mb-2">No hay documentos disponibles para mostrar</p>
                            <p className="text-sm text-gray-400">El apoderado aún no ha subido ningún documento</p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-medium text-yellow-900 mb-2">Recordatorio de Documentos</p>
                                    <p className="text-sm text-yellow-700 mb-3">
                                        Puedes enviar un correo al apoderado recordándole que debe subir los documentos requeridos para continuar con el proceso de admisión.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleSendDocumentNotification}
                            disabled={sendingNotification}
                            isLoading={sendingNotification}
                            loadingText="Enviando recordatorio..."
                            className="w-full"
                        >
                            <FiMail className="w-5 h-5 mr-2" />
                            Enviar Recordatorio al Apoderado
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    const renderHistorialTab = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FiClock className="w-5 h-5" />
                Historial del Proceso
            </h3>

            <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                    <FiCheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-medium text-blue-900">Postulación Creada</h4>
                        <p className="text-sm text-blue-700">
                            {new Date(postulante.fechaCreacion).toLocaleDateString('es-ES')} -
                            Creada por: {postulante.creadoPor}
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
                    <FiFileText className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                        <h4 className="font-medium text-green-900">Estado Actual</h4>
                        <p className="text-sm text-green-700">
                            {getStatusText(postulante.estadoPostulacion)}
                        </p>
                    </div>
                </div>

                {postulante.fechaEntrevista && (
                    <div className="flex items-start gap-3 p-3 bg-purple-50 border-l-4 border-purple-400 rounded-r-lg">
                        <FiCalendar className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-medium text-purple-900">Entrevista Programada</h4>
                            <p className="text-sm text-purple-700">
                                {new Date(postulante.fechaEntrevista).toLocaleDateString('es-ES')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Información del Sistema</h4>
                <div className="text-sm text-gray-600 space-y-1">
                    <p>ID del Postulante: <span className="font-mono">{postulante.id}</span></p>
                    <p>Fecha de última actualización: {new Date(postulante.fechaActualizacion).toLocaleString('es-ES')}</p>
                </div>
            </div>
        </div>
    );

    const getEvaluationTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'MATHEMATICS_EXAM': 'Examen de Matemática',
            'LANGUAGE_EXAM': 'Examen de Lenguaje',
            'ENGLISH_EXAM': 'Examen de Inglés'
        };
        return labels[type] || type;
    };

    const getEvaluationIcon = (type: string) => {
        const icons: Record<string, string> = {
            'MATHEMATICS_EXAM': '🔢',
            'LANGUAGE_EXAM': '',
            'ENGLISH_EXAM': ''
        };
        return icons[type] || '';
    };

    const REQUIRED_EVALUATION_TYPES = [
        { type: 'MATHEMATICS_EXAM', title: 'Examen de Matemática', icon: '🔢', required: true },
        { type: 'LANGUAGE_EXAM', title: 'Examen de Lenguaje', icon: '', required: true },
        { type: 'ENGLISH_EXAM', title: 'Examen de Inglés', icon: '', required: true }
    ];

    const renderEvaluationsTab = () => {
        const requiredTypes = REQUIRED_EVALUATION_TYPES.filter(t => t.required);
        const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];
        const completedEvaluations = safeEvaluations.filter(e => e.status === 'COMPLETED').length;
        // Contar evaluaciones en progreso O pendientes con evaluador asignado
        const inProgressEvaluations = safeEvaluations.filter(e =>
            e.status === 'IN_PROGRESS' || (e.status === 'PENDING' && e.evaluatorId)
        ).length;
        const missingEvaluations = requiredTypes.filter(type =>
            !safeEvaluations.some(evaluation => evaluation.evaluationType === type.type)
        ).length;

        // CRITICAL: Cap progress at 100% to prevent overflow in UI
        const progress = Math.min(100, Math.round(((completedEvaluations + inProgressEvaluations) / requiredTypes.length) * 100));

        return (
            <div className="space-y-6">
                {/* Header con refresh */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FiCheckCircle className="w-5 h-5" />
                        Sistema de Evaluaciones
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSendReminders}
                            disabled={sendingReminders || evaluationsLoading}
                            isLoading={sendingReminders}
                        >
                            <FiMail className="w-4 h-4 mr-1" />
                            {sendingReminders ? 'Enviando...' : 'Enviar Recordatorios'}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={loadEvaluations}
                            disabled={evaluationsLoading}
                        >
                            <FiRefreshCw className={`w-4 h-4 mr-1 ${evaluationsLoading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>
                </div>

                {/* Progreso general */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progreso de Evaluaciones Obligatorias</span>
                        <span className="text-sm text-gray-600">{completedEvaluations + inProgressEvaluations} de {requiredTypes.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>{completedEvaluations} completadas</span>
                        <span>{inProgressEvaluations} en progreso</span>
                        <span>{missingEvaluations} pendientes</span>
                    </div>
                </div>

                {/* Estado de cada tipo de evaluación */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {REQUIRED_EVALUATION_TYPES.map(type => {
                        const evaluation = safeEvaluations.find(e => e.evaluationType === type.type);
                        const hasEvaluation = !!evaluation;
                        const isCompleted = evaluation?.status === 'COMPLETED';
                        const isInProgress = evaluation?.status === 'IN_PROGRESS';

                        return (
                            <div key={type.type} className={`p-4 rounded-lg border-2 ${
                                isCompleted ? 'border-green-200 bg-green-50' :
                                isInProgress ? 'border-blue-200 bg-blue-50' :
                                type.required ? 'border-orange-200 bg-orange-50' :
                                'border-gray-200 bg-gray-50'
                            }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{type.title}</span>
                                        {type.required && <span className="text-red-500 text-xs">*</span>}
                                    </div>
                                    <Badge
                                        variant="neutral"
                                        size="sm"
                                        className={`text-xs ${
                                            isCompleted ? 'text-green-700 bg-green-100' :
                                            isInProgress ? 'text-blue-700 bg-blue-100' :
                                            type.required ? 'text-orange-700 bg-orange-100' :
                                            'text-gray-600 bg-gray-100'
                                        }`}
                                    >
                                        {isCompleted ? 'Completada' :
                                         isInProgress ? 'En Progreso' :
                                         type.required ? 'Requerida' : 'Opcional'}
                                    </Badge>
                                </div>

                                {evaluation && (
                                    <div className="space-y-1 text-xs text-gray-600">
                                        {evaluation.score !== null && evaluation.score !== undefined && (
                                            <p className="font-medium text-blue-600">
                                                Puntaje: {evaluation.score}/{evaluation.maxScore ?? '—'}
                                            </p>
                                        )}
                                        {evaluation.evaluator && (
                                            <p className="font-medium">{evaluation.evaluator.firstName} {evaluation.evaluator.lastName}</p>
                                        )}
                                        {evaluation.completionDate && (
                                            <p>{new Date(evaluation.completionDate).toLocaleDateString('es-CL')}</p>
                                        )}
                                    </div>
                                )}

                                {!hasEvaluation && (
                                    <div className="mt-3">
                                        <p className="text-xs text-gray-500 mb-2">Evaluación pendiente</p>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            className="w-full text-xs"
                                            onClick={() => handleAssignEvaluatorFromDetail(type.type)}
                                        >
                                            <FiUser className="w-3 h-3 mr-1" />
                                            Asignar Evaluador
                                        </Button>
                                    </div>
                                )}

                                {hasEvaluation && evaluation.status === 'PENDING' && !evaluation.evaluator && (
                                    <div className="mt-3">
                                        <p className="text-xs text-orange-600 mb-2">Evaluación creada sin evaluador</p>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            className="w-full text-xs"
                                            onClick={() => handleAssignEvaluatorFromDetail(type.type)}
                                        >
                                            <FiUser className="w-3 h-3 mr-1" />
                                            Asignar Evaluador
                                        </Button>
                                    </div>
                                )}

                                {hasEvaluation && evaluation.status === 'PENDING' && evaluation.evaluator && (
                                    <div className="mt-3">
                                        <p className="text-xs text-gray-600 mb-2">
                                            Ya asignada a: <span className="font-medium">{evaluation.evaluator.firstName} {evaluation.evaluator.lastName}</span>
                                        </p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-xs"
                                            disabled
                                            title="Ya existe una asignación para esta evaluación"
                                        >
                                            <FiCheck className="w-3 h-3 mr-1" />
                                            Evaluador Asignado
                                        </Button>
                                    </div>
                                )}

                                {hasEvaluation && (evaluation.status === 'IN_PROGRESS' || evaluation.status === 'COMPLETED') && (
                                    <div className="mt-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-xs"
                                            onClick={() => {
                                                setSelectedEvaluation(evaluation);
                                                setShowEvaluationDetail(true);
                                            }}
                                        >
                                            <FiEye className="w-3 h-3 mr-1" />
                                            Ver Detalles
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {evaluationsLoading && (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-2">Cargando evaluaciones...</p>
                    </div>
                )}
            </div>
        );
    };

    const tabs = [
        { key: 'info', label: 'Información General', icon: FiUser },
        { key: 'familia', label: 'Familia', icon: FiUsers },
        { key: 'academico', label: 'Académico', icon: FiAward },
        { key: 'entrevistas', label: 'Entrevistas', icon: FiCalendar },
        { key: 'evaluaciones', label: 'Evaluaciones', icon: FiCheckCircle },
        { key: 'documentos', label: 'Documentos', icon: FiFileText },
        { key: 'historial', label: 'Historial', icon: FiClock }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Información Detallada del Estudiante"
            size="max"
        >
            <div className="flex flex-col min-h-[600px]">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'info' && renderInfoTab()}
                            {activeTab === 'familia' && renderFamiliaTab()}
                            {activeTab === 'academico' && renderAcademicoTab()}
                            {activeTab === 'entrevistas' && renderEntrevistasTab()}
                            {activeTab === 'evaluaciones' && renderEvaluationsTab()}
                            {activeTab === 'documentos' && renderDocumentosTab()}
                            {activeTab === 'historial' && renderHistorialTab()}
                        </>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => onEdit?.(postulante)}
                    >
                        <FiEdit className="w-4 h-4 mr-2" />
                        Editar
                    </Button>
                    {postulante.estadoPostulacion === 'UNDER_REVIEW' && (
                        <Button 
                            variant="primary" 
                            onClick={() => onScheduleInterview?.(postulante)}
                        >
                            <FiCalendar className="w-4 h-4 mr-2" />
                            Programar Entrevista
                        </Button>
                    )}
                </div>
            </div>

            {/* Modal de Detalles de Evaluación */}
            {showEvaluationDetail && selectedEvaluation && (
                <Modal
                    isOpen={showEvaluationDetail}
                    onClose={() => {
                        setShowEvaluationDetail(false);
                        setSelectedEvaluation(null);
                    }}
                    title="Detalles de la Evaluación"
                    size="lg"
                >
                    {console.log('Selected Evaluation:', selectedEvaluation)}
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-lg font-bold text-blue-900">
                                {selectedEvaluation.evaluationType === 'MATHEMATICS_EXAM' && 'Examen de Matemática'}
                                {selectedEvaluation.evaluationType === 'LANGUAGE_EXAM' && 'Examen de Lenguaje'}
                                {selectedEvaluation.evaluationType === 'ENGLISH_EXAM' && 'Examen de Inglés'}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-blue-700">
                                <span className="font-medium">Evaluador: {selectedEvaluation.evaluator?.firstName} {selectedEvaluation.evaluator?.lastName}</span>
                                {selectedEvaluation.completionDate && (
                                    <span>{new Date(selectedEvaluation.completionDate).toLocaleDateString('es-CL', { dateStyle: 'long' })}</span>
                                )}
                            </div>
                        </div>

                        {/* Puntaje */}
                        {selectedEvaluation.score !== null && selectedEvaluation.score !== undefined && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-semibold text-green-900">Puntaje Obtenido:</span>
                                    <span className="text-3xl font-bold text-green-700">
                                        {selectedEvaluation.score}/{selectedEvaluation.maxScore ?? '—'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Observaciones Generales */}
                        {selectedEvaluation.observations && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                    <FiMessageSquare className="w-5 h-5" />
                                    Observaciones Generales
                                </h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedEvaluation.observations}</p>
                            </div>
                        )}

                        {/* Fortalezas */}
                        {selectedEvaluation.strengths && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                                    <FiCheckCircle className="w-5 h-5" />
                                    Fortalezas Identificadas
                                </h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedEvaluation.strengths}</p>
                            </div>
                        )}

                        {/* Áreas de Mejora */}
                        {selectedEvaluation.areasForImprovement && (
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                                    <FiAlertCircle className="w-5 h-5" />
                                    Áreas de Mejora
                                </h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedEvaluation.areasForImprovement}</p>
                            </div>
                        )}

                        {/* Recomendaciones */}
                        {selectedEvaluation.recommendations && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                    <FiStar className="w-5 h-5" />
                                    Recomendaciones
                                </h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedEvaluation.recommendations}</p>
                            </div>
                        )}


                        {/* Estado */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">Estado de la Evaluación:</span>
                            <Badge variant={selectedEvaluation.status === 'COMPLETED' ? 'success' : 'warning'} size="lg">
                                {selectedEvaluation.status === 'COMPLETED' ? 'Completada' : 'En Proceso'}
                            </Badge>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowEvaluationDetail(false);
                                    setSelectedEvaluation(null);
                                }}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal de Asignación de Evaluador Individual */}
            {showAssignEvaluatorModal && selectedEvaluationType && (
                <Modal
                    isOpen={showAssignEvaluatorModal}
                    onClose={() => {
                        setShowAssignEvaluatorModal(false);
                        setAssignMessage(null);
                        setIsAssigning(false);
                    }}
                    title="Asignar Evaluador"
                    size="md"
                >
                    <div className="space-y-4">
                        {/* Información del estudiante */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-1">
                                {postulante?.nombreCompleto}
                            </h4>
                            <p className="text-blue-600 text-sm">
                                Curso: {postulante?.cursoPostulado}
                            </p>
                        </div>

                        {/* Tipo de evaluación */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600">Tipo de Evaluación:</p>
                            <p className="font-medium text-gray-900">
                                {selectedEvaluationType === 'MATHEMATICS_EXAM' && 'Examen de Matemática'}
                                {selectedEvaluationType === 'LANGUAGE_EXAM' && 'Examen de Lenguaje'}
                                {selectedEvaluationType === 'ENGLISH_EXAM' && 'Examen de Inglés'}
                            </p>
                        </div>

                        {/* Selector de evaluador */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Seleccionar Evaluador
                            </label>
                            <select
                                value={selectedEvaluatorId}
                                onChange={(e) => setSelectedEvaluatorId(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={isAssigning}
                            >
                                <option value={0}>-- Seleccione un evaluador --</option>
                                {availableEvaluators.map((evaluator) => (
                                    <option key={evaluator.id} value={evaluator.id}>
                                        {evaluator.firstName} {evaluator.lastName}
                                        {evaluator.subject && ` - ${evaluator.subject}`}
                                        {evaluator.role && ` (${evaluator.role})`}
                                    </option>
                                ))}
                            </select>
                            {availableEvaluators.length === 0 && (
                                <p className="text-sm text-amber-600 mt-2">
                                    No hay evaluadores disponibles para este tipo de evaluación
                                </p>
                            )}
                        </div>

                        {/* Mensaje de feedback */}
                        {assignMessage && (
                            <div className={`p-4 rounded-lg ${
                                assignMessage.type === 'success'
                                    ? 'bg-green-50 border border-green-200 text-green-800'
                                    : 'bg-red-50 border border-red-200 text-red-800'
                            }`}>
                                <p className="text-sm font-medium">{assignMessage.text}</p>
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAssignEvaluatorModal(false);
                                    setAssignMessage(null);
                                    setIsAssigning(false);
                                }}
                                disabled={isAssigning}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirmAssignment}
                                disabled={isAssigning || selectedEvaluatorId === 0}
                                isLoading={isAssigning}
                            >
                                {isAssigning ? 'Asignando...' : 'Asignar Evaluador'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal de Visor de Documentos */}
            {showDocumentViewer && viewingDocument && (
                <Modal
                    isOpen={showDocumentViewer}
                    onClose={() => {
                        setShowDocumentViewer(false);
                        setViewingDocument(null);
                    }}
                    title={`Visualizando: ${viewingDocument.fileName || 'Documento'}`}
                    size="max"
                >
                    <div className="space-y-4">
                        {/* Información del documento */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Tipo:</span>
                                    <span className="ml-2 font-medium">{viewingDocument.name || 'No especificado'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Subido:</span>
                                    <span className="ml-2 font-medium">
                                        {viewingDocument.uploadDate ? new Date(viewingDocument.uploadDate).toLocaleDateString('es-CL') : 'Desconocido'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Visor del documento */}
                        <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '70vh' }}>
                            {viewingDocument.fileName && (
                                viewingDocument.fileName.toLowerCase().endsWith('.pdf') ? (
                                    <iframe
                                        src={getDocumentViewUrl(viewingDocument) || ''}
                                        className="w-full h-full"
                                        title={viewingDocument.fileName}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <img
                                            src={getDocumentViewUrl(viewingDocument) || ''}
                                            alt={viewingDocument.fileName}
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                )
                            )}
                        </div>

                        {/* Botones de acción */}
                        <div className="flex justify-between items-center pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    const url = getDocumentViewUrl(viewingDocument);
                                    if (url) {
                                        const link = document.createElement('a');
                                        link.href = url.replace('/view/', '/download/');
                                        link.download = viewingDocument.fileName || 'documento.pdf';
                                        link.click();
                                    }
                                }}
                            >
                                <FiDownload className="w-4 h-4 mr-2" />
                                Descargar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setShowDocumentViewer(false);
                                    setViewingDocument(null);
                                }}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </Modal>
    );
};

export default StudentDetailModal;