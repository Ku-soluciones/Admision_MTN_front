import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Input from '../components/ui/Input';
import RutInput from '../components/ui/RutInput';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmailVerification from '../components/ui/EmailVerification';
import ErrorModal from '../components/ui/ErrorModal';
import { CheckCircleIcon, LogoIcon, UploadIcon } from '../components/icons/Icons';
import { useApplications, useNotifications } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { educationalLevelsForForm as educationalLevels } from '../services/staticData';
import { microfrontendUrls } from '../utils/microfrontendUrls';
import api from '../services/api';
import { applicationService } from '../services/applicationService';
import { documentService, DOCUMENT_TYPES } from '../services/documentService';
import profileService from '../services/profileService';

const steps = [
  "Información del Postulante",    // 0 - Nombre, RUT, Fecha de Nacimiento, Email
  "Lugar de Residencia",           // 1 - Dirección, Comuna, Ciudad
  "Postulación",                   // 2 - Grado, Colegio, Preferencia
  "Datos del Padre",               // 3
  "Datos de la Madre",             // 4
  "Sostenedor",                    // 5
  "Apoderado",                     // 6
  "Documentación",                 // 7
  "Confirmación"                   // 8
];

const gradeOptions = educationalLevels.map(level => ({
    value: level.value,
    label: level.label
}));

const schoolOptions = [
    { value: '', label: 'Seleccione un colegio...' },
    { value: 'MONTE_TABOR', label: 'Monte Tabor' },
    { value: 'NAZARET', label: 'Nazaret' }
];

console.log('School options loaded:', schoolOptions);

const validationConfig = {
    firstName: { required: true, minLength: 2 },
    paternalLastName: { required: true, minLength: 2 },
    maternalLastName: { required: true, minLength: 2 },
    rut: { required: true, minLength: 9 },
    birthDate: { required: true },
    grade: { required: true },
    schoolApplied: { required: true },
    admissionPreference: { required: true },
    studentEmail: { email: true },
    studentAddress: { required: true, minLength: 5 },
    currentSchool: { minLength: 2 }, // Será requerido condicionalmente
    parent1Name: { required: true, minLength: 2 },
    parent1Email: { required: true, email: true },
    parent1Phone: { required: true, pattern: /^[+]?[\d\s-]{8,}$/ },
    parent1Rut: { required: true, minLength: 9 },
    parent1Address: { required: true, minLength: 5 },
    parent1Profession: { required: true, minLength: 2 },
    parent2Name: { required: true, minLength: 2 },
    parent2Email: { required: true, email: true },
    parent2Phone: { required: true, pattern: /^[+]?[\d\s-]{8,}$/ },
    parent2Rut: { required: true, minLength: 9 },
    parent2Address: { required: true, minLength: 5 },
    parent2Profession: { required: true, minLength: 2 },
    supporterName: { required: true, minLength: 2 },
    supporterEmail: { required: true, email: true },
    supporterPhone: { required: true, pattern: /^[+]?[\d\s-]{8,}$/ },
    supporterRut: { required: true, minLength: 9 },
    supporterRelation: { required: true },
    guardianName: { required: true, minLength: 2 },
    guardianEmail: { required: true, email: true },
    guardianPhone: { required: true, pattern: /^[+]?[\d\s-]{8,}$/ },
    guardianRut: { required: true, minLength: 9 },
    guardianRelation: { required: true }
};

