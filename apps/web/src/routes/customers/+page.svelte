<script lang="ts">
  import { onMount } from 'svelte';
  import { customersApi, getPublicFeedUrl } from '$lib/api';
  import type { Customer } from '@xml-customizer/shared';

  let customers: (Customer & { feed_count?: number; selection_count?: number })[] = [];
  let loading = true;
  let showModal = false;
  let formData = { name: '', email: '' };
  let submitting = false;
  let error = '';

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
      error = 'Naam is verplicht';
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
    if (!confirm('Weet je zeker dat je deze klant wilt verwijderen?')) return;

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
  <title>Klanten - XML Customizer</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">Klanten</h1>
  <button class="btn btn-primary" on:click={() => (showModal = true)}>
    + Nieuwe Klant
  </button>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
  </div>
{:else if customers.length === 0}
  <div class="card">
    <div class="empty-state">
      <p>Nog geen klanten toegevoegd.</p>
      <button class="btn btn-primary" style="margin-top: 1rem;" on:click={() => (showModal = true)}>
        Voeg je eerste klant toe
      </button>
    </div>
  </div>
{:else}
  <div class="card" style="padding: 0; overflow: hidden;">
    <table class="table">
      <thead>
        <tr>
          <th>Naam</th>
          <th>Email</th>
          <th>Feeds</th>
          <th>Selecties</th>
          <th>Feed URL</th>
          <th style="width: 200px;">Acties</th>
        </tr>
      </thead>
      <tbody>
        {#each customers as customer}
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
                  Kopieer
                </button>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 0.25rem;">
                <a href="/customers/{customer.id}" class="btn btn-secondary btn-sm">
                  Beheren
                </a>
                <button class="btn btn-danger btn-sm" on:click={() => deleteCustomer(customer.id)}>
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
        <h3 class="modal-title">Nieuwe Klant</h3>
        <button class="btn btn-secondary btn-sm" on:click={() => (showModal = false)}>×</button>
      </div>
      <form on:submit|preventDefault={handleSubmit}>
        <div class="modal-body">
          <div class="form-group">
            <label class="label" for="name">Naam *</label>
            <input
              class="input"
              type="text"
              id="name"
              bind:value={formData.name}
              placeholder="Bijv. Idealista"
            />
          </div>
          <div class="form-group">
            <label class="label" for="email">Email (optioneel)</label>
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
