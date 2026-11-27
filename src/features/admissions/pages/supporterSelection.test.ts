import assert from 'node:assert/strict';
import test from 'node:test';
import { applySupporterSelection, commitSupporterSelection } from './supporterSelection.ts';

const family = {
  parent1Name: 'José Pérez',
  parent1Email: 'padre@example.com',
  parent1Phone: '+56911111111',
  parent1Rut: '11.111.111-1',
  parent2Name: 'María Pérez',
  parent2Email: 'madre@example.com',
  parent2Phone: '+56922222222',
  parent2Rut: '22.222.222-2',
  studentName: 'ALUMNO PRUEBA',
};

test('confirma al padre como sostenedor usando sus datos familiares', () => {
  assert.deepEqual(applySupporterSelection(family, 'padre'), {
    supporterRelation: 'padre',
    supporterName: 'José Pérez',
    supporterEmail: 'padre@example.com',
    supporterPhone: '+56911111111',
    supporterRut: '11.111.111-1',
  });
});

test('confirma a la madre como sostenedora usando sus datos familiares', () => {
  assert.deepEqual(applySupporterSelection(family, 'madre'), {
    supporterRelation: 'madre',
    supporterName: 'María Pérez',
    supporterEmail: 'madre@example.com',
    supporterPhone: '+56922222222',
    supporterRut: '22.222.222-2',
  });
});

test('confirma una sola vez el snapshot completo que debe guardar el borrador', () => {
  const committed: Array<Record<string, unknown>> = [];
  const current = {
    ...family,
    supporterRelation: 'madre',
    supporterName: 'María Pérez',
    applicationYear: '2028',
  };

  const next = commitSupporterSelection(current, 'padre', (snapshot) => committed.push(snapshot));

  assert.equal(committed.length, 1);
  assert.deepEqual(committed[0], next);
  assert.equal(committed[0].supporterRelation, 'padre');
  assert.equal(committed[0].supporterName, 'José Pérez');
  assert.equal(committed[0].applicationYear, '2028');
});

test('otro parentesco limpia sólo los campos del sostenedor sin mutar la familia', () => {
  const original = structuredClone(family);
  assert.deepEqual(applySupporterSelection(family, 'abuelo'), {
    supporterRelation: 'abuelo',
    supporterName: '',
    supporterEmail: '',
    supporterPhone: '',
    supporterRut: '',
  });
  assert.deepEqual(family, original);
});

test('compone el nombre del sostenedor desde los campos separados', () => {
  const separated = {
    parent1FirstName: 'Juan Carlos',
    parent1PaternalLastName: 'Pérez',
    parent1MaternalLastName: 'Soto',
    parent1Email: 'padre@example.com',
    parent1Phone: '+56911111111',
    parent1Rut: '11.111.111-1',
  };
  assert.equal(applySupporterSelection(separated, 'padre').supporterName, 'Juan Carlos Pérez Soto');
});
