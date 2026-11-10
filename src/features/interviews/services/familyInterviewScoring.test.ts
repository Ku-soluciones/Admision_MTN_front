import assert from 'node:assert/strict';
import test from 'node:test';
import { fullTemplateData } from '../src/data/minified_template.ts';
import {
  checklistResponseValue,
  filterTemplateForGrade,
} from './familyInterviewScoring.ts';

test('filtra preguntas excluyentes para el curso postulado', () => {
  const template = filterTemplateForGrade(fullTemplateData, '6_BASICO');

  assert.deepEqual(
    Object.keys(template.sections.section1.questions),
    ['q1', 'q2_3basico_4medio', 'q3_5basico_3medio'],
  );
});

test('guarda el puntaje ponderado del checklist en vez de un booleano', () => {
  assert.equal(checklistResponseValue(true, 2), 2);
  assert.equal(checklistResponseValue(false, 2), 0);
});
