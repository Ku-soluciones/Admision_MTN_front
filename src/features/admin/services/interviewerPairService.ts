import api from './api';
import type { EligiblePairsResult, InterviewerPair, InterviewerPairOptions } from '../types/interviewerPair';

const errorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || fallback;

export const interviewerPairService = {
  async getAll(): Promise<{ pairs: InterviewerPair[]; grades: InterviewerPairOptions['grades'] }> {
    try {
      const response = await api.get('/api/interviewer-pairs');
      return { pairs: response.data?.data || [], grades: response.data?.gradeCatalog || [] };
    } catch (error) {
      throw new Error(errorMessage(error, 'No fue posible cargar las parejas'));
    }
  },

  async getOptions(): Promise<InterviewerPairOptions> {
    try {
      const response = await api.get('/api/interviewer-pairs/options');
      return response.data?.data;
    } catch (error) {
      throw new Error(errorMessage(error, 'No fue posible cargar las opciones de pareja'));
    }
  },

  async create(payload: { cycleDirectorId: number; psychologistId: number; grades: string[] }): Promise<InterviewerPair> {
    try {
      const response = await api.post('/api/interviewer-pairs', payload);
      return response.data?.data;
    } catch (error) {
      throw new Error(errorMessage(error, 'No fue posible crear la pareja'));
    }
  },

  async revise(id: number, payload: { cycleDirectorId: number; psychologistId: number; grades: string[] }): Promise<InterviewerPair> {
    try {
      const response = await api.put(`/api/interviewer-pairs/${id}`, payload);
      return response.data?.data;
    } catch (error) {
      throw new Error(errorMessage(error, 'No fue posible actualizar la pareja'));
    }
  },

  async archive(id: number): Promise<void> {
    try {
      await api.patch(`/api/interviewer-pairs/${id}/archive`);
    } catch (error) {
      throw new Error(errorMessage(error, 'No fue posible archivar la pareja'));
    }
  },

  async getEligible(params: { applicationId: number; date?: string; time?: string; duration?: number }): Promise<EligiblePairsResult> {
    try {
      const response = await api.get('/api/interviewer-pairs/eligible', { params });
      return response.data?.data;
    } catch (error) {
      throw new Error(errorMessage(error, 'No fue posible validar las parejas elegibles'));
    }
  },
};

export default interviewerPairService;
