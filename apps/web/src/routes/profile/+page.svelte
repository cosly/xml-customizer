<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { locale } from 'svelte-i18n';
  import { profileApi, type ProfileData, type PendingEmailChange, type Salutation } from '$lib/api';
  import { auth } from '$lib/stores/auth';

  let profile: ProfileData | null = null;
  let pendingEmailChange: PendingEmailChange | null = null;
  let loading = true;
  let error = '';
  let saveLoading = false;
  let saveSuccess = '';

  // Form data
  let formData = {
    salutation: null as Salutation,
    first_name: '',
    last_name: '',
    name: '',
    preferred_language: 'es',
  };

  // Email change
  let newEmail = '';
  let emailLoading = false;
  let emailError = '';
  let emailSuccess = '';

  const salutationOptions: { value: Salutation; labelKey: string }[] = [
    { value: null, labelKey: 'profile.salutation.none' },
    { value: 'mr', labelKey: 'profile.salutation.mr' },
    { value: 'ms', labelKey: 'profile.salutation.ms' },
    { value: 'mrs', labelKey: 'profile.salutation.mrs' },
    { value: 'mx', labelKey: 'profile.salutation.mx' },
    { value: 'dr', labelKey: 'profile.salutation.dr' },
    { value: 'prof', labelKey: 'profile.salutation.prof' },
    { value: 'other', labelKey: 'profile.salutation.other' },
  ];

  const languageOptions = [
    { value: 'es', label: 'Español' },
    { value: 'ca', label: 'Català' },
    { value: 'eu', label: 'Euskara' },
    { value: 'gl', label: 'Galego' },
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'pt', label: 'Português' },
    { value: 'pl', label: 'Polski' },
    { value: 'ru', label: 'Русский' },
    { value: 'sv', label: 'Svenska' },
  ];

  onMount(async () => {
    await loadProfile();
  });

  async function loadProfile() {
    loading = true;
    error = '';
    try {
      const result = await profileApi.get();
      profile = result.profile;
      pendingEmailChange = result.pendingEmailChange;

      formData = {
        salutation: profile.salutation,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        name: profile.name,
        preferred_language: profile.preferred_language,
      };
    } catch (e) {
      error = e instanceof Error ? e.message : $_('profile.loadError');
    } finally {
      loading = false;
    }
  }

  async function saveProfile() {
    saveLoading = true;
    saveSuccess = '';
    error = '';

    try {
      const result = await profileApi.update(formData);
      profile = result.profile;
      saveSuccess = $_('profile.saveSuccess');

      // Update auth store with new user data
      if ($auth.user) {
        auth.updateUser({
          ...$auth.user,
          name: result.profile.name,
          salutation: result.profile.salutation,
          first_name: result.profile.first_name,
          last_name: result.profile.last_name,
          preferred_language: result.profile.preferred_language,
        });
      }

      // Update locale if language changed
      if (result.profile.preferred_language !== $locale) {
        locale.set(result.profile.preferred_language);
      }

      setTimeout(() => {
        saveSuccess = '';
      }, 3000);
    } catch (e) {
      error = e instanceof Error ? e.message : $_('profile.saveError');
    } finally {
      saveLoading = false;
    }
  }

  async function requestEmailChange() {
    if (!newEmail.trim()) return;

    emailLoading = true;
    emailError = '';
    emailSuccess = '';

    try {
      const result = await profileApi.requestEmailChange(newEmail.trim());
      emailSuccess = result.message;
      pendingEmailChange = result.pendingEmailChange;
      newEmail = '';
    } catch (e) {
      emailError = e instanceof Error ? e.message : $_('profile.emailChangeError');
    } finally {
      emailLoading = false;
    }
  }

  async function cancelEmailChange() {
    try {
      await profileApi.cancelEmailChange();
      pendingEmailChange = null;
    } catch (e) {
      alert(e instanceof Error ? e.message : $_('profile.cancelEmailError'));
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
</script>

<svelte:head>
  <title>{$_('profile.title')} - Tesoro</title>
</svelte:head>

<div class="page-header">
  <h1 class="page-title">{$_('profile.title')}</h1>
</div>

{#if loading}
  <div class="empty-state">
    <div class="spinner"></div>
    <p>{$_('common.loading')}</p>
  </div>
{:else if error && !profile}
  <div class="empty-state">
    <p class="error-text">{error}</p>
    <button class="btn btn-primary" on:click={loadProfile}>
      {$_('common.retry')}
    </button>
  </div>
{:else if profile}
  <div class="profile-grid">
    <!-- Profile Info -->
    <div class="card">
      <h2>{$_('profile.personalInfo')}</h2>

      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      {#if saveSuccess}
        <div class="alert alert-success">{saveSuccess}</div>
      {/if}

      <form on:submit|preventDefault={saveProfile} class="form">
        <div class="form-row">
          <div class="form-group">
            <label for="salutation">{$_('profile.salutation.label')}</label>
            <select id="salutation" bind:value={formData.salutation}>
              {#each salutationOptions as option}
                <option value={option.value}>{$_(option.labelKey)}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="first_name">{$_('profile.firstName')}</label>
            <input
              type="text"
              id="first_name"
              bind:value={formData.first_name}
              placeholder={$_('profile.firstNamePlaceholder')}
            />
          </div>

          <div class="form-group">
            <label for="last_name">{$_('profile.lastName')}</label>
            <input
              type="text"
              id="last_name"
              bind:value={formData.last_name}
              placeholder={$_('profile.lastNamePlaceholder')}
            />
          </div>
        </div>

        <div class="form-group">
          <label for="name">{$_('profile.displayName')} *</label>
          <input
            type="text"
            id="name"
            bind:value={formData.name}
            required
            placeholder={$_('profile.displayNamePlaceholder')}
          />
          <small class="form-hint">{$_('profile.displayNameHint')}</small>
        </div>

        <div class="form-group">
          <label for="language">{$_('profile.language')}</label>
          <select id="language" bind:value={formData.preferred_language}>
            {#each languageOptions as lang}
              <option value={lang.value}>{lang.label}</option>
            {/each}
          </select>
          <small class="form-hint">{$_('profile.languageHint')}</small>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" disabled={saveLoading}>
            {#if saveLoading}
              <span class="spinner-small"></span>
            {/if}
            {$_('common.save')}
          </button>
        </div>
      </form>
    </div>

    <!-- Email Settings -->
    <div class="card">
      <h2>{$_('profile.emailSettings')}</h2>

      <div class="email-current">
        <label>{$_('profile.currentEmail')}</label>
        <p class="email-value">{profile.email}</p>
      </div>

      {#if pendingEmailChange}
        <div class="pending-change">
          <div class="pending-header">
            <span class="pending-badge">{$_('profile.pendingChange')}</span>
          </div>
          <p>{$_('profile.pendingEmailTo', { values: { email: pendingEmailChange.newEmail } })}</p>
          <p class="pending-expires">
            {$_('profile.expiresAt', { values: { time: formatDate(pendingEmailChange.expiresAt) } })}
          </p>
          <button class="btn btn-secondary btn-sm" on:click={cancelEmailChange}>
            {$_('common.cancel')}
          </button>
        </div>
      {:else}
        <form on:submit|preventDefault={requestEmailChange} class="form email-form">
          {#if emailError}
            <div class="alert alert-error">{emailError}</div>
          {/if}

          {#if emailSuccess}
            <div class="alert alert-success">{emailSuccess}</div>
          {/if}

          <div class="form-group">
            <label for="newEmail">{$_('profile.newEmail')}</label>
            <input
              type="email"
              id="newEmail"
              bind:value={newEmail}
              placeholder={$_('profile.newEmailPlaceholder')}
            />
            <small class="form-hint">{$_('profile.emailChangeHint')}</small>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-secondary" disabled={emailLoading || !newEmail.trim()}>
              {#if emailLoading}
                <span class="spinner-small"></span>
              {/if}
              {$_('profile.requestChange')}
            </button>
          </div>
        </form>
      {/if}
    </div>

    <!-- Account Info -->
    <div class="card">
      <h2>{$_('profile.accountInfo')}</h2>

      <dl class="info-list">
        <div class="info-item">
          <dt>{$_('profile.memberId')}</dt>
          <dd>#{profile.id}</dd>
        </div>
        <div class="info-item">
          <dt>{$_('profile.memberSince')}</dt>
          <dd>{formatDate(profile.created_at)}</dd>
        </div>
        <div class="info-item">
          <dt>{$_('profile.lastUpdated')}</dt>
          <dd>{formatDate(profile.updated_at)}</dd>
        </div>
      </dl>
    </div>
  </div>
{/if}

<style>
  .profile-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 900px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem;
  }

  .card h2 {
    font-size: 1.125rem;
    margin: 0 0 1.25rem 0;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-row {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .form-group input,
  .form-group select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 0.875rem;
    background: var(--background);
    color: var(--text);
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .form-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .form-actions {
    margin-top: 0.5rem;
  }

  .alert {
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .alert-error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .alert-success {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  .email-current {
    margin-bottom: 1.5rem;
  }

  .email-current label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    display: block;
    margin-bottom: 0.25rem;
  }

  .email-value {
    font-size: 1rem;
    font-weight: 500;
    margin: 0;
  }

  .email-form {
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .pending-change {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: var(--radius);
    padding: 1rem;
  }

  .pending-header {
    margin-bottom: 0.5rem;
  }

  .pending-badge {
    display: inline-block;
    background: #f59e0b;
    color: white;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .pending-change p {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
  }

  .pending-expires {
    color: var(--text-muted);
    font-size: 0.75rem !important;
  }

  .info-list {
    margin: 0;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-item dt {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .info-item dd {
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0;
  }

  .spinner-small {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
