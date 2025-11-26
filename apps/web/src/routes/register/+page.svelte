<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';

  let name = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let error = '';
  let loading = false;

  async function handleSubmit() {
    error = '';

    if (!name || !email || !password) {
      error = 'Vul alle velden in';
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

    const result = await auth.register(email, password, name);

    loading = false;

    if (result.success) {
      goto('/');
    } else {
      error = result.error || 'Registratie mislukt';
    }
  }
</script>

<svelte:head>
  <title>Registreren - Tesoro</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <img src="/logo.png" alt="Tesoro" class="auth-logo" />
      <p class="auth-subtitle">Maak een account aan</p>
    </div>

    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label class="label" for="name">Naam</label>
        <input
          class="input"
          type="text"
          id="name"
          bind:value={name}
          placeholder="Je bedrijfsnaam"
          autocomplete="name"
        />
      </div>

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
          placeholder="Minimaal 8 karakters"
          autocomplete="new-password"
        />
      </div>

      <div class="form-group">
        <label class="label" for="confirmPassword">Bevestig wachtwoord</label>
        <input
          class="input"
          type="password"
          id="confirmPassword"
          bind:value={confirmPassword}
          placeholder="Herhaal wachtwoord"
          autocomplete="new-password"
        />
      </div>

      <button type="submit" class="btn btn-primary btn-block" disabled={loading}>
        {#if loading}
          <span class="spinner"></span>
        {/if}
        Registreren
      </button>
    </form>

    <div class="auth-footer">
      <p>Al een account? <a href="/login">Log hier in</a></p>
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
</style>
