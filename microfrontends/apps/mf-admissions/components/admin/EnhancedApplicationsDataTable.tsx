import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { TableColumn } from '../ui/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import AdvancedFilters, { FilterCondition, FilterField } from '../ui/AdvancedFilters';
import StudentDetailModal from './StudentDetailModal';
import { FiEdit, FiEye, FiDownload, FiCalendar, FiPhone, FiMail, FiBookOpen, FiClock, FiAlertCircle, FiInfo, FiFilter, FiUser } from 'react-icons/fi';
import { useNotifications } from '../../context/AppContext';
import { Application } from '../../services/applicationService';
import api from '../../services/api';

// Interface completa para la postulación
interface EnhancedApplication {
    id: number;
    // Datos del estudiante
    studentFirstName: string;
    studentLastName: string;
    studentFullName: string;
    studentRut: string;
    studentBirthDate: string;
    studentAge: number;
    studentEmail?: string;
    studentAddress: string;
    gradeApplied: string;
    schoolApplied: string; // MONTE_TABOR o NAZARET
    currentSchool?: string;
    hasSpecialNeeds: boolean;
    specialNeedsDescription?: string;
    
    // Estado de la postulación
    status: 'PENDING' | 'UNDER_REVIEW' | 'DOCUMENTS_REQUESTED' | 'INTERVIEW_SCHEDULED' | 'EXAM_SCHEDULED' | 'APPROVED' | 'REJECTED' | 'WAITLIST';
    submissionDate: string;
    lastUpdated: string;
    
    // Información de contacto principal
    parentName: string;
    parentEmail: string;
    parentPhone: string;
    parentRelationship: string;
    
    // Datos del padre
    fatherName?: string;
    fatherEmail?: string;
    fatherPhone?: string;
    fatherProfession?: string;
    
    // Datos de la madre
    motherName?: string;
    motherEmail?: string;
    motherPhone?: string;
    motherProfession?: string;
    
    // Documentos y evaluaciones
    documentsComplete: boolean;
    documentsCount: number;
    evaluationScore?: number;
    evaluationStatus: string;
    psychologicalEvaluation?: string;
    academicEvaluation?: string;
    
    // Entrevistas
    interviewDate?: string;
    interviewStatus?: string;
    interviewNotes?: string;
    
    // Información adicional
    academicYear: string;
    priority: 'NORMAL' | 'HIGH' | 'URGENT';
    tags: string[];
    internalNotes?: string;
    
    // Metadatos
    createdAt: string;
    createdBy: string;
    lastModifiedBy?: string;
}

interface EnhancedApplicationsDataTableProps {
    onViewApplication?: (application: EnhancedApplication) => void;
    onEditApplication?: (application: EnhancedApplication) => void;
    onScheduleInterview?: (application: EnhancedApplication) => void;
    onScheduleExam?: (application: EnhancedApplication) => void;
    onUpdateStatus?: (application: EnhancedApplication, newStatus: string) => void;
}

