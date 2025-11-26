<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { adminApi } from '$lib/api';
  import type { CompanyDetail } from '@xml-customizer/shared';

  let company: CompanyDetail | null = null;
  let loading = true;
  let error = '';
  let actionLoading = false;
  let actionMessage = '';
  let actionError = '';

  // Block modal
  let showBlockModal = false;
  let blockReason = '';

  $: companyId = parseInt($page.params.id, 10);

  onMount(async () => {
    if (isNaN(companyId)) {
      error = 'Ongeldig bedrijf ID';
      loading = false;
      return;
    }
    await loadCompany();
  });

  async function loadCompany() {
    loading = true;
    error = '';
    try {
      company = await adminApi.getCompany(companyId);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Fout bij laden van bedrijf';
    } finally {
      loading = false;
    }
  }

  async function handleBlock() {
    if (!company) return;
    actionLoading = true;
    actionError = '';
    actionMessage = '';
    try {
      await adminApi.blockCompany(company.id, blockReason || undefined);
      actionMessage = 'Bedrijf is geblokkeerd';
      showBlockModal = false;
      blockReason = '';
      await loadCompany();
    } catch (e) {
      actionError = e instanceof Error ? e.message : 'Fout bij blokkeren';
    } finally {
      actionLoading = false;
    }
  }

  async function handleUnblock() {
    if (!company) return;
    if (!confirm('Weet je zeker dat je dit bedrijf wilt deblokkeren?')) return;
    actionLoading = true;
    actionError = '';
    actionMessage = '';
    try {
      await adminApi.unblockCompany(company.id);
      actionMessage = 'Bedrijf is gedeblokkeerd';
      await loadCompany();
    } catch (e) {
      actionError = e instanceof Error ? e.message : 'Fout bij deblokkeren';
    } finally {
      actionLoading = false;
    }
  }

  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return 'Nooit';
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function getActivityIcon(type: string): string {
    switch (type) {
      case 'customer_created': return '👤';
      case 'feed_created': return '📡';
      case 'selection_updated': return '✏️';
      default: return '📋';
    }
  }
</script>

