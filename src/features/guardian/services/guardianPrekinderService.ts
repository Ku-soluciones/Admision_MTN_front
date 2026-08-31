import api from '../../../packages/shared-ui/src/services/api';

export type GuardianPrekinderApplication = {
  applicationId: string;
  source: 'PREKINDER';
  rut: string;
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
  applicationDetails: {
    address?: { street?: string; number?: string; apartment?: string; commune?: string; region?: string; country?: string };
    currentSchool?: string;
    father?: { fullName?: string; rut?: string; email?: string; phone?: string; address?: string };
    mother?: { fullName?: string; rut?: string; email?: string; phone?: string; address?: string };
    supporter?: { fullName?: string; rut?: string; email?: string; phone?: string; relationship?: string };
    guardian?: { fullName?: string; rut?: string; email?: string; phone?: string; relationship?: string };
  };
  paymentRequired: boolean;
  paymentStatus: 'UNPAID' | 'PAYMENT_PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  paidAt?: string;
  canFillComplementaryForm: boolean;
  hasComplementaryForm: boolean;
  paymentAmount?: number;
  paymentCurrency?: string;
};

export type GuardianPrekinderPayment = {
  applicationId: string;
  source: 'PREKINDER';
  paymentRequired: boolean;
  paymentStatus: GuardianPrekinderApplication['paymentStatus'];
  paidAt?: string;
  canFillComplementaryForm: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
};

export const guardianPrekinderService = {
  async applications(): Promise<GuardianPrekinderApplication[]> {
    const response = await api.get('/v1/prekinder/me/applications');
    const data = response.data?.data || response.data || [];
    return Array.isArray(data) ? data : [];
  },

  async startPaymentCheckout(applicationId: string): Promise<GuardianPrekinderPayment> {
    const response = await api.post(`/v1/prekinder/applications/${applicationId}/payments/checkout`);
    return response.data?.data || response.data;
  },

  async getPaymentStatus(applicationId: string): Promise<GuardianPrekinderPayment> {
    const response = await api.get(`/v1/prekinder/applications/${applicationId}/payments/status`);
    return response.data?.data || response.data;
  },

  async getComplementaryForm(applicationId: string): Promise<any> {
    const response = await api.get(`/v1/prekinder/applications/${applicationId}/complementary-form`);
    return response.data?.data || response.data;
  },

  async saveComplementaryForm(applicationId: string, formData: any): Promise<any> {
    const response = await api.post(`/v1/prekinder/applications/${applicationId}/complementary-form`, formData);
    return response.data?.data || response.data;
  },

  async documents(applicationId: string): Promise<any[]> {
    const response = await api.get(`/v1/prekinder/applications/${applicationId}/documents`);
    const data = response.data?.data || response.data || [];
    return Array.isArray(data) ? data.map(document => ({
      id: document.documentId,
      documentType: document.category,
      originalName: document.category,
      created_at: document.createdAt,
    })) : [];
  },

  async viewDocument(documentId: string): Promise<Blob> {
    const response = await api.get(`/v1/prekinder/documents/${documentId}`, { responseType: 'blob' });
    return response.data;
  },
};
