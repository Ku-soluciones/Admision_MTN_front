import React from 'react';
import Button from '../ui/Button';
import {
  UserFilters as UserFiltersType,
  UserFiltersProps,
  UserRole,
  USER_ROLE_LABELS,
  UserUtils
} from '../../types/user';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '../icons/Icons';

const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  onChange,
  onReset,
  className = ''
}) => {

  const handleSearchChange = (search: string) => {
    onChange({ ...filters, search: search || undefined, page: 0 });
  };

  const handleRoleChange = (role: string) => {
    onChange({ 
      ...filters, 
      role: role ? (role as UserRole) : undefined, 
      page: 0 
    });
  };

  const handleStatusChange = (status: string) => {
    const active = status === 'active' ? true : status === 'inactive' ? false : undefined;
    onChange({ ...filters, active, page: 0 });
  };

  const hasActiveFilters = filters.search || filters.role || filters.active !== undefined;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barra de búsqueda */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, email o RUT..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
        />
      </div>

      {/* Filtros en línea */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Filtro por rol */}
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <label htmlFor="role-filter" className="text-sm font-medium text-gray-700">
            Rol:
          </label>
          <select
            id="role-filter"
            value={filters.role || ''}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
          >
            <option value="">Todos los roles</option>
            {UserUtils.getSystemRoles().map(role => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por estado */}
        <div className="flex items-center space-x-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Estado:
          </label>
          <select
            id="status-filter"
            value={filters.active === true ? 'active' : filters.active === false ? 'inactive' : ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        {/* Botón limpiar filtros */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="flex items-center space-x-1"
          >
            <XMarkIcon className="h-4 w-4" />
            <span>Limpiar filtros</span>
          </Button>
        )}
      </div>

      {/* Resumen de filtros activos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>Filtros activos:</span>
          
          {filters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Búsqueda: "{filters.search}"
            </span>
          )}
          
          {filters.role && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Rol: {USER_ROLE_LABELS[filters.role]}
            </span>
          )}
          
          {filters.active !== undefined && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              Estado: {filters.active ? 'Activos' : 'Inactivos'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UserFilters;