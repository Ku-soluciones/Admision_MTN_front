import assert from 'node:assert/strict';
import test from 'node:test';
import { fullTemplateData } from '../src/data/minified_template.ts';
import {
  calculateFamilyInterviewPercentage,
  calculateFamilyInterviewScores,
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

test('ignora respuestas antiguas que no aplican al curso del estudiante', () => {
  const template = filterTemplateForGrade(fullTemplateData, 'KINDER');
  const legacyData = {
    section1: {
      q1: { score: 3 },
      q2_prekinder_2basico: { score: 3 },
      q2_3basico_4medio: { score: 3 },
      q3_prekinder_4basico: { score: 3 },
      q3_5basico_3medio: { score: 3 },
    },
    section2: { q1: { score: 3 }, q2: { score: 2 } },
    section3: { q1: { score: 3 } },
    section4: { q1: { score: 3 } },
    observations: {
      checklist: { obs1: 1, obs2: 1, obs3: 1, obs4: 1 },
      overallOpinion: { score: 5 },
    },
  };

  assert.deepEqual(calculateFamilyInterviewScores(legacyData, template), {
    sectionScore: 20,
    observationScore: 9,
  });
  assert.equal(calculateFamilyInterviewPercentage(legacyData, template), 98);
});
