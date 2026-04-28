import React, { useState, useEffect } from 'react';
import { interviewerScheduleService, InterviewerSchedule, User, getDayOfWeekOptions, getScheduleTypeOptions, getTimeSlotOptions } from '../../services/interviewerScheduleService';
import { Calendar, Clock, Plus, Edit, Trash2, Save, X, AlertCircle, CheckCircle, Users, BarChart3 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface InterviewerScheduleManagerProps {
    currentUser: User;
    isAdmin?: boolean;
    year?: number;
}

const InterviewerScheduleManager: React.FC<InterviewerScheduleManagerProps> = ({ 
    currentUser, 
    isAdmin = false,
    year = new Date().getFullYear()
}) => {
    const [schedules, setSchedules] = useState<InterviewerSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<InterviewerSchedule | null>(null);
    const [selectedYear, setSelectedYear] = useState(year);
    const [interviewers, setInterviewers] = useState<User[]>([]);
    const [selectedInterviewer, setSelectedInterviewer] = useState<User | null>(isAdmin ? null : currentUser);

    // Form state
    const [formData, setFormData] = useState({
        scheduleType: 'RECURRING' as 'RECURRING' | 'SPECIFIC_DATE' | 'EXCEPTION',
        dayOfWeek: 'MONDAY',
        specificDate: '',
        startTime: '09:00',
        endTime: '10:00',
        notes: ''
    });

    // Load data on component mount
    useEffect(() => {
        if (selectedInterviewer) {
            loadSchedules();
        }
        if (isAdmin) {
            loadInterviewers();
        }
    }, [selectedInterviewer, selectedYear]);

    const loadSchedules = async () => {
        if (!selectedInterviewer) return;
        
        try {
            setLoading(true);
            const data = await interviewerScheduleService.getInterviewerSchedulesByYear(
                selectedInterviewer.id, 
                selectedYear
            );
            setSchedules(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar horarios');
        } finally {
            setLoading(false);
        }
    };

    const loadInterviewers = async () => {
        try {
            const data = await interviewerScheduleService.getInterviewersWithSchedules(selectedYear);
            setInterviewers(data);
        } catch (err) {
            console.error('Error loading interviewers:', err);
        }
    };

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInterviewer) return;

        try {
            const scheduleData = {
                interviewer: selectedInterviewer,
                scheduleType: formData.scheduleType,
                dayOfWeek: formData.scheduleType === 'RECURRING' ? formData.dayOfWeek : undefined,
                specificDate: formData.scheduleType !== 'RECURRING' ? formData.specificDate : undefined,
                startTime: formData.startTime,
                endTime: formData.endTime,
                year: selectedYear,
                notes: formData.notes,
                isActive: true
            };

            await interviewerScheduleService.createSchedule(scheduleData);
            setShowCreateForm(false);
            resetForm();
            loadSchedules();
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear horario');
        }
    };

    const handleUpdateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchedule) return;

        try {
            const updateData = {
                scheduleType: formData.scheduleType,
                dayOfWeek: formData.scheduleType === 'RECURRING' ? formData.dayOfWeek : undefined,
                specificDate: formData.scheduleType !== 'RECURRING' ? formData.specificDate : undefined,
                startTime: formData.startTime,
                endTime: formData.endTime,
                notes: formData.notes
            };

            await interviewerScheduleService.updateSchedule(editingSchedule.id!, updateData);
            setEditingSchedule(null);
            resetForm();
            loadSchedules();
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar horario');
        }
    };

    const handleDeleteSchedule = async (scheduleId: number) => {
        if (!confirm('¿Está seguro de que desea eliminar este horario?')) return;

        try {
            await interviewerScheduleService.deleteSchedule(scheduleId);
            loadSchedules();
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al eliminar horario');
        }
    };

    const handleDeactivateSchedule = async (scheduleId: number) => {
        if (!confirm('¿Está seguro de que desea desactivar este horario?')) return;

        try {
            await interviewerScheduleService.deactivateSchedule(scheduleId);
            loadSchedules();
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al desactivar horario');
        }
    };

    const startEditing = (schedule: InterviewerSchedule) => {
        setEditingSchedule(schedule);
        setFormData({
            scheduleType: schedule.scheduleType,
            dayOfWeek: schedule.dayOfWeek || 'MONDAY',
            specificDate: schedule.specificDate || '',
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            notes: schedule.notes || ''
        });
    };

    const resetForm = () => {
        setFormData({
            scheduleType: 'RECURRING',
            dayOfWeek: 'MONDAY',
            specificDate: '',
            startTime: '09:00',
            endTime: '10:00',
            notes: ''
        });
    };

    const getScheduleTypeLabel = (type: string) => {
        const option = getScheduleTypeOptions().find(opt => opt.value === type);
        return option?.label || type;
    };

    const getDayLabel = (day?: string) => {
        if (!day) return '';
        const option = getDayOfWeekOptions().find(opt => opt.value === day);
        return option?.label || day;
    };

    const formatTime = (time: string) => {
        return time;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('es-CL');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-center">
                    <Clock className="w-8 h-8 text-azul-monte-tabor mx-auto mb-2 animate-spin" />
                    <p className="text-gris-piedra">Cargando horarios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-azul-monte-tabor mb-2">
                        {isAdmin ? 'Gestión de Horarios de Entrevistadores' : 'Mis Horarios de Entrevista'}
                    </h2>
                    <p className="text-gris-piedra">
                        {isAdmin 
                            ? 'Administra los horarios de disponibilidad de todos los entrevistadores'
                            : 'Configura tus horarios de disponibilidad para entrevistas'
                        }
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Year selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gris-piedra" />
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                            {[2024, 2025, 2026].map(yr => (
                                <option key={yr} value={yr}>{yr}</option>
                            ))}
                        </select>
                    </div>

                    {/* Interviewer selector for admin */}
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gris-piedra" />
                            <select 
                                value={selectedInterviewer?.id || ''} 
                                onChange={(e) => {
                                    const interviewer = interviewers.find(i => i.id === Number(e.target.value));
                                    setSelectedInterviewer(interviewer || null);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">Seleccionar entrevistador</option>
                                {interviewers.map(interviewer => (
                                    <option key={interviewer.id} value={interviewer.id}>
                                        {interviewer.firstName} {interviewer.lastName} ({interviewer.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <Button
                        onClick={() => setShowCreateForm(true)}
                        leftIcon={<Plus className="w-4 h-4" />}
                        disabled={!selectedInterviewer}
                    >
                        Nuevo Horario
                    </Button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <Card className="p-4 border-red-200 bg-red-50">
                    <div className="flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setError(null)}
                            className="ml-auto"
                        >
                            <X className="w-3 h-3" />
                        </Button>
                    </div>
                </Card>
            )}

            {/* Selected interviewer info */}
            {selectedInterviewer && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-azul-monte-tabor" />
                        <div>
                            <h3 className="font-semibold text-azul-monte-tabor">
                                {selectedInterviewer.firstName} {selectedInterviewer.lastName}
                            </h3>
                            <p className="text-sm text-gris-piedra">
                                {selectedInterviewer.role} - {selectedInterviewer.email}
                            </p>
                        </div>
                        <Badge variant="info">{schedules.length} horarios configurados</Badge>
                    </div>
                </Card>
            )}

            {/* Create/Edit Form */}
            {(showCreateForm || editingSchedule) && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4">
                        {editingSchedule ? 'Editar Horario' : 'Crear Nuevo Horario'}
                    </h3>
                    <form onSubmit={editingSchedule ? handleUpdateSchedule : handleCreateSchedule} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Schedule Type */}
                            <div>
                                <label className="block text-sm font-medium text-gris-piedra mb-2">
                                    Tipo de Horario
                                </label>
                                <select
                                    value={formData.scheduleType}
                                    onChange={(e) => setFormData({...formData, scheduleType: e.target.value as any})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                >
                                    {getScheduleTypeOptions().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Day of week or specific date */}
                            {formData.scheduleType === 'RECURRING' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gris-piedra mb-2">
                                        Día de la Semana
                                    </label>
                                    <select
                                        value={formData.dayOfWeek}
                                        onChange={(e) => setFormData({...formData, dayOfWeek: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                    >
                                        {getDayOfWeekOptions().map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gris-piedra mb-2">
                                        Fecha Específica
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.specificDate}
                                        onChange={(e) => setFormData({...formData, specificDate: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                        required
                                    />
                                </div>
                            )}

                            {/* Start time */}
                            <div>
                                <label className="block text-sm font-medium text-gris-piedra mb-2">
                                    Hora de Inicio
                                </label>
                                <select
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                >
                                    {getTimeSlotOptions().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* End time */}
                            <div>
                                <label className="block text-sm font-medium text-gris-piedra mb-2">
                                    Hora de Fin
                                </label>
                                <select
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                >
                                    {getTimeSlotOptions().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gris-piedra mb-2">
                                Notas (opcional)
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                placeholder="Información adicional sobre este horario..."
                            />
                        </div>

                        {/* Form actions */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setEditingSchedule(null);
                                    resetForm();
                                }}
                                leftIcon={<X className="w-4 h-4" />}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                leftIcon={<Save className="w-4 h-4" />}
                            >
                                {editingSchedule ? 'Actualizar' : 'Crear'} Horario
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Schedules List */}
            {selectedInterviewer && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4">
                        Horarios Configurados - {selectedYear}
                    </h3>
                    
                    {schedules.length === 0 ? (
                        <div className="text-center py-8">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gris-piedra mb-2">
                                No hay horarios configurados
                            </h4>
                            <p className="text-gris-piedra mb-4">
                                Comienza creando tu primer horario de disponibilidad
                            </p>
                            <Button
                                onClick={() => setShowCreateForm(true)}
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Crear Primer Horario
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {schedules.map((schedule) => (
                                <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge 
                                                    variant={schedule.scheduleType === 'EXCEPTION' ? 'danger' : 'info'}
                                                    size="sm"
                                                >
                                                    {getScheduleTypeLabel(schedule.scheduleType)}
                                                </Badge>
                                                {!schedule.isActive && (
                                                    <Badge variant="secondary" size="sm">Inactivo</Badge>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    {schedule.scheduleType === 'RECURRING' ? (
                                                        <>
                                                            <Calendar className="w-4 h-4 text-gris-piedra" />
                                                            <span>Cada {getDayLabel(schedule.dayOfWeek)}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Calendar className="w-4 h-4 text-gris-piedra" />
                                                            <span>{formatDate(schedule.specificDate!)}</span>
                                                        </>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gris-piedra" />
                                                    <span>
                                                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                                    </span>
                                                </div>
                                                
                                                {schedule.notes && (
                                                    <div className="text-gris-piedra">
                                                        {schedule.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => startEditing(schedule)}
                                                leftIcon={<Edit className="w-3 h-3" />}
                                            >
                                                Editar
                                            </Button>
                                            
                                            {schedule.isActive ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleDeactivateSchedule(schedule.id!)}
                                                >
                                                    Desactivar
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => handleDeleteSchedule(schedule.id!)}
                                                    leftIcon={<Trash2 className="w-3 h-3" />}
                                                >
                                                    Eliminar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default InterviewerScheduleManager;