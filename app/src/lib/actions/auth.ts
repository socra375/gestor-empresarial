import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '../api/client';
import { getBusinessById, createBusiness, upsertBusiness } from '../api/businesses';
import { getMembershipByUserId, upsertBusinessMember } from '../api/businessMembers';
import { redeemInviteCode } from '../api/employeeInvites';
import { getMyBusinessAccess } from '../api/businessAccess';
import {
  currentUserId,
  currentBusinessId,
  currentUserRole,
  currentBusiness,
  businessAccess,
  resetSession,
} from '../stores/session';
import { LOCKED_STATUSES, type PaidPlan } from '../types/businessAccess';
import { getPendingTrial } from '../utils/pendingTrial';
import type { Tables, TablesInsert } from '../types/database.types';
import { LEGAL_VERSION } from '../utils/legal';

export interface PendingInvite {
  code: string;
  employeeName: string;
}

/** El link de confirmación de una invitación llega con ?invite=&empname=. */
export function readPendingInviteFromUrl(url: URL): PendingInvite | null {
  const code = url.searchParams.get('invite');
  if (!code) return null;
  return { code, employeeName: url.searchParams.get('empname') ?? '' };
}

export function buildSignUpRedirectUrl(
  baseUrl: string,
  invite: PendingInvite | null,
  trialPlan: PaidPlan | null = null
): string {
  const params = new URLSearchParams();
  if (invite) {
    params.set('invite', invite.code);
    params.set('empname', invite.employeeName);
  }
  if (trialPlan) params.set('plan', trialPlan);
  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

export type SignInOrSignUpResult =
  | { status: 'signed_in' }
  | { status: 'signup_email_sent' }
  | { status: 'error'; error: AuthError };

/**
 * Un solo formulario hace las dos cosas, igual que en el legado: intenta
 * iniciar sesión primero, y solo si falla intenta registrar una cuenta
 * nueva (con el código de invitación, si hay uno, viajando en la URL de
 * confirmación del correo).
 */
export async function signInOrSignUp(params: {
  email: string;
  password: string;
  invite: PendingInvite | null;
  redirectBaseUrl: string;
}): Promise<SignInOrSignUpResult> {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  if (!signInError) return { status: 'signed_in' };

  const redirectUrl = buildSignUpRedirectUrl(params.redirectBaseUrl, params.invite, getPendingTrial());
  const { error: signUpError } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      emailRedirectTo: redirectUrl,
      // Constancia de aceptación de Términos y Privacidad (el formulario no deja
      // registrarse sin marcarla): queda en auth.users.raw_user_meta_data.
      data: { terms_accepted_at: new Date().toISOString(), terms_version: LEGAL_VERSION },
    },
  });
  if (signUpError) return { status: 'error', error: signUpError };
  return { status: 'signup_email_sent' };
}

export async function signInWithGoogle(redirectTo: string) {
  return supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  resetSession();
}

export interface ResolvedSession {
  /** null cuando el negocio está bloqueado, pausado o vencido. */
  businessId: string | null;
  role: 'admin' | 'employee';
  business: Tables<'businesses'> | null;
  /** Si venía un código de invitación y el canje falló, el mensaje para mostrar (auth.invite_invalid). */
  inviteError: string | null;
}

/**
 * Corre una vez por sesión iniciada: canjea una invitación pendiente (si
 * hay una), resuelve a qué negocio pertenece el usuario y con qué rol, y
 * carga (o crea, si es un admin nuevo) los datos del negocio. Deja el
 * resultado en los stores de sesión y lo devuelve para que el llamador
 * decida el siguiente paso (mostrar onboarding, o el shell principal).
 *
 * Igual que el legado: si el canje de la invitación falla (código
 * inválido o vencido), no aborta -- sigue con la resolución normal por
 * business_members, y deja el mensaje en `inviteError` para que la UI lo
 * muestre.
 */
export async function resolveSessionAfterLogin(
  userId: string,
  pendingInvite: PendingInvite | null
): Promise<ResolvedSession> {
  currentUserId.set(userId);

  let businessId: string | null = null;
  let role: 'admin' | 'employee' = 'admin';
  let inviteError: string | null = null;

  if (pendingInvite) {
    try {
      businessId = await redeemInviteCode(pendingInvite.code, pendingInvite.employeeName);
      role = 'employee';
    } catch (err) {
      inviteError = err instanceof Error ? err.message : String(err);
    }
  }

  // Antes de buscar membresía o crear "Mi Salón": con el negocio bloqueado,
  // pausado o vencido, RLS oculta todo y se intentaría crear un duplicado.
  const access = await getMyBusinessAccess();
  businessAccess.set(access);
  if (LOCKED_STATUSES.includes(access.status)) {
    return { businessId: null, role, business: null, inviteError };
  }

  if (!businessId) {
    const membership = await getMembershipByUserId(userId);
    if (membership) {
      businessId = membership.business_id;
      role = membership.role as 'admin' | 'employee';
    } else {
      businessId = userId;
      role = 'admin';
    }
  }

  let business = await getBusinessById(businessId);
  if (!business && role === 'admin') {
    business = await createBusiness({ id: businessId, name: 'Mi Salón', onboarding_completed: false });
  }

  currentBusinessId.set(businessId);
  currentUserRole.set(role);
  currentBusiness.set(business);

  return { businessId, role, business, inviteError };
}

export interface OnboardingInput {
  businessId: string;
  name: string;
  type: 'individual' | 'group';
  teamSize: number | null;
  currencySymbol: string;
}

export interface OnboardingResult {
  requiresForcedPassword: boolean;
}

/**
 * A diferencia del legado (que no releía ni actualizaba currentBusinessData
 * tras guardar el onboarding, dejando el nombre mostrado desactualizado
 * hasta la próxima carga), aquí el store se actualiza con los datos recién
 * guardados -- una mejora incidental de fiabilidad, no un cambio de
 * comportamiento visible para nadie que dependiera del bug.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const patch: TablesInsert<'businesses'> = {
    id: input.businessId,
    name: input.name,
    business_type: input.type,
    currency_symbol: input.currencySymbol,
    onboarding_completed: true,
    ...(input.type === 'group' ? { team_size: input.teamSize } : {}),
  };

  if (input.type === 'group') {
    await upsertBusinessMember({ business_id: input.businessId, user_id: input.businessId, role: 'admin' });
  }
  await upsertBusiness(patch);

  currentBusiness.update((business) => ({ ...(business as Tables<'businesses'>), ...patch }));

  return { requiresForcedPassword: input.type === 'group' };
}

export async function setForcedPassword(password: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}
