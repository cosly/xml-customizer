<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '$lib/api';
  import type { ActivityLogEntry } from '@xml-customizer/shared';

  let entries: ActivityLogEntry[] = [];
  let total = 0;
  let loading = true;
  let error = '';

  // Filters
  let actionFilter = '';
  let targetTypeFilter = '';
  let currentPage = 1;
  const pageSize = 30;

  onMount(loadActivity);

  async function loadActivity() {
    loading = true;
    error = '';
    try {
      const result = await adminApi.getActivity({
        action: actionFilter || undefined,
        target_type: targetTypeFilter || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });
      entries = result.entries;
      total = result.total;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Fout bij laden van activiteit';
    } finally {
      loading = false;
    }
  }

  function handleFilterChange() {
    currentPage = 1;
    loadActivity();
  }

  function handlePageChange(newPage: number) {
    currentPage = newPage;
    loadActivity();
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'view_dashboard': 'Dashboard bekeken',
      'view_company': 'Bedrijf bekeken',
      'block_company': 'Bedrijf geblokkeerd',
      'unblock_company': 'Bedrijf gedeblokkeerd',
    };
    return labels[action] || action;
  }

  function getActionBadgeClass(action: string): string {
    if (action.includes('block')) return 'badge-danger';
    if (action.includes('unblock')) return 'badge-success';
    return 'badge-primary';
  }

  function parseDetails(details: string | null): Record<string, unknown> | null {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  }

  $: totalPages = Math.ceil(total / pageSize);
</script>

<svelte:head>
  <title>Activiteit Log - Super Admin - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <div>
    <a href="/admin" class="back-link">← Terug naar Dashboard</a>
    <h1 class="page-title">Activiteit Log</h1>
  </div>
</div>

<!-- Filters -->
<div class="filter-bar">
  <div class="filter-group">
    <label for="action">Actie</label>
    <select id="action" bind:value={actionFilter} on:change={handleFilterChange}>
      <option value="">Alle acties</option>
      <option value="view_dashboard">Dashboard bekeken</option>
      <option value="view_company">Bedrijf bekeken</option>
      <option value="block_company">Bedrijf geblokkeerd</option>
      <option value="unblock_company">Bedrijf gedeblokkeerd</option>
    </select>
  </div>
  <div class="filter-group">
    <label for="targetType">Type</label>
    <select id="targetType" bind:value={targetTypeFilter} on:change={handleFilterChange}>
      <option value="">Alle types</option>
      <option value="user">Gebruiker</option>
      <option value="customer">Klant</option>
      <option value="feed">Feed</option>
    </select>
  </div>
  <div class="filter-actions">
    <button class="btn btn-secondary" on:click={() => {
      actionFilter = '';
      targetTypeFilter = '';
      currentPage = 1;
      loadActivity();
    }}>Reset</button>
  </div>
</div>

<!-- Results info -->
<div class="results-info">
  {total} activiteiten gevonden
</div>

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if error}
  <div class="alert alert-error">{error}</div>
{:else if entries.length === 0}
  <div class="empty-state">
    Geen activiteiten gevonden
  </div>
{:else}
  <div class="activity-list">
    {#each entries as entry}
      <div class="activity-card card">
        <div class="activity-header">
          <span class="badge {getActionBadgeClass(entry.action)}">
            {getActionLabel(entry.action)}
          </span>
          <span class="activity-time">{formatDateTime(entry.created_at)}</span>
        </div>
        <div class="activity-body">
          <div class="activity-admin">
            <span class="admin-name">{entry.admin_name}</span>
            <span class="admin-email">{entry.admin_email}</span>
          </div>
          {#if entry.target_type && entry.target_id}
            <div class="activity-target">
              <span class="target-label">
                {entry.target_type === 'user' ? 'Bedrijf' :
                 entry.target_type === 'customer' ? 'Klant' :
                 entry.target_type === 'feed' ? 'Feed' : entry.target_type}:
              </span>
              {#if entry.target_type === 'user'}
                <a href="/admin/bedrijven/{entry.target_id}" class="target-link">
                  {entry.target_name || `#${entry.target_id}`}
                </a>
              {:else}
                <span>{entry.target_name || `#${entry.target_id}`}</span>
              {/if}
            </div>
          {/if}
          {#if entry.details}
            {@const details = parseDetails(entry.details)}
            {#if details && details.reason}
              <div class="activity-details">
                <span class="details-label">Reden:</span>
                <span>{details.reason}</span>
              </div>
            {/if}
          {/if}
          {#if entry.ip_address}
            <div class="activity-ip">
              IP: {entry.ip_address}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="pagination">
      <button
        class="btn btn-secondary btn-sm"
        disabled={currentPage === 1}
        on:click={() => handlePageChange(currentPage - 1)}
      >
        Vorige
      </button>
      <span class="page-info">
        Pagina {currentPage} van {totalPages}
      </span>
      <button
        class="btn btn-secondary btn-sm"
        disabled={currentPage === totalPages}
        on:click={() => handlePageChange(currentPage + 1)}
      >
        Volgende
      </button>
    </div>
  {/if}
{/if}

<style>
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    text-decoration: none;
    display: inline-block;
    margin-bottom: 0.5rem;
  }

  .back-link:hover {
    color: var(--primary);
  }

  .results-info {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .activity-card {
    padding: 1rem;
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .activity-time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .activity-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .activity-admin {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .admin-name {
    font-weight: 500;
  }

  .admin-email {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .activity-target {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .target-label {
    color: var(--text-muted);
  }

  .target-link {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
  }

  .target-link:hover {
    text-decoration: underline;
  }

  .activity-details {
    font-size: 0.875rem;
    padding: 0.5rem;
    background: var(--bg);
    border-radius: var(--radius);
  }

  .details-label {
    color: var(--text-muted);
    margin-right: 0.25rem;
  }

  .activity-ip {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .badge-danger {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .page-info {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
</style>
