function readEnv(key: string): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    const val = env?.[key];
    return typeof val === 'string' ? val.trim() : '';
  } catch {
    return '';
  }
}

const rawDomain = (readEnv('VITE_SITE_DOMAIN') || 'fylovanta.com')
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '');

const rawSiteUrl = (readEnv('VITE_SITE_URL') || `https://${rawDomain}`).replace(/\/+$/, '');

/**
 * Central Fylovanta brand & sole-proprietor legal configuration.
 * Keep configurable pending legal/jurisdiction details explicit rather than invented.
 */
export const BRAND = {
  name: 'Fylovanta',
  domain: rawDomain,
  siteUrl: rawSiteUrl,
  tagline: 'Free online file tools for everyday PDF, image, and document tasks.',
  heroHeadline: 'Free Online File Tools for Everyday File Tasks',
  heroSubtitle:
    'Convert, compress, edit and manage your PDF, image and document files online with easy-to-use free tools.',
  targetMarket: 'United States',
  legal: {
    entityType: 'Individual / Sole Proprietor',
    entityName:
      readEnv('VITE_LEGAL_ENTITY') ||
      'Fylovanta, operated by an individual / sole proprietor',
    jurisdiction: readEnv('VITE_LEGAL_JURISDICTION') || 'India',
    contactEmail: readEnv('VITE_CONTACT_EMAIL') || 'niketagasgekar@gmail.com',
    lastUpdated: 'November 23, 2026',
  },
} as const;

export function getCanonicalBaseUrl(): string {
  if (readEnv('VITE_SITE_URL')) {
    return BRAND.siteUrl;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const host = window.location.hostname.toLowerCase();
    if (host === BRAND.domain || host === `www.${BRAND.domain}`) {
      return BRAND.siteUrl;
    }
    return window.location.origin.replace(/\/+$/, '');
  }
  return BRAND.siteUrl;
}
