export interface BusinessRow {
  business_id: string;
  name: string;
  email: string | null;
  plan: string | null;
  expires_at: string | null;
  status: string;
  reason: string | null;
}

export interface Db {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/** Operaciones fuera de la BD que necesita /confirmar (Storage y Auth). */
export interface AdminOps {
  deleteLogos(businessId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

export const PLANS = ['mensual', 'semestral', 'anual'] as const;
export const MODULES = ['facturas', 'equipo', 'estadisticas'] as const;

interface Stats {
  clientes: number;
  citas: number;
  facturas: number;
  servicios: number;
  empleados: number;
  ultima_actividad: string | null;
}

interface ModuleRow {
  module: string;
  enabled: boolean;
  origen: string;
}

export const HELP = [
  'Comandos:',
  '/vincular <código> — vincula este chat (el código se genera en la app: Configuración → Plan)',
  '/negocios — todos los negocios',
  '/estado <email>',
  '/plan <email> mensual|semestral|anual — asigna o renueva (suma tiempo al mismo plan)',
  '/cambiar <email> mensual|semestral|anual — cambia el plan ya, conservando la fecha de vencimiento',
  '/prueba <email> mensual|semestral|anual — prueba total del plan (10/20/30 días desde el registro; los días usados se restan)',
  '/bloquear <email> [motivo]',
  '/desbloquear <email>',
  '/pausar <email> [motivo] — congela los días restantes',
  '/reanudar <email>',
  '/vencen — vencen en los próximos 7 días',
  '/modulos <email> — qué módulos tiene (facturas, equipo, estadisticas)',
  '/activar <email> <módulo>',
  '/desactivar <email> <módulo>',
  '/eliminar <email> — borra la cuenta y TODOS sus datos (solo bloqueadas o vencidas; pide confirmación)',
  '/confirmar <código> — confirma una eliminación',
  '',
  'Bloquear, pausar o desactivar un módulo solo corta el acceso: los datos quedan guardados. Solo /eliminar borra.',
].join('\n');

export function parseCommand(text: string): { cmd: string; args: string[] } | null {
  const parts = text.trim().split(/\s+/);
  const head = parts[0] ?? '';
  if (!head.startsWith('/')) return null;
  return { cmd: head.slice(1).split('@')[0].toLowerCase(), args: parts.slice(1) };
}

export function fmtDay(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '—';
}

export function formatBusiness(b: BusinessRow): string {
  const lines = [
    `${b.name} <${b.email ?? 'sin email'}>`,
    `Plan: ${b.plan ?? '—'} · Estado: ${b.status} · Vence: ${fmtDay(b.expires_at)}`,
  ];
  if (b.reason) lines.push(`Motivo: ${b.reason}`);
  return lines.join('\n');
}

export function expiringWithin(rows: BusinessRow[], days: number, now: Date): BusinessRow[] {
  const limit = now.getTime() + days * 86_400_000;
  return rows.filter((b) => {
    if (!b.expires_at || b.status === 'bloqueado' || b.status === 'pausado') return false;
    const t = new Date(b.expires_at).getTime();
    return t > now.getTime() && t <= limit;
  });
}

async function call(db: Db, fn: string, args?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

async function listBusinesses(db: Db): Promise<BusinessRow[]> {
  return ((await call(db, 'admin_list_businesses')) as BusinessRow[] | null) ?? [];
}

async function findByEmail(db: Db, email: string | undefined): Promise<BusinessRow | string> {
  if (!email || !email.includes('@')) return 'Falta el email del negocio.';
  const target = email.toLowerCase();
  const found = (await listBusinesses(db)).find((b) => b.email?.toLowerCase() === target);
  return found ?? `No hay ningún negocio con el email ${email}.`;
}

async function statsOf(db: Db, id: string): Promise<string> {
  const rows = (await call(db, 'admin_business_stats', { p_business_id: id })) as Stats[] | null;
  const st = rows?.[0];
  if (!st) return '';
  return [
    `Clientes: ${st.clientes} · Citas: ${st.citas} · Facturas: ${st.facturas}`,
    `Servicios: ${st.servicios} · Empleados: ${st.empleados} · Última actividad: ${fmtDay(st.ultima_actividad)}`,
  ].join('\n');
}

export function formatModules(rows: ModuleRow[]): string {
  return rows
    .map((m) => `${m.enabled ? '✅' : '❌'} ${m.module}${m.origen === 'plan' ? '' : ` (${m.origen})`}`)
    .join('\n');
}

async function statusOf(db: Db, id: string): Promise<string> {
  const b = (await listBusinesses(db)).find((r) => r.business_id === id);
  return b ? formatBusiness(b) : '';
}

/**
 * Punto de entrada de cada mensaje. `/vincular` lo puede usar cualquier
 * chat (el código de un solo uso es la prueba de identidad); el resto
 * solo un chat vinculado a un súper admin. Para chats ajenos devuelve
 * null: el webhook no responde nada.
 */
export async function handleUpdate(
  db: Db,
  chatId: number,
  text: string,
  ops: AdminOps,
  now: Date = new Date(),
): Promise<string | null> {
  const parsed = parseCommand(text);
  if (parsed?.cmd === 'vincular') {
    if (!parsed.args[0]) return 'Uso: /vincular <código>';
    const { data, error } = await db.rpc('admin_link_telegram', { p_code: parsed.args[0], p_chat_id: chatId });
    if (error) return 'Código inválido o vencido. Genera uno nuevo en la app (Configuración → Plan).';
    return `Vinculado como súper admin: ${data}\n\n${HELP}`;
  }

  const { data: isAdmin, error } = await db.rpc('admin_chat_is_super_admin', { p_chat_id: chatId });
  if (error || isAdmin !== true) return null;
  return handleCommand(db, text, now, { chatId, ops });
}

export async function handleCommand(
  db: Db,
  text: string,
  now: Date = new Date(),
  ctx?: { chatId: number; ops: AdminOps },
): Promise<string> {
  const parsed = parseCommand(text);
  if (!parsed) return HELP;
  const { cmd, args } = parsed;

  try {
    switch (cmd) {
      case 'start':
      case 'ayuda':
      case 'help':
        return HELP;

      case 'negocios': {
        const rows = await listBusinesses(db);
        return rows.length ? rows.map(formatBusiness).join('\n\n') : 'No hay negocios registrados.';
      }

      case 'vencen': {
        const rows = expiringWithin(await listBusinesses(db), 7, now);
        return rows.length ? rows.map(formatBusiness).join('\n\n') : 'Ningún plan vence en los próximos 7 días.';
      }

      case 'estado': {
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        return `${formatBusiness(b)}\n${await statsOf(db, b.business_id)}`;
      }

      case 'modulos': {
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        const rows = (await call(db, 'admin_list_modules', { p_business_id: b.business_id })) as ModuleRow[];
        return `${b.name}\n${formatModules(rows)}`;
      }

      case 'activar':
      case 'desactivar': {
        const mod = (args[1] ?? '').toLowerCase();
        if (!(MODULES as readonly string[]).includes(mod)) {
          return `Uso: /${cmd} <email> ${MODULES.join('|')}`;
        }
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        await call(db, 'admin_set_module', {
          p_business_id: b.business_id,
          p_module: mod,
          p_enabled: cmd === 'activar',
        });
        const rows = (await call(db, 'admin_list_modules', { p_business_id: b.business_id })) as ModuleRow[];
        return `Listo. Los datos no se borran: solo se ocultan mientras el módulo esté apagado.\n${b.name}\n${formatModules(rows)}`;
      }

      case 'eliminar': {
        if (!ctx) return 'Error: falta el contexto del chat.';
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        const code = (await call(db, 'admin_prepare_delete', { p_business_id: b.business_id, p_chat_id: ctx.chatId })) as string;
        return [
          '⚠️ ELIMINACIÓN PERMANENTE — no se puede deshacer.',
          formatBusiness(b),
          await statsOf(db, b.business_id),
          '',
          'Se borrarán el negocio, todos sus datos, sus logos y los usuarios del dueño y sus empleados.',
          `Para confirmar envía en los próximos 5 minutos: /confirmar ${code}`,
        ].join('\n');
      }

      case 'confirmar': {
        if (!ctx) return 'Error: falta el contexto del chat.';
        if (!args[0]) return 'Uso: /confirmar <código>';
        const rows = (await call(db, 'admin_execute_delete', { p_code: args[0], p_chat_id: ctx.chatId })) as {
          business_id: string;
          name: string;
          user_ids: string[];
        }[];
        const del = rows[0];
        const problems: string[] = [];
        try {
          await ctx.ops.deleteLogos(del.business_id);
        } catch (err) {
          problems.push(`logos: ${err instanceof Error ? err.message : String(err)}`);
        }
        for (const id of del.user_ids ?? []) {
          try {
            await ctx.ops.deleteUser(id);
          } catch (err) {
            problems.push(`usuario ${id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        const users = del.user_ids?.length ?? 0;
        const base = `🗑️ "${del.name}" eliminado con todos sus datos. Usuarios borrados: ${users - problems.filter((p) => p.startsWith('usuario')).length}/${users}.`;
        return problems.length ? `${base}\nPendiente de borrar a mano en Supabase:\n${problems.join('\n')}` : base;
      }

      case 'prueba': {
        const plan = (args[1] ?? '').toLowerCase();
        if (!(PLANS as readonly string[]).includes(plan)) return 'Uso: /prueba <email> mensual|semestral|anual';
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        await call(db, 'admin_set_trial', { p_business_id: b.business_id, p_plan: plan });
        return `Prueba aplicada.\n${await statusOf(db, b.business_id)}`;
      }

      case 'cambiar': {
        const plan = (args[1] ?? '').toLowerCase();
        if (!(PLANS as readonly string[]).includes(plan)) return 'Uso: /cambiar <email> mensual|semestral|anual';
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        await call(db, 'admin_change_plan', { p_business_id: b.business_id, p_plan: plan });
        return `Plan cambiado (se conserva la fecha de vencimiento).\n${await statusOf(db, b.business_id)}`;
      }

      case 'plan': {
        const plan = (args[1] ?? '').toLowerCase();
        if (!(PLANS as readonly string[]).includes(plan)) return 'Uso: /plan <email> mensual|semestral|anual';
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        await call(db, 'admin_set_plan', { p_business_id: b.business_id, p_plan: plan });
        return `Plan asignado.\n${await statusOf(db, b.business_id)}`;
      }

      case 'bloquear':
      case 'pausar': {
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        const reason = args.slice(1).join(' ') || null;
        const fn = cmd === 'bloquear' ? 'admin_block_business' : 'admin_pause_business';
        await call(db, fn, { p_business_id: b.business_id, p_reason: reason });
        const verb = cmd === 'bloquear' ? 'Bloqueado' : 'Pausado';
        return `${verb}. Sus datos quedan guardados.\n${await statusOf(db, b.business_id)}`;
      }

      case 'desbloquear':
      case 'reanudar': {
        const b = await findByEmail(db, args[0]);
        if (typeof b === 'string') return b;
        const fn = cmd === 'desbloquear' ? 'admin_unblock_business' : 'admin_resume_business';
        await call(db, fn, { p_business_id: b.business_id });
        const verb = cmd === 'desbloquear' ? 'Desbloqueado' : 'Reanudado';
        return `${verb}.\n${await statusOf(db, b.business_id)}`;
      }

      default:
        return `Comando desconocido: /${cmd}\n\n${HELP}`;
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
