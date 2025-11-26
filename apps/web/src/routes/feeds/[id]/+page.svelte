<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { feedsApi } from '$lib/api';
  import type { SourceFeed, PropertySummary } from '@xml-customizer/shared';

  let feed: SourceFeed | null = null;
  let properties: PropertySummary[] = [];
  let loading = true;
  let refreshing = false;
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
</script>

<svelte:head>
  <title>{feed?.name || 'Feed'} - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <div>
    <a href="/feeds" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">
      ← Terug naar feeds
    </a>
    <h1 class="page-title" style="margin-top: 0.5rem;">
      {#if loading}
        Laden...
      {:else if feed}
        {feed.name}
      {:else}
        Feed niet gevonden
      {/if}
    </h1>
  </div>
  {#if feed}
    <button class="btn btn-primary" on:click={refreshFeed} disabled={refreshing}>
      {#if refreshing}
        <span class="spinner"></span>
      {/if}
      Feed vernieuwen
    </button>
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
      <div class="stat-label">Laatst vernieuwd</div>
      <div style="font-weight: 500;">
        {#if feed.last_fetched_at}
          {new Date(feed.last_fetched_at).toLocaleString('nl-NL')}
        {:else}
          Nooit
        {/if}
      </div>
    </div>
    <div class="card" style="grid-column: span 2;">
      <div class="stat-label">Bron URL</div>
      <div style="font-size: 0.875rem; word-break: break-all; color: var(--text-muted);">
        {feed.url}
      </div>
    </div>
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
</style>
