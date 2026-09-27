<script lang="ts">
  import { t, locale } from '../../stores/locale';
  import { businessAccess } from '../../stores/session';
  import { createTelegramLinkCode } from '../../api/businessAccess';
  import { startPlanTrial } from '../../actions/plans';
  import { fmtDate, fmtTime } from '../../utils/format';
  import { teamWhatsappHref } from '../../utils/whatsapp';
  import { legalHref } from '../../utils/legal';
  import type { PaidPlan } from '../../types/businessAccess';
  import type { TranslationKey } from '../../i18n';

  // El cliente y el equipo acuerdan el cambio de plan por WhatsApp; no hay
  // aprobación automatizada. El plan lo asigna el equipo (bot de Telegram).
  const whatsappHref = $derived(teamWhatsappHref($t('cfg.plan_whatsapp_message')));
  const access = $derived($businessAccess);

  let linkCode = $state<{ code: string; expires_at: string } | null>(null);
  let linkError = $state('');
  let generating = $state(false);

  async function generateLinkCode() {
    linkError = '';
    generating = true;
    try {
      linkCode = await createTelegramLinkCode();
    } catch (err) {
      linkError = $t('cfg.tg_error', { msg: err instanceof Error ? err.message : String(err) });
    } finally {
      generating = false;
    }
  }

  // Los mismos 3 planes pagos de la landing (#planes) -- "prueba" es un
  // estado, no un plan que se pueda elegir, así que no tiene tarjeta acá.
  const PLAN_KEYS: PaidPlan[] = ['mensual', 'semestral', 'anual'];

  const currentPlan = $derived(
    PLAN_KEYS.includes(access?.plan as PaidPlan) ? (access!.plan as PaidPlan) : null
  );

  const PLAN_TAG_KEY: Record<PaidPlan, TranslationKey> = {
    mensual: 'cfg.plan_tag_mensual',
    semestral: 'cfg.plan_tag_semestral',
    anual: 'cfg.plan_tag_anual',
  };
  const PLAN_PRICE_KEY: Record<PaidPlan, TranslationKey> = {
    mensual: 'cfg.plan_price_mensual',
    semestral: 'cfg.plan_price_semestral',
    anual: 'cfg.plan_price_anual',
  };
  const PLAN_FEATURES_KEY: Record<PaidPlan, TranslationKey> = {
    mensual: 'cfg.plan_features_mensual',
    semestral: 'cfg.plan_features_semestral',
    anual: 'cfg.plan_features_anual',
  };
  const PLAN_BADGE_KEY: Partial<Record<PaidPlan, TranslationKey>> = {
    semestral: 'cfg.plan_badge_semestral',
    anual: 'cfg.plan_badge_anual',
  };
  const PLAN_EQUIV_KEY: Partial<Record<PaidPlan, TranslationKey>> = {
    semestral: 'cfg.plan_equiv_semestral',
    anual: 'cfg.plan_equiv_anual',
  };

  // Mientras sigue en la prueba genérica puede pasar a la de Mensual (el único
  // plan con prueba gratis), una sola vez.
  const canChooseTrial = $derived(access?.status === 'trial' && access.plan === 'prueba' && !access.trial_plan);
  let trialError = $state('');
  let startingTrial = $state(false);

  async function tryPlan(plan: PaidPlan) {
    trialError = '';
    startingTrial = true;
    try {
      await startPlanTrial(plan);
    } catch (err) {
      trialError = $t('cfg.plan_try_error', { msg: err instanceof Error ? err.message : String(err) });
    } finally {
      startingTrial = false;
    }
  }

  function features(key: PaidPlan): string[] {
    return $t(PLAN_FEATURES_KEY[key])
      .split('|')
      .map((feature) => feature.trim())
      .filter(Boolean);
  }
</script>

