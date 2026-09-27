import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    updateUser: vi.fn(),
  },
}));
vi.mock('../../../src/lib/api/client', () => ({ supabase: supabaseMock }));

const businessesMock = vi.hoisted(() => ({
  getBusinessById: vi.fn(),
  createBusiness: vi.fn(),
  upsertBusiness: vi.fn(),
}));
vi.mock('../../../src/lib/api/businesses', () => businessesMock);

const businessMembersMock = vi.hoisted(() => ({
  getMembershipByUserId: vi.fn(),
  upsertBusinessMember: vi.fn(),
}));
vi.mock('../../../src/lib/api/businessMembers', () => businessMembersMock);

const employeeInvitesMock = vi.hoisted(() => ({
  redeemInviteCode: vi.fn(),
}));
vi.mock('../../../src/lib/api/employeeInvites', () => employeeInvitesMock);

const businessAccessMock = vi.hoisted(() => ({
  getMyBusinessAccess: vi.fn(),
}));
vi.mock('../../../src/lib/api/businessAccess', () => businessAccessMock);
const ACTIVE_ACCESS = { status: 'active', plan: 'anual', expires_at: '2027-09-25T00:00:00Z', reason: null, is_super_admin: false };

const {
  readPendingInviteFromUrl,
  buildSignUpRedirectUrl,
  signInOrSignUp,
  signOut,
  resolveSessionAfterLogin,
  completeOnboarding,
  setForcedPassword,
} = await import('../../../src/lib/actions/auth');
const { currentUserId, currentBusinessId, currentUserRole, currentBusiness, businessAccess, isBusinessBlocked } =
  await import('../../../src/lib/stores/session');

beforeEach(() => {
  vi.clearAllMocks();
  businessAccessMock.getMyBusinessAccess.mockResolvedValue(ACTIVE_ACCESS);
  businessAccess.set(null);
  currentUserId.set(null);
  currentBusinessId.set(null);
  currentUserRole.set('admin');
  currentBusiness.set(null);
});

describe('readPendingInviteFromUrl', () => {
  it('lee el código y el nombre de empleado de la URL', () => {
    const url = new URL('https://app.test/?invite=EMPABC123&empname=Ana');
    expect(readPendingInviteFromUrl(url)).toEqual({ code: 'EMPABC123', employeeName: 'Ana' });
  });

  it('devuelve null si no hay parámetro invite', () => {
    expect(readPendingInviteFromUrl(new URL('https://app.test/'))).toBeNull();
  });

  it('el nombre de empleado es opcional', () => {
    const url = new URL('https://app.test/?invite=EMPABC123');
    expect(readPendingInviteFromUrl(url)).toEqual({ code: 'EMPABC123', employeeName: '' });
  });
});

describe('buildSignUpRedirectUrl', () => {
  it('sin invitación, devuelve la URL base tal cual', () => {
    expect(buildSignUpRedirectUrl('https://app.test/', null)).toBe('https://app.test/');
  });

  it('con invitación, agrega invite y empname como query params', () => {
    const url = buildSignUpRedirectUrl('https://app.test/', { code: 'EMPABC123', employeeName: 'Ana Pérez' });
    expect(url).toBe('https://app.test/?invite=EMPABC123&empname=Ana+P%C3%A9rez');
  });
});

describe('signInOrSignUp', () => {
  it('si el login funciona, no intenta registrar una cuenta nueva', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });

    const result = await signInOrSignUp({
      email: 'a@b.com',
      password: 'secret1',
      invite: null,
      redirectBaseUrl: 'https://app.test/',
    });

    expect(result).toEqual({ status: 'signed_in' });
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
  });

  it('si el login falla, intenta registrar una cuenta con el redirect de la invitación', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } });
    supabaseMock.auth.signUp.mockResolvedValue({ error: null });

    const result = await signInOrSignUp({
      email: 'nueva@b.com',
      password: 'secret1',
      invite: { code: 'EMPABC123', employeeName: 'Ana' },
      redirectBaseUrl: 'https://app.test/',
    });

    expect(result).toEqual({ status: 'signup_email_sent' });
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'nueva@b.com',
      password: 'secret1',
      options: {
        emailRedirectTo: 'https://app.test/?invite=EMPABC123&empname=Ana',
        data: { terms_accepted_at: expect.any(String), terms_version: '2026-09-27' },
      },
    });
  });

  it('si tanto el login como el registro fallan, devuelve el error', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: { message: 'bad creds' } });
    supabaseMock.auth.signUp.mockResolvedValue({ error: { message: 'email ya registrado' } });

    const result = await signInOrSignUp({
      email: 'x@b.com',
      password: 'secret1',
      invite: null,
      redirectBaseUrl: 'https://app.test/',
    });

    expect(result).toEqual({ status: 'error', error: { message: 'email ya registrado' } });
  });
});

