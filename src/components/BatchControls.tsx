import React from 'react';
import {
  Play,
  Plus,
  Trash2,
  Loader2,
  Archive,
  Layers,
} from 'lucide-react';
import { FileConversionItem } from '../types';
import { COMPATIBLE_TARGETS } from '../data/toolsData';
import { FEATURES } from '../config/features';

const MEDIA_ONLY_FORMATS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mp4', 'webm', 'weba']);

interface BatchControlsProps {
  items: FileConversionItem[];
  batchTargetFormat: string;
  onBatchFormatChange: (fmt: string) => void;
  onConvertAll: () => void;
  onDownloadAllZip: () => void;
  onAddMoreClick: () => void;
  onClearAll: () => void;
  specialActionLabel?: string;
  onSpecialAction?: () => void;
  isSpecialProcessing?: boolean;
  hideGlobalFormatPicker?: boolean;
}

export const BatchControls: React.FC<BatchControlsProps> = ({
  items,
  batchTargetFormat,
  onBatchFormatChange,
  onConvertAll,
  onDownloadAllZip,
  onAddMoreClick,
  onClearAll,
  specialActionLabel,
  onSpecialAction,
  isSpecialProcessing = false,
  hideGlobalFormatPicker = false,
}) => {
  if (items.length === 0) return null;

  const activeItems = items.filter((i) => i.status !== 'completed' && i.status !== 'converting');
  const sourceItems = activeItems.length > 0 ? activeItems : items;
  let computedFormats: string[] = [];
  if (sourceItems.length > 0) {
    computedFormats = [...(COMPATIBLE_TARGETS[sourceItems[0].category] || ['png', 'jpg', 'pdf'])];
    for (let idx = 1; idx < sourceItems.length; idx++) {
      const nextSet = new Set(COMPATIBLE_TARGETS[sourceItems[idx].category] || []);
      const intersected = computedFormats.filter((fmt) => nextSet.has(fmt));
      if (intersected.length > 0) {
        computedFormats = intersected;
      }
    }
  }
  const filteredFormats = FEATURES.mediaToolsEnabled
    ? computedFormats
    : computedFormats.filter((fmt) => !MEDIA_ONLY_FORMATS.has(fmt));
  const allFormats = filteredFormats.length > 0 ? filteredFormats : ['png', 'jpg', 'webp', 'pdf', 'txt'];
  const effectiveBatchFormat = allFormats.includes(batchTargetFormat) ? batchTargetFormat : allFormats[0];

  const totalCount = items.length;
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const isConverting = isSpecialProcessing || items.some((i) => i.status === 'converting');
  const allCompleted = totalCount > 0 && completedCount === totalCount;
  const hasIdle = items.some((i) => i.status === 'idle' || i.status === 'error');

  return (
    <div className="bg-[#0F172A] text-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-[#0B1120] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Left: Queue summary & Batch target selector */}
      <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-start">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white tabular-nums">
          <span>
            {totalCount} {totalCount === 1 ? 'File' : 'Files'} queued
          </span>
          {completedCount > 0 && (
            <>
              <span className="text-[#475569]" aria-hidden="true">·</span>
              <span className="text-[#38BDF8]">
                {completedCount}/{totalCount} Ready
              </span>
            </>
          )}
        </div>

        {/* Global format selector */}
        {!hideGlobalFormatPicker && hasIdle && (
          <div className="flex items-center space-x-1.5 bg-[#0B1120] border border-[#334155] rounded-xl px-2.5 py-1.5">
            <span className="text-[11px] text-[#94A3B8] font-medium">Convert all to</span>
            <select
              value={effectiveBatchFormat}
              onChange={(e) => onBatchFormatChange(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase text-white focus:outline-none cursor-pointer"
            >
              {allFormats.map((fmt) => (
                <option key={fmt} value={fmt} className="bg-[#0F172A] text-white">
                  {fmt.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onAddMoreClick}
          disabled={isConverting}
          className="min-h-[40px] px-3 py-2 bg-[#0B1120] hover:bg-[#1E293B] disabled:opacity-50 text-[#CBD5E1] text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 border border-[#334155] cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#38BDF8]" />
          <span>Add Files</span>
        </button>

        <button
          type="button"
          onClick={onClearAll}
          disabled={isConverting}
          className="w-10 h-10 flex items-center justify-center text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#0B1120] disabled:opacity-50 rounded-xl transition-colors border border-transparent hover:border-[#334155] cursor-pointer shrink-0"
          title="Clear queue"
          aria-label="Clear queue"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {specialActionLabel && onSpecialAction ? (
          <button
            type="button"
            onClick={onSpecialAction}
            disabled={isConverting}
            className="flex-1 sm:flex-initial min-h-[40px] px-4 sm:px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-98 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" />
                <span>{specialActionLabel}</span>
              </>
            )}
          </button>
        ) : (
          <>
            {hasIdle && (
              <button
                type="button"
                onClick={onConvertAll}
                disabled={isConverting}
                className="flex-1 sm:flex-initial min-h-[40px] px-4 sm:px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-98 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Convert All</span>
                  </>
                )}
              </button>
            )}

            {allCompleted && totalCount > 1 && (
              <button
                type="button"
                onClick={onDownloadAllZip}
                className="flex-1 sm:flex-initial min-h-[40px] px-4 sm:px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Archive className="w-4 h-4" />
                <span>Download All ZIP</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