const ApplicationForm: React.FC = () => {
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState(0);
    const [accountCreated, setAccountCreated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [showAuthForm, setShowAuthForm] = useState(true);
    const [showRegister, setShowRegister] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const [submittedApplicationId, setSubmittedApplicationId] = useState<number | null>(null);
    const [uploadedDocuments, setUploadedDocuments] = useState<Map<string, File>>(new Map());
    const [existingDocuments, setExistingDocuments] = useState<any[]>([]);

    // Flag to indicate if user is adding another child (skip family data steps)
    const [isAddingAnotherChild, setIsAddingAnotherChild] = useState(false);

    // Estado para el modal de errores
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalData, setErrorModalData] = useState({
        title: '',
        message: '',
        errors: [] as string[]
    });

    const { addApplication } = useApplications();
    const { addNotification } = useNotifications();
    const { user, isAuthenticated, login, register } = useAuth();
    
    // Estado del formulario simplificado
    const [data, setData] = useState<any>({});
    const [errors, setErrors] = useState<any>({});
    
    // Estado para autenticación
    const [authData, setAuthData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        rut: '',
        passport: '', // Para estudiantes extranjeros
        nationality: 'CHILENA', // 'CHILENA' o 'EXTRANJERA'
        confirmPassword: '',
        address: '',
        profession: '',
        guardianType: '' // ex-alumno, funcionario, nuevo
    });
    
    // Estado para verificación de email
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    // Estado para cargar perfil del usuario
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    
    // Helper function to convert to uppercase for text fields
    const toUpperCase = (value: string) => {
        return value ? value.toUpperCase() : '';
    };

    // Fields that should be converted to uppercase
    const uppercaseFields = [
        'firstName', 'paternalLastName', 'maternalLastName', 'studentAddress', 'currentSchool', 'additionalNotes',
        'parent1Name', 'parent1Address', 'parent1Profession',
        'parent2Name', 'parent2Address', 'parent2Profession',
        'supporterName', 'supporterRelation',
        'guardianName', 'guardianRelation'
    ];

    // Helper function to update fields
    const updateField = useCallback((name: string, value: any) => {
        // Apply uppercase transformation for specific fields
        const processedValue = uppercaseFields.includes(name) && typeof value === 'string'
            ? toUpperCase(value)
            : value;

        console.log(`updateField called - ${name}:`, value, '→', processedValue);
        setData(prev => {
            const newData = { ...prev, [name]: processedValue };
            console.log('New data state:', newData);
            return newData;
        });
    }, []);
    
    // Helper function to touch fields (placeholder)
    const touchField = useCallback((name: string) => {
        // Simple placeholder for now
    }, []);
    
    // Función para actualizar datos de autenticación
    const updateAuthField = useCallback((name: string, value: string) => {
        // Apply uppercase transformation for names, address, and profession
        const processedValue = (name === 'firstName' || name === 'lastName' || name === 'address' || name === 'profession')
            ? value.toUpperCase()
            : value;

        setAuthData(prev => ({ ...prev, [name]: processedValue }));
    }, []);
    
    // Función para manejar login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('ApplicationForm - handleLogin: Starting login process');
        setAuthLoading(true);
        setAuthError('');

        try {
            console.log('ApplicationForm - handleLogin: Calling login with:', authData.email);
            await login(authData.email, authData.password, 'apoderado');
            console.log('ApplicationForm - handleLogin: Login successful, hiding auth form');
            setShowAuthForm(false);

            // Pre-llenar el formulario con datos del usuario autenticado
            await loadUserProfileAndPopulate();
            console.log('ApplicationForm - handleLogin: Profile loaded and populated');
        } catch (err) {
            console.error('ApplicationForm - handleLogin: Login failed:', err);
            setAuthError('Credenciales inválidas. Verifique su email y contraseña.');
        } finally {
            setAuthLoading(false);
        }
    };

    // Función para manejar registro
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('ApplicationForm - handleRegister: Starting registration process');
        setAuthLoading(true);
        setAuthError('');

        // Validar verificación de email
        if (!isEmailVerified) {
            console.warn('ApplicationForm - handleRegister: Email not verified');
            setAuthError('Debe verificar su dirección de correo electrónico antes de continuar');
            setAuthLoading(false);
            return;
        }

        // Validaciones
        if (!authData.guardianType) {
            setAuthError('Debe seleccionar el tipo de apoderado');
            setAuthLoading(false);
            return;
        }

        if (authData.password !== authData.confirmPassword) {
            setAuthError('Las contraseñas no coinciden');
            setAuthLoading(false);
            return;
        }

        if (authData.password.length < 8 || authData.password.length > 10) {
            setAuthError('La contraseña debe tener entre 8 y 10 caracteres');
            setAuthLoading(false);
            return;
        }

        try {
            // Registrar usuario con información básica
            console.log('ApplicationForm - handleRegister: Calling register with:', authData.email);
            await register(authData, 'apoderado');
            console.log('ApplicationForm - handleRegister: Registration successful, hiding auth form');
            setShowAuthForm(false);

            // Intentar actualizar el perfil con información adicional
            if (authData.address || authData.profession) {
                try {
                    await profileService.updateProfile({
                        address: authData.address,
                        profession: authData.profession
                    });
                } catch (profileError) {
                    console.warn('No se pudo actualizar el perfil con información adicional:', profileError);
                }
            }

            // Pre-llenar el formulario con datos del registro
            populateParentFields({
                email: authData.email,
                firstName: authData.firstName,
                lastName: authData.lastName,
                phone: authData.phone,
                rut: authData.rut,
                address: authData.address,
                profession: authData.profession
            });
        } catch (err: any) {
            console.error('Error en registro:', err);

            // Determinar el mensaje de error específico
            let errorMessage = 'No se pudo crear la cuenta. Por favor, intente nuevamente.';
            let errorDetails: string[] = [];

            if (err.response?.data) {
                const backendError = err.response.data;

                // Errores comunes del backend
                if (backendError.message) {
                    errorMessage = backendError.message;
                }

                // Errores específicos
                if (backendError.message?.includes('ya existe') || backendError.message?.includes('already exists')) {
                    errorMessage = 'Ya existe una cuenta con estos datos';
                    errorDetails.push('El correo electrónico ya está registrado en el sistema');
                    errorDetails.push('Si olvidó su contraseña, use la opción "Iniciar Sesión" y luego "Recuperar Contraseña"');
                } else if (backendError.message?.includes('RUT') || backendError.message?.includes('rut')) {
                    errorMessage = 'Problema con el RUT ingresado';
                    errorDetails.push('El RUT ya está registrado o tiene un formato inválido');
                    errorDetails.push('Verifique que el RUT esté correctamente escrito (ej: 12.345.678-5)');
                } else if (backendError.message?.includes('email') || backendError.message?.includes('correo')) {
                    errorMessage = 'Problema con el correo electrónico';
                    errorDetails.push('El correo ingresado ya está en uso');
                    errorDetails.push('Use otro correo electrónico o inicie sesión con su cuenta existente');
                } else if (backendError.errors && Array.isArray(backendError.errors)) {
                    errorDetails = backendError.errors;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            // Mostrar modal de error
            setErrorModalData({
                title: 'Error al Crear Cuenta',
                message: errorMessage,
                errors: errorDetails
            });
            setShowErrorModal(true);
            setAuthError(errorMessage);
        } finally {
            setAuthLoading(false);
        }
    };
    
    // Función para cargar perfil del usuario y popular campos
    const loadUserProfileAndPopulate = useCallback(async () => {
        if (!isAuthenticated || !user) return;

        setIsLoadingProfile(true);
        try {
            // Intentar obtener perfil completo del usuario
            const profile = await profileService.getCurrentUser();
            setUserProfile(profile);

            // Popular campos con información del perfil completo
            populateParentFields({
                email: profile.email || user.email,
                firstName: profile.firstName || user.firstName,
                lastName: profile.lastName || user.lastName,
                phone: profile.phone || user.phone || '',
                rut: profile.rut || user.rut || '',
                address: profile.address || '',
                profession: profile.profession || ''
            });
        } catch (error) {
            console.warn('No se pudo cargar el perfil completo, usando datos básicos:', error);
            // Fallback: usar datos básicos del usuario autenticado
            populateParentFields({
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone || '',
                rut: user.rut || '',
                address: '',
                profession: ''
            });
        } finally {
            setIsLoadingProfile(false);
        }
    }, [isAuthenticated, user]);

    // Función helper para popular campos del padre
    const populateParentFields = useCallback((userData: {
        email: string;
        firstName: string;
        lastName: string;
        phone: string;
        rut: string;
        address: string;
        profession: string;
    }) => {
        updateField('parent1Email', userData.email);
        updateField('parent1Name', `${userData.firstName} ${userData.lastName}`.toUpperCase());
        updateField('parent1Phone', userData.phone);
        updateField('parent1Rut', userData.rut);
        updateField('parent1Address', userData.address.toUpperCase());
        updateField('parent1Profession', userData.profession.toUpperCase());
    }, [updateField]);

    // Verificar si el usuario ya está autenticado
    useEffect(() => {
        console.log('ApplicationForm - Auth Status Changed:', { isAuthenticated, user: user ? { email: user.email, role: user.role } : null, showAuthForm });
        if (isAuthenticated && user) {
            console.log('ApplicationForm - User authenticated, hiding auth form');
            setShowAuthForm(false);
            // Cargar perfil completo y popular campos
            loadUserProfileAndPopulate();
        } else {
            console.log('ApplicationForm - User not authenticated, should show auth form');
        }
    }, [isAuthenticated, user, loadUserProfileAndPopulate]);
    
    // Inicializar el año de postulación con año actual + 1
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const applicationYear = (currentYear + 1).toString();
        if (!data.applicationYear) {
            updateField('applicationYear', applicationYear);
        }
    }, []);

    // Helper function to check if current school is required
    const requiresCurrentSchool = useCallback((grade: string): boolean => {
        const schoolRequiredGrades = [
            '2basico', '3basico', '4basico', '5basico', '6basico', '7basico', '8basico',
            '1medio', '2medio', '3medio', '4medio'
        ];
        return schoolRequiredGrades.includes(grade);
    }, []);

    // Helper function to parse address from backend into separate fields
    const parseAddress = useCallback((fullAddress: string): {
        street: string;
        number: string;
        commune: string;
        apartment: string;
    } => {
        if (!fullAddress) {
            return { street: '', number: '', commune: '', apartment: '' };
        }

        // Format expected: "CALLE NUMERO, COMUNA, DEPTO"
        // Example: "AV. PROVIDENCIA 1234, PROVIDENCIA, DEPTO 302"
        const parts = fullAddress.split(',').map(p => p.trim());

        // First part: street and number
        const streetAndNumber = parts[0] || '';
        const lastSpace = streetAndNumber.lastIndexOf(' ');

        const street = lastSpace > 0 ? streetAndNumber.substring(0, lastSpace).trim() : streetAndNumber;
        const number = lastSpace > 0 ? streetAndNumber.substring(lastSpace + 1).trim() : '';

        // Second part: commune
        const commune = parts[1] || '';

        // Third part: apartment (optional)
        const apartment = parts[2] || '';

        return { street, number, commune, apartment };
    }, []);

    // Pre-fill form when in edit mode (from dashboard) OR when adding another child (prefill family data)
    useEffect(() => {
        const loadEditModeData = async () => {
            console.log('ApplicationForm useEffect - Checking location.state:', location.state);

            // CASO 1: Agregar otro hijo - pre-llenar datos familiares
            if (location.state?.prefillFamilyData && location.state?.familyData) {
                const familyData = location.state.familyData;
                console.log('Prefill family data detected!');
                console.log('Family data received:', familyData);
                console.log('Father data:', familyData.father);
                console.log('Mother data:', familyData.mother);
                console.log('Guardian data:', familyData.guardian);
                console.log('Supporter data:', familyData.supporter);

                // Hide auth form since user is already authenticated
                setShowAuthForm(false);

                // Set flag to skip family data steps (steps 1, 2, 3)
                setIsAddingAnotherChild(true);

                // Extract family address (prefer father's, then mother's)
                const familyAddress = familyData.father?.address || familyData.mother?.address || '';

                // Calculate application year (current year + 1)
                const currentYear = new Date().getFullYear();
                const nextYear = currentYear + 1;

                // Pre-llenar datos familiares (padres, apoderado, sostenedor)
                // Y también pre-llenar la dirección del estudiante (típicamente la misma que la familia)
                setData({
                    // Application year (always next year)
                    applicationYear: nextYear.toString(),

                    // Student address (pre-filled with family address)
                    studentAddress: familyAddress,

                    // Father data (parent1)
                    parent1Name: familyData.father?.fullName || '',
                    parent1Email: familyData.father?.email || '',
                    parent1Phone: familyData.father?.phone || '',
                    parent1Rut: familyData.father?.rut || '',
                    parent1Address: familyData.father?.address || '',
                    parent1Profession: familyData.father?.profession || '',

                    // Mother data (parent2)
                    parent2Name: familyData.mother?.fullName || '',
                    parent2Email: familyData.mother?.email || '',
                    parent2Phone: familyData.mother?.phone || '',
                    parent2Rut: familyData.mother?.rut || '',
                    parent2Address: familyData.mother?.address || '',
                    parent2Profession: familyData.mother?.profession || '',

                    // Supporter data
                    supporterName: familyData.supporter?.fullName || '',
                    supporterEmail: familyData.supporter?.email || '',
                    supporterPhone: familyData.supporter?.phone || '',
                    supporterRut: familyData.supporter?.rut || '',
                    supporterRelation: familyData.supporter?.relationship || '',

                    // Guardian data
                    guardianName: familyData.guardian?.fullName || '',
                    guardianEmail: familyData.guardian?.email || '',
                    guardianPhone: familyData.guardian?.phone || '',
                    guardianRut: familyData.guardian?.rut || '',
                    guardianRelation: familyData.guardian?.relationship || ''
                });

                console.log('Family data pre-filled successfully - student fields remain empty for new application');
                return; // Exit early - no need to check edit mode
            }

            // CASO 2: Modo edición - pre-llenar toda la postulación existente
            if (location.state?.editMode && location.state?.applicationData) {
                const appData = location.state.applicationData;
                console.log('Edit mode detected, pre-filling form with:', appData);

                // Hide auth form when in edit mode
                setShowAuthForm(false);

                // Helper to split full name into first and last name
                const splitFullName = (fullName: string) => {
                    if (!fullName) return { firstName: '', lastName: '' };
                    const parts = fullName.trim().split(' ');
                    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
                    const firstName = parts[0];
                    const lastName = parts.slice(1).join(' ');
                    return { firstName, lastName };
                };

                // Map backend data structure to form data structure
                setData({
                    // Student data
                    firstName: appData.student?.firstName || '',
                    paternalLastName: appData.student?.paternalLastName || (splitFullName(appData.student?.lastName || '').firstName || ''),
                    maternalLastName: appData.student?.maternalLastName || (splitFullName(appData.student?.lastName || '').lastName || ''),
                    rut: appData.student?.rut || '',
                    birthDate: appData.student?.birthDate ? appData.student.birthDate.split('T')[0] : '',
                    grade: appData.student?.gradeApplied || '',
                    schoolApplied: appData.schoolApplied || appData.student?.schoolApplied || '',
                    studentAddress: appData.student?.address || '',
                    studentEmail: appData.student?.email || '',
                    currentSchool: appData.student?.currentSchool || '',
                    additionalNotes: appData.student?.additionalNotes || '',
                    admissionPreference: appData.student?.admissionPreference || appData.admissionPreference || '',
                    applicationYear: appData.applicationYear || new Date().getFullYear() + 1,
                    pais: appData.pais || 'Chile',
                    region: appData.region || '',
                    comuna: appData.comuna || '',

                    // Father data (parent1)
                    parent1Name: appData.father?.fullName || '',
                    parent1Email: appData.father?.email || '',
                    parent1Phone: appData.father?.phone || '',
                    parent1Rut: appData.father?.rut || '',
                    parent1Address: appData.father?.address || '',
                    parent1Profession: appData.father?.profession || '',

                    // Mother data (parent2)
                    parent2Name: appData.mother?.fullName || '',
                    parent2Email: appData.mother?.email || '',
                    parent2Phone: appData.mother?.phone || '',
                    parent2Rut: appData.mother?.rut || '',
                    parent2Address: appData.mother?.address || '',
                    parent2Profession: appData.mother?.profession || '',

                    // Supporter data
                    supporterName: appData.supporter?.fullName || '',
                    supporterEmail: appData.supporter?.email || '',
                    supporterPhone: appData.supporter?.phone || '',
                    supporterRut: appData.supporter?.rut || '',
                    supporterRelation: appData.supporter?.relationship || '',

                    // Guardian data
                    guardianName: appData.guardian?.fullName || '',
                    guardianEmail: appData.guardian?.email || '',
                    guardianPhone: appData.guardian?.phone || '',
                    guardianRut: appData.guardian?.rut || '',
                    guardianRelation: appData.guardian?.relationship || ''
                });

                console.log('Form pre-filled successfully');

                // Load existing documents
                if (location.state.applicationId) {
                    try {
                        console.log('Loading existing documents for application:', location.state.applicationId);
                        const response = await applicationService.getApplicationDocuments(location.state.applicationId);
                        // El endpoint devuelve { success: true, documents: [...] }
                        const documents = response.documents || response || [];
                        setExistingDocuments(documents);
                        console.log('Existing documents loaded:', documents);
                    } catch (error) {
                        console.error('Error loading documents:', error);
                        setExistingDocuments([]);
                    }
                }
            }
        };

        loadEditModeData();
    }, [location.state]);

    // Parse address from backend when studentAddress is loaded
    useEffect(() => {
        if (data.studentAddress && !data.studentAddressStreet) {
            // Only parse if we have the combined address but not the separate fields
            console.log('Parsing address from backend:', data.studentAddress);
            const parsed = parseAddress(data.studentAddress);
            console.log('Parsed address:', parsed);

            // Update separate fields without triggering re-combination
            setData((prev: any) => ({
                ...prev,
                studentAddressStreet: parsed.street,
                studentAddressNumber: parsed.number,
                studentAddressCommune: parsed.commune,
                studentAddressApartment: parsed.apartment
            }));
        }
    }, [data.studentAddress, data.studentAddressStreet, parseAddress]);

    // Helper function to validate birth date coherence with grade
    const validateBirthDateForGrade = useCallback((birthDate: string, grade: string): { valid: boolean; message?: string } => {
        if (!birthDate || !grade) return { valid: true };

        const birth = new Date(birthDate);
        const currentYear = new Date().getFullYear();
        const age = currentYear - birth.getFullYear();

        // Define expected ages for each grade (approximate range)
        const gradeAgeRanges: { [key: string]: { min: number; max: number; name: string } } = {
            'playgroup': { min: 2, max: 3, name: 'Playgroup' },
            'prekinder': { min: 3, max: 5, name: 'Pre-Kínder' },
            'kinder': { min: 4, max: 6, name: 'Kínder' },
            '1basico': { min: 5, max: 7, name: '1° Básico' },
            '2basico': { min: 6, max: 8, name: '2° Básico' },
            '3basico': { min: 7, max: 9, name: '3° Básico' },
            '4basico': { min: 8, max: 10, name: '4° Básico' },
            '5basico': { min: 9, max: 11, name: '5° Básico' },
            '6basico': { min: 10, max: 12, name: '6° Básico' },
            '7basico': { min: 11, max: 13, name: '7° Básico' },
            '8basico': { min: 12, max: 14, name: '8° Básico' },
            '1medio': { min: 13, max: 15, name: '1° Medio' },
            '2medio': { min: 14, max: 16, name: '2° Medio' },
            '3medio': { min: 15, max: 17, name: '3° Medio' },
            '4medio': { min: 16, max: 18, name: '4° Medio' }
        };

        const range = gradeAgeRanges[grade];
        if (!range) return { valid: true };

        if (age < range.min || age > range.max) {
            return {
                valid: false,
                message: `La edad del postulante (${age} años) no es apropiada para ${range.name}. Se espera una edad entre ${range.min} y ${range.max} años.`
            };
        }

        return { valid: true };
    }, []);

    // Helper function to auto-fill data when parent is selected
    const handleParentRelationChange = useCallback((field: string, value: string, type: 'supporter' | 'guardian') => {
        updateField(`${type}Relation`, value);
        
        if (value === 'padre') {
            // Auto-fill with father's data
            updateField(`${type}Name`, data.parent1Name || '');
            updateField(`${type}Email`, data.parent1Email || '');
            updateField(`${type}Phone`, data.parent1Phone || '');
            updateField(`${type}Rut`, data.parent1Rut || '');
        } else if (value === 'madre') {
            // Auto-fill with mother's data
            updateField(`${type}Name`, data.parent2Name || '');
            updateField(`${type}Email`, data.parent2Email || '');
            updateField(`${type}Phone`, data.parent2Phone || '');
            updateField(`${type}Rut`, data.parent2Rut || '');
        } else {
            // Clear fields for other relationships
            updateField(`${type}Name`, '');
            updateField(`${type}Email`, '');
            updateField(`${type}Phone`, '');
            updateField(`${type}Rut`, '');
        }
    }, [data.parent1Name, data.parent1Email, data.parent1Phone, data.parent1Rut, data.parent2Name, data.parent2Email, data.parent2Phone, data.parent2Rut, updateField]);

    const validateCurrentStep = useCallback((): boolean => {
        const isValidEmail = (email: string): boolean => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        };

        const isValidPhone = (phone: string): boolean => {
            const phoneRegex = /^[+]?[\d\s-]{8,}$/;
            return phoneRegex.test(phone);
        };

        switch (currentStep) {
            // Step 0: Información del Postulante
            case 0:
                if (!data.firstName?.trim() || !data.paternalLastName?.trim() || !data.maternalLastName?.trim() ||
                    !data.rut?.trim() || !data.birthDate) {
                    return false;
                }
                // Validate birth date coherence with grade
                if (data.grade) {
                    const birthDateValidation = validateBirthDateForGrade(data.birthDate, data.grade);
                    if (!birthDateValidation.valid) {
                        return false;
                    }
                }
                // Validate optional email if provided
                if (data.studentEmail && !isValidEmail(data.studentEmail)) {
                    return false;
                }
                return true;

            // Step 1: Lugar de Residencia
            case 1:
                if (!data.studentAddressStreet?.trim() || !data.studentAddressNumber?.trim() || !data.studentAddressCommune?.trim()) {
                    return false;
                }
                const pais = data.pais || 'Chile';
                if (pais === 'Chile' && !data.region?.trim()) {
                    return false;
                }
                return true;

            // Step 2: Postulación
            case 2:
                if (!data.grade || !data.schoolApplied || !data.applicationYear || !data.admissionPreference) {
                    return false;
                }
                if (requiresCurrentSchool(data.grade || '') && !data.currentSchool?.trim()) {
                    return false;
                }
                return true;

            // Step 3: Datos del Padre
            case 3:
                if (!data.parent1Name?.trim() || !data.parent1Email?.trim() || !data.parent1Phone?.trim() ||
                    !data.parent1Rut?.trim() || !data.parent1Address?.trim() || !data.parent1Profession?.trim()) {
                    return false;
                }
                if (!isValidEmail(data.parent1Email || '') || !isValidPhone(data.parent1Phone || '')) {
                    return false;
                }
                return true;

            // Step 4: Datos de la Madre
            case 4:
                if (!data.parent2Name?.trim() || !data.parent2Email?.trim() || !data.parent2Phone?.trim() ||
                    !data.parent2Rut?.trim() || !data.parent2Address?.trim() || !data.parent2Profession?.trim()) {
                    return false;
                }
                if (!isValidEmail(data.parent2Email || '') || !isValidPhone(data.parent2Phone || '')) {
                    return false;
                }
                return true;

            // Step 5: Sostenedor
            case 5:
                if (!data.supporterName?.trim() || !data.supporterEmail?.trim() || !data.supporterPhone?.trim() ||
                    !data.supporterRut?.trim() || !data.supporterRelation) {
                    return false;
                }
                if (!isValidEmail(data.supporterEmail || '') || !isValidPhone(data.supporterPhone || '')) {
                    return false;
                }
                return true;

            // Step 6: Apoderado
            case 6:
                if (!data.guardianName?.trim() || !data.guardianEmail?.trim() || !data.guardianPhone?.trim() ||
                    !data.guardianRut?.trim() || !data.guardianRelation) {
                    return false;
                }
                if (!isValidEmail(data.guardianEmail || '') || !isValidPhone(data.guardianPhone || '')) {
                    return false;
                }
                return true;

            // Step 7: Documentación (opcional)
            case 7:
                return true;

            // Step 8: Confirmación
            case 8:
                return true;

            default:
                return true;
        }
    }, [data, currentStep, requiresCurrentSchool]);

    const getStepFields = useCallback((step: number): string[] => {
        switch (step) {
            case 0: return ['firstName', 'paternalLastName', 'maternalLastName', 'rut', 'birthDate', 'grade', 'studentAddress'];
            case 1: return ['parent1Name', 'parent1Email', 'parent1Phone', 'parent1Rut', 'parent1Address', 'parent1Profession', 'parent2Name', 'parent2Email', 'parent2Phone', 'parent2Rut', 'parent2Address', 'parent2Profession'];
            case 2: return ['supporterName', 'supporterEmail', 'supporterPhone', 'supporterRut', 'supporterRelation'];
            case 3: return ['guardianName', 'guardianEmail', 'guardianPhone', 'guardianRut', 'guardianRelation'];
            case 4: return []; // Document upload step
            case 5: return []; // Confirmation step
            default: return [];
        }
    }, []);

    const nextStep = async () => {
        if (validateCurrentStep()) {
            let nextStepIndex = currentStep + 1;

            // Si es el paso de documentación (step 7), enviar la postulación
            if (currentStep === 7) {
                setIsSubmitting(true);
                try {
                    // Determinar si estamos en modo edición o creación
                    const isEditMode = location.state?.editMode && location.state?.applicationId;
                    let applicationRequest: any;
                    let response;

                    if (isEditMode) {
                        // Formato anidado para PUT (actualización)
                        applicationRequest = {
                            student: {
                                firstName: data.firstName,
                                paternalLastName: data.paternalLastName,
                                maternalLastName: data.maternalLastName,
                                rut: data.rut,
                                birthDate: data.birthDate,
                                email: data.studentEmail,
                                address: data.studentAddress,
                                gradeApplied: data.grade,
                                currentSchool: data.currentSchool,
                                additionalNotes: data.additionalNotes,
                                admissionPreference: data.admissionPreference
                            },
                            father: {
                                fullName: data.parent1Name,
                                rut: data.parent1Rut,
                                email: data.parent1Email,
                                phone: data.parent1Phone,
                                address: data.parent1Address,
                                profession: data.parent1Profession
                            },
                            mother: {
                                fullName: data.parent2Name,
                                rut: data.parent2Rut,
                                email: data.parent2Email,
                                phone: data.parent2Phone,
                                address: data.parent2Address,
                                profession: data.parent2Profession
                            },
                            supporter: {
                                fullName: data.supporterName,
                                rut: data.supporterRut,
                                email: data.supporterEmail,
                                phone: data.supporterPhone,
                                relationship: data.supporterRelation
                            },
                            guardian: {
                                fullName: data.guardianName,
                                rut: data.guardianRut,
                                email: data.guardianEmail,
                                phone: data.guardianPhone,
                                relationship: data.guardianRelation
                            },
                            schoolApplied: data.schoolApplied
                        };

                        // Actualizar aplicación existente
                        console.log('Actualizando postulación:', location.state.applicationId, applicationRequest);
                        response = await applicationService.updateApplication(location.state.applicationId, applicationRequest);
                    } else {
                        // Formato plano para POST (creación)
                        applicationRequest = {
                            // Datos del estudiante
                            firstName: data.firstName,
                            paternalLastName: data.paternalLastName,
                            maternalLastName: data.maternalLastName,
                            rut: data.rut || null, // Nullable para estudiantes extranjeros
                            nationality: authData.nationality, // 'CHILENA' o 'EXTRANJERA'
                            passport: authData.passport || null, // Para estudiantes extranjeros
                            birthDate: data.birthDate,
                            studentEmail: data.studentEmail,
                            studentAddress: data.studentAddress,
                            grade: data.grade,
                            schoolApplied: data.schoolApplied,
                            currentSchool: data.currentSchool,
                            additionalNotes: data.additionalNotes,
                            admissionPreference: data.admissionPreference,
                            pais: data.pais || 'Chile',
                            region: data.region || null,
                            comuna: data.comuna || null,

                            // Datos del padre
                            parent1Name: data.parent1Name,
                            parent1Rut: data.parent1Rut,
                            parent1Email: data.parent1Email,
                            parent1Phone: data.parent1Phone,
                            parent1Address: data.parent1Address,
                            parent1Profession: data.parent1Profession,

                            // Datos de la madre
                            parent2Name: data.parent2Name,
                            parent2Rut: data.parent2Rut,
                            parent2Email: data.parent2Email,
                            parent2Phone: data.parent2Phone,
                            parent2Address: data.parent2Address,
                            parent2Profession: data.parent2Profession,

                            // Datos del sostenedor
                            supporterName: data.supporterName,
                            supporterRut: data.supporterRut,
                            supporterEmail: data.supporterEmail,
                            supporterPhone: data.supporterPhone,
                            supporterRelation: data.supporterRelation,

                            // Datos del apoderado
                            guardianName: data.guardianName,
                            guardianRut: data.guardianRut,
                            guardianEmail: data.guardianEmail,
                            guardianPhone: data.guardianPhone,
                            guardianRelation: data.guardianRelation
                        };

                        // Crear nueva aplicación
                        console.log('Enviando postulación:', applicationRequest);
                        response = await applicationService.submitApplication(applicationRequest);
                    }

                    // Guardar el ID de la aplicación para subir documentos
                    const applicationId = isEditMode ? location.state.applicationId : response.id;
                    setSubmittedApplicationId(applicationId);
                    
                    // Subir documentos si hay alguno seleccionado
                    let documentsUploaded = 0;
                    if (uploadedDocuments.size > 0) {
                        console.log(`Subiendo ${uploadedDocuments.size} documentos para la aplicación ${applicationId}`);

                        const uploadPromises = Array.from(uploadedDocuments.entries()).map(([docType, file]) => {
                            return applicationService.uploadDocument(applicationId, file, docType);
                        });

                        await Promise.all(uploadPromises);
                        documentsUploaded = uploadedDocuments.size;
                        
                        addNotification({
                            type: 'success',
                            title: 'Documentos subidos',
                            message: `${uploadedDocuments.size} documento(s) subido(s) exitosamente`
                        });
                        
                        // Limpiar documentos después de subir
                        setUploadedDocuments(new Map());
                    }
                    
                    // Agregar a la lista local (opcional, para compatibilidad con el contexto existente)
                    addApplication({
                        id: applicationId?.toString() || Date.now().toString(),
                        studentName: response.studentName || `${data.firstName} ${data.paternalLastName} ${data.maternalLastName}`,
                        grade: response.grade || data.grade,
                        status: response.status || 'pending',
                        submissionDate: response.submissionDate || new Date().toISOString(),
                        documents: []
                    });
                    
                    // Mensaje final según si se subieron documentos o no
                    if (documentsUploaded > 0) {
                        addNotification({
                            type: 'success',
                            title: 'Postulación completada',
                            message: `Su postulación y ${documentsUploaded} documento(s) han sido enviados exitosamente.`
                        });
                    } else {
                        addNotification({
                            type: 'info',
                            title: 'Postulación guardada',
                            message: 'Su postulación ha sido guardada. Recuerde completar los documentos desde su dashboard.'
                        });
                    }
                    
                    // Limpiar datos del formulario
                    setData({});
                    setCurrentStep(nextStepIndex);
                } catch (error: any) {
                    console.error('Error al enviar postulación:', error);

                    // Determinar el mensaje de error específico
                    let errorMessage = 'No se pudo enviar la postulación. Por favor, intente nuevamente.';
                    let errorDetails: string[] = [];

                    if (error.response?.data) {
                        const backendError = error.response.data;

                        if (backendError.message) {
                            errorMessage = backendError.message;
                        }

                        // Errores específicos de postulación
                        if (backendError.message?.includes('RUT')) {
                            errorDetails.push('El RUT del estudiante ya está registrado en otra postulación');
                            errorDetails.push('Verifique que el RUT sea correcto o contacte a admisiones');
                        } else if (backendError.message?.includes('duplicada') || backendError.message?.includes('duplicate')) {
                            errorDetails.push('Ya existe una postulación para este estudiante');
                            errorDetails.push('Revise su dashboard para ver el estado de las postulaciones existentes');
                        } else if (backendError.message?.includes('año') || backendError.message?.includes('year')) {
                            errorDetails.push('El año de postulación no es válido');
                            errorDetails.push('Verifique que el año académico sea correcto');
                        } else if (backendError.errors && Array.isArray(backendError.errors)) {
                            errorDetails = backendError.errors;
                        }
                    } else if (error.message) {
                        errorMessage = error.message;
                    }

                    // Mostrar modal de error
                    setErrorModalData({
                        title: 'Error al Enviar Postulación',
                        message: errorMessage,
                        errors: errorDetails
                    });
                    setShowErrorModal(true);

                    // También mostrar notificación para consistencia
                    addNotification({
                        type: 'error',
                        title: 'Error',
                        message: errorMessage
                    });
                } finally {
                    setIsSubmitting(false);
                }
            } else {
                setCurrentStep(nextStepIndex);
            }
        } else {
            // Show validation error message
            addNotification({
                type: 'error',
                title: 'Campos incompletos',
                message: 'Por favor, complete todos los campos obligatorios antes de continuar.'
            });
        }
    };
    
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    // Funciones para manejar documentos
    const handleFileSelect = (documentType: string, file: File) => {
        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            addNotification({
                type: 'error',
                title: 'Archivo demasiado grande',
                message: `El archivo "${file.name}" excede el tamaño máximo de 5MB. Por favor, comprima el archivo o use uno más pequeño.`
            });
            return;
        }

        const newDocs = new Map(uploadedDocuments);
        newDocs.set(documentType, file);
        setUploadedDocuments(newDocs);

        addNotification({
            type: 'success',
            title: 'Archivo seleccionado',
            message: `"${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) está listo para subir.`
        });
    };

    // Esta función ya no se necesita - los documentos se suben automáticamente al enviar la postulación

    // Helper function to check if current step can proceed
    const canProceedToNextStep = useMemo((): boolean => {
        return validateCurrentStep();
    }, [data, currentStep, requiresCurrentSchool]);

    // Helper function to get missing fields for current step
    const getMissingFields = useMemo((): string[] => {
        const missing: string[] = [];

        switch (currentStep) {
            // Step 0: Información del Postulante
            case 0:
                if (!data.firstName?.trim()) missing.push('Nombres');
                if (!data.paternalLastName?.trim()) missing.push('Apellido Paterno');
                if (!data.maternalLastName?.trim()) missing.push('Apellido Materno');
                if (!data.rut?.trim()) missing.push('RUT');
                if (!data.birthDate) missing.push('Fecha de Nacimiento');
                break;

            // Step 1: Lugar de Residencia
            case 1:
                if (!data.studentAddressStreet?.trim()) missing.push('Calle');
                if (!data.studentAddressNumber?.trim()) missing.push('Número');
                if (!data.studentAddressCommune?.trim()) missing.push('Comuna');
                if (!data.pais && !data.pais) missing.push('País');
                const pais = data.pais || 'Chile';
                if (pais === 'Chile' && !data.region?.trim()) missing.push('Región');
                break;

            // Step 2: Postulación
            case 2:
                if (!data.grade) missing.push('Nivel al que postula');
                if (requiresCurrentSchool(data.grade || '') && !data.currentSchool?.trim()) missing.push('Colegio de Procedencia');
                if (!data.schoolApplied) missing.push('Colegio al que postula');
                if (!data.applicationYear) missing.push('Año al que postula');
                if (!data.admissionPreference) missing.push('Tipo de Relación Familiar');
                break;

            // Step 3: Datos del Padre
            case 3:
                if (!data.parent1Name?.trim()) missing.push('Nombre');
                if (!data.parent1Rut?.trim()) missing.push('RUT');
                if (!data.parent1Email?.trim()) missing.push('Email');
                if (!data.parent1Phone?.trim()) missing.push('Teléfono');
                if (!data.parent1Address?.trim()) missing.push('Dirección');
                if (!data.parent1Profession?.trim()) missing.push('Profesión');
                break;

            // Step 4: Datos de la Madre
            case 4:
                if (!data.parent2Name?.trim()) missing.push('Nombre');
                if (!data.parent2Rut?.trim()) missing.push('RUT');
                if (!data.parent2Email?.trim()) missing.push('Email');
                if (!data.parent2Phone?.trim()) missing.push('Teléfono');
                if (!data.parent2Address?.trim()) missing.push('Dirección');
                if (!data.parent2Profession?.trim()) missing.push('Profesión');
                break;

            // Step 5: Sostenedor
            case 5:
                if (!data.supporterRelation) missing.push('Parentesco');
                if (!data.supporterName?.trim()) missing.push('Nombre');
                if (!data.supporterEmail?.trim()) missing.push('Email');
                if (!data.supporterPhone?.trim()) missing.push('Teléfono');
                if (!data.supporterRut?.trim()) missing.push('RUT');
                break;

            // Step 6: Apoderado
            case 6:
                if (!data.guardianRelation) missing.push('Parentesco');
                if (!data.guardianName?.trim()) missing.push('Nombre');
                if (!data.guardianEmail?.trim()) missing.push('Email');
                if (!data.guardianPhone?.trim()) missing.push('Teléfono');
                if (!data.guardianRut?.trim()) missing.push('RUT');
                break;

            // Step 7: Documentación (opcional)
            case 7:
                // No validation needed - documents are optional
                break;

            // Step 8: Confirmación (solo muestra info)
            case 8:
                // No validation needed
                break;
        }

        return missing;
    }, [data, currentStep, requiresCurrentSchool]);

    // Función para renderizar el formulario de autenticación
    const renderAuthForm = () => {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    {/* Header */}
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <LogoIcon />
                        </div>
                        <h2 className="text-3xl font-bold text-azul-monte-tabor">
                            {showRegister ? 'Crear Cuenta de Apoderado' : 'Iniciar Postulación'}
                        </h2>
                        <p className="mt-2 text-gris-piedra">
                            {showRegister 
                                ? 'Complete sus datos para crear una cuenta y comenzar su postulación'
                                : 'Debe crear una cuenta o iniciar sesión para postular'
                            }
                        </p>
                    </div>

                    <Card className="p-8">
                        {!showRegister ? (
                            // Formulario de Login
                            <form onSubmit={handleLogin} className="space-y-6">
                                {authError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                        {authError}
                                    </div>
                                )}

                                <Input
                                    id="email"
                                    label="Correo Electrónico"
                                    type="email"
                                    placeholder="apoderado@ejemplo.com"
                                    value={authData.email}
                                    onChange={(e) => updateAuthField('email', e.target.value)}
                                    isRequired
                                />

                                <Input
                                    id="password"
                                    label="Contraseña"
                                    type="password"
                                    placeholder="••••••••"
                                    value={authData.password}
                                    onChange={(e) => updateAuthField('password', e.target.value)}
                                    isRequired
                                />

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    isLoading={authLoading}
                                    loadingText="Iniciando sesión..."
                                    className="w-full"
                                >
                                    Iniciar Sesión y Postular
                                </Button>

                                <div className="text-center space-y-2">
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setShowRegister(true)}
                                            className="text-azul-monte-tabor hover:underline"
                                        >
                                            ¿No tiene cuenta? Regístrese aquí
                                        </button>
                                    </div>
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const email = prompt('Ingrese su correo electrónico:');
                                                if (email) {
                                                    addNotification({
                                                        type: 'info',
                                                        title: 'Solicitud enviada',
                                                        message: `Se ha enviado un enlace de recuperación a ${email}. Por favor, revise su correo.`
                                                    });
                                                }
                                            }}
                                            className="text-gris-piedra hover:text-azul-monte-tabor hover:underline text-sm"
                                        >
                                            ¿Olvidó su contraseña?
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            // Formulario de Registro
                            <form onSubmit={handleRegister} className="space-y-4">
                                {authError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                        {authError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        id="firstName"
                                        label="Nombres"
                                        placeholder="Juan Carlos"
                                        value={authData.firstName}
                                        onChange={(e) => updateAuthField('firstName', e.target.value)}
                                        isRequired
                                    />
                                    <Input
                                        id="lastName"
                                        label="Apellidos"
                                        placeholder="Pérez González"
                                        value={authData.lastName}
                                        onChange={(e) => updateAuthField('lastName', e.target.value)}
                                        isRequired
                                    />
                                </div>

                                <Select
                                    id="nationality"
                                    label="Nacionalidad del Estudiante"
                                    options={[
                                        { value: 'CHILENA', label: 'Chilena' },
                                        { value: 'EXTRANJERA', label: 'Extranjera' }
                                    ]}
                                    isRequired
                                    value={authData.nationality}
                                    onChange={(e) => {
                                        updateAuthField('nationality', e.target.value);
                                        // Limpiar RUT o passport al cambiar nacionalidad
                                        if (e.target.value === 'CHILENA') {
                                            updateAuthField('passport', '');
                                        } else {
                                            updateAuthField('rut', '');
                                        }
                                    }}
                                />

                                {authData.nationality === 'CHILENA' ? (
                                    <RutInput
                                        name="rut"
                                        label="RUT del Estudiante"
                                        placeholder="12.345.678-9"
                                        value={authData.rut}
                                        onChange={(value) => updateAuthField('rut', value)}
                                        required
                                    />
                                ) : (
                                    <Input
                                        id="passport"
                                        label="Número de Pasaporte del Estudiante"
                                        type="text"
                                        placeholder="Ej: P123456789"
                                        value={authData.passport}
                                        onChange={(e) => updateAuthField('passport', e.target.value.toUpperCase())}
                                        isRequired
                                    />
                                )}

                                <Select
                                    id="guardianType"
                                    label="Tipo de Apoderado"
                                    options={[
                                        { value: '', label: 'Seleccione...' },
                                        { value: 'nuevo', label: 'Nuevo (sin vínculo previo con el colegio)' },
                                        { value: 'ex-alumno', label: 'Ex-Alumno del colegio' },
                                        { value: 'funcionario', label: 'Funcionario del colegio' }
                                    ]}
                                    isRequired
                                    value={authData.guardianType}
                                    onChange={(e) => updateAuthField('guardianType', e.target.value)}
                                />

                                <EmailVerification
                                    email={authData.email}
                                    rut={authData.rut}
                                    onEmailChange={(email) => updateAuthField('email', email)}
                                    onVerificationComplete={setIsEmailVerified}
                                    placeholder="apoderado@ejemplo.com"
                                    isRequired
                                />

                                <Input
                                    id="phone"
                                    label="Teléfono"
                                    type="tel"
                                    placeholder="+569 1234 5678"
                                    value={authData.phone}
                                    onChange={(e) => updateAuthField('phone', e.target.value)}
                                    isRequired
                                />

                                <Input
                                    id="address"
                                    label="Dirección"
                                    placeholder="Av. Providencia 1234, Providencia, Santiago"
                                    value={authData.address}
                                    onChange={(e) => updateAuthField('address', e.target.value)}
                                    isRequired
                                />

                                <Input
                                    id="profession"
                                    label="Profesión"
                                    placeholder="Ingeniero Comercial"
                                    value={authData.profession}
                                    onChange={(e) => updateAuthField('profession', e.target.value)}
                                    isRequired
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        id="password-register"
                                        label="Contraseña (8-10 caracteres)"
                                        type="password"
                                        placeholder="••••••••"
                                        value={authData.password}
                                        onChange={(e) => updateAuthField('password', e.target.value)}
                                        isRequired
                                        helpText="Debe contener entre 8 y 10 caracteres"
                                    />
                                    <Input
                                        id="confirmPassword"
                                        label="Confirmar Contraseña"
                                        type="password"
                                        placeholder="••••••••"
                                        value={authData.confirmPassword}
                                        onChange={(e) => updateAuthField('confirmPassword', e.target.value)}
                                        isRequired
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowRegister(false)}
                                        className="flex-1"
                                    >
                                        Volver al Login
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        isLoading={authLoading}
                                        loadingText="Creando cuenta..."
                                        disabled={!isEmailVerified || authLoading}
                                        className="flex-1"
                                    >
                                        {isEmailVerified ? 'Crear Cuenta y Postular' : 'Verificar Email Primero'}
                                    </Button>
                                </div>
                            </form>
                        )}

                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="text-center">
                                <Link 
                                    to="/" 
                                    className="text-azul-monte-tabor hover:underline"
                                >
                                    ← Volver al inicio
                                </Link>
                            </div>
                        </div>
                    </Card>

                    {/* Información adicional */}
                    <div className="text-center text-sm text-gris-piedra">
                        <p>¿Problemas para acceder?</p>
                        <p>Contacte a admisiones: <a href="mailto:admisiones@mtn.cl" className="text-azul-monte-tabor hover:underline">admisiones@mtn.cl</a></p>
                    </div>
                </div>
            </div>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            // Step 0: Información del Postulante
            case 0:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-azul-monte-tabor">Información del Postulante</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                id="firstName"
                                label="Nombres"
                                placeholder="Juan Carlos"
                                isRequired
                                value={data.firstName || ''}
                                onChange={(e) => updateField('firstName', e.target.value)}
                                onBlur={() => touchField('firstName')}
                                error={errors.firstName}
                            />
                            <Input
                                id="paternalLastName"
                                label="Apellido Paterno"
                                placeholder="Pérez"
                                isRequired
                                value={data.paternalLastName || ''}
                                onChange={(e) => updateField('paternalLastName', e.target.value)}
                                onBlur={() => touchField('paternalLastName')}
                                error={errors.paternalLastName}
                            />
                            <Input
                                id="maternalLastName"
                                label="Apellido Materno"
                                placeholder="González"
                                isRequired
                                value={data.maternalLastName || ''}
                                onChange={(e) => updateField('maternalLastName', e.target.value)}
                                onBlur={() => touchField('maternalLastName')}
                                error={errors.maternalLastName}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <RutInput
                                name="rut"
                                label="RUT del Postulante"
                                placeholder="12.345.678-9"
                                required
                                value={data.rut || ''}
                                onChange={(value) => updateField('rut', value)}
                                onBlur={() => touchField('rut')}
                                error={errors.rut}
                            />
                            <div>
                                <Input
                                    id="birthDate"
                                    label="Fecha de Nacimiento"
                                    type="date"
                                    isRequired
                                    value={data.birthDate || ''}
                                    onChange={(e) => updateField('birthDate', e.target.value)}
                                    onBlur={() => touchField('birthDate')}
                                    error={errors.birthDate}
                                />
                                {data.birthDate && data.grade && (() => {
                                    const validation = validateBirthDateForGrade(data.birthDate, data.grade);
                                    if (!validation.valid) {
                                        return (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm text-red-700">{validation.message}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                        <Input
                            id="studentEmail"
                            label="Correo Electrónico (opcional)"
                            type="email"
                            placeholder="estudiante@ejemplo.com"
                            value={data.studentEmail || ''}
                            onChange={(e) => updateField('studentEmail', e.target.value)}
                            onBlur={() => touchField('studentEmail')}
                            error={errors.studentEmail}
                        />
                    </div>
                );

            // Step 1: Lugar de Residencia
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-azul-monte-tabor">Lugar de Residencia</h3>

                        {/* Dirección segmentada */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-azul-monte-tabor">Dirección de Residencia</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    id="studentAddressStreet"
                                    label="Calle"
                                    placeholder="Av. Providencia"
                                    isRequired
                                    value={data.studentAddressStreet || ''}
                                    onChange={(e) => {
                                        updateField('studentAddressStreet', e.target.value);
                                        const combined = `${e.target.value || ''} ${data.studentAddressNumber || ''}, ${data.studentAddressCommune || ''}, ${data.studentAddressApartment || ''}`.trim();
                                        updateField('studentAddress', combined);
                                    }}
                                    onBlur={() => touchField('studentAddressStreet')}
                                />
                                <Input
                                    id="studentAddressNumber"
                                    label="Número"
                                    placeholder="1234"
                                    isRequired
                                    value={data.studentAddressNumber || ''}
                                    onChange={(e) => {
                                        updateField('studentAddressNumber', e.target.value);
                                        const combined = `${data.studentAddressStreet || ''} ${e.target.value || ''}, ${data.studentAddressCommune || ''}, ${data.studentAddressApartment || ''}`.trim();
                                        updateField('studentAddress', combined);
                                    }}
                                    onBlur={() => touchField('studentAddressNumber')}
                                />
                                <Input
                                    id="studentAddressCommune"
                                    label="Comuna"
                                    placeholder="Providencia"
                                    isRequired
                                    value={data.studentAddressCommune || ''}
                                    onChange={(e) => {
                                        updateField('studentAddressCommune', e.target.value);
                                        updateField('comuna', e.target.value);
                                        const combined = `${data.studentAddressStreet || ''} ${data.studentAddressNumber || ''}, ${e.target.value || ''}, ${data.studentAddressApartment || ''}`.trim();
                                        updateField('studentAddress', combined);
                                    }}
                                    onBlur={() => touchField('studentAddressCommune')}
                                />
                            </div>
                            <Input
                                id="studentAddressApartment"
                                label="Departamento/Casa (opcional)"
                                placeholder="Depto. 302 / Casa 15"
                                value={data.studentAddressApartment || ''}
                                onChange={(e) => {
                                    updateField('studentAddressApartment', e.target.value);
                                    const combined = `${data.studentAddressStreet || ''} ${data.studentAddressNumber || ''}, ${data.studentAddressCommune || ''}, ${e.target.value || ''}`.trim();
                                    updateField('studentAddress', combined);
                                }}
                                onBlur={() => touchField('studentAddressApartment')}
                            />
                        </div>

                        {/* Ubicación Geográfica */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-azul-monte-tabor">Ubicación Geográfica</h4>
                            <Select
                                id="pais"
                                label="País"
                                options={[
                                    { value: 'Chile', label: 'Chile' },
                                    { value: 'Argentina', label: 'Argentina' },
                                    { value: 'Peru', label: 'Perú' },
                                    { value: 'Bolivia', label: 'Bolivia' },
                                    { value: 'Colombia', label: 'Colombia' },
                                    { value: 'Otro', label: 'Otro' }
                                ]}
                                isRequired
                                value={data.pais || 'Chile'}
                                onChange={(e) => {
                                    updateField('pais', e.target.value);
                                    if (e.target.value !== 'Chile') {
                                        updateField('region', '');
                                    }
                                }}
                                onBlur={() => touchField('pais')}
                                error={errors.pais}
                            />

                            {(data.pais === 'Chile' || !data.pais) && (
                                <>
                                    <Select
                                        id="region"
                                        label="Región"
                                        options={[
                                            { value: '', label: 'Seleccione una región...' },
                                            { value: 'Región de Arica y Parinacota', label: 'Región de Arica y Parinacota' },
                                            { value: 'Región de Tarapacá', label: 'Región de Tarapacá' },
                                            { value: 'Región de Antofagasta', label: 'Región de Antofagasta' },
                                            { value: 'Región de Atacama', label: 'Región de Atacama' },
                                            { value: 'Región de Coquimbo', label: 'Región de Coquimbo' },
                                            { value: 'Región de Valparaíso', label: 'Región de Valparaíso' },
                                            { value: 'Región Metropolitana de Santiago', label: 'Región Metropolitana de Santiago' },
                                            { value: 'Región del Libertador General Bernardo O\'Higgins', label: 'Región del Libertador General Bernardo O\'Higgins' },
                                            { value: 'Región del Maule', label: 'Región del Maule' },
                                            { value: 'Región de Ñuble', label: 'Región de Ñuble' },
                                            { value: 'Región del Biobío', label: 'Región del Biobío' },
                                            { value: 'Región de La Araucanía', label: 'Región de La Araucanía' },
                                            { value: 'Región de Los Ríos', label: 'Región de Los Ríos' },
                                            { value: 'Región de Los Lagos', label: 'Región de Los Lagos' },
                                            { value: 'Región de Aysén del General Carlos Ibáñez del Campo', label: 'Región de Aysén del General Carlos Ibáñez del Campo' },
                                            { value: 'Región de Magallanes y de la Antártica Chilena', label: 'Región de Magallanes y de la Antártica Chilena' }
                                        ]}
                                        isRequired
                                        value={data.region || ''}
                                        onChange={(e) => updateField('region', e.target.value)}
                                        onBlur={() => touchField('region')}
                                        error={errors.region}
                                        helpText="Seleccione la región donde reside el estudiante"
                                    />
                                </>
                            )}

                            {data.pais && data.pais !== 'Chile' && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Nota:</strong> Para estudiantes residentes fuera de Chile, el campo región no es obligatorio.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );

            // Step 2: Postulación
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-azul-monte-tabor">Postulación</h3>

                        <Select
                            id="grade"
                            label="Nivel al que postula"
                            options={gradeOptions}
                            isRequired
                            value={data.grade || ''}
                            onChange={(e) => updateField('grade', e.target.value)}
                            onBlur={() => touchField('grade')}
                            error={errors.grade}
                        />

                        {requiresCurrentSchool(data.grade || '') && (
                            <Input
                                id="currentSchool"
                                label="Colegio de Procedencia"
                                placeholder="Colegio San José"
                                isRequired
                                value={data.currentSchool || ''}
                                onChange={(e) => updateField('currentSchool', e.target.value)}
                                onBlur={() => touchField('currentSchool')}
                                error={(!data.currentSchool || data.currentSchool.trim().length < 2) ? 'Este campo es requerido para estudiantes desde 2° básico' : ''}
                            />
                        )}

                        {!requiresCurrentSchool(data.grade || '') && data.grade && (
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Nota:</strong> Para el nivel seleccionado no es necesario indicar colegio de procedencia.
                                    {['playgroup', 'prekinder', 'kinder'].includes(data.grade)
                                        ? ' Si viene de un jardín infantil, puede mencionarlo en observaciones adicionales.'
                                        : ' Es su primer año escolar formal.'}
                                </p>
                            </div>
                        )}

                        <Select
                            id="schoolApplied"
                            label="Colegio al que postula"
                            options={schoolOptions}
                            isRequired
                            value={data.schoolApplied || ''}
                            onChange={(e) => updateField('schoolApplied', e.target.value)}
                            onBlur={() => touchField('schoolApplied')}
                            error={errors.schoolApplied}
                        />

                        <Input
                            id="applicationYear"
                            label="Año al que postula"
                            placeholder={`${new Date().getFullYear() + 1}`}
                            isRequired
                            value={data.applicationYear || (new Date().getFullYear() + 1).toString()}
                            onChange={(e) => {
                                const year = parseInt(e.target.value);
                                const currentYear = new Date().getFullYear();
                                if (year === currentYear + 1) {
                                    updateField('applicationYear', e.target.value);
                                } else {
                                    updateField('applicationYear', (currentYear + 1).toString());
                                }
                            }}
                            onBlur={() => touchField('applicationYear')}
                            error={errors.applicationYear}
                            readOnly
                            helpText={`Las postulaciones son siempre para el año ${new Date().getFullYear() + 1}`}
                        />

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Tipo de Relación Familiar <span className="text-red-500">*</span>
                            </label>
                            <p className="text-sm text-gray-600 mb-3">
                                Indique si el estudiante tiene algún tipo de relación familiar con la institución
                            </p>
                            <div className="space-y-2">
                                <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="admissionPreference"
                                        value="NINGUNA"
                                        checked={data.admissionPreference === 'NINGUNA'}
                                        onChange={(e) => updateField('admissionPreference', e.target.value)}
                                        className="h-4 w-4 text-azul-monte-tabor focus:ring-azul-monte-tabor border-gray-300"
                                    />
                                    <span className="ml-3 text-sm text-gray-900">
                                        <strong>Ninguna</strong> - Postulación regular sin relación familiar previa
                                    </span>
                                </label>

                                <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="admissionPreference"
                                        value="HIJO_FUNCIONARIO"
                                        checked={data.admissionPreference === 'HIJO_FUNCIONARIO'}
                                        onChange={(e) => updateField('admissionPreference', e.target.value)}
                                        className="h-4 w-4 text-azul-monte-tabor focus:ring-azul-monte-tabor border-gray-300"
                                    />
                                    <span className="ml-3 text-sm text-gray-900">
                                        <strong>Hijo de Funcionario</strong> - Uno de los padres trabaja actualmente en el colegio
                                    </span>
                                </label>

                                <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="admissionPreference"
                                        value="HIJO_EX_ALUMNO"
                                        checked={data.admissionPreference === 'HIJO_EX_ALUMNO'}
                                        onChange={(e) => updateField('admissionPreference', e.target.value)}
                                        className="h-4 w-4 text-azul-monte-tabor focus:ring-azul-monte-tabor border-gray-300"
                                    />
                                    <span className="ml-3 text-sm text-gray-900">
                                        <strong>Hijo de Ex-Alumno</strong> - Uno de los padres es ex-alumno del colegio
                                    </span>
                                </label>
                            </div>
                            {errors.admissionPreference && (
                                <p className="text-sm text-red-600 mt-1">{errors.admissionPreference}</p>
                            )}
                        </div>

                        {data.admissionPreference === 'HIJO_EX_ALUMNO' && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Hijo/a de Ex-Alumno:</strong> Deberá adjuntar documentación que acredite que uno de los padres es ex-alumno del colegio (ej: certificado de alumno regular, concentración de notas, etc.).
                                </p>
                            </div>
                        )}

                        {data.admissionPreference === 'HIJO_FUNCIONARIO' && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                    <strong>Hijo/a de Funcionario:</strong> Deberá adjuntar documentación que acredite que uno de los padres trabaja actualmente en el colegio (ej: certificado de antigüedad, contrato, liquidación de sueldo).
                                </p>
                            </div>
                        )}

                        <div className="mt-4">
                            <label htmlFor="additionalNotes" className="block text-sm font-medium text-gray-700 mb-2">
                                Observaciones Adicionales (Opcional)
                            </label>
                            <textarea
                                id="additionalNotes"
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-azul-monte-tabor focus:border-azul-monte-tabor"
                                placeholder="Ej: Viene del Jardín Infantil Los Angelitos, tiene experiencia en actividades extracurriculares, etc."
                                value={data.additionalNotes || ''}
                                onChange={(e) => updateField('additionalNotes', e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Puede mencionar jardín infantil de procedencia, actividades previas, o cualquier información relevante.
                            </p>
                        </div>
                    </div>
                );

            // Step 3: Datos del Padre
            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-azul-monte-tabor mb-4">Datos del Padre</h3>
                        {isLoadingProfile && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-azul-monte-tabor">
                                    Cargando datos del perfil para completar automáticamente...
                                </p>
                            </div>
                        )}
                        {!isLoadingProfile && userProfile && (
                            <div className="mb-4 p-3 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-800">
                                    Datos completados automáticamente desde su perfil. Puede editarlos si es necesario.
                                </p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id="parent1-name"
                                label="Nombre Completo"
                                placeholder="María Elena González"
                                isRequired
                                value={data.parent1Name || ''}
                                onChange={(e) => updateField('parent1Name', e.target.value)}
                                onBlur={() => touchField('parent1Name')}
                                error={errors.parent1Name}
                            />
                            <RutInput
                                name="parent1-rut"
                                label="RUT"
                                placeholder="16.789.123-4"
                                required
                                value={data.parent1Rut || ''}
                                onChange={(value) => updateField('parent1Rut', value)}
                                onBlur={() => touchField('parent1Rut')}
                                error={errors.parent1Rut}
                            />
                            <Input
                                id="parent1-email"
                                label="Email"
                                type="email"
                                placeholder="maria.gonzalez@ejemplo.com"
                                isRequired
                                value={data.parent1Email || ''}
                                onChange={(e) => updateField('parent1Email', e.target.value)}
                                onBlur={() => touchField('parent1Email')}
                                error={errors.parent1Email}
                            />
                            <Input
                                id="parent1-phone"
                                label="Teléfono"
                                type="tel"
                                isRequired
                                placeholder="+569 1234 5678"
                                value={data.parent1Phone || ''}
                                onChange={(e) => updateField('parent1Phone', e.target.value)}
                                onBlur={() => touchField('parent1Phone')}
                                error={errors.parent1Phone}
                            />
                        </div>
                        <div className="mt-4">
                            <Input
                                id="parent1-address"
                                label="Dirección"
                                placeholder="Los Leones 456, Providencia, Santiago"
                                isRequired
                                value={data.parent1Address || ''}
                                onChange={(e) => updateField('parent1Address', e.target.value)}
                                onBlur={() => touchField('parent1Address')}
                                error={errors.parent1Address}
                            />
                        </div>
                        <div className="mt-4">
                            <Input
                                id="parent1-profession"
                                label="Profesión"
                                placeholder="Ingeniero Comercial"
                                isRequired
                                value={data.parent1Profession || ''}
                                onChange={(e) => updateField('parent1Profession', e.target.value)}
                                onBlur={() => touchField('parent1Profession')}
                                error={errors.parent1Profession}
                            />
                        </div>
                    </div>
                );

            // Step 4: Datos de la Madre
            case 4:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-azul-monte-tabor mb-4">Datos de la Madre</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id="parent2-name"
                                label="Nombre Completo"
                                placeholder="María Elena González"
                                isRequired
                                value={data.parent2Name || ''}
                                onChange={(e) => updateField('parent2Name', e.target.value)}
                                onBlur={() => touchField('parent2Name')}
                                error={errors.parent2Name}
                            />
                            <RutInput
                                name="parent2-rut"
                                label="RUT"
                                placeholder="15.678.912-3"
                                required
                                value={data.parent2Rut || ''}
                                onChange={(value) => updateField('parent2Rut', value)}
                                onBlur={() => touchField('parent2Rut')}
                                error={errors.parent2Rut}
                            />
                            <Input
                                id="parent2-email"
                                label="Email"
                                type="email"
                                placeholder="maria.gonzalez@ejemplo.com"
                                isRequired
                                value={data.parent2Email || ''}
                                onChange={(e) => updateField('parent2Email', e.target.value)}
                                onBlur={() => touchField('parent2Email')}
                                error={errors.parent2Email}
                            />
                            <Input
                                id="parent2-phone"
                                label="Teléfono"
                                type="tel"
                                placeholder="+569 8765 4321"
                                isRequired
                                value={data.parent2Phone || ''}
                                onChange={(e) => updateField('parent2Phone', e.target.value)}
                                onBlur={() => touchField('parent2Phone')}
                                error={errors.parent2Phone}
                            />
                        </div>
                        <div className="mt-4">
                            <Input
                                id="parent2-address"
                                label="Dirección"
                                placeholder="Av. Vitacura 789, Las Condes, Santiago"
                                isRequired
                                value={data.parent2Address || ''}
                                onChange={(e) => updateField('parent2Address', e.target.value)}
                                onBlur={() => touchField('parent2Address')}
                                error={errors.parent2Address}
                            />
                        </div>
                        <div className="mt-4">
                            <Input
                                id="parent2-profession"
                                label="Profesión"
                                placeholder="Profesora de Educación Básica"
                                isRequired
                                value={data.parent2Profession || ''}
                                onChange={(e) => updateField('parent2Profession', e.target.value)}
                                onBlur={() => touchField('parent2Profession')}
                                error={errors.parent2Profession}
                            />
                        </div>
                    </div>
                );

            // Step 5: Sostenedor
            case 5:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-azul-monte-tabor">Información del Sostenedor</h3>
                        <p className="text-gris-piedra mb-4">Persona responsable del pago de mensualidades y compromisos económicos.</p>

                        <Select
                            id="supporter-relation"
                            label="Parentesco con el postulante"
                            options={[
                                { value: '', label: 'Seleccione...' },
                                { value: 'padre', label: 'Padre' },
                                { value: 'madre', label: 'Madre' },
                                { value: 'abuelo', label: 'Abuelo/a' },
                                { value: 'tio', label: 'Tío/a' },
                                { value: 'hermano', label: 'Hermano/a' },
                                { value: 'tutor', label: 'Tutor Legal' },
                                { value: 'otro', label: 'Otro' }
                            ]}
                            isRequired
                            value={data.supporterRelation || ''}
                            onChange={(e) => handleParentRelationChange('supporterRelation', e.target.value, 'supporter')}
                            onBlur={() => touchField('supporterRelation')}
                            error={errors.supporterRelation}
                        />

                        {(data.supporterRelation === 'padre' || data.supporterRelation === 'madre') && (
                            <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-800">
                                    Los datos se han completado automáticamente con la información del {data.supporterRelation} ingresada anteriormente.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id="supporter-name"
                                label="Nombre Completo"
                                placeholder="Ana María Rodríguez"
                                isRequired
                                value={data.supporterName || ''}
                                onChange={(e) => updateField('supporterName', e.target.value)}
                                onBlur={() => touchField('supporterName')}
                                error={errors.supporterName}
                                disabled={data.supporterRelation === 'padre' || data.supporterRelation === 'madre'}
                            />
                            <RutInput
                                name="supporter-rut"
                                label="RUT"
                                placeholder="18.456.789-2"
                                required
                                value={data.supporterRut || ''}
                                onChange={(value) => updateField('supporterRut', value)}
                                onBlur={() => touchField('supporterRut')}
                                error={errors.supporterRut}
                                disabled={data.supporterRelation === 'padre' || data.supporterRelation === 'madre'}
                            />
                            <Input
                                id="supporter-email"
                                label="Email"
                                type="email"
                                placeholder="ana.rodriguez@ejemplo.com"
                                isRequired
                                value={data.supporterEmail || ''}
                                onChange={(e) => updateField('supporterEmail', e.target.value)}
                                onBlur={() => touchField('supporterEmail')}
                                error={errors.supporterEmail}
                                disabled={data.supporterRelation === 'padre' || data.supporterRelation === 'madre'}
                            />
                            <Input
                                id="supporter-phone"
                                label="Teléfono"
                                type="tel"
                                isRequired
                                placeholder="+569 9876 5432"
                                value={data.supporterPhone || ''}
                                onChange={(e) => updateField('supporterPhone', e.target.value)}
                                onBlur={() => touchField('supporterPhone')}
                                error={errors.supporterPhone}
                                disabled={data.supporterRelation === 'padre' || data.supporterRelation === 'madre'}
                            />
                        </div>
                    </div>
                );

            // Step 6: Apoderado
            case 6:
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-azul-monte-tabor">Información del Apoderado</h3>
                        <p className="text-gris-piedra mb-4">Persona responsable de la representación del estudiante en el colegio.</p>

                        <Select
                            id="guardian-relation"
                            label="Parentesco con el postulante"
                            options={[
                                { value: '', label: 'Seleccione...' },
                                { value: 'padre', label: 'Padre' },
                                { value: 'madre', label: 'Madre' },
                                { value: 'abuelo', label: 'Abuelo/a' },
                                { value: 'tio', label: 'Tío/a' },
                                { value: 'hermano', label: 'Hermano/a' },
                                { value: 'tutor', label: 'Tutor Legal' },
                                { value: 'otro', label: 'Otro' }
                            ]}
                            isRequired
                            value={data.guardianRelation || ''}
                            onChange={(e) => handleParentRelationChange('guardianRelation', e.target.value, 'guardian')}
                            onBlur={() => touchField('guardianRelation')}
                            error={errors.guardianRelation}
                        />

                        {(data.guardianRelation === 'padre' || data.guardianRelation === 'madre') && (
                            <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-800">
                                    Los datos se han completado automáticamente con la información del {data.guardianRelation} ingresada anteriormente.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id="guardian-name"
                                label="Nombre Completo"
                                placeholder="Roberto Silva Martínez"
                                isRequired
                                value={data.guardianName || ''}
                                onChange={(e) => updateField('guardianName', e.target.value)}
                                onBlur={() => touchField('guardianName')}
                                error={errors.guardianName}
                                disabled={data.guardianRelation === 'padre' || data.guardianRelation === 'madre'}
                            />
                            <RutInput
                                name="guardian-rut"
                                label="RUT"
                                placeholder="19.234.567-8"
                                required
                                value={data.guardianRut || ''}
                                onChange={(value) => updateField('guardianRut', value)}
                                onBlur={() => touchField('guardianRut')}
                                error={errors.guardianRut}
                                disabled={data.guardianRelation === 'padre' || data.guardianRelation === 'madre'}
                            />
                            <Input
                                id="guardian-email"
                                label="Email"
                                type="email"
                                placeholder="roberto.silva@ejemplo.com"
                                isRequired
                                value={data.guardianEmail || ''}
                                onChange={(e) => updateField('guardianEmail', e.target.value)}
                                onBlur={() => touchField('guardianEmail')}
                                error={errors.guardianEmail}
                                disabled={data.guardianRelation === 'padre' || data.guardianRelation === 'madre'}
                            />
                            <Input
                                id="guardian-phone"
                                label="Teléfono"
                                type="tel"
                                isRequired
                                placeholder="+569 5555 1234"
                                value={data.guardianPhone || ''}
                                onChange={(e) => updateField('guardianPhone', e.target.value)}
                                onBlur={() => touchField('guardianPhone')}
                                error={errors.guardianPhone}
                                disabled={data.guardianRelation === 'padre' || data.guardianRelation === 'madre'}
                            />
                        </div>
                    </div>
                );

            // Step 7: Documentación
            case 7:
                const documentTypes = [
                    { key: 'BIRTH_CERTIFICATE', label: 'Certificado de Nacimiento', required: true },
                    { key: 'GRADES_2023', label: 'Certificado de Estudios 2023 (si aplica)', required: true },
                    { key: 'GRADES_2024', label: 'Certificado de Estudios 2024', required: true },
                    { key: 'GRADES_2025_SEMESTER_1', label: 'Certificado de Estudios primer semestre 2025', required: true },
                    { key: 'PERSONALITY_REPORT_2024', label: 'Informe de Personalidad 2024', required: false },
                    { key: 'PERSONALITY_REPORT_2025_SEMESTER_1', label: 'Informe de Personalidad primer semestre 2025', required: false },
                    { key: 'STUDENT_PHOTO', label: 'Fotografía del Postulante', required: false },
                    { key: 'BAPTISM_CERTIFICATE', label: 'Certificado de Bautismo', required: false },
                    { key: 'PREVIOUS_SCHOOL_REPORT', label: 'Informe de Jardín/Colegio Anterior', required: false },
                    { key: 'MEDICAL_CERTIFICATE', label: 'Certificado Médico', required: false },
                    { key: 'PSYCHOLOGICAL_REPORT', label: 'Informe Psicológico (si aplica)', required: false }
                ];

                // Función para traducir tipos de documentos a español
                const getDocumentLabel = (documentType: string): string => {
                    const doc = documentTypes.find(d => d.key === documentType);
                    return doc ? doc.label : documentType;
                };

                return (
                    <div>
                        <h3 className="text-xl font-bold text-azul-monte-tabor mb-4">Carga de Documentos</h3>
                        
                        {/* Permitir subir documentos antes de crear la aplicación */}
                        <>
                            <p className="text-gris-piedra mb-6">Por favor, adjunte los siguientes documentos en formato PDF, JPG o PNG (máximo 5MB cada uno).</p>

                                {/* Documentos existentes (en modo edición) */}
                                {existingDocuments && existingDocuments.length > 0 && (
                                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <h4 className="text-lg font-semibold text-azul-monte-tabor mb-3"> Documentos Actuales ({existingDocuments.length})</h4>
                                        <div className="space-y-2">
                                            {existingDocuments.map((doc: any, index: number) => (
                                                <div key={doc.id || index} className="flex justify-between items-center p-2 bg-white rounded border border-blue-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-verde-esperanza"></span>
                                                        <span className="text-sm font-medium">{getDocumentLabel(doc.document_type || doc.documentType)}</span>
                                                        <span className="text-xs text-gris-piedra">({doc.file_name || doc.fileName || 'archivo'})</span>
                                                    </div>
                                                    <span className="text-xs text-verde-esperanza">Ya cargado</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gris-piedra mt-3">
                                            Los documentos anteriores se mantendrán. Solo suba documentos si desea reemplazarlos.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {/* Documentos obligatorios */}
                                    <div className="mb-6">
                                        <h4 className="text-lg font-semibold text-azul-monte-tabor mb-3">Documentos Obligatorios</h4>
                                        <div className="space-y-3">
                                            {documentTypes.filter(doc => doc.required).map(doc => (
                                                <div key={doc.key} className="flex justify-between items-center p-3 border rounded-lg bg-red-50">
                                                    <label className="font-medium">
                                                        {doc.label} <span className="text-rojo-sagrado">*</span>
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="file" 
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFileSelect(doc.key, file);
                                                            }}
                                                            className="text-sm"
                                                        />
                                                        {uploadedDocuments.has(doc.key) && (
                                                            <span className="text-verde-esperanza text-sm">Seleccionado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Documentos opcionales */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-azul-monte-tabor mb-3">Documentos Opcionales</h4>
                                        <div className="space-y-3">
                                            {documentTypes.filter(doc => !doc.required).map(doc => (
                                                <div key={doc.key} className="flex justify-between items-center p-3 border rounded-lg">
                                                    <label className="font-medium">{doc.label}</label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="file" 
                                                            accept={doc.key === 'STUDENT_PHOTO' ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFileSelect(doc.key, file);
                                                            }}
                                                            className="text-sm"
                                                        />
                                                        {uploadedDocuments.has(doc.key) && (
                                                            <span className="text-verde-esperanza text-sm">Seleccionado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Resumen de documentos seleccionados */}
                                    {uploadedDocuments.size > 0 && (
                                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                            <p className="text-sm text-azul-monte-tabor mb-3">
                                                {uploadedDocuments.size} documento(s) seleccionado(s) para subir
                                            </p>
                                            <p className="text-xs text-gris-piedra">
                                                Los documentos se subirán automáticamente al enviar la postulación
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        
                        <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                            <p className="text-sm text-amber-800">
                                <strong>Notas importantes:</strong>
                            </p>
                            <ul className="text-sm text-amber-800 mt-2 list-disc list-inside space-y-1">
                                <li>Los certificados de estudios e informes de personalidad son obligatorios solo para estudiantes de 3° básico en adelante.</li>
                                <li>Para estudiantes menores, adjunte los documentos que correspondan según su nivel educativo actual.</li>
                                <li>La fotografía del postulante es opcional pero recomendada para agilizar el proceso.</li>
                                <li>Los informes de personalidad deben ser emitidos por el colegio o jardín infantil de origen.</li>
                                <li><strong>Puede enviar su postulación aunque no haya subido todos los documentos.</strong> Podrá completarlos más tarde desde su dashboard.</li>
                            </ul>
                        </div>
                        
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-azul-monte-tabor">
                                <strong>Consejo:</strong> Si no tiene todos los documentos listos, puede enviar su postulación ahora y completar los documentos faltantes más tarde desde su dashboard familiar.
                            </p>
                        </div>
                    </div>
                );

            // Step 8: Confirmación
            case 8:
                return (
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-azul-monte-tabor mb-4">Postulación Enviada</h3>
                        <p className="text-gris-piedra mb-6">Gracias por postular. Hemos recibido su información y nos pondremos en contacto pronto.</p>
                        <CheckCircleIcon className="w-24 h-24 text-verde-esperanza mx-auto mb-6" />
                        <p className="text-sm text-gris-piedra">Recibirá un correo de confirmación con los próximos pasos.</p>
                        <div className="mt-8 p-6 bg-blue-50 rounded-lg text-left">
                            <h4 className="font-bold text-azul-monte-tabor mb-3">Próximos pasos:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-gris-piedra">
                                <li>Recibirá un correo de confirmación en las próximas 24 horas</li>
                                <li>El equipo de admisiones revisará su postulación</li>
                                <li>Se le contactará para coordinar entrevistas familiares</li>
                                <li>Podrá acceder al portal de exámenes una vez aprobada la documentación</li>
                                <li>Los resultados se publicarán según el cronograma establecido</li>
                            </ol>
                        </div>
                        <div className="mt-6 space-y-3">
                            <Button
                                variant="primary"
                                onClick={() => window.location.href = microfrontendUrls.guardianDashboard}
                                className="w-full"
                            >
                                Ver Mi Dashboard
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = microfrontendUrls.home}
                                className="w-full"
                            >
                                Volver al Inicio
                            </Button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    // Si no está autenticado, mostrar formulario de autenticación
    if (showAuthForm || !isAuthenticated) {
        return renderAuthForm();
    }

    return (
        <div className="bg-gray-50 py-8 sm:py-16">
            <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
                {/* Header con información del usuario */}
                <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-azul-monte-tabor font-serif">Formulario de Postulación</h1>
                        <p className="text-gris-piedra">Siga los pasos para completar el proceso de admisión.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gris-piedra">Apoderado:</p>
                        <p className="font-semibold text-azul-monte-tabor">{user?.firstName} {user?.lastName}</p>
                        <Link to="/dashboard-apoderado" className="text-sm text-azul-monte-tabor hover:underline">
                            Ver mi dashboard →
                        </Link>
                    </div>
                </div>

                {/* Progress Bar con Círculos */}
                <div className="mb-8 sm:mb-10">
                    {/* Desktop View */}
                    <div className="hidden sm:flex justify-between items-center gap-2 mb-8">
                        {steps.map((step, index) => (
                            <div key={index} className="flex flex-col items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                    index < currentStep
                                        ? 'bg-verde-esperanza text-white'
                                        : index === currentStep
                                        ? 'bg-dorado-nazaret text-azul-monte-tabor border-2 border-dorado-nazaret'
                                        : 'bg-gray-300 text-white'
                                }`}>
                                    {index + 1}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`h-0.5 w-full mt-3 transition-all duration-300 ${
                                        index < currentStep ? 'bg-verde-esperanza' : 'bg-gray-300'
                                    }`}></div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Mobile View */}
                    <div className="sm:hidden text-center mb-6">
                        <div className="inline-flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                                currentStep === 0
                                    ? 'bg-dorado-nazaret text-azul-monte-tabor border-2 border-dorado-nazaret'
                                    : 'bg-verde-esperanza text-white'
                            }`}>
                                {currentStep + 1}
                            </div>
                            <span className="text-sm text-gris-piedra">de {steps.length}</span>
                        </div>
                        <p className="text-xs text-gris-piedra mt-3">Paso {currentStep + 1}</p>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="w-full">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-azul-monte-tabor">
                                {Math.round(((currentStep + 1) / steps.length) * 100)}%
                            </span>
                            <span className="text-xs text-gris-piedra">
                                {currentStep + 1} de {steps.length}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-dorado-nazaret to-verde-esperanza rounded-full transition-all duration-500"
                                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <Card className="p-4 sm:p-8 md:p-12">
                    {renderStepContent()}
                </Card>


                {/* Navigation Buttons */}
                {currentStep < steps.length - 1 && (
                    <div className="mt-8 flex justify-between">
                        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
                            Anterior
                        </Button>
                        <Button
                            variant="primary"
                            onClick={nextStep}
                            isLoading={isSubmitting}
                            loadingText={location.state?.editMode ? "Guardando..." : "Enviando..."}
                            disabled={!canProceedToNextStep && !isSubmitting}
                        >
                            {currentStep === 7
                                ? (location.state?.editMode ? 'Guardar Cambios' : 'Enviar Postulación')
                                : 'Siguiente'
                            }
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal de errores */}
            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title={errorModalData.title}
                message={errorModalData.message}
                errors={errorModalData.errors}
            />
        </div>
    );
};

export default ApplicationForm;