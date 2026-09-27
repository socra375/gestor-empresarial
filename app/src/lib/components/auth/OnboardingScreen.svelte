<script lang="ts">
  import { t } from '../../stores/locale';
  import { currentBusinessId } from '../../stores/session';
  import { completeOnboarding, type OnboardingResult } from '../../actions/auth';
  import { finishSignup } from '../../actions/plans';

  interface Props {
    onCompleted: (result: OnboardingResult) => void;
  }

  const { onCompleted }: Props = $props();

  const CURRENCIES = [
    { code: 'USD', symbol: '$', labelKey: 'onboarding.currency_usd' },
    { code: 'CAD', symbol: 'CA$', labelKey: 'onboarding.currency_cad' },
    { code: 'DOP', symbol: 'RD$', labelKey: 'onboarding.currency_dop' },
    { code: 'MXN', symbol: 'MXN$', labelKey: 'onboarding.currency_mxn' },
    { code: 'COP', symbol: 'COP$', labelKey: 'onboarding.currency_cop' },
    { code: 'ARS', symbol: 'ARS$', labelKey: 'onboarding.currency_ars' },
    { code: 'CLP', symbol: 'CLP$', labelKey: 'onboarding.currency_clp' },
    { code: 'PEN', symbol: 'S/', labelKey: 'onboarding.currency_pen' },
    { code: 'EUR', symbol: '€', labelKey: 'onboarding.currency_eur' },
  ] as const;

  let businessName = $state('');
  let businessType = $state<'individual' | 'group' | ''>('');
  let currencyCode = $state('');
  let submitting = $state(false);
  let errorMessage = $state('');

  const isValid = $derived(businessName.trim().length > 1 && businessType !== '' && currencyCode !== '');
  const typeHint = $derived(
    businessType === 'individual'
      ? $t('onboarding.type_hint_individual')
      : businessType === 'group'
        ? $t('onboarding.type_hint_group')
        : $t('onboarding.type_hint_default')
  );

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = '';

    const name = businessName.trim();
    // Defensa además del botón deshabilitado -- por si el formulario se
    // envía sin pasar por el botón (p. ej. Enter en un campo de texto).
    if (!name || !businessType || !currencyCode) {
      errorMessage = $t('onboarding.name_required');
      return;
    }

    const businessId = $currentBusinessId;
    if (!businessId) return;

    const currency = CURRENCIES.find((c) => c.code === currencyCode);

    submitting = true;
    try {
      const result = await completeOnboarding({
        businessId,
        name,
        type: businessType,
        teamSize: null,
        currencySymbol: currency?.symbol ?? '$',
      });
      await finishSignup();
      onCompleted(result);
    } finally {
      submitting = false;
    }
  }
</script>

