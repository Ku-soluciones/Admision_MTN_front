// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProcessSetupStepper, { SETUP_STEPS } from './ProcessSetupStepper';

afterEach(cleanup);

const statuses = {
  seats: 'SAVED',
  ageDocuments: 'REQUIRED',
  calendar: 'PENDING',
  preparation: 'PENDING',
  review: 'REQUIRED',
} as const;

describe('ProcessSetupStepper', () => {
  it('muestra los cinco pasos en el orden definido', () => {
    render(<ProcessSetupStepper activeStep="seats" statuses={statuses} onStepChange={() => undefined}>Contenido</ProcessSetupStepper>);
    expect(SETUP_STEPS.map((step) => step.label)).toEqual([
      'Cupos', 'Edad y documentos', 'Calendario', 'Preparación', 'Revisión',
    ]);
    const buttons = screen.getAllByRole('button', { name: /Paso/ });
    expect(buttons.map((button) => button.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('Cupos'),
      expect.stringContaining('Edad y documentos'),
      expect.stringContaining('Calendario'),
      expect.stringContaining('Preparación'),
      expect.stringContaining('Revisión'),
    ]));
  });

  it('permite avanzar y retroceder aunque existan pasos pendientes', () => {
    const onStepChange = vi.fn();
    const { rerender } = render(
      <ProcessSetupStepper activeStep="ageDocuments" statuses={statuses} onStepChange={onStepChange}>Contenido</ProcessSetupStepper>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onStepChange).toHaveBeenCalledWith('calendar');

    rerender(<ProcessSetupStepper activeStep="calendar" statuses={statuses} onStepChange={onStepChange}>Contenido</ProcessSetupStepper>);
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onStepChange).toHaveBeenCalledWith('ageDocuments');
  });

  it('muestra estados guardado, pendiente y requerido para abrir', () => {
    render(<ProcessSetupStepper activeStep="seats" statuses={statuses} onStepChange={() => undefined}>Contenido</ProcessSetupStepper>);
    expect(screen.getByText('Guardado')).toBeTruthy();
    expect(screen.getAllByText('Pendiente')).toHaveLength(2);
    expect(screen.getAllByText('Requerido para abrir')).toHaveLength(2);
  });
});
