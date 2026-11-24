import { useEffect } from 'react';
import {
  ConverterSeoConfig,
  StaticPageSeoConfig,
  DOMAIN_URL,
  generateStructuredData,
} from '../data/seoData';
import { BRAND } from '../config/brand';
import { FEATURES, isToolDisabled } from '../config/features';
import { trackPageView } from './analytics';

export function useSeo(
  seoConfig?: ConverterSeoConfig | null,
  isHome?: boolean,
  is404?: boolean,
  staticPageConfig?: StaticPageSeoConfig | null
) {
  useEffect(() => {
    if (!seoConfig && !isHome && !is404 && !staticPageConfig) {
      return;
    }

    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : DOMAIN_URL;

    let title = `${BRAND.name} — Free Online PDF, Image & File Tools`;
    let description =
      'Free online tools to convert, compress, merge, split, and resize PDFs, images, and documents directly in your browser. No account or subscription required.';
    let canonicalPath = '/';
    let canonical = `${origin}/`;
    let ogTitle = title;
    let ogDesc = description;
    let jsonLdData: object[] | null = null;
    let shouldNoIndex = Boolean(is404);

    if (is404) {
      title = `Page Not Found (404) — ${BRAND.name}`;
      description =
        `The requested tool or page could not be found. Explore file converters and utilities on ${BRAND.name}.`;
      canonicalPath = '/404';
      canonical = `${origin}/404`;
      ogTitle = title;
      ogDesc = description;
    } else if (seoConfig) {
      title = seoConfig.pageTitle;
      description = seoConfig.metaDescription;
      canonicalPath = `/${seoConfig.slug}`;
      canonical = `${origin}/${seoConfig.slug}`;
      ogTitle = seoConfig.ogTitle;
      ogDesc = seoConfig.ogDescription;
      shouldNoIndex = isToolDisabled(seoConfig.slug, seoConfig.category);
      const baseSchemas = generateStructuredData({
        ...seoConfig,
        canonicalUrl: canonical,
      });
      const howToSchema =
        seoConfig.howToSteps && seoConfig.howToSteps.length > 0
          ? {
              '@context': 'https://schema.org',
              '@type': 'HowTo',
              name: `How to use ${seoConfig.h1}`,
              description: seoConfig.intro,
              step: seoConfig.howToSteps.map((text, idx) => ({
                '@type': 'HowToStep',
                position: idx + 1,
                text,
              })),
            }
          : null;
      jsonLdData = howToSchema ? [...baseSchemas, howToSchema] : baseSchemas;
    } else if (staticPageConfig) {
      title = staticPageConfig.pageTitle;
      description = staticPageConfig.metaDescription;
      canonicalPath = `/${staticPageConfig.slug}`;
      canonical = `${origin}/${staticPageConfig.slug}`;
      ogTitle = staticPageConfig.ogTitle;
      ogDesc = staticPageConfig.ogDescription;
      shouldNoIndex = isToolDisabled(staticPageConfig.slug);
      jsonLdData = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: title,
          url: canonical,
          description,
        },
      ];
    } else if (isHome) {
      jsonLdData = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: BRAND.name,
          url: `${origin}/`,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'All',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description,
        },
      ];
    }

    document.title = title;

    const setMeta = (selector: string, attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const ogImageUrl = seoConfig?.ogImage
      ? seoConfig.ogImage.startsWith('http')
        ? seoConfig.ogImage
        : `${origin}${seoConfig.ogImage.startsWith('/') ? '' : '/'}${seoConfig.ogImage}`
      : `${origin}/fylovanta-og.png`;

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      shouldNoIndex ? 'noindex, follow' : 'index, follow'
    );
    setMeta('meta[property="og:title"]', 'property', 'og:title', ogTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', ogDesc);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', BRAND.name);
    setMeta('meta[property="og:image"]', 'property', 'og:image', ogImageUrl);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', ogTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', ogDesc);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImageUrl);

    if (FEATURES.gscVerification) {
      setMeta(
        'meta[name="google-site-verification"]',
        'name',
        'google-site-verification',
        FEATURES.gscVerification
      );
    }

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    const existingScript = document.getElementById('fylovanta-jsonld-schema');
    if (existingScript) {
      existingScript.remove();
    }

    if (jsonLdData && jsonLdData.length > 0) {
      const script = document.createElement('script');
      script.id = 'fylovanta-jsonld-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLdData);
      document.head.appendChild(script);
    }

    trackPageView(canonicalPath, title);
  }, [seoConfig, isHome, is404, staticPageConfig]);
}
