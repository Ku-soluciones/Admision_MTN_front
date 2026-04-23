/**
 * Student Service
 * Servicio para gestionar estudiantes en el sistema de admisión
 *
 * Endpoints del backend (application-service):
 * - GET /v1/students - Listar todos los estudiantes
 * - GET /v1/students/:id - Obtener estudiante por ID
 * - GET /v1/students/rut/:rut - Obtener estudiante por RUT
 * - GET /v1/students/grade/:grade - Obtener estudiantes por grado
 * - GET /v1/students/search/:term - Buscar estudiantes
 * - GET /v1/students/statistics/by-grade - Obtener estadísticas por grado
 * - POST /v1/students - Crear nuevo estudiante (requiere CSRF)
 * - POST /v1/students/validate-rut - Validar formato de RUT (público)
 * - PUT /v1/students/:id - Actualizar estudiante (requiere CSRF)
 * - DELETE /v1/students/:id - Eliminar estudiante (requiere CSRF)
 */

import api from './api';
import {
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  StudentFilters,
  StudentsResponse,
  StudentStatistics,
  ValidateRutRequest,
  ValidateRutResponse
} from '../types/student';

class StudentService {
  private baseUrl = '/v1/students';

  /**
   * Obtener todos los estudiantes con filtros opcionales
   */
  async getAllStudents(filters?: StudentFilters): Promise<StudentsResponse> {
    try {
      const params: any = {};

      if (filters?.page !== undefined) params.page = filters.page;
      if (filters?.limit !== undefined) params.limit = filters.limit;
      if (filters?.grade) params.grade = filters.grade;
      if (filters?.search) params.search = filters.search;
      if (filters?.admissionPreference) params.admissionPreference = filters.admissionPreference;

      const response = await api.get(this.baseUrl, { params });

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return {
        students: Array.isArray(responseData.students) ? responseData.students : [],
        total: responseData.total || responseData.count || 0,
        page: responseData.page || filters?.page || 0,
        limit: responseData.limit || filters?.limit || 10,
        totalPages: responseData.totalPages || Math.ceil((responseData.total || 0) / (filters?.limit || 10))
      };
    } catch (error: any) {
      console.error('Error fetching students:', error);
      throw new Error(error.response?.data?.error?.message || 'Error al obtener estudiantes');
    }
  }

