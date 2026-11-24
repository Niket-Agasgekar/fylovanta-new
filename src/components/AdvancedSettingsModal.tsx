import React from 'react';
import { X, Sliders, Check, RotateCw } from 'lucide-react';
import { FileConversionItem, ConversionOptions } from '../types';

interface AdvancedSettingsModalProps {
  item: FileConversionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateOptions: (itemId: string, newOptions: ConversionOptions) => void;
}

export const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateOptions,
}) => {
  if (!isOpen || !item) return null;

  const { options, category, targetFormat } = item;
  const tgt = targetFormat.toLowerCase();
  const isImage = category === 'image' && tgt !== 'pdf';
  const isPdf = category === 'pdf' || tgt === 'pdf';
  const isDocument = category === 'document' && !isPdf;
  const isAudio =
    category === 'audio' || ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'].includes(tgt);
  const isVideo =
    (category === 'video' || ['mp4', 'webm', 'gif'].includes(tgt)) && !isAudio;

  const handleQualityChange = (val: number) => {
    onUpdateOptions(item.id, { ...options, quality: val });
  };

  const handleRotate = () => {
    const current = options.rotate || 0;
    const next = (current + 90) % 360;
    onUpdateOptions(item.id, { ...options, rotate: next });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1120]/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#CBD5E1] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#CBD5E1] bg-[#F7F9FC]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#CBD5E1] text-[#2563EB] flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#0F172A] leading-tight">
                Conversion Settings
              </h3>
              <p className="text-xs text-[#475569] truncate max-w-[280px]">
                {item.name} → <span className="font-bold uppercase text-[#2563EB]">{targetFormat}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 text-[#475569] hover:text-[#0F172A] hover:bg-[#EEF2F6] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* IMAGE SETTINGS */}
          {isImage && (
            <>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs sm:text-sm font-bold text-[#0F172A] tabular-nums">
                    Output Quality ({Math.round((options.quality ?? 0.92) * 100)}%)
                  </label>
                  <span className="text-xs text-[#475569]">
                    {(options.quality ?? 0.92) > 0.85
                      ? 'High Fidelity'
                      : (options.quality ?? 0.92) > 0.6
                      ? 'Balanced'
                      : 'Compact Size'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={options.quality ?? 0.92}
                  onChange={(e) => handleQualityChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#F7F9FC] border border-[#CBD5E1] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                />
                <div className="flex justify-between text-[11px] text-[#475569] mt-1">
                  <span>Smallest file</span>
                  <span>Default (92%)</span>
                  <span>Maximum quality</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#CBD5E1]">
                <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-2">
                  Image Resizing
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['original', 'percentage', 'custom'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onUpdateOptions(item.id, { ...options, resizeMode: mode })}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border text-center capitalize transition-colors cursor-pointer ${
                        (options.resizeMode || 'original') === mode
                          ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                          : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {options.resizeMode === 'percentage' && (
                  <div className="flex items-center space-x-3 bg-[#F7F9FC] p-3 rounded-2xl border border-[#CBD5E1]">
                    <span className="text-xs font-bold text-[#0F172A]">Scale:</span>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={options.percentage ?? 80}
                      onChange={(e) =>
                        onUpdateOptions(item.id, {
                          ...options,
                          percentage: parseInt(e.target.value, 10) || 80,
                        })
                      }
                      className="w-20 px-2 py-1 bg-white border border-[#CBD5E1] rounded-lg text-sm font-bold text-center tabular-nums"
                    />
                    <span className="text-xs text-[#475569]">% of original dimensions</span>
                  </div>
                )}

                {options.resizeMode === 'custom' && (
                  <div className="space-y-2 bg-[#F7F9FC] p-3 rounded-2xl border border-[#CBD5E1]">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <span className="text-[11px] text-[#475569] font-medium">Width (px)</span>
                        <input
                          type="number"
                          placeholder="Auto"
                          value={options.width || ''}
                          onChange={(e) =>
                            onUpdateOptions(item.id, {
                              ...options,
                              width: parseInt(e.target.value, 10) || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-sm font-bold tabular-nums"
                        />
                      </div>
                      <span className="text-[#475569] mt-4">×</span>
                      <div className="flex-1">
                        <span className="text-[11px] text-[#475569] font-medium">Height (px)</span>
                        <input
                          type="number"
                          placeholder="Auto"
                          value={options.height || ''}
                          onChange={(e) =>
                            onUpdateOptions(item.id, {
                              ...options,
                              height: parseInt(e.target.value, 10) || undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-sm font-bold tabular-nums"
                        />
                      </div>
                    </div>
                    <label className="flex items-center space-x-2 pt-1 text-xs text-[#0F172A] font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={options.maintainAspectRatio !== false}
                        onChange={(e) =>
                          onUpdateOptions(item.id, {
                            ...options,
                            maintainAspectRatio: e.target.checked,
                          })
                        }
                        className="rounded text-[#2563EB] accent-[#2563EB]"
                      />
                      <span>Maintain aspect ratio</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#CBD5E1] flex items-center justify-between">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-[#0F172A] block">Rotate Image</span>
                  <span className="text-xs text-[#475569] tabular-nums">
                    Current angle: {options.rotate || 0}°
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F7F9FC] hover:bg-[#EEF2F6] text-[#0F172A] text-xs font-bold rounded-xl border border-[#CBD5E1] transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Rotate 90°</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-[#0F172A] block">Grayscale Filter</span>
                  <span className="text-xs text-[#475569]">Convert image to monochrome</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!options.grayscale}
                  onChange={(e) =>
                    onUpdateOptions(item.id, { ...options, grayscale: e.target.checked })
                  }
                  className="w-4 h-4 text-[#2563EB] accent-[#2563EB] rounded cursor-pointer"
                />
              </div>
            </>
          )}

          {/* PDF SETTINGS */}
          {isPdf && (
            <>
              {category === 'pdf' && tgt === 'docx' && (
                <div>
                  <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                    Word Conversion Strategy
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        id: 'editable',
                        title: 'Editable Word',
                        desc: 'Editable paragraphs, styles, lists, tables, and extracted images. Complex layouts may reflow slightly.',
                      },
                      {
                        id: 'visual-replica',
                        title: 'Visual Replica Word',
                        desc: 'High-DPI page images matching exact layout & dimensions. Pages are fixed images, not individually editable.',
                      },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          onUpdateOptions(item.id, {
                            ...options,
                            pdfConversionMode: mode.id as 'editable' | 'visual-replica',
                          })
                        }
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[44px] ${
                          (options.pdfConversionMode || 'editable') === mode.id
                            ? 'border-[#2563EB] bg-[#F7F9FC]'
                            : 'border-[#CBD5E1] bg-white hover:bg-[#F7F9FC]/60'
                        }`}
                      >
                        <div className="text-xs font-bold text-[#0F172A]">{mode.title}</div>
                        <div className="text-[11px] text-[#475569] mt-0.5 leading-snug">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                  PDF Page Orientation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['portrait', 'landscape', 'auto'] as const).map((orient) => (
                    <button
                      key={orient}
                      type="button"
                      onClick={() =>
                        onUpdateOptions(item.id, { ...options, pageOrientation: orient })
                      }
                      className={`px-3 py-2 text-xs font-bold rounded-xl border text-center capitalize transition-colors cursor-pointer ${
                        (options.pageOrientation || 'portrait') === orient
                          ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                          : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      {orient}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                  Page Size
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['a4', 'letter'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => onUpdateOptions(item.id, { ...options, pageSize: sz })}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border text-center uppercase transition-colors cursor-pointer ${
                        (options.pageSize || 'a4') === sz
                          ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                          : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {category === 'pdf' && tgt === 'pdf' && !options.isRotatePdf && !options.isPageNumbersPdf && !options.isWatermarkPdf && (
                <div>
                  <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                    PDF Compression Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'low', label: 'Low (300 DPI)' },
                      { id: 'medium', label: 'Balanced (150)' },
                      { id: 'high', label: 'Extreme (72)' },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() =>
                          onUpdateOptions(item.id, {
                            ...options,
                            pdfCompression: lvl.id as 'low' | 'medium' | 'high',
                          })
                        }
                        className={`px-2 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                          (options.pdfCompression || 'medium') === lvl.id
                            ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                            : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {category === 'pdf' && options.isRotatePdf && (
                <div>
                  <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                    Rotation Angle
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([90, 180, 270] as const).map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => onUpdateOptions(item.id, { ...options, pdfRotation: deg })}
                        className={`px-2 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                          (options.pdfRotation || 90) === deg
                            ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                            : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {category === 'pdf' && options.isPageNumbersPdf && (
                <div>
                  <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                    Page Number Position
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'bottom-center', label: 'Bottom Center' },
                      { id: 'bottom-right', label: 'Bottom Right' },
                      { id: 'top-right', label: 'Top Right' },
                    ] as const).map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => onUpdateOptions(item.id, { ...options, pageNumberPosition: pos.id })}
                        className={`px-2 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                          (options.pageNumberPosition || 'bottom-center') === pos.id
                            ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                            : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {category === 'pdf' && options.isWatermarkPdf && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1">
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={options.watermarkText ?? 'CONFIDENTIAL'}
                      onChange={(e) =>
                        onUpdateOptions(item.id, { ...options, watermarkText: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1 tabular-nums">
                      Watermark Opacity ({Math.round((options.watermarkOpacity ?? 0.22) * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.6"
                      step="0.05"
                      value={options.watermarkOpacity ?? 0.22}
                      onChange={(e) =>
                        onUpdateOptions(item.id, {
                          ...options,
                          watermarkOpacity: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-[#F7F9FC] border border-[#CBD5E1] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                    />
                  </div>
                </div>
              )}

              {category === 'pdf' && (
                <div>
                  <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1">
                    Page Range (e.g. 1-3, 5)
                  </label>
                  <input
                    type="text"
                    placeholder="All pages (or 1-5, 8)"
                    value={options.pageRange || ''}
                    onChange={(e) =>
                      onUpdateOptions(item.id, { ...options, pageRange: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#F7F9FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm text-[#0F172A]"
                  />
                  <span className="text-[11px] text-[#475569] mt-1 block">
                    Leave blank or enter &ldquo;all&rdquo; to process every page.
                  </span>
                </div>
              )}
            </>
          )}

          {/* AUDIO SETTINGS */}
          {isAudio && (
            <>
              <div>
                <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                  Audio Bitrate
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['128k', '192k', '256k', '320k'] as const).map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => onUpdateOptions(item.id, { ...options, audioBitrate: br })}
                      className={`px-2 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer tabular-nums ${
                        (options.audioBitrate || '192k') === br
                          ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                          : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      {br}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                  Sample Rate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([22050, 44100, 48000] as const).map((sr) => (
                    <button
                      key={sr}
                      type="button"
                      onClick={() => onUpdateOptions(item.id, { ...options, audioSampleRate: sr })}
                      className={`px-2 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer tabular-nums ${
                        (options.audioSampleRate || 44100) === sr
                          ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                          : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      {(sr / 1000).toFixed(1)} kHz
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                  Audio Channels
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateOptions(item.id, { ...options, audioChannels: '2' })}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                      (options.audioChannels || '2') === '2'
                        ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                        : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                    }`}
                  >
                    Stereo (2 ch)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateOptions(item.id, { ...options, audioChannels: '1' })}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer ${
                      options.audioChannels === '1'
                        ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                        : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                    }`}
                  >
                    Mono (1 ch)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* VIDEO / GIF SETTINGS */}
          {isVideo && (
            <>
              {tgt === 'gif' ? (
                <>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                      GIF Frame Rate (FPS)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 12, 15, 20].map((fps) => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => onUpdateOptions(item.id, { ...options, gifFps: fps })}
                          className={`px-2 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer tabular-nums ${
                            (options.gifFps || 12) === fps
                              ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                              : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                          }`}
                        >
                          {fps} FPS
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                      GIF Output Width
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[320, 480, 640].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => onUpdateOptions(item.id, { ...options, gifWidth: w })}
                          className={`px-2 py-2 text-xs font-bold rounded-xl border text-center transition-colors cursor-pointer tabular-nums ${
                            (options.gifWidth || 480) === w
                              ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                              : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                          }`}
                        >
                          {w} px
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                      Target Resolution
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['original', '1080p', '720p', '480p', '360p'] as const).map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() =>
                            onUpdateOptions(item.id, { ...options, videoResolution: res })
                          }
                          className={`px-2 py-2 text-xs font-bold rounded-xl border text-center capitalize transition-colors cursor-pointer ${
                            (options.videoResolution || 'original') === res
                              ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                              : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-bold text-[#0F172A] block mb-1.5">
                      Video Encoding Quality
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['high', 'medium', 'low'] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => onUpdateOptions(item.id, { ...options, videoQuality: q })}
                          className={`px-2 py-2 text-xs font-bold rounded-xl border text-center capitalize transition-colors cursor-pointer ${
                            (options.videoQuality || 'medium') === q
                              ? 'border-[#2563EB] bg-[#F7F9FC] text-[#2563EB]'
                              : 'border-[#CBD5E1] text-[#0F172A] hover:bg-[#F7F9FC]'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* DOCUMENT / DATA SETTINGS */}
          {isDocument && (
            <div className="bg-[#F7F9FC] border border-[#CBD5E1] rounded-2xl p-4 space-y-2 text-xs text-[#475569]">
              <div className="font-bold text-[#0F172A]">
                Local UTF-8 Document &amp; Data Formatting
              </div>
              <p className="leading-relaxed">
                This file will be parsed and converted to <strong className="text-[#0F172A] uppercase">{targetFormat}</strong> locally in your browser using UTF-8 encoding with zero external uploads.
              </p>
              <p className="text-[11px]">
                Tip: Switch the target format to <strong className="text-[#0F172A]">PDF</strong> if you want custom A4/Letter page sizing and portrait or landscape layout controls.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F7F9FC] border-t border-[#CBD5E1] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0F172A] hover:bg-[#0B1120] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4 text-[#38BDF8]" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
