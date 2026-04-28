// Servicio de Templates Predefinidos para Entrevistas
import { InterviewType, InterviewMode, CreateInterviewRequest } from '../types/interview';

export interface InterviewTemplate {
  id: string;
  name: string;
  type: InterviewType;
  description: string;
  recommendedDuration: number; // en minutos
  recommendedMode: InterviewMode;
  category: 'academic' | 'psychological' | 'family' | 'behavioral' | 'general';
  requiredDocuments: string[];
  preparationNotes: string;
  evaluationCriteria: EvaluationCriteria[];
  suggestedQuestions: Question[];
  followUpActions: string[];
  isDefault: boolean;
  createdBy: string;
  tags: string[];
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number; // 1-10
  scoreRange: {
    min: number;
    max: number;
  };
  indicators: string[];
}

export interface Question {
  id: string;
  category: 'opening' | 'academic' | 'personal' | 'family' | 'behavioral' | 'closing';
  question: string;
  purpose: string;
  expectedResponseType: 'open' | 'specific' | 'behavioral' | 'rating';
  followUpQuestions?: string[];
  redFlags?: string[];
  positiveIndicators?: string[];
}

export interface TemplateUsageStats {
  templateId: string;
  timesUsed: number;
  averageScore: number;
  successRate: number;
  lastUsed: string;
  feedbackRating: number;
}

