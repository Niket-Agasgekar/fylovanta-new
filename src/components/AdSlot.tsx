import React, { useEffect, useRef } from 'react';
import {
  ADSENSE_CONFIG,
  AdSlotKey,
  isAdSenseSlotActive,
} from '../config/adsense';
import { CONSENT_UPDATED_EVENT, getConsentPreference } from '../utils/consent';

export type AdSlotVariant = 'leaderboard' | 'rectangle' | 'in-article';

interface AdSlotProps {
  variant: AdSlotVariant;
  slotKey?: AdSlotKey;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>> & {
      requestNonPersonalizedAds?: number;
    };
  }
}

export const AdSlot: React.FC<AdSlotProps> = ({
  variant,
  slotKey = 'top',
  className = '',
}) => {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef<boolean>(false);

  const resolvedSlotKey: AdSlotKey = (slotKey || 'top') as AdSlotKey;
  const clientId = ADSENSE_CONFIG.clientId;
  const slotId = ADSENSE_CONFIG.slots[resolvedSlotKey] || '';
  const isActive = isAdSenseSlotActive(resolvedSlotKey);

  useEffect(() => {
    const syncConsentFlag = () => {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.requestNonPersonalizedAds =
        getConsentPreference() === 'essential' ? 1 : 0;
    };

    window.addEventListener(CONSENT_UPDATED_EVENT, syncConsentFlag);
    if (!isActive || pushedRef.current) {
      return () => window.removeEventListener(CONSENT_UPDATED_EVENT, syncConsentFlag);
    }

    syncConsentFlag();

    const scriptId = 'fylovanta-adsense-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      document.head.appendChild(script);
    }

    if (insRef.current && !insRef.current.getAttribute('data-adsbygoogle-status')) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushedRef.current = true;
      } catch {
        // Ignore non-fatal ad push issues (e.g., blocked by client extensions)
      }
    }

    return () => {
      window.removeEventListener(CONSENT_UPDATED_EVENT, syncConsentFlag);
    };
  }, [clientId, slotId, isActive]);

  // When disabled or unconfigured, render nothing (no empty containers or scripts)
  if (!isActive) {
    return null;
  }

  const dimensionsClass =
    variant === 'rectangle'
      ? 'min-h-[250px] w-full max-w-[336px] mx-auto'
      : variant === 'in-article'
      ? 'min-h-[100px] sm:min-h-[120px] w-full'
      : 'min-h-[50px] sm:min-h-[90px] w-full max-w-[728px] mx-auto';

  return (
    <aside
      aria-label="Advertisement"
      data-ad-slot-key={resolvedSlotKey}
      data-ad-variant={variant}
      className={`my-5 sm:my-7 ${className}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] text-center mb-1.5 select-none">
        Advertisement
      </div>

      <div
        className={`overflow-hidden rounded-xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-center justify-center ${dimensionsClass}`}
      >
        <ins
          ref={insRef}
          className="adsbygoogle block w-full"
          style={{ display: 'block' }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format={variant === 'in-article' ? 'fluid' : 'auto'}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
};
