import React, { useState, useEffect } from 'react';
import DataTable, { TableColumn } from '../ui/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { FiEdit, FiEye, FiDownload, FiCalendar, FiFileText, FiUser } from 'react-icons/fi';
import { useNotifications } from '../../context/AppContext';
import { applicationService } from '../../services/applicationService';
import {
    buildGradeDisplay,
    buildGuardianContact,
    buildStudentDisplayName,
    mapBffApplicationStatusToTable
} from '../../services/applicationTableMapper';

interface Application {
    id: number;
    studentName: string;
    studentRut: string;
    studentBirthDate: string;
    gradeApplied: string;
    status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'INTERVIEW_SCHEDULED' | 'ACCEPTED' | 'REJECTED' | 'WAITLIST';
    submissionDate: string;
    parentName: string;
    parentEmail: string;
    parentPhone: string;
    previousSchool?: string;
    hasSpecialNeeds: boolean;
    specialNeedsDescription?: string;
    academicYear: string;
    evaluationStatus: string;
    interviewDate?: string;
    documentsComplete: boolean;
    admissionScore?: number;
    createdAt: string;
    updatedAt?: string;
}

interface ApplicationsDataTableProps {
    onViewApplication?: (application: Application) => void;
    onEditApplication?: (application: Application) => void;
    onScheduleInterview?: (application: Application) => void;
}

