import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiVideo,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle
} from 'react-icons/fi';
import {
  Interview,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  InterviewUtils
} from '../../types/interview';
import interviewService from '../../services/interviewService';
import { useAuth } from '../../context/AuthContext';

interface FamilyCalendarProps {
  className?: string;
}

const FamilyCalendar: React.FC<FamilyCalendarProps> = ({ className = '' }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadInterviews();
  }, [user]);

  const loadInterviews = async () => {
    if (!user?.applicationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await interviewService.getInterviewsByApplication(user.applicationId);
      const familyInterviews = response.interviews || [];
      setInterviews(familyInterviews);
    } catch (error) {
      console.error('❌ Error cargando entrevistas:', error);
      setError('Error al cargar las entrevistas');
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getInterviewsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return interviews.filter(interview => {
      const interviewDate = interview.scheduledDate.split('T')[0];
      return interviewDate === dateStr;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-200" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayInterviews = getInterviewsForDate(date);
      const isSelected = selectedDate?.toDateString() === date.toDateString();
      const isTodayDate = isToday(date);

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-24 border border-gray-200 p-2 cursor-pointer transition-colors ${
            isTodayDate ? 'bg-blue-50 border-blue-400' :
            isSelected ? 'bg-blue-100 border-blue-500' :
            dayInterviews.length > 0 ? 'bg-green-50 hover:bg-green-100' :
            'bg-white hover:bg-gray-50'
          }`}
        >
          <div className={`text-sm font-semibold mb-1 ${
            isTodayDate ? 'text-blue-600' :
            dayInterviews.length > 0 ? 'text-green-600' :
            'text-gray-700'
          }`}>
            {day}
          </div>
          {dayInterviews.length > 0 && (
            <div className="space-y-1">
              {dayInterviews.slice(0, 2).map((interview, idx) => (
                <div
                  key={idx}
                  className="text-xs px-1 py-0.5 rounded bg-blue-500 text-white truncate"
                  title={`${interview.scheduledTime.substring(0, 5)} - ${INTERVIEW_TYPE_LABELS[interview.type]}`}
                >
                  {interview.scheduledTime.substring(0, 5)}
                </div>
              ))}
              {dayInterviews.length > 2 && (
                <div className="text-xs text-gray-600">
                  +{dayInterviews.length - 2} más
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDayInterviews = selectedDate ? getInterviewsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center py-12 ${className}`}>
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="lg" />
          <span className="text-lg text-gray-600">Cargando calendario...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="flex items-center justify-center space-x-2 text-red-600 mb-4">
          <FiAlertCircle className="w-6 h-6" />
          <span className="text-lg font-medium">{error}</span>
        </div>
      </Card>
    );
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calendar Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={previousMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FiChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0">
          {/* Day headers */}
          {dayNames.map(day => (
            <div key={day} className="text-center font-semibold text-gray-700 py-2 border-b-2 border-gray-300">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {renderCalendar()}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-50 border-2 border-blue-400 rounded"></div>
            <span className="text-gray-600">Hoy</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-50 border border-gray-200 rounded"></div>
            <span className="text-gray-600">Con entrevistas</span>
          </div>
        </div>
      </Card>

      {/* Selected Day Details */}
      {selectedDate && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Entrevistas - {selectedDate.toLocaleDateString('es-CL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h3>

          {selectedDayInterviews.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              No hay entrevistas programadas para este día
            </p>
          ) : (
            <div className="space-y-4">
              {selectedDayInterviews
                .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                .map((interview) => (
                  <div
                    key={interview.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {INTERVIEW_TYPE_LABELS[interview.type]}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Entrevistador: {interview.interviewerName}
                        </p>
                      </div>
                      <Badge variant={InterviewUtils.getStatusColor(interview.status)}>
                        {interview.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <FiClock className="w-4 h-4 text-gray-400" />
                        <span>
                          {interview.scheduledTime.substring(0, 5)}
                          ({InterviewUtils.formatDuration(interview.duration)})
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {interview.mode === InterviewMode.VIRTUAL ? (
                          <FiVideo className="w-4 h-4 text-blue-600" />
                        ) : (
                          <FiMapPin className="w-4 h-4 text-green-600" />
                        )}
                        <span>
                          {interview.mode === InterviewMode.VIRTUAL
                            ? 'Virtual'
                            : interview.location || 'Presencial'}
                        </span>
                      </div>
                    </div>

                    {interview.mode === InterviewMode.VIRTUAL && interview.virtualMeetingLink && (
                      <div className="mt-3">
                        <a
                          href={interview.virtualMeetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          Unirse a la reunión virtual
                        </a>
                      </div>
                    )}

                    {interview.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                        <strong>Notas:</strong> {interview.notes}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </Card>
      )}

      {/* Summary Stats */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Mes</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {interviews.filter(i => {
                const date = new Date(i.scheduledDate);
                return date.getMonth() === currentDate.getMonth() &&
                       date.getFullYear() === currentDate.getFullYear();
              }).length}
            </div>
            <div className="text-sm text-gray-600">Entrevistas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {interviews.filter(i => i.status === InterviewStatus.COMPLETED).length}
            </div>
            <div className="text-sm text-gray-600">Completadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {interviews.filter(i =>
                i.status === InterviewStatus.SCHEDULED ||
                i.status === InterviewStatus.CONFIRMED
              ).length}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FamilyCalendar;
