import React, { useState, useEffect } from 'react';
import DataTable, { TableColumn } from '../ui/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import StudentDetailModal from './StudentDetailModal';
import { FiEdit, FiEye, FiDownload, FiCalendar, FiFileText, FiUser, FiMapPin, FiPhone, FiMail, FiBookOpen, FiClock, FiCheckCircle, FiAlertCircle, FiInfo, FiHome, FiUsers } from 'react-icons/fi';
import { useNotifications } from '../../context/AppContext';
import { applicationService, Application } from '../../services/applicationService';

// Interface específica para postulantes
interface Postulante {
    id: number;
    // Datos básicos del estudiante
    nombreCompleto: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    rut: string;
    fechaNacimiento: string;
    edad: number;
    
    // Categorías especiales - campos clave para filtros
    esHijoFuncionario: boolean;
    nombrePadreFuncionario?: string;
    esHijoExalumno: boolean;
    anioEgresoExalumno?: number;
    esAlumnoInclusion: boolean;
    tipoInclusion?: string;
    notasInclusion?: string;
    
    email?: string;
    direccion: string;
    
    // Datos académicos
    cursoPostulado: string;
    colegioActual?: string;
    colegioDestino: 'MONTE_TABOR' | 'NAZARET';
    añoAcademico: string;
    
    // Estado de postulación
    estadoPostulacion: 'PENDING' | 'UNDER_REVIEW' | 'DOCUMENTS_REQUESTED' | 'INTERVIEW_SCHEDULED' | 'EXAM_SCHEDULED' | 'APPROVED' | 'REJECTED' | 'WAITLIST';
    fechaPostulacion: string;
    fechaActualizacion: string;
    
    // Contacto principal
    nombreContactoPrincipal: string;
    emailContacto: string;
    telefonoContacto: string;
    relacionContacto: string;
    
    // Datos de padres
    nombrePadre?: string;
    emailPadre?: string;
    telefonoPadre?: string;
    profesionPadre?: string;
    
    nombreMadre?: string;
    emailMadre?: string;
    telefonoMadre?: string;
    profesionMadre?: string;
    
    // Información académica y evaluaciones
    documentosCompletos: boolean;
    cantidadDocumentos: number;
    evaluacionPendiente: boolean;
    entrevistaProgramada: boolean;
    fechaEntrevista?: string;
    
    // Observaciones
    necesidadesEspeciales: boolean;
    observaciones?: string;
    notasInternas?: string;
    
    // Metadatos
    creadoPor: string;
    fechaCreacion: string;
}

interface PostulantesDataTableProps {
    onViewPostulante?: (postulante: Postulante) => void;
    onEditPostulante?: (postulante: Postulante) => void;
    onScheduleInterview?: (postulante: Postulante) => void;
    onUpdateStatus?: (postulante: Postulante, newStatus: string) => void;
}

