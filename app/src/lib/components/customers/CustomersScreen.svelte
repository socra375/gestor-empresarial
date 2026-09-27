<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { t } from '../../stores/locale';
  import { currentBusinessId } from '../../stores/session';
  import { customers as customersStore, customerCredits as creditsStore } from '../../stores/customers';
  import { appointments as appointmentsStore } from '../../stores/appointments';
  import { services as servicesStore } from '../../stores/services';
  import { invoices as invoicesStore } from '../../stores/invoices';
  import { loadCustomers, loadCredits, registerCustomer } from '../../actions/customers';
  import { loadAppointments } from '../../actions/appointments';
  import { loadInvoices } from '../../actions/invoices';
  import { loadSpecialistOptions, type SpecialistOption } from '../../actions/services';
  import { pendingCreditTotal } from '../../utils/customerAccount';
  import CustomerAccountModal from './CustomerAccountModal.svelte';
  import type { Tables } from '../../types/database.types';

  let businessId = $state<string | null>(null);
  let specialistOptions = $state<SpecialistOption[]>([]);
  let viewingCustomer = $state<Tables<'customers'> | null>(null);

  let name = $state('');
  let phone = $state('');
  let address = $state('');
  let email = $state('');
  let submitting = $state(false);

  onMount(() => {
    businessId = get(currentBusinessId);
    if (businessId) void refresh(businessId);
  });

  async function refresh(id: string) {
    const [, , , , options] = await Promise.all([
      loadCustomers(id),
      loadCredits(id),
      loadAppointments(id),
      loadInvoices(id),
      loadSpecialistOptions(id, $t('appt.you_admin'), $t('appt.employee_unnamed')),
    ]);
    specialistOptions = options;
  }

  let saveError = $state('');

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!businessId) return;
    saveError = '';
    submitting = true;
    try {
      await registerCustomer({
        businessId,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || null,
        email: email.trim() || null,
      });
      name = '';
      phone = '';
      address = '';
      email = '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // El trigger enforce_customer_limit responde 'CUSTOMER_LIMIT:<n>'.
      const limit = /CUSTOMER_LIMIT:(\d+)/.exec(msg)?.[1];
      saveError = limit ? $t('cust.limit_reached', { limit }) : $t('cust.save_error', { msg });
    } finally {
      submitting = false;
    }
  }
</script>

<section aria-labelledby="customers-title">
  <h1 id="customers-title">{$t('cfg.tab_customers')}</h1>

  {#if saveError}
    <p role="alert">{saveError}</p>
  {/if}
  <form class="card" onsubmit={handleSubmit}>
    <h2>{$t('cust.form_title')}</h2>

    <div>
      <label for="cust-name">{$t('cust.name_label')}</label>
      <input id="cust-name" type="text" required bind:value={name} />
    </div>

    <div>
      <label for="cust-phone">{$t('cust.phone_label')}</label>
      <input id="cust-phone" type="tel" bind:value={phone} />
    </div>

    <div>
      <label for="cust-address">{$t('cust.address_label')}</label>
      <input id="cust-address" type="text" placeholder={$t('cust.address_placeholder')} bind:value={address} />
    </div>

    <div>
      <label for="cust-email">{$t('cust.email_label')}</label>
      <input id="cust-email" type="email" placeholder={$t('cust.address_placeholder')} bind:value={email} />
    </div>

    <button type="submit" disabled={submitting}>{$t('cust.save')}</button>
  </form>

  <div class="table-responsive">
    <table>
      <thead>
        <tr>
          <th>{$t('cust.th_name')}</th>
          <th>{$t('cust.th_phone')}</th>
          <th>{$t('cust.th_balance')}</th>
          <th>{$t('cust.th_action')}</th>
        </tr>
      </thead>
      <tbody>
        {#each $customersStore as customer (customer.id)}
          <tr>
            <td>{customer.name}</td>
            <td>{customer.phone || 'N/A'}</td>
            <td>
              ${pendingCreditTotal($creditsStore.filter((c) => c.customer_id === customer.id)).toFixed(2)}
            </td>
            <td>
              <button type="button" onclick={() => (viewingCustomer = customer)}>{$t('cust.view_account')}</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if viewingCustomer}
    {@const customer = viewingCustomer}
    <CustomerAccountModal
      {customer}
      credits={$creditsStore.filter((c) => c.customer_id === customer.id)}
      history={$appointmentsStore
        .filter((a) => a.customer_id === customer.id)
        .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())}
      services={$servicesStore}
      invoices={$invoicesStore.filter((inv) => inv.customer_id === customer.id)}
      {specialistOptions}
      onClose={() => (viewingCustomer = null)}
    />
  {/if}
</section>
