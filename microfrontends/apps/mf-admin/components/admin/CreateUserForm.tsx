import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import { CreateUserRequest, UserRole } from '../../types/user';
import { PsychologySpecialty, SupportStaffType, KinderLevel } from '../../types';
import { useNotifications } from '../../context/AppContext';
import { getDayOfWeekOptions, getTimeSlotOptions } from '../../services/interviewerScheduleService';
import { FiClock, FiCalendar, FiPlus, FiTrash2 } from 'react-icons/fi';

interface CreateUserFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (userData: CreateUserRequest) => Promise<void>;
    initialData?: CreateUserRequest;
    isEditing?: boolean;
}

interface UserSchedule {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    notes?: string;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ isOpen, onClose, onSubmit, initialData, isEditing = false }) => {
    const { addNotification } = useNotifications();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState<CreateUserRequest>(() => {
        if (initialData && isEditing) {
            try {
                return {
                    ...initialData,
                    password: '', // No mostrar la contraseña actual
                    // Asegurar que todos los campos tengan valores por defecto
                    phone: initialData.phone || '',
                    // Convertir materias del backend (inglés) a español para mostrar en el formulario
                    subjects: initialData.subjects?.map(subject => {
                        try {
                            const mappedSubject = reverseSubjectMapping[subject];
                            if (mappedSubject) {
                                return mappedSubject;
                            }
                            // Si no encuentra el mapeo, intentar con diferentes variaciones
                            const upperSubject = subject?.toUpperCase();
                            const mappedUpperSubject = reverseSubjectMapping[upperSubject];
                            if (mappedUpperSubject) {
                                return mappedUpperSubject;
                            }
                            // Si aún no encuentra, devolver el original
                            return subject;
                        } catch (error) {
                            console.warn('Error mapeando materia:', subject, error);
                            return subject;
                        }
                    }) || [],
                    assignedGrades: initialData.assignedGrades || [],
                    department: initialData.department || '',
                    yearsOfExperience: initialData.yearsOfExperience || 0,
                    qualifications: initialData.qualifications || [],
                    assignedLevel: initialData.assignedLevel || KinderLevel.PREKINDER,
                    specializations: initialData.specializations || [],
                    specialty: initialData.specialty || PsychologySpecialty.EDUCATIONAL,
                    licenseNumber: initialData.licenseNumber || '',
                    canConductInterviews: initialData.canConductInterviews || false,
                    canPerformPsychologicalEvaluations: initialData.canPerformPsychologicalEvaluations || false,
                    specializedAreas: initialData.specializedAreas || [],
                    staffType: initialData.staffType || SupportStaffType.ADMINISTRATIVE,
                    responsibilities: initialData.responsibilities || [],
                    canAccessReports: initialData.canAccessReports || false,
                    canManageSchedules: initialData.canManageSchedules || false
                };
            } catch (error) {
                console.error('Error inicializando formulario con datos existentes:', error);
                // Si hay error, devolver datos por defecto
                return {
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    role: UserRole.TEACHER_LANGUAGE,
                    phone: '',
                    subjects: [],
                    assignedGrades: [],
                    department: '',
                    yearsOfExperience: 0,
                    qualifications: [],
                    assignedLevel: KinderLevel.PREKINDER,
                    specializations: [],
                    specialty: PsychologySpecialty.EDUCATIONAL,
                    licenseNumber: '',
                    canConductInterviews: false,
                    canPerformPsychologicalEvaluations: false,
                    specializedAreas: [],
                    staffType: SupportStaffType.ADMINISTRATIVE,
                    responsibilities: [],
                    canAccessReports: false,
                    canManageSchedules: false
                };
            }
        }
        return {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            role: UserRole.TEACHER_LANGUAGE,
            phone: '',
            subjects: [],
            assignedGrades: [],
            department: '',
            yearsOfExperience: 0,
            qualifications: [],
            assignedLevel: KinderLevel.PREKINDER,
            specializations: [],
            specialty: PsychologySpecialty.EDUCATIONAL,
            licenseNumber: '',
            canConductInterviews: false,
            canPerformPsychologicalEvaluations: false,
            specializedAreas: [],
            staffType: SupportStaffType.ADMINISTRATIVE,
            responsibilities: [],
            canAccessReports: false,
            canManageSchedules: false
        };
    });

