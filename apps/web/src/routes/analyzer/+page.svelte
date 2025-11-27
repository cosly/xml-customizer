<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { feedsApi } from '$lib/api';
  import type { SourceFeed, FeedAnalytics, PropertySummary, CategoryCount, PriceRange, LocationStats, SurfaceStats } from '@xml-customizer/shared';

  let feeds: SourceFeed[] = [];
  let selectedFeedId: number | null = null;
  let analytics: FeedAnalytics | null = null;
  let loading = true;
  let analyzing = false;
  let error = '';

  // Drill-down state
  let drillDownOpen = false;
  let drillDownTitle = '';
  let drillDownProperties: PropertySummary[] = [];

  // Chart instances and ApexCharts module
  let ApexCharts: any = null;
  let charts: any[] = [];

  onMount(async () => {
    // Dynamically import ApexCharts (only works in browser)
    const module = await import('apexcharts');
    ApexCharts = module.default;
    await loadFeeds();
  });

  onDestroy(() => {
    destroyCharts();
  });

  function destroyCharts() {
    charts.forEach((chart) => chart.destroy());
    charts = [];
  }

  async function loadFeeds() {
    loading = true;
    try {
      feeds = await feedsApi.list();
      const feedWithProps = feeds.find((f) => f.property_count > 0);
      if (feedWithProps) {
        selectedFeedId = feedWithProps.id;
        await analyzeFeed();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Feeds laden mislukt';
    } finally {
      loading = false;
    }
  }

  async function analyzeFeed() {
    if (!selectedFeedId) return;

    analyzing = true;
    error = '';
    destroyCharts();

    try {
      analytics = await feedsApi.analyze(selectedFeedId);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Analyse mislukt';
      analytics = null;
    } finally {
      analyzing = false;
    }
  }

  // Watch for analytics changes and render charts when DOM is ready
  $: if (analytics && !analyzing && typeof window !== 'undefined') {
    tick().then(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (document.getElementById('price-chart')) {
            renderCharts();
          } else {
            setTimeout(() => renderCharts(), 200);
          }
        }, 50);
      });
    });
  }

  function handleFeedChange() {
    if (selectedFeedId) {
      analyzeFeed();
    }
  }

  function openDrillDown(title: string, properties: PropertySummary[]) {
    drillDownTitle = title;
    drillDownProperties = properties;
    drillDownOpen = true;
  }

  function closeDrillDown() {
    drillDownOpen = false;
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  }

  function renderCharts() {
    if (!analytics || !ApexCharts) return;

    // Price Distribution Bar Chart
    const priceChartEl = document.getElementById('price-chart');
    if (priceChartEl) {
      const priceChart = new ApexCharts(priceChartEl, {
        chart: {
          type: 'bar',
          height: 300,
          toolbar: { show: false },
          events: {
            dataPointSelection: (_: any, __: any, config: any) => {
              const idx = config.dataPointIndex;
              const item = analytics!.priceDistribution[idx];
              if (item && item.properties.length > 0) {
                openDrillDown(`Prijsklasse: ${item.label}`, item.properties);
              }
            },
          },
        },
        series: [{ name: 'Woningen', data: analytics.priceDistribution.map((d) => d.count) }],
        xaxis: { categories: analytics.priceDistribution.map((d) => d.label) },
        colors: ['#2563eb'],
        plotOptions: { bar: { borderRadius: 4 } },
        dataLabels: { enabled: false },
        tooltip: {
          y: { formatter: (val: number) => `${val} woningen` },
        },
      });
      priceChart.render();
      charts.push(priceChart);
    }

    // Type Distribution Donut Chart
    const typeChartEl = document.getElementById('type-chart');
    if (typeChartEl) {
      const typeChart = new ApexCharts(typeChartEl, {
        chart: {
          type: 'donut',
          height: 300,
          events: {
            dataPointSelection: (_: any, __: any, config: any) => {
              const idx = config.dataPointIndex;
              const item = analytics!.typeDistribution[idx];
              if (item && item.properties.length > 0) {
                openDrillDown(`Type: ${item.name}`, item.properties);
              }
            },
          },
        },
        series: analytics.typeDistribution.map((d) => d.count),
        labels: analytics.typeDistribution.map((d) => d.name),
        colors: ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'],
        legend: { position: 'bottom' },
        dataLabels: {
          enabled: true,
          formatter: (_: number, opts: any) => `${opts.w.config.series[opts.seriesIndex]}`,
        },
      });
      typeChart.render();
      charts.push(typeChart);
    }

    // Bedroom Distribution Bar Chart
    const bedroomChartEl = document.getElementById('bedroom-chart');
    if (bedroomChartEl) {
      const bedroomChart = new ApexCharts(bedroomChartEl, {
        chart: {
          type: 'bar',
          height: 250,
          toolbar: { show: false },
          events: {
            dataPointSelection: (_: any, __: any, config: any) => {
              const idx = config.dataPointIndex;
              const item = analytics!.bedroomDistribution[idx];
              if (item && item.properties.length > 0) {
                openDrillDown(`Slaapkamers: ${item.name}`, item.properties);
              }
            },
          },
        },
        series: [{ name: 'Woningen', data: analytics.bedroomDistribution.map((d) => d.count) }],
        xaxis: { categories: analytics.bedroomDistribution.map((d) => d.name) },
        colors: ['#22c55e'],
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
        dataLabels: { enabled: true },
      });
      bedroomChart.render();
      charts.push(bedroomChart);
    }

    // Location by Province Bar Chart
    const locationChartEl = document.getElementById('location-chart');
    if (locationChartEl) {
      const locationChart = new ApexCharts(locationChartEl, {
        chart: {
          type: 'bar',
          height: 300,
          toolbar: { show: false },
          events: {
            dataPointSelection: (_: any, __: any, config: any) => {
              const idx = config.dataPointIndex;
              const item = analytics!.locationByProvince[idx];
              if (item && item.properties.length > 0) {
                openDrillDown(`Provincie: ${item.name}`, item.properties);
              }
            },
          },
        },
        series: [{ name: 'Woningen', data: analytics.locationByProvince.map((d) => d.count) }],
        xaxis: { categories: analytics.locationByProvince.map((d) => d.name) },
        colors: ['#8b5cf6'],
        plotOptions: { bar: { borderRadius: 4 } },
        dataLabels: { enabled: false },
      });
      locationChart.render();
      charts.push(locationChart);
    }

    // Pool Distribution Pie Chart
    const poolChartEl = document.getElementById('pool-chart');
    if (poolChartEl) {
      const poolChart = new ApexCharts(poolChartEl, {
        chart: {
          type: 'pie',
          height: 250,
          events: {
            dataPointSelection: (_: any, __: any, config: any) => {
              const idx = config.dataPointIndex;
              const item = analytics!.poolDistribution[idx];
              if (item && item.properties.length > 0) {
                openDrillDown(item.name, item.properties);
              }
            },
          },
        },
        series: analytics.poolDistribution.map((d) => d.count),
        labels: analytics.poolDistribution.map((d) => d.name),
        colors: ['#06b6d4', '#e2e8f0'],
        legend: { position: 'bottom' },
      });
      poolChart.render();
      charts.push(poolChart);
    }

    // New Build Distribution Pie Chart
    const newBuildChartEl = document.getElementById('newbuild-chart');
    if (newBuildChartEl) {
      const newBuildChart = new ApexCharts(newBuildChartEl, {
        chart: {
          type: 'pie',
          height: 250,
          events: {
            dataPointSelection: (_: any, __: any, config: any) => {
              const idx = config.dataPointIndex;
              const item = analytics!.newBuildDistribution[idx];
              if (item && item.properties.length > 0) {
                openDrillDown(item.name, item.properties);
              }
            },
          },
        },
        series: analytics.newBuildDistribution.map((d) => d.count),
        labels: analytics.newBuildDistribution.map((d) => d.name),
        colors: ['#f59e0b', '#94a3b8'],
        legend: { position: 'bottom' },
      });
      newBuildChart.render();
      charts.push(newBuildChart);
    }

    // Energy Rating Bar Chart
    const energyChartEl = document.getElementById('energy-chart');
    if (energyChartEl) {
      const energyColors: Record<string, string> = {
        'Label A': '#22c55e',
        'Label B': '#84cc16',
        'Label C': '#eab308',
        'Label D': '#f59e0b',
        'Label E': '#f97316',
        'Label F': '#ef4444',
        'Label G': '#dc2626',
        'Onbekend': '#94a3b8',
      };
      const energyChart = new ApexCharts(energyChartEl, {
        chart: {
          type: 'bar',
          height: 250,
          toolbar: { show: false },
          events: {
            dataPointSelection: (_: any, __: any, config: any) => {
              const idx = config.dataPointIndex;
              const item = analytics!.energyRatingDistribution[idx];
              if (item && item.properties.length > 0) {
                openDrillDown(`Energielabel: ${item.name}`, item.properties);
              }
            },
          },
        },
        series: [{ name: 'Woningen', data: analytics.energyRatingDistribution.map((d) => d.count) }],
        xaxis: { categories: analytics.energyRatingDistribution.map((d) => d.name) },
        colors: analytics.energyRatingDistribution.map((d) => energyColors[d.name] || '#94a3b8'),
        plotOptions: {
          bar: {
            borderRadius: 4,
            distributed: true,
          },
        },
        dataLabels: { enabled: true },
        legend: { show: false },
      });
      energyChart.render();
      charts.push(energyChart);
    }

    // Surface Distribution Bar Chart
    const surfaceChartEl = document.getElementById('surface-chart');
    if (surfaceChartEl) {
      const surfaceChart = new ApexCharts(surfaceChartEl, {
        chart: {
          type: 'bar',
          height: 300,
          toolbar: { show: false },
          events: {
            dataPointSelection: (_: any, __: any, config: any) => {
              const idx = config.dataPointIndex;
              const item = analytics!.surfaceDistribution[idx];
              if (item && item.properties.length > 0) {
                openDrillDown(`Oppervlakte: ${item.range}`, item.properties);
              }
            },
          },
        },
        series: [
          { name: 'Woningen', data: analytics.surfaceDistribution.map((d) => d.count) },
        ],
        xaxis: { categories: analytics.surfaceDistribution.map((d) => d.range) },
        colors: ['#ec4899'],
        plotOptions: { bar: { borderRadius: 4 } },
        dataLabels: { enabled: false },
      });
      surfaceChart.render();
      charts.push(surfaceChart);
    }
  }
