export type FileCategory = 'image' | 'pdf' | 'document' | 'audio' | 'video' | 'archive';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja';

export type LegalPageSlug =
  | 'privacy-policy'
  | 'terms'
  | 'cookies'
  | 'about'
  | 'contact'
  | 'security'
  | 'disclaimer'
  | 'copyright-policy'
  | 'accessibility'
  | 'faq';

export type CategoryPageSlug =
  | 'pdf-tools'
  | 'image-tools'
  | 'video-tools'
  | 'audio-tools'
  | 'document-tools'
  | 'file-utilities';

export interface CategoryLandingConfig {
  slug: CategoryPageSlug;
  title: string;
  headline: string;
  description: string;
  categories: Array<FileCategory | 'compress' | 'utility'>;
  featuredSlugs: string[];
}

export type ProcessorMode = 'browser' | 'server';

export interface FormatInfo {
  extension: string;
  name: string;
  category: FileCategory;
  mimeType: string;
  description: string;
  lossless?: boolean;
  supportsCompression?: boolean;
}

export interface ConversionOptions {
  // Image options
  quality?: number; // 0.1 to 1.0
  resizeMode?: 'original' | 'custom' | 'percentage';
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  percentage?: number;
  grayscale?: boolean;
  stripMetadata?: boolean;
  dpi?: number;
  rotate?: number; // 0, 90, 180, 270
  isResizeImage?: boolean;

  // PDF options
  pdfCompression?: 'low' | 'medium' | 'high';
  pageRange?: string; // e.g. "1-3, 5" or "all"
  splitMode?: 'range' | 'extract-all';
  pageSize?: 'a4' | 'letter' | 'auto';
  pageOrientation?: 'portrait' | 'landscape' | 'auto';
  imageMargin?: number;
  pdfRotation?: 90 | 180 | 270;
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'top-right';
  watermarkText?: string;
  watermarkOpacity?: number;
  pdfConversionMode?: 'editable' | 'visual-replica';

  // Audio options
  audioBitrate?: '64k' | '128k' | '192k' | '256k' | '320k';
  audioSampleRate?: 22050 | 44100 | 48000;
  audioChannels?: '1' | '2'; // mono, stereo
  audioVolume?: number; // 0.1 to 2.0

  // Video options
  videoResolution?: 'original' | '1080p' | '720p' | '480p' | '360p';
  videoFps?: 15 | 24 | 30 | 60;
  videoQuality?: 'high' | 'medium' | 'low';
  gifFps?: number;
  gifWidth?: number;
  loopCount?: number;

  // Tool specific
  isMergePdf?: boolean;
  isSplitPdf?: boolean;
  isCompressOnly?: boolean;
  isRotatePdf?: boolean;
  isPageNumbersPdf?: boolean;
  isWatermarkPdf?: boolean;
}

export type ConversionStatus = 'idle' | 'converting' | 'completed' | 'error' | 'cancelled';

export interface ExtraOutputFile {
  name: string;
  blob: Blob;
  size: number;
  previewUrl?: string;
}

export interface FileConversionItem {
  id: string;
  file: File;
  name: string;
  originalExtension: string;
  size: number;
  category: FileCategory;
  targetFormat: string;
  status: ConversionStatus;
  progress: number; // 0 to 100
  statusMessage?: string;
  processorMode?: ProcessorMode;
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedSize?: number;
  convertedName?: string;
  extraOutputs?: ExtraOutputFile[];
  pageCount?: number;
  error?: string;
  previewUrl?: string;
  options: ConversionOptions;
  timeTakenMs?: number;
}

export interface ConversionHistoryEntry {
  id: string;
  sourceName: string;
  convertedName: string;
  originalSize: number;
  convertedSize: number;
  targetFormat: string;
  processorMode: ProcessorMode;
  timestamp: number;
  blob: Blob;
}

export interface ToolDefinition {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: FileCategory | 'compress' | 'utility';
  sourceFormat?: string;
  targetFormat?: string;
  iconName: string;
  popular?: boolean;
  badge?: string;
  howToSteps?: string[];
  features?: string[];
}
