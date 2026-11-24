import React from 'react';
import { ArrowRight, Image, FileText, Music, Video, Smartphone, FileSpreadsheet, Layers } from 'lucide-react';
import { POPULAR_TOOLS } from '../data/toolsData';
import { ToolDefinition } from '../types';
import { getTranslations } from '../utils/i18n';

interface PopularConvertersProps {
  onSelectTool: (slug: string) => void;
  selectedLanguage?: string;
}

export const PopularConverters: React.FC<PopularConvertersProps> = ({
  onSelectTool,
  selectedLanguage = 'en',
}) => {
  const t = getTranslations(selectedLanguage);

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Image':
      case 'FileImage':
        return <Image className="w-5 h-5 text-[#2563EB]" />;
      case 'Smartphone':
        return <Smartphone className="w-5 h-5 text-[#0D9488]" />;
      case 'FileText':
        return <FileText className="w-5 h-5 text-[#0D9488]" />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet className="w-5 h-5 text-[#16A34A]" />;
      case 'Music':
        return <Music className="w-5 h-5 text-[#2563EB]" />;
      case 'Video':
      case 'Film':
        return <Video className="w-5 h-5 text-[#1D4ED8]" />;
      default:
        return <Layers className="w-5 h-5 text-[#2563EB]" />;
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    onSelectTool(slug);
  };

  return (
    <section className="py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-7 pb-4 border-b border-[#CBD5E1]">
          <div>
            <p className="text-xs font-bold text-[#2563EB] mb-1">
              Most Used · Free Online Tools
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              {t.popularTitle}
            </h2>
            <p className="text-sm sm:text-base text-[#475569] mt-1">{t.popularSubtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {POPULAR_TOOLS.map((tool: ToolDefinition) => (
            <a
              key={tool.id}
              href={`/${tool.slug}`}
              onClick={(e) => handleLinkClick(e, tool.slug)}
              className="group text-left p-4 sm:p-5 bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#2563EB] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-center justify-center shrink-0">
                    {getToolIcon(tool.iconName)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[#475569] capitalize">
                      {tool.badge || tool.category}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]">
                      Free
                    </span>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-[#475569] mt-1 line-clamp-2 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#CBD5E1] flex items-center justify-between text-xs font-bold text-[#2563EB]">
                <span>Open Tool</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0D9488] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
