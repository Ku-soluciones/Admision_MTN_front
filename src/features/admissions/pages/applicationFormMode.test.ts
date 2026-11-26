import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveApplicationEditMode } from './applicationFormMode.ts';

test('mantiene el formulario en creación cuando no existe estado de navegación', () => {
  assert.equal(resolveApplicationEditMode(undefined), false);
});

test('activa edición sólo cuando existe el identificador de la postulación', () => {
  assert.equal(resolveApplicationEditMode({ editMode: true, applicationId: 42 }), true);
});

test('no activa edición cuando falta el identificador de la postulación', () => {
  assert.equal(resolveApplicationEditMode({ editMode: true }), false);
});
