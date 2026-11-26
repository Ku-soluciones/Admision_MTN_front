import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldApplyBootstrapResult, shouldClearAfterBootstrapFailure } from './bootstrapRacePolicy.ts';

test('limpia el estado cuando nadie restauró una sesión durante el refresh', () => {
  const stateAtStart = { accessToken: null };
  assert.equal(shouldClearAfterBootstrapFailure(stateAtStart, stateAtStart), true);
});

test('preserva una sesión creada por Firebase mientras el refresh estaba pendiente', () => {
  const stateAtStart = { accessToken: null };
  const firebaseSession = { accessToken: 'bff-token-from-firebase' };
  assert.equal(shouldClearAfterBootstrapFailure(stateAtStart, firebaseSession), false);
});

test('descarta una respuesta tardía de refresh si Firebase ya creó una sesión', () => {
  const stateAtStart = { accessToken: null };
  const firebaseSession = { accessToken: 'bff-token-from-firebase' };
  assert.equal(shouldApplyBootstrapResult(stateAtStart, firebaseSession), false);
});

test('acepta el refresh cuando no apareció otra sesión', () => {
  const stateAtStart = { accessToken: null };
  assert.equal(shouldApplyBootstrapResult(stateAtStart, stateAtStart), true);
});

test('descarta el refresh si ocurrió un logout mientras estaba pendiente', () => {
  const stateAtStart = { accessToken: null };
  const clearedByLogout = { accessToken: null };
  assert.equal(shouldApplyBootstrapResult(stateAtStart, clearedByLogout), false);
});
