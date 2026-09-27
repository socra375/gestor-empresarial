import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const { default: StorageNotice } = await import('../../../../src/lib/components/legal/StorageNotice.svelte');

beforeEach(() => localStorage.removeItem('gestorStorageNoticeSeen'));
afterEach(() => cleanup());

describe('StorageNotice', () => {
  it('aparece la primera vez, con link a la política de cookies', () => {
    render(StorageNotice);
    const region = screen.getByRole('region', { name: 'Aviso de almacenamiento' });
    expect(region.textContent).toContain('Sin cookies de rastreo');
    expect(screen.getByRole('link', { name: 'Más información' }).getAttribute('href')).toBe('#/cookies');
  });

  it('"Entendido" lo oculta y lo recuerda', async () => {
    render(StorageNotice);
    await fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));

    expect(screen.queryByRole('region')).toBeNull();
    expect(localStorage.getItem('gestorStorageNoticeSeen')).toBe('1');
  });

  it('no aparece si ya se había aceptado', () => {
    localStorage.setItem('gestorStorageNoticeSeen', '1');
    render(StorageNotice);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(StorageNotice);
    await expectNoA11yViolations(container);
  });
});
