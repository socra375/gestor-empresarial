<script lang="ts">
  import { untrack } from 'svelte';
  import { t } from '../../stores/locale';
  import { signInOrSignUp, signInWithGoogle, type PendingInvite } from '../../actions/auth';
  import { showLoader, hideLoader } from '../../stores/loader';
  import { legalHref } from '../../utils/legal';
  import LegalFooter from '../legal/LegalFooter.svelte';

  interface Props {
    pendingInvite: PendingInvite | null;
  }

  const { pendingInvite }: Props = $props();

  let email = $state('');
  let password = $state('');
  // Semilla única desde el prop (no reactiva a cambios posteriores a
  // propósito: una vez el formulario está montado, estos campos pasan a
  // ser editables localmente por la persona, no espejos del prop).
  let inviteCode = $state(untrack(() => pendingInvite?.code ?? ''));
  let employeeName = $state(untrack(() => pendingInvite?.employeeName ?? ''));
  let submitting = $state(false);
  let acceptedTerms = $state(false);
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);

  const showEmployeeNameField = $derived(inviteCode.trim().length > 0);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;

    if (!acceptedTerms) {
      statusMessage = { kind: 'error', text: $t('auth.need_terms') };
      return;
    }

    const trimmedInvite = inviteCode.trim();
    if (trimmedInvite && !employeeName.trim()) {
      statusMessage = { kind: 'error', text: $t('auth.need_fullname') };
      return;
    }

    submitting = true;
    showLoader('login');
    try {
      const result = await signInOrSignUp({
        email,
        password,
        invite: trimmedInvite ? { code: trimmedInvite, employeeName: employeeName.trim() } : null,
        redirectBaseUrl: window.location.origin + window.location.pathname,
      });

      if (result.status === 'signup_email_sent') {
        statusMessage = { kind: 'success', text: $t('auth.signup_success') };
      } else if (result.status === 'error') {
        statusMessage = { kind: 'error', text: $t('auth.error', { msg: result.error.message }) };
      }
      // status 'signed_in': no hace falta nada aquí -- quien escucha
      // supabase.auth.onAuthStateChange (App.svelte) toma el control.
    } finally {
      submitting = false;
      hideLoader();
    }
  }

  async function handleGoogle() {
    if (!acceptedTerms) {
      statusMessage = { kind: 'error', text: $t('auth.need_terms') };
      return;
    }
    const { error } = await signInWithGoogle(window.location.origin + window.location.pathname);
    if (error) statusMessage = { kind: 'error', text: $t('auth.oauth_error', { msg: error.message }) };
  }
</script>

