import { supabase } from './client';
import { unwrap, unwrapNullable } from './errors';
import { ALL_MODULES, type BusinessAccess, type PaidPlan } from '../types/businessAccess';

/**
 * Estado del plan del negocio del usuario actual (RPC get_my_business_access).
 * Responde aunque el negocio esté bloqueado: es lo que permite mostrar la
 * pantalla de bloqueo en vez de una app vacía por RLS.
 */
export async function getMyBusinessAccess(): Promise<BusinessAccess> {
  const row = unwrapNullable(await supabase.rpc('get_my_business_access').maybeSingle());
  return (row as BusinessAccess | null) ?? { status: 'new', plan: null, expires_at: null, reason: null, is_super_admin: false, modules: [...ALL_MODULES], trial_plan: null };
}

/** Código de un solo uso (10 min) para vincular Telegram. Solo súper admins. */
export async function createTelegramLinkCode(): Promise<{ code: string; expires_at: string }> {
  return unwrap(await supabase.rpc('create_telegram_link_code').single());
}

/** El dueño elige la prueba de un plan (una sola vez). Devuelve el nuevo vencimiento. */
export async function chooseTrialPlan(plan: PaidPlan): Promise<string> {
  return unwrap(await supabase.rpc('choose_trial_plan', { p_plan: plan }));
}

/** Pide avisar al súper admin del registro (una sola vez; la Edge Function lo garantiza). */
export async function notifySignup(): Promise<void> {
  await supabase.functions.invoke('notify-signup', { method: 'POST' });
}