<div>
  <h2>{$t('cfg.plan_title')}</h2>
  {#if access?.is_super_admin}
    <p><strong>{$t('cfg.plan_super_admin')}</strong></p>
  {:else if access?.plan}
    <p>
      <strong>
        {#if access.plan === 'prueba' && access.trial_plan}
          {$t('cfg.plan_trial_of', { plan: $t(`plan.${access.trial_plan}`) })}
        {:else}
          {$t('cfg.plan_current', { plan: $t(`plan.${access.plan}`) })}
        {/if}
      </strong>
      {#if access.expires_at}
        — {$t('cfg.plan_expires', { date: fmtDate(access.expires_at, $locale) })}
      {/if}
    </p>
  {/if}

  {#if access?.is_super_admin}
    <section aria-labelledby="tg-title">
      <h3 id="tg-title">{$t('cfg.tg_title')}</h3>
      <p>{$t('cfg.tg_body')}</p>
      <button type="button" onclick={generateLinkCode} disabled={generating}>{$t('cfg.tg_button')}</button>
      {#if linkCode}
        <p>{$t('cfg.tg_code')} <code>/vincular {linkCode.code}</code></p>
        <p><small>{$t('cfg.tg_expires', { time: fmtTime(linkCode.expires_at, $locale) })}</small></p>
      {/if}
      {#if linkError}
        <p role="alert">{linkError}</p>
      {/if}
    </section>
  {:else}
    <p>{$t('cfg.plan_body')}</p>

    <h3>{$t('cfg.plan_compare_title')}</h3>
    <div class="plan-grid">
      {#each PLAN_KEYS as key (key)}
        <div class="card plan-card" class:plan-card-current={currentPlan === key}>
          <div class="plan-badges">
            {#if PLAN_BADGE_KEY[key]}
              <span class="plan-badge">{$t(PLAN_BADGE_KEY[key]!)}</span>
            {/if}
            {#if currentPlan === key}
              <span class="plan-badge plan-badge-current">{$t('cfg.plan_current_badge')}</span>
            {/if}
          </div>
          <h4>{$t(`plan.${key}`)}</h4>
          <p class="plan-tag">{$t(PLAN_TAG_KEY[key])}</p>
          <p class="plan-price">{$t(PLAN_PRICE_KEY[key])}</p>
          {#if PLAN_EQUIV_KEY[key]}
            <p class="plan-equiv">{$t(PLAN_EQUIV_KEY[key]!)}</p>
          {/if}
          <ul class="plan-features">
            {#each features(key) as feature (feature)}
              <li>{feature}</li>
            {/each}
          </ul>
          {#if canChooseTrial && key === 'mensual'}
            <button type="button" class="plan-try" onclick={() => tryPlan(key)} disabled={startingTrial}>
              {$t('cfg.plan_try_button')}
            </button>
          {/if}
        </div>
      {/each}
    </div>
    {#if canChooseTrial}
      <p class="plan-note">{$t('cfg.plan_try_hint')}</p>
    {/if}
    {#if trialError}
      <p role="alert">{trialError}</p>
    {/if}
    <p class="plan-note">
      {$t('cfg.plan_compare_note')}
      <a href={legalHref('reembolsos')}>{$t('cfg.plan_refunds_link')}</a>
    </p>

    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" role="button">
      {$t('cfg.plan_button')}
    </a>
  {/if}
</div>

<style>
  .plan-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .plan-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .plan-card-current {
    border-color: var(--accent-profit);
  }

  .plan-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-height: 1.4rem;
  }

  .plan-badge {
    display: inline-block;
    align-self: flex-start;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: var(--border-subtle);
    color: var(--text-primary);
  }

  .plan-badge-current {
    background: var(--accent-profit);
    color: var(--on-accent);
  }

  .plan-card h4 {
    margin: 0;
  }

  .plan-tag {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin: 0;
  }

  .plan-price {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 0.15rem 0 0;
  }

  .plan-equiv {
    color: var(--text-muted);
    font-size: 0.8rem;
    margin: 0;
  }

  .plan-features {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
  }

  .plan-features li::before {
    content: '✓ ';
    color: var(--accent-profit);
  }

  .plan-try {
    margin-top: auto;
  }

  .plan-note {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
</style>