const PostulantesDataTable: React.FC<PostulantesDataTableProps> = ({
    onViewPostulante,
    onEditPostulante,
    onScheduleInterview,
    onUpdateStatus
}) => {
    const [postulantes, setPostulantes] = useState<Postulante[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
        total: 0
    });
    const [selectedPostulante, setSelectedPostulante] = useState<Postulante | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const { addNotification } = useNotifications();

    // Configuración de columnas específicas para postulantes
    const columns: TableColumn<Postulante>[] = [
        {
            key: 'categoriaEspecial',
            title: 'Categoría',
            dataIndex: 'esHijoFuncionario',
            sortable: false,
            filterable: true,
            filterType: 'select',
            filterOptions: [
                { label: 'Hijo de Funcionario', value: 'funcionario' },
                { label: 'Hijo de Exalumno', value: 'exalumno' },
                { label: 'Alumno de Inclusión', value: 'inclusion' },
                { label: 'Regular', value: 'regular' }
            ],
            width: 140,
            align: 'center',
            render: (_, record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="flex flex-col gap-1">
                        {record.esHijoFuncionario && (
                            <Badge variant="blue" size="xs">
                                Funcionario
                            </Badge>
                        )}
                        {record.esHijoExalumno && (
                            <Badge variant="green" size="xs">
                                🎓 Exalumno {record.anioEgresoExalumno || ''}
                            </Badge>
                        )}
                        {record.esAlumnoInclusion && (
                            <Badge variant="purple" size="xs">
                                ♿ Inclusión
                            </Badge>
                        )}
                        {!record.esHijoFuncionario && !record.esHijoExalumno && !record.esAlumnoInclusion && (
                            <Badge variant="gray" size="xs">
                                Regular
                            </Badge>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'estudiante',
            title: 'Estudiante',
            dataIndex: 'nombreCompleto',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 250,
            render: (_, record) => {
                if (!record) return <div>-</div>;
                return (
                    <div 
                        className="flex flex-col cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                        onClick={() => handleViewPostulanteDetail(record)}
                    >
                        <div className="flex items-center gap-2">
                            <FiUser className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold text-gray-900 hover:text-blue-600">{record.nombres || '-'}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                            {record.apellidoPaterno || ''} {record.apellidoMaterno || ''}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Badge variant="orange" size="xs">{record.edad || 0} años</Badge>
                            <span className="text-xs">RUT: {record.rut || 'N/A'}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'curso',
            title: 'Curso',
            dataIndex: 'cursoPostulado',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 140,
            align: 'center',
            render: (_, record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="flex flex-col items-center gap-1">
                        <Badge 
                            variant={
                                record.cursoPostulado?.includes('Prekinder') || record.cursoPostulado?.includes('Kinder') ? 'purple' :
                                record.cursoPostulado?.includes('Básico') ? 'blue' :
                                record.cursoPostulado?.includes('Medio') ? 'green' : 'gray'
                            } 
                            size="sm"
                        >
                            {record.cursoPostulado || 'Sin especificar'}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FiHome className="w-3 h-3" />
                            <span>{record.colegioDestino === 'MONTE_TABOR' ? 'Monte Tabor' : 'Nazaret'}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'estado',
            title: 'Estado',
            dataIndex: 'estadoPostulacion',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 140,
            align: 'center',
            render: (_, record) => {
                if (!record) return <div>-</div>;
                
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
                        case 'DOCUMENTS_REQUESTED': return 'Docs. Solicitados';
                        case 'INTERVIEW_SCHEDULED': return 'Entrevista Program.';
                        case 'EXAM_SCHEDULED': return 'Examen Program.';
                        case 'APPROVED': return 'Aprobado';
                        case 'REJECTED': return 'Rechazado';
                        case 'WAITLIST': return 'Lista de Espera';
                        default: return status;
                    }
                };

                return (
                    <Badge variant={getStatusVariant(record.estadoPostulacion || 'PENDING')} size="sm">
                        {getStatusText(record.estadoPostulacion || 'PENDING')}
                    </Badge>
                );
            }
        },
        {
            key: 'contacto',
            title: 'Contacto Principal',
            dataIndex: 'nombreContactoPrincipal',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 180,
            render: (_, record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <FiUsers className="w-3 h-3 text-green-500" />
                            <span className="font-medium text-gray-900 text-sm">{record.nombreContactoPrincipal || '-'}</span>
                        </div>
                        <div className="text-xs text-gray-500">{record.relacionContacto || '-'}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FiPhone className="w-3 h-3" />
                            <span>{record.telefonoContacto || '-'}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'proceso',
            title: 'Avance del Proceso',
            dataIndex: 'documentosCompletos',
            sortable: true,
            filterable: false,
            width: 160,
            align: 'center',
            render: (_, record) => {
                if (!record) return <div>-</div>;

                // Calcular progreso: cuántas etapas están completadas
                const etapasCompletadas = [
                    record.documentosCompletos,
                    !record.evaluacionPendiente,
                    record.entrevistaProgramada
                ].filter(Boolean).length;

                const totalEtapas = 3;
                const porcentaje = Math.round((etapasCompletadas / totalEtapas) * 100);

                return (
                    <div className="flex flex-col items-center gap-2">
                        {/* Indicador de progreso visual */}
                        <div className="w-full px-2">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${
                                            porcentaje === 100 ? 'bg-green-500' :
                                            porcentaje >= 66 ? 'bg-blue-500' :
                                            porcentaje >= 33 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${porcentaje}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-gray-600 min-w-[35px]">
                                    {porcentaje}%
                                </span>
                            </div>
                        </div>

                        {/* Detalles de cada etapa */}
                        <div className="flex flex-col gap-0.5 w-full">
                            {/* Documentos */}
                            <div className="flex items-center justify-between text-xs px-2">
                                <span className="text-gray-600">Documentos:</span>
                                {record.documentosCompletos ? (
                                    <FiCheckCircle className="w-4 h-4 text-green-500" title="Documentos completos" />
                                ) : (
                                    <FiAlertCircle className="w-4 h-4 text-red-500" title="Faltan documentos" />
                                )}
                            </div>

                            {/* Evaluación */}
                            <div className="flex items-center justify-between text-xs px-2">
                                <span className="text-gray-600">Evaluación:</span>
                                {!record.evaluacionPendiente ? (
                                    <FiCheckCircle className="w-4 h-4 text-green-500" title="Evaluación completada" />
                                ) : (
                                    <FiClock className="w-4 h-4 text-yellow-500" title="Evaluación pendiente" />
                                )}
                            </div>

                            {/* Entrevista */}
                            <div className="flex items-center justify-between text-xs px-2">
                                <span className="text-gray-600">Entrevista:</span>
                                {record.entrevistaProgramada ? (
                                    <FiCheckCircle className="w-4 h-4 text-green-500" title="Entrevista programada" />
                                ) : (
                                    <FiInfo className="w-4 h-4 text-gray-400" title="Sin entrevista aún" />
                                )}
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'acciones',
            title: 'Acciones',
            dataIndex: 'acciones',
            width: 120,
            align: 'center',
            render: (_, record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="flex justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPostulanteDetail(record)}
                            title="Ver detalles completos"
                        >
                            <FiEye className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditPostulante?.(record)}
                        >
                            <FiEdit className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocuments(record)}
                        >
                            <FiDownload className="w-4 h-4" />
                        </Button>
                    </div>
                );
            }
        }
    ];

    // Transformar datos de applications a postulantes
    const transformApplicationToPostulante = (app: Application): Postulante => {
        const birthDate = new Date(app.student.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear() -
                   (today.getMonth() < birthDate.getMonth() ||
                    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

        const nombreCompleto = `${app.student.firstName} ${app.student.paternalLastName || app.student.lastName} ${app.student.maternalLastName || ''}`.trim();

        return {
            id: app.id,
            // Datos básicos del estudiante
            nombreCompleto,
            nombres: app.student.firstName,
            apellidoPaterno: app.student.paternalLastName || app.student.lastName,
            apellidoMaterno: app.student.maternalLastName || '',
            rut: app.student.rut,
            fechaNacimiento: app.student.birthDate,
            edad: age,
            
            // Categorías especiales
            esHijoFuncionario: app.student.isEmployeeChild || false,
            nombrePadreFuncionario: app.student.employeeParentName,
            esHijoExalumno: app.student.isAlumniChild || false,
            anioEgresoExalumno: app.student.alumniParentYear,
            esAlumnoInclusion: app.student.isInclusionStudent || false,
            tipoInclusion: app.student.inclusionType,
            notasInclusion: app.student.inclusionNotes,
            
            email: app.student.email,
            direccion: app.student.address,
            
            // Datos académicos
            cursoPostulado: app.student.gradeApplied,
            colegioActual: app.student.currentSchool,
            colegioDestino: (app.student.targetSchool || 'MONTE_TABOR') as 'MONTE_TABOR' | 'NAZARET',
            añoAcademico: '2025',
            
            // Estado de postulación
            estadoPostulacion: app.status as any,
            fechaPostulacion: app.submissionDate,
            fechaActualizacion: app.submissionDate,
            
            // Contacto principal (usar apoderado como principal)
            nombreContactoPrincipal: app.guardian?.fullName || 'No especificado',
            emailContacto: app.guardian?.email || '',
            telefonoContacto: app.guardian?.phone || '',
            relacionContacto: app.guardian?.relationship || '',
            
            // Datos de padres
            nombrePadre: app.father?.fullName,
            emailPadre: app.father?.email,
            telefonoPadre: app.father?.phone,
            profesionPadre: app.father?.profession,
            
            nombreMadre: app.mother?.fullName,
            emailMadre: app.mother?.email,
            telefonoMadre: app.mother?.phone,
            profesionMadre: app.mother?.profession,
            
            // Información académica y evaluaciones
            documentosCompletos: app.documents ? app.documents.length > 0 : false,
            cantidadDocumentos: app.documents ? app.documents.length : 0,
            evaluacionPendiente: app.status === 'PENDING' || app.status === 'UNDER_REVIEW',
            entrevistaProgramada: app.status === 'INTERVIEW_SCHEDULED',
            fechaEntrevista: app.status === 'INTERVIEW_SCHEDULED' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            
            // Observaciones
            necesidadesEspeciales: app.student.additionalNotes?.toLowerCase().includes('especial') || false,
            observaciones: app.student.additionalNotes,
            notasInternas: undefined,
            
            // Metadatos
            creadoPor: app.applicantUser?.email || 'Sistema',
            fechaCreacion: app.submissionDate
        };
    };

    // Cargar postulantes con datos reales del backend
    const loadPostulantes = async (page = 1, size = 5) => {
        setLoading(true);
        try {
            console.log('Admin: Cargando postulantes desde backend...');
            
            // Obtener applications reales del backend
            const backendApplications = await applicationService.getAllApplications();
            console.log('Applications obtenidas del backend:', backendApplications.length);
            
            // Transformar a formato Postulante
            const transformedPostulantes = backendApplications.map(transformApplicationToPostulante);
            
            // Aplicar paginación local
            const startIndex = (page - 1) * size;
            const endIndex = startIndex + size;
            const paginatedPostulantes = transformedPostulantes.slice(startIndex, endIndex);
            
            setPostulantes(paginatedPostulantes);
            setPagination({
                current: page,
                pageSize: size,
                total: transformedPostulantes.length
            });
            
            console.log('Postulantes cargados y transformados exitosamente');
            
        } catch (error: any) {
            console.error('Error cargando postulantes:', error);
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudieron cargar los postulantes desde el servidor'
            });
            
            setPostulantes([]);
            setPagination({
                current: 1,
                pageSize: size,
                total: 0
            });
        } finally {
            setLoading(false);
        }
    };

    // Manejar paginación
    const handlePageChange = (page: number, pageSize: number) => {
        loadPostulantes(page, pageSize);
    };

    // Abrir modal de detalles del postulante
    const handleViewPostulanteDetail = (postulante: Postulante) => {
        console.log('PostulantesDataTable - handleViewPostulanteDetail called with:', postulante);
        setSelectedPostulante(postulante);
        setIsDetailModalOpen(true);
        console.log('PostulantesDataTable - Modal state set to open');
        // Llamar al callback original si existe
        onViewPostulante?.(postulante);
    };

    // Cerrar modal de detalles
    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedPostulante(null);
    };

    // Descargar documentos del postulante
    const handleDownloadDocuments = (postulante: Postulante) => {
        addNotification({
            type: 'info',
            title: 'Descarga iniciada',
            message: `Descargando documentos de ${postulante.nombreCompleto}`
        });
    };

    // Exportar datos de postulantes a CSV
    const handleExport = () => {
        const csvData = postulantes.map(p => ({
            'RUT': p.rut,
            'Nombre Completo': p.nombreCompleto,
            'Nombres': p.nombres,
            'Apellido Paterno': p.apellidoPaterno,
            'Apellido Materno': p.apellidoMaterno,
            'Fecha Nacimiento': p.fechaNacimiento,
            'Edad': p.edad,
            'Hijo de Funcionario': p.esHijoFuncionario ? 'Sí' : 'No',
            'Nombre Padre Funcionario': p.nombrePadreFuncionario || '',
            'Hijo de Exalumno': p.esHijoExalumno ? 'Sí' : 'No',
            'Año Egreso Exalumno': p.anioEgresoExalumno || '',
            'Alumno de Inclusión': p.esAlumnoInclusion ? 'Sí' : 'No',
            'Tipo Inclusión': p.tipoInclusion || '',
            'Notas Inclusión': p.notasInclusion || '',
            'Email Estudiante': p.email || '',
            'Dirección': p.direccion,
            'Curso Postulado': p.cursoPostulado,
            'Colegio Actual': p.colegioActual || '',
            'Colegio Destino': p.colegioDestino === 'MONTE_TABOR' ? 'Monte Tabor' : 'Nazaret',
            'Estado Postulación': p.estadoPostulacion,
            'Fecha Postulación': p.fechaPostulacion,
            'Contacto Principal': p.nombreContactoPrincipal,
            'Email Contacto': p.emailContacto,
            'Teléfono Contacto': p.telefonoContacto,
            'Relación Contacto': p.relacionContacto,
            'Nombre Padre': p.nombrePadre || '',
            'Email Padre': p.emailPadre || '',
            'Teléfono Padre': p.telefonoPadre || '',
            'Profesión Padre': p.profesionPadre || '',
            'Nombre Madre': p.nombreMadre || '',
            'Email Madre': p.emailMadre || '',
            'Teléfono Madre': p.telefonoMadre || '',
            'Profesión Madre': p.profesionMadre || '',
            'Documentos Completos': p.documentosCompletos ? 'Sí' : 'No',
            'Cantidad Documentos': p.cantidadDocumentos,
            'Evaluación Pendiente': p.evaluacionPendiente ? 'Sí' : 'No',
            'Entrevista Programada': p.entrevistaProgramada ? 'Sí' : 'No',
            'Fecha Entrevista': p.fechaEntrevista || '',
            'Necesidades Especiales': p.necesidadesEspeciales ? 'Sí' : 'No',
            'Observaciones': p.observaciones || '',
            'Creado Por': p.creadoPor,
            'Fecha Creación': p.fechaCreacion
        }));

        // Crear y descargar CSV
        const headers = Object.keys(csvData[0] || {}).join(',');
        const rows = csvData.map(row => Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(','));
        const csvContent = [headers, ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `postulantes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addNotification({
            type: 'success',
            title: 'Exportación exitosa',
            message: `Se han exportado ${csvData.length} postulantes a CSV`
        });
    };

    // Función de filtrado personalizada para categorías especiales
    const customFilter = (record: Postulante, columnKey: string, filterValue: string): boolean => {
        if (columnKey === 'categoriaEspecial') {
            switch (filterValue) {
                case 'funcionario':
                    return record.esHijoFuncionario;
                case 'exalumno':
                    return record.esHijoExalumno;
                case 'inclusion':
                    return record.esAlumnoInclusion;
                case 'regular':
                    return !record.esHijoFuncionario && !record.esHijoExalumno && !record.esAlumnoInclusion;
                default:
                    return true;
            }
        }
        return true;
    };

    // Cargar datos al montar el componente
    useEffect(() => {
        loadPostulantes();
    }, []);

    return (
        <div className="space-y-6">
            <DataTable
                title="Gestión de Postulantes"
                columns={columns}
                data={postulantes}
                loading={loading}
                pagination={{
                    ...pagination,
                    onChange: handlePageChange
                }}
                onRefresh={() => loadPostulantes(pagination.current, pagination.pageSize)}
                onExport={handleExport}
                customFilter={customFilter}
                rowKey="id"
                className="shadow-sm"
            />
            
            {/* Modal de detalles del estudiante */}
            <StudentDetailModal
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetailModal}
                postulante={selectedPostulante || undefined}
                onEdit={(postulante) => {
                    handleCloseDetailModal();
                    onEditPostulante?.(postulante);
                }}
                onScheduleInterview={(postulante) => {
                    handleCloseDetailModal();
                    onScheduleInterview?.(postulante);
                }}
                onUpdateStatus={(postulante, status) => {
                    handleCloseDetailModal();
                    onUpdateStatus?.(postulante, status);
                }}
            />
        </div>
    );
};

export default PostulantesDataTable;