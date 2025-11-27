<script lang="ts">
  import '../app.css';
  import '$lib/i18n';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { _, isLoading } from 'svelte-i18n';
  import { auth, isAuthenticated } from '$lib/stores/auth';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import HelpPanel from '$lib/components/HelpPanel.svelte';

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/invite', '/forgot-password', '/reset-password', '/welcome', '/verify-email'];

  $: isPublicRoute = publicRoutes.some((route) => $page.url.pathname.startsWith(route));

  // Help panel state
  let helpOpen = false;

  // Initialize auth on mount
  onMount(() => {
    auth.init();
  });

  // Redirect logic
  $: {
    if ($auth.initialized && !$auth.loading) {
      if (!$isAuthenticated && !isPublicRoute) {
        goto('/login');
      } else if ($isAuthenticated && isPublicRoute) {
        goto('/');
      }
    }
  }

  async function handleLogout() {
    await auth.logout();
    goto('/login');
  }

  function toggleHelp() {
    helpOpen = !helpOpen;
  }
</script>

{#if $auth.loading && !$auth.initialized || $isLoading}
  <div class="loading-screen">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
{:else if isPublicRoute}
  <slot />
{:else if $isAuthenticated}
  <nav class="nav">
    <div class="container nav-content">
      <a href="/" class="nav-brand">
        <img src="/logo.png" alt="Tesoro" class="nav-logo" />
      </a>
      <div class="nav-links">
        <a href="/feeds" class="nav-link" class:active={$page.url.pathname.startsWith('/feeds')}>
          {$_('nav.feeds')}
        </a>
        <a href="/customers" class="nav-link" class:active={$page.url.pathname.startsWith('/customers')}>
          {$_('nav.customers')}
        </a>
        <a href="/analyzer" class="nav-link" class:active={$page.url.pathname.startsWith('/analyzer')}>
          {$_('analyzer.title')}
        </a>
        <a href="/team" class="nav-link" class:active={$page.url.pathname.startsWith('/team')}>
          {$_('team.title')}
        </a>
      </div>
      <div class="nav-user">
        <button class="help-button" on:click={toggleHelp} aria-label={$_('help.title')} title={$_('help.title')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
        <LanguageSwitcher />
        <a href="/profile" class="user-name-link" title={$_('profile.title')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="user-name">{$auth.user?.name}</span>
        </a>
        <button class="btn btn-secondary btn-sm" on:click={handleLogout}>
          {$_('nav.logout')}
        </button>
      </div>
    </div>
  </nav>

  <main class="container">
    <slot />
  </main>

  <HelpPanel bind:open={helpOpen} on:close={() => helpOpen = false} />
{/if}

<style>
  main {
    padding-bottom: 2rem;
  }

  .loading-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-muted);
  }

  .nav-user {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-name-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--text-muted);
    padding: 0.375rem 0.75rem;
    border-radius: var(--radius);
    transition: all 0.15s ease;
  }

  .user-name-link:hover {
    background: var(--border);
    color: var(--primary);
  }

  .user-name {
    font-size: 0.875rem;
  }

  .nav-logo {
    height: 32px;
    width: auto;
  }

  .help-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: var(--radius);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .help-button:hover {
    background: var(--border);
    color: var(--primary);
  }
</style>