const ApplicationsDataTable: React.FC<ApplicationsDataTableProps> = ({
    onViewApplication,
    onEditApplication,
    onScheduleInterview
}) => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
        total: 0
    });
    const { addNotification } = useNotifications();

    // Configuración de columnas de la tabla
    const columns: TableColumn<Application>[] = [
        {
            key: 'student',
            title: 'Estudiante',
            dataIndex: 'studentName',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 200,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{record.studentName}</span>
                    <span className="text-sm text-gray-500">{record.studentRut}</span>
                    <span className="text-xs text-gray-400">
                        Edad: {(() => {
                            const a = calculateAge(record.studentBirthDate);
                            return typeof a === 'number' ? `${a} años` : a;
                        })()}
                    </span>
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
            key: 'status',
            title: 'Estado',
            dataIndex: 'status',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 140,
            render: (_, record) => {
                const statusConfig = {
                    'DRAFT': { color: 'gray', label: 'Borrador' },
                    'SUBMITTED': { color: 'blue', label: 'Enviada' },
                    'UNDER_REVIEW': { color: 'yellow', label: 'En Revisión' },
                    'INTERVIEW_SCHEDULED': { color: 'purple', label: 'Entrevista Programada' },
                    'ACCEPTED': { color: 'green', label: 'Aceptada' },
                    'REJECTED': { color: 'red', label: 'Rechazada' },
                    'WAITLIST': { color: 'orange', label: 'Lista de Espera' }
                };
                const config = statusConfig[record.status] || { color: 'gray', label: record.status };
                
                return (
                    <Badge variant={config.color as any} size="sm">
                        {config.label}
                    </Badge>
                );
            }
        },
        {
            key: 'parent',
            title: 'Apoderado',
            dataIndex: 'parentName',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 180,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{record.parentName}</span>
                    <span className="text-sm text-gray-500">{record.parentEmail}</span>
                    <span className="text-xs text-gray-400">{record.parentPhone}</span>
                </div>
            )
        },
        {
            key: 'previousSchool',
            title: 'Colegio Anterior',
            dataIndex: 'previousSchool',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 150,
            render: (value) => value || 'N/A'
        },
        {
            key: 'documentsComplete',
            title: 'Documentos',
            dataIndex: 'documentsComplete',
            sortable: true,
            filterable: true,
            filterType: 'boolean',
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Badge 
                    variant={record.documentsComplete ? 'green' : 'red'} 
                    size="sm"
                >
                    {record.documentsComplete ? 'Completos' : 'Incompletos'}
                </Badge>
            )
        },
        {
            key: 'hasSpecialNeeds',
            title: 'Necesidades Especiales',
            dataIndex: 'hasSpecialNeeds',
            sortable: true,
            filterable: true,
            filterType: 'boolean',
            width: 140,
            align: 'center',
            render: (_, record) => (
                <div className="flex flex-col items-center">
                    <Badge 
                        variant={record.hasSpecialNeeds ? 'orange' : 'gray'} 
                        size="sm"
                    >
                        {record.hasSpecialNeeds ? 'Sí' : 'No'}
                    </Badge>
                    {record.hasSpecialNeeds && record.specialNeedsDescription && (
                        <span className="text-xs text-gray-500 mt-1 max-w-[120px] truncate" title={record.specialNeedsDescription}>
                            {record.specialNeedsDescription}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'evaluationStatus',
            title: 'Estado Evaluación',
            dataIndex: 'evaluationStatus',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 130,
            render: (value) => {
                const statusConfig = {
                    'PENDING': { color: 'gray', label: 'Pendiente' },
                    'IN_PROGRESS': { color: 'blue', label: 'En Proceso' },
                    'COMPLETED': { color: 'green', label: 'Completada' },
                    'CANCELLED': { color: 'red', label: 'Cancelada' }
                };
                const config = statusConfig[value as keyof typeof statusConfig] || { color: 'gray', label: value };
                
                return (
                    <Badge variant={config.color as any} size="sm">
                        {config.label}
                    </Badge>
                );
            }
        },
        {
            key: 'admissionScore',
            title: 'Puntaje',
            dataIndex: 'admissionScore',
            sortable: true,
            filterable: true,
            filterType: 'number',
            width: 100,
            align: 'center',
            render: (value) => value ? `${value}%` : '-'
        },
        {
            key: 'submissionDate',
            title: 'Fecha Envío',
            dataIndex: 'submissionDate',
            sortable: true,
            filterable: true,
            filterType: 'date',
            width: 120,
            render: (value) => value ? new Date(value).toLocaleDateString('es-ES') : '-'
        },
        {
            key: 'interviewDate',
            title: 'Fecha Entrevista',
            dataIndex: 'interviewDate',
            sortable: true,
            filterable: true,
            filterType: 'date',
            width: 130,
            render: (value) => value ? new Date(value).toLocaleDateString('es-ES') : '-'
        },
        {
            key: 'actions',
            title: 'Acciones',
            dataIndex: 'id',
            width: 150,
            align: 'center',
            render: (_, record) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewApplication?.(record)}
                        className="p-1 h-8 w-8"
                        title="Ver detalles"
                    >
                        <FiEye size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditApplication?.(record)}
                        className="p-1 h-8 w-8 text-blue-600 hover:text-blue-700"
                        title="Editar aplicación"
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
                        onClick={() => handleDownloadDocuments(record)}
                        className="p-1 h-8 w-8 text-purple-600 hover:text-purple-700"
                        title="Descargar documentos"
                    >
                        <FiDownload size={14} />
                    </Button>
                </div>
            )
        }
    ];

    // Función auxiliar para calcular edad
    const calculateAge = (birthDate: string): number | string => {
        if (!birthDate) return '—';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    };

    // Cargar aplicaciones (simulado)
    const loadApplications = async (page = 1, size = 5) => {
        setLoading(true);
        try {
            // Obtener aplicaciones reales del backend
            const response = await applicationService.fetchApplicationsPage({
                page: page - 1,
                size
            });

            const mappedApplications: Application[] = response.applications.map((app: Record<string, any>) => {
                const student = (app.student || {}) as Record<string, unknown>;
                const contact = buildGuardianContact(app);
                return {
                    id: app.id,
                    studentName: buildStudentDisplayName(student),
                    studentRut: String(student.rut || '—'),
                    studentBirthDate: String(student.birthDate || ''),
                    gradeApplied: buildGradeDisplay(student),
                    status: mapBffApplicationStatusToTable(app.status),
                    submissionDate: app.submissionDate || app.createdAt || '',
                    parentName: contact.parentName,
                    parentEmail: contact.parentEmail,
                    parentPhone: contact.parentPhone,
                    previousSchool: String(student.currentSchool || 'No especificado'),
                    hasSpecialNeeds: Boolean(student.specialNeeds),
                    specialNeedsDescription: String(student.specialNeedsDescription || ''),
                    academicYear: new Date().getFullYear().toString(),
                    evaluationStatus: app.evaluationStatus || 'PENDING',
                    interviewDate: app.interviewDate,
                    documentsComplete: app.documentsComplete || false,
                    admissionScore: app.admissionScore,
                    createdAt: app.createdAt,
                    updatedAt: app.updatedAt
                };
            });

            setApplications(mappedApplications);
            setPagination({
                current: page,
                pageSize: size,
                total: response.totalElements
            });
        } catch (error: any) {
            console.error('Error cargando aplicaciones:', error);
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudieron cargar las aplicaciones'
            });
        } finally {
            setLoading(false);
        }
    };

    // Manejar paginación
    const handlePageChange = (page: number, pageSize: number) => {
        loadApplications(page, pageSize);
    };

    // Descargar documentos
    const handleDownloadDocuments = (application: Application) => {
        // Implementar descarga de documentos
        addNotification({
            type: 'info',
            title: 'Descarga iniciada',
            message: `Descargando documentos de ${application.studentName}`
        });
    };

    // Exportar datos
    const handleExport = () => {
        const csvData = applications.map(app => ({
            'Estudiante': app.studentName,
            'RUT Estudiante': app.studentRut,
            'Fecha Nacimiento': app.studentBirthDate,
            'Curso Postulado': app.gradeApplied,
            'Estado': app.status,
            'Apoderado': app.parentName,
            'Email Apoderado': app.parentEmail,
            'Teléfono Apoderado': app.parentPhone,
            'Colegio Anterior': app.previousSchool || '',
            'Necesidades Especiales': app.hasSpecialNeeds ? 'Sí' : 'No',
            'Descripción NEE': app.specialNeedsDescription || '',
            'Documentos Completos': app.documentsComplete ? 'Sí' : 'No',
            'Estado Evaluación': app.evaluationStatus,
            'Puntaje': app.admissionScore || '',
            'Fecha Envío': app.submissionDate ? new Date(app.submissionDate).toLocaleDateString('es-ES') : '',
            'Fecha Entrevista': app.interviewDate ? new Date(app.interviewDate).toLocaleDateString('es-ES') : ''
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
        link.setAttribute('download', `aplicaciones_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Cargar datos al montar el componente
    useEffect(() => {
        loadApplications();
    }, []);

    return (
        <div className="space-y-6">
            <DataTable
                title="Gestión de Postulaciones"
                columns={columns}
                data={applications}
                loading={loading}
                pagination={{
                    ...pagination,
                    onChange: handlePageChange
                }}
                onRefresh={() => loadApplications(pagination.current, pagination.pageSize)}
                onExport={handleExport}
                rowKey="id"
                className="shadow-sm"
            />
        </div>
    );
};

export default ApplicationsDataTable;