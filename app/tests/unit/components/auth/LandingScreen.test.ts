import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const { default: LandingScreen } = await import('../../../../src/lib/components/auth/LandingScreen.svelte');

afterEach(() => cleanup());

describe('LandingScreen', () => {
  it('muestra el titular y las funciones principales', () => {
    render(LandingScreen, { props: { onEnter: vi.fn() } });
    expect(screen.getByText('Organiza tu negocio.')).toBeTruthy();
    expect(screen.getByText('Agenda')).toBeTruthy();
    expect(screen.getByText('Servicios')).toBeTruthy();
  });

  it('el botón "Probar gratis" del encabezado llama a onEnter', async () => {
    const onEnter = vi.fn();
    render(LandingScreen, { props: { onEnter } });

    const [firstButton] = screen.getAllByRole('button', { name: 'Probar gratis' });
    await fireEvent.click(firstButton!);
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('"Acceder" en la barra de navegación llama a onEnter', async () => {
    const onEnter = vi.fn();
    render(LandingScreen, { props: { onEnter } });

    await fireEvent.click(screen.getByRole('button', { name: 'Acceder' }));
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('"Ver cómo funciona" enlaza a la sección de demostración en la misma página', () => {
    render(LandingScreen, { props: { onEnter: vi.fn() } });
    const link = screen.getByRole('link', { name: 'Ver cómo funciona' });
    expect(link.getAttribute('href')).toBe('#demo');
  });

  it('muestra los 3 planes con su precio', () => {
    render(LandingScreen, { props: { onEnter: vi.fn() } });
    expect(screen.getByRole('heading', { name: 'Mensual' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '6 Meses' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Anual' })).toBeTruthy();
    expect(screen.getByText('$20')).toBeTruthy();
    expect(screen.getByText('$100')).toBeTruthy();
    expect(screen.getByText('$200')).toBeTruthy();
  });

  it('el botón "Probar gratis" de un plan llama a onEnter', async () => {
    const onEnter = vi.fn();
    render(LandingScreen, { props: { onEnter } });

    const buttons = screen.getAllByRole('button', { name: 'Probar gratis' });
    await fireEvent.click(buttons[1]!); // el primer botón de plan, después del del encabezado
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('el enlace de WhatsApp de los planes va al mismo número que "Cambiar de Plan"', () => {
    render(LandingScreen, { props: { onEnter: vi.fn() } });
    const link = screen.getByRole('link', { name: 'Escribinos por WhatsApp' });
    expect(link.getAttribute('href')).toContain('https://wa.me/18299788249');
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(LandingScreen, { props: { onEnter: vi.fn() } });
    await expectNoA11yViolations(container);
  });
});
