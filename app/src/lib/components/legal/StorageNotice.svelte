<script lang="ts">
  import { t } from '../../stores/locale';
  import { legalHref } from '../../utils/legal';

  const STORAGE_KEY = 'gestorStorageNoticeSeen';

  function alreadySeen(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  let visible = $state(!alreadySeen());

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Sin localStorage el aviso vuelve a salir la próxima vez; no rompe nada.
    }
    visible = false;
  }
</script>

{#if visible}
  <div class="storage-notice" role="region" aria-label={$t('legal.notice_label')}>
    <p>
      {$t('legal.notice_body')}
      <a href={legalHref('cookies')}>{$t('legal.notice_more')}</a>
    </p>
    <button type="button" onclick={dismiss}>{$t('legal.notice_ok')}</button>
  </div>
{/if}

<style>
  .storage-notice {
    position: fixed;
    left: 50%;
    bottom: 16px;
    translate: -50% 0;
    z-index: 1000;
    width: min(680px, calc(100% - 32px));
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    background: #2b0c1d;
    color: #fff;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    font-family: var(--font-inter, inherit);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  p {
    margin: 0;
    flex: 1;
  }

  a {
    color: #f6b79a;
    text-decoration: underline;
    white-space: nowrap;
  }

  button {
    flex-shrink: 0;
    border: 0;
    border-radius: 999px;
    padding: 8px 16px;
    background: #f6b79a;
    color: #2b0c1d;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  a:focus-visible,
  button:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  @media (max-width: 520px) {
    .storage-notice {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
