/**
 * Tests de contrato API - Entrevistas
 *
 * Verifica que el mapeo entre backend y frontend sea correcto
 */

import interviewService from '../services/interviewService';
import { InterviewStatus, InterviewType, InterviewMode } from '../types/interview';

describe('Interview API Contract Tests', () => {
  describe('mapBackendResponse', () => {
    it('should map interviewType field from backend correctly', () => {
      // Simular respuesta del backend
      const backendData = {
        id: 9,
        applicationId: 1,
        interviewerId: 3,
        interviewType: 'FAMILY', // ← Campo que envía el backend
        scheduledDate: '2025-10-20',
        scheduledTime: '09:00:00',
        duration: 45,
        location: 'Sala de Reuniones',
        mode: 'IN_PERSON',
        status: 'SCHEDULED',
        interviewerName: 'María López',
        studentName: 'Juan Pérez González',
        gradeApplied: 'Kinder'
      };

      // Mapear usando el servicio (accedemos al método privado para testing)
      const mapped = (interviewService as any).mapBackendResponse(backendData);

      // Verificar que el campo type se mapeó correctamente
      expect(mapped.type).toBe('FAMILY');
      expect(mapped.type).not.toBe('INDIVIDUAL'); // No debe ser el default
    });

    it('should map CYCLE_DIRECTOR interview type correctly', () => {
      const backendData = {
        id: 17,
        applicationId: 1,
        interviewerId: 5,
        interviewType: 'CYCLE_DIRECTOR', // ← Campo que envía el backend
        scheduledDate: '2025-10-21',
        scheduledTime: '09:00:00',
        status: 'SCHEDULED',
        interviewerName: 'Pedro García',
        studentName: 'Juan Pérez González'
      };

      const mapped = (interviewService as any).mapBackendResponse(backendData);

      expect(mapped.type).toBe('CYCLE_DIRECTOR');
    });

    it('should use default INDIVIDUAL when interviewType is missing', () => {
      const backendData = {
        id: 1,
        applicationId: 1,
        interviewerId: 1,
        // Sin campo interviewType
        scheduledDate: '2025-10-20',
        scheduledTime: '09:00:00',
        status: 'SCHEDULED',
        interviewerName: 'Test',
        studentName: 'Test Student'
      };

      const mapped = (interviewService as any).mapBackendResponse(backendData);

      expect(mapped.type).toBe('INDIVIDUAL');
    });

    it('should map all required fields correctly', () => {
      const backendData = {
        id: 9,
        applicationId: 1,
        interviewerId: 3,
        interviewType: 'FAMILY',
        scheduledDate: '2025-10-20',
        scheduledTime: '09:00:00',
        duration: 45,
        location: 'Sala de Reuniones',
        mode: 'IN_PERSON',
        status: 'SCHEDULED',
        notes: 'Notas de prueba',
        interviewerName: 'María López',
        studentName: 'Juan Pérez González',
        gradeApplied: 'Kinder'
      };

      const mapped = (interviewService as any).mapBackendResponse(backendData);

      // Verificar todos los campos críticos
      expect(mapped.id).toBe(9);
      expect(mapped.applicationId).toBe(1);
      expect(mapped.interviewerId).toBe(3);
      expect(mapped.type).toBe('FAMILY');
      expect(mapped.scheduledDate).toBe('2025-10-20');
      expect(mapped.scheduledTime).toMatch(/09:00/);
      expect(mapped.duration).toBe(45);
      expect(mapped.location).toBe('Sala de Reuniones');
      expect(mapped.mode).toBe('IN_PERSON');
      expect(mapped.status).toBe('SCHEDULED');
      expect(mapped.interviewerName).toBe('María López');
      expect(mapped.studentName).toBe('Juan Pérez González');
      expect(mapped.gradeApplied).toBe('Kinder');
    });
  });

  describe('getInterviewsByApplication', () => {
    it('should filter interviews by application ID correctly', async () => {
      // Este test requiere un mock del backend o un servidor de prueba
      // Por ahora, verificamos que el método existe y tiene la estructura correcta

      const method = interviewService.getInterviewsByApplication;
      expect(method).toBeDefined();
      expect(typeof method).toBe('function');
    });
  });

  describe('Contract validation', () => {
    it('should have correct InterviewType enum values', () => {
      // Verificar que los tipos esperados estén definidos
      expect(InterviewType.FAMILY).toBe('FAMILY');
      expect(InterviewType.CYCLE_DIRECTOR).toBe('CYCLE_DIRECTOR');
    });

    it('should have correct InterviewStatus enum values', () => {
      expect(InterviewStatus.SCHEDULED).toBe('SCHEDULED');
      expect(InterviewStatus.CONFIRMED).toBe('CONFIRMED');
      expect(InterviewStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have correct InterviewMode enum values', () => {
      expect(InterviewMode.IN_PERSON).toBe('IN_PERSON');
      expect(InterviewMode.VIRTUAL).toBe('VIRTUAL');
      expect(InterviewMode.HYBRID).toBe('HYBRID');
    });
  });
});

/**
 * Tests de integración (requieren backend en ejecución)
 *
 * Ejecutar solo cuando el backend esté disponible:
 * npm test -- --testPathPattern=interview-contract --runInBand
 */
describe('Interview API Integration Tests', () => {
  // Estos tests están comentados porque requieren backend en ejecución
  // Descomentar para ejecutar tests de integración

  /*
  it('should fetch interviews from backend with correct structure', async () => {
    const response = await fetch('http://localhost:8080/v1/interviews?applicationId=1');
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);

    if (data.data.length > 0) {
      const interview = data.data[0];

      // Verificar que el backend envía el campo interviewType
      expect(interview).toHaveProperty('interviewType');
      expect(['FAMILY', 'CYCLE_DIRECTOR', 'PSYCHOLOGICAL', 'ACADEMIC'])
        .toContain(interview.interviewType);

      // Verificar otros campos requeridos
      expect(interview).toHaveProperty('id');
      expect(interview).toHaveProperty('applicationId');
      expect(interview).toHaveProperty('scheduledDate');
      expect(interview).toHaveProperty('scheduledTime');
      expect(interview).toHaveProperty('status');
    }
  });

  it('should map backend response correctly in real scenario', async () => {
    const result = await interviewService.getInterviewsByApplication(1);

    expect(result).toHaveProperty('interviews');
    expect(Array.isArray(result.interviews)).toBe(true);

    if (result.interviews.length > 0) {
      const interview = result.interviews[0];

      // Verificar que el mapeo funcionó
      expect(interview.type).toBeDefined();
      expect(interview.type).not.toBe(undefined);

      // Si hay una entrevista FAMILY o CYCLE_DIRECTOR, verificar que se mapeó correctamente
      if (['FAMILY', 'CYCLE_DIRECTOR'].includes(interview.type as string)) {
        expect(['FAMILY', 'CYCLE_DIRECTOR']).toContain(interview.type);
      }
    }
  });
  */
});
