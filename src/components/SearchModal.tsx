import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { ALL_TOOLS } from '../data/toolsData';
import { ToolDefinition } from '../types';
import { FEATURES, isToolDisabled } from '../config/features';
import { trackToolSearch } from '../utils/analytics';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (slug: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();
  const filteredTools = ALL_TOOLS.filter((tool) => {
    if (!normalizedQuery) return !isToolDisabled(tool.slug, tool.category);
    const matchTitle = tool.title.toLowerCase().includes(normalizedQuery);
    const matchDesc = tool.description.toLowerCase().includes(normalizedQuery);
    const matchSlug = tool.slug.toLowerCase().includes(normalizedQuery);
    const matchCategory = tool.category.toLowerCase().includes(normalizedQuery);
    const matchSource = tool.sourceFormat?.toLowerCase().includes(normalizedQuery);
    const matchTarget = tool.targetFormat?.toLowerCase().includes(normalizedQuery);
    return matchTitle || matchDesc || matchSlug || matchCategory || matchSource || matchTarget;
  }).slice(0, 8);

  const quickPicks = FEATURES.mediaToolsEnabled
    ? [
        { label: 'PDF to Word', slug: 'pdf-to-word' },
        { label: 'Merge PDF', slug: 'merge-pdf' },
        { label: 'Compress PDF', slug: 'compress-pdf' },
        { label: 'Resize Image', slug: 'resize-image' },
        { label: 'JPG to PNG', slug: 'jpg-to-png' },
        { label: 'MP4 to MP3', slug: 'mp4-to-mp3' },
      ]
    : [
        { label: 'PDF to Word', slug: 'pdf-to-word' },
        { label: 'Merge PDF', slug: 'merge-pdf' },
        { label: 'Compress PDF', slug: 'compress-pdf' },
        { label: 'Resize Image', slug: 'resize-image' },
        { label: 'Compress Image', slug: 'compress-image' },
        { label: 'JPG to PNG', slug: 'jpg-to-png' },
      ];

  const handleChooseTool = (slug: string) => {
    if (normalizedQuery.length > 0) {
      trackToolSearch(normalizedQuery.length, filteredTools.length, 'modal');
    }
    onSelectTool(slug);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#0B1120]/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#CBD5E1] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#CBD5E1]">
          <Search className="w-5 h-5 text-[#2563EB] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tools (e.g. 'pdf to word', 'resize image', 'compress pdf')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredTools.length > 0) {
                handleChooseTool(filteredTools[0].slug);
              }
            }}
            className="w-full text-sm sm:text-base bg-transparent border-none outline-hidden text-[#0F172A] placeholder:text-[#475569]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#475569] hover:text-[#0F172A] rounded-md mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-bold text-[#475569] bg-[#F7F9FC] hover:bg-[#EEF2F6] border border-[#CBD5E1] rounded-lg transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Quick Picks chips */}
        {!query && (
          <div className="px-4 py-3 bg-[#F7F9FC] border-b border-[#CBD5E1]">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#475569] mb-2">
              Popular Tools
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPicks.map((pick) => (
                <button
                  key={pick.slug}
                  onClick={() => handleChooseTool(pick.slug)}
                  className="px-2.5 py-1 text-xs font-bold bg-white text-[#0F172A] hover:text-[#2563EB] hover:border-[#2563EB] border border-[#CBD5E1] rounded-xl transition-colors cursor-pointer"
                >
                  {pick.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredTools.length > 0 ? (
            filteredTools.map((tool: ToolDefinition) => {
              const disabled = isToolDisabled(tool.slug, tool.category);
              return (
                <a
                  key={tool.id}
                  href={`/${tool.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleChooseTool(tool.slug);
                  }}
                  className="w-full text-left flex items-center justify-between p-3 rounded-2xl hover:bg-[#F7F9FC] transition-colors group cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#F7F9FC] border border-[#CBD5E1] text-[#2563EB] flex items-center justify-center font-black text-xs uppercase group-hover:bg-[#0F172A] group-hover:text-white group-hover:border-[#0F172A] transition-colors shrink-0">
                      {tool.sourceFormat ? tool.sourceFormat.slice(0, 3) : '⚡'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                        <span className="truncate">{tool.title}</span>
                        {disabled ? (
                          <span className="text-[11px] font-semibold text-[#475569] shrink-0">
                            · Unavailable
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-[#2563EB] shrink-0">
                            {tool.badge ? `· ${tool.badge} ` : ''}
                            <span className="text-[#0D9488]">· Free</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#475569] line-clamp-1">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#475569] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </a>
              );
            })
          ) : (
            <div className="p-8 text-center text-[#475569]">
              <Search className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#0F172A]">No matching tools found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-[#475569] mt-1">Try searching for PDF, JPG, PNG, Resize, Watermark, CSV, or JSON.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
