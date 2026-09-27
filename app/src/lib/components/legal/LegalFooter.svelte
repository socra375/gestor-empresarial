<script lang="ts">
  import { t } from '../../stores/locale';
  import { legalHref, type LegalDoc } from '../../utils/legal';
  import type { TranslationKey } from '../../i18n';

  interface Props {
    /** 'light' para fondos claros, 'dark' para fondos oscuros. */
    variant?: 'light' | 'dark';
    compact?: boolean;
  }

  const { variant = 'light', compact = false }: Props = $props();

  const LINKS: { doc: LegalDoc; key: TranslationKey }[] = [
    { doc: 'terminos', key: 'legal.link_terms' },
    { doc: 'privacidad', key: 'legal.link_privacy' },
    { doc: 'cookies', key: 'legal.link_cookies' },
    { doc: 'reembolsos', key: 'legal.link_refunds' },
  ];

  const year = new Date().getFullYear();
</script>

<div class="legal-footer {variant}" class:compact>
  <nav aria-label={$t('legal.footer_nav')}>
    {#each LINKS as link, i (link.doc)}
      {#if i > 0}<span aria-hidden="true">·</span>{/if}
      <a href={legalHref(link.doc)}>{$t(link.key)}</a>
    {/each}
  </nav>
  {#if !compact}
    <p>{$t('legal.footer_rights', { year })}</p>
  {/if}
  <p class="ai-notice">{$t('legal.ai_notice')}</p>
</div>

<style>
  .legal-footer {
    font-size: 0.78rem;
    line-height: 1.5;
    text-align: center;
  }

  .legal-footer.light {
    color: #5d4050;
  }

  .legal-footer.dark {
    color: rgba(255, 255, 255, 0.82);
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.35rem 0.5rem;
  }

  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  p {
    margin: 0.3rem 0 0;
  }

  .ai-notice {
    font-size: 0.72rem;
    opacity: 0.9;
  }

  .compact {
    font-size: 0.72rem;
  }
</style>
