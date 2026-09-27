/**
 * Recordatorios de cita por WhatsApp (nivel 1): un link wa.me que abre el
 * WhatsApp del negocio con el mensaje ya escrito; la persona solo toca
 * "Enviar". No hay envío automático ni costo por mensaje.
 */

import type { Locale } from '../i18n';
import { LOCALE_MAP } from './format';

/** Fecha para el texto del mensaje, p. ej. "sábado, 28 de septiembre". */
export function reminderDateLabel(value: string, locale: Locale): string {
  return new Date(value).toLocaleDateString(LOCALE_MAP[locale], { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Solo se recuerdan citas por venir que siguen en pie (pendientes o confirmadas). */
export function isRemindable(appt: { status: string; start_at: string }, now = Date.now()): boolean {
  return (appt.status === 'pendiente' || appt.status === 'confirmada') && new Date(appt.start_at).getTime() > now;
}

/** Códigos de área de República Dominicana (plan de numeración +1). */
const DR_AREA_CODES = ['809', '829', '849'];

/**
 * Deja el teléfono en el formato internacional que pide wa.me (solo dígitos,
 * con código de país). Un número con "+" o "00" se respeta tal cual; uno
 * dominicano de 10 dígitos recibe el 1 del país. Cualquier otro número se
 * usa como está: para clientes de otros países hay que guardarlo con su
 * código de país. Devuelve null si no hay suficientes dígitos.
 */
export function normalizeWhatsappPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!trimmed.startsWith('+') && digits.startsWith('00')) digits = digits.slice(2);
  if (!trimmed.startsWith('+') && digits.length === 10 && DR_AREA_CODES.includes(digits.slice(0, 3))) {
    digits = `1${digits}`;
  }
  return digits.length >= 8 ? digits : null;
}

export function whatsappReminderHref(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

const SENT_KEY = 'gestorRemindersSent';
/** Las marcas de "ya recordado" se guardan solo en este navegador y se limpian a los 30 días. */
const SENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function readSent(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function sentReminderIds(now = Date.now()): Set<string> {
  return new Set(
    Object.entries(readSent())
      .filter(([, at]) => typeof at === 'number' && now - at < SENT_TTL_MS)
      .map(([id]) => id)
  );
}

export function markReminderSent(apptId: string, now = Date.now()): void {
  const kept = Object.fromEntries(
    Object.entries(readSent()).filter(([, at]) => typeof at === 'number' && now - at < SENT_TTL_MS)
  );
  kept[apptId] = now;
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(kept));
  } catch {
    // Sin localStorage: el recordatorio igual se envía, solo no queda la marca.
  }
}
