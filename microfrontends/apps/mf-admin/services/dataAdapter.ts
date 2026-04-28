/**
 * Data Adapter Service
 * 
 * Este servicio mapea los datos simples que devuelven los microservicios Node.js
 * a las estructuras complejas que espera el frontend React.
 */

// Tipos de datos simples que devuelven los microservicios
export interface SimpleMicroserviceUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
}

export interface SimpleMicroserviceApplication {
  id: string;
  student_name: string;
  student_rut?: string;
  applicant_email: string;
  status: string;
  submission_date?: string | null;
  created_at: string;
  updated_at: string;
}

// Tipos complejos que espera el frontend
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  rut: string;
  phone?: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: number;
  student: {
    firstName: string;
    lastName: string;
    maternalLastName?: string;
    rut: string;
    birthDate: string;
    email?: string;
    address?: string;
    gradeApplied?: string;
    targetSchool?: string;
    currentSchool?: string;
    additionalNotes?: string;
    isEmployeeChild?: boolean;
    employeeParentName?: string;
    isAlumniChild?: boolean;
    alumniParentYear?: string;
    isInclusionStudent?: boolean;
    inclusionType?: string;
    inclusionNotes?: string;
  };
  father?: {
    fullName: string;
    rut?: string;
    email?: string;
    phone?: string;
    profession?: string;
  };
  mother?: {
    fullName: string;
    rut?: string;
    email?: string;
    phone?: string;
    profession?: string;
  };
  supporter?: {
    fullName: string;
    rut: string;
    email: string;
    phone: string;
    relationship: string;
  };
  guardian?: {
    fullName: string;
    rut?: string;
    email?: string;
    phone?: string;
    relationship?: string;
  };
  applicantUser?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  status: string;
  submissionDate: string;
  documents?: any[];
}

/**
 * Data Adapter Class
 */
export class DataAdapter {
  
  /**
   * Convierte un usuario simple del microservicio a la estructura compleja del frontend
   */
  static adaptUser(simpleUser: SimpleMicroserviceUser | any): User {
    // Soporte tanto para snake_case como camelCase (fallback para compatibilidad)
    return {
      id: parseInt(simpleUser.id || simpleUser.id),
      firstName: simpleUser.first_name || simpleUser.firstName || '',
      lastName: simpleUser.last_name || simpleUser.lastName || '',
      fullName: simpleUser.fullName || `${simpleUser.first_name || simpleUser.firstName || ''} ${simpleUser.last_name || simpleUser.lastName || ''}`.trim(),
      email: simpleUser.email || '',
      rut: simpleUser.rut || this.generateMockRut(), // Usar RUT si viene, sino generar mock
      phone: simpleUser.phone || undefined,
      role: simpleUser.role || 'APODERADO',
      roleDisplayName: simpleUser.roleDisplayName || simpleUser.role || 'APODERADO',
      subject: simpleUser.subject || undefined,
      subjectDisplayName: simpleUser.subjectDisplayName || simpleUser.subject || undefined,
      educationalLevel: simpleUser.educationalLevel || simpleUser.educational_level || undefined,
      educationalLevelDisplayName: simpleUser.educationalLevelDisplayName || simpleUser.educationalLevel || simpleUser.educational_level || undefined,
      active: simpleUser.active !== undefined ? simpleUser.active : true,
      emailVerified: simpleUser.emailVerified !== undefined ? simpleUser.emailVerified : (simpleUser.email_verified !== undefined ? simpleUser.email_verified : false),
      createdAt: simpleUser.created_at || simpleUser.createdAt || new Date().toISOString(),
      updatedAt: simpleUser.updated_at || simpleUser.updatedAt || simpleUser.created_at || simpleUser.createdAt || new Date().toISOString(),
      lastLogin: simpleUser.lastLogin || simpleUser.last_login || undefined
    };
  }

  /**
   * Convierte múltiples usuarios simples a estructura compleja
   */
  static adaptUsers(simpleUsers: SimpleMicroserviceUser[]): User[] {
    return simpleUsers.map(user => this.adaptUser(user));
  }

  /**
   * Convierte una aplicación simple del microservicio a la estructura compleja del frontend
   */
  static adaptApplication(simpleApp: SimpleMicroserviceApplication): Application {
    // Separar el nombre completo en nombres y apellidos - validación defensiva
    const studentName = simpleApp.student_name || '';
    const nameParts = studentName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts[1] || '';
    const maternalLastName = nameParts.length > 2 ? nameParts.slice(2).join(' ') : undefined;

    return {
      id: simpleApp.id ? parseInt(simpleApp.id) : 0,
      student: {
        firstName,
        lastName,
        maternalLastName,
        rut: simpleApp.student_rut || this.generateMockRut(),
        birthDate: this.generateMockBirthDate(),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        address: 'Dirección no especificada',
        gradeApplied: this.inferGradeFromName(studentName),
        targetSchool: 'MONTE_TABOR',
        currentSchool: 'Colegio anterior',
        additionalNotes: 'Datos migrados desde microservicio',
        isEmployeeChild: false,
        isAlumniChild: false,
        isInclusionStudent: false
      },
      guardian: {
        fullName: 'Apoderado de ' + studentName,
        email: simpleApp.applicant_email || 'sin-email@ejemplo.com',
        rut: this.generateMockRut(),
        phone: this.generateMockPhone(),
        relationship: 'Madre/Padre'
      },
      applicantUser: {
        email: simpleApp.applicant_email || 'sin-email@ejemplo.com',
        firstName: 'Apoderado',
        lastName: 'de ' + lastName
      },
      status: simpleApp.status || 'PENDING',
      submissionDate: simpleApp.submission_date || simpleApp.created_at || new Date().toISOString(),
      documents: []
    };
  }

