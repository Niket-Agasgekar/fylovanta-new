import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { getTranslations } from '../utils/i18n';
import { BrandLogo } from './BrandLogo';
import { BRAND } from '../config/brand';
import { FEATURES, isToolDisabled } from '../config/features';

interface HeaderProps {
  onNavigate: (route: string) => void;
  currentRoute: string;
  onOpenSearch: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  currentRoute,
  onOpenSearch,
  selectedLanguage,
  onSelectLanguage,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [openMobileAccordion, setOpenMobileAccordion] = useState<string | null>('pdf');

  const t = getTranslations(selectedLanguage);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
    { code: 'ja', label: '日本語' },
  ];

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setLangMenuOpen(false);
        setActiveDropdown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, route: string) => {
    e.preventDefault();
    onNavigate(route);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  const toggleMobileAccordion = (section: string) => {
    setOpenMobileAccordion((prev) => (prev === section ? null : section));
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#F7F9FC]/95 backdrop-blur-md border-b border-[#CBD5E1] h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3 sm:gap-6">
          {/* Brand Logo */}
          <a
            id="brand-logo-btn"
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className="flex items-center text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-xl p-0.5 whitespace-nowrap shrink-0"
            aria-label={`${BRAND.name} Homepage`}
          >
            <span className="hidden sm:inline-flex">
              <BrandLogo variant="full" showTagline />
            </span>
            <span className="inline-flex sm:hidden">
              <BrandLogo variant="compact" />
            </span>
          </a>

          {/* Primary Category Navigation */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('pdf')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <a
                href="/pdf-tools"
                onClick={(e) => handleLinkClick(e, 'pdf-tools')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                  currentRoute === '/pdf-tools' || activeDropdown === 'pdf'
                    ? 'text-[#2563EB] bg-[#EEF2F6]'
                    : 'text-[#0F172A] hover:text-[#2563EB] hover:bg-[#EEF2F6]'
                }`}
              >
                <span>PDF Tools</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#475569]" />
              </a>

              {activeDropdown === 'pdf' && (
                <div className="absolute top-full left-0 w-64 pt-1 z-50">
                  <div className="bg-white rounded-2xl border border-[#CBD5E1] p-2 shadow-lg space-y-0.5">
                    {[
                      { slug: 'pdf-tools', label: 'All PDF Tools' },
                      { slug: 'pdf-to-word', label: 'PDF to Word (DOCX)' },
                      { slug: 'word-to-pdf', label: 'Word to PDF' },
                      { slug: 'merge-pdf', label: 'Merge PDF' },
                      { slug: 'split-pdf', label: 'Split PDF' },
                      { slug: 'compress-pdf', label: 'Compress PDF' },
                      { slug: 'rotate-pdf', label: 'Rotate PDF Pages' },
                      { slug: 'add-page-numbers', label: 'Add Page Numbers' },
                      { slug: 'watermark-pdf', label: 'Watermark PDF' },
                    ].map((item) => (
                      <a
                        key={item.slug}
                        href={`/${item.slug}`}
                        onClick={(e) => handleLinkClick(e, item.slug)}
                        className="w-full flex items-center px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F7F9FC] hover:text-[#2563EB] rounded-xl transition-colors"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('image')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <a
                href="/image-tools"
                onClick={(e) => handleLinkClick(e, 'image-tools')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                  currentRoute === '/image-tools' || activeDropdown === 'image'
                    ? 'text-[#2563EB] bg-[#EEF2F6]'
                    : 'text-[#0F172A] hover:text-[#2563EB] hover:bg-[#EEF2F6]'
                }`}
              >
                <span>Image Tools</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#475569]" />
              </a>

              {activeDropdown === 'image' && (
                <div className="absolute top-full left-0 w-64 pt-1 z-50">
                  <div className="bg-white rounded-2xl border border-[#CBD5E1] p-2 shadow-lg space-y-0.5">
                    {[
                      { slug: 'image-tools', label: 'All Image Tools' },
                      { slug: 'image-converter', label: 'Image Converter' },
                      { slug: 'resize-image', label: 'Resize Image' },
                      { slug: 'compress-image', label: 'Compress Image' },
                      { slug: 'jpg-to-png', label: 'JPG to PNG' },
                      { slug: 'png-to-jpg', label: 'PNG to JPG' },
                      { slug: 'heic-to-jpg', label: 'HEIC to JPG' },
                      { slug: 'svg-to-png', label: 'SVG to PNG' },
                    ].map((item) => (
                      <a
                        key={item.slug}
                        href={`/${item.slug}`}
                        onClick={(e) => handleLinkClick(e, item.slug)}
                        className="w-full flex items-center px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F7F9FC] hover:text-[#2563EB] rounded-xl transition-colors"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a
              href="/video-tools"
              onClick={(e) => handleLinkClick(e, 'video-tools')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                currentRoute === '/video-tools'
                  ? 'text-[#2563EB] bg-[#EEF2F6]'
                  : 'text-[#0F172A] hover:text-[#2563EB] hover:bg-[#EEF2F6]'
              }`}
            >
              Video Tools
            </a>

            <a
              href="/audio-tools"
              onClick={(e) => handleLinkClick(e, 'audio-tools')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                currentRoute === '/audio-tools'
                  ? 'text-[#2563EB] bg-[#EEF2F6]'
                  : 'text-[#0F172A] hover:text-[#2563EB] hover:bg-[#EEF2F6]'
              }`}
            >
              Audio Tools
            </a>

            <a
              href="/file-utilities"
              onClick={(e) => handleLinkClick(e, 'file-utilities')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                currentRoute === '/file-utilities'
                  ? 'text-[#2563EB] bg-[#EEF2F6]'
                  : 'text-[#0F172A] hover:text-[#2563EB] hover:bg-[#EEF2F6]'
              }`}
            >
              Other Utilities
            </a>

            <a
              href="/about"
              onClick={(e) => handleLinkClick(e, 'about')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                currentRoute === '/about'
                  ? 'text-[#2563EB] bg-[#EEF2F6]'
                  : 'text-[#0F172A] hover:text-[#2563EB] hover:bg-[#EEF2F6]'
              }`}
            >
              About
            </a>
          </nav>

          {/* Search, Language, Mobile Toggle */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              id="global-search-btn"
              type="button"
              onClick={onOpenSearch}
              className="w-10 h-10 sm:w-auto sm:h-auto flex items-center justify-center sm:space-x-2 px-0 sm:px-3.5 py-0 sm:py-2 rounded-xl text-xs font-semibold text-[#475569] bg-white hover:bg-[#EEF2F6] active:scale-95 border border-[#CBD5E1] transition-all cursor-pointer whitespace-nowrap shrink-0"
              aria-label="Search Tools (Cmd+K)"
            >
              <Search className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span className="hidden sm:inline">{t.searchPlaceholder}</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#F7F9FC] border border-[#CBD5E1] rounded text-[#475569]">
                ⌘K
              </kbd>
            </button>

            <div className="relative hidden md:block">
              <button
                id="lang-selector-btn"
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="p-2 text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF2F6] rounded-xl transition-colors flex items-center space-x-1 text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                title="Change Language"
                aria-expanded={langMenuOpen}
              >
                <Globe className="w-4 h-4" />
                <span className="uppercase">{selectedLanguage}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-2xl border border-[#CBD5E1] p-1.5 shadow-xl z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-xl font-medium transition-colors cursor-pointer ${
                        selectedLanguage === l.code
                          ? 'bg-[#F7F9FC] text-[#2563EB] font-bold'
                          : 'text-[#0F172A] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              id="mobile-menu-toggle-btn"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center text-[#0F172A] hover:bg-[#EEF2F6] active:scale-95 rounded-xl border border-[#CBD5E1] bg-white transition-all cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="fixed inset-x-0 top-16 bottom-0 z-50 md:hidden flex flex-col justify-between overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-[#0B1120]/30 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full h-full bg-[#F7F9FC] overflow-y-auto border-t border-[#CBD5E1] shadow-2xl flex flex-col justify-between">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#475569] px-1">Browse Categories</div>

                {/* PDF Tools Accordion */}
                <div className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleMobileAccordion('pdf')}
                    className="w-full min-h-[48px] px-4 py-3 text-left flex items-center justify-between text-sm font-bold text-[#0F172A] cursor-pointer"
                  >
                    <span>PDF Tools</span>
                    <ChevronRight
                      className={`w-4 h-4 text-[#475569] transition-transform ${
                        openMobileAccordion === 'pdf' ? 'rotate-90 text-[#2563EB]' : ''
                      }`}
                    />
                  </button>
                  {openMobileAccordion === 'pdf' && (
                    <div className="border-t border-[#CBD5E1] bg-[#F7F9FC]/60 px-2 py-1 space-y-0.5">
                      {[
                        { slug: 'pdf-tools', label: 'All PDF Tools' },
                        { slug: 'pdf-to-word', label: 'PDF to Word' },
                        { slug: 'word-to-pdf', label: 'Word to PDF' },
                        { slug: 'merge-pdf', label: 'Merge PDF' },
                        { slug: 'split-pdf', label: 'Split PDF' },
                        { slug: 'compress-pdf', label: 'Compress PDF' },
                        { slug: 'rotate-pdf', label: 'Rotate PDF' },
                        { slug: 'add-page-numbers', label: 'Add Page Numbers' },
                        { slug: 'watermark-pdf', label: 'Watermark PDF' },
                      ].map((item) => (
                        <a
                          key={item.slug}
                          href={`/${item.slug}`}
                          onClick={(e) => handleLinkClick(e, item.slug)}
                          className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] rounded-xl"
                        >
                          <span>{item.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#475569]" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Image Tools Accordion */}
                <div className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleMobileAccordion('image')}
                    className="w-full min-h-[48px] px-4 py-3 text-left flex items-center justify-between text-sm font-bold text-[#0F172A] cursor-pointer"
                  >
                    <span>Image Tools</span>
                    <ChevronRight
                      className={`w-4 h-4 text-[#475569] transition-transform ${
                        openMobileAccordion === 'image' ? 'rotate-90 text-[#2563EB]' : ''
                      }`}
                    />
                  </button>
                  {openMobileAccordion === 'image' && (
                    <div className="border-t border-[#CBD5E1] bg-[#F7F9FC]/60 px-2 py-1 space-y-0.5">
                      {[
                        { slug: 'image-tools', label: 'All Image Tools' },
                        { slug: 'image-converter', label: 'Image Converter' },
                        { slug: 'resize-image', label: 'Resize Image' },
                        { slug: 'compress-image', label: 'Compress Image' },
                        { slug: 'jpg-to-png', label: 'JPG to PNG' },
                        { slug: 'heic-to-jpg', label: 'HEIC to JPG' },
                      ].map((item) => (
                        <a
                          key={item.slug}
                          href={`/${item.slug}`}
                          onClick={(e) => handleLinkClick(e, item.slug)}
                          className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] rounded-xl"
                        >
                          <span>{item.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#475569]" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Media & Utilities Links */}
                <div className="bg-white rounded-2xl border border-[#CBD5E1] p-1.5 divide-y divide-[#CBD5E1]/60">
                  {[
                    { slug: 'video-tools', label: 'Video Tools' },
                    { slug: 'audio-tools', label: 'Audio Tools' },
                    { slug: 'document-tools', label: 'Document Tools' },
                    { slug: 'file-utilities', label: 'Other Utilities' },
                  ].map((item) => (
                    <a
                      key={item.slug}
                      href={`/${item.slug}`}
                      onClick={(e) => handleLinkClick(e, item.slug)}
                      className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-xs font-bold text-[#0F172A] hover:text-[#2563EB] rounded-xl"
                    >
                      <span className="flex items-center gap-2">
                        <span>{item.label}</span>
                        {!FEATURES.mediaToolsEnabled && isToolDisabled(item.slug) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#EEF2F6] text-[#475569]">
                            Paused
                          </span>
                        )}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0D9488]" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="pt-2">
                <div className="text-xs font-bold text-[#475569] px-1 mb-2">Language</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setMobileMenuOpen(false);
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                        selectedLanguage === l.code
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-white text-[#0F172A] border-[#CBD5E1]'
                      }`}
                    >
                      <span>{l.label}</span>
                      {selectedLanguage === l.code && <Check className="w-3.5 h-3.5 text-[#38BDF8] ml-0.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#CBD5E1] bg-white space-y-2.5 text-center">
              <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-[#0D9488]">
                <ShieldCheck className="w-4 h-4" />
                <span>Browser-First &amp; Ephemeral Processing</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#475569]">
                <a href="/about" onClick={(e) => handleLinkClick(e, 'about')} className="hover:text-[#2563EB] font-semibold">About</a>
                <span aria-hidden="true">·</span>
                <a href="/faq" onClick={(e) => handleLinkClick(e, 'faq')} className="hover:text-[#2563EB] font-semibold">FAQ</a>
                <span aria-hidden="true">·</span>
                <a href="/security" onClick={(e) => handleLinkClick(e, 'security')} className="hover:text-[#2563EB] font-semibold">Security</a>
                <span aria-hidden="true">·</span>
                <a href="/privacy-policy" onClick={(e) => handleLinkClick(e, 'privacy-policy')} className="hover:text-[#2563EB] font-semibold">Privacy</a>
                <span aria-hidden="true">·</span>
                <a href="/contact" onClick={(e) => handleLinkClick(e, 'contact')} className="hover:text-[#2563EB] font-semibold">Contact</a>
              </div>
              <p className="text-[11px] text-[#475569]">© 2026 {BRAND.name}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
