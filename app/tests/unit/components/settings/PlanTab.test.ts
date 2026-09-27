import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const { default: PlanTab } = await import('../../../../src/lib/components/settings/PlanTab.svelte');

afterEach(() => cleanup());

describe('PlanTab', () => {
  it('el botón de solicitar cambio abre WhatsApp con el número del equipo y un mensaje', () => {
    render(PlanTab);

    const link = screen.getByRole('button', { name: 'Solicitar cambio por WhatsApp' }) as HTMLAnchorElement;

    expect(link.href).toMatch(/^https:\/\/wa\.me\/18299788249\?text=/);
    expect(decodeURIComponent(link.href.split('text=')[1] ?? '')).toBe(
      'Hola, quiero solicitar un cambio de plan para mi negocio en Gestión Salón.'
    );
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('enlaza a la política de reembolsos junto a los planes', () => {
    render(PlanTab);
    expect(screen.getByRole('link', { name: 'Ver política de reembolsos' }).getAttribute('href')).toBe('#/reembolsos');
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(PlanTab);
    await expectNoA11yViolations(container);
  });
});
