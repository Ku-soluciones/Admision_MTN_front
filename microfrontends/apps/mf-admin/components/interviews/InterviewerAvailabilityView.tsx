import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  FiUser, 
  FiCalendar, 
  FiClock, 
  FiCheck, 
  FiX, 
  FiRefreshCw,
  FiFilter,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiEye,
  FiEdit
} from 'react-icons/fi';
import { Interview, InterviewType, INTERVIEW_TYPE_LABELS, INTERVIEW_CONFIG } from '../../types/interview';
import { User, UserRole } from '../../types/user';
import { userService } from '../../services/userService';

interface InterviewerSchedule {
  userId: number;
  userName: string;
  userRole: UserRole;
  email: string;
  specialties: InterviewType[];
  workingHours: {
    start: string;
    end: string;
    days: number[]; // 0 = domingo, 1 = lunes, etc.
  };
  currentLoad: number; // Número de entrevistas esta semana
  maxWeeklyInterviews: number;
  availability: AvailabilitySlot[];
  upcomingInterviews: Interview[];
  totalInterviewsThisMonth: number;
}

interface AvailabilitySlot {
  date: string;
  time: string;
  available: boolean;
  reason?: string; // Si no está disponible, razón
  conflictingInterview?: Interview;
}

interface InterviewerAvailabilityViewProps {
  interviews: Interview[];
  onScheduleInterview: (interviewerId: number, date: string, time: string) => void;
  onViewInterview: (interview: Interview) => void;
  onEditInterview: (interview: Interview) => void;
  className?: string;
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const InterviewerAvailabilityView: React.FC<InterviewerAvailabilityViewProps> = ({
  interviews,
  onScheduleInterview,
  onViewInterview,
  onEditInterview,
  className = ''
}) => {
  const [interviewers, setInterviewers] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<InterviewerSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedInterviewer, setSelectedInterviewer] = useState<number | null>(null);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterSpecialty, setFilterSpecialty] = useState<InterviewType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Cargar entrevistadores y calcular disponibilidad
  useEffect(() => {
    loadInterviewers();
    
    // Actualizar cada 5 minutos para mantener disponibilidad en tiempo real
    const interval = setInterval(loadInterviewers, 5 * 60 * 1000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Recalcular horarios cuando cambien las entrevistas o la semana seleccionada
  useEffect(() => {
    if (interviewers.length > 0) {
      calculateSchedules();
    }
  }, [interviewers, interviews, selectedWeek]);

  const loadInterviewers = async () => {
    try {
      setIsLoading(true);
      
      // Cargar todos los usuarios que pueden realizar entrevistas
      const response = await userService.getSchoolStaffUsers();
      const allUsers = response.content || [];
      
      // Filtrar solo usuarios que pueden hacer entrevistas
      const interviewerUsers = allUsers.filter(user => 
        ['TEACHER', 'COORDINATOR', 'PSYCHOLOGIST', 'CYCLE_DIRECTOR'].includes(user.role)
      );
      
      setInterviewers(interviewerUsers);
    } catch (error) {
      console.error('Error cargando entrevistadores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSchedules = () => {
    const weekStart = getWeekStart(selectedWeek);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });

    const newSchedules: InterviewerSchedule[] = interviewers.map(interviewer => {
      // Obtener entrevistas del entrevistador para esta semana
      const weekInterviews = interviews.filter(interview => 
        interview.interviewerId === interviewer.id &&
        weekDays.some(day => 
          new Date(interview.scheduledDate).toDateString() === day.toDateString()
        )
      );

      // Obtener entrevistas del mes
      const monthStart = new Date(selectedWeek.getFullYear(), selectedWeek.getMonth(), 1);
      const monthEnd = new Date(selectedWeek.getFullYear(), selectedWeek.getMonth() + 1, 0);
      const monthInterviews = interviews.filter(interview =>
        interview.interviewerId === interviewer.id &&
        new Date(interview.scheduledDate) >= monthStart &&
        new Date(interview.scheduledDate) <= monthEnd
      );

      // Determinar especialidades según rol
      const specialties = getInterviewerSpecialties(interviewer.role);
      
      // Horario de trabajo estándar (se puede personalizar por usuario)
      const workingHours = {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5] // Lunes a viernes
      };

      // Calcular disponibilidad para cada día de la semana
      const availability: AvailabilitySlot[] = [];
      
      weekDays.forEach(day => {
        const dayOfWeek = day.getDay();
        const dateStr = day.toISOString().split('T')[0];
        
        // Verificar si trabaja este día
        if (!workingHours.days.includes(dayOfWeek)) {
          INTERVIEW_CONFIG.DEFAULT_TIME_SLOTS.forEach(time => {
            availability.push({
              date: dateStr,
              time,
              available: false,
              reason: 'No trabaja este día'
            });
          });
          return;
        }

        // Verificar disponibilidad por slot de tiempo
        INTERVIEW_CONFIG.DEFAULT_TIME_SLOTS.forEach(time => {
          const existingInterview = weekInterviews.find(interview =>
            interview.scheduledDate === dateStr && interview.scheduledTime === time
          );

          if (existingInterview) {
            availability.push({
              date: dateStr,
              time,
              available: false,
              reason: 'Entrevista programada',
              conflictingInterview: existingInterview
            });
          } else if (time < workingHours.start || time > workingHours.end) {
            availability.push({
              date: dateStr,
              time,
              available: false,
              reason: 'Fuera de horario laboral'
            });
          } else if (day < new Date()) {
            availability.push({
              date: dateStr,
              time,
              available: false,
              reason: 'Fecha pasada'
            });
          } else {
            availability.push({
              date: dateStr,
              time,
              available: true
            });
          }
        });
      });

      // Próximas entrevistas (siguientes 7 días)
      const upcomingInterviews = interviews.filter(interview =>
        interview.interviewerId === interviewer.id &&
        new Date(interview.scheduledDate) >= new Date() &&
        new Date(interview.scheduledDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      return {
        userId: interviewer.id,
        userName: `${interviewer.firstName} ${interviewer.lastName}`,
        userRole: interviewer.role,
        email: interviewer.email,
        specialties,
        workingHours,
        currentLoad: weekInterviews.length,
        maxWeeklyInterviews: getMaxWeeklyInterviews(interviewer.role),
        availability,
        upcomingInterviews,
        totalInterviewsThisMonth: monthInterviews.length
      };
    });

    setSchedules(newSchedules);
  };

  const getInterviewerSpecialties = (role: UserRole): InterviewType[] => {
    switch (role) {
      case 'TEACHER':
        return ['ACADEMIC', 'INDIVIDUAL'];
      case 'PSYCHOLOGIST':
        return ['PSYCHOLOGICAL', 'BEHAVIORAL'];
      case 'COORDINATOR':
        return ['ACADEMIC', 'FAMILY', 'INDIVIDUAL'];
      case 'CYCLE_DIRECTOR':
        return ['FAMILY', 'INDIVIDUAL', 'ACADEMIC'];
      default:
        return ['INDIVIDUAL'];
    }
  };

  const getMaxWeeklyInterviews = (role: UserRole): number => {
    switch (role) {
      case 'PSYCHOLOGIST':
        return 15; // Menos entrevistas porque son más profundas
      case 'TEACHER':
        return 20;
      case 'COORDINATOR':
        return 25;
      case 'CYCLE_DIRECTOR':
        return 30;
      default:
        return 20;
    }
  };

  const getWeekStart = (date: Date): Date => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  // Filtrar horarios según criterios
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // Filtro por rol
      if (filterRole !== 'all' && schedule.userRole !== filterRole) {
        return false;
      }

      // Filtro por especialidad
      if (filterSpecialty !== 'all' && !schedule.specialties.includes(filterSpecialty)) {
        return false;
      }

      // Filtro por búsqueda
      if (searchTerm && !schedule.userName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [schedules, filterRole, filterSpecialty, searchTerm]);

  const weekStart = getWeekStart(selectedWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  // Obtener estadísticas rápidas
  const stats = useMemo(() => {
    const totalSlots = schedules.reduce((acc, schedule) => 
      acc + schedule.availability.length, 0
    );
    const availableSlots = schedules.reduce((acc, schedule) => 
      acc + schedule.availability.filter(slot => slot.available).length, 0
    );
    const busyInterviewers = schedules.filter(schedule => 
      schedule.currentLoad >= schedule.maxWeeklyInterviews * 0.8
    ).length;

    return {
      totalInterviewers: schedules.length,
      availableSlots,
      totalSlots,
      availabilityRate: totalSlots > 0 ? (availableSlots / totalSlots) * 100 : 0,
      busyInterviewers
    };
  }, [schedules]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3">Cargando disponibilidad de entrevistadores...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con navegación de semana */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            Disponibilidad de Entrevistadores
          </h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              <FiChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-3">
              {weekStart.toLocaleDateString('es-CL')} - {
                new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CL')
              }
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              <FiChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Esta Semana
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
          >
            <FiFilter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" onClick={loadInterviewers}>
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <FiUser className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-600">{stats.totalInterviewers}</p>
          <p className="text-sm text-gray-600">Entrevistadores</p>
        </Card>
        
        <Card className="p-4 text-center">
          <FiClock className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-600">{stats.availableSlots}</p>
          <p className="text-sm text-gray-600">Slots Disponibles</p>
        </Card>
        
        <Card className="p-4 text-center">
          <FiCalendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-600">{stats.availabilityRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">Disponibilidad</p>
        </Card>
        
        <Card className="p-4 text-center">
          <FiUser className="w-6 h-6 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-orange-600">{stats.busyInterviewers}</p>
          <p className="text-sm text-gray-600">Con Alta Carga</p>
        </Card>
      </div>

      {/* Filtros expandibles */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar por nombre
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre del entrevistador"
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los roles</option>
                <option value="TEACHER">Profesores</option>
                <option value="PSYCHOLOGIST">Psicólogos</option>
                <option value="COORDINATOR">Coordinadores</option>
                <option value="CYCLE_DIRECTOR">Directores de Ciclo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Especialidad
              </label>
              <select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value as InterviewType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las especialidades</option>
                {Object.values(InterviewType).map(type => (
                  <option key={type} value={type}>
                    {INTERVIEW_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('all');
                  setFilterSpecialty('all');
                }}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabla de disponibilidad */}
      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header de la tabla */}
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-gray-900 min-w-[200px]">
                  Entrevistador
                </th>
                {weekDays.map((day, index) => (
                  <th key={index} className="text-center p-3 font-medium text-gray-900 min-w-[100px]">
                    <div>{DAYS_OF_WEEK[day.getDay()]}</div>
                    <div className="text-xs text-gray-500 font-normal">
                      {day.getDate()}/{day.getMonth() + 1}
                    </div>
                  </th>
                ))}
                <th className="text-center p-3 font-medium text-gray-900">
                  Carga
                </th>
              </tr>
            </thead>

            {/* Cuerpo de la tabla */}
            <tbody>
              {filteredSchedules.map((schedule) => (
                <tr key={schedule.userId} className="border-b hover:bg-gray-50">
                  {/* Información del entrevistador */}
                  <td className="p-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiUser className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{schedule.userName}</div>
                        <div className="text-sm text-gray-500">{schedule.userRole}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {schedule.specialties.map(specialty => (
                            <Badge key={specialty} variant="info" size="sm">
                              {INTERVIEW_TYPE_LABELS[specialty]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Disponibilidad por día */}
                  {weekDays.map((day, dayIndex) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const daySlots = schedule.availability.filter(slot => slot.date === dateStr);
                    const availableSlots = daySlots.filter(slot => slot.available).length;
                    const totalSlots = daySlots.length;

                    return (
                      <td key={dayIndex} className="p-3">
                        <div className="space-y-1">
                          {/* Indicador general */}
                          <div className="text-center">
                            <Badge 
                              variant={
                                availableSlots === 0 ? 'error' :
                                availableSlots < totalSlots / 2 ? 'warning' :
                                'success'
                              }
                              size="sm"
                            >
                              {availableSlots}/{totalSlots}
                            </Badge>
                          </div>

                          {/* Slots individuales */}
                          <div className="grid grid-cols-2 gap-1 text-xs">
                            {daySlots.slice(0, 4).map((slot) => (
                              <div
                                key={slot.time}
                                className={`
                                  p-1 rounded cursor-pointer text-center transition-colors
                                  ${slot.available 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                    : 'bg-red-100 text-red-700'
                                  }
                                `}
                                onClick={() => {
                                  if (slot.available) {
                                    onScheduleInterview(schedule.userId, slot.date, slot.time);
                                  } else if (slot.conflictingInterview) {
                                    onViewInterview(slot.conflictingInterview);
                                  }
                                }}
                                title={
                                  slot.available 
                                    ? `Disponible a las ${slot.time}` 
                                    : slot.reason || 'No disponible'
                                }
                              >
                                {slot.time}
                                {slot.available && (
                                  <FiPlus className="w-3 h-3 mx-auto mt-1" />
                                )}
                              </div>
                            ))}
                            {daySlots.length > 4 && (
                              <div className="col-span-2 text-center text-gray-500">
                                +{daySlots.length - 4} más
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}

                  {/* Indicador de carga */}
                  <td className="p-3 text-center">
                    <div className="space-y-2">
                      <div className={`text-sm font-medium ${
                        schedule.currentLoad >= schedule.maxWeeklyInterviews * 0.8
                          ? 'text-red-600'
                          : schedule.currentLoad >= schedule.maxWeeklyInterviews * 0.6
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {schedule.currentLoad}/{schedule.maxWeeklyInterviews}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            schedule.currentLoad >= schedule.maxWeeklyInterviews * 0.8
                              ? 'bg-red-500'
                              : schedule.currentLoad >= schedule.maxWeeklyInterviews * 0.6
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((schedule.currentLoad / schedule.maxWeeklyInterviews) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {schedule.totalInterviewsThisMonth} este mes
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSchedules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No se encontraron entrevistadores con los filtros aplicados</p>
            </div>
          )}
        </div>
      </Card>

      {/* Leyenda */}
      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-3">Leyenda</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span>Slot disponible</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            <span>Ocupado/No disponible</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="error" size="sm">0/8</Badge>
            <span>Sin slots disponibles</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="warning" size="sm">2/8</Badge>
            <span>Baja disponibilidad</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success" size="sm">6/8</Badge>
            <span>Alta disponibilidad</span>
          </div>
          <div className="flex items-center space-x-2">
            <FiPlus className="w-4 h-4 text-green-600" />
            <span>Clic para programar</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InterviewerAvailabilityView;