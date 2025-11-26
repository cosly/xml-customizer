<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { customersApi, feedsApi, getPublicFeedUrl } from '$lib/api';
  import type { CustomerWithSelections, SourceFeed, PropertySummary } from '@xml-customizer/shared';

  let customer: CustomerWithSelections | null = null;
  let feeds: SourceFeed[] = [];
  let selectedFeedId: number | null = null;
  let properties: PropertySummary[] = [];
  let selectedPropertyIds: Set<string> = new Set();
  let originalPropertyIds: Set<string> = new Set();

  let loading = true;
  let loadingProperties = false;
  let saving = false;
  let error = '';
  let success = '';

  // Filter state
  let searchQuery = '';
  let filterType = '';
  let filterMinPrice = '';
  let filterMaxPrice = '';
  let filterBeds = '';
  let filterTown = '';

  // Derive unique values for filter dropdowns
  $: propertyTypes = [...new Set(properties.map(p => p.type).filter(Boolean))].sort();
  $: propertyTowns = [...new Set(properties.map(p => p.town).filter(Boolean))].sort();
  $: propertyBedOptions = [...new Set(properties.map(p => p.beds).filter(b => b > 0))].sort((a, b) => a - b);

  // Filtered properties based on search and filters
  $: filteredProperties = properties.filter((p) => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        p.ref.toLowerCase().includes(query) ||
        p.town.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType && p.type !== filterType) return false;

    // Town filter
    if (filterTown && p.town !== filterTown) return false;

    // Price range filter
    if (filterMinPrice && p.price < parseInt(filterMinPrice)) return false;
    if (filterMaxPrice && p.price > parseInt(filterMaxPrice)) return false;

    // Beds filter
    if (filterBeds && p.beds !== parseInt(filterBeds)) return false;

    return true;
  });

  $: customerId = parseInt($page.params.id, 10);
  $: hasChanges = !setsEqual(selectedPropertyIds, originalPropertyIds);
  $: publicUrl = customer ? getPublicFeedUrl(customer.hash_id, selectedFeedId || undefined) : '';

  function clearFilters() {
    searchQuery = '';
    filterType = '';
    filterMinPrice = '';
    filterMaxPrice = '';
    filterBeds = '';
    filterTown = '';
  }

  $: hasActiveFilters = searchQuery || filterType || filterMinPrice || filterMaxPrice || filterBeds || filterTown;

  function setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    error = '';
    try {
      [customer, feeds] = await Promise.all([
        customersApi.get(customerId),
        feedsApi.list()
      ]);

      // Auto-select first feed if available
      if (feeds.length > 0) {
        await selectFeed(feeds[0].id);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load data';
    } finally {
      loading = false;
    }
  }

  async function selectFeed(feedId: number) {
    selectedFeedId = feedId;
    loadingProperties = true;
    error = '';

    try {
      properties = await feedsApi.getProperties(feedId);

      // Load current selections for this feed
      const currentSelections = customer?.selections.find(s => s.feed_id === feedId);
      const ids = currentSelections?.property_ids || [];
      selectedPropertyIds = new Set(ids);
      originalPropertyIds = new Set(ids);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load properties';
      properties = [];
    } finally {
      loadingProperties = false;
    }
  }

  function toggleProperty(propertyId: string) {
    if (selectedPropertyIds.has(propertyId)) {
      selectedPropertyIds.delete(propertyId);
    } else {
      selectedPropertyIds.add(propertyId);
    }
    selectedPropertyIds = selectedPropertyIds; // Trigger reactivity
  }

  function selectAll() {
    // Select all filtered properties (add to existing selection)
    filteredProperties.forEach(p => selectedPropertyIds.add(p.id));
    selectedPropertyIds = selectedPropertyIds;
  }

  function deselectAll() {
    // Deselect all filtered properties (remove from selection)
    filteredProperties.forEach(p => selectedPropertyIds.delete(p.id));
    selectedPropertyIds = selectedPropertyIds;
  }

  function selectFiltered() {
    // Replace selection with only filtered properties
    selectedPropertyIds = new Set(filteredProperties.map(p => p.id));
  }

  async function saveSelections() {
    if (!selectedFeedId) return;

    saving = true;
    error = '';
    success = '';

    try {
      await customersApi.updateSelections(customerId, {
        feed_id: selectedFeedId,
        property_ids: Array.from(selectedPropertyIds)
      });

      originalPropertyIds = new Set(selectedPropertyIds);
      success = $_('common.saved');

      // Refresh customer data
      customer = await customersApi.get(customerId);

      setTimeout(() => success = '', 3000);
    } catch (e) {
      error = e instanceof Error ? e.message : $_('errors.general');
    } finally {
      saving = false;
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(publicUrl);
    success = $_('common.copied');
    setTimeout(() => success = '', 2000);
  }

  // Share modal state
  let showShareModal = false;
  let shareEmail = '';
  let shareMessage = '';
  let sharing = false;

  async function shareFeedUrl() {
    if (!shareEmail.trim() || !customer) return;

    sharing = true;
    error = '';

    try {
      await customersApi.shareFeedUrl(customerId, {
        email: shareEmail.trim(),
        feedId: selectedFeedId || undefined,
        message: shareMessage.trim() || undefined,
      });

      success = $_('auth.emailSent');
      showShareModal = false;
      shareEmail = '';
      shareMessage = '';
      setTimeout(() => success = '', 3000);
    } catch (e) {
      error = e instanceof Error ? e.message : $_('errors.general');
    } finally {
      sharing = false;
    }
  }

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(price);
  }
