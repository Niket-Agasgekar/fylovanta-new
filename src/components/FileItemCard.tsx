import React, { useState, useEffect } from 'react';
import {
  FileImage,
  FileText,
  Music,
  Video,
  File as FileIcon,
  Trash2,
  Settings,
  Download,
  AlertCircle,
  Play,
  RotateCcw,
  Check,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { FileConversionItem } from '../types';
import { COMPATIBLE_TARGETS } from '../data/toolsData';
import { formatBytes, triggerDownload } from '../utils/converterEngine';
import { FEATURES } from '../config/features';

const MEDIA_TARGET_FORMATS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mp4', 'webm', 'weba']);

interface FileItemCardProps {
  item: FileConversionItem;
  index: number;
  totalCount: number;
  reorderable?: boolean;
  hideFormatPicker?: boolean;
  hideSingleConvert?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onRemove: (id: string) => void;
  onFormatChange: (id: string, newFormat: string) => void;
  onOpenSettings: (item: FileConversionItem) => void;
  onConvertSingle: (id: string) => void;
  onDownloaded?: (format: string, isZip?: boolean) => void;
}

export const FileItemCard: React.FC<FileItemCardProps> = ({
  item,
  index,
  totalCount,
  reorderable = false,
  hideFormatPicker = false,
  hideSingleConvert = false,
  onMoveUp,
  onMoveDown,
  onRemove,
  onFormatChange,
  onOpenSettings,
  onConvertSingle,
  onDownloaded,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPagesGallery, setShowPagesGallery] = useState(false);

  useEffect(() => {
    setDownloaded(false);
  }, [item.convertedUrl]);

  const rawFormats = COMPATIBLE_TARGETS[item.category] || ['png', 'jpg', 'pdf', 'txt'];
  const compatibleFormats = FEATURES.mediaToolsEnabled
    ? rawFormats
    : rawFormats.filter((fmt) => !MEDIA_TARGET_FORMATS.has(fmt));

  const getCategoryIcon = () => {
    switch (item.category) {
      case 'image':
        return <FileImage className="w-5 h-5 text-[#2563EB]" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-[#0D9488]" />;
      case 'audio':
        return <Music className="w-5 h-5 text-[#16A34A]" />;
      case 'video':
        return <Video className="w-5 h-5 text-[#1D4ED8]" />;
      default:
        return <FileIcon className="w-5 h-5 text-[#475569]" />;
    }
  };

  const handleDownload = () => {
    if (item.convertedBlob && item.convertedName) {
      triggerDownload(item.convertedBlob, item.convertedName);
      setDownloaded(true);
      onDownloaded?.(item.targetFormat, item.convertedName.toLowerCase().endsWith('.zip'));
    }
  };

  const sizeDiffPercent =
    item.convertedSize && item.size
      ? Math.round(((item.convertedSize - item.size) / item.size) * 100)
      : null;

  const isPreviewableImage =
    item.status === 'completed' &&
    item.convertedUrl &&
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif'].includes(item.targetFormat.toLowerCase()) &&
    (!item.extraOutputs || item.extraOutputs.length <= 1);

  const isPreviewableAudio =
    item.status === 'completed' &&
    item.convertedUrl &&
    ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'weba'].includes(item.targetFormat.toLowerCase());

  const isPreviewableVideo =
    item.status === 'completed' &&
    item.convertedUrl &&
    ['mp4', 'webm'].includes(item.targetFormat.toLowerCase());

  const canPreview = Boolean(isPreviewableImage || isPreviewableAudio || isPreviewableVideo);

  return (
    <div className="bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#2563EB]/60 transition-colors p-3.5 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Reorder controls (if enabled), Icon, Filename, Clean Unboxed Metadata */}
        <div className="flex items-center space-x-3 min-w-0">
          {reorderable && (
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onMoveUp?.(index)}
                disabled={index === 0}
                aria-label="Move file up"
                className="p-1 text-[#475569] hover:text-[#0F172A] disabled:opacity-25 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown?.(index)}
                disabled={index === totalCount - 1}
                aria-label="Move file down"
                className="p-1 text-[#475569] hover:text-[#0F172A] disabled:opacity-25 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-[#CBD5E1] bg-[#F7F9FC] flex items-center justify-center shrink-0">
            {getCategoryIcon()}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-[#0F172A] truncate">
              {item.name}
            </h4>

            {/* Clean unboxed typographic metadata with separators */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs text-[#475569] mt-0.5 tabular-nums">
              <span className="uppercase font-semibold text-[#0F172A]">{item.originalExtension}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{formatBytes(item.size)}</span>

              {typeof item.pageCount === 'number' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}</span>
                </>
              )}

              {item.status === 'completed' && item.convertedSize && (
                <>
                  <span aria-hidden="true">→</span>
                  <span className="font-mono-tabular font-bold text-[#0F172A]">
                    {formatBytes(item.convertedSize)}
                  </span>
                  {sizeDiffPercent !== null && (
                    <span
                      className={`font-bold ${
                        sizeDiffPercent < 0 ? 'text-[#16A34A]' : 'text-[#475569]'
                      }`}
                    >
                      ({sizeDiffPercent > 0 ? `+${sizeDiffPercent}%` : `${sizeDiffPercent}%`})
                    </span>
                  )}
                  {item.processorMode && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#2563EB] font-semibold">
                        {item.processorMode === 'browser' ? 'In-Browser' : 'Server Engine'}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#CBD5E1]/60 shrink-0">
          {!hideFormatPicker && item.status !== 'completed' && item.status !== 'converting' && (
            <div className="flex items-center space-x-1.5 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl px-2.5 py-1 min-h-[40px]">
              <span className="text-xs text-[#475569] font-medium">to</span>
              <select
                value={item.targetFormat.toLowerCase()}
                onChange={(e) => onFormatChange(item.id, e.target.value)}
                aria-label={`Target format for ${item.name}`}
                className="bg-transparent text-xs sm:text-sm font-bold text-[#0F172A] uppercase focus:outline-none cursor-pointer py-1 pr-1 min-h-[36px]"
              >
                {compatibleFormats.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1.5">
            {item.status !== 'completed' && item.status !== 'converting' && (
              <button
                type="button"
                onClick={() => onOpenSettings(item)}
                className="w-10 h-10 flex items-center justify-center text-[#475569] hover:text-[#0F172A] hover:bg-[#F7F9FC] rounded-xl transition-colors border border-transparent hover:border-[#CBD5E1] cursor-pointer"
                title="Advanced Settings"
                aria-label="Advanced Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {!hideSingleConvert && item.status === 'idle' && (
              <button
                type="button"
                onClick={() => onConvertSingle(item.id)}
                className="min-h-[40px] px-3.5 sm:px-4 py-2 bg-[#0F172A] hover:bg-[#0B1120] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current text-[#38BDF8]" />
                <span>Convert</span>
              </button>
            )}

            {item.status === 'completed' && (
              <div className="flex items-center space-x-1.5">
                {canPreview && (
                  <button
                    type="button"
                    onClick={() => setShowPreview((p) => !p)}
                    className="min-h-[40px] px-3 py-2 bg-[#F7F9FC] hover:bg-[#EEF2F6] text-[#0F172A] border border-[#CBD5E1] text-xs font-bold rounded-xl transition-colors flex items-center space-x-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="hidden sm:inline">{showPreview ? 'Hide' : 'Preview'}</span>
                  </button>
                )}

                {item.extraOutputs && item.extraOutputs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowPagesGallery((g) => !g)}
                    className="min-h-[40px] px-3 py-2 bg-[#F7F9FC] hover:bg-[#EEF2F6] text-[#0F172A] border border-[#CBD5E1] text-xs font-bold rounded-xl transition-colors flex items-center space-x-1 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>{item.extraOutputs.length} Files</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPagesGallery ? 'rotate-180' : ''}`} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownload}
                  className={`min-h-[40px] px-4 py-2 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    downloaded
                      ? 'bg-[#0F172A] hover:bg-[#0B1120]'
                      : 'bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-98'
                  }`}
                >
                  {downloaded ? (
                    <>
                      <Check className="w-4 h-4 text-[#38BDF8]" />
                      <span>Downloaded</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {item.status === 'error' && (
              <button
                type="button"
                onClick={() => onConvertSingle(item.id)}
                className="min-h-[40px] px-3.5 py-1.5 bg-[#F7F9FC] hover:bg-[#EEF2F6] text-[#DC2626] text-xs font-bold rounded-xl transition-colors border border-[#CBD5E1] flex items-center space-x-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}

            {item.status !== 'converting' && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="w-10 h-10 flex items-center justify-center text-[#475569] hover:text-[#DC2626] hover:bg-[#F7F9FC] rounded-xl transition-colors cursor-pointer shrink-0"
                title="Remove file"
                aria-label="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress State */}
      {item.status === 'converting' && (
        <div className="mt-3 pt-3 border-t border-[#CBD5E1] space-y-1.5">
          <div className="flex justify-between items-center text-xs tabular-nums">
            <span className="font-semibold text-[#0F172A]">
              {item.statusMessage || 'Processing...'}
            </span>
            <span className="font-mono-tabular font-bold text-[#2563EB]">{item.progress}%</span>
          </div>
          <div className="w-full h-2 bg-[#F7F9FC] border border-[#CBD5E1] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-200"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Inline Media / Image Preview */}
      {showPreview && item.convertedUrl && (
        <div className="mt-3 pt-3 border-t border-[#CBD5E1] bg-[#F7F9FC] rounded-xl p-3">
          {isPreviewableImage && (
            <img
              src={item.convertedUrl}
              alt={item.convertedName || item.name}
              className="max-h-64 mx-auto rounded-lg border border-[#CBD5E1] object-contain bg-white"
            />
          )}
          {isPreviewableAudio && (
            <audio controls src={item.convertedUrl} className="w-full" />
          )}
          {isPreviewableVideo && (
            <video controls src={item.convertedUrl} className="max-h-64 mx-auto rounded-lg" />
          )}
        </div>
      )}

      {/* Multi-Page PDF-to-Images / Split-PDF Gallery */}
      {showPagesGallery && item.extraOutputs && item.extraOutputs.length > 1 && (
        <div className="mt-3 pt-3 border-t border-[#CBD5E1] space-y-2">
          <p className="text-xs font-bold text-[#0F172A]">
            Individual Extracted Files ({item.extraOutputs.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
            {item.extraOutputs.map((out, i) => (
              <div
                key={i}
                className="bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl p-2 flex flex-col justify-between gap-1.5"
              >
                {out.previewUrl && (
                  <img
                    src={out.previewUrl}
                    alt={out.name}
                    className="w-full h-24 object-contain bg-white rounded-lg border border-[#CBD5E1]/60"
                  />
                )}
                <div className="text-[11px] font-semibold text-[#0F172A] truncate">{out.name}</div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono-tabular text-[#475569]">
                    {formatBytes(out.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerDownload(out.blob, out.name);
                      onDownloaded?.(out.name.split('.').pop() || item.targetFormat, false);
                    }}
                    className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {item.status === 'error' && (
        <div className="mt-3 p-2.5 bg-[#F7F9FC] border border-[#DC2626]/40 rounded-xl flex items-center space-x-2 text-xs text-[#DC2626] font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{item.error || 'We could not convert this file. Please try again.'}</span>
        </div>
      )}
    </div>
  );
};
