export type DraftValidation = {
  valid: boolean;
  complete: boolean;
  errors: string[];
};

type SeatDraft = {
  totalSeats: number;
  maleSeats: number;
  femaleSeats: number;
};

export function validateSeatDraft(input: SeatDraft): DraftValidation {
  const errors: string[] = [];
  const values = [input.totalSeats, input.maleSeats, input.femaleSeats];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    errors.push('Los cupos deben ser números enteros no negativos.');
  }
  const allocated = input.maleSeats + input.femaleSeats;
  if (input.totalSeats === 0 && allocated > 0) {
    errors.push('Indica el total de cupos antes de distribuirlos.');
  } else if (input.totalSeats > 0 && allocated > 0 && allocated !== input.totalSeats) {
    errors.push('La suma de cupos masculinos y femeninos debe coincidir con el total.');
  }
  return {
    valid: errors.length === 0,
    complete: errors.length === 0 && input.totalSeats > 0 && allocated === input.totalSeats,
    errors,
  };
}

type AgeDocumentDraft = {
  minimumAgeMonths: number;
  maximumAgeMonths: number;
  ageReferenceDate: string | null;
  requiredDocuments: string[];
};

export function validateAgeDocumentDraft(input: AgeDocumentDraft): DraftValidation {
  const errors: string[] = [];
  if (input.minimumAgeMonths !== 0 && (!Number.isInteger(input.minimumAgeMonths) || input.minimumAgeMonths < 36 || input.minimumAgeMonths > 84)) {
    errors.push('La edad mínima debe estar entre 36 y 84 meses.');
  }
  if (input.maximumAgeMonths !== 0 && (!Number.isInteger(input.maximumAgeMonths) || input.maximumAgeMonths < 36 || input.maximumAgeMonths > 96)) {
    errors.push('La edad máxima debe estar entre 36 y 96 meses.');
  }
  if (input.minimumAgeMonths > 0 && input.maximumAgeMonths > 0 && input.minimumAgeMonths > input.maximumAgeMonths) {
    errors.push('La edad mínima no puede superar la edad máxima.');
  }
  const hasRange = input.minimumAgeMonths > 0 && input.maximumAgeMonths > 0;
  const hasBirthCertificate = input.requiredDocuments.includes('BIRTH_CERTIFICATE');
  const hasReferenceDate = Boolean(input.ageReferenceDate);
  return {
    valid: errors.length === 0,
    complete: errors.length === 0 && hasRange && hasBirthCertificate && hasReferenceDate,
    errors,
  };
}

export function validatePublishedAgeDocuments(input: AgeDocumentDraft): string[] {
  const validation = validateAgeDocumentDraft(input);
  const errors = [...validation.errors];
  if (input.minimumAgeMonths === 0) errors.push('La edad mínima es obligatoria.');
  if (input.maximumAgeMonths === 0) errors.push('La edad máxima es obligatoria.');
  if (!input.ageReferenceDate) errors.push('La fecha de referencia de edad es obligatoria.');
  if (!input.requiredDocuments.includes('BIRTH_CERTIFICATE')) errors.push('El Certificado de Nacimiento es obligatorio.');
  return errors;
}

export function validateOptionalIncorporationFee(
  amount: number | null,
  glosa: string,
): { valid: boolean; errors: string[] } {
  if (amount == null) return { valid: true, errors: [] };
  const errors: string[] = [];
  if (!Number.isFinite(amount) || amount <= 0) errors.push('El arancel debe ser mayor que cero.');
  if (!glosa.trim()) errors.push('Agrega una glosa para el arancel informado.');
  return { valid: errors.length === 0, errors };
}

export type PublicationWindow = {
  valid: boolean;
  startsAt?: string;
  endsAt?: string;
  error?: string;
};

export function toIsoPublicationWindow(startsAt: string, endsAt: string): PublicationWindow {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (!startsAt || !endsAt || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, error: 'Indica fechas de apertura y cierre válidas.' };
  }
  if (end.getTime() <= start.getTime()) {
    return { valid: false, error: 'La fecha de cierre debe ser posterior a la apertura.' };
  }
  return { valid: true, startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export type SetupStepStatus = 'SAVED' | 'PENDING' | 'REQUIRED' | 'INVALID';

export function canAccessDraftProcessSection(section: string): boolean {
  return ['Resumen', 'Salas', 'Profesionales'].includes(section);
}

export function belongsToSelectedProcess(
  resource: { processId: string } | null,
  selectedProcessId: string,
): boolean {
  return Boolean(resource && selectedProcessId && resource.processId === selectedProcessId);
}

export function getSetupStepStatus(input: {
  valid: boolean;
  complete: boolean;
  saved: boolean;
  blocking: boolean;
}): SetupStepStatus {
  if (!input.valid) return 'INVALID';
  if (input.complete && input.saved) return 'SAVED';
  return input.blocking && !input.complete ? 'REQUIRED' : 'PENDING';
}
