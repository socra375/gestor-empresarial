import type { AuthChangeEvent } from '@supabase/supabase-js';

/**
 * Cerrar sesión (desde el menú, el encabezado, la pantalla de bloqueo o en
 * otra pestaña) vuelve a la página de presentación, no al formulario de
 * acceso. El arranque sin sesión (INITIAL_SESSION) no cuenta: ahí decide
 * `gestorLandingSeen`.
 */
export function showsLandingAfter(event: AuthChangeEvent): boolean {
  return event === 'SIGNED_OUT';
}