<svelte:head>
  <title>{company?.name || 'Bedrijf'} - Super Admin - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <div>
    <a href="/admin/bedrijven" class="back-link">← Terug naar Bedrijven</a>
    <h1 class="page-title">{company?.name || 'Bedrijf laden...'}</h1>
  </div>
  {#if company}
    <div class="header-actions">
      {#if company.is_blocked}
        <button
          class="btn btn-primary"
          on:click={handleUnblock}
          disabled={actionLoading}
        >
          {actionLoading ? 'Bezig...' : 'Deblokkeren'}
        </button>
      {:else}
        <button
          class="btn btn-danger"
          on:click={() => showBlockModal = true}
          disabled={actionLoading}
        >
          Blokkeren
        </button>
      {/if}
    </div>
  {/if}
</div>

{#if actionMessage}
  <div class="alert alert-success">{actionMessage}</div>
{/if}

{#if actionError}
  <div class="alert alert-error">{actionError}</div>
{/if}

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if error}
  <div class="alert alert-error">{error}</div>
{:else if company}
  <!-- Status Banner -->
  {#if company.is_blocked}
    <div class="alert alert-error" style="margin-bottom: 1.5rem;">
      <strong>Dit bedrijf is geblokkeerd</strong>
      {#if company.blocked_at}
        <br />
        <span>Geblokkeerd op: {formatDateTime(company.blocked_at)}</span>
      {/if}
      {#if company.blocked_reason}
        <br />
        <span>Reden: {company.blocked_reason}</span>
      {/if}
    </div>
  {/if}

  <!-- Company Info -->
  <div class="grid grid-3" style="margin-bottom: 2rem;">
    <div class="card">
      <h3>Bedrijfsgegevens</h3>
      <div class="info-list">
        <div class="info-item">
          <span class="info-label">Naam</span>
          <span class="info-value">{company.name}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value">{company.email}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Aangemeld</span>
          <span class="info-value">{formatDate(company.created_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Laatste Login</span>
          <span class="info-value">{formatDateTime(company.last_login_at)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Status</span>
          <span class="info-value">
            {#if company.is_blocked}
              <span class="badge badge-danger">Geblokkeerd</span>
            {:else}
              <span class="badge badge-success">Actief</span>
            {/if}
          </span>
        </div>
      </div>
    </div>

    <div class="card stat-card">
      <h3>Statistieken</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number">{company.feed_count}</div>
          <div class="stat-label">Feeds</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{company.customer_count}</div>
          <div class="stat-label">Klanten</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{company.selection_count}</div>
          <div class="stat-label">Selecties</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{company.property_count}</div>
          <div class="stat-label">Properties</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Recente Activiteit</h3>
      {#if company.recent_activity.length === 0}
        <div class="empty-state" style="padding: 1rem;">
          Geen recente activiteit
        </div>
      {:else}
        <div class="activity-list">
          {#each company.recent_activity.slice(0, 5) as activity}
            <div class="activity-item">
              <span class="activity-icon">{getActivityIcon(activity.type)}</span>
              <div class="activity-content">
                <span class="activity-desc">{activity.description}</span>
                <span class="activity-date">{formatDate(activity.created_at)}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Customers (Employees) -->
  <div class="card" style="margin-bottom: 2rem;">
    <h3 style="margin-bottom: 1rem;">Klanten ({company.customer_count})</h3>
    {#if company.customers.length === 0}
      <div class="empty-state" style="padding: 1rem;">
        Dit bedrijf heeft nog geen klanten aangemaakt
      </div>
    {:else}
      <div style="overflow-x: auto;">
        <table class="table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Email</th>
              <th>Hash ID</th>
              <th>Selecties</th>
              <th>Aangemaakt</th>
            </tr>
          </thead>
          <tbody>
            {#each company.customers as customer}
              <tr>
                <td class="customer-name">{customer.name}</td>
                <td class="email-cell">{customer.email || '-'}</td>
                <td>
                  <code class="hash-id">{customer.hash_id}</code>
                </td>
                <td>{customer.selection_count}</td>
                <td class="date-cell">{formatDate(customer.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Feeds -->
  <div class="card">
    <h3 style="margin-bottom: 1rem;">Feeds ({company.feed_count})</h3>
    {#if company.feeds.length === 0}
      <div class="empty-state" style="padding: 1rem;">
        Dit bedrijf heeft nog geen feeds aangemaakt
      </div>
    {:else}
      <div style="overflow-x: auto;">
        <table class="table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>URL</th>
              <th>Properties</th>
              <th>Laatst Opgehaald</th>
              <th>Aangemaakt</th>
            </tr>
          </thead>
          <tbody>
            {#each company.feeds as feed}
              <tr>
                <td class="feed-name">{feed.name}</td>
                <td class="url-cell">
                  <a href={feed.url} target="_blank" rel="noopener" class="url-link">
                    {feed.url.length > 50 ? feed.url.substring(0, 50) + '...' : feed.url}
                  </a>
                </td>
                <td>{feed.property_count}</td>
                <td class="date-cell">{formatDateTime(feed.last_fetched_at)}</td>
                <td class="date-cell">{formatDate(feed.created_at)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}

<!-- Block Modal -->
{#if showBlockModal}
  <div class="modal-overlay" on:click={() => showBlockModal = false}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h2 class="modal-title">Bedrijf Blokkeren</h2>
        <button class="btn btn-secondary btn-sm" on:click={() => showBlockModal = false}>×</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 1rem;">
          Weet je zeker dat je <strong>{company?.name}</strong> wilt blokkeren?
          Dit zorgt ervoor dat alle gebruikers van dit bedrijf niet meer kunnen inloggen.
        </p>
        <div class="form-group">
          <label class="label" for="blockReason">Reden (optioneel)</label>
          <textarea
            id="blockReason"
            class="input"
            rows="3"
            placeholder="Voer een reden in voor het blokkeren..."
            bind:value={blockReason}
          ></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showBlockModal = false}>
          Annuleren
        </button>
        <button
          class="btn btn-danger"
          on:click={handleBlock}
          disabled={actionLoading}
        >
          {actionLoading ? 'Bezig...' : 'Blokkeren'}
        </button>
      </div>
    </div>
  </div>
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

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .info-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .info-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .info-value {
    font-weight: 500;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-top: 1rem;
  }

  .stat-item {
    text-align: center;
    padding: 0.75rem;
    background: var(--bg);
    border-radius: var(--radius);
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--bg);
    border-radius: var(--radius);
  }

  .activity-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;
    min-width: 0;
  }

  .activity-desc {
    font-size: 0.875rem;
    display: block;
  }

  .activity-date {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .customer-name,
  .feed-name {
    font-weight: 500;
  }

  .email-cell {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .date-cell {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .hash-id {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background: var(--bg);
    border-radius: 4px;
  }

  .url-cell {
    max-width: 300px;
  }

  .url-link {
    font-size: 0.75rem;
    color: var(--primary);
    text-decoration: none;
    word-break: break-all;
  }

  .url-link:hover {
    text-decoration: underline;
  }

  .badge-danger {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
  }

  textarea.input {
    resize: vertical;
    min-height: 80px;
  }
</style>
