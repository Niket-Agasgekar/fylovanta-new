import React from 'react';
import { FileQuestion, ArrowLeft, Search, ArrowRight } from 'lucide-react';
import { ALL_TOOLS } from '../data/toolsData';
import { BRAND } from '../config/brand';

interface NotFoundViewProps {
  onNavigate: (route: string) => void;
  onOpenSearch: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate, onOpenSearch }) => {
  const topTools = ALL_TOOLS.slice(0, 6);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    onNavigate(slug);
  };

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center space-y-10">
      {/* 404 Header & Graphic */}
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] font-mono-tabular">
          Error 404 · Page Not Found
        </p>

        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-white border border-[#CBD5E1] flex items-center justify-center">
          <FileQuestion className="w-10 h-10 sm:w-12 sm:h-12 text-[#0F172A]" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F172A] tracking-tight">
          Oops, that page doesn&apos;t exist.
        </h1>

        <p className="text-base sm:text-lg text-[#475569] max-w-md mx-auto leading-relaxed">
          Let&apos;s get your files back on track. The tool or page you were looking for might have been moved or renamed.
        </p>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-[#0F172A] text-white hover:bg-[#0B1120] rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#38BDF8]" />
          <span>Back to {BRAND.name}</span>
        </a>

        <button
          onClick={onOpenSearch}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-white hover:bg-[#EEF2F6] text-[#0F172A] border border-[#CBD5E1] rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer"
        >
          <Search className="w-4 h-4 text-[#2563EB]" />
          <span>Search All Tools</span>
        </button>
      </div>

      {/* Popular Converters Suggestions */}
      <div className="pt-8 border-t border-[#CBD5E1] text-left space-y-4">
        <h2 className="text-base font-bold text-[#0F172A]">
          Explore Popular Tools:
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {topTools.map((tool) => (
            <a
              key={tool.id}
              href={`/${tool.slug}`}
              onClick={(e) => handleLinkClick(e, tool.slug)}
              className="p-3.5 bg-white hover:bg-[#EEF2F6] rounded-xl border border-[#CBD5E1] hover:border-[#2563EB] transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                  {tool.title}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#475569] group-hover:text-[#2563EB] transition-colors" />
              </div>
              <p className="text-[11px] text-[#475569] line-clamp-1">
                {tool.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
