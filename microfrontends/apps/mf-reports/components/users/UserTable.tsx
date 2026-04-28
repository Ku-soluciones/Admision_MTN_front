import React from 'react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  User,
  UserTableProps,
  USER_ROLE_LABELS,
  UserUtils
} from '../../types/user';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon
} from '../icons/Icons';

const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onResetPassword,
  className = ''
}) => {
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No se encontraron usuarios</p>
        <p className="text-sm text-gray-500 mt-1">
          Intenta ajustar los filtros de búsqueda
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                {/* Usuario */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-azul-monte-tabor bg-opacity-10 flex items-center justify-center">
                        <span className="text-sm font-medium text-azul-monte-tabor">
                          {(user.firstName?.charAt(0) || '?')}{(user.lastName?.charAt(0) || '?')}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-gray-500">
                        RUT: {user.rut || 'No especificado'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Contacto */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email || 'No especificado'}</div>
                  {user.phone && (
                    <div className="text-sm text-gray-500">{user.phone}</div>
                  )}
                </td>

                {/* Rol */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={UserUtils.getRoleColor(user.role)}>
                    {USER_ROLE_LABELS[user.role]}
                  </Badge>
                </td>

                {/* Estado */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <Badge variant={UserUtils.getStatusColor(user.active)}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {user.emailVerified ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" title="Email verificado" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-red-500" title="Email no verificado" />
                    )}
                  </div>
                </td>

                {/* Creado */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {UserUtils.formatCreatedAt(user.createdAt)}
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {/* Ver */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(user)}
                      title="Ver detalles"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Button>

                    {/* Editar */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(user)}
                      title="Editar usuario"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>

                    {/* Restablecer contraseña */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResetPassword(user)}
                      title="Restablecer contraseña"
                      disabled={!user.active}
                    >
                      <KeyIcon className="w-4 h-4" />
                    </Button>

                    {/* Activar/Desactivar */}
                    <Button
                      variant={user.active ? "outline" : "primary"}
                      size="sm"
                      onClick={() => onToggleStatus(user)}
                      title={user.active ? "Desactivar usuario" : "Activar usuario"}
                    >
                      {user.active ? (
                        <XCircleIcon className="w-4 h-4" />
                      ) : (
                        <CheckCircleIcon className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Eliminar */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(user)}
                      title="Eliminar usuario permanentemente"
                      className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="mt-4 px-6 py-3 bg-gray-50 border-t">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <CheckCircleIcon className="w-3 h-3 text-green-500" />
              <span>Email verificado</span>
            </div>
            <div className="flex items-center space-x-1">
              <XCircleIcon className="w-3 h-3 text-red-500" />
              <span>Email no verificado</span>
            </div>
          </div>
          
          <div className="text-right">
            <span>Total: {users.length} usuarios</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTable;