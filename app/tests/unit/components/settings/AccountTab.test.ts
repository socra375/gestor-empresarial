import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const accountActionsMock = vi.hoisted(() => ({ getAccountInfo: vi.fn() }));
vi.mock('../../../../src/lib/actions/account', () => accountActionsMock);

const authActionsMock = vi.hoisted(() => ({ setForcedPassword: vi.fn(), switchAccount: vi.fn() }));
vi.mock('../../../../src/lib/actions/auth', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/auth')>('../../../../src/lib/actions/auth');
  return { ...actual, setForcedPassword: authActionsMock.setForcedPassword, switchAccount: authActionsMock.switchAccount };
});

const { default: AccountTab } = await import('../../../../src/lib/components/settings/AccountTab.svelte');

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  accountActionsMock.getAccountInfo.mockResolvedValue({ avatarUrl: '', name: 'Ana Pérez', email: 'ana@example.com' });
});

describe('AccountTab', () => {
  it('"Agregar o cambiar cuenta" cierra la sesión para entrar con otra', async () => {
    render(AccountTab);
    expect(screen.getByRole('heading', { name: 'Agregar o cambiar cuenta' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Agregar o cambiar cuenta' }));
    expect(authActionsMock.switchAccount).toHaveBeenCalledTimes(1);
  });

  it('muestra el nombre y correo del usuario autenticado', async () => {
    render(AccountTab);
    expect(await screen.findByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
  });

  it('el botón de contraseña revela el formulario, oculto por defecto', async () => {
    render(AccountTab);
    expect(screen.queryByLabelText('Nueva Contraseña')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Contraseña' }));
    expect(screen.getByLabelText('Nueva Contraseña')).toBeTruthy();
  });

  it('con menos de 6 caracteres, avisa y no llama a setForcedPassword', async () => {
    render(AccountTab);
    await fireEvent.click(screen.getByRole('button', { name: 'Contraseña' }));
    await fireEvent.input(screen.getByLabelText('Nueva Contraseña'), { target: { value: '123' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Contraseña' }));

    expect((await screen.findByRole('alert')).textContent).toBe('La contraseña debe tener al menos 6 caracteres.');
    expect(authActionsMock.setForcedPassword).not.toHaveBeenCalled();
  });

  it('con una contraseña válida, la guarda y muestra éxito', async () => {
    authActionsMock.setForcedPassword.mockResolvedValue({ error: null });
    render(AccountTab);
    await fireEvent.click(screen.getByRole('button', { name: 'Contraseña' }));
    await fireEvent.input(screen.getByLabelText('Nueva Contraseña'), { target: { value: 'clave-segura' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Guardar Contraseña' }));

    expect(authActionsMock.setForcedPassword).toHaveBeenCalledWith('clave-segura');
    expect(await screen.findByText('¡Listo! Ya puedes iniciar sesión con tu correo y esta contraseña.')).toBeTruthy();
  });

  it('sin violaciones de accesibilidad (axe-core), con el formulario de contraseña abierto', async () => {
    const { container } = render(AccountTab);
    await screen.findByText('Ana Pérez');
    await fireEvent.click(screen.getByRole('button', { name: 'Contraseña' }));

    await expectNoA11yViolations(container);
  });
});
