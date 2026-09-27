<script lang="ts">
  import { t, locale } from '../../stores/locale';
  import { currentBusiness, enabledModules } from '../../stores/session';
  import { payCredit } from '../../actions/customers';
  import { createInvoiceForAppointment } from '../../actions/invoices';
  import { summarizeCustomerHistory, pendingCreditTotal, monthlySpendingSummary } from '../../utils/customerAccount';
  import { apptServices, apptServicesLabel } from '../../utils/appointments';
  import { apptStatusLabel, creditStatusLabel, type AppointmentStatus, type CreditStatus } from '../../utils/labels';
  import { fmtDate, fmtDateTime, fmtMonthYear } from '../../utils/format';
  import { buildInvoicePdf, openInvoicePdf, loadImageAsDataURL } from '../../pdf/invoicePdf';
  import Modal from '../shared/Modal.svelte';
  import PaymentMethodModal from '../agenda/PaymentMethodModal.svelte';
  import type { PaymentMethodKey } from '../../utils/payments';
  import type { SpecialistOption } from '../../actions/services';
  import type { Tables } from '../../types/database.types';

  interface Props {
    customer: Tables<'customers'>;
    credits: Tables<'customer_credits'>[];
    history: Tables<'appointments'>[];
    services: Tables<'services'>[];
    invoices: Tables<'invoices'>[];
    specialistOptions: SpecialistOption[];
    onClose: () => void;
  }

  const { customer, credits, history, services, invoices, specialistOptions, onClose }: Props = $props();

  const summary = $derived(summarizeCustomerHistory(history));
  const pendingTotal = $derived(pendingCreditTotal(credits));
  const pendingCredits = $derived(credits.filter((c) => c.status !== 'pagado'));
  const monthlySummary = $derived(monthlySpendingSummary(history, services, invoices, credits));

  let invoicingAppt = $state<Tables<'appointments'> | null>(null);
  let invoiceErrorMessage = $state('');

  let selectedCreditId = $state('');
  let amountToPay = $state('');
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);
  let submitting = $state(false);

  function specialistLabel(employeeId: string): string {
    return specialistOptions.find((opt) => opt.id === employeeId)?.label ?? $t('appt.specialist_fallback');
  }

  function serviceName(id: string): string {
    return services.find((s) => s.id === id)?.name ?? $t('cust.no_record');
  }

  async function handlePayment(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;
    const amount = parseFloat(amountToPay);
    if (!selectedCreditId || !(amount > 0)) {
      statusMessage = { kind: 'error', text: $t('cust.invalid_credit') };
      return;
    }

    submitting = true;
    try {
      await payCredit({ creditId: selectedCreditId, amountToPay: amount });
      statusMessage = { kind: 'success', text: $t('cust.payment_success') };
      amountToPay = '';
      selectedCreditId = '';
    } catch (err) {
      statusMessage = {
        kind: 'error',
        text: $t('cust.payment_error', { msg: err instanceof Error ? err.message : String(err) }),
      };
    } finally {
      submitting = false;
    }
  }

  /**
   * Igual que el "Facturar" de una cita completada sin factura en Agenda
   * (`startRetryInvoice`) -- reutiliza la misma orquestación y el mismo
   * dibujo de PDF, solo que el punto de entrada es el resumen mensual de
   * la cuenta del cliente en vez de la lista del día.
   */
  async function handleInvoiceConfirm(paymentMethod: PaymentMethodKey) {
    if (!invoicingAppt) return;
    const appt = invoicingAppt;
    invoicingAppt = null;
    invoiceErrorMessage = '';

    const business = $currentBusiness;

    try {
      const invoice = await createInvoiceForAppointment({
        businessId: customer.business_id,
        appt,
        services,
        business,
        customerId: customer.id,
        customerName: customer.name,
        paymentMethod,
        buildActivityMessage: (number) => $t('act.invoice_generated', { number }),
      });

      const logo = business?.logo_url ? await loadImageAsDataURL(business.logo_url) : null;
      const doc = buildInvoicePdf({
        invoice,
        apptServices: apptServices(appt, services),
        customer,
        business,
        specialistLabel: specialistLabel(appt.employee_id),
        locale: $locale,
        logo,
      });
      openInvoicePdf(doc);
    } catch (err) {
      invoiceErrorMessage = $t('inv.error_generate', { msg: err instanceof Error ? err.message : String(err) });
    }
  }
</script>

