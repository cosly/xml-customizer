<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { adminApi } from '$lib/api';
  import type { CompanyStats } from '@xml-customizer/shared';
  import { _ } from 'svelte-i18n';

  let companies: CompanyStats[] = [];
  let total = 0;
  let loading = true;
  let error = '';

  // Filters
  let search = '';
  let status: 'all' | 'active' | 'blocked' = 'all';
  let sortBy: 'name' | 'created_at' | 'last_login_at' | 'customer_count' | 'feed_count' = 'created_at';
  let sortOrder: 'asc' | 'desc' = 'desc';
  let currentPage = 1;
  const pageSize = 20;

  // Initialize from URL params
  onMount(() => {
    const params = $page.url.searchParams;
    search = params.get('search') || '';
    status = (params.get('status') as typeof status) || 'all';
    sortBy = (params.get('sort_by') as typeof sortBy) || 'created_at';
    sortOrder = (params.get('sort_order') as typeof sortOrder) || 'desc';
    currentPage = parseInt(params.get('page') || '1', 10);
    loadCompanies();
  });

  async function loadCompanies() {
    loading = true;
    error = '';
    try {
      const result = await adminApi.getCompanies({
        search: search || undefined,
        status,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });
      companies = result.companies;
      total = result.total;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Fout bij laden van bedrijven';
    } finally {
      loading = false;
    }
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'all') params.set('status', status);
    if (sortBy !== 'created_at') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);
    if (currentPage > 1) params.set('page', currentPage.toString());
    const query = params.toString();
    goto(`/admin/bedrijven${query ? `?${query}` : ''}`, { replaceState: true });
  }

  function handleSearch() {
    currentPage = 1;
    updateUrl();
    loadCompanies();
  }

  function handleFilterChange() {
    currentPage = 1;
    updateUrl();
    loadCompanies();
  }

  function handleSort(column: typeof sortBy) {
    if (sortBy === column) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortOrder = 'desc';
    }
    currentPage = 1;
    updateUrl();
    loadCompanies();
  }

  function handlePageChange(newPage: number) {
    currentPage = newPage;
    updateUrl();
    loadCompanies();
  }

  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return 'Nooit';
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  $: totalPages = Math.ceil(total / pageSize);
</script>

<svelte:head>
  <title>Bedrijven - Super Admin - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <div>
    <a href="/admin" class="back-link">← Terug naar Dashboard</a>
    <h1 class="page-title">Alle Bedrijven</h1>
  </div>
</div>

<!-- Search and Filters -->
<div class="filter-bar">
  <div class="filter-group">
    <label for="search">Zoeken</label>
    <input
      type="text"
      id="search"
      class="input"
      placeholder={$_('admin.searchPlaceholder')}
      bind:value={search}
      on:keydown={(e) => e.key === 'Enter' && handleSearch()}
    />
  </div>
  <div class="filter-group">
    <label for="status">Status</label>
    <select id="status" bind:value={status} on:change={handleFilterChange}>
      <option value="all">Alle</option>
      <option value="active">Actief</option>
      <option value="blocked">Geblokkeerd</option>
    </select>
  </div>
  <div class="filter-actions">
    <button class="btn btn-primary" on:click={handleSearch}>Zoeken</button>
    <button class="btn btn-secondary" on:click={() => {
      search = '';
      status = 'all';
      sortBy = 'created_at';
      sortOrder = 'desc';
      currentPage = 1;
      updateUrl();
      loadCompanies();
    }}>Reset</button>
  </div>
</div>

<!-- Results info -->
<div class="results-info">
  {total} bedrijven gevonden
  {#if search}
    voor "{search}"
  {/if}
</div>

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if error}
  <div class="alert alert-error">{error}</div>
{:else if companies.length === 0}
  <div class="empty-state">
    Geen bedrijven gevonden
  </div>
{:else}
  <div class="card" style="overflow-x: auto;">
    <table class="table">
      <thead>
        <tr>
          <th class="sortable" on:click={() => handleSort('name')}>
            Naam
            {#if sortBy === 'name'}
              <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th>Email</th>
          <th class="sortable" on:click={() => handleSort('customer_count')}>
            Klanten
            {#if sortBy === 'customer_count'}
              <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th class="sortable" on:click={() => handleSort('feed_count')}>
            Feeds
            {#if sortBy === 'feed_count'}
              <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th>Selecties</th>
          <th class="sortable" on:click={() => handleSort('last_login_at')}>
            Laatste Login
            {#if sortBy === 'last_login_at'}
              <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th class="sortable" on:click={() => handleSort('created_at')}>
            Aangemeld
            {#if sortBy === 'created_at'}
              <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each companies as company}
          <tr class:blocked={company.is_blocked}>
            <td>
              <a href="/admin/bedrijven/{company.id}" class="company-link">
                {company.name}
              </a>
            </td>
            <td class="email-cell">{company.email}</td>
            <td>{company.customer_count}</td>
            <td>{company.feed_count}</td>
            <td>{company.selection_count}</td>
            <td class="date-cell">{formatDateTime(company.last_login_at)}</td>
            <td class="date-cell">{formatDate(company.created_at)}</td>
            <td>
              {#if company.is_blocked}
                <span class="badge badge-danger">Geblokkeerd</span>
              {:else}
                <span class="badge badge-success">Actief</span>
              {/if}
            </td>
            <td>
              <a href="/admin/bedrijven/{company.id}" class="btn btn-secondary btn-sm">
                Bekijken
              </a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
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

  .sortable {
    cursor: pointer;
    user-select: none;
  }

  .sortable:hover {
    color: var(--primary);
  }

  .sort-indicator {
    margin-left: 0.25rem;
  }

  .company-link {
    font-weight: 500;
    color: var(--text);
    text-decoration: none;
  }

  .company-link:hover {
    color: var(--primary);
  }

  .email-cell {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .date-cell {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  tr.blocked {
    background: rgba(239, 68, 68, 0.05);
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
