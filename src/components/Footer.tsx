import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { BRAND } from '../config/brand';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, route: string) => {
    e.preventDefault();
    onNavigate(route);
  };

  return (
    <footer className="bg-[#0B1120] text-[#CBD5E1] text-sm border-t border-[#1E293B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <a
              href="/"
              onClick={(e) => handleLinkClick(e, '/')}
              className="inline-flex items-center text-left focus:outline-none group"
              aria-label={`${BRAND.name} Homepage`}
            >
              <BrandLogo variant="full" tone="dark" showTagline />
            </a>

            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-sm leading-relaxed">
              {BRAND.tagline} Convert, compress, edit, and organize PDFs, images, and documents free online with no accounts or subscriptions.
            </p>

            <div className="flex items-center space-x-2 text-xs text-[#2DD4BF] font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Free to use · Privacy-conscious browser tools</span>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Support:{' '}
              <a
                href={`mailto:${BRAND.legal.contactEmail}`}
                className="text-[#38BDF8] hover:underline font-medium"
              >
                {BRAND.legal.contactEmail}
              </a>
            </p>
          </div>

          {/* Section 1: Tools */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Tools</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="/pdf-tools" onClick={(e) => handleLinkClick(e, 'pdf-tools')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  PDF Tools
                </a>
              </li>
              <li>
                <a href="/image-tools" onClick={(e) => handleLinkClick(e, 'image-tools')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Image Tools
                </a>
              </li>
              <li>
                <a href="/document-tools" onClick={(e) => handleLinkClick(e, 'document-tools')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Document Tools
                </a>
              </li>
              <li>
                <a href="/video-tools" onClick={(e) => handleLinkClick(e, 'video-tools')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Video Tools
                </a>
              </li>
              <li>
                <a href="/audio-tools" onClick={(e) => handleLinkClick(e, 'audio-tools')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Audio Tools
                </a>
              </li>
            </ul>
          </div>

          {/* Section 2: Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Company</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="/about" onClick={(e) => handleLinkClick(e, 'about')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" onClick={(e) => handleLinkClick(e, 'contact')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/file-utilities" onClick={(e) => handleLinkClick(e, 'file-utilities')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Other Utilities
                </a>
              </li>
              <li>
                <a href="/sitemap.xml" className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>

          {/* Section 3: Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Support</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="/faq" onClick={(e) => handleLinkClick(e, 'faq')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/security" onClick={(e) => handleLinkClick(e, 'security')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  File Security
                </a>
              </li>
              <li>
                <a href="/accessibility" onClick={(e) => handleLinkClick(e, 'accessibility')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Accessibility
                </a>
              </li>
            </ul>
          </div>

          {/* Section 4: Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Legal</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="/privacy-policy" onClick={(e) => handleLinkClick(e, 'privacy-policy')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" onClick={(e) => handleLinkClick(e, 'terms')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/cookies" onClick={(e) => handleLinkClick(e, 'cookies')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="/disclaimer" onClick={(e) => handleLinkClick(e, 'disclaimer')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Disclaimer
                </a>
              </li>
              <li>
                <a href="/copyright-policy" onClick={(e) => handleLinkClick(e, 'copyright-policy')} className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
                  Copyright Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <p>
            © 2026 {BRAND.name} ({BRAND.domain}) · {BRAND.legal.jurisdiction}.
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <a href="/privacy-policy" onClick={(e) => handleLinkClick(e, 'privacy-policy')} className="hover:text-white transition-colors">
              Privacy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/terms" onClick={(e) => handleLinkClick(e, 'terms')} className="hover:text-white transition-colors">
              Terms
            </a>
            <span aria-hidden="true">·</span>
            <a href="/cookies" onClick={(e) => handleLinkClick(e, 'cookies')} className="hover:text-white transition-colors">
              Cookies
            </a>
            <span aria-hidden="true">·</span>
            <a href="/disclaimer" onClick={(e) => handleLinkClick(e, 'disclaimer')} className="hover:text-white transition-colors">
              Disclaimer
            </a>
            <span aria-hidden="true">·</span>
            <a href="/accessibility" onClick={(e) => handleLinkClick(e, 'accessibility')} className="hover:text-white transition-colors">
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
