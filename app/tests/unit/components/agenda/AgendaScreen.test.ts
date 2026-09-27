import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoA11yViolations } from '../../support/axe';

const appointmentsActionsMock = vi.hoisted(() => ({ changeAppointmentStatus: vi.fn(), loadAppointments: vi.fn() }));
vi.mock('../../../../src/lib/actions/appointments', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/appointments')>(
      '../../../../src/lib/actions/appointments'
    );
  return { ...actual, ...appointmentsActionsMock };
});

const invoicesActionsMock = vi.hoisted(() => ({
  loadInvoices: vi.fn(),
  createInvoiceForAppointment: vi.fn(),
}));
vi.mock('../../../../src/lib/actions/invoices', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/invoices')>('../../../../src/lib/actions/invoices');
  return { ...actual, ...invoicesActionsMock };
});

const completeAppointmentActionsMock = vi.hoisted(() => ({ completeAppointment: vi.fn() }));
vi.mock('../../../../src/lib/actions/completeAppointment', () => completeAppointmentActionsMock);

const servicesActionsMock = vi.hoisted(() => ({ loadSpecialistOptions: vi.fn(), loadServices: vi.fn() }));
vi.mock('../../../../src/lib/actions/services', async () => {
  const actual =
    await vi.importActual<typeof import('../../../../src/lib/actions/services')>('../../../../src/lib/actions/services');
  return { ...actual, ...servicesActionsMock };
});

const pdfMock = vi.hoisted(() => ({
  buildInvoicePdf: vi.fn(),
  openInvoicePdf: vi.fn(),
  loadImageAsDataURL: vi.fn(),
}));
vi.mock('../../../../src/lib/pdf/invoicePdf', () => pdfMock);

const { default: AgendaScreen } = await import('../../../../src/lib/components/agenda/AgendaScreen.svelte');
const { currentBusinessId, currentBusiness } = await import('../../../../src/lib/stores/session');
const { appointments } = await import('../../../../src/lib/stores/appointments');
const { services } = await import('../../../../src/lib/stores/services');
const { customers } = await import('../../../../src/lib/stores/customers');
const { invoices } = await import('../../../../src/lib/stores/invoices');

const corte = { id: 'svc-1', business_id: 'biz-1', name: 'Corte', category: null, duration_minutes: 30, price: 500, active: true, created_at: null };

function toDateInputValue(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function todayAt(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const pendingAppt = {
  id: 'appt-1',
  business_id: 'biz-1',
  customer_id: null,
  employee_id: 'biz-1',
  service_id: 'svc-1',
  service_ids: null,
  start_at: todayAt(10),
  end_at: todayAt(11),
  status: 'pendiente',
  price: 500,
  notes: 'WALKIN:María',
  created_at: null,
};

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  currentBusinessId.set('biz-1');
  currentBusiness.set({ id: 'biz-1', name: 'Mi Salón' } as never);
  appointments.set([]);
  services.set([corte]);
  customers.set([]);
  invoices.set([]);
  servicesActionsMock.loadSpecialistOptions.mockResolvedValue([{ id: 'biz-1', label: 'Tú (Administrador/a)' }]);
  servicesActionsMock.loadServices.mockResolvedValue(undefined);
  invoicesActionsMock.loadInvoices.mockResolvedValue(undefined);
  appointmentsActionsMock.loadAppointments.mockResolvedValue(undefined);
});

