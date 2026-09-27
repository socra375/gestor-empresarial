export type BusinessAccessStatus = 'new' | 'trial' | 'active' | 'expired' | 'paused' | 'blocked';
export type BusinessPlan = 'prueba' | 'mensual' | 'semestral' | 'anual';
export type PaidPlan = Exclude<BusinessPlan, 'prueba'>;
/** Módulos que el súper admin puede apagar por negocio (según la landing). */
export type ModuleKey = 'facturas' | 'equipo' | 'estadisticas';
export const ALL_MODULES: readonly ModuleKey[] = ['facturas', 'equipo', 'estadisticas'];

export interface BusinessAccess {
  status: BusinessAccessStatus;
  plan: BusinessPlan | null;
  expires_at: string | null;
  reason: string | null;
  is_super_admin: boolean;
  modules: ModuleKey[];
  /** Plan cuya prueba eligió (10/20/30 días desde el registro), o null si sigue con la genérica. */
  trial_plan: PaidPlan | null;
}

export const LOCKED_STATUSES: readonly BusinessAccessStatus[] = ['expired', 'paused', 'blocked'];
