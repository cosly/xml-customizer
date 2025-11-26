<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { supportedLocales, saveLocale, localeGroups } from '$lib/i18n';

	let isOpen = false;

	function selectLocale(code: string) {
		locale.set(code);
		saveLocale(code);
		isOpen = false;
	}

	function openDrawer() {
		isOpen = true;
	}

	function closeDrawer() {
		isOpen = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeDrawer();
		}
	}

	$: currentLocale = supportedLocales.find(l => l.code === $locale) || supportedLocales[0];
</script>

<svelte:window on:keydown={handleKeydown} />

<button
	class="language-trigger"
	on:click={openDrawer}
	aria-label="Select language"
>
	<span class="flag">{currentLocale.flag}</span>
	<span class="code">{currentLocale.code.toUpperCase()}</span>
</button>

{#if isOpen}
	<div class="drawer-overlay" on:click={closeDrawer} on:keydown={handleKeydown} role="button" tabindex="-1"></div>
	<div class="drawer" role="dialog" aria-modal="true" aria-label="Select language">
		<div class="drawer-header">
			<h2>Select Language</h2>
			<button class="close-btn" on:click={closeDrawer} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="drawer-content">
			{#each localeGroups as group}
				<div class="language-group">
					<h3 class="group-title">{group.name}</h3>
					<div class="language-grid">
						{#each group.locales as loc}
							<button
								class="language-item"
								class:active={loc.code === $locale}
								on:click={() => selectLocale(loc.code)}
							>
								<span class="item-flag">{loc.flag}</span>
								<div class="item-info">
									<span class="item-name">{loc.name}</span>
									<span class="item-native">{loc.native}</span>
								</div>
								{#if loc.code === $locale}
									<svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.language-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg-secondary, #f8fafc);
		border: 1px solid var(--border-color, #e2e8f0);
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--text-primary, #1e293b);
		transition: all 0.2s ease;
	}

	.language-trigger:hover {
		background: var(--bg-hover, #f1f5f9);
		border-color: var(--primary, #2563eb);
	}

	.flag {
		font-size: 1.25rem;
		line-height: 1;
	}

	.code {
		font-weight: 500;
	}

	.drawer-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		animation: fadeIn 0.2s ease;
	}

	.drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		max-width: 400px;
		background: white;
		box-shadow: -4px 0 25px rgba(0, 0, 0, 0.15);
		z-index: 1001;
		display: flex;
		flex-direction: column;
		animation: slideIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideIn {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.drawer-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #0f172a;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: none;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		color: #64748b;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: #f1f5f9;
		color: #0f172a;
	}

	.close-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.language-group {
		margin-bottom: 1.5rem;
	}

	.language-group:last-child {
		margin-bottom: 0;
	}

	.group-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #64748b;
		margin: 0 0 0.75rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.language-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
	}

	.language-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 0.875rem 1rem;
		background: #f8fafc;
		border: 2px solid transparent;
		border-radius: 0.75rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
	}

	.language-item:hover {
		background: #f1f5f9;
		border-color: #e2e8f0;
	}

	.language-item.active {
		background: #eff6ff;
		border-color: var(--primary, #2563eb);
	}

	.item-flag {
		font-size: 2rem;
		line-height: 1;
	}

	.item-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.item-name {
		font-weight: 600;
		color: #0f172a;
		font-size: 0.9375rem;
	}

	.item-native {
		font-size: 0.8125rem;
		color: #64748b;
	}

	.check-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--primary, #2563eb);
		flex-shrink: 0;
	}

	@media (max-width: 480px) {
		.drawer {
			max-width: 100%;
		}
	}
</style>
