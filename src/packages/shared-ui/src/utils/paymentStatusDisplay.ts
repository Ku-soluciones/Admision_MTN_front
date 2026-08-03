export type AdmissionPaymentStatus =
  | 'UNPAID'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED';

export type PaymentStatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface PaymentStatusDisplay {
  label: string;
  detail: string;
  tone: PaymentStatusTone;
}

const formatPaidDate = (paidAt: unknown): string | null => {
  if (typeof paidAt !== 'string' || !paidAt.trim()) return null;
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export const formatPaymentStatusCheckedTime = (checkedAt: unknown): string | null => {
  if (typeof checkedAt !== 'string' || !checkedAt.trim()) return null;
  const date = new Date(checkedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getPaymentStatusDisplay = (
  status: unknown,
  paymentRequired: unknown,
  paidAt?: unknown
): PaymentStatusDisplay => {
  if (paymentRequired === false) {
    return {
      label: 'No requiere pago',
      detail: 'Esta postulación está exenta del pago de admisión.',
      tone: 'info'
    };
  }

  const normalized = String(status ?? '').trim().toUpperCase() as AdmissionPaymentStatus;
  switch (normalized) {
    case 'PAID': {
      const paidDate = formatPaidDate(paidAt);
      return {
        label: 'Pagado',
        detail: paidDate ? `Pago confirmado el ${paidDate}.` : 'Pago confirmado.',
        tone: 'success'
      };
    }
    case 'PAYMENT_PENDING':
      return {
        label: 'Pago pendiente',
        detail: 'El cobro fue iniciado, pero el pago aún no está confirmado.',
        tone: 'warning'
      };
    case 'FAILED':
      return {
        label: 'Pago fallido',
        detail: 'El último intento de pago no pudo completarse.',
        tone: 'error'
      };
    case 'EXPIRED':
      return {
        label: 'Pago vencido',
        detail: 'El plazo del cobro terminó sin confirmación de pago.',
        tone: 'error'
      };
    case 'UNPAID':
      return {
        label: 'No pagado',
        detail: 'La familia todavía no ha iniciado o completado el pago.',
        tone: 'neutral'
      };
    default:
      return {
        label: 'Sin información',
        detail: 'No hay un estado de pago disponible para esta postulación.',
        tone: 'neutral'
      };
  }
};
