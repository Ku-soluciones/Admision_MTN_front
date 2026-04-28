import React, { useState, useEffect } from 'react';
import { interviewerScheduleService, User } from '../../services/interviewerScheduleService';
import LoadingSpinner from '../ui/LoadingSpinner';
import { FiClock, FiUser, FiCalendar } from 'react-icons/fi';

interface AvailableInterviewersSelectorProps {
  selectedDate: string; // YYYY-MM-DD format
  selectedTime: string; // HH:mm format
  selectedInterviewerId: number;
  onInterviewerSelect: (interviewerId: number) => void;
  disabled?: boolean;
}

const AvailableInterviewersSelector: React.FC<AvailableInterviewersSelectorProps> = ({
  selectedDate,
  selectedTime,
  selectedInterviewerId,
  onInterviewerSelect,
  disabled = false
}) => {
  const [availableInterviewers, setAvailableInterviewers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar entrevistadores disponibles cuando cambien fecha/hora
  useEffect(() => {
    if (selectedDate && selectedTime) {
      searchAvailableInterviewers();
    } else {
      setAvailableInterviewers([]);
    }
  }, [selectedDate, selectedTime]);

  const searchAvailableInterviewers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Buscando entrevistadores disponibles para:', { selectedDate, selectedTime });
      
      const available = await interviewerScheduleService.findAvailableInterviewers(
        selectedDate, 
        selectedTime
      );
      
      console.log('✅ Entrevistadores disponibles encontrados:', available);
      setAvailableInterviewers(available);
      
      // Si no hay entrevistadores disponibles, limpiar selección
      if (available.length === 0 && selectedInterviewerId > 0) {
        onInterviewerSelect(0);
      }
      // Si el entrevistador seleccionado ya no está disponible, limpiar selección
      else if (selectedInterviewerId > 0 && !available.find(u => u.id === selectedInterviewerId)) {
        onInterviewerSelect(0);
      }
      
    } catch (error) {
      console.error('❌ Error buscando entrevistadores disponibles:', error);
      setError('Error al buscar entrevistadores disponibles');
      setAvailableInterviewers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role: string): string => {
    const roleLabels: { [key: string]: string } = {
      'PSYCHOLOGIST': 'Psicólogo/a',
      'CYCLE_DIRECTOR': 'Director/a de Ciclo',
      'COORDINATOR': 'Coordinador/a',
      'TEACHER': 'Profesor/a'
    };
    return roleLabels[role] || role;
  };

  const formatEducationalLevel = (level?: string): string => {
    if (!level) return '';
    const levelLabels: { [key: string]: string } = {
      'PRESCHOOL': 'Preescolar',
      'BASIC': 'Básica',
      'HIGH_SCHOOL': 'Media',
      'ALL_LEVELS': 'Todos los niveles'
    };
    return levelLabels[level] || level;
  };

  if (!selectedDate || !selectedTime) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-600">
          <FiCalendar className="text-lg" />
          <span className="text-sm">
            Selecciona una fecha y hora para ver los entrevistadores disponibles
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <FiClock className="text-lg" />
        <span>
          Entrevistadores disponibles para el {new Date(selectedDate).toLocaleDateString('es-CL')} a las {selectedTime}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center p-4">
          <LoadingSpinner />
          <span className="ml-2 text-sm text-gray-600">Buscando entrevistadores disponibles...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && availableInterviewers.length === 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700">
            <FiUser className="text-lg" />
            <span className="text-sm">
              No hay entrevistadores disponibles en este horario. Por favor, selecciona otro horario.
            </span>
          </div>
        </div>
      )}

      {!loading && !error && availableInterviewers.length > 0 && (
        <div className="space-y-2">
          <div className="grid gap-2">
            {availableInterviewers.map(interviewer => (
              <label
                key={interviewer.id}
                className={`
                  flex items-center p-3 rounded-lg border cursor-pointer transition-all
                  ${selectedInterviewerId === interviewer.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="radio"
                  name="interviewer"
                  value={interviewer.id}
                  checked={selectedInterviewerId === interviewer.id}
                  onChange={() => onInterviewerSelect(interviewer.id)}
                  disabled={disabled}
                  className="sr-only"
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {interviewer.firstName} {interviewer.lastName}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {formatRole(interviewer.role)}
                    </span>
                  </div>
                  
                  <div className="mt-1 text-sm text-gray-600">
                    {interviewer.email}
                    {interviewer.educationalLevel && (
                      <span className="ml-2 text-gray-500">
                        • {formatEducationalLevel(interviewer.educationalLevel)}
                      </span>
                    )}
                    {interviewer.subject && interviewer.subject !== 'GENERAL' && interviewer.subject !== 'ALL_SUBJECTS' && (
                      <span className="ml-1 text-gray-500">
                        - {interviewer.subject}
                      </span>
                    )}
                  </div>
                </div>
                
                {selectedInterviewerId === interviewer.id && (
                  <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </label>
            ))}
          </div>
          
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✅ {availableInterviewers.length} entrevistador{availableInterviewers.length !== 1 ? 'es' : ''} disponible{availableInterviewers.length !== 1 ? 's' : ''} en este horario
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableInterviewersSelector;