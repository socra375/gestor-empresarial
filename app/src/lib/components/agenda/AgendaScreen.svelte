<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { get } from 'svelte/store';
  import { t, locale } from '../../stores/locale';
  import { currentBusinessId, currentBusiness, enabledModules } from '../../stores/session';
  import { appointments as appointmentsStore } from '../../stores/appointments';
  import { services as servicesStore } from '../../stores/services';
  import { customers as customersStore } from '../../stores/customers';
  import { invoices as invoicesStore } from '../../stores/invoices';
  import { changeAppointmentStatus, loadAppointments } from '../../actions/appointments';
  import { loadInvoices, createInvoiceForAppointment } from '../../actions/invoices';
  import { completeAppointment } from '../../actions/completeAppointment';
  import { loadServices, loadSpecialistOptions, type SpecialistOption } from '../../actions/services';
  import { toDateInputValue } from '../../utils/dates';
  import { fmtDate, fmtTime } from '../../utils/format';
  import { apptServices, apptServicesLabel, getAppointmentClientName } from '../../utils/appointments';
  import { apptStatusLabel, type AppointmentStatus } from '../../utils/labels';
  import type { PaymentMethodKey } from '../../utils/payments';
  import { buildInvoicePdf, openInvoicePdf, loadImageAsDataURL } from '../../pdf/invoicePdf';
  import AppointmentForm from './AppointmentForm.svelte';
  import PaymentMethodModal from './PaymentMethodModal.svelte';
  import type { Tables } from '../../types/database.types';

  interface Props {
    /** Abre el formulario de nueva cita de una vez, para cuando se llega acá desde un atajo (p. ej. el Dashboard). */
    autoOpenForm?: boolean;
  }

  const { autoOpenForm = false }: Props = $props();

  let businessId = $state<string | null>(null);
  let specialistOptions = $state<SpecialistOption[]>([]);
  let selectedDate = $state(toDateInputValue(new Date()));
  let formOpen = $state(untrack(() => autoOpenForm));
  let payingAppt = $state<Tables<'appointments'> | null>(null);
  let payingMode = $state<'complete' | 'retry'>('complete');
  let pendingChange = $state<{ apptId: string; status: AppointmentStatus; label: string } | null>(null);
  let errorMessage = $state('');

  const invoicedAppointmentIds = $derived(
    new Set($invoicesStore.filter((inv) => inv.appointment_id).map((inv) => inv.appointment_id as string))
  );
  const dayAppointments = $derived(
    $appointmentsStore.filter((a) => toDateInputValue(new Date(a.start_at)) === selectedDate)
  );
  const isToday = $derived(selectedDate === toDateInputValue(new Date()));

  /** Agrupación visual por franja horaria, no una regla de negocio: 12:00 es el corte mañana/tarde. */
  const AGENDA_SECTIONS: { key: 'morning' | 'afternoon'; labelKey: 'appt.section_morning' | 'appt.section_afternoon' }[] = [
    { key: 'morning', labelKey: 'appt.section_morning' },
    { key: 'afternoon', labelKey: 'appt.section_afternoon' },
  ];
  const morningAppointments = $derived(dayAppointments.filter((a) => new Date(a.start_at).getHours() < 12));
  const afternoonAppointments = $derived(dayAppointments.filter((a) => new Date(a.start_at).getHours() >= 12));
  const appointmentsBySection = $derived({ morning: morningAppointments, afternoon: afternoonAppointments });

  onMount(() => {
    businessId = get(currentBusinessId);
    if (!businessId) return;
    void loadAppointments(businessId);
    void loadServices(businessId);
    void loadInvoices(businessId);
    void loadSpecialistOptions(businessId, $t('appt.you_admin'), $t('appt.employee_unnamed')).then((options) => {
      specialistOptions = options;
    });
  });

  function goToToday() {
    selectedDate = toDateInputValue(new Date());
  }

  function clientNameFor(appt: Tables<'appointments'>): string {
    return getAppointmentClientName(appt, $customersStore, $t('appt.walkin_fallback'));
  }

  function specialistLabelFor(employeeId: string): string {
    return specialistOptions.find((o) => o.id === employeeId)?.label ?? $t('appt.specialist_fallback');
  }

  function requestStatusChange(apptId: string, status: AppointmentStatus, label: string) {
    pendingChange = { apptId, status, label };
  }

  async function confirmStatusChange() {
    if (!pendingChange || !businessId) return;
    const { apptId, status, label } = pendingChange;
    pendingChange = null;
    await changeAppointmentStatus(businessId, apptId, status, $t('act.appt_status_updated', { status: label }));
  }

  function startCompleting(appt: Tables<'appointments'>) {
    // Sin el módulo de facturas, completar es solo un cambio de estado.
    if (!$enabledModules.has('facturas')) {
      requestStatusChange(appt.id, 'completada', $t('appt.btn_complete'));
      return;
    }
    payingMode = 'complete';
    payingAppt = appt;
  }

  function startRetryInvoice(appt: Tables<'appointments'>) {
    payingMode = 'retry';
    payingAppt = appt;
  }

  async function handlePaymentConfirm(paymentMethod: PaymentMethodKey) {
    if (!payingAppt || !businessId) return;
    const appt = payingAppt;
    const mode = payingMode;
    payingAppt = null;
    errorMessage = '';

    const clientName = clientNameFor(appt);
    const business = $currentBusiness;

    try {
      const invoice =
        mode === 'complete'
          ? await completeAppointment({
              businessId,
              appt,
              services: $servicesStore,
              business,
              customerName: clientName,
              paymentMethod,
              statusActivityMessage: $t('act.appt_status_updated', {
                status: apptStatusLabel('completada', $locale),
              }),
              buildInvoiceActivityMessage: (number) => $t('act.invoice_generated', { number }),
            })
          : await createInvoiceForAppointment({
              businessId,
              appt,
              services: $servicesStore,
              business,
              customerId: appt.customer_id,
              customerName: clientName,
              paymentMethod,
              buildActivityMessage: (number) => $t('act.invoice_generated', { number }),
            });

      const customer = $customersStore.find((c) => c.id === invoice.customer_id) ?? null;
      const logo = business?.logo_url ? await loadImageAsDataURL(business.logo_url) : null;
      const doc = buildInvoicePdf({
        invoice,
        apptServices: apptServices(appt, $servicesStore),
        customer,
        business,
        specialistLabel: specialistLabelFor(appt.employee_id),
        locale: $locale,
        logo,
      });
      openInvoicePdf(doc);
    } catch (err) {
      errorMessage = $t('inv.error_generate', { msg: err instanceof Error ? err.message : String(err) });
    }
  }
