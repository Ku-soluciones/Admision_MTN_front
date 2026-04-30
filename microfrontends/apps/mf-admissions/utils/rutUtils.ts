/**
 * Utilidades para validación y formato de RUT chileno
 */

/**
 * Valida si un RUT tiene el formato y dígito verificador correcto
 * @param rut RUT en formato 12345678-9, 12.345.678-9 o 123456789
 * @returns true si el RUT es válido
 */
export function isValidRut(rut: string): boolean {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  // Limpiar el RUT (quitar puntos, guiones y espacios)
  const cleanRut = rut.replace(/[.\-\s]/g, '').toUpperCase();

  if (cleanRut.length < 2) {
    return false;
  }

  // Separar número y dígito verificador
  const rutNumber = cleanRut.slice(0, -1);
  const verificationDigit = cleanRut.slice(-1);

  // Validar que el número solo contenga dígitos
  if (!/^\d+$/.test(rutNumber)) {
    return false;
  }

  // Calcular dígito verificador
  const calculatedDigit = calculateVerificationDigit(rutNumber);

  return verificationDigit === calculatedDigit;
}

/**
 * Calcula el dígito verificador de un RUT
 * @param rutNumber número del RUT sin dígito verificador
 * @returns dígito verificador calculado
 */
export function calculateVerificationDigit(rutNumber: string): string {
  let sum = 0;
  let multiplier = 2;

  // Recorrer de derecha a izquierda
  for (let i = rutNumber.length - 1; i >= 0; i--) {
    sum += parseInt(rutNumber[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const result = 11 - remainder;

  if (result === 11) {
    return '0';
  } else if (result === 10) {
    return 'K';
  } else {
    return result.toString();
  }
}

/**
 * Formatea un RUT al formato estándar 12.345.678-9
 * @param rut RUT sin formato
 * @returns RUT formateado
 */
export function formatRut(rut: string): string {
  if (!rut || typeof rut !== 'string') {
    return rut;
  }

  // Limpiar el RUT
  const cleanRut = rut.replace(/[.\-\s]/g, '').toUpperCase();

  if (cleanRut.length < 2) {
    return rut;
  }

  // Separar número y dígito verificador
  const rutNumber = cleanRut.slice(0, -1);
  const verificationDigit = cleanRut.slice(-1);

  // Formatear con puntos
  let formattedNumber = '';
  for (let i = rutNumber.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) {
      formattedNumber = '.' + formattedNumber;
    }
    formattedNumber = rutNumber[i] + formattedNumber;
  }

  return `${formattedNumber}-${verificationDigit}`;
}

/**
 * Limpia un RUT removiendo puntos, guiones y espacios
 * @param rut RUT con formato
 * @returns RUT limpio
 */
export function cleanRut(rut: string): string {
  if (!rut || typeof rut !== 'string') {
    return rut;
  }
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

/**
 * Valida y formatea un RUT
 * @param rut RUT a validar y formatear
 * @returns RUT formateado si es válido, null si es inválido
 */
export function validateAndFormatRut(rut: string): string | null {
  if (isValidRut(rut)) {
    return formatRut(rut);
  }
  return null;
}

/**
 * Formatea RUT mientras se escribe (para inputs)
 * @param value valor actual del input
 * @returns valor formateado progresivamente
 */
export function formatRutInput(value: string): string {
  if (!value) return value;

  // Remover todo excepto números y K
  const cleaned = value.replace(/[^0-9Kk]/g, '').toUpperCase();
  
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned;

  // Separar número y dígito verificador
  const number = cleaned.slice(0, -1);
  const digit = cleaned.slice(-1);

  // Formatear número con puntos
  let formattedNumber = '';
  for (let i = number.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) {
      formattedNumber = '.' + formattedNumber;
    }
    formattedNumber = number[i] + formattedNumber;
  }

  // Agregar guión si hay dígito verificador
  return digit ? `${formattedNumber}-${digit}` : formattedNumber;
}

/**
 * Genera ejemplos de RUTs válidos para testing
 */
export const RUT_EXAMPLES = [
  '12.345.678-5',
  '9.876.543-2',
  '11.111.111-1',
  '22.222.222-K'
];

/**
 * Mensajes de error estándar
 */
export const RUT_ERROR_MESSAGES = {
  REQUIRED: 'El RUT es obligatorio',
  INVALID_FORMAT: 'El formato del RUT no es válido',
  INVALID_DIGIT: 'El dígito verificador del RUT no es correcto',
  INVALID: 'El RUT no es válido'
};