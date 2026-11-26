import assert from 'node:assert/strict';
import test from 'node:test';
import { applySupporterSelection } from './supporterSelection.ts';

const family = {
  parent1Name: 'PADRE PRUEBA',
  parent1Email: 'padre@example.com',
  parent1Phone: '+56911111111',
  parent1Rut: '11.111.111-1',
  parent2Name: 'MADRE PRUEBA',
  parent2Email: 'madre@example.com',
  parent2Phone: '+56922222222',
  parent2Rut: '22.222.222-2',
  studentName: 'ALUMNO PRUEBA',
};

test('confirma al padre como sostenedor usando sus datos familiares', () => {
  assert.deepEqual(applySupporterSelection(family, 'padre'), {
    supporterRelation: 'padre',
    supporterName: 'PADRE PRUEBA',
    supporterEmail: 'padre@example.com',
    supporterPhone: '+56911111111',
    supporterRut: '11.111.111-1',
  });
});

test('confirma a la madre como sostenedora usando sus datos familiares', () => {
  assert.deepEqual(applySupporterSelection(family, 'madre'), {
    supporterRelation: 'madre',
    supporterName: 'MADRE PRUEBA',
    supporterEmail: 'madre@example.com',
    supporterPhone: '+56922222222',
    supporterRut: '22.222.222-2',
  });
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
