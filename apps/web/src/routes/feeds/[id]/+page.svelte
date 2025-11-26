<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { feedsApi } from '$lib/api';
  import type { SourceFeed, PropertySummary } from '@xml-customizer/shared';

  let feed: SourceFeed | null = null;
  let properties: PropertySummary[] = [];
  let loading = true;
  let refreshing = false;
  let checking = false;
  let error = '';

  $: feedId = parseInt($page.params.id, 10);

  onMount(async () => {
    await loadFeed();
  });

  async function loadFeed() {
    loading = true;
    error = '';
    try {
      [feed, properties] = await Promise.all([
        feedsApi.get(feedId),
        feedsApi.getProperties(feedId).catch(() => [])
      ]);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load feed';
    } finally {
      loading = false;
    }
  }

  async function checkForUpdates() {
    checking = true;
    error = '';
    try {
      await feedsApi.checkForUpdates(feedId);
      feed = await feedsApi.get(feedId);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to check for updates';
    } finally {
      checking = false;
    }
  }

  async function refreshFeed() {
    refreshing = true;
    error = '';
    try {
      await feedsApi.refresh(feedId);
      await loadFeed();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to refresh feed';
    } finally {
      refreshing = false;
    }
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(price);
  }

  function formatRelativeTime(dateStr: string | undefined): string {
    if (!dateStr) return 'Nooit';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Zojuist';
    if (diffMins < 60) return `${diffMins} min geleden`;
    if (diffHours < 24) return `${diffHours} uur geleden`;
    if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'en' : ''} geleden`;
    return date.toLocaleDateString('nl-NL');
  }
</script>

<svelte:head>
  <title>{feed?.name || 'Feed'} - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <div>
    <a href="/feeds" class="back-link">
      ← Terug naar feeds
    </a>
    <h1 class="page-title" style="margin-top: 0.5rem;">
      {#if loading}
        Laden...
      {:else if feed}
        {feed.name}
        {#if feed.update_available}
          <span class="badge badge-warning">Update beschikbaar</span>
        {/if}
      {:else}
        Feed niet gevonden
      {/if}
    </h1>
  </div>
  {#if feed}
    <div class="header-actions">
      <button class="btn btn-secondary" on:click={checkForUpdates} disabled={checking} title="Controleer op updates">
        {#if checking}
          <span class="spinner-sm"></span>
        {:else}
          Check updates
        {/if}
      </button>
      <button
        class="btn"
        class:btn-primary={feed.update_available}
        class:btn-secondary={!feed.update_available}
        on:click={refreshFeed}
        disabled={refreshing}
      >
        {#if refreshing}
          <span class="spinner"></span>
        {/if}
        Feed ophalen
      </button>
    </div>
  {/if}
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if feed}
  <div class="grid grid-4" style="margin-bottom: 1.5rem;">
    <div class="card">
      <div class="stat-label">Properties</div>
      <div class="stat-value">{properties.length}</div>
    </div>
    <div class="card">
      <div class="stat-label">Laatst opgehaald</div>
      <div class="stat-time">{formatRelativeTime(feed.last_fetched_at)}</div>
      {#if feed.last_fetched_at}
        <div class="stat-detail">{new Date(feed.last_fetched_at).toLocaleString('nl-NL')}</div>
      {/if}
    </div>
    <div class="card">
      <div class="stat-label">Laatst gecontroleerd</div>
      <div class="stat-time">{formatRelativeTime(feed.source_checked_at)}</div>
      {#if feed.source_checked_at}
        <div class="stat-detail">{new Date(feed.source_checked_at).toLocaleString('nl-NL')}</div>
      {/if}
    </div>
    <div class="card">
      <div class="stat-label">Status</div>
      {#if feed.update_available}
        <div class="stat-status update-available">Nieuwe versie beschikbaar</div>
      {:else if feed.source_checked_at}
        <div class="stat-status up-to-date">Up-to-date</div>
      {:else}
        <div class="stat-status unknown">Nog niet gecontroleerd</div>
      {/if}
    </div>
  </div>

  <div class="card url-card" style="margin-bottom: 1.5rem;">
    <div class="stat-label">Bron URL</div>
    <div class="url-value">{feed.url}</div>
  </div>

  <div class="card">
    <h2 style="margin-bottom: 1rem;">Properties ({properties.length})</h2>

    {#if properties.length === 0}
      <div class="empty-state">
        <p>Geen properties in deze feed.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" on:click={refreshFeed}>
          Feed ophalen
        </button>
      </div>
    {:else}
      <div class="grid grid-3">
        {#each properties as property}
          <div class="property-card">
            {#if property.image_url}
              <img src={property.image_url} alt={property.ref} class="property-image" />
            {:else}
              <div class="property-image" style="display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
                📷
              </div>
            {/if}
            <div class="property-info">
              <div class="property-ref">{property.ref}</div>
              <div class="property-details">
                {property.type} in {property.town}
              </div>
              <div class="property-details">
                {property.beds} slaapkamers • {property.baths} badkamers
              </div>
              <div class="property-price">{formatPrice(property.price)}</div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .back-link {
    color: var(--text-muted);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .back-link:hover {
    color: var(--primary);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
  }

  .stat-time {
    font-weight: 500;
    font-size: 1rem;
  }

  .stat-detail {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .stat-status {
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);
    display: inline-block;
    font-size: 0.875rem;
  }

  .stat-status.update-available {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
  }

  .stat-status.up-to-date {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success);
  }

  .stat-status.unknown {
    background: var(--bg);
    color: var(--text-muted);
  }

  .url-value {
    font-size: 0.875rem;
    word-break: break-all;
    color: var(--text-muted);
  }

  .badge-warning {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
    margin-left: 0.75rem;
    font-size: 0.75rem;
    vertical-align: middle;
  }

  .spinner-sm {
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