<section class="onboarding-page" aria-labelledby="onboarding-title">
  <div class="onboarding-card">
    <div class="onboarding-brand">
      <img src="{import.meta.env.BASE_URL}logo-256.png" alt="" />
      Gestor Empresarial
    </div>

    <h1 id="onboarding-title">{$t('onboarding.title')}</h1>
    <p class="onboarding-lead">{$t('onboarding.subtitle')}</p>

    <form onsubmit={handleSubmit}>
      <div class="group">
        <label for="onb-business-name">{$t('onboarding.business_name_label')}</label>
        <div class="control">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9l1.5-5h13L20 9" />
            <path d="M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9" />
            <path d="M5.5 11.5V20h13v-8.5" />
            <path d="M10 20v-4.5h4V20" />
          </svg>
          <!-- Sin `required` nativo a propósito: handleSubmit valida esto con
               un mensaje traducido y anunciado (role="alert") -- un tooltip de
               validación nativo del navegador ni se traduce ni lo anuncia un
               lector de pantalla igual de bien. -->
          <input
            id="onb-business-name"
            type="text"
            placeholder={$t('onboarding.business_name_placeholder')}
            autocomplete="organization"
            maxlength="60"
            bind:value={businessName}
          />
        </div>
      </div>

      <fieldset class="group">
        <legend>{$t('onboarding.business_type_label')}</legend>
        <div class="seg">
          <div>
            <input type="radio" name="onb-type" id="onb-type-individual" value="individual" bind:group={businessType} />
            <label for="onb-type-individual">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="3.6" />
                <path d="M5 20c.6-3.6 3.4-5.6 7-5.6s6.4 2 7 5.6" />
              </svg>
              {$t('onboarding.type_individual')}
            </label>
          </div>
          <div>
            <input type="radio" name="onb-type" id="onb-type-group" value="group" bind:group={businessType} />
            <label for="onb-type-group">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="8.5" r="3.2" />
                <path d="M3 19.5c.5-3.2 2.8-5 6-5s5.5 1.8 6 5" />
                <circle cx="17" cy="9.5" r="2.6" />
                <path d="M16.5 14.8c2.6.1 4.1 1.6 4.5 4.2" />
              </svg>
              {$t('onboarding.type_group')}
            </label>
          </div>
        </div>
        <p class="hint" aria-live="polite">{typeHint}</p>
      </fieldset>

      <div class="group">
        <label for="onb-currency">{$t('onboarding.currency_label')}</label>
        <div class="control">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M14.6 9.4c-.4-.9-1.4-1.4-2.6-1.4-1.5 0-2.6.8-2.6 1.9 0 2.8 5.4 1.3 5.4 4 0 1.1-1.1 2-2.8 2-1.3 0-2.4-.6-2.9-1.6M12 6.6V8m0 8v1.4" />
          </svg>
          <select id="onb-currency" bind:value={currencyCode}>
            <option value="" disabled>{$t('onboarding.currency_placeholder')}</option>
            {#each CURRENCIES as currency (currency.code)}
              <option value={currency.code}>{$t(currency.labelKey)}</option>
            {/each}
          </select>
          <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </div>

      {#if errorMessage}
        <p role="alert">{errorMessage}</p>
      {/if}

      <div class="actions">
        <button type="submit" disabled={submitting || !isValid}>{$t('onboarding.submit')}</button>
        <p class="note">{$t('onboarding.note')}</p>
      </div>
    </form>
  </div>
</section>

<style>
  /* Mismos tokens que AuthScreen.svelte/LandingScreen.svelte (burdeos/oro) --
     página completa propia, independiente del fondo/padding globales de
     app.css, ya que en este estado no hay header ni nav de la app. */
  .onboarding-page {
    --ciruela: #6e1f45;
    --burdeos: #4a1230;
    --rosa: #e98f8f;
    --tinta: #3a1a2a;
    --suave: #7d5a6c;
    --campo: #f7eef1;
    --linea: #e4cfd8;
    --serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    --jost: 'Jost', 'Segoe UI', system-ui, sans-serif;

    position: fixed;
    inset: 0;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    background: linear-gradient(135deg, #2e0a1e 0%, #5b1a3b 55%, #8a2f55 100%);
    font-family: var(--jost);
    color: var(--tinta);
  }

  .onboarding-card {
    width: min(680px, 100%);
    background: #fff;
    border-radius: 8px;
    padding: 44px 56px 36px;
    box-shadow: 0 40px 90px rgba(20, 0, 12, 0.45);
  }

  .onboarding-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-family: var(--serif);
    font-weight: 600;
    font-size: 1.35rem;
    color: var(--ciruela);
  }

  .onboarding-brand img {
    display: block;
    width: 40px;
    height: 40px;
  }

  .onboarding-card h1 {
    margin-top: 26px;
    text-align: center;
    font-family: var(--serif);
    font-weight: 600;
    font-size: 2.5rem;
    line-height: 1.05;
    color: var(--ciruela);
  }

  .onboarding-lead {
    margin-top: 8px;
    text-align: center;
    color: var(--suave);
    font-size: 1rem;
  }

  form {
    margin-top: 30px;
  }

  .group {
    margin-bottom: 22px;
    border: 0;
    padding: 0;
    min-width: 0;
  }

  .group label,
  .group legend {
    display: block;
    padding: 0;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 0.95rem;
    color: var(--tinta);
  }

  .control {
    position: relative;
  }

  .control > svg {
    position: absolute;
    left: 18px;
    top: 50%;
    translate: 0 -50%;
    pointer-events: none;
    width: 18px;
    height: 18px;
    stroke: var(--ciruela);
    fill: none;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .control input[type='text'],
  .control select {
    width: 100%;
    height: 50px;
    padding: 0 20px 0 46px;
    border: 1.5px solid transparent;
    border-radius: 999px;
    background: var(--campo);
    font: inherit;
    font-size: 1rem;
    color: var(--tinta);
    transition: border-color 0.15s, background 0.15s;
    appearance: none;
    -webkit-appearance: none;
  }

  .control input::placeholder {
    color: #a98a99;
  }

  .control select:invalid {
    color: #a98a99;
  }

  .control select option {
    color: var(--tinta);
  }

  .control input:focus,
  .control select:focus {
    outline: none;
    border-color: var(--rosa);
    background: #fff;
  }

  .control input:focus-visible,
  .control select:focus-visible {
    box-shadow: 0 0 0 4px rgba(233, 143, 143, 0.25);
  }

  .control .chev {
    left: auto;
    right: 20px;
  }

  .seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .seg input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .seg label {
    margin: 0;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 1.5px solid var(--linea);
    border-radius: 999px;
    background: #fff;
    cursor: pointer;
    font-weight: 500;
    color: var(--tinta);
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }

  .seg label:hover {
    border-color: var(--rosa);
  }

  .seg label svg {
    width: 19px;
    height: 19px;
    stroke: var(--ciruela);
    fill: none;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .seg input:checked + label {
    background: linear-gradient(90deg, var(--burdeos), #a33b5f);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 8px 18px rgba(110, 31, 69, 0.25);
  }

  .seg input:checked + label svg {
    stroke: #fff;
  }

  .seg input:focus-visible + label {
    outline: 3px solid rgba(233, 143, 143, 0.7);
    outline-offset: 3px;
  }

  .hint {
    min-height: 1.4em;
    margin-top: 10px;
    padding-left: 6px;
    font-size: 0.88rem;
    color: var(--suave);
  }

  .actions {
    margin-top: 28px;
    text-align: center;
  }

  button {
    height: 52px;
    min-width: 220px;
    padding: 0 40px;
    border: 0;
    border-radius: 999px;
    font: inherit;
    font-weight: 600;
    font-size: 1.02rem;
    letter-spacing: 0.01em;
    color: #fff;
    cursor: pointer;
    background: linear-gradient(90deg, var(--burdeos), #a33b5f);
    box-shadow: 0 12px 24px rgba(110, 31, 69, 0.3);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 16px 28px rgba(110, 31, 69, 0.34);
  }

  button:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none;
  }

  .note {
    margin-top: 16px;
    font-size: 0.86rem;
    color: var(--suave);
  }

  [role='alert'] {
    text-align: center;
    margin-top: 10px;
  }

  @media (max-width: 560px) {
    .onboarding-card {
      padding: 32px 24px 28px;
    }
    .onboarding-card h1 {
      font-size: 2.1rem;
    }
    .seg {
      grid-template-columns: 1fr;
    }
    button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button,
    .control input,
    .control select,
    .seg label {
      transition: none;
    }
  }
</style>
