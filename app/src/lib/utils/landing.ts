import type { AuthChangeEvent } from '@supabase/supabase-js';

const SWITCH_ACCOUNT_KEY = 'gestorSwitchAccount';

/**
 * "Agregar o cambiar cuenta" (Mi Cuenta) cierra la sesión para entrar con
 * otra: se marca antes del signOut para que ese cierre lleve directo al
 * formulario de acceso y no a la página de presentación.
 */
export function requestAccountSwitch(): void {
  try {
    sessionStorage.setItem(SWITCH_ACCOUNT_KEY, '1');
  } catch {
    // Sin sessionStorage se cae a la landing, que igual tiene "Acceder a mi cuenta".
  }
}

/**
 * Cerrar sesión (desde el menú, el encabezado, la pantalla de bloqueo o en
 * otra pestaña) vuelve a la página de presentación, no al formulario de
 * acceso, salvo que sea un cambio de cuenta (ver requestAccountSwitch). El
 * arranque sin sesión (INITIAL_SESSION) no cuenta: ahí decide
 * `gestorLandingSeen`.
 */
export function showsLandingAfter(event: AuthChangeEvent): boolean {
  if (event !== 'SIGNED_OUT') return false;
  let switchingAccount = false;
  try {
    switchingAccount = sessionStorage.getItem(SWITCH_ACCOUNT_KEY) === '1';
    sessionStorage.removeItem(SWITCH_ACCOUNT_KEY);
  } catch {
    // Sin sessionStorage: se comporta como un cierre de sesión normal.
  }
  return !switchingAccount;
}
