<script lang="ts">
  import { t } from '../../stores/locale';
  import { businessAccess } from '../../stores/session';
  import { signOut } from '../../actions/auth';
  import { teamWhatsappHref } from '../../utils/whatsapp';
  import LegalFooter from '../legal/LegalFooter.svelte';

  const status = $derived($businessAccess?.status ?? 'expired');
  const reason = $derived($businessAccess?.reason ?? null);
  const titleKey = $derived(
    status === 'blocked' ? 'blocked.title_blocked' : status === 'paused' ? 'blocked.title_paused' : 'blocked.title_expired'
  );
  const bodyKey = $derived(
    status === 'blocked' ? 'blocked.body_blocked' : status === 'paused' ? 'blocked.body_paused' : 'blocked.body_expired'
  );
  const whatsappHref = $derived(teamWhatsappHref($t('blocked.whatsapp_message')));
</script>

<div class="blocked-page">
  <main class="blocked-card" aria-labelledby="blocked-title">
    <h1 id="blocked-title">{$t(titleKey)}</h1>
    <p>{$t(bodyKey)}</p>
    {#if reason}
      <p class="blocked-reason">{$t('blocked.reason', { reason })}</p>
    {/if}
    <p class="blocked-safe">{$t('blocked.data_safe')}</p>
    <div class="blocked-actions">
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" role="button">{$t('blocked.contact')}</a>
      <button type="button" class="secondary" onclick={() => signOut()}>{$t('blocked.logout')}</button>
    </div>
    <div class="blocked-legal"><LegalFooter compact /></div>
  </main>
</div>

<style>
  .blocked-page {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    background: linear-gradient(135deg, #2e0a1e 0%, #5b1a3b 55%, #8a2f55 100%);
  }

  .blocked-legal {
    margin-top: 24px;
  }

  .blocked-card {
    width: min(520px, 100%);
    padding: 32px 28px;
    border-radius: 16px;
    background: #fffaf7;
    color: #3a1a2a;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  }

  h1 {
    margin: 0 0 12px;
    font-size: 1.6rem;
  }

  .blocked-reason {
    font-style: italic;
  }

  .blocked-safe {
    padding: 10px 12px;
    border-radius: 8px;
    background: #f7eef1;
    font-weight: 600;
  }

  .blocked-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
  }
</style>
