import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCalendarDate } from './calendarDate.ts';

test('reproduce el desfase original y conserva el nacimiento del 16/02/2009', () => {
  assert.equal(new Date('2009-02-16').toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
  }), '15-02-2009');
  assert.equal(formatCalendarDate('2009-02-16'), '16/02/2009');
});

test('conserva la fecha civil con o sin hora y zona horaria', () => {
  for (const value of [
    '2009-02-16',
    '2009-02-16T00:00:00',
    '2009-02-16T00:00:00Z',
    '2009-02-16T00:00:00.000Z',
    '2009-02-16T00:00:00+14:00',
    '2009-02-16T23:59:59-03:00',
  ]) assert.equal(formatCalendarDate(value), '16/02/2009');
});

test('conserva límites de mes, año y días bisiestos', () => {
  for (const [value, expected] of [
    ['2009-01-01', '01/01/2009'],
    ['2009-12-31', '31/12/2009'],
    ['2009-03-01', '01/03/2009'],
    ['2000-02-29', '29/02/2000'],
    ['2024-02-29', '29/02/2024'],
  ]) assert.equal(formatCalendarDate(value), expected);
});

test('rechaza fechas inexistentes o ausentes sin normalizarlas a otro día', () => {
  for (const value of [
    undefined, null, '', 'fecha-invalida', '2009-02-29', '2009-02-30',
    '1900-02-29', '2009-04-31', '2009-00-16', '2009-13-16', '2009-02-00',
  ]) assert.equal(formatCalendarDate(value), 'Fecha no disponible');
});
