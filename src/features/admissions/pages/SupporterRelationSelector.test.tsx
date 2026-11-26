// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SupporterRelationSelector from './SupporterRelationSelector';

afterEach(cleanup);

const renderSelector = (isPrekinder: boolean, value = 'madre') => {
  const onCommit = vi.fn();
  const view = render(
    <SupporterRelationSelector
      isPrekinder={isPrekinder}
      value={value}
      onCommit={onCommit}
      onBlur={() => undefined}
    />,
  );
  return { ...view, onCommit };
};

describe('SupporterRelationSelector', () => {
  it('en PK permite cancelar sin cambiar al sostenedor actual', () => {
    const { onCommit } = renderSelector(true);

    const selector = screen.getByRole('combobox', { name: /Parentesco con el postulante/ });
    fireEvent.change(selector, { target: { value: 'padre' } });

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText(/responsable del pago de las colegiaturas/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCommit).not.toHaveBeenCalled();
    expect((selector as HTMLSelectElement).value).toBe('madre');
  });

  it('en PK aplica la selección sólo después de confirmarla y no reabre al remontar', () => {
    const { onCommit, rerender } = renderSelector(true);

    fireEvent.change(screen.getByRole('combobox', { name: /Parentesco con el postulante/ }), { target: { value: 'padre' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sí, confirmar' }));
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('padre');

    rerender(
      <SupporterRelationSelector
        isPrekinder
        value="padre"
        onCommit={onCommit}
        onBlur={() => undefined}
      />,
    );
    expect(screen.queryByText(/responsable del pago de las colegiaturas/i)).toBeNull();
  });

  it('en K–IV conserva la selección inmediata sin abrir confirmación', () => {
    const { onCommit } = renderSelector(false);

    fireEvent.change(screen.getByRole('combobox', { name: /Parentesco con el postulante/ }), { target: { value: 'padre' } });

    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('padre');
    expect(screen.queryByText(/responsable del pago de las colegiaturas/i)).toBeNull();
  });
});
