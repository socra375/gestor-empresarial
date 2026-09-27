import { jsPDF } from 'jspdf';
import { t, type Locale } from '../i18n';
import { paymentMethodLabel } from '../utils/payments';
import { fmtDate } from '../utils/format';
import type { Tables } from '../types/database.types';

export interface InvoiceLineItem {
  desc: string;
  price: number;
}

/**
 * Una línea por servicio de la cita (puede tener varios); si no se
 * encuentra ninguno (factura vieja, o la cita ya no está en la snapshot),
 * cae a una única línea de reserva con el total ya guardado en la
 * factura -- igual que el legado.
 */
export function invoiceLineItems(
  services: Tables<'services'>[],
  specialistSuffix: string,
  fallbackDescription: string,
  fallbackPrice: number
): InvoiceLineItem[] {
  if (services.length > 0) {
    return services.map((s) => ({ desc: s.name + specialistSuffix, price: Number(s.price || 0) }));
  }
  return [{ desc: fallbackDescription + specialistSuffix, price: fallbackPrice }];
}

export interface LoadedImage {
  dataUrl: string;
  format: 'PNG' | 'WEBP' | 'JPEG';
}

/** Descarga una imagen (p. ej. el logo en Supabase Storage) como data URL para incrustarla en el PDF. */
export async function loadImageAsDataURL(url: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const format = blob.type.includes('png') ? 'PNG' : blob.type.includes('webp') ? 'WEBP' : 'JPEG';
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null;
  }
}

export interface InvoicePdfParams {
  invoice: Tables<'invoices'>;
  apptServices: Tables<'services'>[];
  customer: Tables<'customers'> | null;
  business: Tables<'businesses'> | null;
  specialistLabel: string | null;
  locale: Locale;
  logo: LoadedImage | null;
}

/**
 * Dibuja el PDF de la factura con la estructura tipo "Nota de Remisión"
 * del legado: encabezado con datos del cliente, tabla de servicio y
 * totales, pie con los datos de contacto del salón. Puro respecto al DOM
 * -- no abre nada; `openInvoicePdf` hace eso.
 */
