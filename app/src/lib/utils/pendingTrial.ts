import type { PaidPlan } from '../types/businessAccess';

// Plan elegido en la landing ("Probar gratis" de una tarjeta) antes de
// tener cuenta. Se guarda hasta terminar la configuración inicial.
const KEY = 'gestorTrialPlan';
const PLANS: readonly PaidPlan[] = ['mensual', 'semestral', 'anual'];

export function isPaidPlan(value: unknown): value is PaidPlan {
  return typeof value === 'string' && (PLANS as readonly string[]).includes(value);
}

export function getPendingTrial(): PaidPlan | null {
  try {
    const value = localStorage.getItem(KEY);
    return isPaidPlan(value) ? value : null;
  } catch {
    return null;
  }
}

export function setPendingTrial(plan: PaidPlan): void {
  try {
    localStorage.setItem(KEY, plan);
  } catch {
    // Sin localStorage el plan igual viaja en la URL de confirmación del correo.
  }
}

export function clearPendingTrial(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada que limpiar
  }
}
