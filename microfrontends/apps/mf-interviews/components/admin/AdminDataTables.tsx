import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { FiUsers, FiFileText, FiBarChart2, FiCalendar, FiBookOpen, FiStar, FiUser, FiMail, FiBell } from 'react-icons/fi';
import UsersDataTable from './UsersDataTable';
import ApplicationsDataTable from './ApplicationsDataTable';
import PostulantesDataTable from './PostulantesDataTable';
import EvaluationsDataTable from './EvaluationsDataTable';
import EvaluationsOverviewTable from './EvaluationsOverviewTable';
import EmailNotificationsTable from './EmailNotificationsTable';
import NotificationConfigPanel from './NotificationConfigPanel';
import EmailTemplateManager from './EmailTemplateManager';
import ReportsView from './ReportsView';
import AnalyticsView from './AnalyticsView';
import Modal from '../ui/Modal';
import UserForm from '../users/UserForm';
import { UserFormMode } from '../../types/user';
import { userService } from '../../services/userService';
import { applicationService } from '../../services/applicationService';
import { useNotifications } from '../../context/AppContext';

type TableView = 'users' | 'postulantes' | 'evaluations' | 'emails' | 'email-templates' | 'notifications-config' | 'reports' | 'analytics';

interface AdminDataTablesProps {
    className?: string;
}

