import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDateInTimeZone,
  normalizePrekinderDraftYear,
  pickPrekinderOption,
  resolveApplicationYearForFlow,
  resolvePrekinderAcademicContext,
  selectAvailablePrekinderOptions,
} from './prekinderProcessPolicy.ts';

test('obtiene el día calendario de Chile aunque UTC ya esté en el día siguiente', () => {
  assert.equal(
    formatDateInTimeZone(new Date('2026-11-27T01:30:00Z'), 'America/Santiago'),
    '2026-11-26',
  );
});

test('usa el año y la fecha de referencia del proceso PK 2028', () => {
  assert.deepEqual(
    resolvePrekinderAcademicContext({ academicYear: 2028, ageReferenceDate: '2028-03-31' }),
    { applicationYear: '2028', ageReferenceDate: '2028-03-31' },
  );
});

test('deriva el 31 de marzo del año académico cuando falta la referencia', () => {
  assert.deepEqual(
    resolvePrekinderAcademicContext({ academicYear: 2028, ageReferenceDate: null }),
    { applicationYear: '2028', ageReferenceDate: '2028-03-31' },
  );
});

test('normaliza un borrador antiguo al año del proceso sin perder sus datos', () => {
  assert.deepEqual(
    normalizePrekinderDraftYear({ applicationYear: '2027', firstName: 'ANA' }, 2028),
    { applicationYear: '2028', firstName: 'ANA' },
  );
});

test('solo reemplaza el año por el proceso en el flujo PK', () => {
  assert.equal(resolveApplicationYearForFlow(true, 2028, '2027'), '2028');
  assert.equal(resolveApplicationYearForFlow(false, 2028, '2027'), '2027');
});

test('confía en la disponibilidad resuelta por el backend sin usar el reloj del navegador', () => {
  const base = {
    academicYear: 2028, name: 'PK 2028', waveId: 'wave', waveType: 'NEW_FAMILIES' as const,
    ageReferenceDate: '2028-03-31', minimumAgeMonths: 48, maximumAgeMonths: 59,
    requiredDocuments: [],
  };
  const options = [
    { ...base, processId: 'open', opensAt: '2026-10-01T00:00:00Z', closesAt: '2026-12-31T23:59:59Z' },
    { ...base, processId: 'closed', opensAt: '2026-08-01T00:00:00Z', closesAt: '2026-09-01T00:00:00Z' },
    { ...base, processId: 'future', opensAt: '2027-01-01T00:00:00Z', closesAt: '2027-02-01T00:00:00Z' },
  ];
  assert.deepEqual(
    selectAvailablePrekinderOptions(options).map((option) => option.processId),
    ['open', 'closed', 'future'],
  );
});

test('elige de forma determinista el proceso del mayor año y la apertura más reciente', () => {
  const base = {
    name: 'PK', waveId: 'wave', waveType: 'NEW_FAMILIES' as const,
    ageReferenceDate: '2028-03-31', minimumAgeMonths: 48, maximumAgeMonths: 59,
    requiredDocuments: [], closesAt: '2026-12-31T23:59:59Z',
  };
  const options = [
    { ...base, processId: 'pk-2028-old', academicYear: 2028, opensAt: '2026-09-01T00:00:00Z' },
    { ...base, processId: 'pk-2027', academicYear: 2027, opensAt: '2026-11-01T00:00:00Z' },
    { ...base, processId: 'pk-2028-new', academicYear: 2028, opensAt: '2026-10-01T00:00:00Z' },
  ];

  assert.equal(pickPrekinderOption(options)?.processId, 'pk-2028-new');
  assert.equal(pickPrekinderOption([...options].reverse())?.processId, 'pk-2028-new');
});
