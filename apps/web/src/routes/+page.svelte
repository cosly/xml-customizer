<script lang="ts">
  import { onMount } from 'svelte';
  import { feedsApi, customersApi } from '$lib/api';
  import type { SourceFeed, Customer } from '@xml-customizer/shared';

  let feeds: SourceFeed[] = [];
  let customers: (Customer & { feed_count?: number; selection_count?: number })[] = [];
  let loading = true;

  onMount(async () => {
    try {
      [feeds, customers] = await Promise.all([
        feedsApi.list(),
        customersApi.list()
      ]);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Dashboard - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">Dashboard</h1>
</div>

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else}
  <div class="grid grid-3" style="margin-bottom: 2rem;">
    <div class="card">
      <div class="stat-label">Feeds</div>
      <div class="stat-value">{feeds.length}</div>
      <div class="stat-sub">
        {feeds.reduce((sum, f) => sum + f.property_count, 0)} properties totaal
      </div>
    </div>
    <div class="card">
      <div class="stat-label">Klanten</div>
      <div class="stat-value">{customers.length}</div>
      <div class="stat-sub">
        Met eigen XML endpoints
      </div>
    </div>
    <div class="card">
      <div class="stat-label">Selecties</div>
      <div class="stat-value">
        {customers.reduce((sum, c) => sum + (c.selection_count || 0), 0)}
      </div>
      <div class="stat-sub">
        Property selecties actief
      </div>
    </div>
  </div>

  <div class="grid grid-2">
    <div class="card">
      <h2 style="margin-bottom: 1rem;">Recente Feeds</h2>
      {#if feeds.length === 0}
        <div class="empty-state" style="padding: 1rem;">
          Geen feeds. <a href="/feeds">Voeg een feed toe</a>
        </div>
      {:else}
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          {#each feeds.slice(0, 5) as feed}
            <a href="/feeds/{feed.id}" class="feed-item">
              <span class="feed-name">{feed.name}</span>
              <span class="badge badge-primary">{feed.property_count} properties</span>
            </a>
          {/each}
        </div>
        {#if feeds.length > 5}
          <a href="/feeds" class="btn btn-secondary" style="width: 100%; margin-top: 1rem;">
            Alle feeds bekijken
          </a>
        {/if}
      {/if}
    </div>

    <div class="card">
      <h2 style="margin-bottom: 1rem;">Recente Klanten</h2>
      {#if customers.length === 0}
        <div class="empty-state" style="padding: 1rem;">
          Geen klanten. <a href="/customers">Voeg een klant toe</a>
        </div>
      {:else}
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          {#each customers.slice(0, 5) as customer}
            <a href="/customers/{customer.id}" class="feed-item">
              <span class="feed-name">{customer.name}</span>
              <span class="badge badge-success">{customer.selection_count || 0} selecties</span>
            </a>
          {/each}
        </div>
        {#if customers.length > 5}
          <a href="/customers" class="btn btn-secondary" style="width: 100%; margin-top: 1rem;">
            Alle klanten bekijken
          </a>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .stat-label {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary);
  }

  .stat-sub {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .feed-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    text-decoration: none;
    color: var(--text);
    transition: all 0.15s ease;
  }

  .feed-item:hover {
    border-color: var(--primary);
    background: var(--bg);
  }

  .feed-name {
    font-weight: 500;
  }
</style>
