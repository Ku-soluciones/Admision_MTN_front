import React, { useState, useEffect, useCallback } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import SimpleToast from '../ui/SimpleToast';
import Pagination from '../ui/Pagination';
import UserForm from './UserForm';
import UserTable from './UserTable';
import UserFilters from './UserFilters';
import UserStats from './UserStats';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters as UserFiltersType,
  UserFormMode,
  UserManagementState,
  PagedResponse,
  UserStats as UserStatsType
} from '../../types/user';
import { guardianService } from '../../services/guardianService';
import {
  PlusIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowLeftIcon
} from '../icons/Icons';

interface GuardianManagementProps {
  onBack?: () => void;
}

const GuardianManagement: React.FC<GuardianManagementProps> = ({ onBack }) => {
  // Función para calcular el mejor tamaño de página
  const getOptimalPageSize = (totalUsers: number): number => {
    if (totalUsers <= 20) return Math.max(10, totalUsers);  // Mínimo 10, pero si hay menos, mostrar todos
    if (totalUsers <= 50) return 15;  // Para colegios medianos
    if (totalUsers <= 100) return 20; // Para colegios grandes
    return 25; // Para instituciones muy grandes
  };

  const [state, setState] = useState<UserManagementState>({
    users: [],
    selectedUser: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    filters: { page: 0, size: 15 }, // Tamaño inicial más razonable
    pagination: { page: 0, size: 15, total: 0, totalPages: 0 },
    stats: null
  });

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<UserFormMode>(UserFormMode.CREATE);
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    user: User | null;
    action: 'delete' | 'toggle' | 'reset' | null;
    message: string;
  }>({
    show: false,
    user: null,
    action: null,
    message: ''
  });

  // Cargar usuarios
  const loadUsers = useCallback(async (filters: UserFiltersType = state.filters, skipOptimalSize: boolean = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await guardianService.getGuardianUsers(filters);
      
      // Si es la primera carga y no estamos evitando el ajuste automático,
      // ajustar el tamaño de página según el total de usuarios
      let updatedFilters = filters;
      if (!skipOptimalSize && response.totalElements > 0) {
        const optimalSize = getOptimalPageSize(response.totalElements);
        if (filters.size !== optimalSize) {
          updatedFilters = { ...filters, size: optimalSize, page: 0 };
          
          // Recargar con el nuevo tamaño óptimo
          const reloadResponse = await guardianService.getGuardianUsers(updatedFilters);
          
          setState(prev => ({
            ...prev,
            users: reloadResponse.content,
            filters: updatedFilters,
            pagination: {
              page: reloadResponse.number,
              size: reloadResponse.size,
              total: reloadResponse.totalElements,
              totalPages: reloadResponse.totalPages
            },
            isLoading: false
          }));
          return;
        }
      }
      
      setState(prev => ({
        ...prev,
        users: response.content,
        pagination: {
          page: response.number,
          size: response.size,
          total: response.totalElements,
          totalPages: response.totalPages
        },
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
      
      showToast('Error al cargar los usuarios', 'error');
    }
  }, [state.filters]);

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      const stats = await guardianService.getGuardianStats();
      setState(prev => ({ ...prev, stats }));
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
      // Si es 401, no mostrar error ya que la redirección se maneja en api.ts
      if (error.response?.status !== 401) {
        showToast('Error al cargar estadísticas de usuarios', 'error');
      }
    }
  }, []);

  // Efectos
  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  // Manejar cambios de filtros
  const handleFiltersChange = useCallback((newFilters: UserFiltersType) => {
    setState(prev => ({ ...prev, filters: newFilters }));
    // Evitar ajuste automático de tamaño cuando el usuario está cambiando filtros manualmente
    loadUsers(newFilters, true);
  }, [loadUsers]);

  // Manejar paginación
  const handlePageChange = useCallback((page: number) => {
    const newFilters = { ...state.filters, page };
    handleFiltersChange(newFilters);
  }, [state.filters, handleFiltersChange]);

  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Abrir formulario
  const openForm = (mode: UserFormMode, user?: User) => {
    setFormMode(mode);
    setState(prev => ({ ...prev, selectedUser: user || null }));
    setShowForm(true);
  };

  // Cerrar formulario
  const closeForm = () => {
    setShowForm(false);
    setState(prev => ({ ...prev, selectedUser: null }));
  };

  // Manejar envío del formulario
  const handleFormSubmit = async (data: CreateUserRequest | UpdateUserRequest) => {
    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      if (formMode === UserFormMode.CREATE) {
        await guardianService.createGuardianUser(data as CreateUserRequest);
        showToast('Usuario creado exitosamente', 'success');
      } else if (formMode === UserFormMode.EDIT && state.selectedUser) {
        await guardianService.updateGuardianUser(state.selectedUser.id, data as UpdateUserRequest);
        showToast('Usuario actualizado exitosamente', 'success');
      }

      closeForm();
      await loadUsers();
      await loadStats();
      
    } catch (error: any) {
      showToast(error.message || 'Error al guardar el usuario', 'error');
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  // Confirmar acción
  const confirmAction = (user: User, action: 'delete' | 'toggle' | 'reset') => {
    let message = '';
    
    switch (action) {
      case 'delete':
        message = `⚠️ ¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE al usuario ${user.fullName}?\n\nEsta acción:\n• Eliminará completamente la cuenta del usuario\n• El usuario no podrá acceder al sistema\n• NO se puede deshacer esta acción\n• Se perderán todos los datos asociados\n\n⚠️ IMPORTANTE: Si este usuario tiene evaluaciones asociadas, no se podrá eliminar y deberás desactivarlo en su lugar.`;
        break;
      case 'toggle':
        message = user.active 
          ? `¿Estás seguro de que deseas desactivar al usuario ${user.fullName}?\n\nEl usuario no podrá acceder al sistema, pero se mantendrán todas sus evaluaciones y datos asociados.`
          : `¿Estás seguro de que deseas activar al usuario ${user.fullName}?`;
        break;
      case 'reset':
        message = `¿Estás seguro de que deseas restablecer la contraseña del usuario ${user.fullName}? Se enviará un email con la nueva contraseña.`;
        break;
    }

    setConfirmDialog({
      show: true,
      user,
      action,
      message
    });
  };

  // Ejecutar acción confirmada
  const executeAction = async () => {
    const { user, action } = confirmDialog;
    if (!user || !action) return;

    try {
      switch (action) {
        case 'delete':
          await guardianService.deleteGuardianUser(user.id);
          showToast('Usuario eliminado permanentemente', 'success');
          break;
        case 'toggle':
          if (user.active) {
            await guardianService.deactivateGuardianUser(user.id);
            showToast('Usuario desactivado exitosamente', 'success');
          } else {
            await guardianService.activateGuardianUser(user.id);
            showToast('Usuario activado exitosamente', 'success');
          }
          break;
        case 'reset':
          await guardianService.resetGuardianPassword(user.id);
          showToast('Contraseña restablecida exitosamente', 'success');
          break;
      }

      await loadUsers();
      await loadStats();
      
    } catch (error: any) {
      // Mostrar mensaje específico para usuarios con evaluaciones
      let errorMessage = error.message || 'Error al ejecutar la acción';
      
      if (error.message && error.message.includes('evaluación(es) asociada(s)')) {
        errorMessage = error.message;
      } else if (error.message && error.message.includes('foreign key constraint')) {
        errorMessage = `No se puede eliminar este usuario porque tiene datos asociados en el sistema. Para mantener la integridad de la información, te recomendamos desactivar el usuario en lugar de eliminarlo.`;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setConfirmDialog({ show: false, user: null, action: null, message: '' });
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {onBack && (
            <Button 
              onClick={onBack}
              variant="outline"
              className="flex items-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Volver
            </Button>
          )}
          <UsersIcon className="w-8 h-8 text-azul-monte-tabor flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Usuarios
            </h1>
            <p className="text-sm text-gray-600">
              Administra los usuarios del sistema de admisión
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowStats(!showStats)}
          >
            <ChartBarIcon className="w-5 h-5 mr-2" />
            {showStats ? 'Ocultar' : 'Ver'} Estadísticas
          </Button>
          
          <Button onClick={() => openForm(UserFormMode.CREATE)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {showStats && state.stats && (
        <UserStats stats={state.stats} />
      )}

      {/* Filtros */}
      <UserFilters
        filters={state.filters}
        onChange={handleFiltersChange}
        onReset={() => handleFiltersChange({ page: 0, size: 15 })}
      />

      {/* Error */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{state.error}</p>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <UserTable
        users={state.users}
        isLoading={state.isLoading}
        onEdit={(user) => openForm(UserFormMode.EDIT, user)}
        onDelete={(user) => confirmAction(user, 'delete')}
        onToggleStatus={(user) => confirmAction(user, 'toggle')}
        onResetPassword={(user) => confirmAction(user, 'reset')}
      />

      {/* Paginación */}
      {state.pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={state.pagination.page}
            totalPages={state.pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Modal del formulario */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={formMode === UserFormMode.CREATE ? 'Nuevo Usuario' : 'Editar Usuario'}
        size="lg"
      >
        <UserForm
          user={state.selectedUser}
          mode={formMode}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          isSubmitting={state.isSubmitting}
        />
      </Modal>

      {/* Modal de confirmación */}
      <Modal
        isOpen={confirmDialog.show}
        onClose={() => setConfirmDialog({ show: false, user: null, action: null, message: '' })}
        title="Confirmar Acción"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-orange-500 mt-1" />
            <p className="text-gray-700 whitespace-pre-line">{confirmDialog.message}</p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ show: false, user: null, action: null, message: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={executeAction}
              className={confirmDialog.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmDialog.action === 'delete' ? 'Eliminar Permanentemente' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default GuardianManagement;