  /**
   * Convierte múltiples aplicaciones simples a estructura compleja
   */
  static adaptApplications(simpleApps: SimpleMicroserviceApplication[]): Application[] {
    return simpleApps
      .filter(app => {
        // Filtrar aplicaciones con datos mínimos requeridos
        if (!app || typeof app !== 'object') {
          console.warn('Aplicación inválida filtrada:', app);
          return false;
        }
        return true;
      })
      .map(app => {
        try {
          return this.adaptApplication(app);
        } catch (error) {
          console.error('Error adaptando aplicación:', app, error);
          // Retornar una aplicación por defecto en caso de error
          return {
            id: 0,
            student: {
              firstName: 'Error',
              lastName: 'al cargar',
              rut: this.generateMockRut(),
              birthDate: this.generateMockBirthDate(),
              email: 'error@ejemplo.com',
              address: 'N/A',
              gradeApplied: 'KINDER',
              targetSchool: 'MONTE_TABOR',
              currentSchool: 'N/A',
              additionalNotes: 'Error al procesar datos',
              isEmployeeChild: false,
              isAlumniChild: false,
              isInclusionStudent: false
            },
            guardian: {
              fullName: 'Error al cargar',
              email: 'error@ejemplo.com',
              rut: this.generateMockRut(),
              phone: this.generateMockPhone(),
              relationship: 'N/A'
            },
            applicantUser: {
              email: 'error@ejemplo.com',
              firstName: 'Error',
              lastName: 'al cargar'
            },
            status: 'PENDING',
            submissionDate: new Date().toISOString(),
            documents: []
          };
        }
      });
  }

  /**
   * Adapta la respuesta del API de microservicios para usuarios
   */
  static adaptUserApiResponse(response: any): {
    content: User[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
  } {
    // DEFENSIVE: Handle undefined or null response
    if (!response) {
      console.error('❌ DataAdapter: response is undefined or null');
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: 0,
        size: 0,
        first: true,
        last: true,
        numberOfElements: 0,
        empty: true
      };
    }

    let users: SimpleMicroserviceUser[] = [];

    // DEFENSIVE: Handle multiple possible response structures
    if (response.data?.success && Array.isArray(response.data.data)) {
      users = response.data.data;
    } else if (response.data?.success && Array.isArray(response.data.content)) {
      // Backend may return 'content' field instead of 'data'
      users = response.data.content;
    } else if (Array.isArray(response.data)) {
      users = response.data;
    } else if (Array.isArray(response.content)) {
      // Direct content array
      users = response.content;
    } else {
      console.error('❌ DataAdapter: Unexpected response structure', response);
    }

    const adaptedUsers = this.adaptUsers(users);

    return {
      content: adaptedUsers,
      totalElements: adaptedUsers.length,
      totalPages: 1,
      number: 0,
      size: adaptedUsers.length,
      first: true,
      last: true,
      numberOfElements: adaptedUsers.length,
      empty: adaptedUsers.length === 0
    };
  }

  /**
   * Adapta la respuesta del API de microservicios para aplicaciones
   */
  static adaptApplicationApiResponse(response: any): Application[] {
    let applications: SimpleMicroserviceApplication[] = [];
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      applications = response.data.data;
    } else if (Array.isArray(response.data)) {
      applications = response.data;
    }

    return this.adaptApplications(applications);
  }

  // Métodos de utilidad para generar datos mock cuando no están disponibles

  private static generateMockRut(): string {
    const num = Math.floor(Math.random() * 99999999) + 10000000;
    const dv = this.calculateRutDV(num);
    return `${num}-${dv}`;
  }

  private static calculateRutDV(rut: number): string {
    let sum = 0;
    let multiplier = 2;
    
    const rutStr = rut.toString();
    for (let i = rutStr.length - 1; i >= 0; i--) {
      sum += parseInt(rutStr[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    
    const remainder = sum % 11;
    const dv = 11 - remainder;
    
    if (dv === 11) return '0';
    if (dv === 10) return 'K';
    return dv.toString();
  }

  private static generateMockBirthDate(): string {
    // Generar fecha de nacimiento entre 5 y 18 años atrás
    const yearsAgo = Math.floor(Math.random() * 13) + 5; // Entre 5 y 18 años
    const date = new Date();
    date.setFullYear(date.getFullYear() - yearsAgo);
    date.setMonth(Math.floor(Math.random() * 12));
    date.setDate(Math.floor(Math.random() * 28) + 1);
    return date.toISOString().split('T')[0];
  }

  private static generateMockPhone(): string {
    return `+569${Math.floor(Math.random() * 90000000) + 10000000}`;
  }

  private static inferGradeFromName(name: string): string {
    // Simplemente asignar grados basándose en el ID o nombre
    const grades = ['PK', 'K', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', 'I°', 'II°', 'III°', 'IV°'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return grades[hash % grades.length];
  }
}

export default DataAdapter;