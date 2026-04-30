import React from 'react';
import { getApiBaseUrl } from '../../config/api.config';
import DataTable, { TableColumn } from '../ui/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { FiEdit, FiEye, FiDownload, FiCalendar, FiFileText, FiUser, FiCheckCircle, FiClock, FiAlertCircle, FiStar, FiBookOpen } from 'react-icons/fi';
import { useDataTable } from '../../hooks/useDataTable';
import { dataService, EvaluationData } from '../../services/dataService';

// Usar el tipo centralizado
type Evaluation = EvaluationData;

interface EvaluationsDataTableProps {
    onViewEvaluation?: (evaluation: Evaluation) => void;
    onEditEvaluation?: (evaluation: Evaluation) => void;
    onScheduleEvaluation?: (evaluation: Evaluation) => void;
    onUpdateStatus?: (evaluation: Evaluation, newStatus: string) => void;
}

const EvaluationsDataTable: React.FC<EvaluationsDataTableProps> = ({
    onViewEvaluation,
    onEditEvaluation,
    onScheduleEvaluation,
    onUpdateStatus
}) => {
    // Usar hook centralizado para manejo de datos
    const {
        data: evaluations,
        loading,
        error,
        pagination,
        loadData,
        refresh
    } = useDataTable<Evaluation>(dataService.getEvaluations.bind(dataService));

    // Estado para estadísticas globales
    const [globalStats, setGlobalStats] = React.useState({
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0
    });

    // Cargar estadísticas globales
    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${getApiBaseUrl()}/v1/evaluations/stats`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    setGlobalStats({
                        total: data.data.total,
                        completed: data.data.completedCount,
                        inProgress: data.data.inProgressCount,
                        pending: data.data.pendingCount
                    });
                }
            } catch (error) {
                console.error('Error fetching evaluation stats:', error);
            }
        };
        fetchStats();
    }, []);


    // Función para obtener el color del badge según el tipo de evaluación
    const getEvaluationTypeColor = (type: string): 'blue' | 'green' | 'purple' | 'orange' | 'pink' => {
        switch (type) {
            case 'MATHEMATICS_EXAM': return 'blue';
            case 'LANGUAGE_EXAM': return 'green';
            case 'ENGLISH_EXAM': return 'purple';
            case 'PSYCHOLOGICAL_INTERVIEW': return 'pink';
            case 'CYCLE_DIRECTOR_INTERVIEW': return 'orange';
            default: return 'blue';
        }
    };

    // Función para obtener el texto legible del tipo de evaluación
    const getEvaluationTypeText = (type: string): string => {
        switch (type) {
            case 'MATHEMATICS_EXAM': return 'Matemáticas';
            case 'LANGUAGE_EXAM': return 'Lenguaje';
            case 'ENGLISH_EXAM': return 'Inglés';
            case 'PSYCHOLOGICAL_INTERVIEW': return 'Psicológica';
            case 'CYCLE_DIRECTOR_INTERVIEW': return 'Director';
            case 'CYCLE_DIRECTOR_REPORT': return 'Informe Director';
            default: return type;
        }
    };

    // Función para obtener el color del badge según el estado
    const getStatusColor = (status: string): 'gray' | 'yellow' | 'blue' | 'green' | 'red' => {
        switch (status) {
            case 'PENDING': return 'gray';
            case 'IN_PROGRESS': return 'yellow';
            case 'COMPLETED': return 'blue';
            case 'REVIEWED': return 'green';
            case 'APPROVED': return 'green';
            default: return 'gray';
        }
    };

    // Función para obtener el texto legible del estado
    const getStatusText = (status: string): string => {
        switch (status) {
            case 'PENDING': return 'Pendiente';
            case 'IN_PROGRESS': return 'En Progreso';
            case 'COMPLETED': return 'Completada';
            case 'REVIEWED': return 'Revisada';
            case 'APPROVED': return 'Aprobada';
            default: return status;
        }
    };

    // Configuración de columnas
    const columns: TableColumn<Evaluation>[] = [
        {
            key: 'studentInfo',
            title: 'Estudiante',
            render: (record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="space-y-1">
                        <div className="font-medium text-gray-900">{record.studentName || '-'}</div>
                        <div className="text-sm text-gray-500">{record.studentRut || '-'}</div>
                        <Badge 
                            variant={record.gradeApplied && record.gradeApplied.includes('Básico') ? 'green' : 'blue'} 
                            size="sm"
                        >
                            {record.gradeApplied || 'N/A'}
                        </Badge>
                    </div>
                );
            }
        },
        {
            key: 'evaluationType',
            title: 'Tipo de Evaluación',
            render: (record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="space-y-1">
                        <Badge 
                            variant={getEvaluationTypeColor(record.evaluationType || '')} 
                            size="sm"
                        >
                            {getEvaluationTypeText(record.evaluationType || '')}
                        </Badge>
                        <div className="text-xs text-gray-500">
                            {record.evaluatorName || '-'}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'status',
            title: 'Estado',
            render: (record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="space-y-1">
                        <Badge 
                            variant={getStatusColor(record.status || 'PENDING')} 
                            size="sm"
                        >
                            {getStatusText(record.status || 'PENDING')}
                        </Badge>
                        {record.score && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                <FiStar className="w-3 h-3" />
                                <span>{record.score}/100</span>
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'dates',
            title: 'Fechas',
            render: (record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="space-y-1">
                        {record.evaluationDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                <FiCalendar className="w-3 h-3" />
                                <span>Eval: {new Date(record.evaluationDate).toLocaleDateString()}</span>
                            </div>
                        )}
                        {record.completionDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                <FiCheckCircle className="w-3 h-3" />
                                <span>Comp: {new Date(record.completionDate).toLocaleDateString()}</span>
                            </div>
                        )}
                        {!record.evaluationDate && (
                            <div className="text-xs text-gray-400">
                                <FiClock className="w-3 h-3 inline mr-1" />
                                Por programar
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'recommendation',
            title: 'Recomendación',
            render: (record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="space-y-1">
                        {record.finalRecommendation !== undefined ? (
                            <Badge 
                                variant={record.finalRecommendation ? 'green' : 'red'} 
                                size="sm"
                            >
                                {record.finalRecommendation ? 'Aprobado' : 'No Aprobado'}
                            </Badge>
                        ) : (
                            <Badge variant="gray" size="sm">
                                Pendiente
                            </Badge>
                        )}
                        {record.observations && (
                            <div className="text-xs text-gray-500 line-clamp-2">
                                {record.observations.length > 50 
                                    ? `${record.observations.substring(0, 50)}...` 
                                    : record.observations}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'actions',
            title: 'Acciones',
            render: (record) => {
                if (!record) return <div>-</div>;
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewEvaluation?.(record)}
                            className="p-1"
                        >
                            <FiEye className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditEvaluation?.(record)}
                            className="p-1"
                        >
                            <FiEdit className="w-4 h-4" />
                        </Button>
                        {record.status === 'PENDING' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onScheduleEvaluation?.(record)}
                                className="p-1"
                            >
                                <FiCalendar className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        }
    ];

    const handlePageChange = (page: number, pageSize: number) => {
        loadData(page, pageSize);
    };

    const handleExportCSV = () => {
        const csvData = evaluations.map(evaluation => ({
            'Estudiante': evaluation.studentName,
            'RUT': evaluation.studentRut,
            'Curso': evaluation.gradeApplied,
            'Tipo Evaluación': getEvaluationTypeText(evaluation.evaluationType),
            'Estado': getStatusText(evaluation.status),
            'Puntaje': evaluation.score || '',
            'Fecha Evaluación': evaluation.evaluationDate ? new Date(evaluation.evaluationDate).toLocaleDateString() : '',
            'Fecha Completado': evaluation.completionDate ? new Date(evaluation.completionDate).toLocaleDateString() : '',
            'Evaluador': evaluation.evaluatorName,
            'Recomendación': evaluation.finalRecommendation !== undefined 
                ? (evaluation.finalRecommendation ? 'Aprobado' : 'No Aprobado') 
                : 'Pendiente',
            'Observaciones': evaluation.observations || ''
        }));
        
        const csv = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `evaluaciones_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // El hook useDataTable ya maneja la carga inicial automáticamente

    return (
        <div className="space-y-6">
            {/* Header con estadísticas globales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600">Total Evaluaciones</p>
                            <p className="text-2xl font-bold text-blue-700">{globalStats.total}</p>
                        </div>
                        <FiBookOpen className="h-8 w-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600">Completadas</p>
                            <p className="text-2xl font-bold text-green-700">
                                {globalStats.completed}
                            </p>
                        </div>
                        <FiCheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-yellow-600">En Progreso</p>
                            <p className="text-2xl font-bold text-yellow-700">
                                {globalStats.inProgress}
                            </p>
                        </div>
                        <FiClock className="h-8 w-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-600">Pendientes</p>
                            <p className="text-2xl font-bold text-red-700">
                                {globalStats.pending}
                            </p>
                        </div>
                        <FiAlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Tabla de evaluaciones */}
            <DataTable<Evaluation>
                data={evaluations}
                columns={columns}
                loading={loading}
                pagination={pagination}
                onPageChange={handlePageChange}
                searchable
                searchPlaceholder="Buscar evaluaciones por estudiante, evaluador o tipo..."
                onExportCSV={handleExportCSV}
                emptyMessage="No se encontraron evaluaciones"
                className="bg-white shadow-sm rounded-lg"
            />
        </div>
    );
};

export default EvaluationsDataTable;