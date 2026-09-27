import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import {
  type AdminOps,
  type BusinessRow,
  type Db,
  expiringWithin,
  handleCommand,
  handleUpdate,
  parseCommand,
} from './commands.ts';

const noOps: AdminOps = { deleteLogos: () => Promise.resolve(), deleteUser: () => Promise.resolve() };

const NATH: BusinessRow = {
  business_id: 'b1',
  name: 'Nathalie',
  email: 'nath1105@hotmail.ca',
  plan: 'prueba',
  expires_at: '2026-10-02T00:00:00Z',
  status: 'prueba',
  reason: null,
};

function fakeDb(rows: BusinessRow[] = [NATH]) {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const db: Db = {
    rpc(fn, args) {
      calls.push({ fn, args });
      if (fn === 'admin_list_businesses') return Promise.resolve({ data: rows, error: null });
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { db, calls };
}

Deno.test('parseCommand quita la mención @bot y normaliza', () => {
  assertEquals(parseCommand('/Plan@MiBot a@b.c anual'), { cmd: 'plan', args: ['a@b.c', 'anual'] });
  assertEquals(parseCommand('hola'), null);
});

Deno.test('/plan busca por email sin importar mayúsculas y llama admin_set_plan', async () => {
  const { db, calls } = fakeDb();
  const out = await handleCommand(db, '/plan NATH1105@hotmail.ca Anual');
  assertStringIncludes(out, 'Plan asignado');
  assertEquals(calls.find((c) => c.fn === 'admin_set_plan')?.args, { p_business_id: 'b1', p_plan: 'anual' });
});

Deno.test('/plan con plan inválido no toca la base', async () => {
  const { db, calls } = fakeDb();
  const out = await handleCommand(db, '/plan nath1105@hotmail.ca trimestral');
  assertStringIncludes(out, 'Uso:');
  assertEquals(calls.length, 0);
});

Deno.test('/bloquear pasa el motivo completo y avisa que los datos quedan guardados', async () => {
  const { db, calls } = fakeDb();
  const out = await handleCommand(db, '/bloquear nath1105@hotmail.ca pago pendiente');
  assertStringIncludes(out, 'datos quedan guardados');
  assertEquals(calls.find((c) => c.fn === 'admin_block_business')?.args, {
    p_business_id: 'b1',
    p_reason: 'pago pendiente',
  });
});

Deno.test('/reanudar usa admin_resume_business', async () => {
  const { db, calls } = fakeDb();
  await handleCommand(db, '/reanudar nath1105@hotmail.ca');
  assert(calls.some((c) => c.fn === 'admin_resume_business'));
});

Deno.test('email desconocido responde sin llamar funciones de escritura', async () => {
  const { db, calls } = fakeDb();
  const out = await handleCommand(db, '/pausar nadie@x.com');
  assertStringIncludes(out, 'No hay ningún negocio');
  assertEquals(calls.map((c) => c.fn), ['admin_list_businesses']);
});

Deno.test('errores de la base se devuelven como texto, no revientan el webhook', async () => {
  const { db } = fakeDb();
  const failing: Db = { rpc: () => Promise.resolve({ data: null, error: { message: 'boom' } }) };
  assertStringIncludes(await handleCommand(failing, '/negocios'), 'Error: boom');
  assertStringIncludes(await handleCommand(db, '/desconocido'), 'Comando desconocido');
});

Deno.test('expiringWithin ignora vencidos, bloqueados, pausados y lejanos', () => {
  const now = new Date('2026-09-25T00:00:00Z');
  const rows: BusinessRow[] = [
    { ...NATH, business_id: 'soon', expires_at: '2026-09-30T00:00:00Z' },
    { ...NATH, business_id: 'far', expires_at: '2027-09-25T00:00:00Z' },
    { ...NATH, business_id: 'past', expires_at: '2026-09-20T00:00:00Z' },
    { ...NATH, business_id: 'paused', status: 'pausado', expires_at: '2026-09-30T00:00:00Z' },
  ];
  assertEquals(expiringWithin(rows, 7, now).map((r) => r.business_id), ['soon']);
});

function authDb(adminChat: number, validCode = 'ABC123DEF0') {
  const calls: string[] = [];
  const db: Db = {
    rpc(fn, args) {
      calls.push(fn);
      if (fn === 'admin_chat_is_super_admin') return Promise.resolve({ data: args?.p_chat_id === adminChat, error: null });
      if (fn === 'admin_link_telegram') {
        return Promise.resolve(
          args?.p_code === validCode
            ? { data: 'marcos@example.com', error: null }
            : { data: null, error: { message: 'Código inválido o vencido' } },
        );
      }
      if (fn === 'admin_list_businesses') return Promise.resolve({ data: [NATH], error: null });
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { db, calls };
}

Deno.test('handleUpdate: un chat ajeno no recibe respuesta ni ejecuta comandos', async () => {
  const { db, calls } = authDb(111);
  assertEquals(await handleUpdate(db, 999, '/negocios', noOps), null);
  assertEquals(calls, ['admin_chat_is_super_admin']);
});

Deno.test('handleUpdate: el súper admin vinculado ejecuta comandos', async () => {
  const { db } = authDb(111);
  assertStringIncludes((await handleUpdate(db, 111, '/negocios', noOps)) ?? '', 'Nathalie');
});

Deno.test('handleUpdate: /vincular con código válido vincula y muestra la ayuda', async () => {
  const { db } = authDb(111);
  const out = (await handleUpdate(db, 999, '/vincular ABC123DEF0', noOps)) ?? '';
  assertStringIncludes(out, 'Vinculado como súper admin: marcos@example.com');
  assertStringIncludes(out, '/negocios');
});

Deno.test('handleUpdate: /vincular con código inválido o sin código', async () => {
  const { db } = authDb(111);
  assertStringIncludes((await handleUpdate(db, 999, '/vincular NOPE', noOps)) ?? '', 'Código inválido o vencido');
  assertStringIncludes((await handleUpdate(db, 999, '/vincular', noOps)) ?? '', 'Uso: /vincular');
});

const STATS = { clientes: 55, citas: 128, facturas: 106, servicios: 20, empleados: 0, ultima_actividad: '2026-09-24T23:29:58Z' };

function fullDb(overrides: Record<string, { data: unknown; error: { message: string } | null }> = {}) {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const db: Db = {
    rpc(fn, args) {
      calls.push({ fn, args });
      if (overrides[fn]) return Promise.resolve(overrides[fn]);
      if (fn === 'admin_list_businesses') return Promise.resolve({ data: [NATH], error: null });
      if (fn === 'admin_business_stats') return Promise.resolve({ data: [STATS], error: null });
      if (fn === 'admin_list_modules') {
        return Promise.resolve({
          data: [
            { module: 'facturas', enabled: false, origen: 'manual' },
            { module: 'equipo', enabled: true, origen: 'plan' },
            { module: 'estadisticas', enabled: true, origen: 'plan' },
          ],
          error: null,
        });
      }
      if (fn === 'admin_prepare_delete') return Promise.resolve({ data: 'A1B2C3', error: null });
      if (fn === 'admin_execute_delete') {
        return Promise.resolve({ data: [{ business_id: 'b1', name: 'Nathalie', user_ids: ['u1', 'u2'] }], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { db, calls };
}

Deno.test('/estado muestra las cantidades sin datos personales', async () => {
  const { db } = fullDb();
  const out = await handleCommand(db, '/estado nath1105@hotmail.ca');
  assertStringIncludes(out, 'Clientes: 55 · Citas: 128 · Facturas: 106');
  assertStringIncludes(out, 'Última actividad: 2026-09-24');
});

Deno.test('/desactivar valida el módulo y llama admin_set_module', async () => {
  const { db, calls } = fullDb();
  assertStringIncludes(await handleCommand(db, '/desactivar nath1105@hotmail.ca pdf'), 'Uso: /desactivar');
  const out = await handleCommand(db, '/desactivar nath1105@hotmail.ca Facturas');
  assertEquals(calls.find((c) => c.fn === 'admin_set_module')?.args, {
    p_business_id: 'b1',
    p_module: 'facturas',
    p_enabled: false,
  });
  assertStringIncludes(out, '❌ facturas (manual)');
  assertStringIncludes(out, '✅ equipo');
});

Deno.test('/eliminar pide confirmación con código y no borra nada', async () => {
  const { db, calls } = fullDb();
  const out = await handleCommand(db, '/eliminar nath1105@hotmail.ca', new Date(), { chatId: 42, ops: noOps });
  assertStringIncludes(out, '/confirmar A1B2C3');
  assertStringIncludes(out, 'no se puede deshacer');
  assertEquals(calls.find((c) => c.fn === 'admin_prepare_delete')?.args, { p_business_id: 'b1', p_chat_id: 42 });
  assert(!calls.some((c) => c.fn === 'admin_execute_delete'));
});

Deno.test('/eliminar rechazado por la BD (cuenta activa) devuelve el motivo', async () => {
  const { db } = fullDb({
    admin_prepare_delete: { data: null, error: { message: 'Solo se eliminan cuentas bloqueadas o vencidas. Primero usa /bloquear' } },
  });
  const out = await handleCommand(db, '/eliminar nath1105@hotmail.ca', new Date(), { chatId: 42, ops: noOps });
  assertStringIncludes(out, 'Primero usa /bloquear');
});

Deno.test('/confirmar borra logos y usuarios, e informa lo que falló', async () => {
  const { db } = fullDb();
  const deleted: string[] = [];
  const ops: AdminOps = {
    deleteLogos: (id) => {
      deleted.push(`logos:${id}`);
      return Promise.resolve();
    },
    deleteUser: (id) => (id === 'u2' ? Promise.reject(new Error('boom')) : (deleted.push(id), Promise.resolve())),
  };
  const out = await handleCommand(db, '/confirmar a1b2c3', new Date(), { chatId: 42, ops });
  assertEquals(deleted, ['logos:b1', 'u1']);
  assertStringIncludes(out, 'Usuarios borrados: 1/2');
  assertStringIncludes(out, 'usuario u2: boom');
});

Deno.test('/prueba valida el plan y llama admin_set_trial', async () => {
  const { db, calls } = fullDb();
  assertStringIncludes(await handleCommand(db, '/prueba nath1105@hotmail.ca trimestral'), 'Uso: /prueba');
  const out = await handleCommand(db, '/prueba NATH1105@hotmail.ca Semestral');
  assertStringIncludes(out, 'Prueba aplicada');
  assertEquals(calls.find((c) => c.fn === 'admin_set_trial')?.args, { p_business_id: 'b1', p_plan: 'semestral' });
});

Deno.test('/prueba sobre un plan pagado devuelve el motivo de la BD', async () => {
  const { db } = fullDb({
    admin_set_trial: { data: null, error: { message: 'Solo se puede elegir una prueba mientras la cuenta está en prueba' } },
  });
  assertStringIncludes(await handleCommand(db, '/prueba nath1105@hotmail.ca anual'), 'mientras la cuenta está en prueba');
});

Deno.test('/cambiar valida el plan y llama admin_change_plan', async () => {
  const { db, calls } = fullDb();
  assertStringIncludes(await handleCommand(db, '/cambiar nath1105@hotmail.ca gratis'), 'Uso: /cambiar');
  const out = await handleCommand(db, '/cambiar nath1105@hotmail.ca Mensual');
  assertStringIncludes(out, 'se conserva la fecha de vencimiento');
  assertEquals(calls.find((c) => c.fn === 'admin_change_plan')?.args, { p_business_id: 'b1', p_plan: 'mensual' });
});

Deno.test('/cambiar informa cuántos clientes sobran si el plan nuevo no alcanza', async () => {
  const { db } = fullDb({
    admin_change_plan: { data: null, error: { message: 'Tiene 55 clientes y el plan mensual permite 15: le sobran 40' } },
  });
  assertStringIncludes(await handleCommand(db, '/cambiar nath1105@hotmail.ca mensual'), 'le sobran 40');
});
