<script lang="ts">
  import { goto } from '$app/navigation';
  import { _ } from 'svelte-i18n';
  import { auth } from '$lib/stores/auth';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  let name = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    error = '';

    if (!name || !email || !password) {
      error = $_('errors.required');
      return;
    }

    if (password.length < 8) {
      error = $_('errors.minLength', { values: { min: 8 } });
      return;
    }

    if (password !== confirmPassword) {
      error = $_('auth.passwordsDoNotMatch');
      return;
    }

    loading = true;

    const result = await auth.register(email, password, name);

    loading = false;

    if (result.success) {
      goto('/');
    } else {
      error = result.error || $_('errors.general');
    }
  }
</script>

<svelte:head>
  <title>{$_('auth.register')} - Tesoro</title>
</svelte:head>

<div class="auth-container">
  <div class="language-switcher-wrapper">
    <LanguageSwitcher />
  </div>
  <div class="auth-card">
    <div class="auth-header">
      <img src="/logo.png" alt="Tesoro" class="auth-logo" />
      <p class="auth-subtitle">{$_('auth.registerSubtitle')}</p>
    </div>

    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label class="label" for="name">{$_('auth.name')}</label>
        <input
          class="input"
          type="text"
          id="name"
          bind:value={name}
          placeholder="{$_('auth.companyName')}"
          autocomplete="name"
        />
      </div>

      <div class="form-group">
        <label class="label" for="email">{$_('auth.email')}</label>
        <input
          class="input"
          type="email"
          id="email"
          bind:value={email}
          placeholder="jouw@email.nl"
          autocomplete="email"
        />
      </div>

      <div class="form-group">
        <label class="label" for="password">{$_('auth.password')}</label>
        <input
          class="input"
          type="password"
          id="password"
          bind:value={password}
          placeholder="{$_('errors.minLength', { values: { min: 8 } })}"
          autocomplete="new-password"
        />
      </div>

      <div class="form-group">
        <label class="label" for="confirmPassword">{$_('auth.confirmPassword')}</label>
        <input
          class="input"
          type="password"
          id="confirmPassword"
          bind:value={confirmPassword}
          autocomplete="new-password"
        />
      </div>

      <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
        {#if loading}
          <span class="spinner"></span>
        {/if}
        {$_('auth.register')}
      </button>
    </form>

    <div class="auth-footer">
      <p>{$_('auth.haveAccount')} <a href="/login">{$_('auth.login')}</a></p>
    </div>
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
  }

  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
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

  .language-switcher-wrapper {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }
</style>
