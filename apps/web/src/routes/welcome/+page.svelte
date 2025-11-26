<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { locale } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { supportedLocales, localeGroups, getVisitorInfo, saveLocale, type VisitorInfo } from '$lib/i18n';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

	let visitorInfo: VisitorInfo | null = null;
	let isLoading = true;
	let selectedLocale = 'es';

	onMount(() => {
		visitorInfo = getVisitorInfo();
		selectedLocale = visitorInfo.detectedLocale;
		isLoading = false;
	});

	function selectLanguage(code: string) {
		selectedLocale = code;
		locale.set(code);
		saveLocale(code);
	}

	function goToLogin() {
		goto('/login');
	}

	function goToRegister() {
		goto('/register');
	}

	function scrollToFeatures() {
		document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
	}

	$: currentLocale = supportedLocales.find(l => l.code === selectedLocale);
	$: currentLocaleName = currentLocale?.native || 'Español';
</script>

<svelte:head>
	<title>Tesoro CRM - {$_('landing.hero.title')}</title>
	<meta name="description" content={$_('landing.hero.subtitle')} />
</svelte:head>

<div class="landing-page">
	<!-- Header -->
	<header class="header">
		<div class="container header-content">
			<div class="logo">
				<svg viewBox="0 0 40 40" class="logo-icon">
					<rect width="40" height="40" rx="8" fill="var(--primary)"/>
					<path d="M12 20h16M20 12v16" stroke="white" stroke-width="3" stroke-linecap="round"/>
				</svg>
				<span class="logo-text">Tesoro CRM</span>
			</div>
			<nav class="header-nav">
				<LanguageSwitcher />
				<button class="btn btn-secondary" on:click={goToLogin}>
					{$_('nav.login')}
				</button>
				<button class="btn btn-primary" on:click={goToRegister}>
					{$_('nav.register')}
				</button>
			</nav>
		</div>
	</header>

	<!-- Hero Section -->
	<section class="hero">
		<div class="container hero-content">
			<div class="hero-text">
				<h1>{$_('landing.hero.title')}</h1>
				<p class="hero-subtitle">{$_('landing.hero.subtitle')}</p>
				<div class="hero-buttons">
					<button class="btn btn-primary btn-lg" on:click={goToRegister}>
						{$_('landing.hero.cta')}
					</button>
					<button class="btn btn-outline btn-lg" on:click={scrollToFeatures}>
						{$_('landing.hero.learnMore')}
					</button>
				</div>
			</div>
			<div class="hero-image">
				<div class="hero-card">
					<div class="hero-card-header">
						<div class="dots">
							<span class="dot red"></span>
							<span class="dot yellow"></span>
							<span class="dot green"></span>
						</div>
					</div>
					<div class="hero-card-content">
						<div class="stat-row">
							<div class="stat">
								<span class="stat-number">1,247</span>
								<span class="stat-label">{$_('dashboard.totalProperties')}</span>
							</div>
							<div class="stat">
								<span class="stat-number">89</span>
								<span class="stat-label">{$_('dashboard.totalCustomers')}</span>
							</div>
						</div>
						<div class="property-preview">
							<div class="property-item">
								<div class="property-img"></div>
								<div class="property-info">
									<span class="property-price">€ 385,000</span>
									<span class="property-location">Marbella, Costa del Sol</span>
								</div>
							</div>
							<div class="property-item">
								<div class="property-img"></div>
								<div class="property-info">
									<span class="property-price">€ 520,000</span>
									<span class="property-location">Jávea, Costa Blanca</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Smart Language Detection Section -->
	<section class="language-detection">
		<div class="container">
			<div class="detection-card">
				<div class="detection-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<line x1="2" y1="12" x2="22" y2="12"/>
						<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
					</svg>
				</div>
				<div class="detection-content">
					<h2>{$_('landing.languages.title')}</h2>
					<p>{$_('landing.languages.subtitle')}</p>

					{#if visitorInfo}
						<div class="detected-info">
							<span class="detected-badge">
								{$_('landing.languages.detected', { values: { language: currentLocaleName }})}
							</span>
						</div>

						<div class="visitor-info">
							<div class="info-item">
								<span class="info-label">Timezone:</span>
								<span class="info-value">{visitorInfo.timezone}</span>
							</div>
							{#if visitorInfo.country}
								<div class="info-item">
									<span class="info-label">Country:</span>
									<span class="info-value">{visitorInfo.country}</span>
								</div>
							{/if}
							<div class="info-item">
								<span class="info-label">Device:</span>
								<span class="info-value">{visitorInfo.isMobile ? 'Mobile' : 'Desktop'}</span>
							</div>
						</div>
					{/if}

					<p class="select-prompt">{$_('landing.languages.selectLanguage')}:</p>
					{#each localeGroups as group}
						<div class="language-group">
							<h4 class="group-title">{group.name}</h4>
							<div class="language-grid">
								{#each group.locales as loc}
									<button
										class="language-btn"
										class:active={loc.code === selectedLocale}
										on:click={() => selectLanguage(loc.code)}
									>
										<span class="lang-flag">{loc.flag}</span>
										<div class="lang-info">
											<span class="lang-name">{loc.native}</span>
											<span class="lang-english">{loc.name}</span>
										</div>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section id="features" class="features">
		<div class="container">
			<h2 class="section-title">{$_('landing.features.title')}</h2>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
							<line x1="16" y1="13" x2="8" y2="13"/>
							<line x1="16" y1="17" x2="8" y2="17"/>
							<polyline points="10 9 9 9 8 9"/>
						</svg>
					</div>
					<h3>{$_('landing.features.feeds.title')}</h3>
					<p>{$_('landing.features.feeds.description')}</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
							<circle cx="9" cy="7" r="4"/>
							<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
							<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
						</svg>
					</div>
					<h3>{$_('landing.features.customers.title')}</h3>
					<p>{$_('landing.features.customers.description')}</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 11 12 14 22 4"/>
							<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
						</svg>
					</div>
					<h3>{$_('landing.features.selections.title')}</h3>
					<p>{$_('landing.features.selections.description')}</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="18" cy="5" r="3"/>
							<circle cx="6" cy="12" r="3"/>
							<circle cx="18" cy="19" r="3"/>
							<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
							<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
						</svg>
					</div>
					<h3>{$_('landing.features.share.title')}</h3>
					<p>{$_('landing.features.share.description')}</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"/>
							<line x1="2" y1="12" x2="22" y2="12"/>
							<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
						</svg>
					</div>
					<h3>{$_('landing.features.multilingual.title')}</h3>
					<p>{$_('landing.features.multilingual.description')}</p>
				</div>

				<div class="feature-card">
					<div class="feature-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="23 4 23 10 17 10"/>
							<polyline points="1 20 1 14 7 14"/>
							<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
						</svg>
					</div>
					<h3>{$_('landing.features.realtime.title')}</h3>
					<p>{$_('landing.features.realtime.description')}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="cta">
		<div class="container">
			<div class="cta-content">
				<h2>{$_('landing.cta.title')}</h2>
				<p>{$_('landing.cta.subtitle')}</p>
				<button class="btn btn-white btn-lg" on:click={goToRegister}>
					{$_('landing.cta.button')}
				</button>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="footer">
		<div class="container footer-content">
			<div class="footer-logo">
				<svg viewBox="0 0 40 40" class="logo-icon">
					<rect width="40" height="40" rx="8" fill="var(--primary)"/>
					<path d="M12 20h16M20 12v16" stroke="white" stroke-width="3" stroke-linecap="round"/>
				</svg>
				<span>Tesoro CRM</span>
			</div>
			<div class="footer-links">
				<a href="/privacy">{$_('landing.footer.privacy')}</a>
				<a href="/terms">{$_('landing.footer.terms')}</a>
				<a href="/contact">{$_('landing.footer.contact')}</a>
			</div>
			<p class="copyright">{$_('landing.footer.copyright')}</p>
		</div>
	</footer>
</div>

<style>
	.landing-page {
		min-height: 100vh;
		background: #f8fafc;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	/* Header */
	.header {
		background: white;
		border-bottom: 1px solid #e2e8f0;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.logo-icon {
		width: 2.5rem;
		height: 2.5rem;
	}

	.logo-text {
		font-size: 1.25rem;
		font-weight: 700;
		color: #1e293b;
	}

	.header-nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	/* Buttons */
	.btn {
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.btn-primary {
		background: var(--primary, #2563eb);
		color: white;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}

	.btn-secondary {
		background: #f1f5f9;
		color: #475569;
	}

	.btn-secondary:hover {
		background: #e2e8f0;
	}

	.btn-outline {
		background: transparent;
		border: 2px solid #e2e8f0;
		color: #475569;
	}

	.btn-outline:hover {
		border-color: var(--primary, #2563eb);
		color: var(--primary, #2563eb);
	}

	.btn-white {
		background: white;
		color: var(--primary, #2563eb);
	}

	.btn-white:hover {
		background: #f8fafc;
	}

	.btn-lg {
		padding: 0.875rem 1.75rem;
		font-size: 1rem;
	}

	/* Hero */
	.hero {
		padding: 4rem 0;
		background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
	}

	.hero-content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4rem;
		align-items: center;
	}

	.hero-text h1 {
		font-size: 3rem;
		font-weight: 800;
		color: #0f172a;
		line-height: 1.1;
		margin-bottom: 1.5rem;
	}

	.hero-subtitle {
		font-size: 1.25rem;
		color: #475569;
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.hero-buttons {
		display: flex;
		gap: 1rem;
	}

	.hero-card {
		background: white;
		border-radius: 1rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}

	.hero-card-header {
		background: #f1f5f9;
		padding: 0.75rem 1rem;
	}

	.dots {
		display: flex;
		gap: 0.5rem;
	}

	.dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
	}

	.dot.red { background: #ef4444; }
	.dot.yellow { background: #f59e0b; }
	.dot.green { background: #22c55e; }

	.hero-card-content {
		padding: 1.5rem;
	}

	.stat-row {
		display: flex;
		gap: 2rem;
		margin-bottom: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat-number {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--primary, #2563eb);
	}

	.stat-label {
		font-size: 0.75rem;
		color: #64748b;
	}

	.property-preview {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.property-item {
		display: flex;
		gap: 1rem;
		padding: 0.75rem;
		background: #f8fafc;
		border-radius: 0.5rem;
	}

	.property-img {
		width: 3rem;
		height: 3rem;
		background: linear-gradient(135deg, #e0f2fe, #bae6fd);
		border-radius: 0.375rem;
	}

	.property-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.property-price {
		font-weight: 600;
		color: #0f172a;
	}

	.property-location {
		font-size: 0.75rem;
		color: #64748b;
	}

	/* Language Detection */
	.language-detection {
		padding: 4rem 0;
	}

	.detection-card {
		background: white;
		border-radius: 1rem;
		padding: 3rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		display: flex;
		gap: 3rem;
		align-items: flex-start;
	}

	.detection-icon {
		flex-shrink: 0;
		width: 5rem;
		height: 5rem;
		background: linear-gradient(135deg, #eff6ff, #dbeafe);
		border-radius: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.detection-icon svg {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--primary, #2563eb);
	}

	.detection-content {
		flex: 1;
	}

	.detection-content h2 {
		font-size: 1.75rem;
		font-weight: 700;
		color: #0f172a;
		margin-bottom: 0.5rem;
	}

	.detection-content > p {
		color: #64748b;
		margin-bottom: 1.5rem;
	}

	.detected-info {
		margin-bottom: 1rem;
	}

	.detected-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: #dcfce7;
		color: #166534;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.visitor-info {
		display: flex;
		gap: 2rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 0.5rem;
	}

	.info-item {
		display: flex;
		gap: 0.5rem;
	}

	.info-label {
		color: #64748b;
		font-size: 0.875rem;
	}

	.info-value {
		color: #1e293b;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.select-prompt {
		color: #475569;
		margin-bottom: 1.5rem;
		font-weight: 500;
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
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
	}

	.language-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: #f8fafc;
		border: 2px solid #e2e8f0;
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.language-btn:hover {
		border-color: var(--primary, #2563eb);
		background: #f1f5f9;
	}

	.language-btn.active {
		background: #eff6ff;
		border-color: var(--primary, #2563eb);
	}

	.lang-flag {
		font-size: 1.75rem;
		line-height: 1;
	}

	.lang-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.lang-name {
		font-weight: 600;
		color: #0f172a;
		font-size: 0.9375rem;
	}

	.lang-english {
		font-size: 0.75rem;
		color: #64748b;
	}

	/* Features */
	.features {
		padding: 5rem 0;
		background: white;
	}

	.section-title {
		text-align: center;
		font-size: 2rem;
		font-weight: 700;
		color: #0f172a;
		margin-bottom: 3rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}

	.feature-card {
		padding: 2rem;
		background: #f8fafc;
		border-radius: 1rem;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.feature-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.feature-icon {
		width: 3rem;
		height: 3rem;
		background: var(--primary, #2563eb);
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.25rem;
	}

	.feature-icon svg {
		width: 1.5rem;
		height: 1.5rem;
		stroke: white;
	}

	.feature-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #0f172a;
		margin-bottom: 0.75rem;
	}

	.feature-card p {
		color: #64748b;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	/* CTA */
	.cta {
		padding: 5rem 0;
		background: linear-gradient(135deg, var(--primary, #2563eb), #1d4ed8);
	}

	.cta-content {
		text-align: center;
		color: white;
	}

	.cta-content h2 {
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.cta-content p {
		font-size: 1.125rem;
		opacity: 0.9;
		margin-bottom: 2rem;
	}

	/* Footer */
	.footer {
		background: #0f172a;
		padding: 3rem 0;
		color: white;
	}

	.footer-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.footer-logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.footer-logo .logo-icon {
		width: 2rem;
		height: 2rem;
	}

	.footer-links {
		display: flex;
		gap: 2rem;
	}

	.footer-links a {
		color: #94a3b8;
		text-decoration: none;
		font-size: 0.875rem;
		transition: color 0.2s ease;
	}

	.footer-links a:hover {
		color: white;
	}

	.copyright {
		color: #64748b;
		font-size: 0.875rem;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.hero-content {
			grid-template-columns: 1fr;
			text-align: center;
		}

		.hero-buttons {
			justify-content: center;
		}

		.hero-image {
			display: none;
		}

		.features-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.detection-card {
			flex-direction: column;
		}
	}

	@media (max-width: 768px) {
		.header-nav .btn-secondary {
			display: none;
		}

		.hero-text h1 {
			font-size: 2rem;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.visitor-info {
			flex-direction: column;
			gap: 0.5rem;
		}

		.language-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
