import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Send,
  Loader2,
  AlertCircle,
  Lock,
  Cpu,
  Server,
  Trash2,
  Cookie,
  FileCheck2,
  Scale,
  Info,
  Mail,
  AlertTriangle,
  FileWarning,
  Accessibility,
  HelpCircle,
  ChevronDown,
  Search,
  RefreshCw,
} from 'lucide-react';
import { LegalPageSlug } from '../types';
import { getStaticPageSeoConfig } from '../data/seoData';
import { FAQS } from '../data/toolsData';
import { useSeo } from '../utils/useSeo';
import { isAdSenseEnabled } from '../config/adsense';
import { BRAND } from '../config/brand';
import { FEATURES } from '../config/features';
import {
  getConsentPreference,
  getConsentTimestamp,
  saveConsentPreference,
  STORAGE_KEYS,
} from '../utils/consent';

interface LegalPagesProps {
  slug: LegalPageSlug;
  onNavigate: (route: string) => void;
}

const LEGAL_NAV_ITEMS: Array<{ slug: LegalPageSlug; label: string }> = [
  { slug: 'about', label: `About ${BRAND.name}` },
  { slug: 'faq', label: 'FAQ' },
  { slug: 'security', label: 'Trust & Security' },
  { slug: 'privacy-policy', label: 'Privacy Policy' },
  { slug: 'terms', label: 'Terms of Service' },
  { slug: 'cookies', label: 'Cookie Policy' },
  { slug: 'disclaimer', label: 'Disclaimer' },
  { slug: 'copyright-policy', label: 'Copyright' },
  { slug: 'accessibility', label: 'Accessibility' },
  { slug: 'contact', label: 'Contact' },
];

