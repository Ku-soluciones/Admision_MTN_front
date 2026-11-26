import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSetupStepStatus,
  toIsoPublicationWindow,
  canAccessDraftProcessSection,
  validateAgeDocumentDraft,
  validateOptionalIncorporationFee,
  validateSeatDraft,
} from './processSetupPolicy.ts';

test('permite guardar cupos incompletos no negativos y sólo marca completo cuando cuadran', () => {
  assert.deepEqual(validateSeatDraft({ totalSeats: 0, maleSeats: 0, femaleSeats: 0 }), {
    valid: true, complete: false, errors: [],
  });
  assert.deepEqual(validateSeatDraft({ totalSeats: 30, maleSeats: 0, femaleSeats: 0 }), {
    valid: true, complete: false, errors: [],
  });
  assert.deepEqual(validateSeatDraft({ totalSeats: 30, maleSeats: 15, femaleSeats: 15 }), {
    valid: true, complete: true, errors: [],
  });
});

test('rechaza cupos negativos y una distribución informada que no coincide con el total', () => {
  assert.equal(validateSeatDraft({ totalSeats: -1, maleSeats: 0, femaleSeats: 0 }).valid, false);
  assert.equal(validateSeatDraft({ totalSeats: 30, maleSeats: 10, femaleSeats: 10 }).valid, false);
});

test('permite edad y documentos pendientes pero valida el rango informado', () => {
  assert.deepEqual(validateAgeDocumentDraft({ minimumAgeMonths: 0, maximumAgeMonths: 0, ageReferenceDate: null, requiredDocuments: [] }), {
    valid: true, complete: false, errors: [],
  });
  assert.equal(validateAgeDocumentDraft({ minimumAgeMonths: 60, maximumAgeMonths: 48, ageReferenceDate: '2029-03-31', requiredDocuments: ['BIRTH_CERTIFICATE'] }).valid, false);
  assert.equal(validateAgeDocumentDraft({ minimumAgeMonths: 48, maximumAgeMonths: 59, ageReferenceDate: '2029-03-31', requiredDocuments: [] }).complete, false);
  assert.equal(validateAgeDocumentDraft({ minimumAgeMonths: 48, maximumAgeMonths: 59, ageReferenceDate: null, requiredDocuments: ['BIRTH_CERTIFICATE'] }).complete, false);
  assert.equal(validateAgeDocumentDraft({ minimumAgeMonths: 48, maximumAgeMonths: 59, ageReferenceDate: '2029-03-31', requiredDocuments: ['BIRTH_CERTIFICATE'] }).complete, true);
});

test('acepta arancel vacío y exige monto positivo con glosa cuando se informa', () => {
  assert.deepEqual(validateOptionalIncorporationFee(null, ''), { valid: true, errors: [] });
  assert.equal(validateOptionalIncorporationFee(0, 'Matrícula').valid, false);
  assert.equal(validateOptionalIncorporationFee(150000, '').valid, false);
  assert.deepEqual(validateOptionalIncorporationFee(150000, 'Arancel de incorporación'), { valid: true, errors: [] });
});

test('convierte la ventana del proceso seleccionado a ISO sin depender del año académico', () => {
  const result = toIsoPublicationWindow('2029-10-01T09:00', '2029-12-15T18:00');
  assert.equal(result.valid, true);
  assert.match(result.startsAt || '', /^2029-10-01T/);
  assert.match(result.endsAt || '', /^2029-12-15T/);
  assert.equal(toIsoPublicationWindow('2029-12-15T18:00', '2029-10-01T09:00').valid, false);
});

test('distingue guardado, pendiente, requerido e inválido', () => {
  assert.equal(getSetupStepStatus({ valid: true, complete: true, saved: true, blocking: true }), 'SAVED');
  assert.equal(getSetupStepStatus({ valid: true, complete: false, saved: false, blocking: false }), 'PENDING');
  assert.equal(getSetupStepStatus({ valid: true, complete: false, saved: false, blocking: true }), 'REQUIRED');
  assert.equal(getSetupStepStatus({ valid: false, complete: false, saved: false, blocking: true }), 'INVALID');
});

test('mantiene accesibles el asistente, salas y profesionales durante el borrador', () => {
  assert.equal(canAccessDraftProcessSection('Resumen'), true);
  assert.equal(canAccessDraftProcessSection('Salas'), true);
  assert.equal(canAccessDraftProcessSection('Profesionales'), true);
  assert.equal(canAccessDraftProcessSection('Postulaciones'), false);
});