</script>

<section aria-labelledby="agenda-title" class="agenda-theme">
  <h1 id="agenda-title">{$t('appt.title')}</h1>
  <p>{$t('appt.subtitle')}</p>

  <div class="agenda-toolbar">
    <label for="appt-date-picker">{$t('appt.date_label')}</label>
    <input id="appt-date-picker" type="date" bind:value={selectedDate} />
    <button type="button" onclick={goToToday}>{$t('appt.today_btn')}</button>

    {#if !formOpen}
      <button type="button" onclick={() => (formOpen = true)}>{$t('appt.new_btn')}</button>
    {/if}
  </div>

  {#if formOpen && businessId}
    <AppointmentForm
      {businessId}
      services={$servicesStore}
      {specialistOptions}
      customers={$customersStore}
      initialDate={selectedDate}
      onSaved={() => (formOpen = false)}
      onCancel={() => (formOpen = false)}
    />
  {/if}

  {#if errorMessage}
    <p role="alert">{errorMessage}</p>
  {/if}

  <div class="agenda-list-card">
    <h2 class="agenda-list-title">{isToday ? $t('appt.list_title_today') : $t('appt.list_title_date', { date: fmtDate(`${selectedDate}T00:00:00`, $locale) })}</h2>

    {#if dayAppointments.length === 0}
      <div class="agenda-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 9.5h17M8 3v3M16 3v3" />
          <circle cx="12" cy="14.5" r="2.6" />
          <path d="M12 13.2v1.3l0.9 0.7" />
        </svg>
        <p>{$t('appt.empty')}</p>
      </div>
    {:else}
      {#each AGENDA_SECTIONS as section (section.key)}
        {@const sectionAppointments = appointmentsBySection[section.key]}
        {#if sectionAppointments.length > 0}
          <div class="agenda-section">
            <h3 class="agenda-section-title">{$t(section.labelKey)}</h3>
            <div class="agenda-cards">
              {#each sectionAppointments as appt (appt.id)}
                <article class="appt-card status-{appt.status}">
                  <div class="appt-card-time">{fmtTime(appt.start_at, $locale)}</div>
                  <div class="appt-card-body">
                    <div class="appt-card-main">
                      <strong>{clientNameFor(appt)}</strong>
                      <span class="badge-status status-{appt.status}">{apptStatusLabel(appt.status as AppointmentStatus, $locale)}</span>
                    </div>
                    <p class="appt-card-details">{apptServicesLabel(appt, $servicesStore)} · {specialistLabelFor(appt.employee_id)}</p>
                  </div>
                  <div class="appt-card-actions">
                    {#if pendingChange?.apptId === appt.id}
                      <span role="alertdialog" aria-label={$t('appt.confirm_status', { label: pendingChange.label })}>
                        {$t('appt.confirm_status', { label: pendingChange.label })}
                        <button type="button" onclick={confirmStatusChange}>{pendingChange.label}</button>
                        <button type="button" onclick={() => (pendingChange = null)}>{$t('common.cancel')}</button>
                      </span>
                    {:else if appt.status === 'pendiente'}
                      <button type="button" onclick={() => requestStatusChange(appt.id, 'confirmada', $t('appt.btn_confirm'))}>
                        {$t('appt.btn_confirm')}
                      </button>
                      <button type="button" onclick={() => requestStatusChange(appt.id, 'cancelada', $t('appt.btn_cancel'))}>
                        {$t('appt.btn_cancel')}
                      </button>
                    {:else if appt.status === 'confirmada'}
                      <button type="button" onclick={() => startCompleting(appt)}>{$t('appt.btn_complete')}</button>
                      <button type="button" onclick={() => requestStatusChange(appt.id, 'no_show', $t('appt.btn_noshow'))}>
                        {$t('appt.btn_noshow')}
                      </button>
                      <button type="button" onclick={() => requestStatusChange(appt.id, 'cancelada', $t('appt.btn_cancel'))}>
                        {$t('appt.btn_cancel')}
                      </button>
                    {:else if appt.status === 'completada' && $enabledModules.has('facturas') && !invoicedAppointmentIds.has(appt.id)}
                      <button type="button" onclick={() => startRetryInvoice(appt)}>{$t('appt.btn_invoice')}</button>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  {#if payingAppt}
    <PaymentMethodModal
      appt={payingAppt}
      clientName={clientNameFor(payingAppt)}
      services={$servicesStore}
      customers={$customersStore}
      business={$currentBusiness}
      onConfirm={handlePaymentConfirm}
      onCancel={() => (payingAppt = null)}
    />
  {/if}
</section>

<style>
  /* Tema "premium" de Agenda (oscuro, dorado, acentos con brillo) --
     mismos tokens que AppointmentForm.svelte (cada componente Svelte
     tiene su propio <style> aislado, así que se repiten a propósito). */
  .agenda-theme {
    --at-bg: #1c1c1e;
    --at-border: #35353a;
    --at-glow: #35c3f0;
    --at-gold: #d8b878;
    --at-input-bg: #17171a;
    --at-text: #f0ece4;
    --at-muted: #9b9994;
    --at-teal-1: #1f7a86;
    --at-teal-2: #0f3d44;
  }

  .agenda-toolbar,
  .agenda-list-card {
    background: linear-gradient(160deg, var(--at-bg), #151517);
    border: 1px solid var(--at-border);
    border-radius: 16px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }

  .agenda-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
  }

  .agenda-toolbar label {
    color: var(--at-muted);
    font-size: 0.78rem;
    width: 100%;
  }

  .agenda-toolbar input,
  .agenda-toolbar button {
    background: var(--at-input-bg);
    border: 1px solid var(--at-border);
    color: var(--at-text);
    border-radius: 10px;
  }

  .agenda-toolbar button {
    border-color: var(--at-teal-1);
    color: #7fd6e0;
    font-weight: 600;
  }

  .agenda-list-title {
    font-family: var(--font-grotesk);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 1rem;
    color: var(--at-gold);
    margin: 0 0 1rem;
  }

  .agenda-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    color: var(--at-muted);
  }

  .agenda-empty svg {
    width: 2.75rem;
    height: 2.75rem;
    color: var(--at-muted);
    opacity: 0.7;
  }

  .agenda-empty p {
    margin: 0;
  }

  /* Agenda visual por franjas horarias (Mañana/Tarde), con un acento de
     color por tarjeta igual al de los badges de estado (.status-*) --
     inspirado en un calendario, sin ser un calendario real: nada de
     posicionamiento absoluto por hora, solo agrupación y jerarquía visual. */
  .agenda-section + .agenda-section {
    margin-top: 1.25rem;
  }

  .agenda-section-title {
    font-family: var(--font-grotesk);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--at-muted);
    margin: 0 0 0.6rem;
  }

  .agenda-cards {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .appt-card {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    background: var(--at-input-bg);
    border: 1px solid var(--at-border);
    border-left: 4px solid var(--at-muted);
    border-radius: 10px;
    padding: 0.75rem 1rem;
  }

  .appt-card.status-pendiente {
    border-left-color: var(--accent-recommend);
  }

  .appt-card.status-confirmada {
    border-left-color: #3b82f6;
  }

  .appt-card.status-completada {
    border-left-color: var(--accent-profit);
  }

  .appt-card.status-cancelada {
    border-left-color: var(--text-muted);
  }

  .appt-card.status-no_show {
    border-left-color: var(--accent-expense);
  }

  .appt-card-time {
    font-family: var(--font-grotesk);
    font-weight: 700;
    font-size: 1rem;
    color: var(--at-text);
    min-width: 3.5rem;
    flex-shrink: 0;
  }

  .appt-card-body {
    flex: 1;
    min-width: 0;
  }

  .appt-card-main {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .appt-card-main strong {
    color: var(--at-text);
  }

  .appt-card-details {
    margin: 0.25rem 0 0;
    color: var(--at-muted);
    font-size: 0.85rem;
  }

  .appt-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .appt-card-actions button {
    font-size: 0.85rem;
    padding: 0.4rem 0.7rem;
    background: var(--at-input-bg);
    border: 1px solid var(--at-teal-1);
    color: #7fd6e0;
  }

  @media (max-width: 640px) {
    .appt-card {
      flex-direction: column;
    }
  }
</style>
