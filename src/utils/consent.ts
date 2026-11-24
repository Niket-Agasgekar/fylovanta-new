import { LanguageCode } from '../types';

export type ConsentChoice = 'all' | 'essential';

export const STORAGE_KEYS = {
  consent: 'fylovanta_cookie_consent',
  consentTs: 'fylovanta_cookie_consent_ts',
  language: 'fylovanta_lang',
} as const;

const LEGACY_KEYS = {
  consent: 'nikify_cookie_consent',
  consentTs: 'nikify_cookie_consent_ts',
  language: 'nikify_lang',
} as const;

export const CONSENT_UPDATED_EVENT = 'fylovanta-consent-updated';

/**
 * Migrates any legacy storage key to `fylovanta_*` cleanly once.
 */
function readWithMigration(primaryKey: string, legacyKey: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const primary = window.localStorage.getItem(primaryKey);
    if (primary !== null) {
      if (window.localStorage.getItem(legacyKey) !== null) {
        window.localStorage.removeItem(legacyKey);
      }
      return primary;
    }
    const legacy = window.localStorage.getItem(legacyKey);
    if (legacy !== null) {
      window.localStorage.setItem(primaryKey, legacy);
      window.localStorage.removeItem(legacyKey);
      return legacy;
    }
  } catch {
    // ignore storage errors in restricted contexts
  }
  return null;
}

export function getSavedConsentChoice(): ConsentChoice | null {
  const raw = readWithMigration(STORAGE_KEYS.consent, LEGACY_KEYS.consent);
  if (raw === 'all' || raw === 'essential') return raw;
  return null;
}

export function getConsentPreference(): ConsentChoice {
  return getSavedConsentChoice() || 'essential';
}

export function hasAnalyticsConsent(): boolean {
  return getSavedConsentChoice() === 'all';
}

export function getConsentTimestamp(): string | null {
  return readWithMigration(STORAGE_KEYS.consentTs, LEGACY_KEYS.consentTs);
}

export function saveConsentPreference(choice: ConsentChoice): string {
  const ts = new Date().toISOString();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEYS.consent, choice);
      window.localStorage.setItem(STORAGE_KEYS.consentTs, ts);
      window.localStorage.removeItem(LEGACY_KEYS.consent);
      window.localStorage.removeItem(LEGACY_KEYS.consentTs);
    } catch {
      // ignore storage errors
    }
    window.dispatchEvent(
      new CustomEvent(CONSENT_UPDATED_EVENT, { detail: { choice, timestamp: ts } })
    );
  }
  return ts;
}

export function getSavedLanguage(): LanguageCode {
  const raw = readWithMigration(STORAGE_KEYS.language, LEGACY_KEYS.language);
  const valid: LanguageCode[] = ['en', 'es', 'fr', 'de', 'pt', 'ja'];
  return valid.includes(raw as LanguageCode) ? (raw as LanguageCode) : 'en';
}

export function saveLanguagePreference(lang: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.language, lang);
    window.localStorage.removeItem(LEGACY_KEYS.language);
  } catch {
    // ignore storage errors
  }
}