export function buildInvoicePdf(params: InvoicePdfParams): jsPDF {
  const { invoice, apptServices, customer, business, specialistLabel, locale } = params;
  const doc = new jsPDF();
  const b = business || {};
  const curr = (b as Tables<'businesses'>).currency_symbol || '$';
  const pageW = 210;
  const marginL = 14;
  const marginR = 196;
  const rowH = 8;
  const tt = (key: Parameters<typeof t>[1], vars?: Record<string, string | number>) => t(locale, key, vars);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(30);
  doc.text(tt('pdf.title'), pageW / 2, 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(tt('pdf.subtitle'), pageW / 2, 30, { align: 'center' });

  let y = 40;
  const drawRow = (leftLabel: string, leftVal: string, rightLabel: string | null, rightVal: string | null, dark?: boolean) => {
    doc.setDrawColor(35, 43, 66);
    doc.rect(marginL, y, marginR - marginL, rowH);
    if (rightLabel) {
      const splitX = marginL + (marginR - marginL) * 0.68;
      doc.line(splitX, y, splitX, y + rowH);
      if (dark) {
        doc.setFillColor(26, 26, 26);
        doc.rect(splitX, y, marginR - splitX, rowH, 'F');
        doc.setTextColor(255, 255, 255);
      }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${rightLabel}${rightVal ? ': ' + rightVal : ''}`, splitX + 3, y + rowH / 2 + 1.5);
      doc.setTextColor(0, 0, 0);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${leftLabel}: `, marginL + 3, y + rowH / 2 + 1.5);
    doc.setFont('helvetica', 'normal');
    const labelW = doc.getTextWidth(`${leftLabel}: `);
    doc.text(String(leftVal || ''), marginL + 3 + labelW, y + rowH / 2 + 1.5);
    y += rowH;
  };

  drawRow(tt('pdf.invoice_no'), invoice.invoice_number, tt('pdf.date'), fmtDate(invoice.created_at ?? new Date(), locale), true);
  drawRow(tt('pdf.client'), invoice.customer_name || customer?.name || 'N/A', null, null);
  drawRow(tt('pdf.address'), customer?.address || '', null, null);
  drawRow(tt('pdf.email'), customer?.email || '', tt('pdf.phone'), customer?.phone || '');
  drawRow(tt('pdf.payment_method'), paymentMethodLabel(invoice.payment_method ?? '', locale), null, null);
  y += 4;

  const cols = [
    { label: tt('pdf.quantity'), w: 0.15 },
    { label: tt('pdf.description'), w: 0.45 },
    { label: tt('pdf.unit_price'), w: 0.2 },
    { label: tt('pdf.amount'), w: 0.2 },
  ];
  const tableW = marginR - marginL;
  let cx = marginL;
  doc.setFillColor(26, 26, 26);
  doc.rect(marginL, y, tableW, rowH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  cols.forEach((col) => {
    doc.text(col.label, cx + 3, y + rowH / 2 + 1.5);
    cx += tableW * col.w;
  });
  doc.setTextColor(0, 0, 0);
  y += rowH;

  const specialistSuffix = specialistLabel ? ' — ' + tt('pdf.specialist_prefix') + ': ' + specialistLabel : '';
  const lines = invoiceLineItems(apptServices, specialistSuffix, tt('inv.service_fallback'), Number(invoice.total));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  lines.forEach((line) => {
    const rowVals = ['1', line.desc, `${curr}${line.price.toFixed(2)}`, `${curr}${line.price.toFixed(2)}`];
    cx = marginL;
    doc.rect(marginL, y, tableW, rowH);
    cols.forEach((col, i) => {
      doc.text(String(rowVals[i]).substring(0, 45), cx + 3, y + rowH / 2 + 1.5);
      cx += tableW * col.w;
    });
    y += rowH;
  });
  y += 4;

  const totalsW = 70;
  const totalsX = marginR - totalsW;
  const totalRows: [string, string][] = [
    [tt('pdf.subtotal'), `${curr}${Number(invoice.subtotal).toFixed(2)}`],
    [tt('pdf.tax'), `${curr}${Number(invoice.tax_amount).toFixed(2)}`],
    [tt('pdf.total'), `${curr}${Number(invoice.total).toFixed(2)}`],
  ];
  totalRows.forEach(([label, val]) => {
    doc.setFillColor(26, 26, 26);
    doc.rect(totalsX, y, totalsW * 0.5, rowH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, totalsX + 3, y + rowH / 2 + 1.5);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.rect(totalsX + totalsW * 0.5, y, totalsW * 0.5, rowH);
    doc.text(val, totalsX + totalsW * 0.5 + 3, y + rowH / 2 + 1.5);
    y += rowH;
  });

  y += 10;
  const logo = params.logo;
  const nameX = logo ? marginL + 16 : marginL;
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, marginL, y - 10, 14, 14);
    } catch {
      // Logo inválido: se omite, la factura se genera igual.
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text((b as Tables<'businesses'>).name || 'Mi Salón', nameX, y);

  y += 12;
  doc.setDrawColor(0, 0, 0);
  doc.line(marginL, y, marginR, y);
  y += 6;
  const footerCols: [string, string][] = [
    [tt('pdf.address_footer'), (b as Tables<'businesses'>).address || 'N/A'],
    [tt('pdf.phone_footer'), (b as Tables<'businesses'>).phone || 'N/A'],
    [tt('pdf.website_footer'), (b as Tables<'businesses'>).website || 'N/A'],
  ];
  const footerColW = tableW / 3;
  footerCols.forEach(([label, val], i) => {
    const fx = marginL + footerColW * i;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(label, fx, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(val), fx, y + 5);
  });

  // Este PDF no es un comprobante fiscal (hay negocios de varios países): se
  // aclara siempre para que nadie lo use como factura con valor tributario.
  y += 16;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(doc.splitTextToSize(tt('pdf.non_fiscal'), tableW), pageW / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  return doc;
}

/** Abre el PDF en una pestaña nueva (no fuerza la descarga) -- el navegador la ofrece desde su propio visor. */
export function openInvoicePdf(doc: jsPDF): void {
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl as unknown as string, '_blank');
}