describe('resolveSessionAfterLogin', () => {
  it('con invitación pendiente, canjea el código y queda como employee', async () => {
    employeeInvitesMock.redeemInviteCode.mockResolvedValue('biz-1');
    businessesMock.getBusinessById.mockResolvedValue({ id: 'biz-1', name: 'Le Salon', onboarding_completed: true });

    const result = await resolveSessionAfterLogin('user-emp', { code: 'EMPABC123', employeeName: 'Ana' });

    expect(employeeInvitesMock.redeemInviteCode).toHaveBeenCalledWith('EMPABC123', 'Ana');
    expect(result.role).toBe('employee');
    expect(result.businessId).toBe('biz-1');
    expect(result.inviteError).toBeNull();
    expect(get(currentUserRole)).toBe('employee');
    expect(get(currentBusinessId)).toBe('biz-1');
  });

  it('con un código de invitación inválido, no aborta: sigue la resolución normal y reporta el error', async () => {
    employeeInvitesMock.redeemInviteCode.mockRejectedValue(new Error('Código de invitación inválido o ya utilizado'));
    businessMembersMock.getMembershipByUserId.mockResolvedValue(null);
    businessesMock.getBusinessById.mockResolvedValue({ id: 'user-6', name: 'Mi Salón', onboarding_completed: true });

    const result = await resolveSessionAfterLogin('user-6', { code: 'VENCIDO', employeeName: 'Ana' });

    expect(result.inviteError).toBe('Código de invitación inválido o ya utilizado');
    expect(result.role).toBe('admin');
    expect(result.businessId).toBe('user-6');
  });

  it('sin invitación, con membresía existente, usa el rol y negocio de business_members', async () => {
    businessMembersMock.getMembershipByUserId.mockResolvedValue({ business_id: 'biz-2', role: 'employee' });
    businessesMock.getBusinessById.mockResolvedValue({ id: 'biz-2', name: 'Otro Salón' });

    const result = await resolveSessionAfterLogin('user-2', null);

    expect(result).toEqual({
      businessId: 'biz-2',
      role: 'employee',
      business: { id: 'biz-2', name: 'Otro Salón' },
      inviteError: null,
    });
    expect(businessesMock.createBusiness).not.toHaveBeenCalled();
  });

  it('sin invitación ni membresía, es un admin dueño de su propio negocio (userId = businessId)', async () => {
    businessMembersMock.getMembershipByUserId.mockResolvedValue(null);
    businessesMock.getBusinessById.mockResolvedValue({ id: 'user-3', name: 'Mi Salón', onboarding_completed: true });

    const result = await resolveSessionAfterLogin('user-3', null);

    expect(result.businessId).toBe('user-3');
    expect(result.role).toBe('admin');
    expect(businessesMock.createBusiness).not.toHaveBeenCalled();
  });

  it('admin nuevo sin fila de negocio todavía: la crea con onboarding pendiente', async () => {
    businessMembersMock.getMembershipByUserId.mockResolvedValue(null);
    businessesMock.getBusinessById.mockResolvedValue(null);
    businessesMock.createBusiness.mockResolvedValue({ id: 'user-4', name: 'Mi Salón', onboarding_completed: false });

    const result = await resolveSessionAfterLogin('user-4', null);

    expect(businessesMock.createBusiness).toHaveBeenCalledWith({
      id: 'user-4',
      name: 'Mi Salón',
      onboarding_completed: false,
    });
    expect(result.business).toEqual({ id: 'user-4', name: 'Mi Salón', onboarding_completed: false });
  });

  it('un empleado sin negocio todavía NO dispara la creación (solo un admin puede)', async () => {
    businessMembersMock.getMembershipByUserId.mockResolvedValue({ business_id: 'biz-5', role: 'employee' });
    businessesMock.getBusinessById.mockResolvedValue(null);

    const result = await resolveSessionAfterLogin('user-5', null);

    expect(businessesMock.createBusiness).not.toHaveBeenCalled();
    expect(result.business).toBeNull();
  });

  it.each(['blocked', 'paused', 'expired'])(
    'negocio %s: se detiene antes de buscar membresía o crear el negocio',
    async (status) => {
      businessAccessMock.getMyBusinessAccess.mockResolvedValue({ ...ACTIVE_ACCESS, status, reason: 'Pago pendiente' });

      const result = await resolveSessionAfterLogin('user-7', null);

      expect(result.businessId).toBeNull();
      expect(businessMembersMock.getMembershipByUserId).not.toHaveBeenCalled();
      expect(businessesMock.getBusinessById).not.toHaveBeenCalled();
      expect(businessesMock.createBusiness).not.toHaveBeenCalled();
      expect(get(isBusinessBlocked)).toBe(true);
      expect(get(currentUserId)).toBe('user-7');
    }
  );

  it('negocio en prueba o activo: continúa normalmente y no queda bloqueado', async () => {
    businessAccessMock.getMyBusinessAccess.mockResolvedValue({ ...ACTIVE_ACCESS, status: 'trial', plan: 'prueba' });
    businessMembersMock.getMembershipByUserId.mockResolvedValue(null);
    businessesMock.getBusinessById.mockResolvedValue({ id: 'user-8', name: 'Salón', onboarding_completed: true });

    const result = await resolveSessionAfterLogin('user-8', null);

    expect(result.businessId).toBe('user-8');
    expect(get(isBusinessBlocked)).toBe(false);
  });
});

