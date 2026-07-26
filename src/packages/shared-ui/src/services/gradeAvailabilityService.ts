import api from './api';
import type {
  GradeAvailability,
  GradeAvailabilityResponse,
  GradeAvailabilityUpdate,
} from '../types/gradeAvailability';

const ADMIN_URL = '/v1/grade-availability';
const PUBLIC_URL = '/v1/public/grade-availability';

export const gradeAvailabilityService = {
  /**
   * Obtener todos los niveles con su disponibilidad (requiere auth ADMIN)
   */
  async getAll(): Promise<GradeAvailability[]> {
    const response = await api.get<GradeAvailabilityResponse>(ADMIN_URL);
    return response.data.data || [];
  },

  /**
   * Actualizar disponibilidad de niveles (bulk update)
   */
  async updateAvailability(updates: GradeAvailabilityUpdate[]): Promise<GradeAvailability[]> {
    const response = await api.put<GradeAvailabilityResponse>(ADMIN_URL, { updates });
    return response.data.data || [];
  },

  /**
   * Obtener solo niveles con vacantes (sin auth - para formulario público)
   */
  async getAvailable(): Promise<Pick<GradeAvailability, 'gradeLevel' | 'hasVacancyM' | 'hasVacancyF'>[]> {
    const response = await api.get<{ success: boolean; data: Pick<GradeAvailability, 'gradeLevel' | 'hasVacancyM' | 'hasVacancyF'>[] }>(PUBLIC_URL);
    return response.data.data || [];
  },

  /**
   * Obtener niveles disponibles como array de strings (gradeLevel)
   * Útil para validar directamente
   */
  async getAvailableGradeLevels(): Promise<string[]> {
    const available = await this.getAvailable();
    return available
      .filter((g) => g.hasVacancyM || g.hasVacancyF)
      .map((g) => g.gradeLevel);
  },
};