<div class="auth-page">
  <main class="auth-card">
    <section class="auth-brand" aria-hidden="true">
      <div class="auth-caps">
        <i class="cap c1"></i><i class="cap c2"></i><i class="cap c3"></i><i class="cap c4"></i>
        <i class="cap c5"></i><i class="cap c6"></i><i class="cap c7"></i><i class="cap c8"></i>
      </div>
      <p class="auth-brand-title"><span>Gestor</span><span>Empresarial</span></p>
      <p class="auth-tagline">{$t('auth.subtitle')}</p>
    </section>

    <section class="auth-access" aria-labelledby="auth-title">
      <form onsubmit={handleSubmit}>
        <img src="{import.meta.env.BASE_URL}logo-256.png" alt="" class="auth-mark" />
        <h1 id="auth-title">{$t('auth.heading')}</h1>
        <p class="auth-lead">{$t('auth.lead')}</p>

        <div class="field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7.5l8 6 8-6" /></svg>
          <label for="auth-email" class="sr-only">{$t('auth.email_label')}</label>
          <input
            id="auth-email"
            type="email"
            placeholder={$t('auth.email_label')}
            autocomplete="email"
            required
            bind:value={email}
          />
        </div>

        <div class="field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
          <label for="auth-password" class="sr-only">{$t('auth.password_label')}</label>
          <input
            id="auth-password"
            type="password"
            placeholder={$t('auth.password_label')}
            autocomplete="current-password"
            required
            bind:value={password}
          />
        </div>

        <div class="field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8z" /></svg>
          <label for="auth-invite-code" class="sr-only">{$t('auth.invite_label')}</label>
          <input id="auth-invite-code" type="text" placeholder={$t('auth.invite_label')} bind:value={inviteCode} />
        </div>

        {#if showEmployeeNameField}
          <div class="field">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>
            <label for="auth-employee-name" class="sr-only">{$t('auth.fullname_label')}</label>
            <!-- Sin `required`: la validación de este campo la hace handleSubmit
                 (mismo criterio que el legado, con su propio mensaje traducido);
                 el `required` nativo bloquearía el submit antes de mostrarlo. -->
            <input id="auth-employee-name" type="text" placeholder={$t('auth.fullname_label')} bind:value={employeeName} />
          </div>
        {/if}

        <div class="terms">
          <input id="auth-terms" type="checkbox" bind:checked={acceptedTerms} />
          <label for="auth-terms">
            {$t('auth.terms_prefix')}
            <a href={legalHref('terminos')} target="_blank" rel="noopener noreferrer">{$t('auth.terms_link')}</a>
            {$t('auth.terms_and')}
            <a href={legalHref('privacidad')} target="_blank" rel="noopener noreferrer">{$t('auth.privacy_link')}</a>
          </label>
        </div>

        {#if statusMessage}
          <p class="auth-msg" role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
        {/if}

        <button type="submit" class="btn-auth-primary" disabled={submitting}>{$t('auth.submit')}</button>
        <button type="button" class="btn-auth-google" onclick={handleGoogle}>{$t('auth.google')}</button>
      </form>
    </section>
  </main>
  <div class="auth-legal"><LegalFooter variant="dark" /></div>
</div>

<style>
  /* Tema de la pantalla de acceso -- burdeos/ciruela/rosa/oro, con el
     panel de marca decorativo a la izquierda y el formulario a la
     derecha. Página completa propia (position: fixed), independiente
     del fondo/padding globales de app.css, ya que en este estado no hay
     header ni nav de la app (ver App.svelte). */
  .auth-page {
    --burdeos: #3b0f27;
    --ciruela: #6e1f45;
    --rosa: #e98f8f;
    --melocoton: #f6b79a;
    --oro: #d9b270;
    --tinta: #3a1a2a;
    --suave: #8b6577;
    --campo: #f7eef1;
    --serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;

    position: fixed;
    inset: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* Centrado vertical con márgenes auto (tarjeta y pie) en vez de
       justify-content: center, que recorta el borde superior cuando el
       contenido no entra en pantallas bajas. */
    justify-content: flex-start;
    padding: 32px 20px;
    background: linear-gradient(135deg, #2e0a1e 0%, #5b1a3b 55%, #8a2f55 100%);
    font-family: var(--font-inter);
    color: var(--tinta);
  }

  .auth-card {
    margin-top: auto;
    width: min(1040px, 100%);
    min-height: 580px;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    background: #fff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 40px 90px rgba(20, 0, 12, 0.45);
  }

  .auth-brand {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    padding: 64px 56px 170px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #fff;
    background: linear-gradient(140deg, #4a1230 0%, #8e2c55 48%, #f08e86 100%);
  }

  .auth-brand::before {
    content: '';
    position: absolute;
    z-index: -2;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    top: 4%;
    right: 2%;
    background: radial-gradient(circle at 50% 50%, rgba(246, 183, 154, 0.55), rgba(246, 183, 154, 0) 68%);
  }

  .auth-brand-title {
    font-family: var(--serif);
    font-weight: 600;
    font-size: clamp(2.6rem, 5vw, 3.6rem);
    line-height: 0.98;
    letter-spacing: -0.01em;
    margin: 0;
  }

  .auth-brand-title span {
    display: block;
  }

  .auth-tagline {
    margin-top: 22px;
    max-width: 36ch;
    font-size: 1.02rem;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.88);
  }

  .auth-caps {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }

  .cap {
    position: absolute;
    border-radius: 999px;
    transform: translate(-50%, -50%) rotate(-55deg);
  }

  .c1 { width: 92px; height: 300px; left: 14%; top: 90%; background: linear-gradient(180deg, #f6b79a, #e4737f); }
  .c2 { width: 70px; height: 230px; left: 34%; top: 98%; background: linear-gradient(180deg, #d9b270, #f19a87); }
  .c3 { width: 112px; height: 330px; left: 58%; top: 96%; background: linear-gradient(180deg, #f9c4a2, #e9787e); }
  .c4 { width: 54px; height: 200px; left: 82%; top: 86%; background: linear-gradient(180deg, #ffd9b8, #f09a8a); opacity: 0.92; }
  .c5 { width: 84px; height: 260px; left: 96%; top: 104%; background: linear-gradient(180deg, #f2a691, #d8697f); opacity: 0.9; }
  .c6 { width: 11px; height: 120px; left: 11%; top: 74%; background: rgba(217, 178, 112, 0.95); }
  .c7 { width: 10px; height: 96px; left: 47%; top: 80%; background: rgba(255, 255, 255, 0.4); }
  .c8 { width: 10px; height: 84px; left: 70%; top: 72%; background: rgba(217, 178, 112, 0.85); }

  .auth-access {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 56px 48px;
  }

  form {
    width: min(340px, 100%);
  }

  .auth-mark {
    display: block;
    width: 46px;
    height: 46px;
    margin: 0 auto 18px;
  }

  .auth-access h1 {
    font-family: var(--serif);
    font-weight: 600;
    font-size: 2rem;
    text-align: center;
    color: var(--ciruela);
    margin: 0;
  }

  .auth-lead {
    text-align: center;
    color: var(--suave);
    font-size: 0.92rem;
    margin: 6px 0 28px;
  }

  .field {
    position: relative;
    margin-bottom: 14px;
  }

  .field svg {
    position: absolute;
    left: 18px;
    top: 50%;
    translate: 0 -50%;
    width: 18px;
    height: 18px;
    stroke: var(--ciruela);
    fill: none;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }

  .field input {
    width: 100%;
    height: 48px;
    padding: 0 20px 0 46px;
    border: 1.5px solid transparent;
    border-radius: 999px;
    background: var(--campo);
    font: inherit;
    font-size: 0.95rem;
    color: var(--tinta);
    transition: border-color 0.15s, background 0.15s;
  }

  .field input::placeholder {
    color: #a98a99;
  }

  .field input:focus {
    outline: none;
    border-color: var(--rosa);
    background: #fff;
  }

  .field input:focus-visible {
    box-shadow: 0 0 0 4px rgba(233, 143, 143, 0.25);
  }

  .terms {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 4px 4px 0;
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--tinta);
  }

  .terms input {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-top: 1px;
    accent-color: var(--ciruela);
  }

  .terms label {
    cursor: pointer;
  }

  .terms a {
    color: var(--ciruela);
    font-weight: 600;
  }

  .auth-legal {
    width: min(1040px, 100%);
    margin-top: 16px;
    margin-bottom: auto;
  }

  .auth-msg {
    min-height: 1.2em;
    margin: 10px 0 4px;
    text-align: center;
    font-size: 0.84rem;
    color: #b23a54;
  }

  .btn-auth-primary,
  .btn-auth-google {
    display: block;
    margin: 18px auto 0;
    width: 100%;
    height: 46px;
    border-radius: 999px;
    font: inherit;
    font-weight: 600;
    font-size: 0.98rem;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  .btn-auth-primary {
    border: 0;
    color: #fff;
    background: linear-gradient(90deg, var(--ciruela), #c2506b 60%, var(--rosa));
    box-shadow: 0 10px 22px rgba(110, 31, 69, 0.28);
  }

  .btn-auth-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 26px rgba(110, 31, 69, 0.32);
  }

  .btn-auth-google {
    margin-top: 10px;
    border: 1.5px solid #d8bfcb;
    background: #fff;
    color: var(--ciruela);
  }

  .btn-auth-google:hover {
    border-color: var(--rosa);
  }

  .btn-auth-primary:focus-visible,
  .btn-auth-google:focus-visible {
    outline: 3px solid rgba(233, 143, 143, 0.6);
    outline-offset: 3px;
  }

  .btn-auth-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  @media (max-width: 760px) {
    .auth-card {
      grid-template-columns: 1fr;
    }
    .auth-brand {
      padding: 44px 32px 150px;
      min-height: 300px;
    }
    .auth-access {
      padding: 40px 28px 48px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .btn-auth-primary,
    .btn-auth-google,
    .field input {
      transition: none;
    }
  }
</style>
