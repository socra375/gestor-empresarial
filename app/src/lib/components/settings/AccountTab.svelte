<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../stores/locale';
  import { getAccountInfo } from '../../actions/account';
  import { setForcedPassword, switchAccount } from '../../actions/auth';

  let avatarUrl = $state('');
  let name = $state('');
  let email = $state('');
  let showPasswordForm = $state(false);
  let newPassword = $state('');
  let statusMessage = $state<{ kind: 'error' | 'success'; text: string } | null>(null);
  let submitting = $state(false);

  onMount(() => {
    void getAccountInfo().then((info) => {
      avatarUrl = info.avatarUrl;
      name = info.name;
      email = info.email;
    });
  });

  async function handleSavePassword(event: SubmitEvent) {
    event.preventDefault();
    statusMessage = null;

    if (newPassword.length < 6) {
      statusMessage = { kind: 'error', text: $t('pwd.min_length') };
      return;
    }

    submitting = true;
    try {
      const { error } = await setForcedPassword(newPassword);
      if (error) {
        statusMessage = { kind: 'error', text: $t('pwd.save_error', { msg: error.message }) };
      } else {
        statusMessage = { kind: 'success', text: $t('pwd.saved') };
        newPassword = '';
      }
    } finally {
      submitting = false;
    }
  }
</script>

<div>
  {#if avatarUrl}
    <img src={avatarUrl} alt="" />
  {/if}
  {#if name}
    <p>{name}</p>
  {/if}
  <p>{email}</p>
</div>

<button type="button" onclick={() => (showPasswordForm = !showPasswordForm)}>{$t('header.password_btn')}</button>

{#if showPasswordForm}
  <form onsubmit={handleSavePassword}>
    <h2>{$t('pwd.title')}</h2>
    <p>{$t('pwd.body')}</p>

    <label for="input-new-password">{$t('pwd.label')}</label>
    <input id="input-new-password" type="password" bind:value={newPassword} />

    {#if statusMessage}
      <p role={statusMessage.kind === 'error' ? 'alert' : 'status'}>{statusMessage.text}</p>
    {/if}

    <button type="submit" disabled={submitting}>{$t('pwd.save')}</button>
  </form>
{/if}

<section aria-labelledby="account-switch-title">
  <h2 id="account-switch-title">{$t('acct.switch_title')}</h2>
  <p>{$t('acct.switch_body')}</p>
  <button type="button" onclick={() => switchAccount()}>{$t('acct.switch_btn')}</button>
</section>
