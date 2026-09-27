// Webhook del bot de Telegram de administración (uso exclusivo de los
// súper admins). Se despliega con verify_jwt = false porque Telegram no
// manda JWT: la autenticación es el secret_token del webhook + un chat_id
// vinculado en la tabla super_admins (ver migración 004).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { type AdminOps, handleUpdate } from './commands.ts';

const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const ops: AdminOps = {
  async deleteLogos(businessId) {
    const bucket = db.storage.from('business-logos');
    const { data, error } = await bucket.list(businessId, { limit: 1000 });
    if (error) throw new Error(error.message);
    const paths = (data ?? []).map((f) => `${businessId}/${f.name}`);
    if (paths.length === 0) return;
    const { error: rmError } = await bucket.remove(paths);
    if (rmError) throw new Error(rmError.message);
  },
  async deleteUser(userId) {
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  },
};

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Sin el secreto configurado el bot no responde a nadie.
  const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!WEBHOOK_SECRET || !safeEqual(secret, WEBHOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let update: { message?: { chat?: { id?: number }; text?: string } };
  try {
    update = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text;
  // 200 vacío (sin texto, o chat que no es súper admin): Telegram no
  // reintenta y un extraño no aprende nada del bot.
  if (chatId === undefined || !text) return new Response(null, { status: 200 });

  const reply = await handleUpdate(db, chatId, text, ops);
  if (reply === null) return new Response(null, { status: 200 });
  // Respuesta directa en el cuerpo del webhook: no hace falta el token del bot.
  return new Response(JSON.stringify({ method: 'sendMessage', chat_id: chatId, text: reply }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