    const [errors, setErrors] = useState<{[key: string]: string}>({});

    // Schedule management state
    const [schedules, setSchedules] = useState<UserSchedule[]>([]);
    const [useCustomSchedules, setUseCustomSchedules] = useState(false);

    // Helper function to check if role can have schedules
    const isEvaluatorRole = (role: UserRole): boolean => {
        return ['TEACHER_LANGUAGE', 'TEACHER_MATHEMATICS', 'TEACHER_ENGLISH', 'CYCLE_DIRECTOR', 'PSYCHOLOGIST', 'INTERVIEWER', 'ADMIN'].includes(role);
    };

    // Schedule management functions
    const addSchedule = () => {
        setSchedules(prev => [...prev, {
            dayOfWeek: 'MONDAY',
            startTime: '10:00',
            endTime: '12:00',
            notes: ''
        }]);
    };

    const removeSchedule = (index: number) => {
        setSchedules(prev => prev.filter((_, i) => i !== index));
    };

    const updateSchedule = (index: number, field: keyof UserSchedule, value: string) => {
        setSchedules(prev => prev.map((schedule, i) =>
            i === index ? { ...schedule, [field]: value } : schedule
        ));
    };

    const resetSchedules = () => {
        setSchedules([]);
        setUseCustomSchedules(false);
    };

    const validateForm = (): boolean => {
        const newErrors: {[key: string]: string} = {};

        console.log('Validando formulario con rol:', formData.role);

        // Validaciones básicas
        if (!formData.firstName.trim()) newErrors.firstName = 'Nombre es requerido';
        if (!formData.lastName.trim()) newErrors.lastName = 'Apellido es requerido';
        if (!formData.email.trim()) newErrors.email = 'Email es requerido';
        if (!formData.email.includes('@mtn.cl')) newErrors.email = 'Debe usar email institucional (@mtn.cl)';
        if (!isEditing && (!formData.password || formData.password.length < 6)) {
            newErrors.password = 'Contraseña debe tener al menos 6 caracteres';
        }

        // Validaciones específicas por rol (simplificadas para backend actual)
        switch (formData.role) {
            case UserRole.PSYCHOLOGIST:
                console.log('Validando PSYCHOLOGIST');
                // Solo validaciones básicas por ahora
                break;
            
            default:
                // Para otros roles, solo validaciones básicas
                console.log('Validando rol:', formData.role);
                break;
        }

        console.log('Errores encontrados:', newErrors);
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('CreateUserForm - handleSubmit llamado');
        console.log('CreateUserForm - formData:', formData);
        
        if (!validateForm()) {
            console.log('CreateUserForm - Validación falló');
            addNotification({
                type: 'error',
                title: 'Error de validación',
                message: 'Por favor completa todos los campos requeridos'
            });
            return;
        }

        console.log('CreateUserForm - Validación exitosa, enviando...');
        setIsSubmitting(true);
        try {
            // Enviar solo los campos básicos que el backend necesita
            const processedFormData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                phone: formData.phone || '',
                customSchedules: useCustomSchedules && isEvaluatorRole(formData.role) ? schedules : undefined
            };

            console.log('🚀 CreateUserForm - Llamando onSubmit con datos procesados:', processedFormData);
            await onSubmit(processedFormData);
            console.log('CreateUserForm - onSubmit completado');
            
            addNotification({
                type: 'success',
                title: 'Usuario creado',
                message: `${formData.firstName} ${formData.lastName} ha sido creado exitosamente`
            });
            resetForm();
            resetSchedules();
            onClose();
        } catch (error) {
            console.error('CreateUserForm - Error en onSubmit:', error);
            addNotification({
                type: 'error',
                title: 'Error',
                message: error instanceof Error ? error.message : 'No se pudo crear el usuario. Intenta nuevamente.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            role: UserRole.TEACHER_LANGUAGE,
            phone: '',
            subjects: [],
            assignedGrades: [],
            department: '',
            yearsOfExperience: 0,
            qualifications: [],
            assignedLevel: KinderLevel.PREKINDER,
            specializations: [],
            specialty: PsychologySpecialty.EDUCATIONAL,
            licenseNumber: '',
            canConductInterviews: false,
            canPerformPsychologicalEvaluations: false,
            specializedAreas: [],
            staffType: SupportStaffType.ADMINISTRATIVE,
            responsibilities: [],
            canAccessReports: false,
            canManageSchedules: false
        });
        setErrors({});
    };

