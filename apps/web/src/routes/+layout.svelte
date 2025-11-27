<script lang="ts">
  import '../app.css';
  import '$lib/i18n';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { auth, isAuthenticated } from '$lib/stores/auth';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/invite', '/forgot-password', '/reset-password', '/welcome'];

  $: isPublicRoute = publicRoutes.some((route) => $page.url.pathname.startsWith(route));

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
</script>

{#if $auth.loading && !$auth.initialized}
  <div class="loading-screen">
    <div class="spinner"></div>
    <p>Laden...</p>
  </div>
{:else if isPublicRoute}
  <slot />
{:else if $isAuthenticated}
  <nav class="nav">
    <div class="container nav-content">
      <a href="/" class="nav-brand">XML Customizer</a>
      <div class="nav-links">
        <a href="/feeds" class="nav-link" class:active={$page.url.pathname.startsWith('/feeds')}>
          Feeds
        </a>
        <a href="/customers" class="nav-link" class:active={$page.url.pathname.startsWith('/customers')}>
          Klanten
        </a>
        <a href="/team" class="nav-link" class:active={$page.url.pathname.startsWith('/team')}>
          Team
        </a>
      </div>
      <div class="nav-user">
        <LanguageSwitcher />
        <span class="user-name">{$auth.user?.name}</span>
        <button class="btn btn-secondary btn-sm" on:click={handleLogout}>
          Uitloggen
        </button>
      </div>
    </div>
  </nav>

  <main class="container">
    <slot />
  </main>
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

  .user-name {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
</style>
