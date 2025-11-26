import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator, locale } from 'svelte-i18n';

// Supported languages for Spanish real estate market
export const supportedLocales = [
	{ code: 'es', name: 'Español', flag: '🇪🇸' },
	{ code: 'en', name: 'English', flag: '🇬🇧' },
	{ code: 'de', name: 'Deutsch', flag: '🇩🇪' },
	{ code: 'fr', name: 'Français', flag: '🇫🇷' },
	{ code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
	{ code: 'ru', name: 'Русский', flag: '🇷🇺' },
	{ code: 'sv', name: 'Svenska', flag: '🇸🇪' }
];

export const defaultLocale = 'es';

// Register all locales
register('es', () => import('./locales/es.json'));
register('en', () => import('./locales/en.json'));
register('de', () => import('./locales/de.json'));
register('fr', () => import('./locales/fr.json'));
register('nl', () => import('./locales/nl.json'));
register('ru', () => import('./locales/ru.json'));
register('sv', () => import('./locales/sv.json'));

// Detect best locale from browser
export function detectBrowserLocale(): string {
	if (!browser) return defaultLocale;

	// Get browser language
	const browserLocale = getLocaleFromNavigator();

	// Also check navigator.languages for preference list
	const languages = navigator.languages || [navigator.language];

	// Find first supported locale from browser preferences
	for (const lang of languages) {
		const langCode = lang.split('-')[0].toLowerCase();
		if (supportedLocales.some(l => l.code === langCode)) {
			return langCode;
		}
	}

	// Fallback to browser locale if supported
	if (browserLocale) {
		const code = browserLocale.split('-')[0].toLowerCase();
		if (supportedLocales.some(l => l.code === code)) {
			return code;
		}
	}

	return defaultLocale;
}

// Get stored locale or detect from browser
export function getInitialLocale(): string {
	if (!browser) return defaultLocale;

	// Check localStorage first
	const stored = localStorage.getItem('locale');
	if (stored && supportedLocales.some(l => l.code === stored)) {
		return stored;
	}

	// Detect from browser
	return detectBrowserLocale();
}

// Save locale preference
export function saveLocale(localeCode: string): void {
	if (browser) {
		localStorage.setItem('locale', localeCode);
	}
}

// Get browser/visitor info for smart page
export interface VisitorInfo {
	detectedLocale: string;
	browserLanguages: string[];
	timezone: string;
	country: string | null;
	userAgent: string;
	screenResolution: string;
	isMobile: boolean;
	referrer: string;
}

export function getVisitorInfo(): VisitorInfo {
	if (!browser) {
		return {
			detectedLocale: defaultLocale,
			browserLanguages: [],
			timezone: 'Europe/Madrid',
			country: null,
			userAgent: '',
			screenResolution: '',
			isMobile: false,
			referrer: ''
		};
	}

	const detectedLocale = detectBrowserLocale();
	const browserLanguages = [...(navigator.languages || [navigator.language])];
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const userAgent = navigator.userAgent;
	const screenResolution = `${window.screen.width}x${window.screen.height}`;
	const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
	const referrer = document.referrer;

	// Try to guess country from timezone
	let country: string | null = null;
	if (timezone.includes('Madrid') || timezone.includes('Canary')) {
		country = 'ES';
	} else if (timezone.includes('London')) {
		country = 'GB';
	} else if (timezone.includes('Berlin') || timezone.includes('Vienna') || timezone.includes('Zurich')) {
		country = 'DE';
	} else if (timezone.includes('Paris')) {
		country = 'FR';
	} else if (timezone.includes('Amsterdam')) {
		country = 'NL';
	} else if (timezone.includes('Moscow')) {
		country = 'RU';
	} else if (timezone.includes('Stockholm')) {
		country = 'SE';
	}

	return {
		detectedLocale,
		browserLanguages,
		timezone,
		country,
		userAgent,
		screenResolution,
		isMobile,
		referrer
	};
}

// Initialize i18n
init({
	fallbackLocale: defaultLocale,
	initialLocale: browser ? getInitialLocale() : defaultLocale,
});

// Export locale store for external use
export { locale };
