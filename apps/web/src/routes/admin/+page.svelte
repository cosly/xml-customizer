<script lang="ts">
  import { onMount } from 'svelte';
  import { adminApi } from '$lib/api';
  import type { DashboardStats, CompanyStats, GrowthDataPoint } from '@xml-customizer/shared';

  let stats: DashboardStats | null = null;
  let topCompanies: CompanyStats[] = [];
  let growthData: GrowthDataPoint[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const [dashboardData, topData, growthResult] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getTopCompanies('customers', 5),
        adminApi.getGrowthStats(14),
      ]);
      stats = dashboardData;
      topCompanies = topData.companies;
      growthData = growthResult.growth;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Fout bij laden van data';
    } finally {
      loading = false;
    }
  });

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
    });
  }

  function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return 'Nooit';
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<svelte:head>
  <title>Super Admin Dashboard - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">Super Admin Dashboard</h1>
  <div style="display: flex; gap: 0.5rem;">
    <a href="/admin/bedrijven" class="btn btn-primary">Alle Bedrijven</a>
    <a href="/admin/activiteit" class="btn btn-secondary">Activiteit Log</a>
  </div>
</div>

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if error}
  <div class="alert alert-error">{error}</div>
{:else if stats}
  <!-- Main Stats -->
  <div class="grid grid-4" style="margin-bottom: 2rem;">
    <div class="card stat-card">
      <div class="stat-label">Totaal Bedrijven</div>
      <div class="stat-value">{stats.total_companies}</div>
      <div class="stat-sub">
        <span class="badge badge-success">{stats.active_companies} actief</span>
        {#if stats.blocked_companies > 0}
          <span class="badge badge-danger">{stats.blocked_companies} geblokkeerd</span>
        {/if}
      </div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Totaal Feeds</div>
      <div class="stat-value">{stats.total_feeds}</div>
      <div class="stat-sub">{stats.total_properties.toLocaleString()} properties</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Totaal Klanten</div>
      <div class="stat-value">{stats.total_customers}</div>
      <div class="stat-sub">Van alle bedrijven</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Totaal Selecties</div>
      <div class="stat-value">{stats.total_selections}</div>
      <div class="stat-sub">Property selecties</div>
    </div>
  </div>

  <!-- Growth & Activity Stats -->
  <div class="grid grid-3" style="margin-bottom: 2rem;">
    <div class="card">
      <h3 style="margin-bottom: 1rem;">Nieuwe Registraties</h3>
      <div class="growth-stats">
        <div class="growth-item">
          <span class="growth-label">Vandaag</span>
          <span class="growth-value">{stats.new_companies_today}</span>
        </div>
        <div class="growth-item">
          <span class="growth-label">Deze week</span>
          <span class="growth-value">{stats.new_companies_week}</span>
        </div>
        <div class="growth-item">
          <span class="growth-label">Deze maand</span>
          <span class="growth-value">{stats.new_companies_month}</span>
        </div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-bottom: 1rem;">Activiteit</h3>
      <div class="growth-stats">
        <div class="growth-item">
          <span class="growth-label">Actief vandaag</span>
          <span class="growth-value">{stats.active_today}</span>
        </div>
        <div class="growth-item">
          <span class="growth-label">Actief deze week</span>
          <span class="growth-value">{stats.active_week}</span>
        </div>
        <div class="growth-item">
          <span class="growth-label">Conversie</span>
          <span class="growth-value">
            {stats.total_companies > 0
              ? Math.round((stats.active_week / stats.total_companies) * 100)
              : 0}%
          </span>
        </div>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-bottom: 1rem;">Gemiddelden</h3>
      <div class="growth-stats">
        <div class="growth-item">
          <span class="growth-label">Feeds/bedrijf</span>
          <span class="growth-value">
            {stats.total_companies > 0
              ? (stats.total_feeds / stats.total_companies).toFixed(1)
              : 0}
          </span>
        </div>
        <div class="growth-item">
          <span class="growth-label">Klanten/bedrijf</span>
          <span class="growth-value">
            {stats.total_companies > 0
              ? (stats.total_customers / stats.total_companies).toFixed(1)
              : 0}
          </span>
        </div>
        <div class="growth-item">
          <span class="growth-label">Selecties/klant</span>
          <span class="growth-value">
            {stats.total_customers > 0
              ? (stats.total_selections / stats.total_customers).toFixed(1)
              : 0}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Growth Chart -->
  {#if growthData.length > 0}
    <div class="card" style="margin-bottom: 2rem;">
      <h3 style="margin-bottom: 1rem;">Groei Laatste 14 Dagen</h3>
      <div class="chart-container">
        <div class="chart">
          {#each growthData as point}
            <div class="chart-bar-group">
              <div class="chart-bars">
                <div
                  class="chart-bar companies"
                  style="height: {Math.max(point.new_companies * 20, 2)}px"
                  title="{point.new_companies} nieuwe bedrijven"
                ></div>
                <div
                  class="chart-bar customers"
                  style="height: {Math.max(point.new_customers * 10, 2)}px"
                  title="{point.new_customers} nieuwe klanten"
                ></div>
                <div
                  class="chart-bar feeds"
                  style="height: {Math.max(point.new_feeds * 15, 2)}px"
                  title="{point.new_feeds} nieuwe feeds"
                ></div>
              </div>
              <div class="chart-label">{formatDate(point.date)}</div>
            </div>
          {/each}
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-color companies"></span> Bedrijven</span>
          <span class="legend-item"><span class="legend-color customers"></span> Klanten</span>
          <span class="legend-item"><span class="legend-color feeds"></span> Feeds</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Top Companies -->
  <div class="grid grid-2">
    <div class="card">
      <h3 style="margin-bottom: 1rem;">Top Bedrijven (Klanten)</h3>
      {#if topCompanies.length === 0}
        <div class="empty-state" style="padding: 1rem;">
          Geen bedrijven gevonden
        </div>
      {:else}
        <div class="company-list">
          {#each topCompanies as company, i}
            <a href="/admin/bedrijven/{company.id}" class="company-item">
              <span class="company-rank">#{i + 1}</span>
              <div class="company-info">
                <span class="company-name">{company.name}</span>
                <span class="company-email">{company.email}</span>
              </div>
              <div class="company-stats">
                <span class="badge badge-primary">{company.customer_count} klanten</span>
                <span class="badge badge-success">{company.feed_count} feeds</span>
              </div>
            </a>
          {/each}
        </div>
        <a href="/admin/bedrijven?sort_by=customer_count&sort_order=desc" class="btn btn-secondary" style="width: 100%; margin-top: 1rem;">
          Alle bedrijven bekijken
        </a>
      {/if}
    </div>

    <div class="card">
      <h3 style="margin-bottom: 1rem;">Recente Activiteit</h3>
      <div class="empty-state" style="padding: 1rem;">
        <a href="/admin/activiteit" class="btn btn-primary">Bekijk Activiteit Log</a>
      </div>
    </div>
  </div>
{/if}

<style>
  .stat-card {
    text-align: center;
  }

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
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .badge-danger {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
  }

  .growth-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .growth-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: var(--bg);
    border-radius: var(--radius);
  }

  .growth-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .growth-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary);
  }

  .chart-container {
    overflow-x: auto;
  }

  .chart {
    display: flex;
    gap: 0.5rem;
    align-items: flex-end;
    min-height: 120px;
    padding: 1rem 0;
  }

  .chart-bar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    min-width: 40px;
  }

  .chart-bars {
    display: flex;
    gap: 2px;
    align-items: flex-end;
  }

  .chart-bar {
    width: 8px;
    border-radius: 2px 2px 0 0;
    transition: height 0.3s ease;
  }

  .chart-bar.companies {
    background: var(--primary);
  }

  .chart-bar.customers {
    background: var(--success);
  }

  .chart-bar.feeds {
    background: var(--warning);
  }

  .chart-label {
    font-size: 0.625rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .chart-legend {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-color.companies {
    background: var(--primary);
  }

  .legend-color.customers {
    background: var(--success);
  }

  .legend-color.feeds {
    background: var(--warning);
  }

  .company-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .company-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    text-decoration: none;
    color: var(--text);
    transition: all 0.15s ease;
  }

  .company-item:hover {
    border-color: var(--primary);
    background: var(--bg);
  }

  .company-rank {
    font-weight: 700;
    color: var(--primary);
    min-width: 24px;
  }

  .company-info {
    flex: 1;
    min-width: 0;
  }

  .company-name {
    font-weight: 500;
    display: block;
  }

  .company-email {
    font-size: 0.75rem;
    color: var(--text-muted);
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .company-stats {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .grid-4 {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
