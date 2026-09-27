import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { expectNoA11yViolations } from '../../support/axe';
import { loader, hideLoader } from '../../../../src/lib/stores/loader';

const authActionsMock = vi.hoisted(() => ({
  signInOrSignUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));
vi.mock('../../../../src/lib/actions/auth', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/lib/actions/auth')>(
    '../../../../src/lib/actions/auth'
  );
  return { ...actual, signInOrSignUp: authActionsMock.signInOrSignUp, signInWithGoogle: authActionsMock.signInWithGoogle };
});

const { default: AuthScreen } = await import('../../../../src/lib/components/auth/AuthScreen.svelte');

afterEach(() => {
  cleanup();
  hideLoader();
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('AuthScreen', () => {
  it('muestra el subtítulo y los campos básicos, sin el de nombre completo', () => {
    render(AuthScreen, { props: { pendingInvite: null } });

    expect(screen.getByLabelText('Correo Electrónico')).toBeTruthy();
    expect(screen.getByLabelText('Contraseña')).toBeTruthy();
    expect(screen.queryByLabelText('Tu nombre completo (Obligatorio)')).toBeNull();
  });

  it('escribir un código de invitación revela el campo de nombre completo', async () => {
    render(AuthScreen, { props: { pendingInvite: null } });

    const inviteInput = screen.getByLabelText('¿Tienes un código de invitación de tu salón? (Opcional)');
    await fireEvent.input(inviteInput, { target: { value: 'EMPABC123' } });

    expect(screen.getByLabelText('Tu nombre completo (Obligatorio)')).toBeTruthy();
  });

  it('con código de invitación precargado (link de invitación), el campo ya aparece expandido', () => {
    render(AuthScreen, { props: { pendingInvite: { code: 'EMPABC123', employeeName: '' } } });
    expect(screen.getByLabelText('Tu nombre completo (Obligatorio)')).toBeTruthy();
  });

  it('si hay código de invitación sin nombre, avisa y no envía el formulario', async () => {
    render(AuthScreen, { props: { pendingInvite: { code: 'EMPABC123', employeeName: '' } } });

    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Debes escribir tu nombre completo para registrarte con un código de invitación.'
    );
    expect(authActionsMock.signInOrSignUp).not.toHaveBeenCalled();
  });

  it('envía email/password al intentar iniciar sesión', async () => {
    authActionsMock.signInOrSignUp.mockResolvedValue({ status: 'signed_in' });
    render(AuthScreen, { props: { pendingInvite: null } });

    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));

    expect(authActionsMock.signInOrSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@test.com', password: 'secret123', invite: null })
    );
  });

  it('muestra el loader de "Iniciando sesión…" mientras se envía el formulario, y lo oculta al terminar', async () => {
    let resolveSignIn: (value: { status: 'signed_in' }) => void = () => {};
    authActionsMock.signInOrSignUp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
    );
    render(AuthScreen, { props: { pendingInvite: null } });

    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));

    expect(get(loader)).toBe('login');

    resolveSignIn({ status: 'signed_in' });
    await vi.waitFor(() => expect(get(loader)).toBeNull());
  });

  it('muestra el mensaje de éxito cuando se envía el correo de registro', async () => {
    authActionsMock.signInOrSignUp.mockResolvedValue({ status: 'signup_email_sent' });
    render(AuthScreen, { props: { pendingInvite: null } });

    // Los campos de email/contraseña sí llevan `required` nativo (a
    // diferencia del de nombre completo): hay que llenarlos o el
    // navegador bloquea el submit antes de que corra handleSubmit.
    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));

    expect((await screen.findByRole('status')).textContent).toContain('Revisa tu correo');
  });

  it('muestra el error de autenticación devuelto por la acción', async () => {
    authActionsMock.signInOrSignUp.mockResolvedValue({ status: 'error', error: { message: 'credenciales inválidas' } });
    render(AuthScreen, { props: { pendingInvite: null } });

    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Error de autenticación: credenciales inválidas');
  });

  it.each([
    ['account_exists', 'Ya tienes una cuenta con este correo'],
    ['email_not_confirmed', 'todavía no está confirmada'],
  ] as const)('si el correo ya está registrado (%s) no muestra "revisa tu correo"', async (status, text) => {
    authActionsMock.signInOrSignUp.mockResolvedValue({ status });
    render(AuthScreen, { props: { pendingInvite: null } });

    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(text);
    expect(alert.textContent).not.toContain('Revisa tu correo');
  });

  it('sin aceptar Términos y Privacidad no envía el formulario y lo avisa', async () => {
    render(AuthScreen, { props: { pendingInvite: null } });

    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Debes aceptar los Términos y la Política de privacidad para continuar.'
    );
    expect(authActionsMock.signInOrSignUp).not.toHaveBeenCalled();
  });

  it('sin aceptar Términos, "Entrar con Google" tampoco avanza', async () => {
    render(AuthScreen, { props: { pendingInvite: null } });
    await fireEvent.click(screen.getByRole('button', { name: /Google/ }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(authActionsMock.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('los links del consentimiento abren Términos y Privacidad', () => {
    render(AuthScreen, { props: { pendingInvite: null } });
    expect(screen.getByRole('link', { name: 'Términos y condiciones' }).getAttribute('href')).toBe('#/terminos');
    expect(screen.getByRole('link', { name: 'Política de privacidad' }).getAttribute('href')).toBe('#/privacidad');
  });

  it('una vez aceptados los Términos, la casilla no vuelve a aparecer y se puede entrar directo', async () => {
    authActionsMock.signInOrSignUp.mockResolvedValue({ status: 'signed_in' });
    const first = render(AuthScreen, { props: { pendingInvite: null } });
    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));
    first.unmount();

    render(AuthScreen, { props: { pendingInvite: null } });
    expect(screen.queryByRole('checkbox')).toBeNull();
    await fireEvent.input(screen.getByLabelText('Correo Electrónico'), { target: { value: 'ana@test.com' } });
    await fireEvent.input(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sesión / Registrarse' }));
    expect(authActionsMock.signInOrSignUp).toHaveBeenCalledTimes(2);
  });

  it('si los documentos cambiaron de versión, la casilla vuelve a pedirse', () => {
    localStorage.setItem('gestorTermsAccepted', '2020-01-01');
    render(AuthScreen, { props: { pendingInvite: null } });
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('sin violaciones de accesibilidad (axe-core)', async () => {
    const { container } = render(AuthScreen, { props: { pendingInvite: { code: 'EMPABC123', employeeName: '' } } });
    await expectNoA11yViolations(container);
  });
});
