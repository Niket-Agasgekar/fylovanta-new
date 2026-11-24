import React, { useState } from 'react';
import {
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  Music as MusicIcon,
  Minimize2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ALL_TOOLS, CATEGORIES } from '../data/toolsData';
import { ToolDefinition } from '../types';
import { getTranslations } from '../utils/i18n';
import { FEATURES, isToolDisabled } from '../config/features';

interface CategorySectionProps {
  onSelectTool: (slug: string) => void;
  selectedLanguage?: string;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  onSelectTool,
  selectedLanguage = 'en',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const t = getTranslations(selectedLanguage);

  const filteredTools = ALL_TOOLS.filter((tool) => {
    const disabled = isToolDisabled(tool.slug, tool.category);
    if (selectedCategory === 'all') return !disabled;
    if (selectedCategory === 'compress') return tool.category === 'compress';
    return tool.category === selectedCategory;
  });

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'video':
        return <VideoIcon className="w-4 h-4" />;
      case 'audio':
        return <MusicIcon className="w-4 h-4" />;
      case 'compress':
        return <Minimize2 className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    onSelectTool(slug);
  };

  const showingPausedMediaTab =
    !FEATURES.mediaToolsEnabled &&
    (selectedCategory === 'video' || selectedCategory === 'audio');

  return (
    <section className="py-12 sm:py-16 bg-[#EEF2F6]/60 border-y border-[#CBD5E1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header & Category Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] mb-1">
              Complete Utility Directory
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              {t.allCategoriesTitle}
            </h2>
            <p className="text-sm sm:text-base text-[#475569] mt-1">
              Browse free browser-first PDF, image, compression, and data utilities—no subscription required.
            </p>
          </div>

          {/* Interactive Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-white text-[#0F172A] hover:bg-[#F7F9FC] border border-[#CBD5E1]'
                }`}
              >
                <span className={selectedCategory === cat.id ? 'text-[#38BDF8]' : 'text-[#475569]'}>
                  {getCategoryIcon(cat.id)}
                </span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {showingPausedMediaTab && (
          <div className="mb-5 p-4 rounded-2xl bg-white border border-[#CBD5E1] text-xs sm:text-sm text-[#475569]">
            <strong className="text-[#0F172A]">Temporarily Unavailable:</strong> Heavy server-side audio and video transcoding tools are paused in lightweight browser-first mode so active PDF, image, and document tools remain fast and free.
          </div>
        )}

        {/* Tools Cards Grid with crawlable links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTools.map((tool: ToolDefinition) => {
            const disabled = isToolDisabled(tool.slug, tool.category);
            return (
              <a
                key={tool.id}
                href={`/${tool.slug}`}
                onClick={(e) => handleLinkClick(e, tool.slug)}
                className={`text-left p-4 sm:p-5 bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#2563EB] transition-colors flex flex-col justify-between group ${
                  disabled ? 'opacity-75' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                      {tool.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!disabled && tool.badge && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                          {tool.badge}
                        </span>
                      )}
                      {disabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#EEF2F6] text-[#475569] border border-[#CBD5E1]">
                          Unavailable
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]">
                          Free
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-[#475569] mt-1 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-[#CBD5E1] flex items-center justify-between text-xs font-bold text-[#2563EB]">
                  <span>{disabled ? 'View status & alternatives' : 'Start conversion'}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-[#0D9488]" />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

