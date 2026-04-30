import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import Modal from '../ui/Modal';
import EvaluationScheduleCard from './EvaluationScheduleCard';
import {
  EvaluationSchedule,
  CreateGenericScheduleRequest,
  CreateIndividualScheduleRequest,
  EvaluationType,
  ScheduleStatus,
  ScheduleType,
  EVALUATION_TYPE_LABELS,
  SCHEDULE_STATUS_LABELS,
  ScheduleUtils
} from '../../types/evaluation';
import { evaluationService } from '../../services/evaluationService';
import { 
  CalendarIcon, 
  PlusIcon, 
  ClockIcon, 
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '../icons/Icons';

interface AdminScheduleManagerProps {
  className?: string;
}

const AdminScheduleManager: React.FC<AdminScheduleManagerProps> = ({ 
  className = '' 
}) => {
  const [schedules, setSchedules] = useState<EvaluationSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'generic' | 'individual'>('generic');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<ScheduleStatus | 'all'>('all');

  // Estados para el formulario de creación
  const [createForm, setCreateForm] = useState({
    evaluationType: EvaluationType.MATHEMATICS_EXAM,
    gradeLevel: '',
    subject: '',
    evaluatorId: 1, // Mock evaluator
    scheduledDate: '',
    durationMinutes: 90,
    location: '',
    instructions: '',
    applicationId: 1, // Solo para individual
    requiresConfirmation: true,
    attendeesRequired: ''
  });

  useEffect(() => {
    loadPendingConfirmations();
  }, []);

  const loadPendingConfirmations = async () => {
    try {
      setLoading(true);
      const pending = await evaluationService.getPendingConfirmations();
      setSchedules(pending);
    } catch (err: any) {
      console.warn('Error loading pending confirmations, using mock data');
      // Usar datos mock para desarrollo
      const mockSchedules = evaluationService.createLocalMockSchedules(1);
      setSchedules(mockSchedules.filter(s => 
        s.requiresConfirmation && !s.confirmedAt
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      setError(null);
      
      if (createMode === 'generic') {
        const request: CreateGenericScheduleRequest = {
          evaluationType: createForm.evaluationType,
          gradeLevel: createForm.gradeLevel,
          subject: createForm.subject,
          evaluatorId: createForm.evaluatorId,
          scheduledDate: createForm.scheduledDate,
          durationMinutes: createForm.durationMinutes,
          location: createForm.location,
          instructions: createForm.instructions
        };

        await evaluationService.createGenericSchedule(request);
      } else {
        const request: CreateIndividualScheduleRequest = {
          applicationId: createForm.applicationId,
          evaluationType: createForm.evaluationType,
          evaluatorId: createForm.evaluatorId,
          scheduledDate: createForm.scheduledDate,
          durationMinutes: createForm.durationMinutes,
          location: createForm.location,
          instructions: createForm.instructions,
          requiresConfirmation: createForm.requiresConfirmation,
          attendeesRequired: createForm.attendeesRequired
        };

        await evaluationService.createIndividualSchedule(request);
      }

      setShowCreateModal(false);
      resetForm();
      loadPendingConfirmations(); // Recargar datos
      
    } catch (err: any) {
      setError(err.message || 'Error al crear la programación');
    }
  };

  const resetForm = () => {
    setCreateForm({
      evaluationType: EvaluationType.MATHEMATICS_EXAM,
      gradeLevel: '',
      subject: '',
      evaluatorId: 1,
      scheduledDate: '',
      durationMinutes: 90,
      location: '',
      instructions: '',
      applicationId: 1,
      requiresConfirmation: true,
      attendeesRequired: ''
    });
  };

  const handleMarkComplete = async (schedule: EvaluationSchedule) => {
    try {
      await evaluationService.markAsCompleted(schedule.id);
      setSchedules(prev => prev.map(s => 
        s.id === schedule.id 
          ? { ...s, status: ScheduleStatus.COMPLETED } 
          : s
      ));
    } catch (err: any) {
      setError(err.message || 'Error al marcar como completada');
    }
  };

  const getFilteredSchedules = () => {
    let filtered = schedules;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }
    
    if (selectedDate) {
      filtered = filtered.filter(s => 
        s.scheduledDate.startsWith(selectedDate)
      );
    }

    return filtered.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  };

  const getScheduleStats = () => {
    const total = schedules.length;
    const confirmed = schedules.filter(s => s.status === ScheduleStatus.CONFIRMED).length;
    const completed = schedules.filter(s => s.status === ScheduleStatus.COMPLETED).length;
    const pending = schedules.filter(s => s.status === ScheduleStatus.SCHEDULED).length;
    
    return { total, confirmed, completed, pending };
  };

  const renderCreateModal = () => (
    <Modal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      title="Crear Nueva Programación"
      size="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Modo de creación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Programación
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setCreateMode('generic')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                createMode === 'generic'
                  ? 'bg-azul-monte-tabor text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Genérica
            </button>
            <button
              type="button"
              onClick={() => setCreateMode('individual')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                createMode === 'individual'
                  ? 'bg-azul-monte-tabor text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Individual
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tipo de evaluación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Evaluación *
            </label>
            <select
              value={createForm.evaluationType}
              onChange={(e) => setCreateForm(prev => ({
                ...prev,
                evaluationType: e.target.value as EvaluationType
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              {Object.values(EvaluationType).map(type => (
                <option key={type} value={type}>
                  {EVALUATION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {/* Nivel académico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nivel Académico *
            </label>
            <select
              value={createForm.gradeLevel}
              onChange={(e) => setCreateForm(prev => ({
                ...prev,
                gradeLevel: e.target.value
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="">Seleccionar nivel</option>
              <option value="Kinder">Kinder</option>
              <option value="1° Básico">1° Básico</option>
              <option value="2° Básico">2° Básico</option>
              <option value="3° Básico">3° Básico</option>
              <option value="4° Básico">4° Básico</option>
              <option value="5° Básico">5° Básico</option>
              <option value="6° Básico">6° Básico</option>
              <option value="7° Básico">7° Básico</option>
              <option value="8° Básico">8° Básico</option>
            </select>
          </div>

          {/* Fecha y hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha y Hora *
            </label>
            <input
              type="datetime-local"
              value={createForm.scheduledDate}
              onChange={(e) => setCreateForm(prev => ({
                ...prev,
                scheduledDate: e.target.value
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración (minutos) *
            </label>
            <select
              value={createForm.durationMinutes}
              onChange={(e) => setCreateForm(prev => ({
                ...prev,
                durationMinutes: parseInt(e.target.value)
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={90}>1.5 horas</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          {/* Ubicación */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación
            </label>
            <input
              type="text"
              value={createForm.location}
              onChange={(e) => setCreateForm(prev => ({
                ...prev,
                location: e.target.value
              }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Ej: Sala de Matemáticas 201"
            />
          </div>

          {/* Campos específicos para programación individual */}
          {createMode === 'individual' && (
            <>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={createForm.requiresConfirmation}
                    onChange={(e) => setCreateForm(prev => ({
                      ...prev,
                      requiresConfirmation: e.target.checked
                    }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    Requiere confirmación
                  </span>
                </label>
              </div>

              {createForm.requiresConfirmation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asistentes Requeridos
                  </label>
                  <input
                    type="text"
                    value={createForm.attendeesRequired}
                    onChange={(e) => setCreateForm(prev => ({
                      ...prev,
                      attendeesRequired: e.target.value
                    }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Ej: Estudiante y al menos un apoderado"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Instrucciones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instrucciones Especiales
          </label>
          <textarea
            value={createForm.instructions}
            onChange={(e) => setCreateForm(prev => ({
              ...prev,
              instructions: e.target.value
            }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            rows={3}
            placeholder="Instrucciones adicionales para el evaluador y/o familia"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowCreateModal(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleCreateSchedule}>
            Crear Programación
          </Button>
        </div>
      </div>
    </Modal>
  );

  const stats = getScheduleStats();
  const filteredSchedules = getFilteredSchedules();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-azul-monte-tabor">
          Gestión de Cronogramas
        </h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Nueva Programación
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Programadas</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pendientes</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          <div className="text-sm text-gray-600">Confirmadas</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completadas</div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ScheduleStatus | 'all')}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">Todos los estados</option>
              {Object.values(ScheduleStatus).map(status => (
                <option key={status} value={status}>
                  {SCHEDULE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Fecha
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
      </Card>

      {/* Lista de programaciones */}
      {loading ? (
        <Card className="p-8 text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Cargando programaciones...</p>
        </Card>
      ) : error ? (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-600">{error}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadPendingConfirmations}
                className="mt-2"
              >
                Reintentar
              </Button>
            </div>
          </div>
        </Card>
      ) : filteredSchedules.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay programaciones
          </h3>
          <p className="text-gray-600 mb-4">
            {filterStatus !== 'all' || selectedDate 
              ? 'No hay programaciones que coincidan con los filtros seleccionados.'
              : 'Aún no se han creado programaciones de evaluaciones.'
            }
          </p>
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            Crear Primera Programación
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSchedules.map(schedule => (
            <EvaluationScheduleCard
              key={schedule.id}
              schedule={schedule}
              variant="detailed"
              showActions={true}
              onMarkComplete={handleMarkComplete}
            />
          ))}
        </div>
      )}

      {renderCreateModal()}
    </div>
  );
};

export default AdminScheduleManager;