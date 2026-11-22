/**
 * Edad en meses completos entre dos fechas ISO (YYYY-MM-DD), con la misma regla que el backend
 * (`ChronoUnit.MONTHS.between`): si el día de referencia es menor al de nacimiento, falta un mes.
 */
export function ageInMonths(birthDate: string, referenceDate?: string | null): number {
  const parts = (value: string) => value.slice(0, 10).split("-").map(Number);
  const [by, bm, bd] = parts(birthDate);
  const ref = referenceDate ? parts(referenceDate) : parts(new Date().toISOString());
  const [ry, rm, rd] = ref;
  if (![by, bm, bd, ry, rm, rd].every(Number.isFinite)) return 0;
  let months = (ry - by) * 12 + rm - bm;
  if (rd < bd) months--;
  return Math.max(0, months);
}
