function parseCalendarDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  return candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day
    ? { year, month, day }
    : null;
}

export function validateAdultBirthDate(value: string, today = new Date()): string | null {
  if (!value) return 'La fecha de nacimiento es obligatoria';
  const parsed = parseCalendarDate(value);
  if (!parsed) return 'Ingresa una fecha de nacimiento válida';
  const todayNumeric = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const birthNumeric = parsed.year * 10000 + parsed.month * 100 + parsed.day;
  if (birthNumeric > todayNumeric) return 'La fecha de nacimiento no puede ser futura';
  const eighteenthBirthday = (parsed.year + 18) * 10000 + parsed.month * 100 + parsed.day;
  if (eighteenthBirthday > todayNumeric) return 'El padre o la madre debe tener al menos 18 años';
  return null;
}
