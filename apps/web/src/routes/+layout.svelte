<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { auth, isAuthenticated } from '$lib/stores/auth';

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

  $: isPublicRoute = publicRoutes.some((route) => $page.url.pathname.startsWith(route));
  $: isAdminRoute = $page.url.pathname.startsWith('/admin');
  $: isSuperAdmin = $auth.user?.is_super_admin === true;

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
      } else if (isAdminRoute && !isSuperAdmin && $isAuthenticated) {
        // Redirect non-admins away from admin routes
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
        {#if isSuperAdmin}
          <a href="/admin" class="nav-link admin-link" class:active={$page.url.pathname.startsWith('/admin')}>
            Admin
          </a>
        {/if}
      </div>
      <div class="nav-user">
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

  .admin-link {
    color: var(--warning) !important;
    font-weight: 600;
  }

  .admin-link:hover,
  .admin-link.active {
    color: var(--warning) !important;
  }
</style>
