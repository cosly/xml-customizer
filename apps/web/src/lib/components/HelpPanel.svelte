<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';
  import { createEventDispatcher } from 'svelte';

  export let open = false;

  const dispatch = createEventDispatcher();

  // Map routes to help content keys
  function getHelpKey(pathname: string): string {
    // Dashboard
    if (pathname === '/' || pathname === '/dashboard') {
      return 'dashboard';
    }
    // Feed detail page
    if (pathname.match(/^\/feeds\/\d+$/)) {
      return 'feedDetail';
    }
    // Feeds list
    if (pathname.startsWith('/feeds')) {
      return 'feeds';
    }
    // Customer detail page
    if (pathname.match(/^\/customers\/\d+$/)) {
      return 'customerDetail';
    }
    // Customers list
    if (pathname.startsWith('/customers')) {
      return 'customers';
    }
    // Analyzer
    if (pathname.startsWith('/analyzer')) {
      return 'analyzer';
    }
    // Team
    if (pathname.startsWith('/team')) {
      return 'team';
    }
    // Default to dashboard
    return 'dashboard';
  }

  $: helpKey = getHelpKey($page.url.pathname);
  $: helpTitle = $_(`help.${helpKey}.title`);
  $: helpDescription = $_(`help.${helpKey}.description`);
  $: helpSections = $_(`help.${helpKey}.sections`) as unknown as Array<{ title: string; content: string }>;

  function close() {
    open = false;
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="help-overlay" on:click={close} on:keydown={handleKeydown} role="button" tabindex="-1">
    <div class="help-panel" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="help-header">
        <h2 id="help-title">{$_('help.title')}: {helpTitle}</h2>
        <button class="close-button" on:click={close} aria-label={$_('help.close')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="help-content">
        <p class="help-description">{helpDescription}</p>

        {#if Array.isArray(helpSections)}
          <div class="help-sections">
            {#each helpSections as section}
              <div class="help-section">
                <h3>{section.title}</h3>
                <p>{section.content}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .help-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    justify-content: flex-end;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .help-panel {
    width: 100%;
    max-width: 450px;
    height: 100%;
    background: var(--bg-card);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease;
  }

  .help-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .help-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: var(--text);
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: var(--radius);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .close-button:hover {
    background: var(--border);
    color: var(--text);
  }

  .help-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .help-description {
    font-size: 1rem;
    color: var(--text);
    line-height: 1.6;
    margin: 0 0 1.5rem 0;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .help-sections {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .help-section {
    background: var(--bg);
    border-radius: var(--radius);
    padding: 1rem 1.25rem;
    border: 1px solid var(--border);
  }

  .help-section h3 {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--primary);
    margin: 0 0 0.5rem 0;
  }

  .help-section p {
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0;
  }

  @media (max-width: 480px) {
    .help-panel {
      max-width: 100%;
    }
  }
</style>
