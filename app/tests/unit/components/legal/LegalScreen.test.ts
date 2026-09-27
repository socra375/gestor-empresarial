import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const { default: LegalScreen } = await import('../../../../src/lib/components/legal/LegalScreen.svelte');

afterEach(() => cleanup());

describe('LegalScreen', () => {
  it.each([
    ['terminos', 'Términos y condiciones'],
    ['privacidad', 'Política de privacidad'],
    ['cookies', 'Política de cookies y almacenamiento'],
    ['reembolsos', 'Política de reembolsos'],
  ] as const)('%s muestra su título', (doc, title) => {
    render(LegalScreen, { props: { doc } });
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy();
  });

  it('Términos incluye la sección de uso de inteligencia artificial', () => {
    render(LegalScreen, { props: { doc: 'terminos' } });
    expect(screen.getByRole('heading', { name: /inteligencia artificial/ })).toBeTruthy();
  });

  it('Reembolsos aclara que los pagos no se reembolsan y que se puede cancelar', () => {
    const { container } = render(LegalScreen, { props: { doc: 'reembolsos' } });
    expect(container.textContent).toContain('no se reembolsa');
    expect(container.textContent).toContain('Cancelar cuando quieras');
  });

  it('enlaza a los otros tres documentos, no a sí mismo', () => {
    render(LegalScreen, { props: { doc: 'privacidad' } });
    const nav = screen.getByRole('navigation', { name: 'Documentos legales' });
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#/terminos', '#/cookies', '#/reembolsos']);
  });

  it.each(['terminos', 'privacidad', 'cookies', 'reembolsos'] as const)(
    'sin violaciones de accesibilidad (axe-core) en %s',
    async (doc) => {
      const { container } = render(LegalScreen, { props: { doc } });
      await expectNoA11yViolations(container);
    }
  );
});
