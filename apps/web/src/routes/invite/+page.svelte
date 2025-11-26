<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { teamApi, type InvitationDetails } from '$lib/api';

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
      error = 'Geen uitnodigingstoken gevonden';
      loading = false;
      return;
    }

    try {
      invitation = await teamApi.getInvitation(token);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Ongeldige of verlopen uitnodiging';
    } finally {
      loading = false;
    }
  });

  async function handleSubmit() {
    formError = '';

    if (!name.trim()) {
      formError = 'Naam is verplicht';
      return;
    }

    if (password.length < 8) {
      formError = 'Wachtwoord moet minimaal 8 karakters zijn';
      return;
    }

    if (password !== confirmPassword) {
      formError = 'Wachtwoorden komen niet overeen';
      return;
    }

    if (!invitation || !token) return;

    formLoading = true;
    try {
      const result = await auth.register(invitation.email, password, name.trim(), token);

      if (result.success) {
        goto('/');
      } else {
        formError = result.error || 'Registratie mislukt';
      }
    } catch (e) {
      formError = e instanceof Error ? e.message : 'Registratie mislukt';
    } finally {
      formLoading = false;
    }
  }

  function getRoleLabel(role: string): string {
    switch (role) {
      case 'admin': return 'beheerder';
      case 'member': return 'teamlid';
      default: return role;
    }
  }
</script>

<svelte:head>
  <title>Uitnodiging accepteren - XML Customizer</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <div class="auth-header">
      <h1 class="logo">XML Customizer</h1>
    </div>

    {#if loading}
      <div class="loading">Uitnodiging laden...</div>
    {:else if error}
      <div class="auth-body">
        <div class="alert alert-error">{error}</div>
        <p class="text-center">
          <a href="/login">Terug naar inloggen</a>
        </p>
      </div>
    {:else if invitation}
      <div class="auth-body">
        <div class="invitation-info">
          <h2>Je bent uitgenodigd!</h2>
          <p>
            <strong>{invitation.invited_by_name}</strong> heeft je uitgenodigd om als
            <strong>{getRoleLabel(invitation.role)}</strong> deel te nemen aan
            <strong>{invitation.organization_name}</strong>.
          </p>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              value={invitation.email}
              disabled
            />
          </div>

          <div class="form-group">
            <label for="name">Je naam</label>
            <input
              type="text"
              id="name"
              bind:value={name}
              placeholder="Je volledige naam"
              disabled={formLoading}
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Wachtwoord</label>
            <input
              type="password"
              id="password"
              bind:value={password}
              placeholder="Minimaal 8 karakters"
              disabled={formLoading}
              required
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Bevestig wachtwoord</label>
            <input
              type="password"
              id="confirmPassword"
              bind:value={confirmPassword}
              placeholder="Herhaal je wachtwoord"
              disabled={formLoading}
              required
            />
          </div>

          {#if formError}
            <div class="alert alert-error">{formError}</div>
          {/if}

          <button type="submit" class="btn btn-primary btn-block" disabled={formLoading}>
            {formLoading ? 'Bezig...' : 'Account aanmaken'}
          </button>
        </form>

        <p class="auth-footer">
          Heb je al een account? <a href="/login">Log in</a>
        </p>
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
    padding: 2rem;
    background: var(--bg-secondary);
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
