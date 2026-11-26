import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizePrekinderDraftYear,
  resolveApplicationYearForFlow,
  resolvePrekinderAcademicContext,
  selectAvailablePrekinderOptions,
} from './prekinderProcessPolicy.ts';

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

test('muestra únicamente opciones PK cuya ventana está disponible', () => {
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
    selectAvailablePrekinderOptions(options, new Date('2026-11-26T12:00:00Z')).map((option) => option.processId),
    ['open'],
  );
});