</script>

<svelte:head>
  <title>Feed Analyzer - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">Feed Analyzer</h1>
  <div class="feed-selector">
    <select class="input" bind:value={selectedFeedId} on:change={handleFeedChange}>
      <option value={null}>Selecteer een feed...</option>
      {#each feeds.filter((f) => f.property_count > 0) as feed}
        <option value={feed.id}>{feed.name} ({feed.property_count} woningen)</option>
      {/each}
    </select>
    {#if selectedFeedId}
      <button class="btn btn-primary" on:click={analyzeFeed} disabled={analyzing}>
        {#if analyzing}
          <span class="spinner"></span>
        {/if}
        Opnieuw analyseren
      </button>
    {/if}
  </div>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
    <p style="margin-top: 1rem;">Feeds laden...</p>
  </div>
{:else if feeds.filter((f) => f.property_count > 0).length === 0}
  <div class="card">
    <div class="empty-state">
      <p>Geen feeds met woningen gevonden.</p>
      <a href="/feeds" class="btn btn-primary" style="margin-top: 1rem;">
        Ga naar Feeds
      </a>
    </div>
  </div>
{:else if analyzing}
  <div class="empty-state">
    <div class="spinner"></div>
    <p style="margin-top: 1rem;">Feed analyseren...</p>
  </div>
{:else if analytics}
  <!-- Key Metrics -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-value">{analytics.totalProperties}</div>
      <div class="metric-label">Totaal woningen</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">{formatPrice(analytics.metrics.totalValue)}</div>
      <div class="metric-label">Portfolio waarde</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">{formatPrice(analytics.metrics.avgPrice)}</div>
      <div class="metric-label">Gemiddelde prijs</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">{formatPrice(analytics.metrics.medianPrice)}</div>
      <div class="metric-label">Mediaan prijs</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">{formatPrice(analytics.metrics.avgPricePerSqm)}/m²</div>
      <div class="metric-label">Gem. prijs per m²</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">{analytics.metrics.avgBeds}</div>
      <div class="metric-label">Gem. slaapkamers</div>
    </div>
  </div>

  <!-- Price Range Info -->
  <div class="price-range-info">
    <span>Prijsrange: {formatPrice(analytics.metrics.minPrice)} - {formatPrice(analytics.metrics.maxPrice)}</span>
  </div>

  <!-- Charts Grid -->
  <div class="charts-grid">
    <div class="chart-card chart-wide">
      <h3 class="chart-title">Prijsverdeling</h3>
      <p class="chart-subtitle">Klik op een balk om woningen te bekijken</p>
      <div id="price-chart"></div>
    </div>

    <div class="chart-card">
      <h3 class="chart-title">Woningtypen</h3>
      <p class="chart-subtitle">Klik op een segment om woningen te bekijken</p>
      <div id="type-chart"></div>
    </div>

    <div class="chart-card">
      <h3 class="chart-title">Slaapkamers</h3>
      <p class="chart-subtitle">Klik op een balk om woningen te bekijken</p>
      <div id="bedroom-chart"></div>
    </div>

    <div class="chart-card chart-wide">
      <h3 class="chart-title">Locatie per provincie</h3>
      <p class="chart-subtitle">Klik op een balk om woningen te bekijken</p>
      <div id="location-chart"></div>
    </div>

    <div class="chart-card">
      <h3 class="chart-title">Zwembad</h3>
      <p class="chart-subtitle">Klik op een segment om woningen te bekijken</p>
      <div id="pool-chart"></div>
    </div>

    <div class="chart-card">
      <h3 class="chart-title">Nieuwbouw</h3>
      <p class="chart-subtitle">Klik op een segment om woningen te bekijken</p>
      <div id="newbuild-chart"></div>
    </div>

    <div class="chart-card">
      <h3 class="chart-title">Energielabel</h3>
      <p class="chart-subtitle">Klik op een balk om woningen te bekijken</p>
      <div id="energy-chart"></div>
    </div>

    <div class="chart-card">
      <h3 class="chart-title">Woonoppervlakte</h3>
      <p class="chart-subtitle">Klik op een balk om woningen te bekijken</p>
      <div id="surface-chart"></div>
    </div>
  </div>

  <!-- Top Locations Table -->
  {#if analytics.locationByTown.length > 0}
    <div class="card" style="margin-top: 1.5rem;">
      <h3 class="section-title">Top locaties</h3>
      <div style="overflow-x: auto;">
        <table class="table">
          <thead>
            <tr>
              <th>Stad</th>
              <th>Provincie</th>
              <th>Woningen</th>
              <th>Gem. prijs</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each analytics.locationByTown.slice(0, 10) as location}
              <tr>
                <td style="font-weight: 500;">{location.town}</td>
                <td>{location.province}</td>
                <td><span class="badge badge-primary">{location.count}</span></td>
                <td>{formatPrice(location.avgPrice)}</td>
                <td>
                  <button
                    class="btn btn-secondary btn-sm"
                    on:click={() => openDrillDown(`${location.town}, ${location.province}`, location.properties)}
                  >
                    Bekijk
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Top Features -->
  {#if analytics.topFeatures.length > 0}
    <div class="card" style="margin-top: 1.5rem;">
      <h3 class="section-title">Populaire kenmerken</h3>
      <div class="features-grid">
        {#each analytics.topFeatures as feature}
          <button
            class="feature-tag"
            on:click={() => openDrillDown(`Kenmerk: ${feature.name}`, feature.properties)}
          >
            {feature.name}
            <span class="feature-count">{feature.count}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
{:else if selectedFeedId}
  <div class="card">
    <div class="empty-state">
      <p>Selecteer een feed om te analyseren</p>
    </div>
  </div>
{/if}

<!-- Drill-down Modal -->
{#if drillDownOpen}
  <div class="modal-overlay" on:click={closeDrillDown} on:keydown={(e) => e.key === 'Escape' && closeDrillDown()}>
    <div class="modal modal-lg" on:click|stopPropagation>
      <div class="modal-header">
        <h3 class="modal-title">{drillDownTitle}</h3>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span class="badge badge-primary">{drillDownProperties.length} woningen</span>
          <button class="btn btn-secondary btn-sm" on:click={closeDrillDown}>×</button>
        </div>
      </div>
      <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
        <div class="drilldown-grid">
          {#each drillDownProperties as property}
            <div class="property-card">
              {#if property.image_url}
                <img
                  src={property.image_url}
                  alt={property.ref}
                  class="property-image"
                  loading="lazy"
                />
              {:else}
                <div class="property-image" style="display: flex; align-items: center; justify-content: center; color: var(--text-muted);">
                  No image
                </div>
              {/if}
              <div class="property-info">
                <div class="property-ref">{property.ref}</div>
                <div class="property-details">
                  {property.type} • {property.town}
                </div>
                <div class="property-details">
                  {property.beds} slpk • {property.baths} badk
                </div>
                <div class="property-price">{formatPrice(property.price)}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .feed-selector {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .feed-selector select {
    min-width: 300px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  @media (max-width: 1200px) {
    .metrics-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .feed-selector {
      flex-direction: column;
      align-items: stretch;
    }

    .feed-selector select {
      min-width: auto;
    }
  }

  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem;
    text-align: center;
  }

  .metric-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
  }

  .metric-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-top: 0.25rem;
  }

  .price-range-info {
    text-align: center;
    padding: 0.75rem;
    background: var(--bg);
    border-radius: var(--radius);
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
  }

  .chart-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
  }

  .chart-wide {
    grid-column: span 2;
  }

  @media (max-width: 768px) {
    .chart-wide {
      grid-column: span 1;
    }
  }

  .chart-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .chart-subtitle {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .features-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .feature-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .feature-tag:hover {
    border-color: var(--primary);
    background: rgba(37, 99, 235, 0.05);
  }

  .feature-count {
    background: var(--primary);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .modal-lg {
    max-width: 900px;
  }

  .drilldown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .drilldown-grid .property-card {
    border: 1px solid var(--border);
    cursor: default;
  }

  .drilldown-grid .property-card:hover {
    border-color: var(--border);
  }
</style>
