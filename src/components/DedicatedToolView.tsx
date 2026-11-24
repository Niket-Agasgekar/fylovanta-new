import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  Zap,
  ChevronDown,
  ArrowUpRight,
  Lock,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { ToolDefinition } from '../types';
import { ALL_TOOLS } from '../data/toolsData';
import { getSeoConfig } from '../data/seoData';
import { useSeo } from '../utils/useSeo';
import { FileUploader } from './FileUploader';
import { AdSlot } from './AdSlot';
import { BRAND } from '../config/brand';
import { isToolDisabled } from '../config/features';
import { trackToolView } from '../utils/analytics';

interface DedicatedToolViewProps {
  tool: ToolDefinition;
  onNavigateHome: () => void;
  onSelectTool: (slug: string) => void;
}

const CATEGORY_ROUTE_MAP: Record<string, { slug: string; label: string }> = {
  pdf: { slug: 'pdf-tools', label: 'PDF Tools' },
  utility: { slug: 'pdf-tools', label: 'PDF Tools' },
  image: { slug: 'image-tools', label: 'Image Tools' },
  video: { slug: 'video-tools', label: 'Video Tools' },
  audio: { slug: 'audio-tools', label: 'Audio Tools' },
  document: { slug: 'document-tools', label: 'Document Tools' },
  compress: { slug: 'file-utilities', label: 'File Utilities' },
};

