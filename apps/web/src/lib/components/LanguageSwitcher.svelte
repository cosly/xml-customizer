<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { supportedLocales, saveLocale } from '$lib/i18n';

	let isOpen = false;

	function selectLocale(code: string) {
		locale.set(code);
		saveLocale(code);
		isOpen = false;
	}

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function closeDropdown() {
		isOpen = false;
	}

	$: currentLocale = supportedLocales.find(l => l.code === $locale) || supportedLocales[0];
</script>

<svelte:window on:click={closeDropdown} />

<div class="language-switcher">
	<button
		class="current-language"
		on:click|stopPropagation={toggleDropdown}
		aria-expanded={isOpen}
		aria-haspopup="listbox"
	>
		<span class="flag">{currentLocale.flag}</span>
		<span class="code">{currentLocale.code.toUpperCase()}</span>
		<svg class="chevron" class:open={isOpen} viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
		</svg>
	</button>

	{#if isOpen}
		<ul class="dropdown" role="listbox">
			{#each supportedLocales as loc}
				<li>
					<button
						class="dropdown-item"
						class:active={loc.code === $locale}
						on:click|stopPropagation={() => selectLocale(loc.code)}
						role="option"
						aria-selected={loc.code === $locale}
					>
						<span class="flag">{loc.flag}</span>
						<span class="name">{loc.name}</span>
						{#if loc.code === $locale}
							<svg class="check" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.language-switcher {
		position: relative;
		display: inline-block;
	}

	.current-language {
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

	.current-language:hover {
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

	.chevron {
		width: 1rem;
		height: 1rem;
		transition: transform 0.2s ease;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 0.25rem);
		right: 0;
		min-width: 180px;
		background: white;
		border: 1px solid var(--border-color, #e2e8f0);
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		list-style: none;
		padding: 0.25rem;
		margin: 0;
		z-index: 1000;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: none;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: var(--text-primary, #1e293b);
		text-align: left;
		transition: background 0.15s ease;
	}

	.dropdown-item:hover {
		background: var(--bg-hover, #f1f5f9);
	}

	.dropdown-item.active {
		background: var(--primary-light, #eff6ff);
		color: var(--primary, #2563eb);
	}

	.name {
		flex: 1;
	}

	.check {
		width: 1rem;
		height: 1rem;
		color: var(--primary, #2563eb);
	}
</style>
