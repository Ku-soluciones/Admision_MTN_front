import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatGuardianDocumentDate,
  loadGuardianDocumentGroups,
} from './guardianDocuments.ts';

test('carga y conserva los documentos de todas las postulaciones', async () => {
  const applications = [
    { id: 10, student: { firstName: 'Ana', lastName: 'Pérez' } },
    { id: 20, student: { firstName: 'Luis', lastName: 'Pérez' } },
  ];

  const groups = await loadGuardianDocumentGroups(applications, async applicationId => ({
    data: [{ id: applicationId, originalName: `${applicationId}.pdf` }],
  }));

  assert.deepEqual(groups.map(group => ({
    applicationId: group.applicationId,
    studentName: group.studentName,
    documentIds: group.documents.map(document => document.id),
  })), [
    { applicationId: 10, studentName: 'Ana Pérez', documentIds: [10] },
    { applicationId: 20, studentName: 'Luis Pérez', documentIds: [20] },
  ]);
});

test('mantiene los documentos embebidos si falla una postulación', async () => {
  const applications = [
    {
      id: 30,
      student: { fullName: 'María Soto' },
      documents: [{ id: 301, originalName: 'certificado.pdf' }],
    },
    { id: 40, student: { firstName: 'Pedro', lastName: 'Soto' } },
  ];

  const groups = await loadGuardianDocumentGroups(applications, async applicationId => {
    if (applicationId === 30) throw new Error('Error de red');
    return [{ id: 401, originalName: 'notas.pdf' }];
  });

  assert.equal(groups[0].studentName, 'María Soto');
  assert.deepEqual(groups[0].documents.map(document => document.id), [301]);
  assert.equal(groups[0].loadError, true);
  assert.deepEqual(groups[1].documents.map(document => document.id), [401]);
  assert.equal(groups[1].loadError, false);
});

test('maneja fechas ausentes o inválidas sin mostrar Invalid Date', () => {
  assert.equal(formatGuardianDocumentDate(), 'Fecha no disponible');
  assert.equal(formatGuardianDocumentDate('fecha-invalida'), 'Fecha no disponible');
});
