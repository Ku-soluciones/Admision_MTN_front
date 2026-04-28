import React, { useState, useEffect } from 'react';
import { FiClock, FiEdit2, FiTrash2, FiPlus, FiCheck, FiX, FiCalendar } from 'react-icons/fi';
import { scheduleService } from '../services/scheduleService';

interface AvailabilityScheduleManagerProps {
  interviewerId: number;
  interviewerName: string;
  readonly?: boolean;
}

interface Schedule {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  year: number;
  scheduleType: string;
  isActive: boolean;
  notes?: string;
}

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
];

const AvailabilityScheduleManager: React.FC<AvailabilityScheduleManagerProps> = ({
  interviewerId,
  interviewerName,
  readonly = false
}) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '10:00',
    notes: ''
  });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadSchedules();
  }, [interviewerId]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await scheduleService.getInterviewerAvailabilitySchedules(interviewerId);
      setSchedules(data);
    } catch (error) {
      console.error('Error cargando horarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      // Asegurar que interviewerId sea un número
      const numericInterviewerId = typeof interviewerId === 'string'
        ? parseInt(interviewerId, 10)
        : interviewerId;

      console.log('📅 Creando horario con interviewerId:', numericInterviewerId, typeof numericInterviewerId);

      await scheduleService.createAvailabilitySchedule({
        interviewerId: numericInterviewerId,
        dayOfWeek: formData.dayOfWeek,
        startTime: `${formData.startTime}:00`,
        endTime: `${formData.endTime}:00`,
        year: currentYear,
        scheduleType: 'RECURRING',
        isActive: true,
        notes: formData.notes
      });

      setShowAddForm(false);
      setFormData({
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '10:00',
        notes: ''
      });

      await loadSchedules();
    } catch (error: any) {
      console.error('Error agregando horario:', error);

      // Manejo más detallado de errores
      if (error.response) {
        const errorMessage = error.response.data?.error?.message || error.response.data?.message || 'Error desconocido';
        alert(`Error al agregar horario: ${errorMessage} (${error.response.status})`);
      } else if (error.request) {
        alert('Error de conexión. No se pudo contactar con el servidor.');
      } else {
        alert(`Error al agregar horario: ${error.message || 'Error desconocido'}`);
      }
    }
  };

  const handleUpdate = async (scheduleId: number, updates: Partial<Schedule>) => {
    try {
      // Si se está actualizando la hora, agregar los segundos
      const updateData: any = { ...updates };
      if (updateData.startTime && !updateData.startTime.includes(':00')) {
        updateData.startTime = `${updateData.startTime}:00`;
      }
      if (updateData.endTime && !updateData.endTime.includes(':00')) {
        updateData.endTime = `${updateData.endTime}:00`;
      }

      await scheduleService.updateAvailabilitySchedule(scheduleId, updateData);
      setEditingId(null);
      await loadSchedules();
    } catch (error) {
      console.error('Error actualizando horario:', error);
      alert('Error al actualizar horario');
    }
  };

  const handleDelete = async (scheduleId: number) => {
    if (!confirm('¿Está seguro de eliminar este horario?')) return;

    try {
      await scheduleService.deleteAvailabilitySchedule(scheduleId);
      await loadSchedules();
    } catch (error) {
      console.error('Error eliminando horario:', error);
      alert('Error al eliminar horario');
    }
  };

  const handleToggleActive = async (scheduleId: number, isActive: boolean) => {
    try {
      await scheduleService.toggleAvailability(scheduleId, !isActive);
      await loadSchedules();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar estado del horario');
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5); // "HH:MM:SS" -> "HH:MM"
  };

  const getSchedulesByDay = (day: string) => {
    return schedules
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Cargando horarios...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FiCalendar className="mr-2" />
            Gestión de Horarios de Disponibilidad
          </h2>
          <p className="text-gray-600 mt-1">
            Entrevistador: <span className="font-semibold">{interviewerName}</span>
          </p>
        </div>

        {!readonly && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="mr-2" />
            Agregar Horario
          </button>
        )}
      </div>

      {/* Formulario de agregar */}
      {showAddForm && !readonly && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">Nuevo Horario</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej: Sala 201"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleAdd}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <FiCheck className="mr-2" />
              Guardar
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              <FiX className="mr-2" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Calendario semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {DAYS_OF_WEEK.map(day => {
          const daySchedules = getSchedulesByDay(day.value);

          return (
            <div key={day.value} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-lg text-gray-800 mb-3 border-b pb-2">
                {day.label}
              </h3>

              {daySchedules.length === 0 ? (
                <p className="text-gray-400 text-sm italic">Sin horarios configurados</p>
              ) : (
                <div className="space-y-2">
                  {daySchedules.map(schedule => (
                    <div
                      key={schedule.id}
                      className={`p-3 rounded-md border ${
                        schedule.isActive
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FiClock className={schedule.isActive ? 'text-green-600' : 'text-gray-400'} />
                          <span className="font-semibold text-gray-800">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </span>
                        </div>

                        {!readonly && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                              className={`p-1 rounded hover:bg-white transition-colors ${
                                schedule.isActive ? 'text-green-600' : 'text-gray-400'
                              }`}
                              title={schedule.isActive ? 'Desactivar' : 'Activar'}
                            >
                              <FiCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(schedule.id)}
                              className="p-1 text-red-600 hover:bg-white rounded transition-colors"
                              title="Eliminar"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {schedule.notes && (
                        <p className="text-xs text-gray-600 mt-1">{schedule.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {schedules.length === 0 && !showAddForm && (
        <div className="text-center py-8">
          <FiCalendar className="mx-auto w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600">No hay horarios configurados</p>
          {!readonly && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-blue-600 hover:underline"
            >
              Agregar primer horario
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailabilityScheduleManager;
