import { FEATURES } from '../config/features';
import { CONSENT_UPDATED_EVENT, hasAnalyticsConsent } from './consent';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown> | unknown[]>;
    gtag?: (...args: unknown[]) => void;
  }
}

let gaInitialized = false;
let lastTrackedPath = '';
let listenerRegistered = false;

function getMeasurementId(): string {
  const id = FEATURES.gaMeasurementId.trim();
  return /^G-[A-Z0-9]{4,20}$/i.test(id) ? id : '';
}

function ensureGaInitialized(): boolean {
  if (typeof window === 'undefined') return false;
  const measurementId = getMeasurementId();
  if (!measurementId || !hasAnalyticsConsent()) return false;

  if (!listenerRegistered) {
    listenerRegistered = true;
    window.addEventListener(CONSENT_UPDATED_EVENT, () => {
      if (hasAnalyticsConsent()) {
        ensureGaInitialized();
      }
    });
  }

  if (gaInitialized && typeof window.gtag === 'function') {
    return true;
  }

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }

  const scriptId = 'fylovanta-ga4-script';
  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });

  gaInitialized = true;
  return true;
}

if (typeof window !== 'undefined' && !listenerRegistered) {
  listenerRegistered = true;
  window.addEventListener(CONSENT_UPDATED_EVENT, () => {
    if (hasAnalyticsConsent()) {
      ensureGaInitialized();
      if (lastTrackedPath) {
        const prev = lastTrackedPath;
        lastTrackedPath = '';
        trackPageView(prev, document.title);
      }
    }
  });
}

function sendGaEvent(eventName: string, params: Record<string, string | number | boolean>): void {
  if (!ensureGaInitialized() || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

export function trackPageView(pagePath: string, pageTitle: string): void {
  const cleanPath = pagePath || '/';
  if (lastTrackedPath === cleanPath && gaInitialized) {
    return;
  }
  lastTrackedPath = cleanPath;
  if (!ensureGaInitialized() || typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: cleanPath,
    page_title: pageTitle,
    page_location: typeof window !== 'undefined' ? window.location.href : cleanPath,
  });
}

export function trackToolView(toolSlug: string, category: string): void {
  sendGaEvent('tool_view', {
    tool_slug: toolSlug,
    tool_category: category,
  });
}

export function trackToolSearch(queryLength: number, resultCount: number, source: 'hero' | 'modal'): void {
  sendGaEvent('tool_search', {
    query_length: queryLength,
    result_count: resultCount,
    search_source: source,
  });
}

export function trackFileUploadInitiated(toolSlug: string, category: string, fileCount: number): void {
  sendGaEvent('file_upload_initiated', {
    tool_slug: toolSlug || 'general',
    tool_category: category,
    file_count: fileCount,
  });
}

export function trackConversionStarted(toolSlug: string, category: string, targetFormat: string): void {
  sendGaEvent('conversion_started', {
    tool_slug: toolSlug || 'general',
    tool_category: category,
    target_format: targetFormat.toLowerCase(),
  });
}

export function trackConversionCompleted(
  toolSlug: string,
  category: string,
  processorMode: string,
  durationMs: number
): void {
  sendGaEvent('conversion_completed', {
    tool_slug: toolSlug || 'general',
    tool_category: category,
    processor_mode: processorMode,
    duration_ms: Math.max(0, Math.round(durationMs)),
  });
}

export function trackConversionFailed(toolSlug: string, category: string, reasonCode: string): void {
  sendGaEvent('conversion_failed', {
    tool_slug: toolSlug || 'general',
    tool_category: category,
    reason_code: reasonCode.slice(0, 48),
  });
}

export function trackDownloadCompleted(toolSlug: string, format: string, isBatchZip = false): void {
  sendGaEvent('download_completed', {
    tool_slug: toolSlug || 'general',
    output_format: format.toLowerCase(),
    is_batch_zip: isBatchZip,
  });
}
