import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAccessApplicationForm,
  resolveNewApplicationsOpen,
} from './admissionAvailability.ts';

test('abre nuevas postulaciones solamente con el valor explícito true', () => {
  assert.equal(resolveNewApplicationsOpen('true'), true);
  assert.equal(resolveNewApplicationsOpen('TRUE'), true);
  assert.equal(resolveNewApplicationsOpen(' true '), true);

  for (const value of [undefined, null, '', 'false', '1', 'yes']) {
    assert.equal(resolveNewApplicationsOpen(value), false);
  }
});

test('permite editar una postulación existente aunque el proceso esté cerrado', () => {
  assert.equal(canAccessApplicationForm({ newApplicationsOpen: false, editMode: true }), true);
  assert.equal(canAccessApplicationForm({ newApplicationsOpen: false, editMode: false }), false);
  assert.equal(canAccessApplicationForm({ newApplicationsOpen: true, editMode: false }), true);
});
