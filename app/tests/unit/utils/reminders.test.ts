import { beforeEach, describe, expect, it } from 'vitest';
import {
  isRemindable,
  markReminderSent,
  normalizeWhatsappPhone,
  sentReminderIds,
  whatsappReminderHref,
} from '../../../src/lib/utils/reminders';

describe('normalizeWhatsappPhone', () => {
  it.each([
    ['809-555-1234', '18095551234'],
    ['(829) 555 1234', '18295551234'],
    ['849.555.1234', '18495551234'],
    ['+1 809 555 1234', '18095551234'],
    ['+34 612 345 678', '34612345678'],
    ['0034 612 345 678', '34612345678'],
    ['+52 55 1234 5678', '525512345678'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeWhatsappPhone(input)).toBe(expected);
  });

  it('un número de 10 dígitos que no es dominicano no recibe código de país inventado', () => {
    expect(normalizeWhatsappPhone('5512345678')).toBe('5512345678');
  });

  it.each([null, undefined, '', '123', 'sin teléfono'])('sin un número usable (%s) devuelve null', (input) => {
    expect(normalizeWhatsappPhone(input)).toBeNull();
  });
});

describe('whatsappReminderHref', () => {
  it('arma el link wa.me con el mensaje codificado', () => {
    expect(whatsappReminderHref('18095551234', 'Hola Ana, ¿vienes?')).toBe(
      'https://wa.me/18095551234?text=Hola%20Ana%2C%20%C2%BFvienes%3F'
    );
  });
});

describe('isRemindable', () => {
  const now = new Date('2026-09-27T12:00:00Z').getTime();
  const later = '2026-09-28T15:00:00Z';

  it.each(['pendiente', 'confirmada'])('una cita %s por venir se puede recordar', (status) => {
    expect(isRemindable({ status, start_at: later }, now)).toBe(true);
  });

  it.each(['cancelada', 'completada', 'no_show'])('una cita %s no', (status) => {
    expect(isRemindable({ status, start_at: later }, now)).toBe(false);
  });

  it('una cita que ya pasó no', () => {
    expect(isRemindable({ status: 'confirmada', start_at: '2026-09-27T09:00:00Z' }, now)).toBe(false);
  });
});

describe('marcas de recordatorio enviado', () => {
  beforeEach(() => localStorage.clear());

  it('marca una cita como recordada', () => {
    markReminderSent('appt-1');
    expect(sentReminderIds().has('appt-1')).toBe(true);
    expect(sentReminderIds().has('appt-2')).toBe(false);
  });

  it('las marcas vencen a los 30 días', () => {
    const now = Date.now();
    markReminderSent('appt-viejo', now - 31 * 24 * 60 * 60 * 1000);
    markReminderSent('appt-nuevo', now);
    expect(sentReminderIds(now).has('appt-viejo')).toBe(false);
    expect(sentReminderIds(now).has('appt-nuevo')).toBe(true);
  });

  it('un valor corrupto en localStorage no rompe nada', () => {
    localStorage.setItem('gestorRemindersSent', '{no es json');
    expect(sentReminderIds().size).toBe(0);
  });
});
