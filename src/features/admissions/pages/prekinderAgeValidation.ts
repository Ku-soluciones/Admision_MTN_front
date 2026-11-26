export type PrekinderAgeConfiguration = {
  academicYear: number;
  ageReferenceDate?: string | null;
  minimumAgeMonths: number;
  maximumAgeMonths?: number | null;
};

export type PrekinderBirthDateValidation = {
  valid: boolean;
  ageMonths?: number;
  message?: string;
};

function parseIsoDate(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parts = match.slice(1).map(Number) as [number, number, number];
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return parts;
}

export function validatePrekinderBirthDate(
  birthDate: string,
  configuration: PrekinderAgeConfiguration,
  todayDate: string,
): PrekinderBirthDateValidation {
  const referenceDate = configuration.ageReferenceDate || `${configuration.academicYear}-03-31`;
  const birth = parseIsoDate(birthDate);
  const reference = parseIsoDate(referenceDate);
  const today = parseIsoDate(todayDate);
  if (!birth || !reference || !today) {
    return { valid: false, message: 'Esta fecha no es válida. Revisa el día, mes y año.' };
  }
  if (birthDate > todayDate) {
    return { valid: false, message: 'La fecha de nacimiento no puede ser posterior a hoy.' };
  }

  const [birthYear, birthMonth, birthDay] = birth;
  const [referenceYear, referenceMonth, referenceDay] = reference;
  let ageMonths = (referenceYear - birthYear) * 12 + referenceMonth - birthMonth;
  if (referenceDay < birthDay) ageMonths--;

  if (ageMonths < configuration.minimumAgeMonths) {
    return {
      valid: false,
      ageMonths,
      message: `No cumple la edad mínima de ${configuration.minimumAgeMonths} meses para el proceso ${configuration.academicYear}.`,
    };
  }
  if (configuration.maximumAgeMonths != null && ageMonths > configuration.maximumAgeMonths) {
    return {
      valid: false,
      ageMonths,
      message: `Supera la edad máxima de ${configuration.maximumAgeMonths} meses para el proceso ${configuration.academicYear}.`,
    };
  }
  return { valid: true, ageMonths };
}
