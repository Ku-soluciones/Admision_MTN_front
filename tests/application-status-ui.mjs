// Ejecutar: node tests/application-status-ui.mjs
// Componentes reales con respuestas controladas, sin acceso a datos ni correos reales.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const temporary = await mkdtemp(path.join(tmpdir(), 'admitia-status-ui-'));
const baseRow = {
  studentId: 1, gradeApplied: 'KINDER', familyGroupId: null, siblingGroupSize: 1,
  siblingNames: [], familyEvaluation: {}, exams: {}, cycleDirectorDecision: '', cycleDirector: {},
};
const rows = ['APPROVED', 'REJECTED', 'WAITLIST', 'PENDING'].map((status, index) => ({
  ...baseRow, applicationId: index + 1, studentName: `Postulante ${index + 1}`, status,
  statusLabel: status,
  allowedStatusTransitions: status === 'WAITLIST' ? ['APPROVED', 'REJECTED']
    : status === 'PENDING' ? ['APPROVED', 'REJECTED', 'WAITLIST'] : [],
  statusChangeBlockedReason: ['APPROVED', 'REJECTED'].includes(status)
    ? 'Resultado definitivo: no admite cambios de estado.'
    : status === 'WAITLIST' ? 'Solo puede pasar a Aceptado o No seleccionado.' : '',
}));

await build({
  stdin: {
    contents: `import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { FinalSummaryView } from './src/features/admin/components/admissionReports/FinalSummaryView';
      import ApplicationDecisionModal from './src/packages/shared-ui/src/components/admin/ApplicationDecisionModal';
      const root = createRoot(document.getElementById('root'));
      window.summary = () => root.render(<FinalSummaryView academicYear={2027} onOpenCard={() => {}} />);
      window.decision = (status) => root.render(<ApplicationDecisionModal key={status} isOpen application={{id: 10, status,
        student: {firstName: 'Ana', gradeApplied: 'KINDER'}, paymentRequired: false}}
        onClose={() => {}} onDecisionMade={() => {}} />);
      window.summary();`,
    resolveDir: process.cwd(), loader: 'tsx',
  }, bundle: true, outfile: path.join(temporary, 'app.js'), format: 'esm',
  define: { 'import.meta.env': '{}' },
  plugins: [{ name: 'controlled-responses', setup(builder) {
    builder.onLoad({ filter: /dashboard\.client\.ts$/ }, () => ({ contents: `export default {
      async getFinalSummary() { window.reads++; return { success: true, data: window.rows, meta: { total: window.rows.length } }; },
      async updateFinalDecision(id, decision) {
        window.writes++;
        const row = window.rows.find(row => row.applicationId === id);
        row.status = 'APPROVED'; row.allowedStatusTransitions = []; row.statusChangeBlockedReason = 'La postulación está cerrada con resultado Aceptado y no admite cambios de estado.';
        if (window.conflict) throw { response: { status: 409, data: { error: { code: 'APPLICATION_STATUS_LOCKED', message: row.statusChangeBlockedReason } } } };
        return { success: true, message: 'Decisión registrada', data: row };
      }
    };` }));
    builder.onLoad({ filter: /shared-ui\/src\/services\/api\.ts$/ }, () => ({ contents: `export default {
      async get() { return {data: {id: 10, status: 'APPROVED', student: {gradeApplied: 'KINDER'}, allowedStatusTransitions: [], statusChangeBlockedReason: 'Resultado cerrado por otra persona.'}}; },
      async post() { throw {response: {status: 409, data: {error: {message: 'Resultado cerrado por otra persona.'}}}}; }
    };` }));
    builder.onLoad({ filter: /useApplicationPaymentStatus\.ts$/ }, () => ({ contents: `export const useApplicationPaymentStatus = () => ({data: null, state: 'idle'});` }));
  }}],
});
const script = await readFile(path.join(temporary, 'app.js'));
const server = createServer((request, response) => {
  response.setHeader('Content-Type', request.url === '/app.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/app.js' ? script : '<div id="root"></div><script type="module" src="/app.js"></script>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {}) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(data => { window.rows = data; window.reads = 0; window.writes = 0; window.conflict = false; }, rows);
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const select = index => page.getByRole('combobox', { name: `Decisión final para Postulante ${index}` }).first();
  await select(1).waitFor();
  assert.equal(await select(1).isDisabled(), true);
  assert.equal(await select(2).isDisabled(), true);
  assert.deepEqual(await select(3).locator('option').evaluateAll(items => items.map(item => item.value)), ['APPROVED', 'WAITLIST', 'REJECTED']);
  assert.equal(await select(3).isEnabled(), true);
  await select(3).selectOption('APPROVED');
  await page.getByRole('button', {name: /confirmar/i}).last().click();
  await page.waitForFunction(() => window.writes === 1);
  assert.equal(await select(3).isDisabled(), true);
  await page.evaluate(() => { window.conflict = true; });
  await select(4).selectOption('REJECTED');
  await page.getByRole('button', {name: /confirmar/i}).last().click();
  await page.getByText('La postulación está cerrada con resultado Aceptado y no admite cambios de estado.', { exact: true }).first().waitFor();
  assert.equal(await select(4).isDisabled(), true);
  assert.ok(await page.evaluate(() => window.reads >= 2));
  for (const status of ['APPROVED', 'REJECTED']) {
    await page.evaluate(status => window.decision(status), status);
    await page.getByText(/La postulación está cerrada con resultado/).first().waitFor();
    assert.equal(await page.getByRole('radio').count(), 0);
  }
  await page.evaluate(() => window.decision('WAITLIST'));
  await page.getByRole('radio').first().waitFor();
  assert.equal(await page.getByRole('radio').count(), 2);
  assert.deepEqual(await page.getByRole('radio').evaluateAll(items => items.map(item => item.value)), ['APPROVED', 'REJECTED']);
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Confirmar aprobación' }).click();
  await page.getByText('Resultado cerrado por otra persona.', { exact: true }).first().waitFor();
  assert.equal(await page.getByRole('radio').count(), 0);
  assert.deepEqual(errors, []);
  console.log('OK: resultados bloqueados, lista de espera manual, actualización tras guardar y conflictos 409 en resumen y modal.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