class InterviewTemplateService {
  private templates: InterviewTemplate[] = [];
  private usageStats: Map<string, TemplateUsageStats> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.loadUsageStats();
  }

  // Inicializar templates predefinidos
  private initializeDefaultTemplates(): void {
    this.templates = [
      // Template para Entrevista Académica
      {
        id: 'academic_primary',
        name: 'Evaluación Académica - Enseñanza Básica',
        type: InterviewType.ACADEMIC,
        description: 'Template completo para evaluar competencias académicas en estudiantes de enseñanza básica (1° a 8° básico)',
        recommendedDuration: 45,
        recommendedMode: InterviewMode.IN_PERSON,
        category: 'academic',
        requiredDocuments: [
          'Informe de notas del año anterior',
          'Informe de personalidad del colegio actual',
          'Prueba diagnóstica de matemáticas',
          'Prueba diagnóstica de lenguaje'
        ],
        preparationNotes: `PREPARACIÓN PRE-ENTREVISTA:
• Revisar expediente académico completo del estudiante
• Preparar material didáctico apropiado para la edad
• Tener disponible pruebas diagnósticas breves
• Confirmar presencia de apoderado para menores de 12 años

AMBIENTE REQUERIDO:
• Sala tranquila con buena iluminación
• Mesa de trabajo cómoda para el estudiante
• Material de escritorio básico
• Calculadora (para estudiantes de 5° básico en adelante)`,
        evaluationCriteria: [
          {
            id: 'reading_comprehension',
            name: 'Comprensión Lectora',
            description: 'Capacidad para entender y analizar textos apropiados para su nivel',
            weight: 9,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Lee fluidamente para su edad',
              'Comprende ideas principales',
              'Identifica detalles relevantes',
              'Hace inferencias básicas',
              'Demuestra vocabulario apropiado'
            ]
          },
          {
            id: 'mathematical_reasoning',
            name: 'Razonamiento Matemático',
            description: 'Habilidades matemáticas básicas y resolución de problemas',
            weight: 9,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Domina operaciones básicas para su nivel',
              'Resuelve problemas lógicos',
              'Comprende conceptos numéricos',
              'Aplica estrategias de cálculo',
              'Razona espacialmente'
            ]
          },
          {
            id: 'oral_communication',
            name: 'Comunicación Oral',
            description: 'Capacidad de expresarse claramente y mantener conversación',
            weight: 7,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Se expresa con claridad',
              'Responde preguntas apropiadamente',
              'Mantiene contacto visual',
              'Usa vocabulario adecuado',
              'Demuestra confianza al hablar'
            ]
          },
          {
            id: 'learning_attitude',
            name: 'Actitud hacia el Aprendizaje',
            description: 'Motivación, curiosidad y disposición para aprender',
            weight: 8,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Muestra curiosidad intelectual',
              'Participa activamente',
              'Persiste ante dificultades',
              'Hace preguntas pertinentes',
              'Demuestra organización'
            ]
          }
        ],
        suggestedQuestions: [
          {
            id: 'opening_1',
            category: 'opening',
            question: '¿Cómo te llamas y cuántos años tienes? ¿Te gusta tu colegio actual?',
            purpose: 'Romper el hielo y establecer rapport inicial',
            expectedResponseType: 'open',
            positiveIndicators: [
              'Responde con confianza',
              'Mantiene contacto visual',
              'Muestra disposición a conversar'
            ]
          },
          {
            id: 'academic_1',
            category: 'academic',
            question: '¿Cuál es tu materia favorita y por qué? ¿Hay alguna que te resulte más difícil?',
            purpose: 'Identificar fortalezas e intereses académicos',
            expectedResponseType: 'specific',
            followUpQuestions: [
              '¿Qué es lo que más te gusta de [materia favorita]?',
              '¿Cómo estudias cuando algo te resulta difícil?'
            ],
            positiveIndicators: [
              'Identifica claramente preferencias',
              'Explica sus razones',
              'Reconoce áreas de mejora sin negatividad'
            ]
          },
          {
            id: 'academic_2',
            category: 'academic',
            question: 'Si tuvieras que explicarle a un compañero más pequeño cómo resolver este problema, ¿cómo lo harías?',
            purpose: 'Evaluar comprensión profunda y habilidades de comunicación',
            expectedResponseType: 'behavioral',
            positiveIndicators: [
              'Estructura la explicación lógicamente',
              'Usa vocabulario apropiado',
              'Demuestra paciencia y empatía'
            ]
          },
          {
            id: 'personal_1',
            category: 'personal',
            question: '¿Qué haces en tu tiempo libre? ¿Tienes hobbies o actividades especiales?',
            purpose: 'Conocer intereses personales y equilibrio vida-estudio',
            expectedResponseType: 'open',
            positiveIndicators: [
              'Tiene actividades variadas',
              'Muestra pasión por algunos intereses',
              'Balance entre actividades académicas y recreativas'
            ]
          },
          {
            id: 'behavioral_1',
            category: 'behavioral',
            question: 'Cuéntame sobre una vez que tuviste que trabajar en equipo en el colegio. ¿Cómo fue esa experiencia?',
            purpose: 'Evaluar habilidades sociales y trabajo colaborativo',
            expectedResponseType: 'behavioral',
            redFlags: [
              'No puede dar ejemplos concretos',
              'Culpa constantemente a otros',
              'Muestra actitudes muy individualistas'
            ],
            positiveIndicators: [
              'Da ejemplos específicos',
              'Reconoce contribuciones de otros',
              'Describe aprendizajes del trabajo en equipo'
            ]
          },
          {
            id: 'closing_1',
            category: 'closing',
            question: '¿Hay algo más que te gustaría contarme sobre ti? ¿Tienes alguna pregunta sobre nuestro colegio?',
            purpose: 'Cerrar positivamente y permitir expresión libre',
            expectedResponseType: 'open',
            positiveIndicators: [
              'Hace preguntas inteligentes sobre el colegio',
              'Expresa expectativas positivas',
              'Demuestra interés genuino'
            ]
          }
        ],
        followUpActions: [
          'Revisar pruebas diagnósticas si se aplicaron',
          'Coordinar con profesor de asignatura si hay dudas específicas',
          'Programar segunda entrevista si es necesario',
          'Informar a coordinación académica sobre nivel detectado',
          'Preparar recomendaciones de apoyo si las necesita'
        ],
        isDefault: true,
        createdBy: 'Sistema',
        tags: ['académica', 'básica', 'evaluación', 'diagnóstico']
      },

      // Template para Entrevista Psicológica
      {
        id: 'psychological_comprehensive',
        name: 'Evaluación Psicológica Integral',
        type: InterviewType.PSYCHOLOGICAL,
        description: 'Evaluación psicológica completa para detectar necesidades especiales, habilidades socioemocionales y recomendaciones de apoyo',
        recommendedDuration: 60,
        recommendedMode: InterviewMode.IN_PERSON,
        category: 'psychological',
        requiredDocuments: [
          'Informe psicológico previo (si existe)',
          'Evaluaciones de terapeutas externos (si aplica)',
          'Cuestionario de conducta completado por padres',
          'Informe socioemocional del colegio actual'
        ],
        preparationNotes: `PREPARACIÓN ESPECIALIZADA:
• Revisar historial médico y psicológico disponible
• Preparar material de evaluación apropiado por edad
• Considerar tiempo adicional si hay necesidades especiales
• Ambiente cálido y libre de distracciones

CONSIDERACIONES ÉTICAS:
• Confidencialidad absoluta
• Consentimiento informado de apoderados
• Derivación a especialistas si es necesario
• Registro detallado para seguimiento`,
        evaluationCriteria: [
          {
            id: 'emotional_regulation',
            name: 'Regulación Emocional',
            description: 'Capacidad para manejar emociones y situaciones de estrés',
            weight: 10,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Identifica y nombra emociones',
              'Usa estrategias de autorregulación',
              'Maneja frustración apropiadamente',
              'Busca ayuda cuando la necesita',
              'Controla impulsos básicos'
            ]
          },
          {
            id: 'social_skills',
            name: 'Habilidades Sociales',
            description: 'Competencias para relacionarse con pares y adultos',
            weight: 9,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Inicia y mantiene conversaciones',
              'Respeta turnos y espacios personales',
              'Demuestra empatía hacia otros',
              'Resuelve conflictos pacíficamente',
              'Forma amistades apropiadas'
            ]
          },
          {
            id: 'attention_focus',
            name: 'Atención y Concentración',
            description: 'Capacidad de mantener atención en tareas académicas',
            weight: 8,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Mantiene atención en conversación',
              'Sigue instrucciones de múltiples pasos',
              'Completa tareas apropiadas para su edad',
              'Ignora distracciones menores',
              'Organiza información mentalmente'
            ]
          },
          {
            id: 'self_concept',
            name: 'Autoconcepto y Autoestima',
            description: 'Percepción positiva de sí mismo y confianza personal',
            weight: 8,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Habla positivamente de sí mismo',
              'Reconoce fortalezas personales',
              'Acepta áreas de mejora sin desanimarse',
              'Tiene expectativas realistas',
              'Demuestra confianza en capacidades'
            ]
          }
        ],
        suggestedQuestions: [
          {
            id: 'opening_psych',
            category: 'opening',
            question: 'Me gustaría conocerte mejor. ¿Cómo describirías tu personalidad? ¿Qué dirían tus amigos de ti?',
            purpose: 'Establecer rapport y evaluar autoconocimiento',
            expectedResponseType: 'open',
            positiveIndicators: [
              'Se describe con vocabulario positivo',
              'Menciona cualidades sociales',
              'Muestra autoconocimiento apropiado para la edad'
            ]
          },
          {
            id: 'emotional_1',
            category: 'personal',
            question: '¿Qué haces cuando te sientes triste o enojado? ¿Quién te ayuda en esos momentos?',
            purpose: 'Evaluar estrategias de regulación emocional y redes de apoyo',
            expectedResponseType: 'behavioral',
            redFlags: [
              'No identifica estrategias de autorregulación',
              'Menciona conductas agresivas',
              'No tiene figuras de apoyo claras'
            ],
            positiveIndicators: [
              'Identifica emociones claramente',
              'Usa estrategias saludables de manejo',
              'Busca apoyo en adultos apropiados'
            ]
          },
          {
            id: 'social_1',
            category: 'behavioral',
            question: 'Háblame de tus amigos. ¿Cómo haces amigos nuevos? ¿Qué haces cuando tienes problemas con alguien?',
            purpose: 'Evaluar habilidades sociales y resolución de conflictos',
            expectedResponseType: 'behavioral',
            positiveIndicators: [
              'Describe amistades positivas',
              'Tiene estrategias para hacer amigos',
              'Resuelve conflictos constructivamente'
            ]
          },
          {
            id: 'attention_1',
            category: 'academic',
            question: '¿Te es fácil concentrarte cuando estudias? ¿Qué cosas te distraen? ¿Cómo le haces para poner atención?',
            purpose: 'Detectar posibles dificultades atencionales',
            expectedResponseType: 'specific',
            redFlags: [
              'Reporta distracciones constantes',
              'No puede identificar estrategias de concentración',
              'Menciona dificultades significativas para terminar tareas'
            ]
          }
        ],
        followUpActions: [
          'Aplicar pruebas específicas si se detectan áreas de preocupación',
          'Coordinar con equipo multidisciplinario si es necesario',
          'Entrevistar a padres por separado si hay indicadores de riesgo',
          'Recomendar evaluación externa si se requiere',
          'Elaborar plan de apoyo socioemocional personalizado'
        ],
        isDefault: true,
        createdBy: 'Sistema',
        tags: ['psicológica', 'socioemocional', 'integral', 'detección']
      },

      // Template para Entrevista Familiar
      {
        id: 'family_comprehensive',
        name: 'Entrevista Familiar Integral',
        type: InterviewType.FAMILY,
        description: 'Evaluación familiar completa que incluye dinámicas familiares, expectativas educacionales y compromiso con el proyecto educativo',
        recommendedDuration: 75,
        recommendedMode: InterviewMode.IN_PERSON,
        category: 'family',
        requiredDocuments: [
          'Cuestionario familiar pre-entrevista',
          'Información socioeconómica familiar',
          'Expectativas educacionales (formulario)',
          'Carta de motivación de la familia'
        ],
        preparationNotes: `LOGÍSTICA FAMILIAR:
• Confirmar asistencia de ambos padres/apoderados
• Preparar espacio cómodo para toda la familia
• Tener material informativo del colegio disponible
• Considerar cuidado de hermanos menores si es necesario

OBJETIVOS DE LA ENTREVISTA:
• Evaluar alineación con proyecto educativo
• Detectar dinámicas familiares saludables
• Confirmar compromiso y expectativas realistas
• Establecer bases para futura colaboración`,
        evaluationCriteria: [
          {
            id: 'educational_alignment',
            name: 'Alineación con Proyecto Educativo',
            description: 'Congruencia entre valores familiares y filosofía institucional',
            weight: 10,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Conocen y valoran el proyecto educativo',
              'Sus expectativas son realistas y alineadas',
              'Muestran apertura a la formación integral',
              'Valoran aspectos más allá de lo académico',
              'Comprenden el perfil de estudiante que formamos'
            ]
          },
          {
            id: 'family_commitment',
            name: 'Compromiso Familiar',
            description: 'Disposición para involucrarse activamente en la educación',
            weight: 9,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Priorizan la educación del hijo/a',
              'Están dispuestos a participar en actividades',
              'Apoyan las decisiones pedagógicas',
              'Mantienen comunicación fluida con docentes',
              'Asumen responsabilidades formativas'
            ]
          },
          {
            id: 'family_dynamics',
            name: 'Dinámicas Familiares',
            description: 'Calidad de relaciones y comunicación familiar',
            weight: 8,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Comunicación respetuosa entre miembros',
              'Roles familiares claros y saludables',
              'Apoyo mutuo evidente',
              'Manejo constructivo de diferencias',
              'Ambiente familiar estable'
            ]
          },
          {
            id: 'support_capacity',
            name: 'Capacidad de Apoyo',
            description: 'Recursos familiares para apoyar el proceso educativo',
            weight: 7,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Tiempo disponible para acompañamiento',
              'Recursos para apoyo académico',
              'Estabilidad emocional para contener',
              'Red de apoyo familiar extendida',
              'Flexibilidad para adaptarse'
            ]
          }
        ],
        suggestedQuestions: [
          {
            id: 'opening_family',
            category: 'opening',
            question: '¿Cómo llegaron a conocer nuestro colegio y qué los motivó a postular aquí?',
            purpose: 'Entender motivaciones y nivel de información sobre la institución',
            expectedResponseType: 'open',
            positiveIndicators: [
              'Investigaron activamente el colegio',
              'Tienen razones específicas y reflexionadas',
              'Sus motivaciones van más allá de lo académico'
            ]
          },
          {
            id: 'family_1',
            category: 'family',
            question: '¿Cómo describirían a su hijo/a? ¿Cuáles consideran que son sus principales fortalezas y áreas de crecimiento?',
            purpose: 'Evaluar conocimiento y aceptación del hijo, realismo en percepciones',
            expectedResponseType: 'specific',
            positiveIndicators: [
              'Descripción balanceada y realista',
              'Reconocen tanto fortalezas como áreas de mejora',
              'Demuestran conocimiento profundo de su hijo/a'
            ],
            redFlags: [
              'Descripciones extremadamente idealizadas',
              'No reconocen ninguna área de mejora',
              'Parecen no conocer bien a su hijo/a'
            ]
          },
          {
            id: 'family_2',
            category: 'family',
            question: '¿Cómo manejan las tareas y el estudio en casa? ¿Qué rol toma cada padre en el apoyo académico?',
            purpose: 'Entender dinámicas de apoyo académico y distribución de roles',
            expectedResponseType: 'behavioral',
            positiveIndicators: [
              'Roles claros y complementarios',
              'Equilibrio entre apoyo y autonomía',
              'Estrategias organizadas para el estudio'
            ]
          },
          {
            id: 'family_3',
            category: 'family',
            question: '¿Qué esperan del colegio y qué están dispuestos a aportar como familia?',
            purpose: 'Evaluar expectativas realistas y disposición a colaborar',
            expectedResponseType: 'specific',
            positiveIndicators: [
              'Expectativas realistas y fundamentadas',
              'Disposición clara a participar activamente',
              'Entienden la educación como responsabilidad compartida'
            ]
          },
          {
            id: 'behavioral_family',
            category: 'behavioral',
            question: '¿Cómo manejan los conflictos o desacuerdos en la familia? ¿Pueden darnos un ejemplo?',
            purpose: 'Evaluar habilidades de resolución de conflictos y comunicación',
            expectedResponseType: 'behavioral',
            positiveIndicators: [
              'Estrategias constructivas de resolución',
              'Comunicación abierta y respetuosa',
              'Capacidad de llegar a acuerdos'
            ],
            redFlags: [
              'Evitan hablar de conflictos',
              'Patrones de comunicación destructivos',
              'Roles rígidos o autoritarios'
            ]
          }
        ],
        followUpActions: [
          'Programar visita familiar al colegio si es apropiado',
          'Conectar con familias actuales para referencias si es solicitado',
          'Revisar capacidad económica con área administrativa si es necesario',
          'Coordinar entrevista individual con estudiante si no se ha realizado',
          'Elaborar informe integral para comité de admisión'
        ],
        isDefault: true,
        createdBy: 'Sistema',
        tags: ['familiar', 'integral', 'compromiso', 'valores']
      },

      // Template para Entrevista Individual - Estudiante
      {
        id: 'individual_student',
        name: 'Entrevista Individual - Conociendo al Estudiante',
        type: InterviewType.INDIVIDUAL,
        description: 'Entrevista personal con el estudiante para conocer su personalidad, motivaciones, intereses y expectativas',
        recommendedDuration: 40,
        recommendedMode: InterviewMode.IN_PERSON,
        category: 'general',
        requiredDocuments: [
          'Autoconocimiento del estudiante (formulario previo)',
          'Carta personal del estudiante (opcional)',
          'Portafolio de trabajos o intereses (opcional)'
        ],
        preparationNotes: `AMBIENTE PARA EL ESTUDIANTE:
• Crear atmosfera relajada y de confianza
• Adaptar lenguaje a la edad del estudiante
• Permitir que se exprese libremente
• Respetar ritmos y formas de comunicación

ENFOQUE POSITIVO:
• Destacar fortalezas y logros
• Hacer sentir al estudiante valorado
• Evitar juicios o comparaciones
• Fomentar la autoexpresión auténtica`,
        evaluationCriteria: [
          {
            id: 'self_expression',
            name: 'Capacidad de Autoexpresión',
            description: 'Habilidad para comunicar ideas, sentimientos y experiencias',
            weight: 8,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Se expresa con claridad para su edad',
              'Comparte experiencias significativas',
              'Demuestra vocabulario apropiado',
              'Mantiene fluidez en la conversación',
              'Expresa emociones adecuadamente'
            ]
          },
          {
            id: 'personal_interests',
            name: 'Intereses y Motivaciones',
            description: 'Pasiones, hobbies y actividades que lo motivan',
            weight: 7,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Identifica intereses claros',
              'Demuestra pasión por algunas actividades',
              'Equilibra intereses diversos',
              'Muestra curiosidad por aprender',
              'Tiene metas personales apropiadas'
            ]
          },
          {
            id: 'social_comfort',
            name: 'Comodidad Social',
            description: 'Confianza para interactuar con adultos y pares',
            weight: 7,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Se muestra cómodo en la conversación',
              'Hace contacto visual apropiado',
              'Responde preguntas con confianza',
              'Inicia temas de conversación',
              'Demuestra modales sociales básicos'
            ]
          },
          {
            id: 'growth_mindset',
            name: 'Mentalidad de Crecimiento',
            description: 'Actitud hacia los desafíos y el aprendizaje',
            weight: 8,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Ve los errores como oportunidades',
              'Muestra disposición a aprender cosas nuevas',
              'Persiste ante dificultades',
              'Valora el esfuerzo sobre los resultados',
              'Busca feedback para mejorar'
            ]
          }
        ],
        suggestedQuestions: [
          {
            id: 'opening_student',
            category: 'opening',
            question: 'Cuéntame un poco sobre ti. ¿Qué es lo que más te gusta hacer en tu tiempo libre?',
            purpose: 'Establecer conexión y conocer intereses personales',
            expectedResponseType: 'open',
            positiveIndicators: [
              'Comparte con entusiasmo',
              'Menciona actividades variadas',
              'Muestra personalidad auténtica'
            ]
          },
          {
            id: 'personal_student_1',
            category: 'personal',
            question: '¿Cuál ha sido el momento más feliz que recuerdas en tu colegio actual? ¿Y el más difícil?',
            purpose: 'Entender experiencias escolares y capacidad de reflexión',
            expectedResponseType: 'behavioral',
            positiveIndicators: [
              'Recuerda experiencias específicas',
              'Reflexiona sobre aprendizajes',
              'Maneja tanto experiencias positivas como negativas'
            ]
          },
          {
            id: 'academic_student_1',
            category: 'academic',
            question: 'Si pudieras diseñar tu día perfecto en el colegio, ¿cómo sería?',
            purpose: 'Explorar expectativas educacionales y motivaciones',
            expectedResponseType: 'open',
            positiveIndicators: [
              'Incluye variedad de actividades',
              'Menciona tanto académicas como sociales',
              'Muestra expectativas realistas'
            ]
          },
          {
            id: 'behavioral_student_1',
            category: 'behavioral',
            question: '¿Qué harías si un compañero te pidiera ayuda con algo que no entiendes muy bien?',
            purpose: 'Evaluar empatía, honestidad y habilidades sociales',
            expectedResponseType: 'behavioral',
            positiveIndicators: [
              'Muestra disposición a ayudar',
              'Reconoce honestamente sus límites',
              'Sugiere alternativas constructivas'
            ]
          },
          {
            id: 'closing_student',
            category: 'closing',
            question: '¿Hay algo especial que te gustaría que sepamos sobre ti? ¿Tienes alguna pregunta sobre nuestro colegio?',
            purpose: 'Permitir autoexpresión libre y evaluar interés',
            expectedResponseType: 'open',
            positiveIndicators: [
              'Comparte algo significativo',
              'Hace preguntas inteligentes',
              'Demuestra interés genuino en el colegio'
            ]
          }
        ],
        followUpActions: [
          'Registrar intereses especiales para futura vinculación',
          'Coordinar con área de orientación si se detectan necesidades especiales',
          'Informar a profesores relevantes sobre fortalezas detectadas',
          'Programar actividad de integración si es admitido',
          'Seguimiento del proceso de adaptación inicial'
        ],
        isDefault: true,
        createdBy: 'Sistema',
        tags: ['individual', 'estudiante', 'personal', 'motivaciones']
      },

      // Template para Entrevista Conductual
      {
        id: 'behavioral_assessment',
        name: 'Evaluación de Competencias Conductuales',
        type: InterviewType.BEHAVIORAL,
        description: 'Evaluación específica de habilidades socioemocionales, autorregulación y competencias para la convivencia escolar',
        recommendedDuration: 50,
        recommendedMode: InterviewMode.IN_PERSON,
        category: 'behavioral',
        requiredDocuments: [
          'Registro disciplinario del colegio actual',
          'Evaluación socioemocional previa (si existe)',
          'Cuestionario de convivencia escolar'
        ],
        preparationNotes: `ENFOQUE ESPECIALIZADO:
• Ambiente no intimidante pero profesional
• Observar lenguaje corporal y reacciones
• Registrar ejemplos específicos de comportamientos
• Mantener objetividad en observaciones

ÁREAS CLAVE A EVALUAR:
• Autorregulación emocional
• Habilidades de resolución de conflictos
• Respeto por normas y autoridad
• Capacidad de trabajo colaborativo
• Resiliencia ante frustración`,
        evaluationCriteria: [
          {
            id: 'self_regulation',
            name: 'Autorregulación',
            description: 'Capacidad para controlar impulsos y comportamiento',
            weight: 10,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Controla impulsos apropiadamente',
              'Maneja frustración constructivamente',
              'Sigue instrucciones y rutinas',
              'Adapta comportamiento según contexto',
              'Usa estrategias de autocontrol'
            ]
          },
          {
            id: 'conflict_resolution',
            name: 'Resolución de Conflictos',
            description: 'Habilidades para manejar desacuerdos y problemas sociales',
            weight: 9,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Identifica problemas claramente',
              'Busca soluciones pacíficas',
              'Acepta diferentes perspectivas',
              'Negocia y compromete apropiadamente',
              'Aprende de experiencias conflictivas'
            ]
          },
          {
            id: 'respect_authority',
            name: 'Respeto por Autoridad',
            description: 'Actitud hacia reglas, normas y figuras de autoridad',
            weight: 8,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Respeta figuras de autoridad',
              'Sigue normas escolares básicas',
              'Acepta feedback constructivo',
              'Entiende razones detrás de las reglas',
              'Cuestiona apropiadamente cuando es necesario'
            ]
          },
          {
            id: 'collaborative_skills',
            name: 'Habilidades Colaborativas',
            description: 'Competencias para trabajar efectivamente con otros',
            weight: 8,
            scoreRange: { min: 1, max: 10 },
            indicators: [
              'Participa activamente en grupos',
              'Respeta ideas de otros',
              'Contribuye constructivamente',
              'Asume responsabilidades compartidas',
              'Celebra logros grupales'
            ]
          }
        ],
        suggestedQuestions: [
          {
            id: 'behavioral_opening',
            category: 'opening',
            question: 'Cuéntame sobre tu experiencia en el colegio actual. ¿Cómo te llevas con tus compañeros y profesores?',
            purpose: 'Evaluar autoperepción de relaciones sociales',
            expectedResponseType: 'behavioral',
            positiveIndicators: [
              'Describe relaciones positivas',
              'Reconoce diferentes tipos de relaciones',
              'Muestra capacidad de adaptación social'
            ]
          },
          {
            id: 'conflict_1',
            category: 'behavioral',
            question: 'Describe una situación en que tuviste un desacuerdo con un compañero. ¿Cómo lo resolvieron?',
            purpose: 'Evaluar habilidades reales de resolución de conflictos',
            expectedResponseType: 'behavioral',
            redFlags: [
              'Siempre culpa al otro',
              'Describe soluciones agresivas',
              'No puede dar ejemplos específicos'
            ],
            positiveIndicators: [
              'Da ejemplos específicos y detallados',
              'Reconoce su rol en el conflicto',
              'Describe soluciones constructivas'
            ]
          },
          {
            id: 'rules_1',
            category: 'behavioral',
            question: '¿Qué piensas sobre las reglas del colegio? ¿Hay alguna que te parezca injusta? ¿Por qué?',
            purpose: 'Evaluar actitud hacia normas y capacidad de razonamiento moral',
            expectedResponseType: 'specific',
            positiveIndicators: [
              'Entiende propósito de las reglas',
              'Cuestiona constructivamente cuando es apropiado',
              'Muestra razonamiento moral desarrollado'
            ]
          },
          {
            id: 'teamwork_1',
            category: 'behavioral',
            question: 'Cuéntame sobre un proyecto grupal exitoso en que participaste. ¿Cuál fue tu contribución?',
            purpose: 'Evaluar habilidades colaborativas y autoevaluación',
            expectedResponseType: 'behavioral',
            positiveIndicators: [
              'Identifica contribuciones específicas',
              'Reconoce aportes de otros',
              'Describe liderazgo o seguimiento apropiado'
            ]
          },
          {
            id: 'frustration_1',
            category: 'behavioral',
            question: '¿Qué haces cuando algo no te sale como esperabas? ¿Puedes darme un ejemplo?',
            purpose: 'Evaluar manejo de frustración y resiliencia',
            expectedResponseType: 'behavioral',
            redFlags: [
              'Reacciones agresivas o destructivas',
              'Se rinde inmediatamente',
              'No tiene estrategias de manejo'
            ],
            positiveIndicators: [
              'Usa estrategias constructivas',
              'Busca ayuda apropiadamente',
              'Persiste con enfoque positivo'
            ]
          }
        ],
        followUpActions: [
          'Revisar con orientación estrategias de apoyo socioemocional',
          'Coordinar con equipo de convivencia escolar si hay áreas de atención',
          'Establecer plan de seguimiento conductual si es necesario',
          'Comunicar fortalezas a futuros profesores jefe',
          'Programar reunión de seguimiento con padres si se detectan necesidades'
        ],
        isDefault: true,
        createdBy: 'Sistema',
        tags: ['conductual', 'socioemocional', 'convivencia', 'autorregulación']
      }
    ];
  }

  // Cargar estadísticas de uso desde localStorage
  private loadUsageStats(): void {
    try {
      const stored = localStorage.getItem('interview_template_stats');
      if (stored) {
        const statsArray = JSON.parse(stored);
        this.usageStats = new Map(statsArray);
      }
    } catch (error) {
      console.warn('Error cargando estadísticas de templates:', error);
    }
  }

  // Guardar estadísticas de uso
  private saveUsageStats(): void {
    try {
      const statsArray = Array.from(this.usageStats.entries());
      localStorage.setItem('interview_template_stats', JSON.stringify(statsArray));
    } catch (error) {
      console.warn('Error guardando estadísticas de templates:', error);
    }
  }

  // Obtener todos los templates
  getTemplates(): InterviewTemplate[] {
    return [...this.templates];
  }

  // Obtener template por ID
  getTemplate(id: string): InterviewTemplate | null {
    return this.templates.find(template => template.id === id) || null;
  }

  // Obtener templates por tipo
  getTemplatesByType(type: InterviewType): InterviewTemplate[] {
    return this.templates.filter(template => template.type === type);
  }

  // Obtener templates por categoría
  getTemplatesByCategory(category: InterviewTemplate['category']): InterviewTemplate[] {
    return this.templates.filter(template => template.category === category);
  }

  // Buscar templates por tags
  searchTemplatesByTags(tags: string[]): InterviewTemplate[] {
    return this.templates.filter(template =>
      tags.some(tag => template.tags.includes(tag.toLowerCase()))
    );
  }

  // Aplicar template a solicitud de entrevista
  applyTemplate(templateId: string, baseRequest: Partial<CreateInterviewRequest>): CreateInterviewRequest {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} no encontrado`);
    }

    // Registrar uso del template
    this.recordTemplateUsage(templateId);

    // Combinar datos del template con la solicitud base
    const interviewRequest: CreateInterviewRequest = {
      ...baseRequest,
      type: template.type,
      mode: baseRequest.mode || template.recommendedMode,
      duration: baseRequest.duration || template.recommendedDuration,
      preparation: template.preparationNotes,
      notes: `Template aplicado: ${template.name}\n\nObjetivos:\n${template.description}\n\nDocumentos requeridos:\n${template.requiredDocuments.join('\n')}`
    } as CreateInterviewRequest;

    return interviewRequest;
  }

  // Registrar uso de template
  private recordTemplateUsage(templateId: string): void {
    const currentStats = this.usageStats.get(templateId) || {
      templateId,
      timesUsed: 0,
      averageScore: 0,
      successRate: 0,
      lastUsed: new Date().toISOString(),
      feedbackRating: 0
    };

    currentStats.timesUsed += 1;
    currentStats.lastUsed = new Date().toISOString();

    this.usageStats.set(templateId, currentStats);
    this.saveUsageStats();
  }

  // Obtener estadísticas de uso
  getTemplateStats(templateId: string): TemplateUsageStats | null {
    return this.usageStats.get(templateId) || null;
  }

  // Obtener templates más populares
  getPopularTemplates(limit: number = 5): InterviewTemplate[] {
    const templatesWithStats = this.templates
      .map(template => ({
        template,
        stats: this.usageStats.get(template.id)
      }))
      .sort((a, b) => (b.stats?.timesUsed || 0) - (a.stats?.timesUsed || 0))
      .slice(0, limit);

    return templatesWithStats.map(item => item.template);
  }

  // Crear template personalizado
  createCustomTemplate(template: Omit<InterviewTemplate, 'id' | 'isDefault' | 'createdBy'>): InterviewTemplate {
    const newTemplate: InterviewTemplate = {
      ...template,
      id: `custom_${Date.now()}`,
      isDefault: false,
      createdBy: 'Usuario'
    };

    this.templates.push(newTemplate);
    return newTemplate;
  }

  // Actualizar template existente (solo custom)
  updateTemplate(id: string, updates: Partial<InterviewTemplate>): boolean {
    const templateIndex = this.templates.findIndex(t => t.id === id);
    if (templateIndex === -1 || this.templates[templateIndex].isDefault) {
      return false;
    }

    this.templates[templateIndex] = { ...this.templates[templateIndex], ...updates };
    return true;
  }

  // Eliminar template personalizado
  deleteTemplate(id: string): boolean {
    const templateIndex = this.templates.findIndex(t => t.id === id);
    if (templateIndex === -1 || this.templates[templateIndex].isDefault) {
      return false;
    }

    this.templates.splice(templateIndex, 1);
    this.usageStats.delete(id);
    this.saveUsageStats();
    return true;
  }

  // Exportar template para compartir
  exportTemplate(id: string): string {
    const template = this.getTemplate(id);
    if (!template) {
      throw new Error('Template no encontrado');
    }

    return JSON.stringify(template, null, 2);
  }

  // Importar template desde JSON
  importTemplate(jsonString: string): InterviewTemplate {
    try {
      const templateData = JSON.parse(jsonString);
      
      // Validar estructura básica
      if (!templateData.name || !templateData.type || !templateData.description) {
        throw new Error('Template inválido: faltan campos requeridos');
      }

      // Crear nuevo template con ID único
      const newTemplate: InterviewTemplate = {
        ...templateData,
        id: `imported_${Date.now()}`,
        isDefault: false,
        createdBy: 'Importado'
      };

      this.templates.push(newTemplate);
      return newTemplate;
    } catch (error) {
      throw new Error(`Error importando template: ${error}`);
    }
  }
}

// Instancia singleton
export const interviewTemplateService = new InterviewTemplateService();

export default interviewTemplateService;