export const LegalPages: React.FC<LegalPagesProps> = ({ slug, onNavigate }) => {
  const staticSeo = getStaticPageSeoConfig(slug);
  useSeo(null, false, false, staticSeo);

  const adSenseActive = isAdSenseEnabled();

  const [consentPref, setConsentPref] = useState<'all' | 'essential'>(() =>
    getConsentPreference()
  );
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(() =>
    getConsentTimestamp()
  );
  const [consentSaved, setConsentSaved] = useState(false);

  // FAQ search/accordion state (for /faq page)
  const [faqQuery, setFaqQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Contact form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Support');
  const [message, setMessage] = useState('');
  const [companyHoneypot, setCompanyHoneypot] = useState('');
  const [formStartedAt, setFormStartedAt] = useState<number>(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contactResult, setContactResult] = useState<{
    referenceId: string;
    messageText: string;
  } | null>(null);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();
    onNavigate(target);
  };

  const handleSaveConsent = (pref: 'all' | 'essential') => {
    const ts = saveConsentPreference(pref);
    setConsentPref(pref);
    setConsentTimestamp(ts);
    setConsentSaved(true);
    setTimeout(() => setConsentSaved(false), 3000);
  };

  const submitContactMessage = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          company: companyHoneypot,
          formStartedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.emailDelivered) {
        throw new Error(
          data.error ||
            `We could not deliver your message via email right now. Please try again or email ${BRAND.legal.contactEmail} directly.`
        );
      }
      setContactResult({
        referenceId: data.referenceId,
        messageText: data.notice || 'Your inquiry has been delivered to Fylovanta support.',
      });
      setName('');
      setEmail('');
      setMessage('');
      setCompanyHoneypot('');
      setFormStartedAt(Date.now());
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : `Could not deliver your message right now. Please retry or email ${BRAND.legal.contactEmail} directly.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitContactMessage();
  };

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(faqQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqQuery.toLowerCase())
  );

  return (
    <div className="py-8 sm:py-14 bg-[#F7F9FC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-3">
          <a
            href="/"
            onClick={(e) => handleNav(e, '/')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {BRAND.name} Home</span>
          </a>

          <nav aria-label="Legal and informational pages" className="flex flex-wrap items-center gap-1.5">
            {LEGAL_NAV_ITEMS.map((item) => {
              const active = item.slug === slug;
              return (
                <a
                  key={item.slug}
                  href={`/${item.slug}`}
                  onClick={(e) => handleNav(e, item.slug)}
                  aria-current={active ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:text-[#0F172A] hover:border-[#2563EB]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        <article className="bg-white rounded-3xl border border-[#CBD5E1] p-6 sm:p-10 shadow-xs space-y-7 text-sm text-[#475569] leading-relaxed">
          {slug === 'privacy-policy' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Privacy Policy · Last Updated {BRAND.legal.lastUpdated}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Privacy Policy
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  How {BRAND.name} ({BRAND.domain}), operated by an individual / sole proprietor in{' '}
                  {BRAND.legal.jurisdiction}, handles files, usage metrics, support messages, and cookie choices.
                </p>
              </header>

              <section className="space-y-2.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  1. Who Operates This Website
                </h2>
                <p>
                  {BRAND.name} ({BRAND.domain}) is a free online file utility website operated by an individual / sole proprietor based in <strong className="text-[#0F172A]">{BRAND.legal.jurisdiction}</strong>. You can reach the site operator for privacy or support questions at{' '}
                  <a
                    href={`mailto:${BRAND.legal.contactEmail}`}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    {BRAND.legal.contactEmail}
                  </a>
                  .
                </p>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  2. How Files Are Processed
                </h2>
                <p>
                  {BRAND.name} is designed so common everyday tools run inside your web browser rather than uploading your documents to a cloud drive:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>
                    <strong className="text-[#0F172A]">Browser-Based Tools:</strong> Active image tools (JPG, PNG, WebP, BMP, ICO, GIF, SVG, and image resizing/compression), active PDF tools (merge, split, rotate, page numbers, watermarks, compression, page-to-image, and image-to-PDF), and document/data utilities (DOCX extraction/export, CSV, JSON, Markdown, and plain text) process files directly on your device inside browser memory.
                  </li>
                  <li>
                    <strong className="text-[#0F172A]">Optional Server Fallbacks:</strong> Resource-heavy server tools (FFmpeg audio/video transcoding and ImageMagick/Ghostscript format fallbacks) are currently <strong>{FEATURES.mediaToolsEnabled || FEATURES.serverFallbacksEnabled ? 'enabled' : 'disabled'}</strong> on this deployment. If an optional server conversion endpoint is ever enabled and used, uploaded files are handled only in a temporary single-request folder on the server and removed automatically once the request finishes.
                  </li>
                  <li>
                    <strong className="text-[#0F172A]">No File Accounts or Cloud Libraries:</strong> {BRAND.name} does not require registration and does not keep a personal archive or database of your uploaded filenames or file contents.
                  </li>
                </ul>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  3. Information We Collect
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>
                    <strong className="text-[#0F172A]">Optional Analytics (Consent-Based Google Analytics 4):</strong> If Google Analytics 4 is configured and you click &ldquo;Accept All&rdquo; in our cookie banner, Google Analytics records standard page-view and tool-interaction statistics without receiving filenames or file payloads. If you choose &ldquo;Essential Only&rdquo;, optional analytics scripts are not loaded.
                  </li>
                  <li>
                    <strong className="text-[#0F172A]">Contact Inquiries (Email Only):</strong> If you send a message through the Contact form or by email, your name, email address, topic, and message are validated on our server and forwarded directly by email (via Resend) to {BRAND.legal.contactEmail} so we can reply. {BRAND.name} does not store contact form submissions in a database.
                  </li>
                  <li>
                    <strong className="text-[#0F172A]">Local Browser Preferences:</strong> Your browser stores only small preference keys in <code className="font-mono-tabular text-[#0F172A]">localStorage</code> for your chosen display language (<code className="font-mono-tabular text-[#0F172A]">{STORAGE_KEYS.language}</code>) and your cookie choice and timestamp (<code className="font-mono-tabular text-[#0F172A]">{STORAGE_KEYS.consent}</code>). Fonts (Plus Jakarta Sans and JetBrains Mono) are loaded from Google Fonts.
                  </li>
                </ul>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  4. Future Advertising &amp; Google AdSense (Currently {adSenseActive ? 'Enabled' : 'Disabled'})
                </h2>
                <p>
                  {BRAND.name} provides its tools free of charge without paid subscriptions. To help cover future hosting and maintenance costs, the site includes optional support for Google AdSense. At present, Google AdSense is <strong>{adSenseActive ? 'active' : 'disabled by default'}</strong>, meaning no advertising scripts (<code className="font-mono-tabular text-[#0F172A]">adsbygoogle.js</code>) or ad cookies are loaded while it remains turned off.
                </p>
                <p>
                  If advertising is enabled in the future, selecting &ldquo;Essential Only&rdquo; on the{' '}
                  <a
                    href="/cookies"
                    onClick={(e) => handleNav(e, 'cookies')}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    Cookie Policy
                  </a>{' '}
                  page sets non-personalized ad mode (<code className="font-mono-tabular text-[#0F172A]">requestNonPersonalizedAds = 1</code>). Visitors may also adjust Google ad personalization settings at{' '}
                  <a
                    href="https://www.google.com/settings/ads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    Google Ads Settings
                  </a>
                  .
                </p>
              </section>

              <section className="space-y-2.5">
                <h2 className="text-base font-bold text-[#0F172A]">
                  5. Your Choices &amp; Contacting Us
                </h2>
                <p>
                  You can clear saved browser preferences anytime in your browser settings, update cookie preferences on our Cookie Policy page, or contact{' '}
                  <a
                    href={`mailto:${BRAND.legal.contactEmail}`}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    {BRAND.legal.contactEmail}
                  </a>{' '}
                  (or via the{' '}
                  <a
                    href="/contact"
                    onClick={(e) => handleNav(e, 'contact')}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    Contact page
                  </a>
                  ) if you want us to delete a prior support inquiry or answer any question about this policy.
                </p>
              </section>
            </>
          )}

          {slug === 'cookies' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Consent &amp; Storage · Last Updated {BRAND.legal.lastUpdated}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Cookie Policy &amp; Consent Preferences
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  Plain overview of what {BRAND.name} stores in your browser and how optional analytics and future ad preferences work.
                </p>
              </header>

              <section className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-start gap-3">
                  <Cookie className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm space-y-1">
                    <p className="font-bold text-[#0F172A]">
                      Current Advertising Status: {adSenseActive ? 'Google AdSense Enabled' : 'Advertising Disabled (Essential Storage Only)'}
                    </p>
                    <p>
                      {adSenseActive
                        ? 'Google AdSense is active. Your consent choice below controls whether personalized or non-personalized ads are requested.'
                        : `Google AdSense is currently disabled. ${BRAND.name} loads zero advertising scripts or ad cookies during your visit. Your selection below governs optional Google Analytics 4 measurement (if configured) and any future ad display mode.`}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-bold text-[#0F172A]">
                  Browser Storage &amp; Cookie Inventory
                </h2>
                <div className="overflow-x-auto border border-[#CBD5E1] rounded-2xl">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#F7F9FC] border-b border-[#CBD5E1] text-[#0F172A]">
                        <th className="py-3 px-4 font-bold">Key / Category</th>
                        <th className="py-3 px-4 font-bold">Type</th>
                        <th className="py-3 px-4 font-bold">Purpose &amp; Retention</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CBD5E1]">
                      <tr>
                        <td className="py-3 px-4 font-mono-tabular font-semibold text-[#0F172A]">{STORAGE_KEYS.language}</td>
                        <td className="py-3 px-4">Essential localStorage</td>
                        <td className="py-3 px-4">Remembers your chosen interface language across page loads.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-mono-tabular font-semibold text-[#0F172A]">{STORAGE_KEYS.consent}</td>
                        <td className="py-3 px-4">Essential localStorage</td>
                        <td className="py-3 px-4">Stores your consent selection (&ldquo;essential&rdquo; or &ldquo;all&rdquo;) and timestamp.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">Session Object URLs</td>
                        <td className="py-3 px-4">In-Memory Only</td>
                        <td className="py-3 px-4">Temporary browser blob links for local file previews and downloads. Cleared on removal or tab close.</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">Google Analytics 4 (Optional)</td>
                        <td className="py-3 px-4">Consent-Gated Analytics</td>
                        <td className="py-3 px-4">
                          Only loads if a GA4 measurement ID is configured and you select &ldquo;Accept All&rdquo;. Does not receive filenames or file contents.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-semibold text-[#0F172A]">Google AdSense (Optional)</td>
                        <td className="py-3 px-4">Future Advertising Cookie</td>
                        <td className="py-3 px-4">
                          Disabled by default. If activated in the future, serves standard ads under &ldquo;Accept All&rdquo; or non-personalized ads (<code className="font-mono-tabular">requestNonPersonalizedAds=1</code>) under &ldquo;Essential Only&rdquo;.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="bg-[#F7F9FC] border border-[#CBD5E1] rounded-2xl p-5 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-[#0F172A]">Manage Your Consent Preference</h2>
                  {consentTimestamp && (
                    <p className="text-xs text-[#475569]">
                      Last saved preference: <span className="font-bold text-[#0F172A]">{consentPref === 'all' ? 'Accept All' : 'Essential Only'}</span>{' '}
                      <span className="font-mono-tabular">({consentTimestamp.split('T')[0]})</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleSaveConsent('essential')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      consentPref === 'essential'
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    Essential Only (Non-Personalized)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveConsent('all')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      consentPref === 'all'
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    Accept All
                  </button>
                </div>
                {consentSaved && (
                  <p className="text-xs font-bold text-[#16A34A] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cookie preferences saved locally.</span>
                  </p>
                )}
              </div>
            </>
          )}

          {slug === 'terms' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Terms of Service · Last Updated {BRAND.legal.lastUpdated}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Terms of Service
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  Simple, practical terms for using {BRAND.name} ({BRAND.domain}), a free online file utility website operated by an individual / sole proprietor in {BRAND.legal.jurisdiction}.
                </p>
              </header>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#2563EB]" />
                  <span>1. What {BRAND.name} Provides</span>
                </h2>
                <p>
                  {BRAND.name} offers free browser-based file tools—including image conversion and resizing, PDF merging, splitting, rotating, numbering, watermarking, compression, and common document/data utilities—without requiring user accounts or paid plans. Future site updates may display non-intrusive advertising (such as Google AdSense) to support hosting costs while keeping tools free to use.
                </p>
                <p>
                  Browser-based tools run using your device&apos;s own browser memory, so large files or heavy batches may be limited by your device or browser capabilities. Some tools (such as heavy audio and video conversion or legacy codec fallbacks) are currently paused or unavailable. Whenever optional server endpoints are enabled, usage limits apply (currently a <span className="font-mono-tabular font-semibold text-[#0F172A]">25 MB</span> default single-file cap and <span className="font-mono-tabular font-semibold text-[#0F172A]">30 requests/minute</span> per-IP rate limit).
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">2. Your Responsibilities &amp; Acceptable Use</h2>
                <p>
                  You are responsible for the files you choose to open, edit, compress, or convert on {BRAND.name}. By using the site, you agree that:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>You own the files you process or have permission from the rights holder to convert or modify them.</li>
                  <li>You will use the tools only for lawful personal, academic, or work purposes.</li>
                  <li>You will not upload harmful code, attempt to overload or disrupt the website or API routes, or use automated scraping tools against the service.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">3. File Ownership</h2>
                <p>
                  You keep full ownership and rights to every input file and converted output file you create using {BRAND.name}. The site operator claims no ownership or license over your files.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">4. Availability, Accuracy &amp; Liability</h2>
                <p>
                  {BRAND.name} is provided free of charge on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis. While we aim to keep tools accurate and reliable, formatting, fonts, or metadata in complex files can occasionally shift during conversion, and individual tools may be updated, paused, or changed over time. Always keep backup copies of important original files and check converted output before relying on it.
                </p>
                <p>
                  To the fullest extent permitted by applicable law, the site operator is not liable for indirect, incidental, or consequential losses—such as lost data or formatting differences—resulting from your use or inability to use the website.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">5. Jurisdiction &amp; Contact</h2>
                <p>
                  These terms are governed by the laws of <strong className="text-[#0F172A]">{BRAND.legal.jurisdiction}</strong>. Operator: <strong className="text-[#0F172A]">{BRAND.legal.entityName}</strong>. For questions or feedback, email{' '}
                  <a
                    href={`mailto:${BRAND.legal.contactEmail}`}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    {BRAND.legal.contactEmail}
                  </a>{' '}
                  or write through our{' '}
                  <a
                    href="/contact"
                    onClick={(e) => handleNav(e, 'contact')}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    Contact page
                  </a>
                  .
                </p>
              </section>
            </>
          )}

          {slug === 'security' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Technical Overview
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Trust &amp; Security Practices
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  How {BRAND.name} keeps core file processing inside your browser and applies practical safeguards on server routes.
                </p>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] space-y-2">
                  <div className="flex items-center gap-2 text-[#0F172A] font-bold">
                    <Cpu className="w-4 h-4 text-[#2563EB]" />
                    <span>In-Browser Processing</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Images (JPG, PNG, WebP, SVG, BMP, ICO, GIF), image resizing, PDF merges, splits, rotations, page numbering, watermarks, PDF compression, and DOCX/CSV/JSON/Markdown tools run locally inside your browser&apos;s memory without uploading files to our server.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] space-y-2">
                  <div className="flex items-center gap-2 text-[#0F172A] font-bold">
                    <Server className="w-4 h-4 text-[#0D9488]" />
                    <span>Disabled Heavy Workers</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Resource-intensive server fallbacks (FFmpeg media transcoding, ImageMagick HEIC/TIFF, Ghostscript PDF fallback) are disabled by default. When enabled on a host, requests run in temporary isolated job folders.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] space-y-2">
                  <div className="flex items-center gap-2 text-[#0F172A] font-bold">
                    <Trash2 className="w-4 h-4 text-[#16A34A]" />
                    <span>Temporary Cleanup</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Temporary browser blob URLs are released when you clear items or close the tab, and any enabled temporary server workspace is deleted when the request completes along with a periodic cleanup sweep.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] space-y-2">
                  <div className="flex items-center gap-2 text-[#0F172A] font-bold">
                    <Lock className="w-4 h-4 text-[#2563EB]" />
                    <span>Request &amp; Header Safeguards</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Filenames are sanitized, parameterized subprocess arguments avoid shell execution, and backend endpoints enforce IP rate limits and basic anti-spam checks on the contact form.
                  </p>
                </div>
              </div>

              <section className="space-y-2 pt-2">
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Practical Notes</span>
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>Standard HTTP security headers (<code className="font-mono-tabular text-[#0F172A]">X-Content-Type-Options: nosniff</code>, <code className="font-mono-tabular text-[#0F172A]">X-Frame-Options: SAMEORIGIN</code>, and <code className="font-mono-tabular text-[#0F172A]">Referrer-Policy</code>) are sent on responses.</li>
                  <li>Optional server endpoints enforce a <span className="font-mono-tabular font-semibold text-[#0F172A]">25 MB</span> default upload cap and <span className="font-mono-tabular font-semibold text-[#0F172A]">30 requests/minute</span> rate limit.</li>
                  <li>While we apply reasonable technical safeguards, no internet service or browser extension environment can guarantee absolute security.</li>
                </ul>
              </section>
            </>
          )}

          {slug === 'about' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Platform Overview
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  About {BRAND.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  {BRAND.tagline}
                </p>
              </header>

              <section className="space-y-2.5">
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#2563EB]" />
                  <span>Why {BRAND.name} Exists</span>
                </h2>
                <p>
                  Converting a PDF to Word, merging pages, compressing photos, or cleaning up CSV/JSON data should not force you to sign up for an account or pay a monthly subscription. {BRAND.name} is an independent free online file utility site operated by an individual / sole proprietor in {BRAND.legal.jurisdiction}, built to make everyday file tasks fast and straightforward in a web browser.
                </p>
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-[#F7F9FC] border border-[#CBD5E1] rounded-2xl p-4 space-y-1.5">
                  <h2 className="text-sm font-bold text-[#0F172A]">Browser-First Utilities</h2>
                  <p className="text-xs">
                    Active image converters and resizers, PDF merge/split/rotate/numbering/watermark/compression tools, DOCX utilities, and CSV/JSON/Markdown tools run locally in your browser via HTML5 Canvas, PDF.js, jsPDF, and pdf-lib.
                  </p>
                </div>
                <div className="bg-[#F7F9FC] border border-[#CBD5E1] rounded-2xl p-4 space-y-1.5">
                  <h2 className="text-sm font-bold text-[#0F172A]">Independent Operation</h2>
                  <p className="text-xs">
                    {BRAND.legal.entityName} ({BRAND.legal.jurisdiction}). Resource-heavy audio and video tools remain paused by default so core browser tools stay fast and free. Support:{' '}
                    <a href={`mailto:${BRAND.legal.contactEmail}`} className="text-[#2563EB] font-semibold underline">
                      {BRAND.legal.contactEmail}
                    </a>
                    .
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">Policies &amp; Help</h2>
                <div className="flex flex-wrap gap-3 text-xs font-bold">
                  <a href="/privacy-policy" onClick={(e) => handleNav(e, 'privacy-policy')} className="text-[#2563EB] underline hover:text-[#1D4ED8]">
                    Privacy Policy
                  </a>
                  <span aria-hidden="true">·</span>
                  <a href="/terms" onClick={(e) => handleNav(e, 'terms')} className="text-[#2563EB] underline hover:text-[#1D4ED8]">
                    Terms of Service
                  </a>
                  <span aria-hidden="true">·</span>
                  <a href="/cookies" onClick={(e) => handleNav(e, 'cookies')} className="text-[#2563EB] underline hover:text-[#1D4ED8]">
                    Cookie Policy
                  </a>
                  <span aria-hidden="true">·</span>
                  <a href="/disclaimer" onClick={(e) => handleNav(e, 'disclaimer')} className="text-[#2563EB] underline hover:text-[#1D4ED8]">
                    Disclaimer
                  </a>
                  <span aria-hidden="true">·</span>
                  <a href="/faq" onClick={(e) => handleNav(e, 'faq')} className="text-[#2563EB] underline hover:text-[#1D4ED8]">
                    FAQ
                  </a>
                  <span aria-hidden="true">·</span>
                  <a href="/contact" onClick={(e) => handleNav(e, 'contact')} className="text-[#2563EB] underline hover:text-[#1D4ED8]">
                    Contact
                  </a>
                </div>
              </section>

              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#16A34A]">
                <ShieldCheck className="w-4 h-4" />
                <span>Free to Use · No Signup · Browser-First File Handling</span>
              </div>
            </>
          )}

          {slug === 'disclaimer' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Disclaimer · Last Updated {BRAND.legal.lastUpdated}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Disclaimer
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  Important notes regarding output quality, technical limits, and general use of {BRAND.name} ({BRAND.domain}).
                </p>
              </header>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#0D9488]" />
                  <span>1. Best-Effort Tool Output</span>
                </h2>
                <p>
                  {BRAND.name} uses standard browser APIs and open-source libraries (such as PDF.js, pdf-lib, jsPDF, and docx) to convert, compress, and edit files. Because input files vary widely—especially PDFs with complex formatting, scanned pages, or custom embedded fonts—converted output is provided on a best-effort basis without guarantees of exact layout or visual perfection. Always review downloaded files and keep copies of your original files.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">2. Technical &amp; Feature Limitations</h2>
                <p>
                  Most active tools process files inside your browser memory, so large documents or batches depend on your device&apos;s hardware and browser limits. Some tools (such as audio/video conversion and server fallback codecs) are currently paused on this deployment and clearly marked unavailable.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">3. Not Professional, Legal, or Archival Advice</h2>
                <p>
                  {BRAND.name} provides everyday software utilities only. It is not a certified archiving system and does not provide legal, regulatory, financial, medical, or professional compliance advice. You remain responsible for verifying files before submitting them for official, legal, or critical business purposes.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">4. Free Access, Advertising &amp; Operator Info</h2>
                <p>
                  All active tools on {BRAND.name} are currently offered free of charge without subscriptions. Optional advertising (such as Google AdSense) may be enabled in the future to help support site hosting costs; any future third-party ads or external links do not imply endorsement by the operator.
                </p>
                <p>
                  Operated by <strong className="text-[#0F172A]">{BRAND.legal.entityName}</strong> in <strong className="text-[#0F172A]">{BRAND.legal.jurisdiction}</strong>. Contact:{' '}
                  <a href={`mailto:${BRAND.legal.contactEmail}`} className="text-[#2563EB] font-semibold underline">
                    {BRAND.legal.contactEmail}
                  </a>
                  .
                </p>
              </section>
            </>
          )}

          {slug === 'copyright-policy' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Intellectual Property · Last Updated {BRAND.legal.lastUpdated}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Copyright Policy
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  User responsibility and how to report copyright concerns on {BRAND.name}.
                </p>
              </header>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-[#2563EB]" />
                  <span>1. User Responsibility</span>
                </h2>
                <p>
                  {BRAND.name} is a self-service online file utility. By opening, converting, compressing, or editing any document or image, you confirm that you own the material or have permission from the copyright holder to work with it.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">2. No File Hosting or Public Library</h2>
                <p>
                  {BRAND.name} does not publish, index, search, or host user-submitted files. Active browser tools run on your own device, and any optional temporary server jobs are deleted automatically after completion.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">3. Reporting Copyright Concerns</h2>
                <p>
                  If you believe any page text, graphic, or asset published on {BRAND.domain} infringes your copyright under applicable laws in {BRAND.legal.jurisdiction} or elsewhere, please send details (the specific URL, description of the material, and your contact information) via our{' '}
                  <a
                    href="/contact"
                    onClick={(e) => handleNav(e, 'contact')}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    Contact page
                  </a>{' '}
                  or by email to{' '}
                  <a
                    href={`mailto:${BRAND.legal.contactEmail}`}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    {BRAND.legal.contactEmail}
                  </a>{' '}
                  ({BRAND.legal.entityName}).
                </p>
              </section>
            </>
          )}

          {slug === 'accessibility' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Accessibility · Last Updated {BRAND.legal.lastUpdated}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Accessibility Statement
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  Our ongoing effort to keep {BRAND.name}&apos;s free file tools clear and usable across keyboards, screen readers, and mobile devices.
                </p>
              </header>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <Accessibility className="w-4 h-4 text-[#2563EB]" />
                  <span>1. Usability Practices</span>
                </h2>
                <p>
                  {BRAND.name} is built with clean structure and readable typography to support visitors across desktop and mobile browsers:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                  <li>Semantic page landmarks (<code className="font-mono-tabular text-[#0F172A]">&lt;header&gt;</code>, <code className="font-mono-tabular text-[#0F172A]">&lt;main&gt;</code>, <code className="font-mono-tabular text-[#0F172A]">&lt;nav&gt;</code>, <code className="font-mono-tabular text-[#0F172A]">&lt;footer&gt;</code>) and clear heading order.</li>
                  <li>Keyboard-reachable navigation links, file browse buttons, search shortcut (<code className="font-mono-tabular text-[#0F172A]">⌘K / Ctrl+K</code>), and <code className="font-mono-tabular text-[#0F172A]">ESC</code> menu dismissal.</li>
                  <li>High-contrast text (#0F172A slate on #FFFFFF / #F7F9FC) and mobile-friendly touch targets.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-[#0F172A]">2. Feedback &amp; Help</h2>
                <p>
                  If you run into an accessibility issue on {BRAND.domain} or have a suggestion to improve usability, please email{' '}
                  <a
                    href={`mailto:${BRAND.legal.contactEmail}`}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    {BRAND.legal.contactEmail}
                  </a>{' '}
                  or reach out via our{' '}
                  <a
                    href="/contact"
                    onClick={(e) => handleNav(e, 'contact')}
                    className="text-[#2563EB] font-semibold underline hover:text-[#1D4ED8]"
                  >
                    Contact page
                  </a>
                  .
                </p>
              </section>
            </>
          )}

          {slug === 'faq' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Help Center · Technical Answers
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight flex items-center gap-2.5">
                  <HelpCircle className="w-7 h-7 text-[#2563EB] shrink-0" />
                  <span>Frequently Asked Questions</span>
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  Answers about supported formats, file limits, privacy, and how {BRAND.name} works.
                </p>
              </header>

              <div className="relative">
                <Search className="w-4 h-4 text-[#475569] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter FAQ topics (e.g. PDF, privacy, limit, browser)..."
                  value={faqQuery}
                  onChange={(e) => setFaqQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm text-[#0F172A] placeholder:text-[#475569] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="divide-y divide-[#CBD5E1] border-t border-[#CBD5E1]">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="py-3.5">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center justify-between text-left py-1.5 font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors cursor-pointer"
                      >
                        <span className="pr-4">{faq.question}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#475569] shrink-0 transition-transform ${
                            isOpen ? 'rotate-180 text-[#2563EB]' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="pt-2 pr-6 text-xs sm:text-sm text-[#475569] leading-relaxed">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {slug === 'contact' && (
            <>
              <header className="border-b border-[#CBD5E1] pb-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                  Support &amp; Feedback
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                  Contact {BRAND.name}
                </h1>
                <p className="text-xs sm:text-sm text-[#475569]">
                  Need help with a file format, want to report a conversion bug, or have a privacy inquiry? Send a message below or email directly.
                </p>
              </header>

              <div className="p-4 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-start gap-3 text-xs">
                <Mail className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    Direct Support Email:{' '}
                    <a
                      href={`mailto:${BRAND.legal.contactEmail}`}
                      className="text-[#2563EB] font-bold underline hover:text-[#1D4ED8]"
                    >
                      {BRAND.legal.contactEmail}
                    </a>
                  </p>
                  <p>
                    You can also review our{' '}
                    <a href="/privacy-policy" onClick={(e) => handleNav(e, 'privacy-policy')} className="text-[#2563EB] font-bold underline">
                      Privacy Policy
                    </a>
                    ,{' '}
                    <a href="/cookies" onClick={(e) => handleNav(e, 'cookies')} className="text-[#2563EB] font-bold underline">
                      Cookie Policy
                    </a>
                    , or{' '}
                    <a href="/security" onClick={(e) => handleNav(e, 'security')} className="text-[#2563EB] font-bold underline">
                      Trust &amp; Security
                    </a>{' '}
                    documentation anytime.
                  </p>
                </div>
              </div>

              {contactResult ? (
                <div className="bg-[#F7F9FC] border border-[#16A34A]/50 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[#16A34A]">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Message sent to Fylovanta support</span>
                  </div>
                  <p className="text-xs text-[#0F172A] leading-relaxed">
                    {contactResult.messageText} Reference ID:{' '}
                    <span className="font-mono-tabular font-bold">{contactResult.referenceId}</span>.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <a
                      href={`mailto:${BRAND.legal.contactEmail}?subject=${encodeURIComponent(`[${contactResult.referenceId}] Support Inquiry`)}`}
                      className="text-xs font-bold text-[#2563EB] underline"
                    >
                      Email {BRAND.legal.contactEmail} directly
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setContactResult(null);
                        setSubmitError(null);
                      }}
                      className="text-xs font-bold text-[#475569] hover:text-[#0F172A] underline cursor-pointer"
                    >
                      Send another message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  {/* Anti-spam honeypot field hidden off-screen */}
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="contact-company">Company</label>
                    <input
                      id="contact-company"
                      name="company"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={companyHoneypot}
                      onChange={(e) => setCompanyHoneypot(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-bold text-[#0F172A] mb-1">
                        Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        maxLength={100}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-bold text-[#0F172A] mb-1">
                        Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        maxLength={160}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-xs font-bold text-[#0F172A] mb-1">
                      Topic
                    </label>
                    <select
                      id="contact-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="General Support">General Support</option>
                      <option value="Format Request">New Format Request</option>
                      <option value="Bug Report">Bug Report</option>
                      <option value="Privacy & Legal">Privacy &amp; Legal</option>
                      <option value="Copyright & Accessibility">Copyright &amp; Accessibility</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-bold text-[#0F172A] mb-1">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      maxLength={3000}
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe how we can help..."
                      className="w-full px-3.5 py-2.5 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  {submitError && (
                    <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#DC2626]/40 text-xs text-[#DC2626] space-y-2.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                      <div className="pl-6 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            void submitContactMessage();
                          }}
                          disabled={submitting}
                          className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#0B1120] disabled:opacity-60 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {submitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          <span>{submitting ? 'Retrying...' : 'Retry Sending'}</span>
                        </button>
                        <span className="text-[#475569]">
                          or email{' '}
                          <a href={`mailto:${BRAND.legal.contactEmail}`} className="text-[#2563EB] font-bold underline">
                            {BRAND.legal.contactEmail}
                          </a>{' '}
                          directly.
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-[#38BDF8]" />}
                    <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                  </button>
                </form>
              )}
            </>
          )}
        </article>
      </div>
    </div>
  );
};
