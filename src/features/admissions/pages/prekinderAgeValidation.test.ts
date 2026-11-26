import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePrekinderBirthDate } from './prekinderAgeValidation.ts';

const process2028 = {
  academicYear: 2028,
  ageReferenceDate: '2028-03-31',
  minimumAgeMonths: 48,
  maximumAgeMonths: 59,
};

test('acepta un postulante que cumple el rango configurado para PK 2028', () => {
  assert.deepEqual(
    validatePrekinderBirthDate('2024-03-31', process2028, '2026-11-26'),
    { valid: true, ageMonths: 48 },
  );
});

test('rechaza un postulante menor al mínimo configurado para PK 2028', () => {
  const result = validatePrekinderBirthDate('2024-04-01', process2028, '2026-11-26');
  assert.equal(result.valid, false);
  assert.equal(result.ageMonths, 47);
});

test('rechaza un postulante mayor al máximo configurado para PK 2028', () => {
  const result = validatePrekinderBirthDate('2023-03-31', process2028, '2026-11-26');
  assert.equal(result.valid, false);
  assert.equal(result.ageMonths, 60);
});

test('rechaza fechas futuras e imposibles', () => {
  assert.equal(validatePrekinderBirthDate('2027-01-01', process2028, '2026-11-26').valid, false);
  assert.equal(validatePrekinderBirthDate('2024-02-31', process2028, '2026-11-26').valid, false);
});
