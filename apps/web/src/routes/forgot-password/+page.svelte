<script lang="ts">
  import { authApi } from '$lib/api';
  import { _, isLoading } from 'svelte-i18n';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  let email = '';
  let error = '';
  let success = '';
  let loading = false;

  async function handleSubmit() {
    if (!email) {
      error = $_('auth.emailRequired');
      return;
    }

    loading = true;
    error = '';
    success = '';

    try {
      const result = await authApi.forgotPassword(email);
      success = result.message;
      email = '';
    } catch (e) {
      error = e instanceof Error ? e.message : $_('errors.generic');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$isLoading ? 'Loading...' : $_('auth.forgotPassword')} - Tesoro</title>
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
      <p class="auth-subtitle">{$_('auth.forgotPassword')}</p>
    </div>

    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}

    {#if success}
      <div class="alert alert-success">{success}</div>
    {:else}
      <p class="description">
        {$_('auth.forgotPasswordDescription')}
      </p>

      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label class="label" for="email">{$_('auth.email')}</label>
          <input
            class="input"
            type="email"
            id="email"
            bind:value={email}
            placeholder={$_('auth.emailPlaceholder')}
            autocomplete="email"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
          {#if loading}
            <span class="spinner"></span>
          {/if}
          {$_('auth.sendResetLink')}
        </button>
      </form>
    {/if}

    <div class="auth-footer">
      <p><a href="/login">{$_('auth.backToLogin')}</a></p>
    </div>
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

  .description {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    text-align: center;
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
