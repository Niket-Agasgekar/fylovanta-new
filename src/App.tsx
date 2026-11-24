import React, { useState, useEffect, useCallback, Suspense, lazy, Component, type ErrorInfo, type ReactNode } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { DedicatedToolView } from './components/DedicatedToolView';
import { PopularConverters } from './components/PopularConverters';
import { CategorySection } from './components/CategorySection';
import { HowItWorks } from './components/HowItWorks';
import { PrivacyTrustSection } from './components/PrivacyTrustSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { AdSlot } from './components/AdSlot';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { ALL_TOOLS, CATEGORY_LANDING_PAGES } from './data/toolsData';
import { useSeo } from './utils/useSeo';
import { getTranslations } from './utils/i18n';
import { FEATURES, isToolDisabled } from './config/features';
import {
  getSavedLanguage,
  saveLanguagePreference,
} from './utils/consent';
import { trackToolSearch } from './utils/analytics';
import { LegalPageSlug } from './types';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

class RouteErrorBoundary extends Component<
  { children: ReactNode; resetKey: string; onReturnHome: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; resetKey: string; onReturnHome: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Handled by fallback UI
  }

  componentDidUpdate(prevProps: { resetKey: string }): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <h2 className="text-xl font-bold text-[#0F172A]">
            Could not load this view right now
          </h2>
          <p className="text-sm text-[#475569]">
            A temporary network interruption prevented loading this page module. Please retry or return to the homepage.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReturnHome();
              }}
              className="px-4 py-2 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#2563EB] text-[#0F172A] text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const CategoryLandingView = lazyWithRetry(() =>
  import('./components/CategoryLandingView').then((m) => ({ default: m.CategoryLandingView }))
);
const LegalPages = lazyWithRetry(() =>
  import('./components/LegalPages').then((m) => ({ default: m.LegalPages }))
);
const NotFoundView = lazyWithRetry(() =>
  import('./components/NotFoundView').then((m) => ({ default: m.NotFoundView }))
);

const LEGAL_SLUGS: LegalPageSlug[] = [
  'privacy-policy',
  'terms',
  'cookies',
  'security',
  'about',
  'contact',
  'disclaimer',
  'copyright-policy',
  'accessibility',
  'faq',
];

const HERO_QUICK_LINKS = [
  { label: 'PDF to Word', slug: 'pdf-to-word' },
  { label: 'Merge PDF', slug: 'merge-pdf' },
  { label: 'Compress PDF', slug: 'compress-pdf' },
  { label: 'JPG to PDF', slug: 'jpg-to-pdf' },
  { label: 'Resize Image', slug: 'resize-image' },
  { label: 'Compress Image', slug: 'compress-image' },
  FEATURES.mediaToolsEnabled
    ? { label: 'MP4 to MP3', slug: 'mp4-to-mp3' }
    : { label: 'JPG to PNG', slug: 'jpg-to-png' },
  { label: 'PDF Tools', slug: 'pdf-tools' },
  { label: 'Image Tools', slug: 'image-tools' },
];

