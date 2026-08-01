import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatGradeLevel,
  GRADE_LEVEL_OPTIONS,
  normalizeGradeLevelsForBackend,
  normalizeGradeLevelsForDisplay,
  toBackendGradeLevel,
} from './gradeLevels.ts';

test('homologa variantes de niveles al formato visible', () => {
  const variants = [
    ['1_basico', '1 Básico'],
    ['1° Básico', '1 Básico'],
    ['8basico', '8 Básico'],
    ['1 Medio', '1 Medio'],
    ['IV_MEDIO', '4 Medio'],
    ['PRE_KINDER', 'Prekínder'],
    ['KINDER', 'Kínder'],
  ];

  variants.forEach(([input, expected]) => {
    assert.equal(formatGradeLevel(input), expected);
  });

  assert.equal(GRADE_LEVEL_OPTIONS.length, 14);
  assert.equal(GRADE_LEVEL_OPTIONS.some(level => /[°º]|\b(?:I|II|III|IV) Medio\b/.test(level.label)), false);
});

test('convierte niveles visibles al código esperado por el backend', () => {
  assert.equal(toBackendGradeLevel('1 Básico'), '1_BASICO');
  assert.equal(toBackendGradeLevel('4 Medio'), '4_MEDIO');
  assert.equal(toBackendGradeLevel('Prekínder'), 'PRE_KINDER');
  assert.equal(toBackendGradeLevel('Prekínder', { prekinderCode: 'PREKINDER' }), 'PREKINDER');
  assert.equal(toBackendGradeLevel('A'), 'A');
});

test('normaliza respuestas anidadas y catálogos sin alterar otros campos', () => {
  const response = {
    data: [{
      student: { gradeApplied: '2_BASICO', firstName: 'Ana' },
      schedule: { gradeLevel: 'II_MEDIO' },
      evaluation: { grade: 'A' },
      legacy: { grade_applied: '4_MEDIO', student_grade: 'PREKINDER' },
    }],
    gradeCatalog: [{ code: '3_BASICO', label: '3° Básico' }],
  };

  const normalized = normalizeGradeLevelsForDisplay(response);

  assert.equal(normalized.data[0].student.gradeApplied, '2 Básico');
  assert.equal(normalized.data[0].schedule.gradeLevel, '2 Medio');
  assert.equal(normalized.data[0].evaluation.grade, 'A');
  assert.equal(normalized.data[0].legacy.grade_applied, '4 Medio');
  assert.equal(normalized.data[0].legacy.student_grade, 'Prekínder');
  assert.deepEqual(normalized.gradeCatalog, [{ code: '3 Básico', label: '3 Básico' }]);
});

test('normaliza requests sin mutar el estado original del formulario', () => {
  const formState = {
    student: { gradeApplied: '5 Básico' },
    grades: ['Prekínder', '1 Medio'],
  };

  const request = normalizeGradeLevelsForBackend(formState);

  assert.deepEqual(request, {
    student: { gradeApplied: '5_BASICO' },
    grades: ['PRE_KINDER', '1_MEDIO'],
  });
  assert.equal(formState.student.gradeApplied, '5 Básico');
});
