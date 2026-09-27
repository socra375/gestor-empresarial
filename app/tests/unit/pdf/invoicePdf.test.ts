import { describe, expect, it, vi, afterEach } from 'vitest';
import { invoiceLineItems, loadImageAsDataURL, buildInvoicePdf } from '../../../src/lib/pdf/invoicePdf';
import type { Tables } from '../../../src/lib/types/database.types';

const corte: Tables<'services'> = {
  id: 'svc-1',
  business_id: 'biz-1',
  name: 'Corte',
  category: null,
  duration_minutes: 30,
  price: 500,
  active: true,
  created_at: null,
};

describe('invoiceLineItems', () => {
  it('una línea por cada servicio de la cita, con el sufijo de especialista', () => {
    expect(invoiceLineItems([corte], ' — Ana', 'Servicio', 999)).toEqual([{ desc: 'Corte — Ana', price: 500 }]);
  });

  it('sin servicios resueltos, cae a una única línea de reserva con el precio dado', () => {
    expect(invoiceLineItems([], ' — Ana', 'Servicio', 1500)).toEqual([{ desc: 'Servicio — Ana', price: 1500 }]);
  });
});

describe('loadImageAsDataURL', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('convierte la respuesta a data URL cuando el fetch es exitoso', async () => {
    const blob = new Blob(['fake-image'], { type: 'image/png' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) })
    );

    const result = await loadImageAsDataURL('https://example.com/logo.png');

    expect(result?.format).toBe('PNG');
    expect(result?.dataUrl.startsWith('data:')).toBe(true);
  });

  it('si la respuesta no es exitosa, devuelve null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await loadImageAsDataURL('https://example.com/logo.png')).toBeNull();
  });

  it('si el fetch lanza (red caída, etc.), devuelve null en vez de propagar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    expect(await loadImageAsDataURL('https://example.com/logo.png')).toBeNull();
  });
});

describe('buildInvoicePdf', () => {
  const invoice: Tables<'invoices'> = {
    id: 'inv-1',
    business_id: 'biz-1',
    sale_id: null,
    customer_id: 'cust-1',
    appointment_id: 'appt-1',
    invoice_number: 'FAC-123456',
    customer_name: 'Ana',
    payment_method: 'efectivo',
    subtotal: 500,
    tax_amount: 0,
    total: 500,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  it('genera un documento de una página sin lanzar, con o sin logo', () => {
    const doc = buildInvoicePdf({
      invoice,
      apptServices: [corte],
      customer: null,
      business: { name: 'Mi Salón' } as never,
      specialistLabel: 'Ana',
      locale: 'es',
      logo: null,
    });

    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('aclara que es un comprobante interno sin valor fiscal', () => {
    const doc = buildInvoicePdf({
      invoice,
      apptServices: [corte],
      customer: null,
      business: { name: 'Mi Salón' } as never,
      specialistLabel: null,
      locale: 'es',
      logo: null,
    });
    // jsPDF escribe el texto sin comprimir dentro del PDF.
    const pdfSource = doc.output();
    expect(pdfSource).toContain('sin valor fiscal');
  });

  it('con un logo inválido, no lanza -- se omite y sigue generando el PDF', () => {
    const doc = buildInvoicePdf({
      invoice,
      apptServices: [],
      customer: null,
      business: null,
      specialistLabel: null,
      locale: 'es',
      logo: { dataUrl: 'data:image/png;base64,not-a-real-image', format: 'PNG' },
    });

    expect(doc.getNumberOfPages()).toBe(1);
  });
});