const AdminDataTables: React.FC<AdminDataTablesProps> = ({ className = '' }) => {
    const [activeView, setActiveView] = useState<TableView>('users');
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const { addNotification } = useNotifications();

    // Manejar creación de usuario
    const handleCreateUser = async (data: any) => {
        setIsSubmitting(true);
        try {
            await userService.createUser(data);
            addNotification({
                type: 'success',
                title: 'Usuario creado',
                message: `El usuario ${data.firstName} ${data.lastName} ha sido creado exitosamente`
            });
            setShowCreateUserModal(false);
            setRefreshKey(prev => prev + 1); // Refrescar la tabla
        } catch (error: any) {
            addNotification({
                type: 'error',
                title: 'Error al crear usuario',
                message: error.message || 'No se pudo crear el usuario'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejar actualización de usuario
    const handleUpdateUser = async (data: any) => {
        if (!selectedUser) return;

        setIsSubmitting(true);
        try {
            await userService.updateUser(selectedUser.id, data);
            addNotification({
                type: 'success',
                title: 'Usuario actualizado',
                message: `El usuario ${data.firstName} ${data.lastName} ha sido actualizado exitosamente`
            });
            setShowEditUserModal(false);
            setSelectedUser(null);
            // Forzar re-render completo incrementando la key
            setRefreshKey(prev => prev + 1);
        } catch (error: any) {
            addNotification({
                type: 'error',
                title: 'Error al actualizar usuario',
                message: error.message || 'No se pudo actualizar el usuario'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejar edición de postulante
    const handleEditPostulante = async (postulante: any) => {
        // Por ahora mostramos un mensaje, la edición completa requeriría un formulario modal
        addNotification({
            type: 'info',
            title: 'Función en desarrollo',
            message: `La edición completa de ${postulante.nombreCompleto} estará disponible próximamente. Puedes editar el estado desde el botón de actualizar estado.`
        });
    };

    // Manejar programación de entrevista
    const handleScheduleInterview = async (postulante: any) => {
        // Por ahora mostramos un mensaje, la programación requeriría acceso a interviewService
        addNotification({
            type: 'info',
            title: 'Programar entrevista',
            message: `Para programar una entrevista para ${postulante.nombreCompleto}, por favor usa el módulo de Entrevistas en el dashboard principal.`
        });
    };

    // Manejar actualización de estado del postulante
    const handleUpdatePostulanteStatus = async (postulante: any, newStatus: string) => {
        try {
            setIsSubmitting(true);

            // Llamar al servicio para actualizar el estado
            await applicationService.updateApplicationStatus(
                postulante.id,
                newStatus,
                `Estado actualizado por administrador desde panel de postulantes`
            );

            addNotification({
                type: 'success',
                title: 'Estado actualizado',
                message: `El estado de ${postulante.nombreCompleto} ha sido actualizado exitosamente a ${newStatus}`
            });

            // Refrescar la tabla
            setRefreshKey(prev => prev + 1);

        } catch (error: any) {
            addNotification({
                type: 'error',
                title: 'Error al actualizar estado',
                message: error.message || 'No se pudo actualizar el estado del postulante'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Configuración de las vistas disponibles
    const views = [
        {
            key: 'users' as TableView,
            title: 'Gestión de Usuarios',
            description: 'Administrar usuarios del sistema',
            icon: FiUsers,
            color: 'blue'
        },
        {
            key: 'postulantes' as TableView,
            title: 'Gestión de Postulantes',
            description: 'Administrar estudiantes que postulan al colegio',
            icon: FiUser,
            color: 'teal'
        },
        {
            key: 'evaluations' as TableView,
            title: 'Evaluaciones',
            description: 'Seguimiento de evaluaciones',
            icon: FiStar,
            color: 'purple'
        },
        {
            key: 'emails' as TableView,
            title: 'Notificaciones Email',
            description: 'Tracking de correos personalizados con respuestas automáticas',
            icon: FiMail,
            color: 'cyan'
        },
        {
            key: 'email-templates' as TableView,
            title: 'Templates Email',
            description: 'Editar plantillas de correos automáticos del sistema',
            icon: FiMail,
            color: 'teal'
        },
        {
            key: 'notifications-config' as TableView,
            title: 'Config. Notificaciones',
            description: 'Configurar qué eventos generan notificaciones y a quién',
            icon: FiBell,
            color: 'indigo'
        },
        {
            key: 'reports' as TableView,
            title: 'Reportes',
            description: 'Informes y estadísticas',
            icon: FiBarChart2,
            color: 'indigo'
        },
        {
            key: 'analytics' as TableView,
            title: 'Análisis',
            description: 'Análisis de datos',
            icon: FiBookOpen,
            color: 'pink'
        }
    ];

    // Renderizar el contenido según la vista activa
    const renderContent = () => {
        switch (activeView) {
            case 'users':
                return (
                    <UsersDataTable
                        key={refreshKey}
                        onCreateUser={() => setShowCreateUserModal(true)}
                        onEditUser={(user) => {
                            setSelectedUser(user);
                            setShowEditUserModal(true);
                        }}
                    />
                );
            
            case 'postulantes':
                return (
                    <PostulantesDataTable
                        key={refreshKey}
                        onViewPostulante={(postulante) => {
                            // La vista detallada ya está implementada en PostulantesDataTable con StudentDetailModal
                        }}
                        onEditPostulante={handleEditPostulante}
                        onScheduleInterview={handleScheduleInterview}
                        onUpdateStatus={handleUpdatePostulanteStatus}
                    />
                );

            case 'evaluations':
                return <EvaluationsOverviewTable />;
            
            case 'emails':
                return <EmailNotificationsTable />;

            case 'email-templates':
                return <EmailTemplateManager />;

            case 'notifications-config':
                return <NotificationConfigPanel />;

            case 'reports':
                return <ReportsView />;

            case 'analytics':
                return <AnalyticsView />;
            
            default:
                return null;
        }
    };

    const activeViewConfig = views.find(view => view.key === activeView);

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header con navegación de tabs */}
            <Card className="p-6">
                <div className="border-b border-gray-200 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {views.map((view) => {
                            const Icon = view.icon;
                            const isActive = activeView === view.key;
                            
                            return (
                                <button
                                    key={view.key}
                                    onClick={() => setActiveView(view.key)}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                                        isActive
                                            ? `bg-${view.color}-50 text-${view.color}-700 border-${view.color}-200`
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                                    }`}
                                >
                                    <Icon size={16} />
                                    {view.title}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Descripción de la vista activa */}
                {activeViewConfig && (
                    <div className="flex items-center gap-3">
                        <activeViewConfig.icon className={`h-8 w-8 text-${activeViewConfig.color}-500`} />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {activeViewConfig.title}
                            </h2>
                            <p className="text-gray-600">
                                {activeViewConfig.description}
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            {/* Contenido de la vista activa */}
            {renderContent()}

            {/* Modal para crear usuario */}
            <Modal
                isOpen={showCreateUserModal}
                onClose={() => {
                    if (!isSubmitting) {
                        setShowCreateUserModal(false);
                    }
                }}
                title=""
                size="xl"
            >
                <UserForm
                    mode={UserFormMode.CREATE}
                    onSubmit={handleCreateUser}
                    onCancel={() => setShowCreateUserModal(false)}
                    isSubmitting={isSubmitting}
                />
            </Modal>

            {/* Modal para editar usuario */}
            <Modal
                isOpen={showEditUserModal}
                onClose={() => {
                    if (!isSubmitting) {
                        setShowEditUserModal(false);
                        setSelectedUser(null);
                    }
                }}
                title=""
                size="xl"
            >
                {selectedUser && (
                    <UserForm
                        user={selectedUser}
                        mode={UserFormMode.EDIT}
                        onSubmit={handleUpdateUser}
                        onCancel={() => {
                            setShowEditUserModal(false);
                            setSelectedUser(null);
                        }}
                        isSubmitting={isSubmitting}
                    />
                )}
            </Modal>
        </div>
    );
};

export default AdminDataTables;