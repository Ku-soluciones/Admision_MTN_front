import { useEffect, useState } from 'react';
import api from '../services/api';
import type { AdmissionPaymentStatus } from '../utils/paymentStatusDisplay';

export interface ApplicationPaymentStatusSnapshot {
  applicationId: number;
  paymentRequired: boolean;
  paymentStatus: AdmissionPaymentStatus;
  paidAt?: string;
  canFillComplementaryForm: boolean;
  paymentId?: number;
  checkoutUrl?: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
  providerInvoiceId?: string;
  providerStatus?: string;
  lastStatusCheckedAt?: string;
}

export type PaymentStatusSyncState = 'idle' | 'loading' | 'success' | 'error';

const inFlightRequests = new Map<string, Promise<ApplicationPaymentStatusSnapshot>>();

const requestPaymentStatus = (applicationId: number | string) => {
  const key = String(applicationId);
  const existingRequest = inFlightRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = api
    .get(`/v1/payments/applications/${encodeURIComponent(key)}/status`)
    .then((response) => (response.data?.data || response.data) as ApplicationPaymentStatusSnapshot)
    .finally(() => inFlightRequests.delete(key));

  inFlightRequests.set(key, request);
  return request;
};

export const useApplicationPaymentStatus = (
  applicationId: number | string | null | undefined,
  enabled: boolean
) => {
  const [data, setData] = useState<ApplicationPaymentStatusSnapshot | null>(null);
  const [state, setState] = useState<PaymentStatusSyncState>('idle');

  useEffect(() => {
    if (!enabled || applicationId === null || applicationId === undefined) {
      setData(null);
      setState('idle');
      return;
    }

    let active = true;
    setData(null);
    setState('loading');

    void requestPaymentStatus(applicationId)
      .then((snapshot) => {
        if (!active) return;
        setData(snapshot);
        setState('success');
      })
      .catch(() => {
        if (!active) return;
        setState('error');
      });

    return () => {
      active = false;
    };
  }, [applicationId, enabled]);

  return { data, state };
};
