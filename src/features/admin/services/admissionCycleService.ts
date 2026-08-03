import api from './api';

export type AdmissionCycleStatus = 'OPEN' | 'PUBLISHING' | 'CLOSED' | 'CLOSED_WITH_ERRORS';

export interface AdmissionCycleSnapshot {
  id: number;
  academicYear: number;
  status: AdmissionCycleStatus;
  confirmationPhrase: string;
  enabled: boolean;
  dispatchEnabled: boolean;
  deliveryReady: boolean;
  emailMockMode: boolean;
  totalApplications: number;
  pendingDecisions: number;
  missingGuardians: number;
  invalidGuardianEmails: number;
  missingAcademicYear: number;
  queued: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  unknown: number;
  canClose: boolean;
  idempotent: boolean;
}

interface AdmissionCycleResponse {
  success: boolean;
  message?: string;
  data: AdmissionCycleSnapshot;
}

const unwrap = (response: { data: AdmissionCycleResponse }): AdmissionCycleSnapshot => response.data.data;

export const admissionCycleService = {
  async getCurrent(): Promise<AdmissionCycleSnapshot> {
    return unwrap(await api.get<AdmissionCycleResponse>('/v1/admission-cycles/current'));
  },

  async close(academicYear: number, confirmationText: string): Promise<AdmissionCycleSnapshot> {
    return unwrap(await api.post<AdmissionCycleResponse>(
      `/v1/admission-cycles/${academicYear}/close`,
      { confirmationText }
    ));
  },

  async retryFailed(academicYear: number): Promise<AdmissionCycleSnapshot> {
    return unwrap(await api.post<AdmissionCycleResponse>(
      `/v1/admission-cycles/${academicYear}/retry-failed`
    ));
  }
};
