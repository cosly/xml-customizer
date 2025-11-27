<script lang="ts">
  import { onMount } from 'svelte';
  import { feedsApi } from '$lib/api';
  import type { SourceFeed } from '@xml-customizer/shared';
  import { _ } from 'svelte-i18n';

  let feeds: SourceFeed[] = [];
  let loading = true;
  let showModal = false;
  let formData = { name: '', url: '' };
  let submitting = false;
  let error = '';
  let searchQuery = '';
  let checkingFeeds: Set<number> = new Set();
  let refreshingFeeds: Set<number> = new Set();

  // Filtered feeds based on search
  $: filteredFeeds = feeds.filter((f) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(query) ||
      f.url.toLowerCase().includes(query)
    );
  });

  onMount(async () => {
    await loadFeeds();
  });

  async function loadFeeds() {
    loading = true;
    try {
      feeds = await feedsApi.list();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load feeds';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    if (!formData.name.trim() || !formData.url.trim()) {
      error = 'Naam en URL zijn verplicht';
      return;
    }

    submitting = true;
    error = '';

    try {
      await feedsApi.create(formData);
      showModal = false;
      formData = { name: '', url: '' };
      await loadFeeds();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create feed';
    } finally {
      submitting = false;
    }
  }

  async function deleteFeed(id: number) {
    if (!confirm('Weet je zeker dat je deze feed wilt verwijderen?')) return;

    try {
      await feedsApi.delete(id);
      await loadFeeds();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete feed';
    }
  }

  async function checkForUpdates(id: number) {
    checkingFeeds.add(id);
    checkingFeeds = checkingFeeds;
    try {
      await feedsApi.checkForUpdates(id);
      await loadFeeds();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to check for updates';
    } finally {
      checkingFeeds.delete(id);
      checkingFeeds = checkingFeeds;
    }
  }

  async function refreshFeed(id: number) {
    refreshingFeeds.add(id);
    refreshingFeeds = refreshingFeeds;
    try {
      await feedsApi.refresh(id);
      await loadFeeds();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to refresh feed';
    } finally {
      refreshingFeeds.delete(id);
      refreshingFeeds = refreshingFeeds;
    }
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
  <title>Feeds - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">Feeds</h1>
  <button class="btn btn-primary" on:click={() => (showModal = true)}>
    + Nieuwe Feed
  </button>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

{#if !loading && feeds.length > 0}
  <div class="search-bar">
    <input
      class="input"
      type="text"
      placeholder={$_('feeds.searchFeeds')}
      bind:value={searchQuery}
    />
    {#if searchQuery}
      <span class="search-results">{filteredFeeds.length} van {feeds.length} feeds</span>
    {/if}
  </div>
{/if}

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if feeds.length === 0}
  <div class="card">
    <div class="empty-state">
      <p>Nog geen feeds toegevoegd.</p>
      <button class="btn btn-primary" style="margin-top: 1rem;" on:click={() => (showModal = true)}>
        Voeg je eerste feed toe
      </button>
    </div>
  </div>
{:else if filteredFeeds.length === 0}
  <div class="card">
    <div class="empty-state">
      <p>Geen feeds gevonden voor "{searchQuery}"</p>
      <button class="btn btn-secondary" style="margin-top: 1rem;" on:click={() => (searchQuery = '')}>
        Wis zoekopdracht
      </button>
    </div>
  </div>
{:else}
  <div class="card" style="padding: 0; overflow: hidden;">
    <table class="table">
      <thead>
        <tr>
          <th>Naam</th>
          <th>URL</th>
          <th>Properties</th>
          <th>Status</th>
          <th style="width: 220px;">Acties</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredFeeds as feed}
          <tr>
            <td>
              <a href="/feeds/{feed.id}" class="feed-link">
                {feed.name}
              </a>
              {#if feed.update_available}
                <span class="badge badge-warning" title="Nieuwe versie beschikbaar">Update</span>
              {/if}
            </td>
            <td>
              <span class="url-cell">
                {feed.url}
              </span>
            </td>
            <td>
              <span class="badge badge-primary">{feed.property_count}</span>
            </td>
            <td>
              <div class="status-cell">
                <div class="status-row">
                  <span class="status-label">Opgehaald:</span>
                  <span class="status-value">{formatRelativeTime(feed.last_fetched_at)}</span>
                </div>
                <div class="status-row">
                  <span class="status-label">Gecontroleerd:</span>
                  <span class="status-value">{formatRelativeTime(feed.source_checked_at)}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button
                  class="btn btn-secondary btn-sm"
                  on:click={() => checkForUpdates(feed.id)}
                  disabled={checkingFeeds.has(feed.id)}
                  title="Controleer op updates (HEAD request)"
                >
                  {#if checkingFeeds.has(feed.id)}
                    <span class="spinner-sm"></span>
                  {:else}
                    Check
                  {/if}
                </button>
                <button
                  class="btn btn-sm"
                  class:btn-primary={feed.update_available}
                  class:btn-secondary={!feed.update_available}
                  on:click={() => refreshFeed(feed.id)}
                  disabled={refreshingFeeds.has(feed.id)}
                  title="Haal nieuwe data op"
                >
                  {#if refreshingFeeds.has(feed.id)}
                    <span class="spinner-sm"></span>
                  {:else}
                    Ophalen
                  {/if}
                </button>
                <button class="btn btn-danger btn-sm" on:click={() => deleteFeed(feed.id)}>
                  Verwijder
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if showModal}
  <div class="modal-overlay" on:click={() => (showModal = false)} on:keydown={(e) => e.key === 'Escape' && (showModal = false)}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3 class="modal-title">Nieuwe Feed</h3>
        <button class="btn btn-secondary btn-sm" on:click={() => (showModal = false)}>×</button>
      </div>
      <form on:submit|preventDefault={handleSubmit}>
        <div class="modal-body">
          <div class="form-group">
            <label class="label" for="name">Naam</label>
            <input
              class="input"
              type="text"
              id="name"
              bind:value={formData.name}
              placeholder={$_('feeds.namePlaceholder')}
            />
          </div>
          <div class="form-group">
            <label class="label" for="url">XML URL</label>
            <input
              class="input"
              type="url"
              id="url"
              bind:value={formData.url}
              placeholder={$_('feeds.urlPlaceholder')}
            />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" on:click={() => (showModal = false)}>
            Annuleren
          </button>
          <button type="submit" class="btn btn-primary" disabled={submitting}>
            {#if submitting}
              <span class="spinner"></span>
            {/if}
            Toevoegen
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .feed-link {
    font-weight: 500;
    color: var(--primary);
    text-decoration: none;
  }

  .feed-link:hover {
    text-decoration: underline;
  }

  .url-cell {
    font-size: 0.75rem;
    color: var(--text-muted);
    max-width: 250px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
  }

  .status-label {
    color: var(--text-muted);
  }

  .status-value {
    font-weight: 500;
  }

  .action-buttons {
    display: flex;
    gap: 0.25rem;
  }

  .badge-warning {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
    margin-left: 0.5rem;
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
