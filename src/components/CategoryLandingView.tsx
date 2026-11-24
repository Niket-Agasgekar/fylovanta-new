import React from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, ChevronRight, Layers } from 'lucide-react';
import { CategoryLandingConfig } from '../types';
import { ALL_TOOLS, CATEGORY_LANDING_PAGES } from '../data/toolsData';
import { getStaticPageSeoConfig } from '../data/seoData';
import { useSeo } from '../utils/useSeo';
import { FileUploader } from './FileUploader';
import { AdSlot } from './AdSlot';
import { isToolDisabled } from '../config/features';

interface CategoryLandingViewProps {
  categoryConfig: CategoryLandingConfig;
  onNavigate: (route: string) => void;
}

export const CategoryLandingView: React.FC<CategoryLandingViewProps> = ({
  categoryConfig,
  onNavigate,
}) => {
  const staticSeo = getStaticPageSeoConfig(categoryConfig.slug);
  useSeo(null, false, false, staticSeo);

  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, route: string) => {
    e.preventDefault();
    onNavigate(route);
  };

  const categoryDisabled = isToolDisabled(categoryConfig.slug);

  const featuredSet = new Set(categoryConfig.featuredSlugs);
  const matchingTools = ALL_TOOLS.filter(
    (t) => featuredSet.has(t.slug) || categoryConfig.categories.includes(t.category)
  );

  const defaultTarget =
    categoryConfig.slug === 'pdf-tools'
      ? 'jpg'
      : categoryConfig.slug === 'image-tools'
      ? 'png'
      : categoryConfig.slug === 'video-tools'
      ? 'mp4'
      : categoryConfig.slug === 'audio-tools'
      ? 'mp3'
      : 'pdf';

  const defaultSource = categoryConfig.slug === 'pdf-tools' ? 'pdf' : undefined;

  return (
    <div className="py-6 sm:py-12 bg-[#F7F9FC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs sm:text-sm text-[#475569]">
          <a href="/" onClick={(e) => handleLink(e, '/')} className="hover:text-[#2563EB] font-medium transition-colors">
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1]" />
          <span className="font-bold text-[#0F172A]">{categoryConfig.title}</span>
        </nav>

        {/* Category Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#0D9488]">
            {categoryDisabled ? 'Fylovanta Category Status' : 'Free Online Utilities · No Signup'}
          </p>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight leading-[1.12]">
            {categoryConfig.headline}
          </h1>
          <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-2xl mx-auto">
            {categoryConfig.description}
          </p>
        </div>

        {/* Category Quick Upload Workspace or Temporarily Unavailable Notice */}
        {categoryDisabled ? (
          <div className="bg-white border border-[#CBD5E1] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center max-w-3xl mx-auto space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-center justify-center mx-auto text-[#0F172A]">
              <AlertCircle className="w-6 h-6 text-[#2563EB]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">
              {categoryConfig.title} Temporarily Unavailable
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] max-w-xl mx-auto leading-relaxed">
              Server-side FFmpeg audio and video transcoding is paused on this deployment to keep core browser utilities fast, private, and free-tier sustainable. All PDF, image, compression, and document tools remain active right in your browser.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {[
                { slug: 'pdf-tools', label: 'PDF Tools' },
                { slug: 'image-tools', label: 'Image Tools' },
                { slug: 'compress-pdf', label: 'Compress PDF' },
                { slug: 'compress-image', label: 'Compress Image' },
                { slug: 'document-tools', label: 'Document Tools' },
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
              initialTargetFormat={defaultTarget}
              initialSourceFormat={defaultSource}
              title={`Drop files for ${categoryConfig.title}`}
              subtitle="Choose any specific tool below or start converting right here."
            />
          </div>
        )}

        <AdSlot variant="leaderboard" slotKey="top" />

        {/* Tools Grid */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
              Available {categoryConfig.title} ({matchingTools.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchingTools.map((tool) => {
              const disabled = isToolDisabled(tool.slug, tool.category);
              return (
                <a
                  key={tool.id}
                  href={`/${tool.slug}`}
                  onClick={(e) => handleLink(e, tool.slug)}
                  className={`group p-5 bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#2563EB] transition-colors flex flex-col justify-between shadow-2xs ${
                    disabled ? 'opacity-75' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5 text-[11px] font-bold uppercase tracking-wider">
                      <span className="text-[#475569] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>{tool.category}</span>
                      </span>
                      {disabled ? (
                        <span className="text-[#475569]">Unavailable</span>
                      ) : (
                        <span className="text-[#2563EB]">
                          {tool.badge ? `${tool.badge} · ` : ''}
                          <span className="text-[#0D9488]">Free</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#EEF2F6] flex items-center justify-between text-xs font-bold text-[#2563EB]">
                    <span>{disabled ? 'View status' : 'Open Tool'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0D9488] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* Cross-category navigation */}
        <section className="pt-4 border-t border-[#CBD5E1] space-y-3">
          <h3 className="text-sm font-bold text-[#0F172A]">Explore Other File Categories</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_LANDING_PAGES.filter((c) => c.slug !== categoryConfig.slug).map((cat) => (
              <a
                key={cat.slug}
                href={`/${cat.slug}`}
                onClick={(e) => handleLink(e, cat.slug)}
                className="px-3.5 py-2 bg-white hover:bg-[#EEF2F6] border border-[#CBD5E1] hover:border-[#2563EB] rounded-xl text-xs font-bold text-[#0F172A] transition-colors"
              >
                {cat.title}
              </a>
            ))}
          </div>
        </section>

        <div className="text-center pt-2">
          <a
            href="/"
            onClick={(e) => handleLink(e, '/')}
            className="inline-flex items-center space-x-2 text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] py-2.5 px-4 rounded-xl hover:bg-[#EEF2F6] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Fylovanta Home</span>
          </a>
        </div>
      </div>
    </div>
  );
};
