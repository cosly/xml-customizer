<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    if (!email || !password) {
      error = 'Vul email en wachtwoord in';
      return;
    }

    loading = true;
    error = '';

    const result = await auth.login(email, password);

    loading = false;

    if (result.success) {
      goto('/');
    } else {
      error = result.error || 'Inloggen mislukt';
    }
  }
</script>

<svelte:head>
  <title>Inloggen - XML Customizer</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <h1 class="auth-title">XML Customizer</h1>
      <p class="auth-subtitle">Log in om door te gaan</p>
    </div>

    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label class="label" for="email">Email</label>
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
        <label class="label" for="password">Wachtwoord</label>
        <input
          class="input"
          type="password"
          id="password"
          bind:value={password}
          placeholder="********"
          autocomplete="current-password"
        />
        <a href="/forgot-password" class="forgot-link">Wachtwoord vergeten?</a>
      </div>

      <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
        {#if loading}
          <span class="spinner"></span>
        {/if}
        Inloggen
      </button>
    </form>

    <div class="auth-footer">
      <p>Nog geen account? <a href="/register">Registreer hier</a></p>
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

  .forgot-link {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--primary);
    text-decoration: none;
  }

  .forgot-link:hover {
    text-decoration: underline;
  }
</style>
