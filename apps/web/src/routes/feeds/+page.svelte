<script lang="ts">
  import { onMount } from 'svelte';
  import { feedsApi } from '$lib/api';
  import type { SourceFeed } from '@xml-customizer/shared';

  let feeds: SourceFeed[] = [];
  let loading = true;
  let showModal = false;
  let formData = { name: '', url: '' };
  let submitting = false;
  let error = '';

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
{:else}
  <div class="card" style="padding: 0; overflow: hidden;">
    <table class="table">
      <thead>
        <tr>
          <th>Naam</th>
          <th>URL</th>
          <th>Properties</th>
          <th>Laatst vernieuwd</th>
          <th style="width: 150px;">Acties</th>
        </tr>
      </thead>
      <tbody>
        {#each feeds as feed}
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
                  {new Date(feed.last_fetched_at).toLocaleString('nl-NL')}
                </span>
              {:else}
                <span style="color: var(--text-muted);">Nooit</span>
              {/if}
            </td>
            <td>
              <div style="display: flex; gap: 0.25rem;">
                <button class="btn btn-secondary btn-sm" on:click={() => refreshFeed(feed.id)}>
                  Vernieuwen
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
              placeholder="Bijv. Tesoro XML Feed"
            />
          </div>
          <div class="form-group">
            <label class="label" for="url">XML URL</label>
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
