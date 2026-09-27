export interface SignupInfo {
  name: string;
  email: string;
  business_type: string | null;
  team_size: number | null;
  trial_plan: string | null;
  expires_at: string | null;
}

const TRIAL_DAYS: Record<string, number> = { mensual: 10, semestral: 20, anual: 30 };

export function formatSignupMessage(info: SignupInfo): string {
  const trial = info.trial_plan
    ? `Prueba del plan ${info.trial_plan} (${TRIAL_DAYS[info.trial_plan] ?? '?'} días)`
    : 'Prueba genérica (7 días)';
  const kind = info.business_type === 'group' ? `Con equipo${info.team_size ? ` (${info.team_size} personas)` : ''}` : 'Individual';
  return [
    '🆕 Nuevo registro',
    `Empresa: ${info.name}`,
    `Correo: ${info.email}`,
    `Tipo: ${kind}`,
    `${trial} — vence ${info.expires_at ? new Date(info.expires_at).toISOString().slice(0, 10) : '—'}`,
    '',
    `Más datos: /estado ${info.email}`,
  ].join('\n');
}
