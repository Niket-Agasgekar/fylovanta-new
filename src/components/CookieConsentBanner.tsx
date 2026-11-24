import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { isAdSenseEnabled } from '../config/adsense';
import { BRAND } from '../config/brand';
import { getSavedConsentChoice, saveConsentPreference } from '../utils/consent';

interface CookieConsentBannerProps {
  onNavigate: (route: string) => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onNavigate }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = getSavedConsentChoice();
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleChoice = (choice: 'all' | 'essential') => {
    saveConsentPreference(choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie Consent"
      className="fixed bottom-3 inset-x-3 sm:left-auto sm:right-4 sm:bottom-4 z-40 sm:max-w-md bg-white border border-[#CBD5E1] rounded-2xl shadow-xl p-3.5 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-xs text-[#475569] leading-relaxed">
            <p className="font-bold text-[#0F172A] mb-0.5">Privacy &amp; Cookie Preferences</p>
            <p>
              {isAdSenseEnabled()
                ? `We use essential storage for tool preferences and optional Google AdSense/analytics cookies to keep ${BRAND.name} free.`
                : `We use essential local storage for language and tool preferences, plus optional privacy-safe analytics when accepted.`}{' '}
              <a
                href="/cookies"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('cookies');
                }}
                className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
              >
                Cookie Policy
              </a>
            </p>
          </div>
        </div>
        <button
          onClick={() => handleChoice('essential')}
          aria-label="Dismiss cookie banner"
          className="p-1 text-[#475569] hover:text-[#0F172A] rounded-lg cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => handleChoice('essential')}
          className="px-3 py-1.5 text-xs font-bold text-[#0F172A] bg-[#F7F9FC] hover:bg-[#EEF2F6] border border-[#CBD5E1] rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Essential Only
        </button>
        <button
          onClick={() => handleChoice('all')}
          className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Accept All
        </button>
      </div>
    </div>
  );
};
