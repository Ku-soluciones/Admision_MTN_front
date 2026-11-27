import assert from 'node:assert/strict';
import test from 'node:test';
import { composeParentFullName, normalizeAccountParentProfile, normalizeParentFormData, normalizeParentProfile, parentPayload, prekinderFamilyPrefillProcessFields, safeParentResumeStep } from './parentProfilePolicy.ts';

test('restaura el perfil separado entregado por el contrato nuevo', () => {
  assert.deepEqual(normalizeParentProfile({
    fullName: 'Ana María Pérez Soto',
    firstName: 'Ana María',
    paternalLastName: 'Pérez',
    maternalLastName: 'Soto',
    maritalStatus: 'MARRIED',
  }), {
    firstName: 'Ana María', paternalLastName: 'Pérez', maternalLastName: 'Soto',
    maritalStatus: 'MARRIED', fullName: 'Ana María Pérez Soto', legacyOnly: false,
  });
});

test('restaura sin perder un registro histórico que sólo tiene fullName', () => {
  assert.deepEqual(normalizeParentProfile({ fullName: 'Juan Carlos Pérez Soto' }), {
    firstName: 'Juan Carlos', paternalLastName: 'Pérez', maternalLastName: 'Soto',
    maritalStatus: '', fullName: 'Juan Carlos Pérez Soto', legacyOnly: true,
  });
});

test('envía campos separados y fullName derivado durante la transición', () => {
  const data = { firstName: 'Juan Carlos', paternalLastName: 'Pérez', maternalLastName: 'Soto', maritalStatus: 'SEPARATED' };
  assert.equal(composeParentFullName(data), 'Juan Carlos Pérez Soto');
  assert.deepEqual(parentPayload(data), { ...data, fullName: 'Juan Carlos Pérez Soto' });
});

test('migra un borrador histórico de ambos padres sin perder los demás campos', () => {
  const restored = normalizeParentFormData({
    parent1Name: 'Juan Carlos Pérez Soto',
    parent2Name: 'Ana María Díaz López',
    parent1BirthDate: '1980-01-01',
    applicationYear: '2028',
  });
  assert.equal(restored.parent1FirstName, 'Juan Carlos');
  assert.equal(restored.parent1PaternalLastName, 'Pérez');
  assert.equal(restored.parent2MaternalLastName, 'López');
  assert.equal(restored.parent1BirthDate, '1980-01-01');
  assert.equal(restored.applicationYear, '2028');
  assert.equal(restored.parentsSeparated, false);
});

test('separa los dos apellidos entregados juntos por la cuenta', () => {
  assert.deepEqual(normalizeAccountParentProfile('Juan Carlos', 'Pérez González'), {
    firstName: 'Juan Carlos', paternalLastName: 'Pérez', maternalLastName: 'González',
    maritalStatus: '', fullName: 'Juan Carlos Pérez González', legacyOnly: false,
  });
  assert.deepEqual(normalizeAccountParentProfile('Juan Carlos', 'Pérez'), {
    firstName: 'Juan Carlos', paternalLastName: 'Pérez', maternalLastName: '',
    maritalStatus: '', fullName: 'Juan Carlos Pérez', legacyOnly: false,
  });
});

test('reanuda un borrador avanzado en el primer perfil parental incompleto', () => {
  const completeFather = {
    parent1FirstName: 'Juan', parent1PaternalLastName: 'Pérez',
    parent1MaternalLastName: 'Soto', parent1MaritalStatus: 'MARRIED',
    parent1BirthDate: '1980-01-01',
  };
  assert.equal(safeParentResumeStep({ ...completeFather }, 7), 4);
  assert.equal(safeParentResumeStep({
    ...completeFather,
    parent2FirstName: 'Ana', parent2PaternalLastName: 'Díaz',
    parent2MaternalLastName: 'López', parent2MaritalStatus: 'SINGLE',
    parent2BirthDate: '1982-01-01',
  }, 7), 7);
});

test('reanuda en el padre si falta una fecha de nacimiento obligatoria', () => {
  assert.equal(safeParentResumeStep({
    parent1FirstName: 'Juan', parent1PaternalLastName: 'Pérez',
    parent1MaternalLastName: 'Soto', parent1MaritalStatus: 'MARRIED',
  }, 7), 3);
});

test('reanuda en el perfil parental cuando la fecha no es válida', () => {
  const complete = {
    parent1FirstName: 'Juan', parent1PaternalLastName: 'Pérez', parent1MaternalLastName: 'Soto',
    parent1MaritalStatus: 'MARRIED', parent1BirthDate: '2099-01-01',
    parent2FirstName: 'Ana', parent2PaternalLastName: 'Díaz', parent2MaternalLastName: 'López',
    parent2MaritalStatus: 'SINGLE', parent2BirthDate: '1982-01-01',
  };
  assert.equal(safeParentResumeStep(complete, 7, (date) => date !== '2099-01-01'), 3);
});

test('la precarga de otro hijo conserva los campos obligatorios del proceso PK', () => {
  assert.deepEqual(prekinderFamilyPrefillProcessFields({}, '', 'SIBLINGS'), {
    grade: 'PRE_KINDER', admissionPreference: 'NINGUNA', hasSiblingsInSchool: true,
  });
  assert.deepEqual(prekinderFamilyPrefillProcessFields({}, 'HIJO_EX_ALUMNO', 'STAFF_OR_ALUMNI'), {
    grade: 'PRE_KINDER', admissionPreference: 'HIJO_EX_ALUMNO', hasSiblingsInSchool: false,
  });
});