</script>

<svelte:head>
  <title>{customer?.name || $_('customers.title')} - Tesoro CRM</title>
</svelte:head>

<div class="page-header">
  <div>
    <a href="/customers" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">
      ← {$_('common.back')} {$_('customers.title').toLowerCase()}
    </a>
    <h1 class="page-title" style="margin-top: 0.5rem;">
      {#if loading}
        {$_('common.loading')}
      {:else if customer}
        {customer.name}
      {:else}
        {$_('errors.notFound')}
      {/if}
    </h1>
  </div>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

{#if success}
  <div class="alert alert-success">{success}</div>
{/if}

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if customer}
  <!-- Customer Info Card -->
  <div class="card" style="margin-bottom: 1.5rem;">
    <div class="grid grid-2" style="gap: 2rem;">
      <div>
        <h3 style="margin-bottom: 1rem;">{$_('customers.title')}</h3>
        <div style="display: grid; gap: 0.5rem;">
          <div>
            <span style="color: var(--text-muted); font-size: 0.875rem;">{$_('customers.customerName')}:</span>
            <span style="margin-left: 0.5rem; font-weight: 500;">{customer.name}</span>
          </div>
          {#if customer.email}
            <div>
              <span style="color: var(--text-muted); font-size: 0.875rem;">{$_('customers.email')}:</span>
              <span style="margin-left: 0.5rem;">{customer.email}</span>
            </div>
          {/if}
          <div>
            <span style="color: var(--text-muted); font-size: 0.875rem;">{$_('feeds.lastUpdated')}:</span>
            <span style="margin-left: 0.5rem;">{new Date(customer.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div>
        <h3 style="margin-bottom: 1rem;">{$_('customers.feedUrl')}</h3>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          {$_('customers.shareUrl')}
        </p>
        <div class="link-box">
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis;">{publicUrl}</span>
          <button class="btn btn-secondary btn-sm" on:click={copyUrl}>{$_('common.copy')}</button>
          <button class="btn btn-secondary btn-sm" on:click={() => showShareModal = true}>{$_('landing.features.share.title')}</button>
          <a href={publicUrl} target="_blank" class="btn btn-primary btn-sm">{$_('common.select')}</a>
        </div>
      </div>
    </div>
  </div>

  <!-- Feed Selection Tabs -->
  {#if feeds.length === 0}
    <div class="card">
      <div class="empty-state">
        <p>{$_('feeds.noFeeds')}. <a href="/feeds">{$_('feeds.newFeed')}</a></p>
      </div>
    </div>
  {:else}
    <div class="card">
      <h3 style="margin-bottom: 1rem;">{$_('customers.selectProperties')}</h3>

      <div class="tabs">
        {#each feeds as feed}
          <button
            class="tab"
            class:active={selectedFeedId === feed.id}
            on:click={() => selectFeed(feed.id)}
          >
            {feed.name}
            {#if customer.selections.find(s => s.feed_id === feed.id)}
              <span class="badge badge-success" style="margin-left: 0.5rem;">
                {customer.selections.find(s => s.feed_id === feed.id)?.property_ids.length || 0}
              </span>
            {/if}
          </button>
        {/each}
      </div>

      {#if loadingProperties}
        <div class="empty-state" style="padding: 2rem;">
          <div class="spinner"></div>
        </div>
      {:else if properties.length === 0}
        <div class="empty-state" style="padding: 2rem;">
          <p>{$_('feeds.noFeeds')}. <a href="/feeds/{selectedFeedId}">{$_('feeds.refresh')}</a></p>
        </div>
      {:else}
        <!-- Search and Filter Bar -->
        <div class="filter-bar">
          <div class="filter-group" style="flex: 1; max-width: 250px;">
            <label>{$_('common.search')}</label>
            <input
              class="input"
              type="text"
              placeholder={$_('properties.reference')}, {$_('properties.location')}..."
              bind:value={searchQuery}
            />
          </div>

          <div class="filter-group">
            <label>{$_('properties.type')}</label>
            <select bind:value={filterType}>
              <option value="">{$_('common.all')}</option>
              {#each propertyTypes as type}
                <option value={type}>{type}</option>
              {/each}
            </select>
          </div>

          <div class="filter-group">
            <label>{$_('properties.location')}</label>
            <select bind:value={filterTown}>
              <option value="">{$_('common.all')}</option>
              {#each propertyTowns as town}
                <option value={town}>{town}</option>
              {/each}
            </select>
          </div>

          <div class="filter-group">
            <label>{$_('properties.bedrooms')}</label>
            <select bind:value={filterBeds}>
              <option value="">{$_('common.all')}</option>
              {#each propertyBedOptions as beds}
                <option value={beds}>{beds}+</option>
              {/each}
            </select>
          </div>

          <div class="filter-group">
            <label>{$_('properties.price')}</label>
            <div class="price-range">
              <input
                class="input"
                type="number"
                placeholder="Min"
                bind:value={filterMinPrice}
              />
              <span>-</span>
              <input
                class="input"
                type="number"
                placeholder="Max"
                bind:value={filterMaxPrice}
              />
            </div>
          </div>

          {#if hasActiveFilters}
            <div class="filter-actions">
              <button class="btn btn-secondary btn-sm" on:click={clearFilters}>
                {$_('common.refresh')}
              </button>
            </div>
          {/if}
        </div>

        <div class="select-all-bar">
          <div>
            <span class="selection-count">
              {selectedPropertyIds.size} {$_('customers.selectedProperties').toLowerCase()}
              {#if hasActiveFilters}
                <span style="color: var(--text-muted); font-weight: normal;">
                  • {filteredProperties.length} / {properties.length}
                </span>
              {:else}
                <span style="color: var(--text-muted); font-weight: normal;">
                  / {properties.length}
                </span>
              {/if}
            </span>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" on:click={selectAll}>
              {$_('common.selectAll')}
            </button>
            <button class="btn btn-secondary btn-sm" on:click={deselectAll}>
              {$_('common.none')}
            </button>
            <button
              class="btn btn-primary"
              on:click={saveSelections}
              disabled={saving || !hasChanges}
            >
              {#if saving}
                <span class="spinner"></span>
              {/if}
              {$_('common.save')}
            </button>
          </div>
        </div>

        {#if filteredProperties.length === 0}
          <div class="empty-state" style="padding: 2rem;">
            <p>{$_('errors.notFound')}</p>
            <button class="btn btn-secondary" style="margin-top: 1rem;" on:click={clearFilters}>
              {$_('common.refresh')}
            </button>
          </div>
        {:else}
          <div class="grid grid-3">
            {#each filteredProperties as property}
            <div
              class="property-card"
              class:selected={selectedPropertyIds.has(property.id)}
              on:click={() => toggleProperty(property.id)}
              on:keydown={(e) => e.key === 'Enter' && toggleProperty(property.id)}
              role="button"
              tabindex="0"
            >
              <input
                type="checkbox"
                class="checkbox"
                checked={selectedPropertyIds.has(property.id)}
                on:click|stopPropagation={() => toggleProperty(property.id)}
              />
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
                  {property.type} • {property.town}
                </div>
                <div class="property-details">
                  {property.beds}🛏 {property.baths}🚿
                </div>
                <div class="property-price">{formatPrice(property.price)}</div>
              </div>
            </div>
            {/each}
          </div>

          {#if hasChanges}
            <div style="position: sticky; bottom: 1rem; margin-top: 1rem;">
              <div class="alert alert-success" style="display: flex; align-items: center; justify-content: space-between;">
                <span>{$_('common.save')}</span>
                <button class="btn btn-primary" on:click={saveSelections} disabled={saving}>
                  {#if saving}
                    <span class="spinner"></span>
                  {/if}
                  {$_('common.save')}
                </button>
              </div>
            </div>
          {/if}
        {/if}
      {/if}
    </div>
  {/if}
{/if}

<!-- Share Modal -->
{#if showShareModal}
  <div class="modal-overlay" on:click={() => (showShareModal = false)} on:keydown={(e) => e.key === 'Escape' && (showShareModal = false)}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3 class="modal-title">{$_('customers.shareUrl')}</h3>
        <button class="btn btn-secondary btn-sm" on:click={() => (showShareModal = false)}>×</button>
      </div>
      <form on:submit|preventDefault={shareFeedUrl}>
        <div class="modal-body">
          <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">
            {$_('customers.shareUrl')}
          </p>
          <div class="form-group">
            <label class="label" for="share-email">{$_('customers.email')}</label>
            <input
              class="input"
              type="email"
              id="share-email"
              bind:value={shareEmail}
              placeholder="email@example.com"
              required
            />
          </div>
          <div class="form-group">
            <label class="label" for="share-message">{$_('customers.notes')}</label>
            <textarea
              class="input"
              id="share-message"
              bind:value={shareMessage}
              placeholder=""
              rows="3"
              style="resize: vertical;"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" on:click={() => (showShareModal = false)}>
            {$_('common.cancel')}
          </button>
          <button type="submit" class="btn btn-primary" disabled={sharing || !shareEmail.trim()}>
            {#if sharing}
              <span class="spinner"></span>
            {/if}
            {$_('common.submit')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
