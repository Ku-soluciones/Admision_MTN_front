import api from '../../../packages/shared-ui/src/services/api';

export type GuardianPrekinderApplication = {
  applicationId: string;
  source: 'PREKINDER';
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  gradeApplied: string;
  processName: string;
  academicYear: number;
  status: string;
  eligibilityStatus: string;
  submissionDate: string;
};

export const guardianPrekinderService = {
  async applications(): Promise<GuardianPrekinderApplication[]> {
    const response = await api.get('/v1/prekinder/me/applications');
    const data = response.data?.data || response.data || [];
    return Array.isArray(data) ? data : [];
  },
};
