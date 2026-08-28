import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../../config/api.config';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import SimpleToast from '../ui/SimpleToast';
import Pagination from '../ui/Pagination';
import UserForm from './UserForm';
import UserTable from './UserTable';
import UserFilters from './UserFilters';
import UserStats from './UserStats';
import SimpleAvailabilityCalendar from '../schedule/SimpleAvailabilityCalendar';
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
import { staffService } from '../../services/staffService';
import {
  PlusIcon,
  UsersIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowLeftIcon
} from '../icons/Icons';

interface StaffManagementProps {
  onBack?: () => void;
  hideHeader?: boolean;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ onBack, hideHeader = false }) => {
  const [state, setState] = useState<UserManagementState>({
    users: [],
    selectedUser: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    filters: { page: 0, size: 10 }, // Tamaño inicial más razonable
    pagination: { page: 0, size: 10, total: 0, totalPages: 0 },
    stats: null
  });

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<UserFormMode>(UserFormMode.CREATE);
  const [showStats, setShowStats] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [scheduleUser, setScheduleUser] = useState<User | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const actionInFlight = useRef(false);
  const [confirmError, setConfirmError] = useState('');
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

  // Modal de error 409 - Usuario con datos asociados
  const [conflictDialog, setConflictDialog] = useState<{
    show: boolean;
    user: User | null;
    details: {
      evaluations: number;
      interviews: number;
      schedules: number;
    } | null;
  }>({
    show: false,
    user: null,
    details: null
  });

  // Cargar usuarios
  const loadUsers = useCallback(async (filters: UserFiltersType = state.filters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await staffService.getStaffUsers(filters);

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
      const stats = await staffService.getStaffStats();
      setState(prev => ({ ...prev, stats }));
    } catch (error: any) {
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
    loadUsers(newFilters);
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
        await staffService.createStaffUser(data as CreateUserRequest);
        showToast('Usuario creado exitosamente', 'success');
      } else if (formMode === UserFormMode.EDIT && state.selectedUser) {
        await staffService.updateStaffUser(state.selectedUser.id, data as UpdateUserRequest);
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
    setConfirmError('');
    let message = '';
    
    switch (action) {
      case 'delete':
        message = `¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE al usuario ${user.fullName}?\n\nEsta acción:\n• Eliminará completamente la cuenta del usuario\n• El usuario no podrá acceder al sistema\n• NO se puede deshacer esta acción\n• Se perderán todos los datos asociados\n\nIMPORTANTE: Si este usuario tiene evaluaciones asociadas, no se podrá eliminar y deberás desactivarlo en su lugar.`;
        break;
      case 'toggle':
        message = user.active 
          ? `¿Estás seguro de que deseas desactivar al usuario ${user.fullName}?\n\nEl usuario no podrá acceder al sistema, pero se mantendrán todas sus evaluaciones y datos asociados.`
          : `¿Estás seguro de que deseas activar al usuario ${user.fullName}?`;
        break;
      case 'reset':
        message = '';
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
    if (actionInFlight.current) return;
    const { user, action } = confirmDialog;
    if (!user || !action) return;

    actionInFlight.current = true;
    setActionPending(true);
    setConfirmError('');
    try {
      switch (action) {
        case 'delete':
          await staffService.deleteStaffUser(user.id);
          showToast('Usuario eliminado permanentemente', 'success');
          break;
        case 'toggle':
          if (user.active) {
            await staffService.deactivateStaffUser(user.id);
            showToast('Usuario desactivado exitosamente', 'success');
          } else {
            await staffService.activateStaffUser(user.id);
            showToast('Usuario activado exitosamente', 'success');
          }
          break;
        case 'reset':
          const result = await staffService.resetStaffPassword(user.id);
          if (!result.notificationSent) throw new Error('El proveedor no confirmó el envío del correo');
          showToast(`Contraseña temporal enviada a ${result.email}`, 'success');
          break;
      }

      await loadUsers();
      await loadStats();
      setConfirmDialog({ show: false, user: null, action: null, message: '' });

    } catch (error: any) {
      // Capturar error 409 (Conflict) específicamente
      // El error puede venir de dos formas:
      // 1. error.response?.status (Axios directo)
      // 2. error.status (HttpError del cliente http.ts)
      const errorStatus = error.response?.status || error.status;

      if (errorStatus === 409 && action === 'delete') {
        // Cerrar el modal de confirmación
        setConfirmDialog({ show: false, user: null, action: null, message: '' });

        // Obtener detalles de los datos asociados
        try {
          const response = await fetch(`${getApiBaseUrl()}/v1/users/${user.id}/associated-data`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          const details = await response.json();

          // Mostrar modal con detalles
          setConflictDialog({
            show: true,
            user,
            details: details.data || { evaluations: 0, interviews: 0, schedules: 0 }
          });
        } catch (fetchError) {
          // Si falla la consulta de detalles, mostrar modal sin números específicos
          setConflictDialog({
            show: true,
            user,
            details: null
          });
        }
        return;
      }

      // Mostrar mensaje específico para usuarios con evaluaciones (fallback)
      let errorMessage = error.message || 'Error al ejecutar la acción';

      if (error.message && error.message.includes('evaluación(es) asociada(s)')) {
        errorMessage = error.message;
      } else if (error.message && error.message.includes('foreign key constraint')) {
        errorMessage = `No se puede eliminar este usuario porque tiene datos asociados en el sistema. Para mantener la integridad de la información, te recomendamos desactivar el usuario en lugar de eliminarlo.`;
      }

      if (action === 'reset') {
        setConfirmError(errorMessage);
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      actionInFlight.current = false;
      setActionPending(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      {hideHeader ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Personal del Colegio</h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">Personal del colegio y administradores del sistema</p>
          </div>
          <button
            type="button"
            onClick={() => openForm(UserFormMode.CREATE)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-400 bg-dorado-nazaret px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Nuevo Usuario
          </button>
        </div>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Gestión de Usuarios</p>
              <h1 className="mt-1 text-lg font-bold text-gray-950">Gestión de Usuarios</h1>
              <p className="mt-0.5 max-w-3xl text-sm text-gray-600">Personal del colegio y administradores del sistema</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                  Volver
                </button>
              )}
              <button
                type="button"
                onClick={() => openForm(UserFormMode.CREATE)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-400 bg-dorado-nazaret px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Nuevo Usuario
              </button>
            </div>
          </div>
        </section>
      )}


      {/* Filtros */}
      <UserFilters
        filters={state.filters}
        onChange={handleFiltersChange}
        onReset={() => handleFiltersChange({ page: 0, size: 10 })}
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
      {state.pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            Mostrando {state.pagination.page * state.pagination.size + 1}–{Math.min((state.pagination.page + 1) * state.pagination.size, state.pagination.total)} de {state.pagination.total}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">Por página:</span>
              <select
                value={state.pagination.size}
                onChange={(e) => handleFiltersChange({ ...state.filters, size: Number(e.target.value), page: 0 })}
                className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            {state.pagination.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => handlePageChange(0)} disabled={state.pagination.page === 0} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">«</button>
                <button onClick={() => handlePageChange(state.pagination.page - 1)} disabled={state.pagination.page === 0} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">‹</button>
                <span className="px-3 py-1 rounded border text-xs bg-azul-monte-tabor text-white">{state.pagination.page + 1} / {state.pagination.totalPages}</span>
                <button onClick={() => handlePageChange(state.pagination.page + 1)} disabled={state.pagination.page >= state.pagination.totalPages - 1} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">›</button>
                <button onClick={() => handlePageChange(state.pagination.totalPages - 1)} disabled={state.pagination.page >= state.pagination.totalPages - 1} className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-100">»</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal del formulario */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={formMode === UserFormMode.CREATE ? 'Nuevo Usuario' : 'Editar Usuario'}
        size="xl"
      >

        <UserForm
          user={state.selectedUser}
          mode={formMode}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          isSubmitting={state.isSubmitting}
          onManageSchedule={(u: any) => {
            closeForm();
            setScheduleUser(u as User);
          }}
        />
      </Modal>

      {/* Modal de gestión de horarios */}
      <Modal
        isOpen={!!scheduleUser}
        onClose={() => setScheduleUser(null)}
        title={`Gestión de Horarios - ${scheduleUser?.firstName || ''} ${scheduleUser?.lastName || ''}`}
        size="xl"
      >
        {scheduleUser && (
          <div className="space-y-4">
            <SimpleAvailabilityCalendar
              userId={scheduleUser.id}
              userRole={scheduleUser.role}
              onScheduleChange={() => {
                setToast({ message: 'Horarios guardados exitosamente', type: 'success' });
                setScheduleUser(null);
              }}
            />
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setScheduleUser(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de confirmación */}
      <Modal
        isOpen={confirmDialog.show}
        onClose={() => {
          if (!actionPending) setConfirmDialog({ show: false, user: null, action: null, message: '' });
        }}
        title={confirmDialog.action === 'reset' ? 'Restablecer contraseña' : 'Confirmar Acción'}
        size="md"
      >
        <div className="space-y-4">
          {confirmDialog.action === 'reset' && confirmDialog.user ? (
            <>
              <dl className="grid gap-2 rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Usuario</dt>
                  <dd className="font-semibold text-gray-950">{confirmDialog.user.fullName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Correo</dt>
                  <dd className="break-all font-medium text-gray-950">{confirmDialog.user.email}</dd>
                </div>
              </dl>
              <p className="text-sm leading-6 text-gray-700">
                Se cerrarán sus sesiones y recibirá una contraseña temporal válida por 24 horas. Deberá cambiarla al ingresar antes de acceder al portal.
              </p>
              {confirmError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">{confirmError}</p>
              )}
            </>
          ) : (
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-500 mt-1" />
              <p className="text-gray-700 whitespace-pre-line">{confirmDialog.message}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              disabled={actionPending}
              onClick={() => setConfirmDialog({ show: false, user: null, action: null, message: '' })}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={executeAction}
              isLoading={actionPending}
              loadingText={confirmDialog.action === 'reset' ? 'Generando y enviando…' : 'Procesando…'}
              className={confirmDialog.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmDialog.action === 'delete'
                ? 'Eliminar Permanentemente'
                : confirmDialog.action === 'reset'
                  ? 'Generar y enviar contraseña'
                  : 'Confirmar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de error 409 - Usuario con datos asociados */}
      <Modal
        isOpen={conflictDialog.show}
        onClose={() => setConflictDialog({ show: false, user: null, details: null })}
        title="No se puede eliminar el usuario"
        size="lg"
      >
        <div className="space-y-6">
          {/* Encabezado con icono de advertencia */}
          <div className="flex items-start space-x-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Usuario con datos asociados
              </h3>
              <p className="text-red-700">
                El usuario <span className="font-semibold">{conflictDialog.user?.fullName}</span> no puede ser eliminado
                porque tiene información vinculada en el sistema que debe preservarse.
              </p>
            </div>
          </div>

          {/* Detalles de datos asociados */}
          {conflictDialog.details && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Datos asociados encontrados:</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-blue-600">{conflictDialog.details.evaluations}</div>
                  <div className="text-xs text-gray-600 mt-1">Evaluaciones</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-purple-600">{conflictDialog.details.interviews}</div>
                  <div className="text-xs text-gray-600 mt-1">Entrevistas</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-green-600">{conflictDialog.details.schedules}</div>
                  <div className="text-xs text-gray-600 mt-1">Horarios</div>
                </div>
              </div>
            </div>
          )}

          {/* Razones por las que no se puede eliminar */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">¿Por qué no se puede eliminar?</h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Trazabilidad:</span> Las evaluaciones deben mantener el registro histórico del evaluador que las realizó.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Auditoría:</span> El sistema educativo requiere preservar el historial completo de actividades.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Integridad:</span> Eliminar este usuario rompería las relaciones de datos en el sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Solución recomendada */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
              <InformationCircleIcon className="w-5 h-5 mr-2" />
              Solución Recomendada
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              En lugar de eliminar el usuario, puedes <span className="font-semibold">desactivarlo</span>. Esto:
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 ml-4">
              <li>Impedirá que el usuario acceda al sistema</li>
              <li>Mantendrá toda la información histórica intacta</li>
              <li>Preservará las evaluaciones y registros asociados</li>
              <li>Permitirá reactivar el usuario si es necesario en el futuro</li>
            </ul>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setConflictDialog({ show: false, user: null, details: null })}
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                if (conflictDialog.user) {
                  setConflictDialog({ show: false, user: null, details: null });
                  confirmAction(conflictDialog.user, 'toggle'); // Abrir modal de desactivación
                }
              }}
            >
              Desactivar Usuario
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

export default StaffManagement;
