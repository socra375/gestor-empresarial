// Avisa por Telegram a los súper admins cuando un negocio nuevo termina la
// configuración inicial. La llama la app del propio usuario (verify_jwt =
// true): el JWT dice quién es, y los datos del aviso salen de la BD, nunca
// del cliente. admin_claim_signup_notification garantiza un solo aviso.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { formatSignupMessage, type SignupInfo } from './message.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: string): Response {
  return new Response(body, { status, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reply(204, '');
  if (req.method !== 'POST') return reply(405, 'Method Not Allowed');
  // Sin token no se marca nada como avisado: se reintenta en el próximo llamado.
  if (!BOT_TOKEN) return reply(503, 'TELEGRAM_BOT_TOKEN no configurado');

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData, error: userError } = await db.auth.getUser(jwt);
  if (userError || !userData.user) return reply(401, 'Unauthorized');
  const userId = userData.user.id;

  const { data, error } = await db.rpc('admin_claim_signup_notification', { p_user: userId });
  if (error) return reply(500, error.message);
  const row = (data as (SignupInfo & { chat_ids: number[] })[] | null)?.[0];
  if (!row) return reply(204, '');

  const text = formatSignupMessage(row);
  let sent = 0;
  for (const chatId of row.chat_ids ?? []) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (res.ok) sent++;
  }

  if (sent === 0) {
    await db.rpc('admin_reset_signup_notification', { p_user: userId });
    return reply(502, 'No se pudo avisar por Telegram');
  }
  return reply(200, 'ok');
});
