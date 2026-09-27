import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const { default: LegalFooter } = await import('../../../../src/lib/components/legal/LegalFooter.svelte');

afterEach(() => cleanup());

describe('LegalFooter', () => {
  it('enlaza a los 4 documentos legales', () => {
    render(LegalFooter);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#/terminos', '#/privacidad', '#/cookies', '#/reembolsos']);
  });

  it('muestra el aviso de desarrollo con IA y los datos de la marca', () => {
    const { container } = render(LegalFooter);
    expect(container.textContent).toContain('Desarrollado con asistencia de inteligencia artificial.');
    expect(container.textContent).toContain('Gestor Empresarial · República Dominicana');
  });

  it('en modo compacto mantiene el aviso de IA pero no el copyright', () => {
    const { container } = render(LegalFooter, { props: { compact: true } });
    expect(container.textContent).toContain('inteligencia artificial');
    expect(container.textContent).not.toContain('©');
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(LegalFooter);
    await expectNoA11yViolations(container);
  });
});