<Modal labelledBy="account-title" {onClose}>
  <div class="card">
  <div>
    <h2 id="account-title">{$t('cust.account_title', { name: customer.name })}</h2>
    <button type="button" onclick={onClose}>{$t('cust.close')}</button>
  </div>
  <p>{$t('cust.phone_prefix', { phone: customer.phone || 'N/A' })}</p>
  <p>{$t('cust.pending_title')} ${pendingTotal.toFixed(2)}</p>

  <div class="card">
    <h3>{$t('cust.history_title')}</h3>
    <div>
      <div>
        <strong>{$t('cust.last_visit')}</strong>
        {summary.lastVisitAt ? fmtDate(summary.lastVisitAt, $locale) : $t('cust.no_record')}
      </div>
      <div>
        <strong>{$t('cust.top_service')}</strong>
        {summary.topServiceId ? serviceName(summary.topServiceId) : $t('cust.no_record')}
      </div>
      <div>
        <strong>{$t('cust.top_specialist')}</strong>
        {summary.topSpecialistId ? specialistLabel(summary.topSpecialistId) : $t('cust.no_record')}
      </div>
    </div>

    {#if history.length > 0}
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>{$t('cust.th_date')}</th>
              <th>{$t('cust.th_service')}</th>
              <th>{$t('cust.th_specialist')}</th>
              <th>{$t('cust.th_status')}</th>
            </tr>
          </thead>
          <tbody>
            {#each history as appt (appt.id)}
              <tr>
                <td>{fmtDateTime(appt.start_at, $locale)}</td>
                <td>{apptServicesLabel(appt, services)}</td>
                <td>{specialistLabel(appt.employee_id)}</td>
                <td>{apptStatusLabel(appt.status as AppointmentStatus, $locale)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p>{$t('cust.history_empty')}</p>
    {/if}
  </div>

  <div class="card">
    <h3>{$t('cust.monthly_title')}</h3>
    {#if monthlySummary.length === 0}
      <p>{$t('cust.monthly_empty')}</p>
    {:else}
      <ul>
        {#each monthlySummary as month (month.monthKey)}
          <li>
            <div>
              <strong>{fmtMonthYear(month.year, month.month, $locale)}</strong>
              {$t(month.visitCount === 1 ? 'cust.monthly_visit' : 'cust.monthly_visits', { n: month.visitCount })}
              — ${month.total.toFixed(2)}
            </div>
            {#if month.pendingInvoice.length > 0}
              <ul>
                {#each month.pendingInvoice as appt (appt.id)}
                  <li>
                    {$t('cust.monthly_pending_label')} {fmtDate(appt.start_at, $locale)} · {apptServicesLabel(appt, services)}
                    {#if $enabledModules.has('facturas')}
                      <button type="button" onclick={() => (invoicingAppt = appt)}>{$t('appt.btn_invoice')}</button>
                    {/if}
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    {#if invoiceErrorMessage}
      <p role="alert">{invoiceErrorMessage}</p>
    {/if}
  </div>

  <h3>{$t('cust.credits_title')}</h3>
  <div class="table-responsive">
    <table>
      <thead>
        <tr>
          <th>{$t('cust.th_date')}</th>
          <th>{$t('cust.th_amount')}</th>
          <th>{$t('cust.th_paid')}</th>
          <th>{$t('cust.th_status')}</th>
        </tr>
      </thead>
      <tbody>
        {#each credits as credit (credit.id)}
          <tr>
            <td>{credit.created_at ? fmtDate(credit.created_at, $locale) : ''}</td>
            <td>${Number(credit.amount).toFixed(2)}</td>
            <td>${Number(credit.amount_paid).toFixed(2)}</td>
            <td>{creditStatusLabel(credit.status as CreditStatus, $locale)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if pendingCredits.length > 0}
    <form onsubmit={handlePayment}>
      <h3>{$t('cust.payment_form_title')}</h3>

      <label for="payment-credit-select">{$t('cust.select_credit')}</label>
      <select id="payment-credit-select" bind:value={selectedCreditId} required>
        <option value="" disabled></option>
        {#each pendingCredits as credit (credit.id)}
          <option value={credit.id}>
            {$t('cust.credit_option', {
              date: credit.created_at ? fmtDate(credit.created_at, $locale) : '',
              amount: (Number(credit.amount) - Number(credit.amount_paid)).toFixed(2),
            })}
          </option>
        {/each}
      </select>

      <label for="payment-amount">{$t('cust.amount_to_pay')}</label>
      <input id="payment-amount" type="number" step="0.01" required bind:value={amountToPay} />

      {#if statusMessage}
        <p role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
      {/if}

      <button type="submit" disabled={submitting}>{$t('cust.process_payment')}</button>
    </form>
  {/if}
  </div>
</Modal>

{#if invoicingAppt}
  <PaymentMethodModal
    appt={invoicingAppt}
    clientName={customer.name}
    {services}
    customers={[customer]}
    business={$currentBusiness}
    onConfirm={handleInvoiceConfirm}
    onCancel={() => (invoicingAppt = null)}
  />
{/if}