export const DedicatedToolView: React.FC<DedicatedToolViewProps> = ({
  tool,
  onNavigateHome,
  onSelectTool,
}) => {
  const seoConfig = getSeoConfig(tool.slug);
  useSeo(seoConfig);

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const disabled = isToolDisabled(tool.slug, tool.category);

  useEffect(() => {
    trackToolView(tool.slug, tool.category);
  }, [tool.slug, tool.category]);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    onSelectTool(slug);
  };

  const handleHomeLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigateHome();
  };

  const categoryInfo = CATEGORY_ROUTE_MAP[tool.category] || {
    slug: 'file-utilities',
    label: 'File Utilities',
  };

  const steps = seoConfig?.howToSteps || tool.howToSteps || [
    `Upload your ${tool.sourceFormat ? tool.sourceFormat.toUpperCase() : 'source'} file by dropping it into the conversion zone or clicking "Browse Files".`,
    `Adjust optional quality, page orientation, or dimension settings according to your preference.`,
    `Click "Convert" and download your ${tool.targetFormat ? tool.targetFormat.toUpperCase() : 'finished'} file immediately.`
  ];

  const faqs = seoConfig?.faqData || [
    {
      question: `How does ${tool.title} work?`,
      answer: `${BRAND.name} processes your files directly in your modern web browser whenever possible, and routes specialized media/compression tasks to our temporary server engine.`
    },
    {
      question: 'Are my files kept private and secure?',
      answer: 'Yes. Local conversions never leave your device, and server-assisted conversions are deleted immediately once downloaded.'
    },
    {
      question: 'Can I convert multiple files at once?',
      answer: 'Yes. Upload multiple files simultaneously and download them individually or bundled together in a ZIP archive.'
    }
  ];

  const relatedLinks = seoConfig?.relatedConverters || ALL_TOOLS
    .filter((t) => t.id !== tool.id && (t.category === tool.category || t.targetFormat === tool.targetFormat))
    .slice(0, 6)
    .map((t) => ({
      slug: t.slug,
      title: t.title,
      anchorText: `Open ${t.title}`,
      description: t.description,
    }));

  const workspaceTitle =
    tool.slug === 'merge-pdf'
      ? 'Drop PDF files to merge'
      : tool.slug === 'split-pdf'
      ? 'Drop a PDF file to split'
      : tool.slug === 'compress-pdf'
      ? 'Drop PDF files to compress'
      : tool.slug === 'rotate-pdf'
      ? 'Drop PDF files to rotate'
      : tool.slug === 'add-page-numbers'
      ? 'Drop PDF files to add page numbers'
      : tool.slug === 'watermark-pdf'
      ? 'Drop PDF files to watermark'
      : tool.slug === 'resize-image'
      ? 'Drop images to resize'
      : tool.slug === 'compress-image'
      ? 'Drop images to compress'
      : tool.slug === 'compress-video'
      ? 'Drop videos to compress'
      : `Convert to ${tool.targetFormat ? tool.targetFormat.toUpperCase() : 'Target Format'}`;

  return (
    <div className="py-5 sm:py-10 md:py-12 bg-[#F7F9FC]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-[#475569] overflow-hidden whitespace-nowrap">
          <a
            href="/"
            onClick={handleHomeLink}
            className="hover:text-[#2563EB] font-medium transition-colors shrink-0"
          >
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0" />
          <a
            href={`/${categoryInfo.slug}`}
            onClick={(e) => handleLink(e, categoryInfo.slug)}
            className="hover:text-[#2563EB] font-medium text-[#475569] transition-colors shrink-0"
          >
            {categoryInfo.label}
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0" />
          <span className="font-bold text-[#0F172A] truncate max-w-[160px] sm:max-w-none">
            {tool.title}
          </span>
        </nav>

        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-bold text-[#2563EB]">
            {disabled
              ? `${BRAND.name} Tool · Temporarily Unavailable`
              : `${BRAND.name} Free Online Tool · No Subscription Required`}
          </p>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
            {seoConfig?.h1 || tool.title}
          </h1>

          <p className="text-xs sm:text-base md:text-lg text-[#475569] leading-relaxed max-w-2xl mx-auto">
            {seoConfig?.intro || tool.description}
          </p>
        </div>

        {/* Interactive Tool Workspace or Unavailable Notice */}
        {disabled ? (
          <div className="bg-white border border-[#CBD5E1] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-[#2563EB]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">
              {tool.title} is Temporarily Unavailable
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] max-w-xl mx-auto leading-relaxed">
              Server-side audio and video transcoding workers are currently paused so {BRAND.name} stays fast, reliable, and free on browser-first infrastructure. Try one of our active client-side utilities below:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {[
                { slug: 'compress-pdf', label: 'Compress PDF' },
                { slug: 'merge-pdf', label: 'Merge PDF' },
                { slug: 'pdf-to-word', label: 'PDF to Word' },
                { slug: 'compress-image', label: 'Compress Image' },
                { slug: 'jpg-to-png', label: 'JPG to PNG' },
                { slug: 'resize-image', label: 'Resize Image' },
              ].map((alt) => (
                <a
                  key={alt.slug}
                  href={`/${alt.slug}`}
                  onClick={(e) => handleLink(e, alt.slug)}
                  className="px-3.5 py-2 rounded-xl bg-[#F7F9FC] hover:bg-[#EEF2F6] border border-[#CBD5E1] hover:border-[#2563EB] text-xs font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                >
                  {alt.label}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#EEF2F6]/80 p-2 sm:p-5 rounded-2xl sm:rounded-3xl border border-[#CBD5E1]">
            <FileUploader
              toolSlug={tool.slug}
              initialTargetFormat={tool.targetFormat || 'png'}
              initialSourceFormat={tool.sourceFormat}
              title={workspaceTitle}
              subtitle={`Drop your ${tool.sourceFormat ? tool.sourceFormat.toUpperCase() : ''} files here to start`}
            />
          </div>
        )}

        {/* Policy-Compliant AdSense Unit */}
        <AdSlot variant="leaderboard" slotKey="top" />

        {/* How to use Step by Step */}
        <section className="bg-white rounded-2xl sm:rounded-3xl border border-[#CBD5E1] p-5 sm:p-8 space-y-5 shadow-2xs">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-2xl font-black text-[#0F172A]">
              How to use {tool.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#475569]">
              Process your files cleanly in three steps:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((stepText, idx) => (
              <div
                key={idx}
                className="bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2"
              >
                <div className="font-mono-tabular text-xs font-bold text-[#2563EB]">
                  0{idx + 1}. {idx === 0 ? 'Upload File' : idx === 1 ? 'Configure' : 'Download'}
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">{stepText}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Key Benefits */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-2">
            <Lock className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Privacy-Conscious Handling</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Active image, PDF, and document utilities run locally inside your browser so your files stay on your device without cloud storage accounts.
            </p>
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-2">
            <Zap className="w-5 h-5 text-[#0D9488]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Free Online Access</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Easy browser-based execution with no paid subscriptions, no mandatory signup, and straightforward everyday controls.
            </p>
          </div>

          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-5 space-y-2">
            <Layers className="w-5 h-5 text-[#16A34A]" />
            <h3 className="text-sm font-bold text-[#0F172A]">Batch &amp; ZIP Export</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Queue multiple compatible files at once, customize output settings, and download results individually or as a ZIP archive.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <section className="bg-white rounded-2xl sm:rounded-3xl border border-[#CBD5E1] p-5 sm:p-8 space-y-4 shadow-2xs">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-2xl font-black text-[#0F172A]">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-[#475569]">
                Common questions about {tool.title} on {BRAND.name}.
              </p>
            </div>

            <div className="divide-y divide-[#CBD5E1] border-t border-[#CBD5E1]">
              {faqs.map((faq, idx) => (
                <div key={idx} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full min-h-[44px] flex items-center justify-between text-left group focus:outline-none cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#475569] transition-transform shrink-0 ${
                        openFaqIndex === idx ? 'rotate-180 text-[#2563EB]' : ''
                      }`}
                    />
                  </button>
                  {openFaqIndex === idx && (
                    <p className="text-xs sm:text-sm text-[#475569] leading-relaxed pt-2 pr-6">
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lower In-Content AdSense Placement */}
        <AdSlot variant="in-article" slotKey="tool" />

        {/* Related Converters Internal Linking */}
        {relatedLinks.length > 0 && (
          <section className="space-y-4 pt-2 border-t border-[#CBD5E1]">
            <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">
              Related Tools
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {relatedLinks.map((rel) => (
                <a
                  key={rel.slug}
                  href={`/${rel.slug}`}
                  onClick={(e) => handleLink(e, rel.slug)}
                  className="p-4 bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#2563EB] transition-colors group flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                        {rel.anchorText}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#475569] group-hover:text-[#2563EB] shrink-0 ml-1" />
                    </div>
                    <p className="text-[11px] text-[#475569] line-clamp-2 leading-relaxed">
                      {rel.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="text-center pt-2">
          <a
            href="/"
            onClick={handleHomeLink}
            className="inline-flex items-center space-x-2 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors py-2.5 px-4 rounded-xl hover:bg-[#EEF2F6]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All {BRAND.name} Tools</span>
          </a>
        </div>
      </div>
    </div>
  );
};
