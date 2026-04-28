import React, { useState, useEffect } from 'react';
import { interviewerScheduleService, User, AvailabilitySummary } from '../../services/interviewerScheduleService';
import { Calendar, ChevronLeft, ChevronRight, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface ScheduleCalendarViewProps {
    selectedInterviewers?: User[];
    onDateSelect?: (date: string) => void;
    showAvailabilitySummary?: boolean;
}

const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
    selectedInterviewers = [],
    onDateSelect,
    showAvailabilitySummary = true
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generate calendar data for current month
    const generateCalendarData = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
        
        const weeks = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let week = 0; week < 6; week++) {
            const days = [];
            for (let day = 0; day < 7; day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + (week * 7) + day);
                
                const isCurrentMonth = date.getMonth() === month;
                const isToday = date.getTime() === today.getTime();
                const isPast = date < today;
                const dateString = date.toISOString().split('T')[0];
                
                days.push({
                    date: date,
                    dateString: dateString,
                    day: date.getDate(),
                    isCurrentMonth,
                    isToday,
                    isPast,
                    isSelected: selectedDate === dateString
                });
            }
            weeks.push(days);
        }

        // Remove empty weeks at the end
        return weeks.filter(week => 
            week.some(day => day.isCurrentMonth)
        );
    };

    const loadAvailabilitySummary = async (date: string) => {
        if (!showAvailabilitySummary) return;
        
        try {
            setLoading(true);
            const summary = await interviewerScheduleService.getAvailabilitySummary(date);
            setAvailabilitySummary(summary);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar disponibilidad');
            setAvailabilitySummary(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (dateString: string, isPast: boolean) => {
        if (isPast) return;
        
        setSelectedDate(dateString);
        if (onDateSelect) {
            onDateSelect(dateString);
        }
        if (showAvailabilitySummary) {
            loadAvailabilitySummary(dateString);
        }
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        setCurrentDate(newDate);
        setSelectedDate(null);
        setAvailabilitySummary(null);
    };

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const calendarData = generateCalendarData();

    return (
        <div className="space-y-6">
            {/* Calendar */}
            <Card className="p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-azul-monte-tabor">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateMonth('prev')}
                            leftIcon={<ChevronLeft className="w-4 h-4" />}
                        >
                            Anterior
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setCurrentDate(new Date());
                                setSelectedDate(null);
                                setAvailabilitySummary(null);
                            }}
                        >
                            Hoy
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateMonth('next')}
                            rightIcon={<ChevronRight className="w-4 h-4" />}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(day => (
                        <div key={day} className="p-2 text-center text-sm font-medium text-gris-piedra">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="space-y-1">
                    {calendarData.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 gap-1">
                            {week.map((day, dayIndex) => (
                                <button
                                    key={dayIndex}
                                    onClick={() => handleDateClick(day.dateString, day.isPast)}
                                    disabled={day.isPast}
                                    className={`
                                        p-2 text-center text-sm rounded-lg transition-all duration-200
                                        ${!day.isCurrentMonth 
                                            ? 'text-gray-300 cursor-not-allowed' 
                                            : day.isPast 
                                                ? 'text-gray-400 cursor-not-allowed' 
                                                : 'text-gris-piedra hover:bg-blue-50 cursor-pointer'
                                        }
                                        ${day.isToday 
                                            ? 'bg-azul-monte-tabor text-white font-semibold' 
                                            : ''
                                        }
                                        ${day.isSelected && !day.isToday 
                                            ? 'bg-blue-100 text-azul-monte-tabor font-semibold border-2 border-azul-monte-tabor' 
                                            : ''
                                        }
                                        ${!day.isPast && day.isCurrentMonth 
                                            ? 'hover:bg-gray-50' 
                                            : ''
                                        }
                                    `}
                                >
                                    {day.day}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-azul-monte-tabor"></div>
                        <span className="text-sm text-gris-piedra">Hoy</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded border-2 border-azul-monte-tabor bg-blue-100"></div>
                        <span className="text-sm text-gris-piedra">Seleccionado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gray-300"></div>
                        <span className="text-sm text-gris-piedra">No disponible</span>
                    </div>
                </div>
            </Card>

            {/* Availability Summary */}
            {showAvailabilitySummary && selectedDate && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-azul-monte-tabor">
                            Disponibilidad del {new Date(selectedDate).toLocaleDateString('es-CL', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </h4>
                        {loading && (
                            <div className="flex items-center gap-2 text-gris-piedra">
                                <Clock className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Cargando...</span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-red-800">{error}</span>
                        </div>
                    )}

                    {availabilitySummary && !loading && (
                        <div className="space-y-4">
                            {availabilitySummary.timeSlots.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h5 className="text-lg font-medium text-gris-piedra mb-2">
                                        No hay disponibilidad configurada
                                    </h5>
                                    <p className="text-gris-piedra">
                                        No hay entrevistadores con horarios configurados para esta fecha
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {availabilitySummary.timeSlots.map((slot, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gris-piedra" />
                                                    <span className="font-medium text-azul-monte-tabor">
                                                        {slot.time}
                                                    </span>
                                                </div>
                                                <Badge 
                                                    variant={slot.availableCount > 0 ? 'success' : 'secondary'}
                                                    size="sm"
                                                >
                                                    {slot.availableCount} disponibles
                                                </Badge>
                                            </div>

                                            {slot.availableInterviewers.length > 0 ? (
                                                <div className="space-y-2">
                                                    {slot.availableInterviewers.map((interviewer) => (
                                                        <div key={interviewer.id} className="flex items-center justify-between text-sm">
                                                            <span className="text-gris-piedra">
                                                                {interviewer.name}
                                                            </span>
                                                            <Badge variant="info" size="xs">
                                                                {interviewer.role}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-400 text-sm py-2">
                                                    No hay entrevistadores disponibles
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Summary stats */}
                            <div className="border-t border-gray-200 pt-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-azul-monte-tabor">
                                            {availabilitySummary.timeSlots.length}
                                        </div>
                                        <div className="text-sm text-gris-piedra">Franjas horarias</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-verde-esperanza">
                                            {availabilitySummary.timeSlots.filter(slot => slot.availableCount > 0).length}
                                        </div>
                                        <div className="text-sm text-gris-piedra">Con disponibilidad</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-dorado-nazaret">
                                            {Math.max(...availabilitySummary.timeSlots.map(slot => slot.availableCount), 0)}
                                        </div>
                                        <div className="text-sm text-gris-piedra">Máximo disponibles</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-azul-monte-tabor">
                                            {Math.round(
                                                availabilitySummary.timeSlots.reduce((acc, slot) => acc + slot.availableCount, 0) / 
                                                availabilitySummary.timeSlots.length
                                            )}
                                        </div>
                                        <div className="text-sm text-gris-piedra">Promedio disponibles</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default ScheduleCalendarView;