export default function App() {
  const getInitialPath = () => {
    if (window.location.pathname && window.location.pathname !== '/') {
      return window.location.pathname;
    }
    if (window.location.hash) {
      return window.location.hash.replace(/^#/, '');
    }
    return '/';
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getInitialPath);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [heroSearchQuery, setHeroSearchQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => getSavedLanguage());

  const handleSelectLanguage = useCallback((lang: string) => {
    setSelectedLanguage(lang);
    saveLanguagePreference(lang);
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      let path = window.location.pathname || '/';
      if (path === '/' && window.location.hash) {
        path = window.location.hash.replace(/^#/, '');
      }
      setCurrentRoute(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = useCallback((route: string) => {
    let cleanRoute = route.trim();
    if (!cleanRoute.startsWith('/')) {
      cleanRoute = `/${cleanRoute}`;
    }
    if (cleanRoute.length > 1 && cleanRoute.endsWith('/')) {
      cleanRoute = cleanRoute.slice(0, -1);
    }

    try {
      window.history.pushState({}, '', cleanRoute);
    } catch {
      window.location.hash = cleanRoute;
    }

    setCurrentRoute(cleanRoute);
    setHeroSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const currentSlug = currentRoute.replace(/^\//, '').toLowerCase();
  const isHome = currentRoute === '/' || currentSlug === '';
  const activeTool = ALL_TOOLS.find(
    (t) => t.slug.toLowerCase() === currentSlug || t.id.toLowerCase() === currentSlug
  );
  const activeCategoryPage = CATEGORY_LANDING_PAGES.find((c) => c.slug === currentSlug);
  const activeLegalPage = LEGAL_SLUGS.find((s) => s === currentSlug);
  const is404 = !isHome && !activeTool && !activeCategoryPage && !activeLegalPage;

  // Apply Home / 404 SEO (tool, category & legal views manage their own specialized SEO)
  useSeo(null, isHome, is404);

  const t = getTranslations(selectedLanguage);

  const normalizedHeroQuery = heroSearchQuery.trim().toLowerCase();
  const heroSearchMatches = normalizedHeroQuery
    ? ALL_TOOLS.filter(
        (tool) =>
          tool.title.toLowerCase().includes(normalizedHeroQuery) ||
          tool.description.toLowerCase().includes(normalizedHeroQuery) ||
          tool.slug.toLowerCase().includes(normalizedHeroQuery)
      )
        .sort(
          (a, b) =>
            Number(isToolDisabled(a.slug, a.category)) -
            Number(isToolDisabled(b.slug, b.category))
        )
        .slice(0, 6)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-[#0F172A] selection:bg-[#2563EB] selection:text-white font-sans antialiased">
      {/* Global Header */}
      <Header
        onNavigate={navigateTo}
        currentRoute={currentRoute}
        onOpenSearch={() => setSearchOpen(true)}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={handleSelectLanguage}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!isHome ? (
          <RouteErrorBoundary
            resetKey={currentRoute}
            onReturnHome={() => navigateTo('/')}
          >
            <Suspense
              fallback={
                <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm font-semibold text-[#475569]">
                  Loading workspace...
                </div>
              }
            >
              {activeTool ? (
                <DedicatedToolView
                  tool={activeTool}
                  onNavigateHome={() => navigateTo('/')}
                  onSelectTool={(slug) => navigateTo(slug)}
                />
              ) : activeCategoryPage ? (
                <CategoryLandingView
                  categoryConfig={activeCategoryPage}
                  onNavigate={navigateTo}
                />
              ) : activeLegalPage ? (
                <LegalPages slug={activeLegalPage} onNavigate={navigateTo} />
              ) : (
                <NotFoundView
                  onNavigate={navigateTo}
                  onOpenSearch={() => setSearchOpen(true)}
                />
              )}
            </Suspense>
          </RouteErrorBoundary>
        ) : (
          <>
            {/* Hero Section */}
            <section className="relative pt-6 pb-8 sm:pt-14 sm:pb-16 md:pt-16 md:pb-18 overflow-hidden bg-[#F7F9FC]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Hero Header */}
                <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 space-y-3 sm:space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
                    Free to Use · No Subscription Required · Privacy-Conscious Handling
                  </p>

                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.08]">
                    {t.heroTitleStart}{' '}
                    <span className="text-[#2563EB]">{t.heroTitleAccent}</span>
                  </h1>

                  <p className="text-xs sm:text-base md:text-lg text-[#475569] font-medium max-w-2xl mx-auto leading-relaxed">
                    {t.heroSubtitle}
                  </p>

                  {/* Prominent Inline Tool Search Bar */}
                  <div className="max-w-xl mx-auto pt-2 relative text-left">
                    <div className="flex items-center bg-white border border-[#CBD5E1] focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/15 rounded-2xl px-3.5 py-2.5 shadow-2xs transition-all">
                      <Search className="w-4 h-4 text-[#2563EB] mr-2.5 shrink-0" />
                      <input
                        type="text"
                        value={heroSearchQuery}
                        onChange={(e) => setHeroSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && heroSearchMatches.length > 0) {
                            trackToolSearch(
                              normalizedHeroQuery.length,
                              heroSearchMatches.length,
                              'hero'
                            );
                            navigateTo(heroSearchMatches[0].slug);
                          }
                        }}
                        placeholder="Find a tool (e.g. PDF to Word, Merge PDF, Resize Image)..."
                        aria-label="Search Fylovanta tools"
                        className="w-full text-xs sm:text-sm bg-transparent border-none outline-hidden text-[#0F172A] placeholder:text-[#475569]"
                      />
                      <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className="hidden sm:inline-flex items-center px-2 py-1 text-[11px] font-mono-tabular font-bold text-[#475569] bg-[#F7F9FC] border border-[#CBD5E1] rounded-lg hover:border-[#2563EB] cursor-pointer shrink-0 ml-2"
                      >
                        ⌘K
                      </button>
                    </div>

                    {heroSearchMatches.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#CBD5E1] rounded-2xl shadow-xl z-30 divide-y divide-[#EEF2F6] overflow-hidden">
                        {heroSearchMatches.map((match) => {
                          const disabled = isToolDisabled(match.slug, match.category);
                          return (
                            <a
                              key={match.id}
                              href={`/${match.slug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                trackToolSearch(
                                  normalizedHeroQuery.length,
                                  heroSearchMatches.length,
                                  'hero'
                                );
                                navigateTo(match.slug);
                              }}
                              className="flex items-center justify-between px-4 py-2.5 hover:bg-[#F7F9FC] transition-colors"
                            >
                              <div className="min-w-0 pr-3">
                                <div className="text-xs sm:text-sm font-bold text-[#0F172A] truncate">
                                  {match.title}
                                  {disabled && (
                                    <span className="ml-2 text-[11px] font-semibold text-[#475569]">
                                      · Unavailable
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#475569] truncate">
                                  {match.description}
                                </div>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quick-Access Links */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {HERO_QUICK_LINKS.map((link) => (
                      <a
                        key={link.slug}
                        href={`/${link.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigateTo(link.slug);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-[#EEF2F6] border border-[#CBD5E1] hover:border-[#2563EB] rounded-xl text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Main Conversion Workspace */}
                <div className="max-w-3xl mx-auto">
                  <FileUploader
                    title={t.dropTitle}
                    subtitle={t.dropSubtitle}
                    browseLabel={t.browseFiles}
                  />
                </div>
              </div>
            </section>

            {/* Policy-compliant Top AdSense Unit */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AdSlot variant="leaderboard" slotKey="top" className="my-2" />
            </div>

            {/* Popular Converters Section */}
            <PopularConverters
              onSelectTool={navigateTo}
              selectedLanguage={selectedLanguage}
            />

            {/* All Categories Section */}
            <CategorySection
              onSelectTool={navigateTo}
              selectedLanguage={selectedLanguage}
            />

            {/* How It Works */}
            <HowItWorks selectedLanguage={selectedLanguage} />

            {/* Mid-Page In-Article AdSense Unit */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              <AdSlot variant="in-article" slotKey="mid" />
            </div>

            {/* Privacy & Trust Guarantee */}
            <PrivacyTrustSection selectedLanguage={selectedLanguage} />

            {/* FAQ Section */}
            <FAQSection selectedLanguage={selectedLanguage} />
          </>
        )}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Global Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectTool={navigateTo}
      />

      {/* GDPR / CCPA Cookie Consent Notice */}
      <CookieConsentBanner onNavigate={navigateTo} />
    </div>
  );
}
