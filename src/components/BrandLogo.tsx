import React from 'react';
import { BRAND } from '../config/brand';

interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'mark';
  tone?: 'light' | 'dark';
  showTagline?: boolean;
  className?: string;
}

/**
 * Original Fylovanta Brand Mark & Wordmark.
 * Symbolizes interlocking file transformation layers forming an abstract "F" prism.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  tone = 'light',
  showTagline = false,
  className = '',
}) => {
  const isDark = tone === 'dark';

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Abstract Geometric Prism Mark (recognizable standalone at 16px+) */}
      <span
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
          isDark
            ? 'bg-[#1E293B] border border-[#334155]'
            : 'bg-[#0F172A]'
        }`}
        aria-hidden="true"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          {/* Upper flowing transformation ribbon */}
          <path
            d="M6 6.5C6 5.67 6.67 5 7.5 5H18.5L15.75 8.75H9.75V11.25H15.25L13 14.5H9.75V19H6V6.5Z"
            fill="#FFFFFF"
          />
          {/* Secondary prism facet representing conversion flow */}
          <path
            d="M15.75 8.75L18.5 5L19 10.25L15.25 14.5L13 14.5L15.75 8.75Z"
            fill="#38BDF8"
          />
          <circle cx="17.25" cy="17.25" r="2.25" fill="#0D9488" />
        </svg>
      </span>

      {variant !== 'mark' && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-black tracking-tight ${
              variant === 'compact' ? 'text-lg' : 'text-lg sm:text-xl'
            } ${isDark ? 'text-white' : 'text-[#0F172A]'}`}
          >
            {BRAND.name}
          </span>
          {showTagline && (
            <span
              className={`text-[10px] font-semibold tracking-wide mt-0.5 hidden lg:block ${
                isDark ? 'text-[#94A3B8]' : 'text-[#475569]'
              }`}
            >
              Everyday File Utilities
            </span>
          )}
        </span>
      )}
    </span>
  );
};
