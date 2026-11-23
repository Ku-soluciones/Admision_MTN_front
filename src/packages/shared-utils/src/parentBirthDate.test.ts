import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAdultBirthDate } from './parentBirthDate.ts';

const today = new Date(2026, 10, 23);

test('acepta una fecha válida y el límite exacto de 18 años', () => {
  assert.equal(validateAdultBirthDate('1985-07-09', today), null);
  assert.equal(validateAdultBirthDate('2008-11-23', today), null);
});

test('rechaza ausencia, fechas inexistentes, futuras y menores de 18', () => {
  assert.match(validateAdultBirthDate('', today) ?? '', /obligatoria/i);
  assert.match(validateAdultBirthDate('2026-02-30', today) ?? '', /válida/i);
  assert.match(validateAdultBirthDate('2026-11-24', today) ?? '', /futura/i);
  assert.match(validateAdultBirthDate('2008-11-24', today) ?? '', /18 años/i);
});