  /**
   * Obtener un estudiante por ID
   */
  async getStudentById(id: number): Promise<Student> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return responseData;
    } catch (error: any) {
      console.error(`Error fetching student ${id}:`, error);
      throw new Error(error.response?.data?.error?.message || 'Error al obtener el estudiante');
    }
  }

  /**
   * Obtener un estudiante por RUT
   */
  async getStudentByRut(rut: string): Promise<Student> {
    try {
      const response = await api.get(`${this.baseUrl}/rut/${encodeURIComponent(rut)}`);

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return responseData;
    } catch (error: any) {
      console.error(`Error fetching student by RUT ${rut}:`, error);

      // Si es 404, el estudiante no existe
      if (error.response?.status === 404) {
        throw new Error('Estudiante no encontrado');
      }

      throw new Error(error.response?.data?.error?.message || 'Error al buscar el estudiante por RUT');
    }
  }

  /**
   * Crear un nuevo estudiante
   * CSRF token se añade automáticamente por el interceptor de api.ts
   */
  async createStudent(data: CreateStudentRequest): Promise<Student> {
    try {
      const response = await api.post(this.baseUrl, data);

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return responseData.student || responseData;
    } catch (error: any) {
      console.error('Error creating student:', error);

      // Manejar errores específicos
      if (error.response?.status === 409) {
        throw new Error('Ya existe un estudiante con este RUT');
      }

      if (error.response?.status === 422) {
        throw new Error(error.response?.data?.error?.message || 'Datos inválidos');
      }

      throw new Error(error.response?.data?.error?.message || 'Error al crear el estudiante');
    }
  }

  /**
   * Actualizar un estudiante existente
   * CSRF token se añade automáticamente por el interceptor de api.ts
   */
  async updateStudent(id: number, data: UpdateStudentRequest): Promise<Student> {
    try {
      const response = await api.put(`${this.baseUrl}/${id}`, data);

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return responseData.student || responseData;
    } catch (error: any) {
      console.error(`Error updating student ${id}:`, error);

      // Manejar errores específicos
      if (error.response?.status === 404) {
        throw new Error('Estudiante no encontrado');
      }

      if (error.response?.status === 409) {
        throw new Error('Ya existe otro estudiante con este RUT');
      }

      if (error.response?.status === 422) {
        throw new Error(error.response?.data?.error?.message || 'Datos inválidos');
      }

      throw new Error(error.response?.data?.error?.message || 'Error al actualizar el estudiante');
    }
  }

  /**
   * Eliminar un estudiante
   * CSRF token se añade automáticamente por el interceptor de api.ts
   */
  async deleteStudent(id: number): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
    } catch (error: any) {
      console.error(`Error deleting student ${id}:`, error);

      // Manejar errores específicos
      if (error.response?.status === 404) {
        throw new Error('Estudiante no encontrado');
      }

      if (error.response?.status === 409) {
        throw new Error('No se puede eliminar: el estudiante está referenciado en aplicaciones');
      }

      throw new Error(error.response?.data?.error?.message || 'Error al eliminar el estudiante');
    }
  }

  /**
   * Buscar estudiantes por término
   */
  async searchStudents(term: string): Promise<Student[]> {
    try {
      if (!term || term.trim().length === 0) {
        return [];
      }

      const response = await api.get(`${this.baseUrl}/search/${encodeURIComponent(term)}`);

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return Array.isArray(responseData.students) ? responseData.students :
             Array.isArray(responseData) ? responseData : [];
    } catch (error: any) {
      console.error(`Error searching students with term "${term}":`, error);

      // Si no hay resultados, retornar array vacío en lugar de error
      if (error.response?.status === 404) {
        return [];
      }

      throw new Error(error.response?.data?.error?.message || 'Error al buscar estudiantes');
    }
  }

  /**
   * Obtener estudiantes por grado
   */
  async getStudentsByGrade(grade: string): Promise<Student[]> {
    try {
      const response = await api.get(`${this.baseUrl}/grade/${encodeURIComponent(grade)}`);

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return Array.isArray(responseData.students) ? responseData.students :
             Array.isArray(responseData) ? responseData : [];
    } catch (error: any) {
      console.error(`Error fetching students by grade ${grade}:`, error);

      // Si no hay resultados, retornar array vacío
      if (error.response?.status === 404) {
        return [];
      }

      throw new Error(error.response?.data?.error?.message || 'Error al obtener estudiantes por grado');
    }
  }

  /**
   * Obtener estadísticas de estudiantes por grado
   */
  async getStatisticsByGrade(): Promise<StudentStatistics[]> {
    try {
      const response = await api.get(`${this.baseUrl}/statistics/by-grade`);

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return Array.isArray(responseData.statistics) ? responseData.statistics :
             Array.isArray(responseData) ? responseData : [];
    } catch (error: any) {
      console.error('Error fetching student statistics:', error);
      throw new Error(error.response?.data?.error?.message || 'Error al obtener estadísticas');
    }
  }

  /**
   * Validar formato de RUT (endpoint público, no requiere autenticación)
   */
  async validateRut(rut: string): Promise<ValidateRutResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/validate-rut`, { rut } as ValidateRutRequest);

      // Manejar respuesta envuelta o directa
      const responseData = response.data?.data || response.data;

      return {
        isValid: responseData.isValid || false,
        formatted: responseData.formatted
      };
    } catch (error: any) {
      console.error(`Error validating RUT ${rut}:`, error);

      // Si el backend retorna error, el RUT es inválido
      return {
        isValid: false
      };
    }
  }

  /**
   * Formatear RUT chileno (12.345.678-9)
   */
  formatRut(rut: string): string {
    // Remover puntos y guiones
    const cleanRut = rut.replace(/[.-]/g, '');

    if (cleanRut.length < 2) return rut;

    // Separar cuerpo y dígito verificador
    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);

    // Formatear cuerpo con puntos
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formattedBody}-${dv}`;
  }

  /**
   * Calcular edad a partir de fecha de nacimiento
   */
  calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }
}

export default new StudentService();
