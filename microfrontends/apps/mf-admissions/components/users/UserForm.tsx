import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserFormMode,
  UserFormProps,
  UserRole,
  EducationalLevel,
  Subject,
  USER_ROLE_LABELS,
  EDUCATIONAL_LEVEL_LABELS,
  SUBJECT_LABELS,
  UserUtils,
  USER_VALIDATION_ERRORS
} from '../../types/user';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  BookOpenIcon
} from '../icons/Icons';
import WeeklyCalendar from '../schedule/WeeklyCalendar';

const UserForm: React.FC<UserFormProps> = ({
  user,
  mode,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    rut: '',
    phone: '',
    role: UserRole.TEACHER,
    educationalLevel: undefined as EducationalLevel | undefined,
    subject: undefined as Subject | undefined,
    password: '',
    sendWelcomeEmail: true,
    active: true,
    emailVerified: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (user && (mode === UserFormMode.EDIT || mode === UserFormMode.VIEW)) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        rut: user.rut || '',
        phone: user.phone || '',
        role: user.role || UserRole.TEACHER,
        educationalLevel: user.educationalLevel || undefined,
        subject: user.subject || undefined,
        password: '',
        sendWelcomeEmail: false,
        active: user.active ?? true,
        emailVerified: user.emailVerified ?? false
      });
    }
  }, [user, mode]);

  const handleInputChange = (field: string, value: string | boolean | EducationalLevel | Subject | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // Limpiar error del campo cuando el usuario comience a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Formatear RUT automáticamente
    if (field === 'rut' && typeof value === 'string') {
      const formattedRut = UserUtils.formatRut(value);
      if (formattedRut !== value) {
        setFormData(prev => ({ ...prev, rut: formattedRut }));
      }
    }

    // Limpiar nivel y asignatura si el rol cambia y ya no los requiere
    if (field === 'role') {
      const newRole = value as UserRole;
      setFormData(prev => ({
        ...prev,
        educationalLevel: UserUtils.requiresEducationalLevel(newRole) ? prev.educationalLevel : undefined,
        subject: UserUtils.requiresSubject(newRole) ? prev.subject : undefined
      }));
    }

    // Actualizar asignaturas válidas cuando cambia el nivel
    if (field === 'educationalLevel') {
      const newLevel = value as EducationalLevel;
      if (newLevel && formData.subject) {
        const validSubjects = UserUtils.getSubjectsForLevel(newLevel);
        if (validSubjects.length > 0 && !validSubjects.includes(formData.subject)) {
          setFormData(prev => ({ ...prev, subject: undefined }));
        }
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar nombre
    if (!formData.firstName.trim()) {
      newErrors.firstName = USER_VALIDATION_ERRORS.REQUIRED_FIELD;
    } else if (formData.firstName.length < 2 || formData.firstName.length > 50) {
      newErrors.firstName = USER_VALIDATION_ERRORS.FIRST_NAME_LENGTH;
    }

    // Validar apellido
    if (!formData.lastName.trim()) {
      newErrors.lastName = USER_VALIDATION_ERRORS.REQUIRED_FIELD;
    } else if (formData.lastName.length < 2 || formData.lastName.length > 50) {
      newErrors.lastName = USER_VALIDATION_ERRORS.LAST_NAME_LENGTH;
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = USER_VALIDATION_ERRORS.REQUIRED_FIELD;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = USER_VALIDATION_ERRORS.INVALID_EMAIL;
    }

    // Validar RUT (opcional - solo valida formato si se proporciona)
    if (formData.rut.trim() && !UserUtils.validateRut(formData.rut)) {
      newErrors.rut = USER_VALIDATION_ERRORS.INVALID_RUT;
    }

    // Validar combinación de rol, nivel y asignatura
    const roleValidationErrors = UserUtils.validateRoleCombination(
      formData.role,
      formData.educationalLevel,
      formData.subject
    );
    
    if (roleValidationErrors.length > 0) {
      newErrors.roleCombination = roleValidationErrors.join('. ');
    }

    // Validar contraseña solo en modo creación y si se proporciona
    if (mode === UserFormMode.CREATE && formData.password && formData.password.length < 8) {
      newErrors.password = USER_VALIDATION_ERRORS.PASSWORD_LENGTH;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const submitData = mode === UserFormMode.CREATE ? {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      rut: formData.rut.trim(),
      phone: formData.phone.trim() || undefined,
      role: formData.role,
      educationalLevel: formData.educationalLevel,
      subject: formData.subject,
      password: formData.password.trim() || undefined,
      sendWelcomeEmail: formData.sendWelcomeEmail
    } as CreateUserRequest : {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      rut: formData.rut.trim(),
      phone: formData.phone.trim() || undefined,
      role: formData.role,
      educationalLevel: formData.educationalLevel,
      subject: formData.subject,
      active: formData.active,
      emailVerified: formData.emailVerified
    } as UpdateUserRequest;

    onSubmit(submitData);
  };

  const isViewMode = mode === UserFormMode.VIEW;
  const isCreateMode = mode === UserFormMode.CREATE;
  const requiresLevel = UserUtils.requiresEducationalLevel(formData.role);
  const requiresSubject = UserUtils.requiresSubject(formData.role);
  const availableSubjects = formData.educationalLevel ? UserUtils.getSubjectsForLevel(formData.educationalLevel) : [];
  
  // Determinar si el usuario puede realizar entrevistas (necesita gestión de horarios)
  const canInterview = formData.role === UserRole.PSYCHOLOGIST ||
                       formData.role === UserRole.CYCLE_DIRECTOR ||
                       formData.role === UserRole.COORDINATOR ||
                       formData.role === UserRole.INTERVIEWER;
  
  console.log(`👤 UserForm - Usuario: ${formData.firstName} ${formData.lastName}`);
  console.log(`🏷️ UserForm - Role: ${formData.role}`);
  console.log(`📅 UserForm - canInterview: ${canInterview}`);
  console.log(`🆔 UserForm - userForSchedule.id: ${user?.id || 0}`);
  
  // Para el InterviewerScheduleManager necesitamos un objeto User
  const userForSchedule = user || {
    id: 0, // Se actualizará después de crear el usuario
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    role: formData.role,
    educationalLevel: formData.educationalLevel,
    subject: formData.subject
  };

  const getFormTitle = () => {
    switch (mode) {
      case UserFormMode.CREATE:
        return 'Crear Usuario';
      case UserFormMode.EDIT:
        return 'Editar Usuario';
      case UserFormMode.VIEW:
        return 'Detalles del Usuario';
      default:
        return 'Usuario';
    }
  };

  const getUserDescription = () => {
    if (!user) return '';
    return UserUtils.getFullUserDescription(user);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserIcon className="w-6 h-6 text-azul-monte-tabor" />
              <h2 className="text-xl font-semibold text-azul-monte-tabor">
                {getFormTitle()}
              </h2>
            </div>
            
            {user && (
              <div className="flex items-center gap-2">
                <Badge variant={UserUtils.getStatusColor(user.active)}>
                  {user.active ? 'Activo' : 'Inactivo'}
                </Badge>
                <Badge variant={UserUtils.getRoleColor(user.role)}>
                  {USER_ROLE_LABELS[user.role]}
                </Badge>
              </div>
            )}
          </div>

          {/* Descripción del usuario en modo vista */}
          {isViewMode && user && (
            <div className="bg-azul-monte-tabor/5 border border-azul-monte-tabor/20 rounded-lg p-4">
              <p className="text-sm font-medium text-azul-monte-tabor">
                {getUserDescription()}
              </p>
            </div>
          )}

          {/* Información Personal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ingresa el nombre"
                disabled={isViewMode || isSubmitting}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            {/* Apellido */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Apellido *
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ingresa el apellido"
                disabled={isViewMode || isSubmitting}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email y RUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <EnvelopeIcon className="inline w-4 h-4 mr-1" />
                Correo Electrónico *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="ejemplo@mtn.cl"
                disabled={isViewMode || isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* RUT */}
            <div>
              <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-2">
                <IdentificationIcon className="inline w-4 h-4 mr-1" />
                RUT (opcional)
              </label>
              <input
                id="rut"
                type="text"
                value={formData.rut}
                onChange={(e) => handleInputChange('rut', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.rut ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="12345678-9"
                disabled={isViewMode || isSubmitting}
              />
              {errors.rut && (
                <p className="mt-1 text-sm text-red-600">{errors.rut}</p>
              )}
            </div>
          </div>

          {/* Teléfono y Rol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                <PhoneIcon className="inline w-4 h-4 mr-1" />
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
                placeholder="+56912345678"
                disabled={isViewMode || isSubmitting}
              />
            </div>

            {/* Rol */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rol del Sistema *
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent"
                disabled={isViewMode || isSubmitting}
              >
                {/* Administración */}
                <optgroup label="👑 Administración">
                  <option value={UserRole.ADMIN}>
                    {USER_ROLE_LABELS[UserRole.ADMIN]}
                  </option>
                </optgroup>

                {/* Docentes */}
                <optgroup label="🎓 Educación">
                  <option value={UserRole.TEACHER}>
                    {USER_ROLE_LABELS[UserRole.TEACHER]}
                  </option>
                  <option value={UserRole.COORDINATOR}>
                    {USER_ROLE_LABELS[UserRole.COORDINATOR]}
                  </option>
                </optgroup>

                {/* Especialistas */}
                <optgroup label="🔬 Especialistas">
                  <option value={UserRole.PSYCHOLOGIST}>
                    {USER_ROLE_LABELS[UserRole.PSYCHOLOGIST]}
                  </option>
                  <option value={UserRole.CYCLE_DIRECTOR}>
                    {USER_ROLE_LABELS[UserRole.CYCLE_DIRECTOR]}
                  </option>
                  <option value={UserRole.INTERVIEWER}>
                    {USER_ROLE_LABELS[UserRole.INTERVIEWER]}
                  </option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Nivel Educativo y Asignatura (solo para profesores y coordinadores) */}
          {(requiresLevel || requiresSubject) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 text-azul-monte-tabor" />
                <h3 className="text-lg font-medium text-gray-900">Especialización</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nivel Educativo */}
                {requiresLevel && (
                  <div>
                    <label htmlFor="educationalLevel" className="block text-sm font-medium text-gray-700 mb-2">
                      Nivel Educativo *
                    </label>
                    <select
                      id="educationalLevel"
                      value={formData.educationalLevel || ''}
                      onChange={(e) => handleInputChange('educationalLevel', e.target.value ? e.target.value as EducationalLevel : undefined)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                        errors.roleCombination ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      disabled={isViewMode || isSubmitting}
                    >
                      <option value="">Selecciona un nivel</option>
                      {Object.values(EducationalLevel).map(level => (
                        <option key={level} value={level}>
                          {EDUCATIONAL_LEVEL_LABELS[level]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Asignatura */}
                {requiresSubject && (
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      <BookOpenIcon className="inline w-4 h-4 mr-1" />
                      Asignatura *
                    </label>
                    <select
                      id="subject"
                      value={formData.subject || ''}
                      onChange={(e) => handleInputChange('subject', e.target.value ? e.target.value as Subject : undefined)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                        errors.roleCombination ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      disabled={isViewMode || isSubmitting || !formData.educationalLevel}
                    >
                      <option value="">Selecciona una asignatura</option>
                      {availableSubjects.map(subject => (
                        <option key={subject} value={subject}>
                          {SUBJECT_LABELS[subject]}
                        </option>
                      ))}
                    </select>
                    {!formData.educationalLevel && (
                      <p className="mt-1 text-sm text-gray-600">
                        Selecciona primero un nivel educativo
                      </p>
                    )}
                  </div>
                )}
              </div>

              {errors.roleCombination && (
                <p className="text-sm text-red-600">{errors.roleCombination}</p>
              )}
            </div>
          )}

          {/* Gestión de Horarios (solo para entrevistadores) */}
          {canInterview && user && user.id > 0 && !isCreateMode && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 bg-azul-monte-tabor text-white rounded text-xs">⏰</div>
                <h3 className="text-lg font-medium text-gray-900">Gestión de Horarios de Entrevistas</h3>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-4">
                  Como {formData.role === UserRole.PSYCHOLOGIST ? 'psicólogo(a)' :
                       formData.role === UserRole.CYCLE_DIRECTOR ? 'director(a) de ciclo' :
                       formData.role === UserRole.INTERVIEWER ? 'entrevistador(a)' : 'coordinador(a)'},
                  puedes marcar tus horarios disponibles haciendo click en las casillas del calendario (8 AM - 4 PM).
                </p>
                
                <WeeklyCalendar 
                  userId={userForSchedule.id || 0}
                  userRole={formData.role}
                  onScheduleChange={() => {
                    // Opcional: callback cuando se actualicen horarios
                    console.log('Horarios actualizados');
                  }}
                />
              </div>
            </div>
          )}

          {/* Mensaje informativo para entrevistadores recién creados */}
          {canInterview && isCreateMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded text-xs flex items-center justify-center mt-0.5">ℹ</div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Gestión de Horarios</h4>
                  <p className="text-sm text-blue-700">
                    Después de crear este usuario {formData.role === UserRole.PSYCHOLOGIST ? 'psicólogo' :
                                                   formData.role === UserRole.CYCLE_DIRECTOR ? 'director de ciclo' :
                                                   formData.role === UserRole.INTERVIEWER ? 'entrevistador' : 'coordinador'},
                    podrás configurar sus horarios disponibles para entrevistas editando su perfil.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contraseña (solo en creación) */}
          {isCreateMode && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <KeyIcon className="inline w-4 h-4 mr-1" />
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor focus:border-transparent ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Deja vacío para generar automáticamente"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-sm text-gray-600">
                Si no se proporciona, se generará una contraseña temporal automáticamente
              </p>
            </div>
          )}

          {/* Opciones de Estado (solo en edición) */}
          {mode === UserFormMode.EDIT && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Estado del Usuario</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Usuario Activo */}
                <div className="flex items-center space-x-2">
                  <input
                    id="active"
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                    className="rounded border-gray-300 text-azul-monte-tabor focus:ring-azul-monte-tabor"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700">
                    Usuario Activo
                  </label>
                </div>

                {/* Email Verificado */}
                <div className="flex items-center space-x-2">
                  <input
                    id="emailVerified"
                    type="checkbox"
                    checked={formData.emailVerified}
                    onChange={(e) => handleInputChange('emailVerified', e.target.checked)}
                    className="rounded border-gray-300 text-azul-monte-tabor focus:ring-azul-monte-tabor"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="emailVerified" className="text-sm font-medium text-gray-700">
                    <CheckCircleIcon className="inline w-4 h-4 mr-1" />
                    Email Verificado
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Opciones de Email (solo en creación) */}
          {isCreateMode && (
            <div className="flex items-center space-x-2">
              <input
                id="sendWelcomeEmail"
                type="checkbox"
                checked={formData.sendWelcomeEmail}
                onChange={(e) => handleInputChange('sendWelcomeEmail', e.target.checked)}
                className="rounded border-gray-300 text-azul-monte-tabor focus:ring-azul-monte-tabor"
                disabled={isSubmitting}
              />
              <label htmlFor="sendWelcomeEmail" className="text-sm font-medium text-gray-700">
                Enviar email de bienvenida con credenciales de acceso
              </label>
            </div>
          )}

          {/* Información adicional en modo vista */}
          {isViewMode && user && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Información adicional</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Creado:</span>
                  <span className="ml-2 font-medium">{UserUtils.formatCreatedAt(user.createdAt)}</span>
                </div>
                {user.updatedAt && (
                  <div>
                    <span className="text-gray-600">Actualizado:</span>
                    <span className="ml-2 font-medium">{UserUtils.formatCreatedAt(user.updatedAt)}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Email verificado:</span>
                  <span className={`ml-2 font-medium ${user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                    {user.emailVerified ? 'Sí' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">ID del usuario:</span>
                  <span className="ml-2 font-medium">{user.id}</span>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
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
                disabled={isSubmitting || (!isDirty && mode === UserFormMode.EDIT)}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">
                      {isCreateMode ? 'Creando...' : 'Guardando...'}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    {isCreateMode ? 'Crear Usuario' : 'Guardar Datos del Usuario'}
                  </>
                )}
              </Button>
            </div>
          )}

          {isViewMode && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cerrar
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Información del sistema */}
      {mode === UserFormMode.CREATE && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Información sobre el nuevo sistema:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Profesores</strong>: Selecciona el nivel educativo y la asignatura específica</li>
                <li><strong>Coordinadores</strong>: Pueden coordinar una asignatura en todos los niveles</li>
                <li><strong>Prebásica</strong>: Solo utiliza Educación General (Kinder - 2°)</li>
                <li><strong>Básica y Media</strong>: Asignaturas disponibles: Lenguaje, Matemáticas, Inglés</li>
                <li>El usuario recibirá sus credenciales por email automáticamente</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default UserForm;