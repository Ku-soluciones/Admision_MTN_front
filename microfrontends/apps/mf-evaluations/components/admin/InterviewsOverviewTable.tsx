import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { FiCheck, FiX, FiCalendar } from 'react-icons/fi';
import { applicationService } from '../../services/applicationService';

// Tipos de entrevistas
const INTERVIEW_TYPES = [
    { key: 'PSYCHOLOGICAL_INTERVIEW', label: 'Psicológica' },
    { key: 'CYCLE_DIRECTOR_INTERVIEW', label: 'Director de Ciclo' },
    { key: 'PRINCIPAL_INTERVIEW', label: 'Directora' }
];

interface StudentInterview {
    id: number;
    studentName: string;
    studentRut: string;
    gradeApplied: string;
    interviews: {
        [key: string]: {
            scheduled: boolean;
            status?: string;
            interviewerName?: string;
            scheduledDate?: string;
        };
    };
}

const InterviewsOverviewTable: React.FC = () => {
    const [students, setStudents] = useState<StudentInterview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const applications = await applicationService.getAllApplications();

            const studentsData: StudentInterview[] = applications.map(app => {
                // Obtener entrevistas de la aplicación
                const interviewsMap: any = {};

                // Inicializar todas las entrevistas como no programadas
                INTERVIEW_TYPES.forEach(type => {
                    interviewsMap[type.key] = { scheduled: false };
                });

                // Si la aplicación tiene entrevistas, marcarlas como programadas
                if (app.interviews && Array.isArray(app.interviews)) {
                    app.interviews.forEach((interview: any) => {
                        interviewsMap[interview.interviewType] = {
                            scheduled: true,
                            status: interview.status,
                            interviewerName: interview.interviewer
                                ? `${interview.interviewer.firstName} ${interview.interviewer.lastName}`
                                : undefined,
                            scheduledDate: interview.scheduledDate
                        };
                    });
                }

                return {
                    id: app.id,
                    studentName: `${app.student.firstName} ${app.student.paternalLastName || app.student.lastName} ${app.student.maternalLastName || ''}`.trim(),
                    studentRut: app.student.rut,
                    gradeApplied: app.student.gradeApplied || 'N/A',
                    interviews: interviewsMap
                };
            });

            setStudents(studentsData);
        } catch (err: any) {
            console.error('Error loading interviews overview:', err);
            setError(err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (date?: string) => {
        if (!date) return null;

        try {
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const formattedTime = dateObj.toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `${formattedDate} ${formattedTime}`;
        } catch (e) {
            return date;
        }
    };

    const renderInterviewCell = (interview: {
        scheduled: boolean;
        status?: string;
        interviewerName?: string;
        scheduledDate?: string;
    }) => {
        if (interview.scheduled) {
            const dateTime = formatDateTime(interview.scheduledDate);

            return (
                <div className="flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                            <FiCheck className="w-4 h-4 text-green-600" />
                        </div>
                        {interview.interviewerName && (
                            <span className="text-xs text-gray-600 text-center">{interview.interviewerName}</span>
                        )}
                        {dateTime && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <FiCalendar className="w-3 h-3" />
                                <span>{dateTime}</span>
                            </div>
                        )}
                        {interview.status === 'COMPLETED' && (
                            <Badge variant="green" size="sm">Completada</Badge>
                        )}
                        {interview.status === 'SCHEDULED' && (
                            <Badge variant="blue" size="sm">Programada</Badge>
                        )}
                        {interview.status === 'PENDING' && (
                            <Badge variant="yellow" size="sm">Pendiente</Badge>
                        )}
                        {interview.status === 'CANCELLED' && (
                            <Badge variant="red" size="sm">Cancelada</Badge>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-center">
                <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                    <FiX className="w-4 h-4 text-red-600" />
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Cargando entrevistas...</span>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6">
                <div className="text-center py-12">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={loadData}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Reintentar
                    </button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Resumen de Entrevistas por Postulante</h3>
                <p className="text-sm text-gray-600 mt-1">
                    <span className="inline-flex items-center gap-1 mr-4">
                        <FiCheck className="w-4 h-4 text-green-600" /> Programada
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <FiX className="w-4 h-4 text-red-600" /> No programada
                    </span>
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                Estudiante
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Curso
                            </th>
                            {INTERVIEW_TYPES.map(type => (
                                <th key={type.key} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {type.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                                        <div className="text-sm text-gray-500">{student.studentRut}</div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <Badge variant="blue" size="sm">{student.gradeApplied}</Badge>
                                </td>
                                {INTERVIEW_TYPES.map(type => (
                                    <td key={type.key} className="px-4 py-4 whitespace-nowrap">
                                        {renderInterviewCell(student.interviews[type.key])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {students.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No hay postulantes registrados</p>
                    </div>
                )}
            </div>

            <div className="mt-4 text-sm text-gray-600">
                Total de postulantes: {students.length}
            </div>
        </Card>
    );
};

export default InterviewsOverviewTable;
