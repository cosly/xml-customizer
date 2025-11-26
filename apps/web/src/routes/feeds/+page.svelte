<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount } from 'svelte';
  import { feedsApi } from '$lib/api';
  import type { SourceFeed } from '@xml-customizer/shared';

  let feeds: SourceFeed[] = [];
  let loading = true;
  let showModal = false;
  let formData = { name: '', url: '' };
  let submitting = false;
  let error = '';
  let searchQuery = '';

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
      error = $_('errors.required');
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
    if (!confirm($_('feeds.confirmDelete'))) return;

    try {
      await feedsApi.delete(id);
      await loadFeeds();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete feed';
    }
  }

  async function refreshFeed(id: number) {
    try {
      await feedsApi.refresh(id);
      await loadFeeds();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to refresh feed';
    }
  }
</script>

<svelte:head>
  <title>{$_('feeds.title')} - Tesoro CRM</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">{$_('feeds.title')}</h1>
  <button class="btn btn-primary" on:click={() => (showModal = true)}>
    + {$_('feeds.newFeed')}
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
      <span class="search-results">{filteredFeeds.length} / {feeds.length}</span>
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
      <p>{$_('feeds.noFeeds')}</p>
      <button class="btn btn-primary" style="margin-top: 1rem;" on:click={() => (showModal = true)}>
        + {$_('feeds.newFeed')}
      </button>
    </div>
  </div>
{:else if filteredFeeds.length === 0}
  <div class="card">
    <div class="empty-state">
      <p>{$_('errors.notFound')}</p>
      <button class="btn btn-secondary" style="margin-top: 1rem;" on:click={() => (searchQuery = '')}>
        {$_('common.refresh')}
      </button>
    </div>
  </div>
{:else}
  <div class="card" style="padding: 0; overflow: hidden;">
    <table class="table">
      <thead>
        <tr>
          <th>{$_('feeds.feedName')}</th>
          <th>URL</th>
          <th>{$_('properties.title')}</th>
          <th>{$_('feeds.lastUpdated')}</th>
          <th style="width: 150px;">{$_('common.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredFeeds as feed}
          <tr>
            <td>
              <a href="/feeds/{feed.id}" style="font-weight: 500; color: var(--primary); text-decoration: none;">
                {feed.name}
              </a>
            </td>
            <td>
              <span style="font-size: 0.75rem; color: var(--text-muted); max-width: 300px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {feed.url}
              </span>
            </td>
            <td>
              <span class="badge badge-primary">{feed.property_count}</span>
            </td>
            <td>
              {#if feed.last_fetched_at}
                <span style="font-size: 0.875rem;">
                  {new Date(feed.last_fetched_at).toLocaleString()}
                </span>
              {:else}
                <span style="color: var(--text-muted);">-</span>
              {/if}
            </td>
            <td>
              <div style="display: flex; gap: 0.25rem;">
                <button class="btn btn-secondary btn-sm" on:click={() => refreshFeed(feed.id)}>
                  {$_('feeds.refresh')}
                </button>
                <button class="btn btn-danger btn-sm" on:click={() => deleteFeed(feed.id)}>
                  {$_('common.delete')}
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
        <h3 class="modal-title">{$_('feeds.newFeed')}</h3>
        <button class="btn btn-secondary btn-sm" on:click={() => (showModal = false)}>×</button>
      </div>
      <form on:submit|preventDefault={handleSubmit}>
        <div class="modal-body">
          <div class="form-group">
            <label class="label" for="name">{$_('feeds.feedName')}</label>
            <input
              class="input"
              type="text"
              id="name"
              bind:value={formData.name}
              placeholder="Tesoro XML Feed"
            />
          </div>
          <div class="form-group">
            <label class="label" for="url">{$_('feeds.feedUrl')}</label>
            <input
              class="input"
              type="url"
              id="url"
              bind:value={formData.url}
              placeholder="https://api.tesoro.estate/mls/..."
            />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" on:click={() => (showModal = false)}>
            {$_('common.cancel')}
          </button>
          <button type="submit" class="btn btn-primary" disabled={submitting}>
            {#if submitting}
              <span class="spinner"></span>
            {/if}
            {$_('common.create')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
