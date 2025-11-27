<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authApi } from '$lib/api';
  import { _, isLoading } from 'svelte-i18n';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  let password = '';
  let confirmPassword = '';
  let error = '';
  let success = false;
  let loading = false;

  $: token = $page.url.searchParams.get('token') || '';

  async function handleSubmit() {
    if (!token) {
      error = $_('auth.invalidResetLink');
      return;
    }

    if (!password) {
      error = $_('auth.passwordRequired');
      return;
    }

    if (password.length < 8) {
      error = $_('auth.passwordMinLength');
      return;
    }

    if (password !== confirmPassword) {
      error = $_('auth.passwordsDoNotMatch');
      return;
    }

    loading = true;
    error = '';

    try {
      await authApi.resetPassword(token, password);
      success = true;

      // Redirect to login after 3 seconds
      setTimeout(() => {
        goto('/login');
      }, 3000);
    } catch (e) {
      error = e instanceof Error ? e.message : $_('errors.generic');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$isLoading ? 'Loading...' : $_('auth.resetPasswordTitle')} - Tesoro</title>
</svelte:head>

{#if $isLoading}
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
      <p class="auth-subtitle">{$_('auth.resetPasswordTitle')}</p>
    </div>

    {#if !token}
      <div class="alert alert-error">
        {$_('auth.invalidResetLinkDescription')}
      </div>
      <div class="auth-footer">
        <p><a href="/forgot-password">{$_('auth.requestNewLink')}</a></p>
      </div>
    {:else if success}
      <div class="alert alert-success">
        {$_('auth.passwordReset')}
        <p style="margin-top: 0.5rem; font-size: 0.875rem;">{$_('auth.redirectingToLogin')}</p>
      </div>
    {:else}
      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label class="label" for="password">{$_('auth.newPassword')}</label>
          <input
            class="input"
            type="password"
            id="password"
            bind:value={password}
            placeholder={$_('auth.passwordPlaceholder')}
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label class="label" for="confirm-password">{$_('auth.confirmPassword')}</label>
          <input
            class="input"
            type="password"
            id="confirm-password"
            bind:value={confirmPassword}
            placeholder={$_('auth.confirmPasswordPlaceholder')}
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
          {#if loading}
            <span class="spinner"></span>
          {/if}
          {$_('auth.changePassword')}
        </button>
      </form>

      <div class="auth-footer">
        <p><a href="/login">{$_('auth.backToLogin')}</a></p>
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
    padding: 1rem;
    background: var(--background);
    position: relative;
  }

  .language-switcher-wrapper {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2rem;
  }

  .auth-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .auth-logo {
    height: 60px;
    width: auto;
    margin-bottom: 0.5rem;
  }

  .auth-subtitle {
    color: var(--text-muted);
    margin: 0;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .btn-block {
    width: 100%;
    margin-top: 1rem;
  }

  .auth-footer {
    text-align: center;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
  }

  .auth-footer p {
    margin: 0;
    color: var(--text-muted);
  }

  .auth-footer a {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
  }

  .auth-footer a:hover {
    text-decoration: underline;
  }

  .alert {
    margin-bottom: 1rem;
  }

  .alert-success {
    padding: 0.75rem 1rem;
    background: #dcfce7;
    color: #166534;
    border-radius: 6px;
    font-size: 0.875rem;
  }
</style>
