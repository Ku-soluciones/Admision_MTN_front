import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import httpClient from '../../services/http';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import DayScheduleSelector from '../DayScheduleSelector';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  VideoIcon
} from '../icons/Icons';
import { 
  FiCalendar, 
  FiClock, 
  FiUser, 
  FiMapPin, 
  FiVideo, 
  FiPhone,
  FiMail,
  FiEdit,
  FiSave,
  FiCheck,
  FiStar
} from 'react-icons/fi';
import {
  Interview,
  InterviewFormProps,
  InterviewFormMode,
  InterviewStatus,
  InterviewType,
  InterviewMode,
  InterviewResult,
  CreateInterviewRequest,
  UpdateInterviewRequest,
  CompleteInterviewRequest,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_RESULT_LABELS,
  InterviewUtils,
  INTERVIEW_VALIDATION,
  INTERVIEW_CONFIG
} from '../../types/interview';
import { applicationService } from '../../services/applicationService';
import interviewService from '../../services/interviewService';

// Interface para entrevistadores del backend
interface BackendInterviewer {
  id: number;
  name: string;
  role: string;
  subject?: string;
  educationalLevel?: string;
  scheduleCount: number;
}

const InterviewForm: React.FC<InterviewFormProps> = ({
  interview,
  mode,
  onSubmit,
  onCancel,
  onEdit,
  isSubmitting = false,
  className = ''
}) => {
  
  // Estado para entrevistadores del backend
  const [interviewers, setInterviewers] = useState<BackendInterviewer[]>([]);
  const [loadingInterviewers, setLoadingInterviewers] = useState(false);
  const [interviewersError, setInterviewersError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    applicationId: '',
    interviewerId: '',
    secondInterviewerId: '', // Segundo entrevistador para entrevistas familiares
    type: InterviewType.FAMILY,
    mode: InterviewMode.IN_PERSON,
    scheduledDate: '',
    scheduledTime: '',
    duration: INTERVIEW_VALIDATION.DURATION.DEFAULT,
    location: '',
    virtualMeetingLink: '',
    notes: '',
    preparation: '',
    status: InterviewStatus.SCHEDULED,
    result: undefined as InterviewResult | undefined,
    score: undefined as number | undefined,
    recommendations: '',
    followUpRequired: false,
    followUpNotes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplicationInfo, setSelectedApplicationInfo] = useState<{name: string, grade: string} | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>(INTERVIEW_CONFIG.DEFAULT_TIME_SLOTS);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // useRef para rastrear llamadas en progreso y prevenir race conditions
  const loadingSlotsRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar entrevistadores disponibles al montar el componente
  useEffect(() => {
    const loadInterviewers = async () => {
      setLoadingInterviewers(true);
      setInterviewersError(null);

      try {
        const currentYear = new Date().getFullYear();
        console.log(`🔍 Cargando entrevistadores con horarios configurados para ${currentYear}...`);

        const data = await httpClient.get(`/v1/interviewer-schedules/interviewers-with-schedules/${currentYear}`);
        console.log('✅ Datos recibidos del servidor:', data);

        // httpClient.get ya retorna response.data directamente
        // Puede ser un array directamente o {data: array}
        const dataArray = Array.isArray(data) ? data : (data as any).data;

        if (!Array.isArray(dataArray)) {
          console.error('❌ Formato de datos inválido. Se esperaba un array:', data);
          throw new Error('No se encontraron entrevistadores con horarios configurados');
        }

        console.log('✅ Array de entrevistadores:', dataArray);

        // El backend ya devuelve el formato correcto con firstName, lastName, role, scheduleCount
        const mappedInterviewers: BackendInterviewer[] = dataArray.map((item: any) => ({
          id: item.id,
          name: `${item.firstName} ${item.lastName}`,
          role: item.role,
          subject: item.subject,
          educationalLevel: item.educationalLevel,
          scheduleCount: item.scheduleCount || 0
        }));

        // Filtrar solo entrevistadores con horarios configurados
        const interviewersWithSchedules = mappedInterviewers.filter(i => i.scheduleCount > 0);

        console.log(`✅ Entrevistadores con horarios: ${interviewersWithSchedules.length}/${mappedInterviewers.length}`);
        setInterviewers(interviewersWithSchedules);
      } catch (error: any) {
        console.error('❌ Error cargando entrevistadores:', error);

        // Manejar errores específicos
        if (error.status === 401) {
          setInterviewersError('Sesión expirada. Por favor, inicie sesión nuevamente.');
        } else if (error.status === 403) {
          setInterviewersError('No tiene permisos para ver los entrevistadores.');
        } else {
          setInterviewersError(error.message || 'Error al cargar la lista de entrevistadores');
        }
      } finally {
        setLoadingInterviewers(false);
      }
    };

    loadInterviewers();
  }, []);

  useEffect(() => {
    console.log('🔄 InterviewForm useEffect - interview:', interview, 'mode:', mode);

    if (interview && (mode === InterviewFormMode.EDIT || mode === InterviewFormMode.VIEW || mode === InterviewFormMode.COMPLETE)) {
      console.log('📝 Modo EDIT/VIEW/COMPLETE - Cargando datos de entrevista existente');
      setFormData({
        applicationId: interview.applicationId,
        interviewerId: interview.interviewerId,
        secondInterviewerId: interview.secondInterviewerId?.toString() || '',
        type: interview.type,
        mode: interview.mode,
        scheduledDate: interview.scheduledDate,
        scheduledTime: interview.scheduledTime,
        duration: interview.duration,
        location: interview.location || '',
        virtualMeetingLink: interview.virtualMeetingLink || '',
        notes: interview.notes || '',
        preparation: interview.preparation || '',
        status: interview.status,
        result: interview.result,
        score: interview.score,
        recommendations: interview.recommendations || '',
        followUpRequired: interview.followUpRequired,
        followUpNotes: interview.followUpNotes || ''
      });
    } else if (interview && mode === InterviewFormMode.CREATE) {
      console.log('🆕 Modo CREATE - Pre-llenando datos desde vista de estudiante');
      console.log('   interview.type recibido:', interview.type);
      console.log('   interview.applicationId:', interview.applicationId);

      // Pre-llenar con datos del contexto (desde la página del estudiante)
      // Validar que el tipo sea válido antes de asignarlo
      const validType = Object.values(InterviewType).includes(interview.type as InterviewType)
        ? interview.type as InterviewType
        : InterviewType.FAMILY;

      console.log('   tipo validado:', validType);

      setFormData(prev => ({
        ...prev,
        applicationId: interview.applicationId || prev.applicationId,
        type: validType
      }));

      console.log('✅ FormData actualizado con datos pre-llenados');
    }
  }, [interview, mode]);

  // Cargar aplicaciones disponibles para el formulario de creación
  useEffect(() => {
    if (mode === InterviewFormMode.CREATE) {
      loadApplications();
    }
  }, [mode]);

  // Cargar información del estudiante si viene pre-llenado
  useEffect(() => {
    if (mode === InterviewFormMode.CREATE && formData.applicationId && applications.length > 0) {
      const selectedApp = applications.find(app => app.id === parseInt(formData.applicationId));
      if (selectedApp && selectedApp.student) {
        setSelectedApplicationInfo({
          name: `${selectedApp.student.firstName} ${selectedApp.student.lastName} ${selectedApp.student.maternalLastName || ''}`.trim(),
          grade: selectedApp.student.gradeApplied || 'No especificado'
        });
      }
    }
  }, [mode, formData.applicationId, applications]);

  const loadApplications = async () => {
    try {
      console.log('📋 InterviewForm: Cargando aplicaciones disponibles...');
      const response = await applicationService.getAllApplications();
      console.log('📋 InterviewForm: Aplicaciones obtenidas:', response);

      // Filtrar solo aplicaciones con datos válidos
      const validApplications = response.filter(app =>
        app &&
        app.id &&
        app.student &&
        app.student.firstName &&
        app.student.lastName
      );

      console.log('📋 InterviewForm: Aplicaciones válidas filtradas:', validApplications);
      setApplications(validApplications);
    } catch (error) {
      console.error('❌ InterviewForm: Error loading applications:', error);
      setApplications([]);
    }
  };

  // Función para cargar horarios disponibles con prevención de race conditions
  const loadAvailableTimeSlots = async () => {
    // Validación de parámetros requeridos
    if (!formData.interviewerId || !formData.scheduledDate) {
      console.log('⚠️ [loadAvailableTimeSlots] Faltan parámetros requeridos - abortando');
      setAvailableTimeSlots(INTERVIEW_CONFIG.DEFAULT_TIME_SLOTS);
      return;
    }

    // Verificar si ya hay una llamada en progreso
    if (loadingSlotsRef.current) {
      console.log('⚠️ [loadAvailableTimeSlots] Ya hay una llamada en progreso - abortando llamada anterior');
      // Cancelar la llamada anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }

    // Marcar que hay una llamada en progreso
    loadingSlotsRef.current = true;

    // Crear nuevo AbortController para esta llamada
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    const timestamp = Date.now();
    console.log(`🚀 [loadAvailableTimeSlots #${timestamp}] INICIO - Llamada iniciada`);

    try {
      setIsLoadingSlots(true);
      let slots: string[];

      console.log(`🔍 [#${timestamp}] Datos:`, {
        type: formData.type,
        interviewerId: formData.interviewerId,
        secondInterviewerId: formData.secondInterviewerId,
        hasSecondInterviewer: !!formData.secondInterviewerId,
        shouldGetCommon: (formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) && !!formData.secondInterviewerId
      });

      // Si es entrevista FAMILY o CYCLE_DIRECTOR y hay dos entrevistadores, obtener horarios comunes
      if ((formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) && formData.secondInterviewerId) {
        console.log(`🔍 [#${timestamp}] Obteniendo horarios comunes para entrevista ${formData.type} (entrevistador 1: ${formData.interviewerId}, entrevistador 2: ${formData.secondInterviewerId})`);

        slots = await interviewService.getCommonTimeSlots(
          parseInt(formData.interviewerId as string),
          parseInt(formData.secondInterviewerId as string),
          formData.scheduledDate,
          formData.duration
        );

        console.log(`✅ [#${timestamp}] Horarios comunes obtenidos (${slots.length} slots):`, slots);
      } else {
        // Para otros tipos o si solo hay un entrevistador, obtener horarios individuales
        console.log(`📋 [#${timestamp}] Obteniendo horarios individuales para entrevistador ${formData.interviewerId}`);

        slots = await interviewService.getAvailableTimeSlots(
          parseInt(formData.interviewerId as string),
          formData.scheduledDate,
          formData.duration
        );

        console.log(`✅ [#${timestamp}] Horarios individuales obtenidos (${slots.length} slots):`, slots);
      }

      // Solo actualizar estado si esta llamada no fue cancelada
      if (currentController.signal.aborted) {
        console.log(`⚠️ [#${timestamp}] Llamada cancelada - NO actualizando estado`);
        return;
      }

      console.log(`✅ [#${timestamp}] Actualizando availableTimeSlots a:`, slots);
      setAvailableTimeSlots(slots);

      // Si la hora actual ya no está disponible, limpiarla
      if (formData.scheduledTime && !slots.includes(formData.scheduledTime)) {
        console.log(`⚠️ [#${timestamp}] Hora seleccionada "${formData.scheduledTime}" ya no disponible - limpiando`);
        setFormData(prev => ({ ...prev, scheduledTime: '' }));
      }

      console.log(`✅ [#${timestamp}] FIN - Llamada completada exitosamente`);
    } catch (error: any) {
      // Ignorar errores de cancelación
      if (error.name === 'AbortError') {
        console.log(`⚠️ [#${timestamp}] Llamada abortada intencionalmente`);
        return;
      }

      console.error(`❌ [#${timestamp}] Error loading available time slots:`, error);

      // Solo actualizar estado si no fue cancelada
      if (!currentController.signal.aborted) {
        setAvailableTimeSlots(INTERVIEW_CONFIG.DEFAULT_TIME_SLOTS);
      }
    } finally {
      // Solo limpiar loading state si esta es la llamada más reciente
      if (!currentController.signal.aborted) {
        setIsLoadingSlots(false);
        loadingSlotsRef.current = false;
        console.log(`✅ [#${timestamp}] Loading state limpiado`);
      }
    }
  };

  // Efecto para recargar horarios cuando cambien los parámetros relevantes con debouncing y cleanup
  useEffect(() => {
    if (mode !== InterviewFormMode.CREATE && mode !== InterviewFormMode.EDIT) {
      return;
    }

    console.log(`🔄 [useEffect] Cambio detectado en dependencias - programando carga de horarios con debounce (300ms)`);

    // Limpiar timer anterior si existe
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      console.log(`⚠️ [useEffect] Timer anterior cancelado`);
    }

    // Programar nueva carga con debounce de 300ms
    debounceTimerRef.current = setTimeout(() => {
      console.log(`✅ [useEffect] Debounce completado - ejecutando loadAvailableTimeSlots`);
      loadAvailableTimeSlots();
    }, 300);

    // Cleanup function: cancelar timer y llamadas pendientes al desmontar o cambiar dependencias
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        console.log(`🧹 [useEffect cleanup] Timer cancelado`);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log(`🧹 [useEffect cleanup] Llamada API cancelada`);
      }
    };
  }, [formData.interviewerId, formData.secondInterviewerId, formData.scheduledDate, formData.duration, formData.type, mode]);

  // Función para manejar selección de horario desde el calendario
  const handleTimeSlotSelect = (date: string, time: string) => {
    setFormData(prev => ({ 
      ...prev, 
      scheduledDate: date, 
      scheduledTime: time 
    }));
    setIsDirty(true);
    
    // Limpiar errores relacionados
    setErrors(prev => ({ 
      ...prev, 
      scheduledDate: '', 
      scheduledTime: '' 
    }));
  };

  // Función para manejar selección de fecha y hora desde DayScheduleSelector
  const handleDateTimeSelect = async (date: string, time: string) => {
    console.log(`📅 InterviewForm: handleDateTimeSelect llamado con fecha="${date}" y hora="${time}"`);
    console.log(`📅 InterviewForm: Estado actual - fecha="${formData.scheduledDate}" y hora="${formData.scheduledTime}"`);

    setFormData(prev => ({
      ...prev,
      scheduledDate: date,
      scheduledTime: time
    }));
    setIsDirty(true);

    // Limpiar errores relacionados
    setErrors(prev => ({
      ...prev,
      scheduledDate: '',
      scheduledTime: ''
    }));

    // Verificar disponibilidad automáticamente solo si ambos parámetros están presentes
    if (date && time) {
      console.log(`✅ Verificando disponibilidad para fecha="${date}" hora="${time}"`);
      await checkAvailability(date, time);
    } else {
      console.log(`⚠️ Omitiendo verificación de disponibilidad: fecha="${date}" hora="${time}" (uno o ambos están vacíos)`);
    }
  };

  // Verificar disponibilidad de entrevistadores para fecha/hora específica
  const checkAvailability = async (date: string, time: string) => {
    try {
      setConflictWarning(null);

      const data = await httpClient.get(`/v1/interviewer-schedules/available?date=${date}&time=${time}`);

      // httpClient.get ya retorna response.data directamente
      const { count, interviewers } = data;

      console.log(`✅ Entrevistadores disponibles para ${date} ${time}: ${count}`);

      if (count < 2) {
        setConflictWarning(
          `Solo hay ${count} entrevistador${count === 1 ? '' : 'es'} disponible${count === 1 ? '' : 's'} en este horario. ` +
          `Se requieren al menos 2 entrevistadores disponibles simultáneamente para realizar la entrevista.`
        );
      } else {
        console.log(`✅ Horario válido: ${count} entrevistadores disponibles`);
      }
    } catch (error: any) {
      console.error('Error verificando disponibilidad:', error);
      setConflictWarning(error.message || 'No se pudo verificar disponibilidad de entrevistadores.');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Limpiar error del campo cuando el usuario comience a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Lógica específica por campo
    if (field === 'applicationId') {
      // Actualizar información del postulante seleccionado
      const selectedApp = applications.find(app => app.id === parseInt(value));
      if (selectedApp && selectedApp.student) {
        setSelectedApplicationInfo({
          name: `${selectedApp.student.firstName} ${selectedApp.student.lastName} ${selectedApp.student.maternalLastName || ''}`.trim(),
          grade: selectedApp.student.gradeApplied || 'No especificado'
        });
      } else {
        setSelectedApplicationInfo(null);
      }
    } else if (field === 'mode') {
      // Limpiar campos específicos de modalidad cuando cambia
      if (value === InterviewMode.VIRTUAL) {
        setFormData(prev => ({ ...prev, location: '' }));
      } else if (value === InterviewMode.IN_PERSON) {
        setFormData(prev => ({ ...prev, virtualMeetingLink: '' }));
      }
    } else if (field === 'type') {
      // Limpiar segundo entrevistador si el tipo cambia y no es FAMILY ni CYCLE_DIRECTOR
      if (value !== InterviewType.FAMILY && value !== InterviewType.CYCLE_DIRECTOR) {
        setFormData(prev => ({ ...prev, secondInterviewerId: '' }));
        // Limpiar error del segundo entrevistador también
        if (errors.secondInterviewerId) {
          setErrors(prev => ({ ...prev, secondInterviewerId: '' }));
        }
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validaciones para crear/editar
    if (mode === InterviewFormMode.CREATE || mode === InterviewFormMode.EDIT) {
      // Validar selección de postulante en modo CREATE
      if (mode === InterviewFormMode.CREATE && !formData.applicationId) {
        newErrors.applicationId = 'Debe seleccionar un postulante';
      }
      
      if (!formData.scheduledDate) {
        newErrors.scheduledDate = 'La fecha es obligatoria';
      } else {
        const selectedDate = new Date(formData.scheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          newErrors.scheduledDate = 'La fecha no puede ser anterior a hoy';
        }
      }

      if (!formData.scheduledTime) {
        newErrors.scheduledTime = 'La hora es obligatoria';
      }

      if (!formData.interviewerId) {
        newErrors.interviewerId = 'Debe seleccionar un entrevistador';
      }

      // Validar segundo entrevistador para entrevistas familiares y de director de ciclo
      if ((formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) && !formData.secondInterviewerId) {
        newErrors.secondInterviewerId = 'Debe seleccionar un segundo entrevistador para este tipo de entrevista';
      }

      // Validar que los dos entrevistadores no sean el mismo (para cualquier tipo de entrevista)
      if (formData.interviewerId && formData.secondInterviewerId) {
        if (formData.interviewerId === formData.secondInterviewerId) {
          newErrors.secondInterviewerId = 'Debe seleccionar un entrevistador diferente al primero';
        }
      }

      if (formData.duration < INTERVIEW_VALIDATION.DURATION.MIN || formData.duration > INTERVIEW_VALIDATION.DURATION.MAX) {
        newErrors.duration = `La duración debe estar entre ${INTERVIEW_VALIDATION.DURATION.MIN} y ${INTERVIEW_VALIDATION.DURATION.MAX} minutos`;
      }

      if (formData.mode === InterviewMode.IN_PERSON && !formData.location.trim()) {
        newErrors.location = 'La ubicación es obligatoria para entrevistas presenciales';
      }

      if (formData.mode === InterviewMode.VIRTUAL && !formData.virtualMeetingLink.trim()) {
        newErrors.virtualMeetingLink = 'El enlace es obligatorio para entrevistas virtuales';
      }
    }

    // Validaciones para completar
    if (mode === InterviewFormMode.COMPLETE) {
      if (!formData.result) {
        newErrors.result = 'Debe seleccionar un resultado';
      }

      if (!formData.recommendations.trim()) {
        newErrors.recommendations = 'Las recomendaciones son obligatorias';
      }

      if (formData.score !== undefined && (formData.score < INTERVIEW_VALIDATION.SCORE.MIN || formData.score > INTERVIEW_VALIDATION.SCORE.MAX)) {
        newErrors.score = `La puntuación debe estar entre ${INTERVIEW_VALIDATION.SCORE.MIN} y ${INTERVIEW_VALIDATION.SCORE.MAX}`;
      }

      if (formData.followUpRequired && !formData.followUpNotes.trim()) {
        newErrors.followUpNotes = 'Debe especificar las notas de seguimiento';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validar conflictos de horarios antes de enviar
  const validateTimeSlotConflicts = async (): Promise<boolean> => {
    if (!formData.scheduledDate || !formData.scheduledTime) {
      return true; // No se puede validar, pero otros validadores lo detectarán
    }

    try {
      console.log('🔍 Validando disponibilidad de entrevistadores:', {
        date: formData.scheduledDate,
        time: formData.scheduledTime,
        duration: formData.duration
      });

      const data = await httpClient.get(
        `/v1/interviewer-schedules/available?date=${formData.scheduledDate}&time=${formData.scheduledTime}`
      );

      // httpClient.get ya retorna response.data directamente
      const { count } = data;

      if (count < 2) {
        setConflictWarning(
          `No se puede programar la entrevista. Solo hay ${count} entrevistador${count === 1 ? '' : 'es'} disponible${count === 1 ? '' : 's'} en este horario. ` +
          `Se requieren al menos 2 entrevistadores disponibles simultáneamente.`
        );
        return false;
      }

      // Limpiar advertencias si todo está bien
      setConflictWarning(null);
      return true;

    } catch (error: any) {
      console.error('Error validating time slot:', error);
      // En caso de error, mostrar advertencia pero permitir continuar
      setConflictWarning(error.message || 'No se pudo verificar disponibilidad. Verifique manualmente que haya 2 entrevistadores disponibles.');
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Validar conflictos de horarios
    const hasNoConflicts = await validateTimeSlotConflicts();
    if (!hasNoConflicts) {
      return; // Detener si hay conflictos
    }

    if (mode === InterviewFormMode.CREATE) {
      const createData: CreateInterviewRequest = {
        applicationId: parseInt(formData.applicationId as string) || 0,
        interviewerId: parseInt(formData.interviewerId as string) || 0,
        secondInterviewerId: formData.secondInterviewerId ? parseInt(formData.secondInterviewerId as string) : undefined,
        type: formData.type,
        mode: formData.mode,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        duration: formData.duration,
        location: formData.location || undefined,
        virtualMeetingLink: formData.virtualMeetingLink || undefined,
        notes: formData.notes || undefined,
        preparation: formData.preparation || undefined,
        status: InterviewStatus.SCHEDULED // Establecer estado como SCHEDULED al programar
      };
      console.log('🔥 CREATING INTERVIEW WITH STATUS:', createData.status, 'Data:', createData);
      onSubmit(createData);
    } else if (mode === InterviewFormMode.EDIT) {
      const updateData: UpdateInterviewRequest = {
        interviewerId: formData.interviewerId,
        secondInterviewerId: formData.secondInterviewerId ? parseInt(formData.secondInterviewerId as string) : undefined,
        type: formData.type,
        mode: formData.mode,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        duration: formData.duration,
        location: formData.location || undefined,
        virtualMeetingLink: formData.virtualMeetingLink || undefined,
        notes: formData.notes || undefined,
        preparation: formData.preparation || undefined,
        status: formData.status
      };
      onSubmit(updateData);
    } else if (mode === InterviewFormMode.COMPLETE) {
      const completeData: CompleteInterviewRequest = {
        result: formData.result!,
        score: formData.score,
        recommendations: formData.recommendations,
        followUpRequired: formData.followUpRequired,
        followUpNotes: formData.followUpNotes || undefined
      };
      onSubmit(completeData);
    }
  };

  const isViewMode = mode === InterviewFormMode.VIEW;
  const isCompleteMode = mode === InterviewFormMode.COMPLETE;
  const isCreateMode = mode === InterviewFormMode.CREATE;

  const getFormTitle = () => {
    switch (mode) {
      case InterviewFormMode.CREATE:
        return 'Nueva Entrevista';
      case InterviewFormMode.EDIT:
        return 'Editar Entrevista';
      case InterviewFormMode.COMPLETE:
        return 'Completar Entrevista';
      case InterviewFormMode.VIEW:
        return 'Detalles de Entrevista';
      default:
        return 'Entrevista';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-azul-monte-tabor" />
            <div>
              <h2 className="text-xl font-semibold text-azul-monte-tabor">
                {getFormTitle()}
              </h2>
              {interview && (
                <p className="text-sm text-gray-600 mt-1">
                  Para: <span className="font-medium text-azul-monte-tabor">{interview.studentName}</span>
                </p>
              )}
            </div>
          </div>
          
          {interview && (
            <div className="flex items-center gap-2">
              <Badge variant={InterviewUtils.getStatusColor(interview.status)}>
                {INTERVIEW_STATUS_LABELS[interview.status]}
              </Badge>
            </div>
          )}
        </div>

        {/* Información del estudiante - Siempre visible y destacada */}
        {interview ? (
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-blue-900 mb-1">
                      {interview.studentName}
                    </h3>
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="blue" size="sm">
                        {interview.gradeApplied}
                      </Badge>
                      <span className="text-sm text-blue-700">
                        ID de Postulación: #{interview.applicationId}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600">
                      <p className="font-medium">Padres: {interview.parentNames}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-500 mb-1">Entrevista para</p>
                    <Badge variant={InterviewUtils.getStatusColor(interview.status)} size="sm">
                      {INTERVIEW_STATUS_LABELS[interview.status]}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : mode === InterviewFormMode.CREATE && (
          <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <UserIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  Nueva Entrevista
                  {selectedApplicationInfo && (
                    <span className="text-base font-normal text-green-700 block">
                      Para: {selectedApplicationInfo.name}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-green-700">
                  {selectedApplicationInfo ? 
                    `Programar entrevista para ${selectedApplicationInfo.name} - ${selectedApplicationInfo.grade}` :
                    'Complete el formulario para programar una nueva entrevista'
                  }
                </p>
                <div className="mt-2">
                  <span className="text-xs text-green-600">
                    ID de Postulación: #{formData.applicationId || 'Por seleccionar'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Formulario principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información Básica</h3>
            
            {/* Selección de Postulante - Solo si no está pre-llenado */}
            {mode === InterviewFormMode.CREATE && !formData.applicationId && (
              <div>
                <label htmlFor="applicationId" className="block text-sm font-medium text-gray-700 mb-2">
                  <FiUser className="inline w-4 h-4 mr-1" />
                  Postulante *
                </label>
                <select
                  id="applicationId"
                  value={formData.applicationId}
                  onChange={(e) => handleInputChange('applicationId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                    errors.applicationId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isViewMode || isCompleteMode}
                >
                  <option value="">Seleccionar postulante</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>
                      {app.student ? 
                        `${app.student.firstName} ${app.student.lastName} ${app.student.maternalLastName || ''}`.trim() + 
                        ` - ${app.student.gradeApplied || 'Sin curso'}` :
                        `ID: ${app.id} - Sin información de estudiante`
                      }
                    </option>
                  ))}
                </select>
                {errors.applicationId && (
                  <p className="mt-1 text-sm text-red-600">{errors.applicationId}</p>
                )}
                
                {/* Mostrar información del postulante seleccionado */}
                {selectedApplicationInfo && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{selectedApplicationInfo.name}</span>
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      Curso postulado: {selectedApplicationInfo.grade}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Tipo de entrevista */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Entrevista *
                {(mode === InterviewFormMode.CREATE && interview?.type) && (
                  <span className="text-sm text-blue-600 font-normal"> (Pre-seleccionado)</span>
                )}
              </label>
              
              {/* Mostrar campo de solo lectura si viene pre-llenado desde ficha */}
              {(mode === InterviewFormMode.CREATE && interview?.type) ? (
                <div className="w-full px-3 py-2 border border-blue-300 rounded-md bg-blue-50 text-blue-900 font-medium">
                  <span className="text-lg mr-2">
                    {formData.type === 'FAMILY' ? '👨‍👩‍👧‍👦' :
                     formData.type === 'CYCLE_DIRECTOR' ? '🎓' : '➕'}
                  </span>
                  {INTERVIEW_TYPE_LABELS[formData.type] || 'Tipo no especificado'}
                </div>
              ) : (
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as InterviewType)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                    errors.type ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isViewMode || isCompleteMode}
                >
                  {Object.values(InterviewType).map(type => (
                    <option key={type} value={type}>
                      {INTERVIEW_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              )}
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type}</p>
              )}
            </div>

            {/* Modalidad */}
            <div>
              <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-2">
                Modalidad *
              </label>
              <select
                id="mode"
                value={formData.mode}
                onChange={(e) => handleInputChange('mode', e.target.value as InterviewMode)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.mode ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isViewMode || isCompleteMode}
              >
                {Object.values(InterviewMode).map(mode => (
                  <option key={mode} value={mode}>
                    {INTERVIEW_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
              {errors.mode && (
                <p className="mt-1 text-sm text-red-600">{errors.mode}</p>
              )}
            </div>

            {/* Entrevistador */}
            <div>
              <label htmlFor="interviewer" className="block text-sm font-medium text-gray-700 mb-2">
                {(formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) ? 'Primer Entrevistador *' : 'Entrevistador *'}
              </label>
              <select
                id="interviewer"
                value={formData.interviewerId}
                onChange={(e) => handleInputChange('interviewerId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.interviewerId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isViewMode || isCompleteMode}
              >
                <option value="">Seleccionar entrevistador</option>
                {loadingInterviewers ? (
                  <option disabled>Cargando entrevistadores...</option>
                ) : interviewersError ? (
                  <option disabled>Error al cargar entrevistadores</option>
                ) : (
                  interviewers.map(interviewer => (
                    <option
                      key={interviewer.id}
                      value={interviewer.id}
                      disabled={interviewer.scheduleCount === 0}
                    >
                      {interviewer.name} - {interviewer.role} {interviewer.scheduleCount === 0 ? '(Sin horarios)' : `(${interviewer.scheduleCount} horarios)`}
                    </option>
                  ))
                )}
              </select>
              {errors.interviewerId && (
                <p className="mt-1 text-sm text-red-600">{errors.interviewerId}</p>
              )}
            </div>

            {/* Segundo Entrevistador */}
            <div>
              <label htmlFor="secondInterviewer" className="block text-sm font-medium text-gray-700 mb-2">
                <FiUser className="inline w-4 h-4 mr-1" />
                Segundo Entrevistador {(formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) && '*'}
              </label>
              <select
                id="secondInterviewer"
                value={formData.secondInterviewerId}
                onChange={(e) => handleInputChange('secondInterviewerId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.secondInterviewerId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isViewMode || isCompleteMode}
              >
                <option value="">Seleccionar segundo entrevistador</option>
                {loadingInterviewers ? (
                  <option disabled>Cargando entrevistadores...</option>
                ) : interviewersError ? (
                  <option disabled>{interviewersError}</option>
                ) : interviewers.length === 0 ? (
                  <option disabled>No hay entrevistadores con horarios configurados</option>
                ) : (
                  (() => {
                    const filteredInterviewers = interviewers.filter(interviewer => {
                      // Excluir el primer entrevistador si ya está seleccionado
                      const firstInterviewerId = formData.interviewerId ? formData.interviewerId.toString() : '';
                      return interviewer.id.toString() !== firstInterviewerId;
                    });

                    console.log(`📋 Segundo entrevistador - Total entrevistadores: ${interviewers.length}, Después del filtro: ${filteredInterviewers.length}, Primer entrevistador ID: ${formData.interviewerId}`);

                    if (filteredInterviewers.length === 0) {
                      return <option disabled>No hay otros entrevistadores disponibles</option>;
                    }

                    return filteredInterviewers.map(interviewer => (
                      <option
                        key={interviewer.id}
                        value={interviewer.id}
                        disabled={interviewer.scheduleCount === 0}
                      >
                        {interviewer.name} - {interviewer.role} {interviewer.scheduleCount === 0 ? '(Sin horarios)' : `(${interviewer.scheduleCount} horarios)`}
                      </option>
                    ));
                  })()
                )}
              </select>
              {errors.secondInterviewerId && (
                <p className="mt-1 text-sm text-red-600">{errors.secondInterviewerId}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {(formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR)
                  ? 'Este tipo de entrevista requiere dos entrevistadores'
                  : 'Se recomienda contar con dos entrevistadores disponibles simultáneamente'}
              </p>
            </div>
          </div>

          {/* Programación */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Programación</h3>
            
            {/* Selección Visual de Fecha y Hora */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <FiCalendar className="inline w-4 h-4 mr-1" />
                  Seleccionar Fecha y Hora *
                </label>
                {/* Mostrar mensaje si es FAMILY o CYCLE_DIRECTOR y falta el segundo entrevistador */}
                {(formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) && formData.interviewerId && !formData.secondInterviewerId ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md">
                    <p className="text-sm text-yellow-800 text-center font-medium">
                      ⚠️ Para entrevistas familiares, primero debe seleccionar AMBOS entrevistadores
                    </p>
                    <p className="text-xs text-yellow-700 text-center mt-1">
                      Los horarios disponibles serán solo aquellos donde ambos entrevistadores están libres
                    </p>
                  </div>
                ) : formData.interviewerId && ((formData.type !== InterviewType.FAMILY && formData.type !== InterviewType.CYCLE_DIRECTOR) || formData.secondInterviewerId) ? (
                  <div>
                    {/* Mostrar información de ambos entrevistadores para FAMILY o CYCLE_DIRECTOR */}
                    {(formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) && formData.secondInterviewerId && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          📅 Horarios comunes para:
                        </p>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>• {interviewers.find(e => e.id === parseInt(formData.interviewerId as string))?.name || 'Entrevistador 1'}</p>
                          <p>• {interviewers.find(e => e.id === parseInt(formData.secondInterviewerId as string))?.name || 'Entrevistador 2'}</p>
                        </div>
                      </div>
                    )}

                    <DayScheduleSelector
                      evaluatorId={parseInt(formData.interviewerId as string)}
                      evaluatorName={
                        interviewers.find(e => e.id === parseInt(formData.interviewerId as string))?.name ||
                        'Evaluador'
                      }
                      secondEvaluatorId={
                        (formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) && formData.secondInterviewerId
                          ? parseInt(formData.secondInterviewerId as string)
                          : undefined
                      }
                      secondEvaluatorName={
                        (formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) && formData.secondInterviewerId
                          ? interviewers.find(e => e.id === parseInt(formData.secondInterviewerId as string))?.name
                          : undefined
                      }
                      selectedDate={formData.scheduledDate}
                      selectedTime={formData.scheduledTime}
                      onDateTimeSelect={handleDateTimeSelect}
                      disabled={isViewMode || isCompleteMode}
                      availableTimeSlots={availableTimeSlots}
                      isLoadingSlots={isLoadingSlots}
                    />
                    {(errors.scheduledDate || errors.scheduledTime) && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.scheduledDate || errors.scheduledTime}
                      </p>
                    )}

                    {/* Advertencia de conflictos */}
                    {conflictWarning && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700">
                          <FiClock className="inline w-4 h-4 mr-1" />
                          <strong>⚠️ Conflicto de horarios:</strong> {conflictWarning}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-sm text-gray-600 text-center">
                      👆 Primero seleccione {(formData.type === InterviewType.FAMILY || formData.type === InterviewType.CYCLE_DIRECTOR) ? 'ambos entrevistadores' : 'un entrevistador'} para ver los horarios disponibles
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Duración */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Duración (minutos) *
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    const newValue = Math.max(INTERVIEW_VALIDATION.DURATION.MIN, formData.duration - 15);
                    handleInputChange('duration', newValue);
                  }}
                  disabled={isViewMode || isCompleteMode || formData.duration <= INTERVIEW_VALIDATION.DURATION.MIN}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors ${
                    isViewMode || isCompleteMode || formData.duration <= INTERVIEW_VALIDATION.DURATION.MIN 
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' 
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                
                <div className={`flex items-center justify-center min-w-0 px-4 py-2 border rounded-md font-medium ${
                  errors.duration ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-300 bg-gray-50 text-gray-900'
                }`}>
                  {formData.duration} min
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const newValue = Math.min(INTERVIEW_VALIDATION.DURATION.MAX, formData.duration + 15);
                    handleInputChange('duration', newValue);
                  }}
                  disabled={isViewMode || isCompleteMode || formData.duration >= INTERVIEW_VALIDATION.DURATION.MAX}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors ${
                    isViewMode || isCompleteMode || formData.duration >= INTERVIEW_VALIDATION.DURATION.MAX 
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' 
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              <p className="mt-1 text-xs text-gray-500">
                Use los botones + y - para ajustar la duración en incrementos de 15 minutos
              </p>
              
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
              )}
            </div>
          </div>
        </div>

        {/* Ubicación/Enlace */}
        <div>
          {formData.mode === InterviewMode.IN_PERSON && (
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                <FiMapPin className="inline w-4 h-4 mr-1" />
                Ubicación *
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.location ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ej: Sala de Entrevistas 1"
                disabled={isViewMode || isCompleteMode}
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>
          )}

          {formData.mode === InterviewMode.VIRTUAL && (
            <div>
              <label htmlFor="virtualLink" className="block text-sm font-medium text-gray-700 mb-2">
                <FiVideo className="inline w-4 h-4 mr-1" />
                Enlace de Reunión Virtual *
              </label>
              <input
                id="virtualLink"
                type="url"
                value={formData.virtualMeetingLink}
                onChange={(e) => handleInputChange('virtualMeetingLink', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.virtualMeetingLink ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="https://meet.google.com/..."
                disabled={isViewMode || isCompleteMode}
              />
              {errors.virtualMeetingLink && (
                <p className="mt-1 text-sm text-red-600">{errors.virtualMeetingLink}</p>
              )}
            </div>
          )}
        </div>

        {/* Notas y preparación */}
        {!isCompleteMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
                placeholder="Notas adicionales sobre la entrevista..."
                disabled={isViewMode}
              />
            </div>

            <div>
              <label htmlFor="preparation" className="block text-sm font-medium text-gray-700 mb-2">
                Preparación
              </label>
              <textarea
                id="preparation"
                rows={4}
                value={formData.preparation}
                onChange={(e) => handleInputChange('preparation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
                placeholder="Materiales o preparación necesaria..."
                disabled={isViewMode}
              />
            </div>
          </div>
        )}

        {/* Sección de completar entrevista */}
        {isCompleteMode && (
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900">Resultados de la Entrevista</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Resultado */}
              <div>
                <label htmlFor="result" className="block text-sm font-medium text-gray-700 mb-2">
                  Resultado *
                </label>
                <select
                  id="result"
                  value={formData.result || ''}
                  onChange={(e) => handleInputChange('result', e.target.value as InterviewResult)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                    errors.result ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar resultado</option>
                  {Object.values(InterviewResult).map(result => (
                    <option key={result} value={result}>
                      {INTERVIEW_RESULT_LABELS[result]}
                    </option>
                  ))}
                </select>
                {errors.result && (
                  <p className="mt-1 text-sm text-red-600">{errors.result}</p>
                )}
              </div>

              {/* Puntuación */}
              <div>
                <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-2">
                  <FiStar className="inline w-4 h-4 mr-1" />
                  Puntuación (1-10)
                </label>
                <input
                  id="score"
                  type="number"
                  min={INTERVIEW_VALIDATION.SCORE.MIN}
                  max={INTERVIEW_VALIDATION.SCORE.MAX}
                  value={formData.score || ''}
                  onChange={(e) => handleInputChange('score', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                    errors.score ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.score && (
                  <p className="mt-1 text-sm text-red-600">{errors.score}</p>
                )}
              </div>
            </div>

            {/* Recomendaciones */}
            <div>
              <label htmlFor="recommendations" className="block text-sm font-medium text-gray-700 mb-2">
                Recomendaciones *
              </label>
              <textarea
                id="recommendations"
                rows={4}
                value={formData.recommendations}
                onChange={(e) => handleInputChange('recommendations', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.recommendations ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Comentarios y recomendaciones sobre la entrevista..."
              />
              {errors.recommendations && (
                <p className="mt-1 text-sm text-red-600">{errors.recommendations}</p>
              )}
            </div>

            {/* Seguimiento */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  id="followUp"
                  type="checkbox"
                  checked={formData.followUpRequired}
                  onChange={(e) => handleInputChange('followUpRequired', e.target.checked)}
                  className="rounded border-gray-300 text-azul-monte-tabor focus:ring-azul-monte-tabor"
                />
                <label htmlFor="followUp" className="text-sm font-medium text-gray-700">
                  Requiere seguimiento
                </label>
              </div>

              {formData.followUpRequired && (
                <div>
                  <label htmlFor="followUpNotes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notas de Seguimiento *
                  </label>
                  <textarea
                    id="followUpNotes"
                    rows={3}
                    value={formData.followUpNotes}
                    onChange={(e) => handleInputChange('followUpNotes', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                      errors.followUpNotes ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Especificar qué tipo de seguimiento se requiere..."
                  />
                  {errors.followUpNotes && (
                    <p className="mt-1 text-sm text-red-600">{errors.followUpNotes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        {!isViewMode && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || (!isDirty && mode === InterviewFormMode.EDIT)}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">
                    {isCreateMode ? 'Creando...' : 
                     isCompleteMode ? 'Completando...' : 'Guardando...'}
                  </span>
                </>
              ) : (
                <>
                  {isCreateMode ? (
                    <>
                      <FiSave className="w-5 h-5 mr-2" />
                      Programar Entrevista
                    </>
                  ) : isCompleteMode ? (
                    <>
                      <FiCheck className="w-5 h-5 mr-2" />
                      Completar Entrevista
                    </>
                  ) : (
                    <>
                      <FiEdit className="w-5 h-5 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        )}

        {isViewMode && (
          <div className="flex justify-between pt-4 border-t">
            {/* Información adicional en modo vista */}
            <div className="text-sm text-gray-500">
              <p>Entrevista #{interview?.id} • Creada: {interview?.scheduledDate}</p>
            </div>
            
            {/* Botones de acción */}
            <div className="flex gap-3">
              {onEdit && interview && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => onEdit(interview)}
                >
                  <FiEdit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default InterviewForm;