const EnhancedApplicationsDataTable: React.FC<EnhancedApplicationsDataTableProps> = ({
    onViewApplication,
    onEditApplication,
    onScheduleInterview,
    onScheduleExam,
    onUpdateStatus
}) => {
    const [applications, setApplications] = useState<EnhancedApplication[]>([]);
    const [filteredApplications, setFilteredApplications] = useState<EnhancedApplication[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
    const [selectedApplication, setSelectedApplication] = useState<EnhancedApplication | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
        total: 0,
        pageSizeOptions: [5, 10, 25, 50, 100],
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: true
    });
    const { addNotification } = useNotifications();

    // Configuración de campos para filtros avanzados
    const filterFields: FilterField[] = [
        {
            key: 'studentFullName',
            label: 'Nombre del estudiante',
            type: 'text',
            placeholder: 'Buscar por nombre...'
        },
        {
            key: 'studentRut',
            label: 'RUT del estudiante',
            type: 'text',
            placeholder: 'Ej: 12345678-9'
        },
        {
            key: 'studentAge',
            label: 'Edad del estudiante',
            type: 'number',
            placeholder: 'Edad en años'
        },
        {
            key: 'gradeApplied',
            label: 'Curso postulado',
            type: 'select',
            options: [
                { label: 'Prekinder', value: 'PREKINDER' },
                { label: 'Kinder', value: 'KINDER' },
                { label: '1° Básico', value: '1_BASICO' },
                { label: '2° Básico', value: '2_BASICO' },
                { label: '3° Básico', value: '3_BASICO' },
                { label: '4° Básico', value: '4_BASICO' },
                { label: '5° Básico', value: '5_BASICO' },
                { label: '6° Básico', value: '6_BASICO' },
                { label: '7° Básico', value: '7_BASICO' },
                { label: '8° Básico', value: '8_BASICO' },
                { label: '1° Medio', value: '1_MEDIO' },
                { label: '2° Medio', value: '2_MEDIO' },
                { label: '3° Medio', value: '3_MEDIO' },
                { label: '4° Medio', value: '4_MEDIO' }
            ]
        },
        {
            key: 'schoolApplied',
            label: 'Colegio postulado',
            type: 'multiselect',
            options: [
                { label: 'Monte Tabor', value: 'MONTE_TABOR' },
                { label: 'Nazaret', value: 'NAZARET' }
            ]
        },
        {
            key: 'status',
            label: 'Estado de la postulación',
            type: 'multiselect',
            options: [
                { label: 'Pendiente', value: 'PENDING' },
                { label: 'En Revisión', value: 'UNDER_REVIEW' },
                { label: 'Documentos Solicitados', value: 'DOCUMENTS_REQUESTED' },
                { label: 'Entrevista Programada', value: 'INTERVIEW_SCHEDULED' },
                { label: 'Examen Programado', value: 'EXAM_SCHEDULED' },
                { label: 'Aprobada', value: 'APPROVED' },
                { label: 'Rechazada', value: 'REJECTED' },
                { label: 'Lista de Espera', value: 'WAITLIST' }
            ]
        },
        {
            key: 'priority',
            label: 'Prioridad',
            type: 'select',
            options: [
                { label: 'Normal', value: 'NORMAL' },
                { label: 'Alta', value: 'HIGH' },
                { label: 'Urgente', value: 'URGENT' }
            ]
        },
        {
            key: 'parentName',
            label: 'Nombre del apoderado',
            type: 'text',
            placeholder: 'Buscar por apoderado...'
        },
        {
            key: 'parentEmail',
            label: 'Email del apoderado',
            type: 'text',
            placeholder: 'ejemplo@email.com'
        },
        {
            key: 'currentSchool',
            label: 'Colegio actual',
            type: 'text',
            placeholder: 'Nombre del colegio actual'
        },
        {
            key: 'documentsComplete',
            label: 'Documentos completos',
            type: 'boolean'
        },
        {
            key: 'hasSpecialNeeds',
            label: 'Necesidades especiales',
            type: 'boolean'
        },
        {
            key: 'evaluationStatus',
            label: 'Estado de evaluación',
            type: 'select',
            options: [
                { label: 'Completada', value: 'COMPLETED' },
                { label: 'En Proceso', value: 'IN_PROGRESS' },
                { label: 'Pendiente', value: 'PENDING' }
            ]
        },
        {
            key: 'evaluationScore',
            label: 'Puntaje de evaluación',
            type: 'number',
            placeholder: 'Puntaje 0-100'
        },
        {
            key: 'submissionDate',
            label: 'Fecha de postulación',
            type: 'daterange'
        },
        {
            key: 'interviewDate',
            label: 'Fecha de entrevista',
            type: 'daterange'
        },
        {
            key: 'academicYear',
            label: 'Año académico',
            type: 'select',
            options: [
                { label: '2024', value: '2024' },
                { label: '2025', value: '2025' },
                { label: '2026', value: '2026' }
            ]
        }
    ];

    // Configuración de columnas de la tabla con filtros avanzados
    const columns: TableColumn<EnhancedApplication>[] = [
        {
            key: 'student',
            title: 'Estudiante',
            dataIndex: 'studentFullName',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 220,
            render: (_, record) => (
                <div 
                    className="flex flex-col cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                    onClick={() => handleViewApplicationDetail(record)}
                >
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 hover:text-blue-600">{record.studentFullName}</span>
                        {record.hasSpecialNeeds && (
                            <FiAlertCircle className="w-4 h-4 text-orange-500" title="Necesidades especiales" />
                        )}
                    </div>
                    <span className="text-sm text-gray-500">{record.studentRut}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                        <FiClock className="w-3 h-3" />
                        <span>{record.studentAge} años</span>
                    </div>
                </div>
            )
        },
        {
            key: 'gradeApplied',
            title: 'Curso/Grado',
            dataIndex: 'gradeApplied',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 120,
            render: (value) => (
                <Badge variant="blue" size="sm">
                    {value}
                </Badge>
            )
        },
        {
            key: 'schoolApplied',
            title: 'Colegio',
            dataIndex: 'schoolApplied',
            sortable: true,
            filterable: true,
            filterType: 'select',
            filterOptions: [
                { label: 'Monte Tabor', value: 'MONTE_TABOR' },
                { label: 'Nazaret', value: 'NAZARET' }
            ],
            width: 120,
            render: (value) => (
                <Badge variant={value === 'MONTE_TABOR' ? 'green' : 'purple'} size="sm">
                    {value === 'MONTE_TABOR' ? 'Monte Tabor' : 'Nazaret'}
                </Badge>
            )
        },
        {
            key: 'currentSchool',
            title: 'Colegio Actual',
            dataIndex: 'currentSchool',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 180,
            render: (value) => value || 'Sin especificar'
        },
        {
            key: 'status',
            title: 'Estado',
            dataIndex: 'status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 150,
            render: (_, record) => {
                const statusConfig = {
                    'PENDING': { color: 'gray', label: 'Pendiente' },
                    'UNDER_REVIEW': { color: 'blue', label: 'En Revisión' },
                    'DOCUMENTS_REQUESTED': { color: 'yellow', label: 'Documentos Solicitados' },
                    'INTERVIEW_SCHEDULED': { color: 'purple', label: 'Entrevista Programada' },
                    'EXAM_SCHEDULED': { color: 'indigo', label: 'Examen Programado' },
                    'APPROVED': { color: 'green', label: 'Aprobada' },
                    'REJECTED': { color: 'red', label: 'Rechazada' },
                    'WAITLIST': { color: 'orange', label: 'Lista de Espera' }
                };
                const config = statusConfig[record.status] || { color: 'gray', label: record.status };
                
                return (
                    <div className="flex flex-col gap-1">
                        <Badge variant={config.color as any} size="sm">
                            {config.label}
                        </Badge>
                        {record.priority !== 'NORMAL' && (
                            <Badge variant={record.priority === 'URGENT' ? 'red' : 'yellow'} size="sm">
                                {record.priority === 'URGENT' ? 'Urgente' : 'Alta'}
                            </Badge>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'parent',
            title: 'Contacto Principal',
            dataIndex: 'parentName',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 200,
            render: (_, record) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                        <FiUser className="w-3 h-3 text-gray-400" />
                        <span className="font-medium text-gray-900">{record.parentName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <FiMail className="w-3 h-3" />
                        <span>{record.parentEmail}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <FiPhone className="w-3 h-3" />
                        <span>{record.parentPhone}</span>
                    </div>
                </div>
            )
        },
        {
            key: 'evaluationStatus',
            title: 'Evaluaciones',
            dataIndex: 'evaluationStatus',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 150,
            render: (_, record) => (
                <div className="flex flex-col gap-1">
                    <Badge 
                        variant={
                            record.evaluationStatus === 'COMPLETED' ? 'green' :
                            record.evaluationStatus === 'IN_PROGRESS' ? 'blue' :
                            record.evaluationStatus === 'PENDING' ? 'gray' : 'red'
                        } 
                        size="sm"
                    >
                        {record.evaluationStatus === 'COMPLETED' ? 'Completada' :
                         record.evaluationStatus === 'IN_PROGRESS' ? 'En Proceso' :
                         record.evaluationStatus === 'PENDING' ? 'Pendiente' : 'Sin Estado'}
                    </Badge>
                    {record.evaluationScore && (
                        <span className="text-xs text-gray-500">
                            Puntaje: {record.evaluationScore}%
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'documentsComplete',
            title: 'Documentos',
            dataIndex: 'documentsComplete',
            sortable: true,
            filterable: true,
            filterType: 'boolean',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <div className="flex flex-col items-center gap-1">
                    <Badge 
                        variant={record.documentsComplete ? 'green' : 'red'} 
                        size="sm"
                    >
                        {record.documentsComplete ? 'Completos' : 'Incompletos'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                        {record.documentsCount} docs
                    </span>
                </div>
            )
        },
        {
            key: 'interviewDate',
            title: 'Entrevista',
            dataIndex: 'interviewDate',
            sortable: true,
            filterable: true,
            filterType: 'date',
            width: 140,
            render: (_, record) => {
                if (!record.interviewDate) return '-';
                
                return (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                            <FiCalendar className="w-3 h-3 text-blue-500" />
                            <span>{new Date(record.interviewDate).toLocaleDateString('es-ES')}</span>
                        </div>
                        {record.interviewStatus && (
                            <Badge 
                                variant={
                                    record.interviewStatus === 'COMPLETED' ? 'green' :
                                    record.interviewStatus === 'SCHEDULED' ? 'blue' : 'yellow'
                                } 
                                size="sm"
                            >
                                {record.interviewStatus === 'COMPLETED' ? 'Realizada' :
                                 record.interviewStatus === 'SCHEDULED' ? 'Programada' : 'Pendiente'}
                            </Badge>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'submissionDate',
            title: 'Fecha Postulación',
            dataIndex: 'submissionDate',
            sortable: true,
            filterable: true,
            filterType: 'date',
            width: 130,
            render: (value) => new Date(value).toLocaleDateString('es-ES')
        },
        {
            key: 'actions',
            title: 'Acciones',
            dataIndex: 'id',
            width: 180,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewApplicationDetail(record)}
                        className="p-1 h-8 w-8"
                        title="Ver detalles completos"
                    >
                        <FiEye size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditApplication?.(record)}
                        className="p-1 h-8 w-8 text-blue-600 hover:text-blue-700"
                        title="Editar postulación"
                    >
                        <FiEdit size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onScheduleInterview?.(record)}
                        className="p-1 h-8 w-8 text-green-600 hover:text-green-700"
                        title="Programar entrevista"
                    >
                        <FiCalendar size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onScheduleExam?.(record)}
                        className="p-1 h-8 w-8 text-purple-600 hover:text-purple-700"
                        title="Programar examen"
                    >
                        <FiBookOpen size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocuments(record)}
                        className="p-1 h-8 w-8 text-indigo-600 hover:text-indigo-700"
                        title="Descargar documentos"
                    >
                        <FiDownload size={14} />
                    </Button>
                </div>
            )
        }
    ];

    // Función para aplicar filtros
    const applyFilters = useCallback((filters: FilterCondition[]) => {
        if (!applications || applications.length === 0) {
            setFilteredApplications([]);
            return;
        }

        if (!filters || filters.length === 0) {
            setFilteredApplications(applications);
            return;
        }

        const filtered = applications.filter(application => {
            return filters.every(filter => {
                const value = application[filter.field as keyof EnhancedApplication];
                
                if (value === null || value === undefined) {
                    return filter.operator === 'not_equals' || filter.operator === 'not_contains' || filter.operator === 'not_in';
                }

                const valueStr = String(value).toLowerCase();
                const filterValueStr = String(filter.value).toLowerCase();

                switch (filter.operator) {
                    case 'equals':
                        return valueStr === filterValueStr;
                    case 'not_equals':
                        return valueStr !== filterValueStr;
                    case 'contains':
                        return valueStr.includes(filterValueStr);
                    case 'not_contains':
                        return !valueStr.includes(filterValueStr);
                    case 'starts_with':
                        return valueStr.startsWith(filterValueStr);
                    case 'ends_with':
                        return valueStr.endsWith(filterValueStr);
                    case 'greater_than':
                        return Number(value) > Number(filter.value);
                    case 'less_than':
                        return Number(value) < Number(filter.value);
                    case 'between':
                        if (Array.isArray(filter.value) && filter.value.length === 2) {
                            return Number(value) >= Number(filter.value[0]) && Number(value) <= Number(filter.value[1]);
                        }
                        return false;
                    case 'in':
                        if (Array.isArray(filter.value)) {
                            return filter.value.some(v => String(v).toLowerCase() === valueStr);
                        }
                        return false;
                    case 'not_in':
                        if (Array.isArray(filter.value)) {
                            return !filter.value.some(v => String(v).toLowerCase() === valueStr);
                        }
                        return true;
                    case 'date_before':
                        return new Date(String(value)) < new Date(String(filter.value));
                    case 'date_after':
                        return new Date(String(value)) > new Date(String(filter.value));
                    case 'date_between':
                        if (typeof filter.value === 'object' && filter.value.start && filter.value.end) {
                            const date = new Date(String(value));
                            return date >= new Date(filter.value.start) && date <= new Date(filter.value.end);
                        }
                        return false;
                    default:
                        return true;
                }
            });
        });

        setFilteredApplications(filtered);
        // Reset pagination to first page when filters change
        setPagination(prev => ({ 
            ...prev, 
            current: 1, 
            total: filtered.length,
            pageSizeOptions: prev.pageSizeOptions,
            showSizeChanger: prev.showSizeChanger,
            showQuickJumper: prev.showQuickJumper,
            showTotal: prev.showTotal
        }));
    }, [applications]);

    // Manejar cambios en filtros
    const handleFiltersChange = useCallback((filters: FilterCondition[]) => {
        setActiveFilters(filters);
        applyFilters(filters);
    }, [applyFilters]);

    // Aplicar filtros cuando cambien las aplicaciones
    useEffect(() => {
        applyFilters(activeFilters);
    }, [applications, activeFilters, applyFilters]);

    // Obtener datos para la tabla (con filtros aplicados)
    const tableData = useMemo(() => {
        const data = activeFilters.length > 0 ? filteredApplications : applications;
        const startIndex = (pagination.current - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        return data.slice(startIndex, endIndex);
    }, [filteredApplications, applications, activeFilters, pagination.current, pagination.pageSize]);

    // Función para calcular edad
    const calculateAge = (birthDate: string): number => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    };

    // Función para transformar Application del backend a EnhancedApplication
    const transformApplicationToEnhanced = (app: Application): EnhancedApplication => {
        const studentFullName = `${app.student.firstName} ${app.student.paternalLastName || app.student.lastName} ${app.student.maternalLastName || ''}`.trim();
        const studentAge = calculateAge(app.student.birthDate);

        return {
            id: app.id,
            // Datos del estudiante
            studentFirstName: app.student.firstName,
            studentLastName: app.student.paternalLastName || app.student.lastName,
            studentFullName,
            studentRut: app.student.rut,
            studentBirthDate: app.student.birthDate,
            studentAge,
            studentEmail: app.student.email,
            studentAddress: app.student.address,
            gradeApplied: app.student.gradeApplied,
            schoolApplied: app.student.gradeApplied?.includes('Kinder') || app.student.gradeApplied?.includes('Prekinder') ? 'MONTE_TABOR' : 'NAZARET', // Lógica por defecto
            currentSchool: app.student.currentSchool,
            hasSpecialNeeds: app.student.additionalNotes?.toLowerCase().includes('especial') || false,
            specialNeedsDescription: app.student.additionalNotes?.toLowerCase().includes('especial') ? app.student.additionalNotes : undefined,
            
            // Estado de la postulación
            status: app.status as 'PENDING' | 'UNDER_REVIEW' | 'DOCUMENTS_REQUESTED' | 'INTERVIEW_SCHEDULED' | 'EXAM_SCHEDULED' | 'APPROVED' | 'REJECTED' | 'WAITLIST',
            submissionDate: app.submissionDate,
            lastUpdated: app.submissionDate, // Por ahora usar la misma fecha
            
            // Información de contacto principal (usar apoderado como principal)
            parentName: app.guardian?.fullName || 'Sin especificar',
            parentEmail: app.guardian?.email || 'Sin especificar',
            parentPhone: app.guardian?.phone || 'Sin especificar',
            parentRelationship: app.guardian?.relationship || 'Sin especificar',
            
            // Datos del padre
            fatherName: app.father?.fullName || 'Sin especificar',
            fatherEmail: app.father?.email || 'Sin especificar',
            fatherPhone: app.father?.phone || 'Sin especificar',
            fatherProfession: app.father?.profession || 'Sin especificar',
            
            // Datos de la madre
            motherName: app.mother?.fullName || 'Sin especificar',
            motherEmail: app.mother?.email || 'Sin especificar',
            motherPhone: app.mother?.phone || 'Sin especificar',
            motherProfession: app.mother?.profession || 'Sin especificar',
            
            // Documentos y evaluaciones (valores por defecto, mejorar cuando estén disponibles)
            documentsComplete: app.documents ? app.documents.length > 0 : false,
            documentsCount: app.documents ? app.documents.length : 0,
            evaluationScore: undefined,
            evaluationStatus: 'PENDING',
            psychologicalEvaluation: undefined,
            academicEvaluation: undefined,
            
            // Entrevistas (por implementar)
            interviewDate: undefined,
            interviewStatus: undefined,
            interviewNotes: undefined,
            
            // Información adicional
            academicYear: '2025',
            priority: 'NORMAL',
            tags: [],
            internalNotes: app.student.additionalNotes,
            
            // Metadatos
            createdAt: app.submissionDate,
            createdBy: app.applicantUser.email,
            lastModifiedBy: undefined
        };
    };

    // Cargar postulaciones con datos reales del backend
    const loadApplications = async (page = 1, size = 5, preserveFilters = false) => {
        setLoading(true);
        try {
            console.log('EnhancedApplications: Cargando postulaciones...');
            
            // Usar directamente el endpoint público que sabemos que funciona
            const response = await api.get('/v1/applications/public/all');
            const backendApplications = response.data || [];
            console.log('Applications del backend:', backendApplications.length);
            
            if (backendApplications.length === 0) {
                console.warn('No se encontraron applications en el backend');
                setApplications([]);
                setPagination({ current: 1, pageSize: size, total: 0 });
                return;
            }
            
            // Transformar a formato EnhancedApplication con manejo de errores robusto
            const enhancedApplications = backendApplications.map((app: any, index: number) => {
                try {
                    return transformApplicationToEnhanced(app);
                } catch (transformError) {
                    console.error(`Error transformando application ${index}:`, transformError);
                    // Retornar objeto básico en caso de error
                    return {
                        id: app.id || index,
                        studentFirstName: app.student?.firstName || 'Desconocido',
                        studentLastName: app.student?.paternalLastName || app.student?.lastName || '',
                        studentFullName: `${app.student?.firstName || 'Desconocido'} ${app.student?.paternalLastName || app.student?.lastName || ''} ${app.student?.maternalLastName || ''}`.trim(),
                        studentRut: app.student?.rut || 'N/A',
                        studentBirthDate: app.student?.birthDate || '',
                        studentAge: 0,
                        studentAddress: app.student?.address || '',
                        gradeApplied: app.student?.gradeApplied || 'N/A',
                        schoolApplied: 'MONTE_TABOR',
                        hasSpecialNeeds: false,
                        status: app.status || 'PENDING',
                        submissionDate: app.submissionDate || app.createdAt || '',
                        lastUpdated: app.updatedAt || app.createdAt || '',
                        parentName: app.mother?.fullName || app.father?.fullName || 'N/A',
                        parentEmail: app.mother?.email || app.father?.email || 'N/A',
                        parentPhone: app.mother?.phone || app.father?.phone || 'N/A',
                        parentRelationship: 'Madre',
                        fatherName: app.father?.fullName,
                        fatherEmail: app.father?.email,
                        fatherPhone: app.father?.phone,
                        motherName: app.mother?.fullName,
                        motherEmail: app.mother?.email,
                        motherPhone: app.mother?.phone,
                        guardianName: app.guardian?.fullName,
                        guardianEmail: app.guardian?.email,
                        guardianPhone: app.guardian?.phone,
                        supporterName: app.supporter?.fullName,
                        supporterEmail: app.supporter?.email,
                        supporterPhone: app.supporter?.phone,
                        evaluationScore: 0,
                        interviewDate: null,
                        examDate: null,
                        documentsComplete: false,
                        notes: '',
                        priority: 1,
                        socialScore: 0,
                        academicScore: 0,
                        psychologicalScore: 0,
                        finalScore: 0
                    };
                }
            });
            
            console.log('Applications transformadas:', enhancedApplications.length);
            
            // Set all applications (filtering will be handled separately)
            setApplications(enhancedApplications);
            
            // Update pagination
            const currentData = preserveFilters && activeFilters.length > 0 ? filteredApplications : enhancedApplications;
            setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: size,
                total: currentData.length
            }));
            
            console.log('EnhancedApplications cargadas exitosamente');
            
        } catch (error: any) {
            console.error('Error cargando postulaciones avanzadas:', error);
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudieron cargar las postulaciones desde el servidor'
            });
            
            // Fallback: mostrar array vacío en lugar de mock data
            setApplications([]);
            setFilteredApplications([]);
            setPagination(prev => ({
                ...prev,
                current: 1,
                pageSize: size,
                total: 0
            }));
        } finally {
            setLoading(false);
        }
    };

    // Manejar paginación
    const handlePageChange = (page: number, pageSize: number) => {
        setPagination(prev => ({ ...prev, current: page, pageSize }));
    };

    // Limpiar filtros
    const handleClearFilters = () => {
        setActiveFilters([]);
        setFilteredApplications(applications);
        setPagination(prev => ({ 
            ...prev, 
            current: 1, 
            total: applications.length,
            pageSizeOptions: prev.pageSizeOptions,
            showSizeChanger: prev.showSizeChanger,
            showQuickJumper: prev.showQuickJumper,
            showTotal: prev.showTotal
        }));
    };

    // Abrir modal de detalles de la aplicación
    const handleViewApplicationDetail = (application: EnhancedApplication) => {
        // Convertir EnhancedApplication a formato Postulante para el modal
        const postulante = convertToPostulante(application);
        setSelectedApplication(application);
        setIsDetailModalOpen(true);
        // Llamar al callback original si existe
        onViewApplication?.(application);
    };

    // Cerrar modal de detalles
    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedApplication(null);
    };

    // Convertir EnhancedApplication a formato Postulante
    const convertToPostulante = (app: EnhancedApplication) => {
        // studentLastName already contains only paternalLastName (not combined)
        return {
            id: app.id,
            nombreCompleto: app.studentFullName,
            nombres: app.studentFirstName,
            apellidoPaterno: app.studentLastName,  // This is now paternalLastName only
            apellidoMaterno: '',  // maternalLastName will be added when available from backend
            rut: app.studentRut,
            fechaNacimiento: app.studentBirthDate,
            edad: app.studentAge,
            esHijoFuncionario: false,
            esHijoExalumno: false,
            esAlumnoInclusion: app.hasSpecialNeeds,
            tipoInclusion: app.specialNeedsDescription,
            email: app.studentEmail,
            direccion: app.studentAddress,
            cursoPostulado: app.gradeApplied,
            colegioActual: app.currentSchool,
            colegioDestino: app.schoolApplied === 'MONTE_TABOR' ? 'MONTE_TABOR' : 'NAZARET',
            añoAcademico: '2025',
            estadoPostulacion: app.status,
            fechaPostulacion: app.submissionDate,
            fechaActualizacion: app.lastUpdated,
            nombreContactoPrincipal: app.parentName,
            emailContacto: app.parentEmail,
            telefonoContacto: app.parentPhone,
            relacionContacto: app.parentRelationship,
            nombrePadre: app.fatherName,
            emailPadre: app.fatherEmail,
            telefonoPadre: app.fatherPhone,
            profesionPadre: app.fatherProfession,
            nombreMadre: app.motherName,
            emailMadre: app.motherEmail,
            telefonoMadre: app.motherPhone,
            profesionMadre: app.motherProfession,
            documentosCompletos: app.documentsComplete,
            cantidadDocumentos: app.documentsCount,
            evaluacionPendiente: app.evaluationPending,
            entrevistaProgramada: app.interviewScheduled,
            fechaEntrevista: app.interviewDate,
            necesidadesEspeciales: app.hasSpecialNeeds,
            observaciones: app.specialNeedsDescription,
            creadoPor: app.applicantEmail,
            fechaCreacion: app.submissionDate
        };
    };

    // Descargar documentos
    const handleDownloadDocuments = (application: EnhancedApplication) => {
        addNotification({
            type: 'info',
            title: 'Descarga iniciada',
            message: `Descargando documentos de ${application.studentFullName}`
        });
    };

    // Exportar datos avanzados
    const handleExport = () => {
        const csvData = applications.map(app => ({
            'ID': app.id,
            'Estudiante': app.studentFullName,
            'RUT Estudiante': app.studentRut,
            'Edad': app.studentAge,
            'Fecha Nacimiento': app.studentBirthDate,
            'Dirección': app.studentAddress,
            'Curso Postulado': app.gradeApplied,
            'Colegio Destino': app.schoolApplied === 'MONTE_TABOR' ? 'Monte Tabor' : 'Nazaret',
            'Colegio Actual': app.currentSchool || '',
            'Necesidades Especiales': app.hasSpecialNeeds ? 'Sí' : 'No',
            'Descripción NEE': app.specialNeedsDescription || '',
            'Estado': app.status,
            'Prioridad': app.priority,
            'Contacto Principal': app.parentName,
            'Email Contacto': app.parentEmail,
            'Teléfono Contacto': app.parentPhone,
            'Relación': app.parentRelationship,
            'Padre': app.fatherName || '',
            'Email Padre': app.fatherEmail || '',
            'Profesión Padre': app.fatherProfession || '',
            'Madre': app.motherName || '',
            'Email Madre': app.motherEmail || '',
            'Profesión Madre': app.motherProfession || '',
            'Documentos Completos': app.documentsComplete ? 'Sí' : 'No',
            'Cantidad Documentos': app.documentsCount,
            'Estado Evaluación': app.evaluationStatus,
            'Puntaje Evaluación': app.evaluationScore || '',
            'Evaluación Psicológica': app.psychologicalEvaluation || '',
            'Evaluación Académica': app.academicEvaluation || '',
            'Fecha Entrevista': app.interviewDate ? new Date(app.interviewDate).toLocaleDateString('es-ES') : '',
            'Estado Entrevista': app.interviewStatus || '',
            'Año Académico': app.academicYear,
            'Etiquetas': app.tags.join(', '),
            'Notas Internas': app.internalNotes || '',
            'Fecha Postulación': new Date(app.submissionDate).toLocaleDateString('es-ES'),
            'Última Actualización': new Date(app.lastUpdated).toLocaleDateString('es-ES'),
            'Creado Por': app.createdBy,
            'Modificado Por': app.lastModifiedBy || ''
        }));

        // Convertir a CSV
        const headers = Object.keys(csvData[0] || {});
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => 
                headers.map(header => 
                    `"${String(row[header as keyof typeof row] || '').replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');

        // Descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `postulaciones_completas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addNotification({
            type: 'success',
            title: 'Exportación exitosa',
            message: 'Los datos se han exportado correctamente a CSV'
        });
    };

    // Cargar datos al montar el componente
    useEffect(() => {
        loadApplications();
    }, []);

    return (
        <div className="space-y-6">
            {/* Advanced Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">Filtros Avanzados</h3>
                        {activeFilters.length > 0 && (
                            <Badge variant="blue" size="sm">
                                {activeFilters.length} filtro{activeFilters.length !== 1 ? 's' : ''} activo{activeFilters.length !== 1 ? 's' : ''}
                            </Badge>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {activeFilters.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearFilters}
                                className="text-red-600 hover:text-red-700"
                            >
                                Limpiar filtros
                            </Button>
                        )}
                        <Button
                            variant={showAdvancedFilters ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className="flex items-center gap-2"
                        >
                            <FiFilter size={16} />
                            {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} filtros
                        </Button>
                    </div>
                </div>
                
                {showAdvancedFilters && (
                    <AdvancedFilters
                        fields={filterFields}
                        filters={activeFilters}
                        onFiltersChange={handleFiltersChange}
                        onChange={handleFiltersChange}
                        onClear={handleClearFilters}
                    />
                )}
            </div>

            {/* Results Summary */}
            {activeFilters.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800">
                        <FiInfo size={16} />
                        <span className="font-medium">
                            Mostrando {filteredApplications.length} de {applications.length} postulaciones
                            {filteredApplications.length !== applications.length && 
                                ` (${applications.length - filteredApplications.length} filtradas)`
                            }
                        </span>
                    </div>
                    {filteredApplications.length === 0 && activeFilters.length > 0 && (
                        <p className="text-blue-700 mt-1 text-sm">
                            No se encontraron postulaciones que coincidan con los filtros aplicados.
                        </p>
                    )}
                </div>
            )}

            {/* Debug panel temporal */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">🧪 Debug Info</h3>
                <div className="text-sm text-yellow-700">
                    <div>Total applications: {applications.length}</div>
                    <div>Filtered applications: {filteredApplications.length}</div>
                    <div>Active filters: {activeFilters.length}</div>
                    <div>Loading: {loading ? 'true' : 'false'}</div>
                    <div>Pagination total: {pagination.total}</div>
                    <button 
                        onClick={() => loadApplications(pagination.current, pagination.pageSize, true)}
                        className="mt-2 bg-yellow-500 text-white px-3 py-1 rounded text-xs mr-2"
                    >
                        Reload Data
                    </button>
                    <button 
                        onClick={() => console.log('Active Filters:', activeFilters)}
                        className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-xs"
                    >
                        Log Filters
                    </button>
                </div>
            </div>
            
            <DataTable
                title={`Gestión Avanzada de Postulaciones ${activeFilters.length > 0 ? '(Filtrada)' : ''}`}
                columns={columns}
                data={tableData}
                loading={loading}
                pagination={{
                    ...pagination,
                    total: activeFilters.length > 0 ? filteredApplications.length : applications.length,
                    onChange: handlePageChange
                }}
                onRefresh={() => loadApplications(pagination.current, pagination.pageSize, true)}
                onExport={handleExport}
                rowKey="id"
                className="shadow-sm"
            />

            {/* Modal de detalles del estudiante */}
            {selectedApplication && (
                <StudentDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    postulante={convertToPostulante(selectedApplication)}
                    onEdit={(postulante) => {
                        handleCloseDetailModal();
                        onEditApplication?.(selectedApplication);
                    }}
                    onScheduleInterview={(postulante) => {
                        handleCloseDetailModal();
                        onScheduleInterview?.(selectedApplication);
                    }}
                    onUpdateStatus={(postulante, status) => {
                        handleCloseDetailModal();
                        onUpdateStatus?.(selectedApplication, status as any);
                    }}
                />
            )}
        </div>
    );
};

export default EnhancedApplicationsDataTable;