describe('completeOnboarding', () => {
  it('negocio individual: solo hace upsert de businesses, sin afiliar business_members', async () => {
    const result = await completeOnboarding({
      businessId: 'biz-1',
      name: 'Mi Salón',
      type: 'individual',
      teamSize: null,
      currencySymbol: '$',
    });

    expect(result).toEqual({ requiresForcedPassword: false });
    expect(businessMembersMock.upsertBusinessMember).not.toHaveBeenCalled();
    expect(businessesMock.upsertBusiness).toHaveBeenCalledWith({
      id: 'biz-1',
      name: 'Mi Salón',
      business_type: 'individual',
      currency_symbol: '$',
      onboarding_completed: true,
    });
    expect(get(currentBusiness)).toMatchObject({ name: 'Mi Salón', business_type: 'individual' });
  });

  it('negocio con equipo: afilia al dueño como admin y exige contraseña forzada después', async () => {
    const result = await completeOnboarding({
      businessId: 'biz-1',
      name: 'Salón con Equipo',
      type: 'group',
      teamSize: 5,
      currencySymbol: 'RD$',
    });

    expect(result).toEqual({ requiresForcedPassword: true });
    expect(businessMembersMock.upsertBusinessMember).toHaveBeenCalledWith({
      business_id: 'biz-1',
      user_id: 'biz-1',
      role: 'admin',
    });
    expect(businessesMock.upsertBusiness).toHaveBeenCalledWith({
      id: 'biz-1',
      name: 'Salón con Equipo',
      business_type: 'group',
      currency_symbol: 'RD$',
      onboarding_completed: true,
      team_size: 5,
    });
  });
});

describe('setForcedPassword', () => {
  it('llama a auth.updateUser con la nueva contraseña', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });
    const result = await setForcedPassword('nueva-clave-1');
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'nueva-clave-1' });
    expect(result.error).toBeNull();
  });
});

describe('signOut', () => {
  it('cierra sesión y limpia los stores', async () => {
    currentUserId.set('user-1');
    currentBusinessId.set('biz-1');
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });

    await signOut();

    expect(supabaseMock.auth.signOut).toHaveBeenCalled();
    expect(get(currentUserId)).toBeNull();
    expect(get(currentBusinessId)).toBeNull();
  });
});
