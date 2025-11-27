<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { _ } from 'svelte-i18n';
  import { profileApi } from '$lib/api';

  let loading = true;
  let error = '';
  let success = false;
  let newEmail = '';

  onMount(async () => {
    const token = $page.url.searchParams.get('token');

    if (!token) {
      error = $_('profile.verifyEmail.noToken');
      loading = false;
      return;
    }

    try {
      const result = await profileApi.verifyEmailChange(token);
      success = true;
      newEmail = result.newEmail;
    } catch (e) {
      error = e instanceof Error ? e.message : $_('profile.verifyEmail.error');
    } finally {
      loading = false;
    }
  });

  function goToProfile() {
    goto('/profile');
  }

  function goToLogin() {
    goto('/login');
  }
</script>

<svelte:head>
  <title>{$_('profile.verifyEmail.title')} - Tesoro</title>
</svelte:head>

<div class="verify-page">
  <div class="verify-card">
    <div class="logo">
      <img src="/logo.png" alt="Tesoro" />
    </div>

    {#if loading}
      <div class="status">
        <div class="spinner"></div>
        <p>{$_('profile.verifyEmail.verifying')}</p>
      </div>
    {:else if error}
      <div class="status error">
        <div class="icon error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <h1>{$_('profile.verifyEmail.failed')}</h1>
        <p class="message">{error}</p>
        <button class="btn btn-primary" on:click={goToLogin}>
          {$_('profile.verifyEmail.goToLogin')}
        </button>
      </div>
    {:else if success}
      <div class="status success">
        <div class="icon success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h1>{$_('profile.verifyEmail.success')}</h1>
        <p class="message">{$_('profile.verifyEmail.successMessage', { values: { email: newEmail } })}</p>
        <button class="btn btn-primary" on:click={goToProfile}>
          {$_('profile.verifyEmail.goToProfile')}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .verify-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--background);
  }

  .verify-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2.5rem;
    max-width: 400px;
    width: 100%;
    text-align: center;
  }

  .logo {
    margin-bottom: 2rem;
  }

  .logo img {
    height: 40px;
    width: auto;
  }

  .status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .status h1 {
    font-size: 1.25rem;
    margin: 0;
  }

  .status .message {
    color: var(--text-muted);
    margin: 0;
    font-size: 0.875rem;
  }

  .icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .success-icon {
    background: #dcfce7;
    color: #16a34a;
  }

  .error-icon {
    background: #fee2e2;
    color: #dc2626;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .btn {
    margin-top: 1rem;
  }
</style>
