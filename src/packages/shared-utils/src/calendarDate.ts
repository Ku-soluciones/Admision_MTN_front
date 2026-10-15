/** Formatea una fecha civil ISO conservando su día, sin conversión de zona horaria. */
export function formatCalendarDate(value?: string | null): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!match) return 'Fecha no disponible';

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) return 'Fecha no disponible';

  return `${day}/${month}/${year}`;
}
