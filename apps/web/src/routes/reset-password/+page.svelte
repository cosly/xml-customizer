<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authApi } from '$lib/api';

  let password = '';
  let confirmPassword = '';
  let error = '';
  let success = '';
  let loading = false;

  $: token = $page.url.searchParams.get('token') || '';

  async function handleSubmit() {
    if (!token) {
      error = 'Ongeldige reset link';
      return;
    }

    if (!password) {
      error = 'Vul een nieuw wachtwoord in';
      return;
    }

    if (password.length < 8) {
      error = 'Wachtwoord moet minimaal 8 karakters zijn';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Wachtwoorden komen niet overeen';
      return;
    }

    loading = true;
    error = '';
    success = '';

    try {
      const result = await authApi.resetPassword(token, password);
      success = result.message;

      // Redirect to login after 3 seconds
      setTimeout(() => {
        goto('/login');
      }, 3000);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Er is iets misgegaan';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Wachtwoord resetten - Tesoro CRM Tools</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <img src="/logo.svg" alt="Tesoro" class="auth-logo" />
      <p class="auth-subtitle">Nieuw wachtwoord instellen</p>
    </div>

    {#if !token}
      <div class="alert alert-error">
        Ongeldige reset link. Vraag een nieuwe link aan via de "Wachtwoord vergeten" pagina.
      </div>
      <div class="auth-footer">
        <p><a href="/forgot-password">Nieuwe link aanvragen</a></p>
      </div>
    {:else if success}
      <div class="alert alert-success">
        {success}
        <p style="margin-top: 0.5rem; font-size: 0.875rem;">Je wordt doorgestuurd naar de login pagina...</p>
      </div>
    {:else}
      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      <form on:submit|preventDefault={handleSubmit}>
        <div class="form-group">
          <label class="label" for="password">Nieuw wachtwoord</label>
          <input
            class="input"
            type="password"
            id="password"
            bind:value={password}
            placeholder="Minimaal 8 karakters"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label class="label" for="confirm-password">Bevestig wachtwoord</label>
          <input
            class="input"
            type="password"
            id="confirm-password"
            bind:value={confirmPassword}
            placeholder="Herhaal je wachtwoord"
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
          {#if loading}
            <span class="spinner"></span>
          {/if}
          Wachtwoord wijzigen
        </button>
      </form>

      <div class="auth-footer">
        <p><a href="/login">Terug naar inloggen</a></p>
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
  }

  .auth-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .auth-logo {
    max-width: 200px;
    height: auto;
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