describe('AgendaScreen', () => {
  it('al montar, carga facturas y opciones de especialistas del negocio actual', async () => {
    render(AgendaScreen);
    await vi.waitFor(() => expect(invoicesActionsMock.loadInvoices).toHaveBeenCalledWith('biz-1'));
    expect(servicesActionsMock.loadSpecialistOptions).toHaveBeenCalledWith('biz-1', 'Tú (Administrador/a)', 'Empleado sin nombre');
  });

  it('lista las citas del día seleccionado (hoy por defecto) con el nombre walk-in', async () => {
    appointments.set([pendingAppt] as never);
    render(AgendaScreen);
    expect(await screen.findByText('María')).toBeTruthy();
    expect(screen.getByText('Citas de hoy')).toBeTruthy();
  });

  it('agrupa las citas en "Mañana" y "Tarde" según la hora', async () => {
    appointments.set([
      { ...pendingAppt, id: 'appt-morning', start_at: todayAt(10), notes: 'WALKIN:María' },
      { ...pendingAppt, id: 'appt-afternoon', start_at: todayAt(16), notes: 'WALKIN:Laura' },
    ] as never);
    const { container } = render(AgendaScreen);
    await screen.findByText('María');
    await screen.findByText('Laura');

    expect(screen.getByText('Mañana')).toBeTruthy();
    expect(screen.getByText('Tarde')).toBeTruthy();

    const sections = container.querySelectorAll('.agenda-section');
    expect(sections).toHaveLength(2);
    expect(sections[0]?.textContent).toContain('María');
    expect(sections[0]?.textContent).not.toContain('Laura');
    expect(sections[1]?.textContent).toContain('Laura');
    expect(sections[1]?.textContent).not.toContain('María');
  });

  it('sin citas de tarde, no muestra el encabezado "Tarde"', async () => {
    appointments.set([pendingAppt] as never);
    render(AgendaScreen);
    await screen.findByText('María');

    expect(screen.getByText('Mañana')).toBeTruthy();
    expect(screen.queryByText('Tarde')).toBeNull();
  });

  it('una cita "pendiente" pide confirmación inline antes de cambiar de estado', async () => {
    appointmentsActionsMock.changeAppointmentStatus.mockResolvedValue(undefined);
    appointments.set([pendingAppt] as never);
    render(AgendaScreen);
    await screen.findByText('María');

    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(appointmentsActionsMock.changeAppointmentStatus).not.toHaveBeenCalled();
    expect(screen.getByText('¿Confirmas marcar esta cita como "Confirmar"?')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(appointmentsActionsMock.changeAppointmentStatus).toHaveBeenCalledWith(
      'biz-1',
      'appt-1',
      'confirmada',
      expect.any(String)
    );
  });

  it('completar una cita "confirmada" abre el modal de método de pago', async () => {
    appointments.set([{ ...pendingAppt, status: 'confirmada' }] as never);
    render(AgendaScreen);
    await screen.findByText('María');

    await fireEvent.click(screen.getByRole('button', { name: 'Completar' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('confirmar el pago al completar orquesta completeAppointment y abre el PDF', async () => {
    completeAppointmentActionsMock.completeAppointment.mockResolvedValue({ id: 'inv-1', customer_id: null });
    pdfMock.buildInvoicePdf.mockReturnValue({});
    appointments.set([{ ...pendingAppt, status: 'confirmada' }] as never);
    render(AgendaScreen);
    await screen.findByText('María');

    await fireEvent.click(screen.getByRole('button', { name: 'Completar' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Completar' }));

    await vi.waitFor(() => expect(completeAppointmentActionsMock.completeAppointment).toHaveBeenCalled());
    expect(pdfMock.buildInvoicePdf).toHaveBeenCalled();
    expect(pdfMock.openInvoicePdf).toHaveBeenCalled();
  });

  it('una cita completada sin facturar todavía muestra el botón "Facturar"', async () => {
    appointments.set([{ ...pendingAppt, status: 'completada' }] as never);
    invoices.set([]);
    render(AgendaScreen);
    expect(await screen.findByRole('button', { name: 'Facturar' })).toBeTruthy();
  });

  it('una cita completada ya facturada no muestra ninguna acción', async () => {
    appointments.set([{ ...pendingAppt, status: 'completada' }] as never);
    invoices.set([{ id: 'inv-1', appointment_id: 'appt-1' }] as never);
    render(AgendaScreen);
    await screen.findByText('María');
    expect(screen.queryByRole('button', { name: 'Facturar' })).toBeNull();
  });

  it('con autoOpenForm, el formulario de nueva cita ya está abierto al montar', async () => {
    render(AgendaScreen, { props: { autoOpenForm: true } });
    expect(await screen.findByRole('button', { name: 'Cancelar' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '+ Nueva Cita' })).toBeNull();
  });

  it('cambiar la fecha del selector actualiza el título de la lista', async () => {
    render(AgendaScreen);
    await screen.findByText('Citas de hoy');

    const otherDate = toDateInputValue(new Date('2020-01-01T12:00:00'));
    await fireEvent.input(screen.getByLabelText('Fecha'), { target: { value: otherDate } });

    expect(screen.getByText(/Citas del/)).toBeTruthy();
  });

  describe('recordatorios por WhatsApp', () => {
    function tomorrowAt(hour: number) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    }
    const ana = { id: 'cust-1', business_id: 'biz-1', name: 'Ana Pérez', phone: '809-555-1234', notes: null, address: null, email: null, created_at: null };
    const tomorrowAppt = {
      ...pendingAppt,
      id: 'appt-manana',
      customer_id: 'cust-1',
      notes: null,
      status: 'confirmada',
      start_at: tomorrowAt(15),
      end_at: tomorrowAt(16),
    };

    it('avisa cuántas citas de mañana falta recordar y lleva a ese día', async () => {
      customers.set([ana]);
      appointments.set([tomorrowAppt]);
      currentBusiness.set({ id: 'biz-1', name: 'Salón Demo', address: 'Av. Duarte 123' } as never);
      render(AgendaScreen);

      expect(await screen.findByText('Mañana tienes 1 cita(s) para recordar por WhatsApp.')).toBeTruthy();
      await fireEvent.click(screen.getByRole('button', { name: 'Ver mañana' }));

      const link = await screen.findByRole('link', { name: 'Recordar por WhatsApp' });
      const href = link.getAttribute('href') ?? '';
      expect(href.startsWith('https://wa.me/18095551234?text=')).toBe(true);
      const message = decodeURIComponent(href.split('text=')[1] ?? '');
      expect(message).toContain('Hola Ana Pérez');
      expect(message).toContain('Salón Demo');
      expect(message).toContain('Corte');
      expect(message).toContain('📍 Av. Duarte 123.');
      expect(link.getAttribute('target')).toBe('_blank');
    });

    it('al tocarlo queda marcado como recordado y el aviso desaparece', async () => {
      customers.set([ana]);
      appointments.set([tomorrowAppt]);
      render(AgendaScreen);
      await fireEvent.click(await screen.findByRole('button', { name: 'Ver mañana' }));

      await fireEvent.click(await screen.findByRole('link', { name: 'Recordar por WhatsApp' }));

      expect(await screen.findByRole('link', { name: '✓ Recordado · reenviar' })).toBeTruthy();
      expect(screen.queryByText(/para recordar por WhatsApp/)).toBeNull();
    });

    it('sin teléfono del cliente (o en una cita sin cliente) no hay botón', async () => {
      customers.set([{ ...ana, phone: null }]);
      appointments.set([tomorrowAppt, { ...pendingAppt, start_at: tomorrowAt(10), end_at: tomorrowAt(11) }]);
      render(AgendaScreen);

      expect(screen.queryByText(/para recordar por WhatsApp/)).toBeNull();
      expect(screen.queryByRole('link', { name: 'Recordar por WhatsApp' })).toBeNull();
    });
  });

  it('sin violaciones de accesibilidad (axe-core), con el formulario y el modal de pago abiertos', async () => {
    appointments.set([{ ...pendingAppt, status: 'confirmada' }] as never);
    const { container } = render(AgendaScreen);
    await screen.findByText('María');

    await fireEvent.click(screen.getByRole('button', { name: '+ Nueva Cita' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Completar' }));

    await expectNoA11yViolations(container);
  });
});
