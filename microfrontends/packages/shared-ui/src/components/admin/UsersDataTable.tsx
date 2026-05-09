import React, { useState, useEffect } from 'react';
import DataTable, { TableColumn } from '../ui/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { FiEdit, FiTrash2, FiPlus, FiMail, FiKey, FiEye } from 'react-icons/fi';
import { userService } from '../../services/userService';
import { useNotifications } from '../../context/AppContext';

interface User {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    rut: string;
    phone: string;
    role: string;
    roleDisplayName: string;
    educationalLevel?: string;
    educationalLevelDisplayName?: string;
    subject?: string;
    subjectDisplayName?: string;
    emailVerified: boolean;
    active: boolean;
    createdAt: string;
    updatedAt?: string;
}

interface UsersDataTableProps {
    onCreateUser?: () => void;
    onEditUser?: (user: User) => void;
}

const UsersDataTable: React.FC<UsersDataTableProps> = ({
    onCreateUser,
    onEditUser
}) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
        total: 0
    });
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const { addNotification } = useNotifications();

    // Configuración de columnas de la tabla
    const columns: TableColumn<User>[] = [
        {
            key: 'fullName',
            title: 'Nombre Completo',
            dataIndex: 'fullName',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 200,
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                        {record.firstName} {record.lastName}
                    </span>
                    <span className="text-sm text-gray-500">{record.email}</span>
                </div>
            )
        },
        {
            key: 'role',
            title: 'Rol',
            dataIndex: 'role',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 150,
            render: (_, record) => {
                const roleColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
                    'ADMIN': 'error',          // Rojo
                    'TEACHER': 'info',         // Azul
                    'COORDINATOR': 'info',     // Azul
                    'CYCLE_DIRECTOR': 'info',  // Azul
                    'PSYCHOLOGIST': 'warning', // Dorado/Naranja
                    'INTERVIEWER': 'warning',  // Dorado/Naranja
                    'APODERADO': 'neutral'     // Gris
                };
                return (
                    <Badge
                        variant={roleColors[record.role] || 'neutral'}
                        size="sm"
                    >
                        {record.roleDisplayName}
                    </Badge>
                );
            }
        },
        {
            key: 'educationalLevel',
            title: 'Nivel Educativo',
            dataIndex: 'educationalLevel',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 180,
            render: (_, record) => record.educationalLevelDisplayName || '-'
        },
        {
            key: 'subject',
            title: 'Asignatura',
            dataIndex: 'subject',
            sortable: true,
            filterable: true,
            filterType: 'select',
            width: 150,
            render: (_, record) => record.subjectDisplayName || '-'
        },
        {
            key: 'rut',
            title: 'RUT',
            dataIndex: 'rut',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 120
        },
        {
            key: 'phone',
            title: 'Teléfono',
            dataIndex: 'phone',
            sortable: true,
            filterable: true,
            filterType: 'text',
            width: 120,
            render: (value) => value || '-'
        },
        {
            key: 'status',
            title: 'Estado',
            dataIndex: 'active',
            sortable: true,
            filterable: true,
            filterType: 'boolean',
            width: 100,
            render: (_, record) => (
                <div className="flex flex-col gap-1">
                    <Badge 
                        variant={record.active ? 'green' : 'red'} 
                        size="sm"
                    >
                        {record.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Badge 
                        variant={record.emailVerified ? 'blue' : 'yellow'} 
                        size="sm"
                    >
                        {record.emailVerified ? 'Verificado' : 'Sin verificar'}
                    </Badge>
                </div>
            )
        },
        {
            key: 'createdAt',
            title: 'Fecha Creación',
            dataIndex: 'createdAt',
            sortable: true,
            filterable: true,
            filterType: 'date',
            width: 120,
            render: (value) => new Date(value).toLocaleDateString('es-ES')
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
                        onClick={() => handleViewUser(record)}
                        className="p-1 h-8 w-8"
                        title="Ver detalles"
                    >
                        <FiEye size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditUser?.(record)}
                        className="p-1 h-8 w-8 text-blue-600 hover:text-blue-700"
                        title="Editar usuario"
                    >
                        <FiEdit size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(record)}
                        className="p-1 h-8 w-8 text-orange-600 hover:text-orange-700"
                        title="Resetear contraseña"
                    >
                        <FiKey size={14} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSelectedUser(record);
                            setShowDeleteModal(true);
                        }}
                        className="p-1 h-8 w-8 text-red-600 hover:text-red-700"
                        title="Eliminar usuario"
                    >
                        <FiTrash2 size={14} />
                    </Button>
                </div>
            )
        }
    ];

    // Cargar usuarios
    const loadUsers = async (page = 1, size = 5) => {
        setLoading(true);
        try {
            const response = await userService.getAllUsers({
                page: page - 1, // Backend usa 0-based indexing
                size,
                sort: 'createdAt,desc'
            });

            setUsers(response.content || []);
            setPagination({
                current: page,
                pageSize: size,
                total: response.totalElements || 0
            });
        } catch (error: any) {
            console.error('Error cargando usuarios:', error);
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudieron cargar los usuarios'
            });
        } finally {
            setLoading(false);
        }
    };

    // Manejar paginación
    const handlePageChange = (page: number, pageSize: number) => {
        loadUsers(page, pageSize);
    };

    // Ver detalles del usuario
    const handleViewUser = (user: User) => {
        setSelectedUser(user);
        setShowDetailModal(true);
    };

    // Resetear contraseña
    const handleResetPassword = async (user: User) => {
        try {
            await userService.resetUserPassword(typeof user.id === 'string' ? parseInt(user.id) : user.id);
            addNotification({
                type: 'success',
                title: 'Contraseña reseteada',
                message: `Se ha enviado un email a ${user.email} con las instrucciones para resetear la contraseña`
            });
        } catch (error: any) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudo resetear la contraseña'
            });
        }
    };

    // Eliminar usuario
    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            await userService.deleteUser(typeof selectedUser.id === 'string' ? parseInt(selectedUser.id) : selectedUser.id);
            addNotification({
                type: 'success',
                title: 'Usuario eliminado',
                message: `El usuario ${selectedUser.firstName} ${selectedUser.lastName} ha sido eliminado`
            });
            setShowDeleteModal(false);
            setSelectedUser(null);
            loadUsers(pagination.current, pagination.pageSize);
        } catch (error: any) {
            addNotification({
                type: 'error',
                title: 'Error',
                message: 'No se pudo eliminar el usuario'
            });
        }
    };

    // Exportar datos
    const handleExport = () => {
        // Implementar exportación a CSV/Excel
        const csvData = users.map(user => ({
            'Nombre': user.fullName,
            'Email': user.email,
            'RUT': user.rut,
            'Rol': user.roleDisplayName,
            'Nivel Educativo': user.educationalLevelDisplayName || '',
            'Asignatura': user.subjectDisplayName || '',
            'Teléfono': user.phone || '',
            'Estado': user.active ? 'Activo' : 'Inactivo',
            'Email Verificado': user.emailVerified ? 'Sí' : 'No',
            'Fecha Creación': new Date(user.createdAt).toLocaleDateString('es-ES')
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
        link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Cargar datos al montar el componente y cuando cambie la key (prop externa)
    useEffect(() => {
        console.log('UsersDataTable montado/remontado - cargando usuarios...');
        loadUsers();
    }, []); // Se recarga automáticamente cuando el componente se desmonta y remonta por el key

    return (
        <div className="space-y-6">
            <DataTable
                title="Gestión de Usuarios del Sistema"
                columns={columns}
                data={users}
                loading={loading}
                pagination={{
                    ...pagination,
                    onChange: handlePageChange
                }}
                onRefresh={() => loadUsers(pagination.current, pagination.pageSize)}
                onExport={handleExport}
                actions={
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onCreateUser}
                        className="flex items-center gap-1"
                    >
                        <FiPlus size={14} />
                        Crear Usuario
                    </Button>
                }
                rowKey="id"
                className="shadow-sm"
            />

            {/* Modal de confirmación de eliminación */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                }}
                title="Confirmar Eliminación"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-700">
                        ¿Estás seguro que deseas eliminar al usuario{' '}
                        <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>?
                    </p>
                    <p className="text-sm text-red-600">
                        Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSelectedUser(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleDeleteUser}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de detalles del usuario */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false);
                    setSelectedUser(null);
                }}
                title="Detalles del Usuario"
                size="md"
            >
                {selectedUser && (
                    <div className="space-y-6">
                        {/* Información Personal */}
                        <div className="border-b pb-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Personal</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Nombre</p>
                                    <p className="font-medium text-gray-900">{selectedUser.firstName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Apellido</p>
                                    <p className="font-medium text-gray-900">{selectedUser.lastName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">RUT</p>
                                    <p className="font-medium text-gray-900">{selectedUser.rut}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Teléfono</p>
                                    <p className="font-medium text-gray-900">{selectedUser.phone || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium text-gray-900">{selectedUser.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Información Profesional */}
                        <div className="border-b pb-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Profesional</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Rol</p>
                                    <Badge variant={
                                        selectedUser.role === 'ADMIN' ? 'error' :
                                        selectedUser.role === 'TEACHER' ? 'info' :
                                        selectedUser.role === 'COORDINATOR' ? 'info' :
                                        selectedUser.role === 'CYCLE_DIRECTOR' ? 'info' :
                                        selectedUser.role === 'PSYCHOLOGIST' ? 'warning' :
                                        selectedUser.role === 'INTERVIEWER' ? 'warning' :
                                        'neutral'
                                    } size="sm">
                                        {selectedUser.roleDisplayName}
                                    </Badge>
                                </div>
                                {selectedUser.educationalLevelDisplayName && (
                                    <div>
                                        <p className="text-sm text-gray-500">Nivel Educativo</p>
                                        <p className="font-medium text-gray-900">{selectedUser.educationalLevelDisplayName}</p>
                                    </div>
                                )}
                                {selectedUser.subjectDisplayName && (
                                    <div>
                                        <p className="text-sm text-gray-500">Asignatura</p>
                                        <p className="font-medium text-gray-900">{selectedUser.subjectDisplayName}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Estado del Usuario */}
                        <div className="border-b pb-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Estado</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Estado de la Cuenta</p>
                                    <Badge variant={selectedUser.active ? 'green' : 'red'} size="sm">
                                        {selectedUser.active ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Email Verificado</p>
                                    <Badge variant={selectedUser.emailVerified ? 'blue' : 'yellow'} size="sm">
                                        {selectedUser.emailVerified ? 'Verificado' : 'Sin verificar'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Fechas */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del Sistema</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Fecha de Creación</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(selectedUser.createdAt).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                {selectedUser.updatedAt && (
                                    <div>
                                        <p className="text-sm text-gray-500">Última Actualización</p>
                                        <p className="font-medium text-gray-900">
                                            {new Date(selectedUser.updatedAt).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botón de cerrar */}
                        <div className="flex justify-end pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedUser(null);
                                }}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default UsersDataTable;