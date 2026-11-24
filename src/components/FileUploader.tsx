import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  UploadCloud,
  FilePlus,
  ShieldCheck,
  AlertCircle,
  X,
  Download,
  History,
  CheckCircle2,
} from 'lucide-react';
import {
  FileConversionItem,
  ConversionOptions,
  ConversionHistoryEntry,
} from '../types';
import {
  detectFileInfo,
  processConversionItem,
  createZipArchive,
  triggerDownload,
  formatBytes,
} from '../utils/converterEngine';
import type { PdfThumbnailInfo } from '../utils/pdfHelpers';
import { FEATURES } from '../config/features';
import {
  trackFileUploadInitiated,
  trackConversionStarted,
  trackConversionCompleted,
  trackConversionFailed,
  trackDownloadCompleted,
} from '../utils/analytics';
import { FileItemCard } from './FileItemCard';
import { BatchControls } from './BatchControls';
import { AdvancedSettingsModal } from './AdvancedSettingsModal';

export type WorkspaceToolMode =
  | 'default'
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'images-to-pdf'
  | 'resize-image'
  | 'rotate-pdf'
  | 'add-page-numbers'
  | 'watermark-pdf';

interface FileUploaderProps {
  initialTargetFormat?: string;
  initialSourceFormat?: string;
  toolSlug?: string;
  title?: string;
  subtitle?: string;
  browseLabel?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  initialTargetFormat = 'png',
  initialSourceFormat,
  toolSlug = '',
  title,
  subtitle,
  browseLabel = 'Browse Files',
}) => {
  const [items, setItems] = useState<FileConversionItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [batchTargetFormat, setBatchTargetFormat] = useState<string>(initialTargetFormat);
  const [activeSettingsItem, setActiveSettingsItem] = useState<FileConversionItem | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [history, setHistory] = useState<ConversionHistoryEntry[]>([]);

  // Specialized PDF / Image Workspace state
  const [isBatchCombining, setIsBatchCombining] = useState(false);
  const [combineImagesIntoOne, setCombineImagesIntoOne] = useState(true);
  const [pdfCompressionPreset, setPdfCompressionPreset] = useState<'low' | 'medium' | 'high'>('medium');
  const [pdfRotation, setPdfRotation] = useState<90 | 180 | 270>(90);
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.22);
  const [resizeMode, setResizeMode] = useState<'percentage' | 'custom'>('percentage');
  const [resizePercentage, setResizePercentage] = useState<number>(80);
  const [resizeWidth, setResizeWidth] = useState<number | undefined>(undefined);
  const [resizeHeight, setResizeHeight] = useState<number | undefined>(undefined);
  const [splitThumbnails, setSplitThumbnails] = useState<PdfThumbnailInfo[]>([]);
  const [selectedSplitPages, setSelectedSplitPages] = useState<number[]>([]);
  const [splitMode, setSplitMode] = useState<'range' | 'extract-all'>('range');
  const [pdfConversionMode, setPdfConversionMode] = useState<'editable' | 'visual-replica'>('editable');
  const [combinedResult, setCombinedResult] = useState<{
    name: string;
    blob: Blob;
    size: number;
    originalSize: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<FileConversionItem[]>([]);
  itemsRef.current = items;

  const revokeItemUrls = useCallback((item?: FileConversionItem) => {
    if (!item) return;
    if (item.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
    if (item.convertedUrl?.startsWith('blob:')) URL.revokeObjectURL(item.convertedUrl);
    item.extraOutputs?.forEach((out) => {
      if (out.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(out.previewUrl);
    });
  }, []);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => revokeItemUrls(it));
    };
  }, [revokeItemUrls]);

  const celebrate = useCallback((particleCount = 28, spread = 48) => {
    void import('canvas-confetti')
      .then((mod) => {
        mod.default({
          particleCount,
          spread,
          origin: { y: 0.72 },
          colors: ['#2563EB', '#0D9488', '#38BDF8', '#16A34A'],
        });
      })
      .catch(() => {
        // ignore optional confetti failure
      });
  }, []);

  const toolMode: WorkspaceToolMode =
    toolSlug === 'merge-pdf'
      ? 'merge-pdf'
      : toolSlug === 'split-pdf'
      ? 'split-pdf'
      : toolSlug === 'compress-pdf'
      ? 'compress-pdf'
      : toolSlug === 'jpg-to-pdf' || toolSlug === 'png-to-pdf'
      ? 'images-to-pdf'
      : toolSlug === 'resize-image'
      ? 'resize-image'
      : toolSlug === 'rotate-pdf'
      ? 'rotate-pdf'
      : toolSlug === 'add-page-numbers'
      ? 'add-page-numbers'
      : toolSlug === 'watermark-pdf'
      ? 'watermark-pdf'
      : 'default';

  const isPdfOnlyWorkspace =
    initialSourceFormat === 'pdf' ||
    toolMode === 'merge-pdf' ||
    toolMode === 'split-pdf' ||
    toolMode === 'compress-pdf' ||
    toolMode === 'rotate-pdf' ||
    toolMode === 'add-page-numbers' ||
    toolMode === 'watermark-pdf';

  const acceptAttr = isPdfOnlyWorkspace
    ? '.pdf,application/pdf'
    : toolMode === 'resize-image'
    ? 'image/*'
    : undefined;

  const pushToHistory = useCallback(
    (entry: Omit<ConversionHistoryEntry, 'id' | 'timestamp'>) => {
      setHistory((prev) => [
        {
          ...entry,
          id: Math.random().toString(36).slice(2, 9),
          timestamp: Date.now(),
        },
        ...prev.slice(0, 7),
      ]);
    },
    []
  );

  // Add files to queue
  const handleAddFiles = useCallback(
    (files: FileList | File[]) => {
      setErrorBanner(null);
      setCombinedResult(null);
      const newItems: FileConversionItem[] = [];

      let rejectedMediaCount = 0;

      Array.from(files).forEach((file) => {
        const { category, extension } = detectFileInfo(file);

        if (!FEATURES.mediaToolsEnabled && (category === 'audio' || category === 'video')) {
          rejectedMediaCount += 1;
          return;
        }

        let target = initialTargetFormat;
        if (!FEATURES.mediaToolsEnabled && ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'mp4', 'webm'].includes(target)) {
          target = category === 'image' ? 'png' : 'pdf';
        }
        if (
          toolMode === 'merge-pdf' ||
          toolMode === 'split-pdf' ||
          toolMode === 'compress-pdf' ||
          toolMode === 'rotate-pdf' ||
          toolMode === 'add-page-numbers' ||
          toolMode === 'watermark-pdf' ||
          toolMode === 'images-to-pdf'
        ) {
          target = 'pdf';
        } else if ((toolSlug === 'compress-image' || toolMode === 'resize-image') && category === 'image') {
          target = ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
            ? extension === 'jpeg'
              ? 'jpg'
              : extension
            : 'png';
        } else if (toolSlug === 'compress-video' && category === 'video') {
          target = extension === 'webm' ? 'webm' : 'mp4';
        } else if (category === 'image' && extension === target) {
          target = extension === 'jpg' || extension === 'jpeg' ? 'png' : 'jpg';
        } else if (category === 'pdf' && initialTargetFormat === 'pdf' && !isPdfOnlyWorkspace) {
          target = 'jpg';
        } else if (category === 'video' && (target === 'png' || target === 'jpg')) {
          target = 'mp4';
        } else if (category === 'audio' && (target === 'png' || target === 'jpg')) {
          target = 'mp3';
        } else if (category === 'document' && extension === 'csv' && target === 'png') {
          target = 'json';
        } else if (category === 'document' && extension === 'json' && target === 'png') {
          target = 'csv';
        } else if (category === 'document' && (target === 'png' || target === 'jpg')) {
          target = 'pdf';
        }

        const itemId = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        const newItem: FileConversionItem = {
          id: itemId,
          file,
          name: file.name,
          originalExtension: extension,
          size: file.size,
          category,
          targetFormat: target,
          status: 'idle',
          progress: 0,
          options: {
            quality: toolSlug === 'compress-image' ? 0.72 : 0.92,
            pageSize: 'a4',
            pageOrientation: 'portrait',
            audioBitrate: '192k',
            gifFps: 12,
            pdfCompression: pdfCompressionPreset,
            isMergePdf: toolMode === 'merge-pdf',
            isSplitPdf: toolMode === 'split-pdf',
            isCompressOnly: toolMode === 'compress-pdf',
            isRotatePdf: toolMode === 'rotate-pdf',
            isPageNumbersPdf: toolMode === 'add-page-numbers',
            isWatermarkPdf: toolMode === 'watermark-pdf',
            isResizeImage: toolMode === 'resize-image',
            resizeMode: toolMode === 'resize-image' ? resizeMode : 'original',
            percentage: resizePercentage,
            width: resizeWidth,
            height: resizeHeight,
            maintainAspectRatio: true,
            pdfRotation,
            pageNumberPosition,
            watermarkText,
            watermarkOpacity,
            splitMode,
            pdfConversionMode,
          },
        };

        newItems.push(newItem);

        // Inspect PDF metadata/thumbnails automatically for PDF tools
        if (category === 'pdf') {
          void import('../utils/pdfHelpers')
            .then(({ inspectPdfDocument }) =>
              inspectPdfDocument(file, toolMode === 'split-pdf' ? 24 : 0)
            )
            .then((info) => {
              setItems((prev) =>
                prev.map((it) => (it.id === itemId ? { ...it, pageCount: info.pageCount } : it))
              );
              if (toolMode === 'split-pdf' && info.thumbnails.length > 0) {
                setSplitThumbnails(info.thumbnails);
                setSelectedSplitPages(info.thumbnails.map((t) => t.pageNumber));
              }
            })
            .catch(() => {
              // Ignore thumbnail failure on encrypted/corrupt preview
            });
        }
      });

      if (rejectedMediaCount > 0) {
        setErrorBanner(
          'Audio and video transcoding tools are temporarily unavailable while Fylovanta runs in lightweight browser-first mode.'
        );
      }

      if (newItems.length > 0) {
        trackFileUploadInitiated(
          toolSlug || 'general',
          newItems[0].category,
          newItems.length
        );
        setItems((prev) => [...prev, ...newItems]);
      }
    },
    [
      initialTargetFormat,
      toolMode,
      toolSlug,
      isPdfOnlyWorkspace,
      pdfCompressionPreset,
      splitMode,
      resizeMode,
      resizePercentage,
      resizeWidth,
      resizeHeight,
      pdfRotation,
      pageNumberPosition,
      watermarkText,
      watermarkOpacity,
      pdfConversionMode,
    ]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
  };

  const handleRemoveItem = (id: string) => {
    const existing = itemsRef.current.find((i) => i.id === id);
    revokeItemUrls(existing);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setCombinedResult(null);
  };

  const handleFormatChange = (id: string, newFormat: string) => {
    const existing = itemsRef.current.find((i) => i.id === id);
    revokeItemUrls(existing);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              targetFormat: newFormat,
              status: 'idle',
              progress: 0,
              error: undefined,
              convertedName: undefined,
              convertedSize: undefined,
              convertedBlob: undefined,
              convertedUrl: undefined,
              extraOutputs: undefined,
            }
          : i
      )
    );
  };

  const handleBatchFormatChange = (newFormat: string) => {
    setBatchTargetFormat(newFormat);
    setItems((prev) =>
      prev.map((i) =>
        i.status !== 'completed' && i.status !== 'converting'
          ? { ...i, targetFormat: newFormat }
          : i
      )
    );
  };

  const handleUpdateOptions = (itemId: string, newOptions: ConversionOptions) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, options: newOptions } : i))
    );
  };

  // Single-item execution
  const handleConvertSingle = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const effectiveItem: FileConversionItem =
      toolMode === 'split-pdf'
        ? {
            ...item,
            options: {
              ...item.options,
              isSplitPdf: true,
              splitMode,
              pageRange:
                item.options.pageRange ||
                (selectedSplitPages.length > 0 ? selectedSplitPages.join(',') : 'all'),
            },
          }
        : toolMode === 'compress-pdf'
        ? {
            ...item,
            options: {
              ...item.options,
              isCompressOnly: true,
              pdfCompression: pdfCompressionPreset,
            },
          }
        : toolMode === 'rotate-pdf'
        ? {
            ...item,
            options: {
              ...item.options,
              isRotatePdf: true,
              pdfRotation,
            },
          }
        : toolMode === 'add-page-numbers'
        ? {
            ...item,
            options: {
              ...item.options,
              isPageNumbersPdf: true,
              pageNumberPosition,
            },
          }
        : toolMode === 'watermark-pdf'
        ? {
            ...item,
            options: {
              ...item.options,
              isWatermarkPdf: true,
              watermarkText,
              watermarkOpacity,
            },
          }
        : toolMode === 'resize-image'
        ? {
            ...item,
            options: {
              ...item.options,
              isResizeImage: true,
              resizeMode: item.options.resizeMode === 'original' ? resizeMode : (item.options.resizeMode || resizeMode),
              percentage: item.options.percentage ?? resizePercentage,
              width: item.options.width ?? resizeWidth,
              height: item.options.height ?? resizeHeight,
            },
          }
        : item.category === 'pdf' && item.targetFormat.toLowerCase() === 'docx'
        ? {
            ...item,
            options: {
              ...item.options,
              pdfConversionMode: item.options.pdfConversionMode || pdfConversionMode,
            },
          }
        : item;

    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: 'converting', progress: 8, statusMessage: 'Starting...', error: undefined }
          : i
      )
    );

    const metricTool = toolSlug || `${item.originalExtension}-to-${item.targetFormat}`;
    trackConversionStarted(metricTool, item.category, effectiveItem.targetFormat);

    try {
      const result = await processConversionItem(effectiveItem, (progress, message) => {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, progress, statusMessage: message } : i))
        );
      });

      revokeItemUrls(item);
      const convertedUrl = URL.createObjectURL(result.blob);

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status: 'completed',
                progress: 100,
                convertedBlob: result.blob,
                convertedUrl,
                convertedName: result.convertedName,
                convertedSize: result.size,
                processorMode: result.processorMode,
                extraOutputs: result.extraOutputs,
                statusMessage: 'Ready',
              }
            : i
        )
      );

      pushToHistory({
        sourceName: item.name,
        convertedName: result.convertedName,
        originalSize: item.size,
        convertedSize: result.size,
        targetFormat: item.targetFormat,
        processorMode: result.processorMode,
        blob: result.blob,
      });

      trackConversionCompleted(
        metricTool,
        item.category,
        result.processorMode,
        result.durationMs ?? 0
      );

      celebrate(28, 48);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'We could not convert this file. Please try again.';
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'error', progress: 0, error: message } : i))
      );

      trackConversionFailed(
        metricTool,
        item.category,
        message.toLowerCase().includes('size') ? 'output_not_smaller' : 'conversion_error'
      );
    }
  };

  // Batch Merge PDF or Combine Images to 1 PDF
  const handleCombineBatch = async () => {
    if (items.length === 0) return;
    setIsBatchCombining(true);
    setErrorBanner(null);

    const jobId = `combine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = performance.now();
    const combineCategory = toolMode === 'merge-pdf' ? 'pdf' : 'image';
    trackConversionStarted(toolSlug || toolMode, combineCategory, 'pdf');

    try {
      const files = items.map((i) => i.file);
      const totalOriginal = items.reduce((acc, i) => acc + i.size, 0);
      const [{ mergePdfFiles, imagesToPdf }, { validateConvertedOutput }] = await Promise.all([
        import('../utils/pdfHelpers'),
        import('../utils/outputValidator'),
      ]);

      let blob: Blob;
      let outputName: string;

      if (toolMode === 'merge-pdf') {
        if (files.length < 2) {
          throw new Error('Please upload at least 2 PDF files to merge them together.');
        }
        blob = await mergePdfFiles(files);
        outputName = 'fylovanta-merged.pdf';
        await validateConvertedOutput(blob, { targetFormat: 'pdf', minPdfPageCount: 2 });
      } else {
        const firstOpts = items[0]?.options || {};
        blob = await imagesToPdf(files, firstOpts);
        outputName = 'fylovanta-images.pdf';
        await validateConvertedOutput(blob, {
          targetFormat: 'pdf',
          expectedPdfPageCount: files.length,
        });
      }

      setCombinedResult({
        name: outputName,
        blob,
        size: blob.size,
        originalSize: totalOriginal,
      });

      pushToHistory({
        sourceName: `${files.length} files combined`,
        convertedName: outputName,
        originalSize: totalOriginal,
        convertedSize: blob.size,
        targetFormat: 'pdf',
        processorMode: 'browser',
        blob,
      });

      trackConversionCompleted(
        toolSlug || toolMode,
        combineCategory,
        'browser',
        performance.now() - startedAt
      );

      celebrate(32, 55);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to combine files.';
      setErrorBanner(msg);
      trackConversionFailed(toolSlug || toolMode, combineCategory, 'combine_error');
    } finally {
      setIsBatchCombining(false);
    }
  };

  const handleConvertAll = async () => {
    const idleItems = items.filter((i) => i.status === 'idle' || i.status === 'error');
    if (idleItems.length === 0) return;
    for (const item of idleItems) {
      await handleConvertSingle(item.id);
    }
  };

  const handleDownloadAllZip = async () => {
    try {
      const zipBlob = await createZipArchive(items);
      triggerDownload(zipBlob, 'fylovanta-converted-files.zip');
      trackDownloadCompleted(toolSlug || 'batch', 'zip', true);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to create ZIP archive.');
    }
  };

  const handleClearAll = () => {
    itemsRef.current.forEach((it) => revokeItemUrls(it));
    setItems([]);
    setCombinedResult(null);
    setSplitThumbnails([]);
    setSelectedSplitPages([]);
    setErrorBanner(null);
  };

  const toggleSplitPage = (pageNum: number) => {
    setSelectedSplitPages((prev) =>
      prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b)
    );
  };

  const isCombineMode =
    toolMode === 'merge-pdf' || (toolMode === 'images-to-pdf' && combineImagesIntoOne);

  const hideFormatDropdown =
    toolMode === 'merge-pdf' ||
    toolMode === 'split-pdf' ||
    toolMode === 'compress-pdf' ||
    toolMode === 'rotate-pdf' ||
    toolMode === 'add-page-numbers' ||
    toolMode === 'watermark-pdf';

  return (
    <div className="w-full space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptAttr}
        onChange={onFileInputChange}
        className="hidden"
        id="file-upload-input"
      />

      {/* Inline Error Banner */}
      {errorBanner && (
        <div
          role="alert"
          className="p-3.5 bg-white border border-[#DC2626]/40 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm text-[#DC2626] font-medium shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            aria-label="Dismiss error"
            className="p-1 hover:bg-[#F7F9FC] rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PDF-to-Word Strategy Selector (shown before & during queue when converting PDF -> DOCX) */}
      {(toolSlug === 'pdf-to-word' ||
        items.some((it) => it.category === 'pdf' && it.targetFormat.toLowerCase() === 'docx')) && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs sm:text-sm font-bold text-[#0F172A]">
              PDF to Word Conversion Mode
            </div>
            <span className="text-[11px] font-medium text-[#475569]">
              Choose editable structure or fixed-layout page replica
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {([
              {
                id: 'editable',
                name: 'Editable Word (.docx)',
                desc: 'Reconstructs editable text, fonts, colors, lists, tables, and extracted images. Complex multi-column layouts may vary slightly.',
              },
              {
                id: 'visual-replica',
                name: 'Visual Replica Word (.docx)',
                desc: 'Embeds high-DPI rendered PDF pages with exact spacing and page sizes. Pages are fixed images and not individually editable.',
              },
            ] as const).map((mode) => {
              const selected = pdfConversionMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  data-pdf-mode={mode.id}
                  aria-pressed={selected}
                  onClick={() => {
                    setPdfConversionMode(mode.id);
                    setItems((prev) =>
                      prev.map((it) =>
                        it.category === 'pdf' && it.targetFormat.toLowerCase() === 'docx' && it.status !== 'converting'
                          ? { ...it, options: { ...it.options, pdfConversionMode: mode.id } }
                          : it
                      )
                    );
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[44px] ${
                    selected
                      ? 'border-[#2563EB] bg-[#F7F9FC] ring-2 ring-[#2563EB]/20'
                      : 'border-[#CBD5E1] bg-white hover:bg-[#F7F9FC]/60'
                  }`}
                >
                  <div className="text-xs font-bold text-[#0F172A]">{mode.name}</div>
                  <div className="text-[11px] text-[#475569] mt-0.5 leading-snug">{mode.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dropzone Empty State */}
      {items.length === 0 ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 text-center transition-all bg-white border-[#CBD5E1] shadow-xs hover:shadow-sm ${
            isDragging
              ? 'border-[#2563EB] bg-[#EEF2F6] scale-[1.01] ring-4 ring-[#2563EB]/15'
              : 'hover:border-[#2563EB]'
          }`}
        >
          <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto">
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center mb-4 sm:mb-5 transition-all ${
                isDragging
                  ? 'bg-[#2563EB] text-white border-[#2563EB] scale-105'
                  : 'bg-[#F7F9FC] border-[#CBD5E1] text-[#2563EB] group-hover:border-[#2563EB]'
              }`}
            >
              <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight mb-1.5">
              {title || 'Drop your files here'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] mb-5 sm:mb-6 max-w-md leading-relaxed">
              {subtitle ||
                'Convert, compress, resize, and organize PDFs, images, and documents privately in your browser.'}
            </p>

            <button
              type="button"
              id="browse-files-btn"
              className="w-full sm:w-auto min-h-[44px] px-7 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-98 text-white font-bold text-sm rounded-xl shadow-xs transition-all inline-flex items-center justify-center space-x-2.5 cursor-pointer whitespace-nowrap"
            >
              <FilePlus className="w-4 h-4 text-[#38BDF8]" />
              <span>{browseLabel}</span>
            </button>

            <p className="text-[11px] sm:text-xs text-[#475569] mt-5 font-medium">
              {FEATURES.mediaToolsEnabled
                ? 'JPG · PNG · WebP · HEIC · SVG · PDF · DOCX · CSV · MP4 · MOV · MP3 · WAV'
                : 'JPG · PNG · WebP · SVG · BMP · ICO · PDF · DOCX · CSV · JSON · MD · TXT'}
            </p>

            <div className="mt-2.5 flex items-center space-x-1.5 text-[11px] sm:text-xs font-semibold text-[#16A34A]">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Processed directly in your browser · Files stay on your device</span>
            </div>
          </div>
        </div>
      ) : (
        /* Active Queue Workspace */
        <div className="space-y-3.5">
          {/* Compress PDF Preset Selector */}
          {toolMode === 'compress-pdf' && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 space-y-2.5">
              <div className="text-xs font-bold text-[#0F172A]">Select PDF Compression Level</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'high', name: 'Extreme Compression', desc: 'Smallest size · 72 DPI screen' },
                  { id: 'medium', name: 'Recommended', desc: 'Balanced quality · 150 DPI' },
                  { id: 'low', name: 'Less Compression', desc: 'High clarity · 300 DPI print' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPdfCompressionPreset(preset.id as 'low' | 'medium' | 'high')}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      pdfCompressionPreset === preset.id
                        ? 'border-[#2563EB] bg-[#F7F9FC]'
                        : 'border-[#CBD5E1] bg-white hover:bg-[#F7F9FC]/60'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#0F172A]">{preset.name}</div>
                    <div className="text-[11px] text-[#475569] mt-0.5">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resize Image Inline Controls */}
          {toolMode === 'resize-image' && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-[#0F172A]">Image Resize Dimensions</div>
                <div className="flex items-center gap-1 p-1 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setResizeMode('percentage')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      resizeMode === 'percentage' ? 'bg-[#0F172A] text-white' : 'text-[#475569]'
                    }`}
                  >
                    By Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setResizeMode('custom')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      resizeMode === 'custom' ? 'bg-[#0F172A] text-white' : 'text-[#475569]'
                    }`}
                  >
                    Exact Pixels
                  </button>
                </div>
              </div>

              {resizeMode === 'percentage' ? (
                <div className="flex flex-wrap items-center gap-2">
                  {[25, 50, 75, 80, 125].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setResizePercentage(pct)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold tabular-nums cursor-pointer ${
                        resizePercentage === pct
                          ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                          : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-[#475569] font-medium">Custom %:</span>
                    <input
                      type="number"
                      min={10}
                      max={300}
                      value={resizePercentage}
                      onChange={(e) => setResizePercentage(Math.max(10, Math.min(300, parseInt(e.target.value, 10) || 80)))}
                      className="w-20 px-2.5 py-1 bg-[#F7F9FC] border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#0F172A] text-center tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      min={16}
                      placeholder="Auto"
                      value={resizeWidth || ''}
                      onChange={(e) => setResizeWidth(parseInt(e.target.value, 10) || undefined)}
                      className="w-full px-3 py-1.5 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F172A] tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#475569] mb-1">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      min={16}
                      placeholder="Auto"
                      value={resizeHeight || ''}
                      onChange={(e) => setResizeHeight(parseInt(e.target.value, 10) || undefined)}
                      className="w-full px-3 py-1.5 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0F172A] tabular-nums"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rotate PDF Inline Controls */}
          {toolMode === 'rotate-pdf' && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 space-y-2.5">
              <div className="text-xs font-bold text-[#0F172A]">Select PDF Rotation Angle</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { deg: 90, label: '90° Clockwise' },
                  { deg: 180, label: '180° Flip' },
                  { deg: 270, label: '270° (90° Left)' },
                ] as const).map((opt) => (
                  <button
                    key={opt.deg}
                    type="button"
                    onClick={() => setPdfRotation(opt.deg)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      pdfRotation === opt.deg
                        ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                        : 'border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F7F9FC]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Page Numbers Inline Controls */}
          {toolMode === 'add-page-numbers' && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 space-y-2.5">
              <div className="text-xs font-bold text-[#0F172A]">Page Number Placement</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'bottom-center', label: 'Bottom Center' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                  { id: 'top-right', label: 'Top Right' },
                ] as const).map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPageNumberPosition(pos.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                      pageNumberPosition === pos.id
                        ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                        : 'border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F7F9FC]'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Watermark PDF Inline Controls */}
          {toolMode === 'watermark-pdf' && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="CONFIDENTIAL"
                    className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-xs font-semibold text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1 tabular-nums">
                    Watermark Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={0.6}
                    step={0.05}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full h-2 mt-2 bg-[#F7F9FC] border border-[#CBD5E1] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Images-to-PDF Combine Mode Toggle */}
          {toolMode === 'images-to-pdf' && items.length > 1 && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[#0F172A]">
                Combine all {items.length} images into a single multi-page PDF?
              </div>
              <div className="flex items-center gap-1 p-1 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setCombineImagesIntoOne(true);
                    setCombinedResult(null);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    combineImagesIntoOne ? 'bg-[#0F172A] text-white' : 'text-[#475569]'
                  }`}
                >
                  Single PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCombineImagesIntoOne(false);
                    setCombinedResult(null);
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    !combineImagesIntoOne ? 'bg-[#0F172A] text-white' : 'text-[#475569]'
                  }`}
                >
                  Separate PDFs
                </button>
              </div>
            </div>
          )}

          {/* Split PDF Interactive Page Selector */}
          {toolMode === 'split-pdf' && splitThumbnails.length > 0 && (
            <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                    Select Pages to Extract ({selectedSplitPages.length} of {splitThumbnails.length} previewed selected)
                  </h4>
                  <p className="text-[11px] text-[#475569]">
                    Click pages below to toggle selection, or enter custom ranges (e.g. 1-30) in Advanced Settings.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSplitPages(splitThumbnails.map((t) => t.pageNumber))}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#CBD5E1] bg-[#F7F9FC] hover:bg-[#EEF2F6] text-[#0F172A] cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSplitPages([])}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F7F9FC] text-[#475569] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSplitMode('range')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                        splitMode === 'range' ? 'bg-[#0F172A] text-white' : 'text-[#475569]'
                      }`}
                    >
                      1 Extracted PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('extract-all')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                        splitMode === 'extract-all' ? 'bg-[#0F172A] text-white' : 'text-[#475569]'
                      }`}
                    >
                      Separate PDFs (ZIP)
                    </button>
                  </div>
                </div>
              </div>

              {items.some((it) => typeof it.pageCount === 'number' && it.pageCount > splitThumbnails.length) && (
                <div className="px-3 py-2 rounded-xl bg-[#F7F9FC] border border-[#CBD5E1] text-[11px] text-[#475569]">
                  Preview thumbnails are capped at the first {splitThumbnails.length} pages for fast browser performance. Open the gear icon on your file card to enter a custom Page Range covering all pages (or select Separate PDFs mode).
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1">
                {splitThumbnails.map((thumb) => {
                  const selected = selectedSplitPages.includes(thumb.pageNumber);
                  return (
                    <button
                      key={thumb.pageNumber}
                      type="button"
                      onClick={() => toggleSplitPage(thumb.pageNumber)}
                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        selected
                          ? 'border-[#2563EB] bg-[#F7F9FC] ring-2 ring-[#2563EB]/25'
                          : 'border-[#CBD5E1] opacity-55 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={thumb.dataUrl}
                        alt={`Page ${thumb.pageNumber}`}
                        className="w-full h-20 object-contain bg-white rounded border border-[#CBD5E1]/60"
                      />
                      <span className="text-[11px] font-bold text-[#0F172A] mt-1 block tabular-nums">
                        Page {thumb.pageNumber}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Batch Control Bar */}
          <BatchControls
            items={items}
            batchTargetFormat={batchTargetFormat}
            onBatchFormatChange={handleBatchFormatChange}
            onConvertAll={handleConvertAll}
            onDownloadAllZip={handleDownloadAllZip}
            onAddMoreClick={() => fileInputRef.current?.click()}
            onClearAll={handleClearAll}
            hideGlobalFormatPicker={hideFormatDropdown || toolMode === 'images-to-pdf'}
            specialActionLabel={
              toolMode === 'merge-pdf'
                ? `Merge ${items.length} PDFs`
                : toolMode === 'images-to-pdf' && combineImagesIntoOne
                ? `Create PDF (${items.length} ${items.length === 1 ? 'Image' : 'Images'})`
                : undefined
            }
            onSpecialAction={isCombineMode ? handleCombineBatch : undefined}
            isSpecialProcessing={isBatchCombining}
          />

          {/* Combined Merge PDF / Images-to-PDF Ready Result Banner */}
          {combinedResult && (
            <div className="bg-white border border-[#16A34A] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7F9FC] border border-[#CBD5E1] flex items-center justify-center text-[#16A34A] shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0F172A]">{combinedResult.name}</div>
                  <div className="text-xs text-[#475569] tabular-nums">
                    Combined {items.length} files ·{' '}
                    <span className="font-mono-tabular font-bold text-[#0F172A]">
                      {formatBytes(combinedResult.size)}
                    </span>{' '}
                    · In-Browser
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerDownload(combinedResult.blob, combinedResult.name);
                  trackDownloadCompleted(toolSlug || toolMode, 'pdf', false);
                }}
                className="min-h-[40px] px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Combined PDF</span>
              </button>
            </div>
          )}

          {/* File Queue List */}
          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <FileItemCard
                key={item.id}
                item={item}
                index={idx}
                totalCount={items.length}
                reorderable={isCombineMode}
                hideFormatPicker={hideFormatDropdown || isCombineMode}
                hideSingleConvert={isCombineMode}
                onMoveUp={(i) => handleMoveItem(i, -1)}
                onMoveDown={(i) => handleMoveItem(i, 1)}
                onRemove={handleRemoveItem}
                onFormatChange={handleFormatChange}
                onOpenSettings={(it) => setActiveSettingsItem(it)}
                onConvertSingle={handleConvertSingle}
                onDownloaded={(fmt, isZip) =>
                  trackDownloadCompleted(toolSlug || item.category, fmt, isZip)
                }
              />
            ))}
          </div>

          {/* Add More Drop Target */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-3.5 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-[#2563EB] bg-[#EEF2F6]'
                : 'border-[#CBD5E1] hover:border-[#2563EB] bg-white'
            }`}
          >
            <p className="text-xs font-bold text-[#0F172A] flex items-center justify-center space-x-1.5">
              <FilePlus className="w-4 h-4 text-[#2563EB]" />
              <span>Drag more files here or click to add</span>
            </p>
          </div>
        </div>
      )}

      {/* Session Conversion History Tray */}
      {history.length > 0 && (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]">
              <History className="w-4 h-4 text-[#2563EB]" />
              <span>Recent Conversions ({history.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setHistory([])}
              className="text-[11px] font-semibold text-[#475569] hover:text-[#0F172A] cursor-pointer"
            >
              Clear history
            </button>
          </div>
          <div className="divide-y divide-[#CBD5E1]/70">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="py-2 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[#0F172A] truncate">{entry.convertedName}</div>
                  <div className="text-[11px] text-[#475569] tabular-nums">
                    <span className="font-mono-tabular">{formatBytes(entry.originalSize)}</span> →{' '}
                    <span className="font-mono-tabular font-semibold text-[#0F172A]">
                      {formatBytes(entry.convertedSize)}
                    </span>{' '}
                    · {entry.processorMode === 'browser' ? 'In-Browser' : 'Server Engine'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerDownload(entry.blob, entry.convertedName)}
                  className="px-3 py-1.5 bg-[#F7F9FC] hover:bg-[#EEF2F6] border border-[#CBD5E1] rounded-lg text-[11px] font-bold text-[#2563EB] shrink-0 cursor-pointer"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdvancedSettingsModal
        item={activeSettingsItem}
        isOpen={!!activeSettingsItem}
        onClose={() => setActiveSettingsItem(null)}
        onUpdateOptions={handleUpdateOptions}
      />
    </div>
  );
};
