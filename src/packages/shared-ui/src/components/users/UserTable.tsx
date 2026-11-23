import React from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  User,
  UserTableProps,
  UserRole,
  USER_ROLE_LABELS,
  UserUtils
} from '../../types/user';
import {
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon
} from '../icons/Icons';
import { FiEdit2 } from 'react-icons/fi';

const getRoleBadgeClasses = (role: UserRole): string => {
  switch (role) {
    case UserRole.ADMIN: return 'bg-red-50 text-red-700';
    case UserRole.CYCLE_DIRECTOR: return 'bg-blue-50 text-blue-700';
    case UserRole.COORDINATOR: return 'bg-blue-50 text-blue-700';
    case UserRole.PSYCHOLOGIST: return 'bg-amber-50 text-amber-700';
    case UserRole.INTERVIEWER: return 'bg-amber-50 text-amber-700';
    case UserRole.TEACHER: return 'bg-indigo-50 text-indigo-700';
    case UserRole.APODERADO: return 'bg-emerald-50 text-emerald-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

interface ExtendedUserTableProps extends UserTableProps {
  onManageSchedule?: (user: User) => void;
}

const UserTable: React.FC<ExtendedUserTableProps> = ({
  users,
  isLoading = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onResetPassword,
  onManageSchedule,
  className = '',
  totalCount
}) => {
  const displayTotal = totalCount ?? users.length;
  
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
    <div>
      {/* Leyenda */}
      <div className="flex items-center justify-end gap-4 px-1 pb-2 text-xs text-gray-500">
        <span>Total: {displayTotal} usuario{displayTotal !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-1">
            <CheckCircleIcon className="w-3 h-3 text-green-500" />
            <span>Email verificado</span>
          </div>
          <div className="flex items-center space-x-1">
            <XCircleIcon className="w-3 h-3 text-red-500" />
            <span>Email no verificado</span>
          </div>
        </div>
      </div>

      <div className={`overflow-x-auto rounded-lg border border-gray-200 ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Usuario
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Contacto
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Rol
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Estado
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Creado
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                {/* Usuario */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre'}
                  </div>
                  <div className="text-xs text-gray-500">
                    RUT: {user.rut || 'No especificado'}
                  </div>
                </td>

                {/* Contacto */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email || 'No especificado'}</div>
                  {user.phone && (
                    <div className="text-xs text-gray-500">{user.phone}</div>
                  )}
                </td>

                {/* Rol */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClasses(user.role)}`}>
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                    {user.emailVerified ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" title="Email verificado" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 text-red-500" title="Email no verificado" />
                    )}
                  </div>
                </td>

                {/* Creado */}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {UserUtils.formatCreatedAt(user.createdAt)}
                </td>

                {/* Acciones */}
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {/* Editar */}
                    <button
                      type="button"
                      onClick={() => onEdit(user)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-gray-300 px-3 font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <FiEdit2 className="w-4 h-4" aria-hidden="true" />
                      Editar
                    </button>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => onDelete(user)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-gray-300 px-3 font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <TrashIcon className="w-4 h-4" aria-hidden="true" />
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTable;
