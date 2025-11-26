<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authApi } from '$lib/api';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  let password = '';
  let confirmPassword = '';
  let error = '';
  let success = '';
  let loading = false;

  $: token = $page.url.searchParams.get('token') || '';

  async function handleSubmit() {
    if (!token) {
      error = $_('errors.validation');
      return;
    }

    if (!password) {
      error = $_('errors.required');
      return;
    }

    if (password.length < 8) {
      error = $_('errors.minLength', { values: { min: 8 }});
      return;
    }

    if (password !== confirmPassword) {
      error = $_('auth.passwordsDoNotMatch');
      return;
    }

    loading = true;
    error = '';
    success = '';

    try {
      const result = await authApi.resetPassword(token, password);
      success = result.message || $_('auth.passwordReset');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        goto('/login');
      }, 3000);
    } catch (e) {
      error = e instanceof Error ? e.message : $_('errors.general');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$_('auth.resetPasswordTitle')} - Tesoro CRM</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-language">
      <LanguageSwitcher />
    </div>
    <div class="auth-header">
      <h1 class="auth-title">Tesoro CRM</h1>
      <p class="auth-subtitle">{$_('auth.resetPasswordTitle')}</p>
    </div>

    {#if !token}
      <div class="alert alert-error">
        {$_('errors.validation')}
      </div>
      <div class="auth-footer">
        <p><a href="/forgot-password">{$_('auth.forgotPassword')}</a></p>
      </div>
    {:else if success}
      <div class="alert alert-success">
        {success}
        <p style="margin-top: 0.5rem; font-size: 0.875rem;">{$_('common.loading')}</p>
      </div>
    {:else}
      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label class="label" for="password">{$_('auth.password')}</label>
          <input
            class="input"
            type="password"
            id="password"
            bind:value={password}
            placeholder="********"
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
            placeholder="********"
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
          {#if loading}
            <span class="spinner"></span>
          {/if}
          {$_('auth.resetPassword')}
        </button>
      </form>

      <div class="auth-footer">
        <p><a href="/login">{$_('auth.backToLogin')}</a></p>
      </div>
    {/if}
  </div>
</div>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--background);
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    position: relative;
  }

  .auth-language {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .auth-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .auth-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--primary);
    margin: 0 0 0.5rem 0;
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
