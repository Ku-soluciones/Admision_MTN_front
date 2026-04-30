import React from 'react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Application } from '../../services/applicationService';
import {
  FileTextIcon,
  EyeIcon,
  ArchiveIcon,
  UserIcon,
  CheckCircleIcon
} from '../icons/Icons';

interface ApplicationsTableProps {
  applications: Application[];
  isLoading?: boolean;
  onView?: (application: Application) => void;
  onArchive?: (application: Application) => void;
  onDecision?: (application: Application) => void;
  className?: string;
}

const ApplicationsTable: React.FC<ApplicationsTableProps> = ({
  applications,
  isLoading = false,
  onView,
  onArchive,
  onDecision,
  className = ''
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const PAGE_SIZE = 5;
  React.useEffect(() => { setCurrentPage(1); }, [applications]);
  console.log('ApplicationsTable render - applications:', applications.length, 'onView:', !!onView);
  console.log('First application data:', applications[0]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Cargando postulaciones...</p>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No se encontraron postulaciones</p>
        <p className="text-sm text-gray-500 mt-1">
          Las postulaciones aparecerán aquí cuando se envíen
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'gray' => {
    switch (status?.toUpperCase()) {
      case 'SUBMITTED':
      case 'PENDING':
      case 'ENVIADA':
        return 'info';
      case 'UNDER_REVIEW':
      case 'EN_REVISION':
        return 'warning';
      case 'EXAM_SCHEDULED':
        return 'warning';
      case 'INTERVIEW_SCHEDULED':
      case 'ENTREVISTA_PROGRAMADA':
        return 'warning';
      case 'APPROVED':
      case 'ACEPTADA':
        return 'success';
      case 'REJECTED':
      case 'RECHAZADA':
        return 'error';
      case 'WAITLIST':
      case 'LISTA_ESPERA':
        return 'warning';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'SUBMITTED':
      case 'PENDING':
        return 'Enviada';
      case 'UNDER_REVIEW':
        return 'En Revisión';
      case 'EXAM_SCHEDULED':
        return 'Examen Agendado';
      case 'INTERVIEW_SCHEDULED':
        return 'Entrevista Programada';
      case 'APPROVED':
        return 'Aceptada';
      case 'REJECTED':
        return 'Rechazada';
      case 'WAITLIST':
        return 'Lista de Espera';
      default:
        return status || 'Sin Estado';
    }
  };

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const totalPages = Math.ceil(applications.length / PAGE_SIZE);
  const pagedApplications = applications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className={`overflow-hidden ${className}`}>
      {applications.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b text-sm text-gray-600">
          <span>Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, applications.length)} de {applications.length} postulaciones</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">«</button>
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">‹</button>
            <span className="px-3 py-1 rounded border bg-azul-monte-tabor text-white">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">›</button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">»</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estudiante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Apoderado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Envío
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pagedApplications.map((application) => (
              <tr key={application.id} className="hover:bg-gray-50">
                {/* Estudiante */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-azul-monte-tabor bg-opacity-10 flex items-center justify-center">
                        <span className="text-sm font-medium text-azul-monte-tabor">
                          {application.student?.firstName?.charAt(0) || 'N'}{(application.student?.paternalLastName || application.student?.lastName)?.charAt(0) || 'N'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {application.student?.firstName || 'N/A'} {application.student?.paternalLastName || application.student?.lastName || 'N/A'} {application.student?.maternalLastName || ''}
                      </div>
                      <div className="text-sm text-gray-500">
                        RUT: {application.student?.rut || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Grado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{application.student?.gradeApplied || 'N/A'}</div>
                </td>

                {/* Apoderado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {application.guardian?.fullName ||
                     (application.applicantUser?.firstName && application.applicantUser?.lastName
                      ? `${application.applicantUser.firstName} ${application.applicantUser.lastName}`
                      : 'N/A')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {application.guardian?.email || application.applicantUser?.email || 'Sin información de apoderado'}
                  </div>
                </td>

                {/* Estado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={getStatusColor(application.status)}>
                    {getStatusLabel(application.status)}
                  </Badge>
                </td>

                {/* Fecha Envío */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(application.submissionDate)}
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {/* Ver detalles */}
                    {onView && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Ver detalles clicked for application:', application);
                          console.log('onView callback exists:', !!onView);
                          onView(application);
                        }}
                        title="Ver detalles"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Decisión Final */}
                    {onDecision && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDecision(application)}
                        title="Decisión final de admisión"
                        className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Archivar */}
                    {onArchive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onArchive(application)}
                        title="Cerrar y archivar postulación"
                        className="text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                      >
                        <ArchiveIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="mt-4 px-6 py-3 bg-gray-50 border-t">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1">
              <Badge variant="info">Enviada</Badge>
              <span>Nueva postulación</span>
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant="warning">En Revisión</Badge>
              <span>Bajo evaluación</span>
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant="success">Aceptada</Badge>
              <span>Proceso exitoso</span>
            </div>
          </div>
          
          <div className="text-right">
            <span>Total: {applications.length} postulaciones</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationsTable;