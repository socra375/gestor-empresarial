<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { fade } from 'svelte/transition';
  import { t, locale } from './lib/stores/locale';
  import { isLocale } from './lib/i18n';
  import { supabase, isSupabaseConfigured } from './lib/api/client';
  import {
    currentBusiness,
    currentUserRole,
    isAuthenticated,
    isAdmin,
    isBusinessBlocked,
    enabledModules,
    needsOnboarding,
    resetSession,
  } from './lib/stores/session';
  import { showLoader, hideLoader } from './lib/stores/loader';
  import { readPendingInviteFromUrl, resolveSessionAfterLogin, signOut, type PendingInvite } from './lib/actions/auth';
  import Loader from './lib/components/shared/Loader.svelte';
  import LegalScreen from './lib/components/legal/LegalScreen.svelte';
  import LegalFooter from './lib/components/legal/LegalFooter.svelte';
  import StorageNotice from './lib/components/legal/StorageNotice.svelte';
  import { parseLegalHash } from './lib/utils/legal';
  import LandingScreen from './lib/components/auth/LandingScreen.svelte';
  import AuthScreen from './lib/components/auth/AuthScreen.svelte';
  import OnboardingScreen from './lib/components/auth/OnboardingScreen.svelte';
  import ForcedPasswordModal from './lib/components/auth/ForcedPasswordModal.svelte';
  import BlockedScreen from './lib/components/auth/BlockedScreen.svelte';
  import { isPaidPlan, setPendingTrial } from './lib/utils/pendingTrial';
  import { showsLandingAfter } from './lib/utils/landing';
  import type { PaidPlan } from './lib/types/businessAccess';
  import DashboardScreen from './lib/components/dashboard/DashboardScreen.svelte';
  import AgendaScreen from './lib/components/agenda/AgendaScreen.svelte';
  import InvoicesScreen from './lib/components/invoices/InvoicesScreen.svelte';
  import SettingsScreen from './lib/components/settings/SettingsScreen.svelte';
  import EmployeesScreen from './lib/components/employees/EmployeesScreen.svelte';
  import type { DashboardNavTarget } from './lib/components/dashboard/DashboardScreen.svelte';

  type Section = 'dashboard' | 'agenda' | 'invoices' | 'settings' | 'employees';
  let activeSection = $state<Section>('dashboard');
  /** Un solo uso: el Dashboard pide abrir el formulario de nueva cita de una vez al llegar a Agenda. */
  let agendaAutoOpen = $state(false);
  /** Igual, para saltar directo a una pestaña de Configuración desde el checklist de primeros pasos. */
  let settingsInitialTab = $state<'services' | 'customers' | null>(null);

  // Sin el módulo de estadísticas no hay Inicio: se arranca en Agenda.
  $effect(() => {
    if (activeSection === 'dashboard' && !$enabledModules.has('estadisticas')) activeSection = 'agenda';
    if (activeSection === 'invoices' && !$enabledModules.has('facturas')) activeSection = 'agenda';
    if (activeSection === 'employees' && !$enabledModules.has('equipo')) activeSection = 'agenda';
  });

  function goToSection(section: Section) {
    agendaAutoOpen = false;
    settingsInitialTab = null;
    activeSection = section;
  }

  function handleDashboardNavigate(target: DashboardNavTarget) {
    switch (target) {
      case 'agenda-new':
        agendaAutoOpen = true;
        activeSection = 'agenda';
        break;
      case 'agenda-view':
        goToSection('agenda');
        break;
      case 'services':
        settingsInitialTab = 'services';
        activeSection = 'settings';
        break;
      case 'customers':
        settingsInitialTab = 'customers';
        activeSection = 'settings';
        break;
      case 'employees':
        goToSection('employees');
        break;
    }
  }

  // Visible desde el primer render (antes incluso de onMount) hasta que se
  // resuelve si hay sesión o no -- reemplaza el "…" a secas que se veía antes.
  showLoader('boot');

  let ready = $state(false);
  // Documentos legales por hash (#/terminos, #/privacidad...): se pueden
  // abrir con o sin sesión y compartir por link.
  let legalDoc = $state(parseLegalHash(window.location.hash));

  function handleHashChange() {
    legalDoc = parseLegalHash(window.location.hash);
    if (legalDoc) window.scrollTo(0, 0);
  }
  let resolving = $state(false);
  let pendingInvite = $state<PendingInvite | null>(null);
  let inviteError = $state<string | null>(null);
  let showForcedPassword = $state(false);
  let showSessionBanner = $state(false);
  // Landing solo para quien nunca entró a esta app en este navegador --
  // arranca en false y se decide en onMount, después de resolver un posible
  // link de invitación (ese caso salta el landing y va directo al acceso).
  let showLanding = $state(false);

  function dismissLanding(plan?: PaidPlan) {
    if (plan) setPendingTrial(plan);
    try {
      localStorage.setItem('gestorLandingSeen', '1');
    } catch {
      // localStorage no disponible -- igual se puede seguir al login sin guardar la preferencia.
    }
    showLanding = false;
  }

  /**
   * "Sesión iniciada como..." es un aviso de bienvenida, no un dato
   * permanente -- se muestra 5 segundos y solo la primera vez que se entra
   * a la app cada día calendario (guardado en localStorage, por navegador).
   */
  $effect(() => {
    if (!$isAuthenticated || $needsOnboarding || showForcedPassword) return;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const today = new Date().toDateString();
      if (localStorage.getItem('sessionBannerLastShown') !== today) {
        localStorage.setItem('sessionBannerLastShown', today);
        showSessionBanner = true;
        timeoutId = setTimeout(() => {
          showSessionBanner = false;
        }, 5000);
      }
    } catch {
      // localStorage no disponible (modo privado, etc.) -- sin aviso, no rompe nada.
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });

  function finishBoot() {
    ready = true;
    hideLoader();
  }

  const LAST_ACTIVE_KEY = 'ge_last_active';
  const INACTIVITY_RESYNC_MS = 5 * 60 * 1000;

  /**
   * Si se vuelve a esta pestaña después de estar inactiva un buen rato
   * (mínimo 5 min), los datos ya cargados pueden estar desactualizados o el
   * token de sesión pudo vencer -- se recarga la página entera en vez de
   * intentar refrescar cada store por separado, mostrando el mismo overlay
   * mientras tanto para que no se vea como una pantalla en blanco.
   */
  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    if (!get(isAuthenticated)) return;
    const lastActive = Number(sessionStorage.getItem(LAST_ACTIVE_KEY) || 0);
    if (Date.now() - lastActive > INACTIVITY_RESYNC_MS) {
      showLoader('sync');
      window.location.reload();
    }
  }

  onMount(() => {
    window.addEventListener('hashchange', handleHashChange);
    if (!isSupabaseConfigured) {
      finishBoot();
      return () => window.removeEventListener('hashchange', handleHashChange);
    }

    const startUrl = new URL(window.location.href);
    pendingInvite = readPendingInviteFromUrl(startUrl);
    // El plan de "Probar gratis" viaja en el link de confirmación del correo
    // por si se confirma en otro dispositivo.
    const urlPlan = startUrl.searchParams.get('plan');
    if (isPaidPlan(urlPlan)) {
      setPendingTrial(urlPlan);
      if (!pendingInvite) window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (!pendingInvite) {
      try {
        showLanding = localStorage.getItem('gestorLandingSeen') !== '1';
      } catch {
        showLanding = false;
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // onAuthStateChange dispara de nuevo en cada refresh de token; ya
        // resuelta una vez la sesión, los siguientes eventos son no-ops.
        if (resolving || $isAuthenticated) {
          finishBoot();
          return;
        }
        resolving = true;
        const userId = session.user.id;
        const invite = pendingInvite;

        resolveSessionAfterLogin(userId, invite)
          .then(({ business, inviteError: err }) => {
            if (invite) {
              window.history.replaceState({}, document.title, window.location.pathname);
              pendingInvite = null;
            }
            inviteError = err;
            if (business?.language && isLocale(business.language)) locale.set(business.language);
          })
          .finally(() => {
            resolving = false;
            finishBoot();
          });
      } else {
        if (event === 'SIGNED_OUT') {
          // Landing tras cerrar sesión; formulario de acceso si fue "Agregar o cambiar cuenta".
          showLanding = showsLandingAfter(event);
          window.scrollTo(0, 0);
        }
        resetSession();
        finishBoot();
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const activityIntervalId = setInterval(() => {
      sessionStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    }, 15_000);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('hashchange', handleHashChange);
      clearInterval(activityIntervalId);
    };
  });

  function handleOnboardingCompleted(result: { requiresForcedPassword: boolean }) {
    showForcedPassword = result.requiresForcedPassword;
  }
</script>

<Loader />

{#if !ready}
  <!-- El overlay de Loader ya cubre este estado. -->
{:else if legalDoc}
  <LegalScreen doc={legalDoc} />
{:else if !isSupabaseConfigured}
  <main>
    <h1>Gestión Salón</h1>
    <p>
      Faltan <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> — copia
      <code>.env.example</code> a <code>.env</code> y complétalas.
    </p>
  </main>
{:else if !$isAuthenticated}
  {#if showLanding}
    <LandingScreen onEnter={dismissLanding} />
  {:else}
    {#if inviteError}
      <p role="alert">{$t('auth.invite_invalid', { msg: inviteError })}</p>
    {/if}
    <AuthScreen {pendingInvite} />
  {/if}
  <StorageNotice />
{:else if $isBusinessBlocked}
  <BlockedScreen />
{:else if $needsOnboarding}
  <OnboardingScreen onCompleted={handleOnboardingCompleted} />
{:else if showForcedPassword}
  <ForcedPasswordModal onSaved={() => (showForcedPassword = false)} />
{:else if $isAdmin}
  <div class="app-shell">
    <aside class="side">
      <div class="side-brand">
        {#if $currentBusiness?.logo_url}
          <img src={$currentBusiness.logo_url} alt="" class="side-logo" />
        {/if}
        <div>
          <b>{$currentBusiness?.name ?? 'Gestión Salón'}</b>
          <small>Gestor Empresarial</small>
        </div>
      </div>
      <nav aria-label={$t('nav.dashboard')}>
        {#if $enabledModules.has('estadisticas')}
          <button type="button" class="side-link" aria-current={activeSection === 'dashboard' ? 'page' : undefined} onclick={() => goToSection('dashboard')}>
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6.5L20 11" /><path d="M6 10v9.5h12V10" /><path d="M10 19.5v-5h4v5" /></svg>
            {$t('nav.dashboard')}
          </button>
        {/if}
        <button type="button" class="side-link" aria-current={activeSection === 'agenda' ? 'page' : undefined} onclick={() => goToSection('agenda')}>
          <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></svg>
          {$t('nav.agenda')}
        </button>
        {#if $enabledModules.has('facturas')}
          <button type="button" class="side-link" aria-current={activeSection === 'invoices' ? 'page' : undefined} onclick={() => goToSection('invoices')}>
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-1.2-.9-1.2.9-2.4-1.6L6 20.5z" /><path d="M9 8.5h6M9 12h6" /></svg>
            {$t('nav.invoices')}
          </button>
        {/if}
        {#if $currentBusiness?.business_type === 'group' && $enabledModules.has('equipo')}
          <button type="button" class="side-link" aria-current={activeSection === 'employees' ? 'page' : undefined} onclick={() => goToSection('employees')}>
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.5-3.2 2.8-5 6-5s5.5 1.8 6 5" /><circle cx="17" cy="9.5" r="2.6" /><path d="M16.5 14.8c2.6.1 4.1 1.6 4.5 4.2" /></svg>
            {$t('nav.employees')}
          </button>
        {/if}
      </nav>
      <div class="side-foot">
        <button type="button" class="side-link" aria-current={activeSection === 'settings' ? 'page' : undefined} onclick={() => goToSection('settings')}>
          <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>
          {$t('cfg.back')}
        </button>
        <button type="button" class="side-link" onclick={() => signOut()}>
          <svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5h4.5a1 1 0 011 1v13a1 1 0 01-1 1H14" /><path d="M10 8l-4 4 4 4M6 12h9" /></svg>
          {$t('header.logout')}
        </button>
      </div>
    </aside>

    <div class="content">
      <div class="mbrand">
        {#if $currentBusiness?.logo_url}
          <img src={$currentBusiness.logo_url} alt="" class="mbrand-logo" />
        {/if}
        {$currentBusiness?.name ?? 'Gestión Salón'}
      </div>

      {#if showSessionBanner}
        <p class="session-banner" transition:fade={{ duration: 200 }}>
          Sesión iniciada como <strong>{$currentUserRole === 'admin' ? $t('header.role_admin') : $t('header.role_employee')}</strong>
          de <strong>{$currentBusiness?.name ?? 'Mi Salón'}</strong>.
        </p>
      {/if}

      <main>
        {#if activeSection === 'dashboard'}
          <DashboardScreen onNavigate={handleDashboardNavigate} />
        {:else if activeSection === 'agenda'}
          <AgendaScreen autoOpenForm={agendaAutoOpen} />
        {:else if activeSection === 'invoices'}
          <InvoicesScreen />
        {:else if activeSection === 'settings'}
          <SettingsScreen initialTab={settingsInitialTab} />
        {:else if activeSection === 'employees'}
          <EmployeesScreen />
        {/if}
      </main>
      <div class="app-legal"><LegalFooter variant="dark" compact /></div>
    </div>
  </div>
{:else}
  <header>
    <div class="header-top">
      <div class="header-brand">
        {#if $currentBusiness?.logo_url}
          <img src={$currentBusiness.logo_url} alt="" class="header-logo" />
        {/if}
        <h1>{$currentBusiness?.name ?? 'Gestión Salón'}</h1>
      </div>
      <div class="header-actions">
        <button type="button" class="header-action" onclick={() => signOut()}>{$t('header.logout')}</button>
      </div>
    </div>
    {#if showSessionBanner}
      <p transition:fade={{ duration: 200 }}>
        Sesión iniciada como <strong>{$currentUserRole === 'admin' ? $t('header.role_admin') : $t('header.role_employee')}</strong>
        de <strong>{$currentBusiness?.name ?? 'Mi Salón'}</strong>.
      </p>
    {/if}
  </header>
  <main>
    <DashboardScreen onNavigate={handleDashboardNavigate} />
  </main>
  <div class="app-legal"><LegalFooter variant="dark" compact /></div>
{/if}
