function readEnv(key: string): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    const val = env?.[key];
    return typeof val === 'string' ? val.trim() : '';
  } catch {
    return '';
  }
}

export const FEATURES = {
  /**
   * Video and audio transcoding (FFmpeg) is disabled by default so Fylovanta
   * runs sustainably on free-tier hosting with zero heavy CPU/bandwidth spikes.
   */
  mediaToolsEnabled: readEnv('VITE_ENABLE_MEDIA_TOOLS').toLowerCase() === 'true',

  /**
   * Optional server-side fallbacks (Ghostscript PDF compression, ImageMagick HEIC/TIFF decoding).
   * Disabled by default to preserve 100% browser-first zero-upload behavior.
   */
  serverFallbacksEnabled:
    readEnv('VITE_ENABLE_SERVER_FALLBACKS').toLowerCase() === 'true',

  gaMeasurementId: readEnv('VITE_GA_MEASUREMENT_ID'),
  gscVerification: readEnv('VITE_GSC_VERIFICATION'),
} as const;

export const MEDIA_TOOL_SLUGS = new Set([
  'compress-video',
  'compress-audio',
  'mp4-to-mp3',
  'mov-to-mp4',
  'video-to-gif',
  'audio-converter',
  'mp3-converter',
  'wav-converter',
  'video-converter',
  'mp4-converter',
]);

export const MEDIA_CATEGORY_SLUGS = new Set(['video-tools', 'audio-tools']);

export function isToolDisabled(
  slug?: string,
  category?: string
): boolean {
  if (FEATURES.mediaToolsEnabled) return false;
  const cleanSlug = (slug || '').replace(/^\//, '').toLowerCase();
  if (MEDIA_TOOL_SLUGS.has(cleanSlug) || MEDIA_CATEGORY_SLUGS.has(cleanSlug)) {
    return true;
  }
  if (category === 'video' || category === 'audio') {
    return true;
  }
  return false;
}
