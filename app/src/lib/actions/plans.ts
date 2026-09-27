import { chooseTrialPlan, getMyBusinessAccess, notifySignup } from '../api/businessAccess';
import { clearPendingTrial, getPendingTrial } from '../utils/pendingTrial';
import { businessAccess } from '../stores/session';
import type { PaidPlan } from '../types/businessAccess';

/** Activa la prueba del plan elegido y refresca el acceso para que la UI muestre el nuevo vencimiento. */
export async function startPlanTrial(plan: PaidPlan): Promise<void> {
  await chooseTrialPlan(plan);
  businessAccess.set(await getMyBusinessAccess());
}

/**
 * Tras la configuración inicial: aplica la prueba del plan elegido en la
 * landing (si hay) y avisa al súper admin. Nunca lanza: un fallo aquí no
 * debe impedir que el negocio empiece a usar la app.
 */
export async function finishSignup(): Promise<void> {
  const plan = getPendingTrial();
  if (plan) {
    try {
      await startPlanTrial(plan);
    } catch {
      // ya tenía una prueba elegida o no está en prueba: se queda como está
    }
    clearPendingTrial();
  }
  try {
    await notifySignup();
  } catch {
    // el aviso es para el súper admin; el negocio no se entera si falla
  }
}
