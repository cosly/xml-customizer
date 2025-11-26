<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount } from 'svelte';
  import { customersApi, getPublicFeedUrl } from '$lib/api';
  import type { Customer } from '@xml-customizer/shared';

  let customers: (Customer & { feed_count?: number; selection_count?: number })[] = [];
  let loading = true;
  let showModal = false;
  let formData = { name: '', email: '' };
  let submitting = false;
  let error = '';
  let searchQuery = '';

  // Filtered customers based on search
  $: filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      c.hash_id.toLowerCase().includes(query)
    );
  });

  onMount(async () => {
    await loadCustomers();
  });

  async function loadCustomers() {
    loading = true;
    try {
      customers = await customersApi.list();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load customers';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      error = $_('errors.required');
      return;
    }

    submitting = true;
    error = '';

    try {
      await customersApi.create(formData);
      showModal = false;
      formData = { name: '', email: '' };
      await loadCustomers();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create customer';
    } finally {
      submitting = false;
    }
  }

  async function deleteCustomer(id: number) {
    if (!confirm($_('customers.confirmDelete'))) return;

    try {
      await customersApi.delete(id);
      await loadCustomers();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete customer';
    }
  }

  function copyLink(hashId: string) {
    navigator.clipboard.writeText(getPublicFeedUrl(hashId));
  }
</script>

<svelte:head>
  <title>{$_('customers.title')} - Tesoro CRM</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">{$_('customers.title')}</h1>
  <button class="btn btn-primary" on:click={() => (showModal = true)}>
    + {$_('customers.newCustomer')}
  </button>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

{#if !loading && customers.length > 0}
  <div class="search-bar">
    <input
      class="input"
      type="text"
      placeholder={$_('customers.searchCustomers')}
      bind:value={searchQuery}
    />
    {#if searchQuery}
      <span class="search-results">{filteredCustomers.length} / {customers.length}</span>
    {/if}
  </div>
{/if}

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if customers.length === 0}
  <div class="card">
    <div class="empty-state">
      <p>{$_('customers.noCustomers')}</p>
      <button class="btn btn-primary" style="margin-top: 1rem;" on:click={() => (showModal = true)}>
        + {$_('customers.newCustomer')}
      </button>
    </div>
  </div>
{:else if filteredCustomers.length === 0}
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
          <th>{$_('customers.customerName')}</th>
          <th>{$_('customers.email')}</th>
          <th>{$_('feeds.title')}</th>
          <th>{$_('customers.selections')}</th>
          <th>{$_('customers.feedUrl')}</th>
          <th style="width: 200px;">{$_('common.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredCustomers as customer}
          <tr>
            <td>
              <a href="/customers/{customer.id}" style="font-weight: 500; color: var(--primary); text-decoration: none;">
                {customer.name}
              </a>
            </td>
            <td>
              {#if customer.email}
                <span style="font-size: 0.875rem;">{customer.email}</span>
              {:else}
                <span style="color: var(--text-muted);">-</span>
              {/if}
            </td>
            <td>
              <span class="badge badge-primary">{customer.feed_count || 0}</span>
            </td>
            <td>
              <span class="badge badge-success">{customer.selection_count || 0}</span>
            </td>
            <td>
              <div class="link-box" style="max-width: 200px;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  /feed/{customer.hash_id}
                </span>
                <button class="btn btn-secondary btn-sm" on:click={() => copyLink(customer.hash_id)}>
                  {$_('common.copy')}
                </button>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 0.25rem;">
                <a href="/customers/{customer.id}" class="btn btn-secondary btn-sm">
                  {$_('common.edit')}
                </a>
                <button class="btn btn-danger btn-sm" on:click={() => deleteCustomer(customer.id)}>
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
        <h3 class="modal-title">{$_('customers.newCustomer')}</h3>
        <button class="btn btn-secondary btn-sm" on:click={() => (showModal = false)}>×</button>
      </div>
      <form on:submit|preventDefault={handleSubmit}>
        <div class="modal-body">
          <div class="form-group">
            <label class="label" for="name">{$_('customers.customerName')} *</label>
            <input
              class="input"
              type="text"
              id="name"
              bind:value={formData.name}
              placeholder="Idealista"
            />
          </div>
          <div class="form-group">
            <label class="label" for="email">{$_('customers.email')}</label>
            <input
              class="input"
              type="email"
              id="email"
              bind:value={formData.email}
              placeholder="contact@example.com"
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
