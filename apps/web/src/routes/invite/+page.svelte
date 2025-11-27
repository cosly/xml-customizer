<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { teamApi, type InvitationDetails } from '$lib/api';
  import { _, isLoading as i18nLoading } from 'svelte-i18n';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  let invitation: InvitationDetails | null = null;
  let loading = true;
  let error = '';

  // Registration form
  let name = '';
  let password = '';
  let confirmPassword = '';
  let formError = '';
  let formLoading = false;

  $: token = $page.url.searchParams.get('token');

  onMount(async () => {
    if (!token) {
      error = $_('invite.noToken');
      loading = false;
      return;
    }

    try {
      invitation = await teamApi.getInvitation(token);
    } catch (e) {
      error = e instanceof Error ? e.message : $_('invite.invalidOrExpired');
    } finally {
      loading = false;
    }
  });

  async function handleSubmit() {
    formError = '';

    if (!name.trim()) {
      formError = $_('invite.nameRequired');
      return;
    }

    if (password.length < 8) {
      formError = $_('auth.passwordMinLength');
      return;
    }

    if (password !== confirmPassword) {
      formError = $_('auth.passwordsDoNotMatch');
      return;
    }

    if (!invitation || !token) return;

    formLoading = true;
    try {
      const result = await auth.register(invitation.email, password, name.trim(), token);

      if (result.success) {
        goto('/');
      } else {
        formError = result.error || $_('invite.registrationFailed');
      }
    } catch (e) {
      formError = e instanceof Error ? e.message : $_('invite.registrationFailed');
    } finally {
      formLoading = false;
    }
  }

  function getRoleLabel(role: string): string {
    return $_(`team.roles.${role}`);
  }
</script>

<svelte:head>
  <title>{$i18nLoading ? 'Loading...' : $_('invite.title')} - Tesoro</title>
</svelte:head>

{#if $i18nLoading}
  <div class="auth-container">
    <div class="auth-card">
      <p>Loading...</p>
    </div>
  </div>
{:else}
<div class="auth-container">
  <div class="language-switcher-wrapper">
    <LanguageSwitcher />
  </div>
  <div class="auth-card">
    <div class="auth-header">
      <img src="/logo.png" alt="Tesoro" class="auth-logo" />
    </div>

    {#if loading}
      <div class="loading">{$_('invite.loading')}</div>
    {:else if error}
      <div class="auth-body">
        <div class="alert alert-error">{error}</div>
        <p class="text-center">
          <a href="/login">{$_('auth.backToLogin')}</a>
        </p>
      </div>
    {:else if invitation}
      <div class="auth-body">
        <div class="invitation-info">
          <h2>{$_('invite.youAreInvited')}</h2>
          <p>
            {$_('invite.invitedBy', { values: { name: invitation.invited_by_name, role: getRoleLabel(invitation.role), organization: invitation.organization_name } })}
          </p>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="email">{$_('auth.email')}</label>
            <input
              type="email"
              id="email"
              value={invitation.email}
              disabled
            />
          </div>

          <div class="form-group">
            <label for="name">{$_('invite.yourName')}</label>
            <input
              type="text"
              id="name"
              bind:value={name}
              placeholder={$_('invite.namePlaceholder')}
              disabled={formLoading}
              required
            />
          </div>

          <div class="form-group">
            <label for="password">{$_('auth.password')}</label>
            <input
              type="password"
              id="password"
              bind:value={password}
              placeholder={$_('auth.passwordPlaceholder')}
              disabled={formLoading}
              required
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">{$_('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              bind:value={confirmPassword}
              placeholder={$_('auth.confirmPasswordPlaceholder')}
              disabled={formLoading}
              required
            />
          </div>

          {#if formError}
            <div class="alert alert-error">{formError}</div>
          {/if}

          <button type="submit" class="btn btn-primary btn-block" disabled={formLoading}>
            {formLoading ? $_('common.loading') : $_('invite.createAccount')}
          </button>
        </form>

        <p class="auth-footer">
          {$_('auth.haveAccount')} <a href="/login">{$_('auth.login')}</a>
        </p>
      </div>
    {/if}
  </div>
</div>
{/if}

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: var(--bg-secondary);
    position: relative;
  }

  .language-switcher-wrapper {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .auth-logo {
    height: 60px;
    width: auto;
  }

  .auth-card {
    background: var(--bg-primary);
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
    overflow: hidden;
  }

  .auth-header {
    background: var(--bg-tertiary);
    padding: 1.5rem;
    text-align: center;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0;
  }

  .auth-body {
    padding: 1.5rem;
  }

  .invitation-info {
    text-align: center;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--bg-tertiary);
    border-radius: 8px;
  }

  .invitation-info h2 {
    font-size: 1.25rem;
    margin: 0 0 0.5rem 0;
  }

  .invitation-info p {
    margin: 0;
    color: var(--text-secondary);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 1rem;
  }

  .form-group input:disabled {
    background: var(--bg-tertiary);
    cursor: not-allowed;
  }

  .btn-block {
    width: 100%;
    margin-top: 1rem;
  }

  .auth-footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .text-center {
    text-align: center;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: var(--text-muted);
  }
</style>
