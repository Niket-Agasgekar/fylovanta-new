export type AdSlotKey = 'top' | 'mid' | 'side' | 'tool';

function readEnv(key: string): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    const raw = env?.[key];
    return typeof raw === 'string' ? raw.trim() : '';
  } catch {
    return '';
  }
}

export function isValidPublisherId(id: string): boolean {
  return /^ca-pub-\d{10,20}$/.test(id) && !/^ca-pub-0+$/.test(id);
}

export function isValidSlotId(id: string): boolean {
  return /^\d{6,20}$/.test(id) && !/^0+$/.test(id);
}

/**
 * Central Google AdSense configuration.
 *
 * Disabled by default (`VITE_ADSENSE_ENABLED` defaults to `false`).
 * When disabled or when publisher/slot IDs are absent, no Google ad scripts
 * are loaded and no empty ad containers are rendered.
 *
 * To activate later:
 * 1. Set `VITE_ADSENSE_ENABLED="true"`
 * 2. Set `VITE_ADSENSE_CLIENT_ID="ca-pub-XXXXXXXXXXXXXXXX"`
 * 3. Set one or more slot IDs (`VITE_ADSENSE_SLOT_TOP`, `_MID`, `_SIDE`, `_TOOL`)
 */
export const ADSENSE_CONFIG = {
  enabled: readEnv('VITE_ADSENSE_ENABLED').toLowerCase() === 'true',
  clientId: readEnv('VITE_ADSENSE_CLIENT_ID'),
  slots: {
    top: readEnv('VITE_ADSENSE_SLOT_TOP'),
    mid: readEnv('VITE_ADSENSE_SLOT_MID'),
    side: readEnv('VITE_ADSENSE_SLOT_SIDE'),
    tool: readEnv('VITE_ADSENSE_SLOT_TOOL') || readEnv('VITE_ADSENSE_SLOT_TOOL_BOTTOM'),
  } as Record<AdSlotKey, string>,
};

export function isAdSenseEnabled(): boolean {
  return ADSENSE_CONFIG.enabled && isValidPublisherId(ADSENSE_CONFIG.clientId);
}

export function isAdSenseSlotActive(slotKey: AdSlotKey): boolean {
  if (!isAdSenseEnabled()) return false;
  const slotId = ADSENSE_CONFIG.slots[slotKey] || '';
  return isValidSlotId(slotId);
}