    const updateField = (field: keyof CreateUserRequest, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            
            // Si se cambia el rol, limpiar campos específicos del rol anterior
            if (field === 'role') {
                // Limpiar campos específicos de todos los roles
                newData.subjects = [];
                newData.assignedGrades = [];
                newData.department = '';
                newData.yearsOfExperience = 0;
                newData.qualifications = [];
                newData.assignedLevel = KinderLevel.PREKINDER;
                newData.specializations = [];
                newData.specialty = PsychologySpecialty.EDUCATIONAL;
                newData.licenseNumber = '';
                newData.canConductInterviews = false;
                newData.canPerformPsychologicalEvaluations = false;
                newData.specializedAreas = [];
                newData.staffType = SupportStaffType.ADMINISTRATIVE;
                newData.responsibilities = [];
                newData.canAccessReports = false;
                newData.canManageSchedules = false;
                
                // Inicializar campos específicos del nuevo rol
                if (value === UserRole.SUPPORT_STAFF) {
                    newData.responsibilities = [];
                }
            }
            
            return newData;
        });
        
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const toggleArrayItem = (field: keyof CreateUserRequest, value: string) => {
        const currentArray = (formData[field] as string[]) || [];
        const newArray = currentArray.includes(value)
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value];
        updateField(field, newArray);
    };

    // Mapeo de nombres en español a valores del enum del backend
    const subjectMapping: Record<string, string> = {
        'Matemática': 'MATH',
        'Lenguaje': 'SPANISH', 
        'Inglés': 'ENGLISH',
        // Agregar variaciones para mayor robustez
        'matematica': 'MATH',
        'lenguaje': 'SPANISH',
        'ingles': 'ENGLISH',
        'MATEMATICA': 'MATH',
        'LENGUAJE': 'SPANISH',
        'INGLES': 'ENGLISH'
    };
    
    // Mapeo inverso para mostrar valores del backend en español
    const reverseSubjectMapping: Record<string, string> = {
        'MATH': 'Matemática',
        'SPANISH': 'Lenguaje',
        'ENGLISH': 'Inglés',
        // Agregar mapeo directo para casos donde ya vienen en inglés
        'Math': 'Matemática',
        'Spanish': 'Lenguaje',
        'English': 'Inglés'
    };
    
    const subjects = ['Matemática', 'Lenguaje', 'Inglés']; // Solo estas tres materias para profesores
    const grades = ['PREKINDER', 'KINDER', '1basico', '2basico', '3basico', '4basico', '5basico', '6basico', '7basico', '8basico', '1medio', '2medio', '3medio', '4medio'];
    const gradeLabels: Record<string, string> = {
        'PREKINDER': 'Pre-Kinder',
        'KINDER': 'Kinder',
        '1basico': '1° Básico',
        '2basico': '2° Básico',
        '3basico': '3° Básico',
        '4basico': '4° Básico',
        '5basico': '5° Básico',
        '6basico': '6° Básico',
        '7basico': '7° Básico',
        '8basico': '8° Básico',
        '1medio': '1° Medio',
        '2medio': '2° Medio',
        '3medio': '3° Medio',
        '4medio': '4° Medio'
    };
    const kinderSpecializations = ['Desarrollo Motor', 'Lenguaje Inicial', 'Matemática Temprana', 'Arte y Creatividad', 'Socialización', 'Juego Educativo'];
    const supportStaffResponsibilities = [
        'Gestión administrativa',
        'Atención al público',
        'Manejo de documentación',
        'Coordinación de eventos',
        'Soporte técnico',
        'Gestión de inventarios',
        'Comunicación institucional',
        'Logística escolar'
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <Card className="p-6">
                <h2 className="text-2xl font-bold text-azul-monte-tabor mb-6">
                    {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Nombre"
                            value={formData.firstName}
                            onChange={(e) => updateField('firstName', e.target.value)}
                            error={errors.firstName}
                            isRequired
                        />
                        
                        <Input
                            label="Apellido"
                            value={formData.lastName}
                            onChange={(e) => updateField('lastName', e.target.value)}
                            error={errors.lastName}
                            isRequired
                        />
                        
                        <Input
                            label="Email institucional"
                            type="email"
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            placeholder="nombre@mtn.cl"
                            error={errors.email}
                            isRequired
                        />
                        
                        <Input
                            label="Contraseña"
                            type="password"
                            value={formData.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            placeholder={isEditing ? "Dejar vacío para mantener actual" : "Mínimo 6 caracteres"}
                            error={errors.password}
                            isRequired={!isEditing}
                        />
                        
                        <Input
                            label="Teléfono"
                            value={formData.phone || ''}
                            onChange={(e) => updateField('phone', e.target.value)}
                            placeholder="+56 9 1234 5678"
                        />
                        
                        <div>
                            <label className="block text-sm font-medium text-gris-piedra mb-1">
                                Tipo de Usuario *
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => updateField('role', e.target.value as UserRole)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                            >
                                <option value={UserRole.ADMIN}>Administrador</option>
                                <option value={UserRole.TEACHER_LANGUAGE}>Profesor de Lenguaje</option>
                                <option value={UserRole.TEACHER_MATHEMATICS}>Profesor de Matemáticas</option>
                                <option value={UserRole.TEACHER_ENGLISH}>Profesor de Inglés</option>
                                <option value={UserRole.CYCLE_DIRECTOR}>Director de Ciclo</option>
                                <option value={UserRole.PSYCHOLOGIST}>Psicólogo/a</option>
                                <option value={UserRole.INTERVIEWER}>Entrevistador/a</option>
                            </select>
                        </div>
                    </div>

                    {/* Campos específicos por rol - temporalmente deshabilitados */}
                    {false && formData.role === UserRole.TEACHER_LANGUAGE && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4">Información del Profesor</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <Input
                                    label="Departamento"
                                    value={formData.department || ''}
                                    onChange={(e) => updateField('department', e.target.value)}
                                    error={errors.department}
                                    isRequired
                                />
                                
                                <Input
                                    label="Años de experiencia"
                                    type="number"
                                    value={formData.yearsOfExperience || 0}
                                    onChange={(e) => updateField('yearsOfExperience', parseInt(e.target.value) || 0)}
                                    min="0"
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gris-piedra mb-2">
                                    Materias que enseña *
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {subjects.map(subject => (
                                        <label key={subject} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={(formData.subjects || []).includes(subject)}
                                                onChange={() => toggleArrayItem('subjects', subject)}
                                                className="text-azul-monte-tabor"
                                            />
                                            <span className="text-sm">{subject}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.subjects && <p className="text-red-500 text-sm mt-1">{errors.subjects}</p>}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gris-piedra mb-2">
                                    Niveles asignados *
                                </label>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {grades.map(grade => (
                                        <label key={grade} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={(formData.assignedGrades || []).includes(grade)}
                                                onChange={() => toggleArrayItem('assignedGrades', grade)}
                                                className="text-azul-monte-tabor"
                                            />
                                            <span className="text-xs">{gradeLabels[grade] || grade}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.assignedGrades && <p className="text-red-500 text-sm mt-1">{errors.assignedGrades}</p>}
                            </div>
                        </div>
                    )}

                    {/* Campos específicos para personal de kinder - temporalmente deshabilitados */}
                    {false && formData.role === UserRole.TEACHER_LANGUAGE && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4">Información del Personal de Kinder</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gris-piedra mb-1">
                                        Nivel Asignado *
                                    </label>
                                    <select
                                        value={formData.assignedLevel || KinderLevel.PREKINDER}
                                        onChange={(e) => updateField('assignedLevel', e.target.value as KinderLevel)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                    >
                                        <option value={KinderLevel.PREKINDER}>Pre-Kinder</option>
                                        <option value={KinderLevel.KINDER}>Kinder</option>
                                    </select>
                                    {errors.assignedLevel && <p className="text-red-500 text-sm mt-1">{errors.assignedLevel}</p>}
                                </div>
                                
                                <Input
                                    label="Años de experiencia"
                                    type="number"
                                    value={formData.yearsOfExperience || 0}
                                    onChange={(e) => updateField('yearsOfExperience', parseInt(e.target.value) || 0)}
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gris-piedra mb-2">
                                    Especializaciones
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {kinderSpecializations.map(specialization => (
                                        <label key={specialization} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={(formData.specializations || []).includes(specialization)}
                                                onChange={() => toggleArrayItem('specializations', specialization)}
                                                className="text-azul-monte-tabor"
                                            />
                                            <span className="text-sm">{specialization}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Campos específicos para psicólogos - temporalmente deshabilitados */}
                    {false && formData.role === UserRole.PSYCHOLOGIST && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4">Información del Psicólogo</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gris-piedra mb-1">
                                        Especialidad *
                                    </label>
                                    <select
                                        value={formData.specialty}
                                        onChange={(e) => updateField('specialty', e.target.value as PsychologySpecialty)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                    >
                                        <option value={PsychologySpecialty.EDUCATIONAL}>Psicología Educacional</option>
                                        <option value={PsychologySpecialty.CLINICAL}>Psicología Clínica</option>
                                        <option value={PsychologySpecialty.DEVELOPMENTAL}>Psicología del Desarrollo</option>
                                        <option value={PsychologySpecialty.COGNITIVE}>Psicología Cognitiva</option>
                                    </select>
                                </div>
                                
                                <Input
                                    label="Número de licencia"
                                    value={formData.licenseNumber || ''}
                                    onChange={(e) => updateField('licenseNumber', e.target.value)}
                                    error={errors.licenseNumber}
                                    isRequired
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gris-piedra mb-2">Permisos</label>
                                <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.canConductInterviews}
                                            onChange={(e) => updateField('canConductInterviews', e.target.checked)}
                                        />
                                        <span>Puede realizar entrevistas</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.canPerformPsychologicalEvaluations}
                                            onChange={(e) => updateField('canPerformPsychologicalEvaluations', e.target.checked)}
                                        />
                                        <span>Puede realizar evaluaciones psicológicas</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gris-piedra mb-2">
                                    Niveles asignados *
                                </label>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {grades.map(grade => (
                                        <label key={grade} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={(formData.assignedGrades || []).includes(grade)}
                                                onChange={() => toggleArrayItem('assignedGrades', grade)}
                                                className="text-azul-monte-tabor"
                                            />
                                            <span className="text-xs">{gradeLabels[grade] || grade}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.assignedGrades && <p className="text-red-500 text-sm mt-1">{errors.assignedGrades}</p>}
                            </div>
                        </div>
                    )}

                    {/* Campos específicos para personal de apoyo - temporalmente deshabilitados */}
                    {false && formData.role === UserRole.CYCLE_DIRECTOR && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-azul-monte-tabor mb-4">Información del Personal de Apoyo</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gris-piedra mb-1">
                                        Tipo de personal *
                                    </label>
                                    <select
                                        value={formData.staffType}
                                        onChange={(e) => updateField('staffType', e.target.value as SupportStaffType)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-monte-tabor"
                                    >
                                        <option value={SupportStaffType.ADMINISTRATIVE}>Administrativo</option>
                                        <option value={SupportStaffType.TECHNICAL}>Técnico</option>
                                        <option value={SupportStaffType.ACADEMIC_COORDINATOR}>Coordinador Académico</option>
                                        <option value={SupportStaffType.STUDENT_SERVICES}>Servicios Estudiantiles</option>
                                        <option value={SupportStaffType.IT_SUPPORT}>Soporte TI</option>
                                    </select>
                                </div>
                                
                                <Input
                                    label="Departamento"
                                    value={formData.department || ''}
                                    onChange={(e) => updateField('department', e.target.value)}
                                    error={errors.department}
                                    isRequired
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gris-piedra mb-2">Permisos</label>
                                <div className="space-y-2">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.canAccessReports}
                                            onChange={(e) => updateField('canAccessReports', e.target.checked)}
                                        />
                                        <span>Puede acceder a reportes</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.canManageSchedules}
                                            onChange={(e) => updateField('canManageSchedules', e.target.checked)}
                                        />
                                        <span>Puede gestionar horarios</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gris-piedra mb-2">
                                    Responsabilidades *
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {supportStaffResponsibilities.map(responsibility => (
                                        <label key={responsibility} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={(formData.responsibilities || []).includes(responsibility)}
                                                onChange={() => toggleArrayItem('responsibilities', responsibility)}
                                                className="text-azul-monte-tabor"
                                            />
                                            <span className="text-sm">{responsibility}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.responsibilities && <p className="text-red-500 text-sm mt-1">{errors.responsibilities}</p>}
                            </div>
                        </div>
                    )}

                    {/* Schedule Management Section */}
                    {!isEditing && isEvaluatorRole(formData.role) && (
                        <div className="border-t pt-6">
                            <div className="flex items-center gap-3 mb-4">
                                <FiCalendar className="w-5 h-5 text-azul-monte-tabor" />
                                <h3 className="text-lg font-semibold text-azul-monte-tabor">
                                    Horarios de Entrevista
                                </h3>
                            </div>

                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <label className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={useCustomSchedules}
                                        onChange={(e) => setUseCustomSchedules(e.target.checked)}
                                        className="text-azul-monte-tabor"
                                    />
                                    <div>
                                        <span className="font-medium text-azul-monte-tabor">
                                            Configurar horarios personalizados
                                        </span>
                                        <p className="text-sm text-gris-piedra mt-1">
                                            Si no se selecciona, se crearán horarios por defecto (Lunes-Viernes 10:00-12:00 y 14:00-16:00)
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {useCustomSchedules && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium text-gris-piedra">
                                            Horarios Personalizados
                                        </h4>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addSchedule}
                                            leftIcon={<FiPlus className="w-4 h-4" />}
                                        >
                                            Agregar Horario
                                        </Button>
                                    </div>

                                    {schedules.length === 0 ? (
                                        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                                            <FiClock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gris-piedra">
                                                No hay horarios configurados. Haz clic en "Agregar Horario" para comenzar.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {schedules.map((schedule, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gris-piedra mb-1">
                                                                Día de la Semana
                                                            </label>
                                                            <select
                                                                value={schedule.dayOfWeek}
                                                                onChange={(e) => updateSchedule(index, 'dayOfWeek', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                                            >
                                                                {getDayOfWeekOptions().map(option => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gris-piedra mb-1">
                                                                Hora de Inicio
                                                            </label>
                                                            <select
                                                                value={schedule.startTime}
                                                                onChange={(e) => updateSchedule(index, 'startTime', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                                            >
                                                                {getTimeSlotOptions().map(option => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gris-piedra mb-1">
                                                                Hora de Fin
                                                            </label>
                                                            <select
                                                                value={schedule.endTime}
                                                                onChange={(e) => updateSchedule(index, 'endTime', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                                            >
                                                                {getTimeSlotOptions().map(option => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="flex items-end">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => removeSchedule(index)}
                                                                leftIcon={<FiTrash2 className="w-4 h-4" />}
                                                                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                                                            >
                                                                Eliminar
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gris-piedra mb-1">
                                                            Notas (opcional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={schedule.notes || ''}
                                                            onChange={(e) => updateSchedule(index, 'notes', e.target.value)}
                                                            placeholder="Información adicional sobre este horario..."
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-4 pt-6 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                resetSchedules();
                                onClose();
                            }}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                            loadingText={isEditing ? "Actualizando usuario..." : "Creando usuario..."}
                            className="flex-1"
                        >
                            {isEditing ? "Actualizar Usuario" : "Crear Usuario"}
                        </Button>
                    </div>
                </form>
            </Card>
        </Modal>
    );
};

export default CreateUserForm;