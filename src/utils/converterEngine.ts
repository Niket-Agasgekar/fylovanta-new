import {
  FileCategory,
  FileConversionItem,
  ExtraOutputFile,
  ProcessorMode,
} from '../types';
import { SUPPORTED_FORMATS } from '../data/toolsData';
import { validateConvertedOutput } from './outputValidator';

export function detectFileInfo(file: File): {
  category: FileCategory;
  extension: string;
  mimeType: string;
} {
  const parts = file.name.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';

  if (SUPPORTED_FORMATS[ext]) {
    return {
      category: SUPPORTED_FORMATS[ext].category,
      extension: ext,
      mimeType: SUPPORTED_FORMATS[ext].mimeType,
    };
  }

  if (file.type.startsWith('image/')) return { category: 'image', extension: ext || 'png', mimeType: file.type };
  if (file.type === 'application/pdf') return { category: 'pdf', extension: 'pdf', mimeType: file.type };
  if (file.type.startsWith('audio/')) return { category: 'audio', extension: ext || 'mp3', mimeType: file.type };
  if (file.type.startsWith('video/')) return { category: 'video', extension: ext || 'mp4', mimeType: file.type };
  if (file.type.includes('text') || file.type.includes('document') || file.type.includes('json') || file.type.includes('csv')) {
    return { category: 'document', extension: ext || 'txt', mimeType: file.type };
  }

  return { category: 'document', extension: ext || 'txt', mimeType: file.type || 'application/octet-stream' };
}

export function sanitizeBaseFilename(filename: string): string {
  if (!filename || filename === 'undefined' || filename === 'null') {
    return 'file';
  }
  const cleanName = filename.replace(/\.[^/.]+$/, '').trim();
  return cleanName || 'file';
}

export interface ProcessConversionResult {
  blob: Blob;
  convertedName: string;
  size: number;
  processorMode: ProcessorMode;
  extraOutputs?: ExtraOutputFile[];
  durationMs: number;
}

export async function processConversionItem(
  item: FileConversionItem,
  onProgress: (progress: number, message: string) => void
): Promise<ProcessConversionResult> {
  const startTime = Date.now();
  const targetExt = item.targetFormat.toLowerCase();
  const baseName = sanitizeBaseFilename(item.name);
  let finalName = `${baseName}.${targetExt}`;

  let resultBlob: Blob;
  let processorMode: ProcessorMode = 'browser';
  let extraOutputs: ExtraOutputFile[] | undefined;

  if (!item.file || item.file.size === 0) {
    throw new Error(`"${item.name}" is empty (0 bytes) and cannot be converted.`);
  }

  try {
    if (item.category === 'pdf' || targetExt === 'pdf') {
      const pdfHelpers = await import('./pdfHelpers');

      if (item.options.isMergePdf) {
        resultBlob = await pdfHelpers.mergePdfFiles([item.file], onProgress);
        finalName = `${baseName}-merged.pdf`;
      } else if (item.options.isSplitPdf) {
        const splitRes = await pdfHelpers.splitPdfFile(
          item.file,
          item.options.pageRange,
          onProgress,
          item.options.splitMode || 'range'
        );
        resultBlob = splitRes.blob;
        finalName = splitRes.convertedName;
        extraOutputs = splitRes.extraOutputs;
      } else if (item.options.isCompressOnly && item.category === 'pdf') {
        const compRes = await pdfHelpers.compressPdfFile(
          item.file,
          item.options.pdfCompression,
          onProgress,
          item.id
        );
        resultBlob = compRes.blob;
        processorMode = compRes.processorMode;
        finalName = `${baseName}-compressed.pdf`;
      } else if (item.options.isRotatePdf && item.category === 'pdf') {
        resultBlob = await pdfHelpers.rotatePdfFile(
          item.file,
          item.options.pdfRotation || 90,
          item.options.pageRange,
          onProgress
        );
        finalName = `${baseName}-rotated.pdf`;
      } else if (item.options.isPageNumbersPdf && item.category === 'pdf') {
        resultBlob = await pdfHelpers.addPdfPageNumbers(
          item.file,
          item.options.pageNumberPosition || 'bottom-center',
          onProgress
        );
        finalName = `${baseName}-numbered.pdf`;
      } else if (item.options.isWatermarkPdf && item.category === 'pdf') {
        resultBlob = await pdfHelpers.watermarkPdfFile(
          item.file,
          item.options.watermarkText || 'CONFIDENTIAL',
          item.options.watermarkOpacity ?? 0.22,
          onProgress
        );
        finalName = `${baseName}-watermarked.pdf`;
      } else if (item.category === 'pdf' && ['jpg', 'jpeg', 'png', 'webp'].includes(targetExt)) {
        const fmt = targetExt === 'jpeg' ? 'jpg' : (targetExt as 'jpg' | 'png' | 'webp');
        const imgRes = await pdfHelpers.pdfToImages(item.file, fmt, item.options, onProgress);
        resultBlob = imgRes.blob;
        finalName = imgRes.convertedName;
        extraOutputs = imgRes.extraOutputs;
      } else if (item.category === 'pdf' && targetExt === 'txt') {
        resultBlob = await pdfHelpers.pdfToText(item.file, onProgress);
      } else if (item.category === 'pdf' && targetExt === 'docx') {
        resultBlob = await pdfHelpers.pdfToDocx(item.file, item.options, onProgress);
      } else if (item.category === 'pdf' && targetExt === 'pdf') {
        const compRes = await pdfHelpers.compressPdfFile(
          item.file,
          item.options.pdfCompression || 'medium',
          onProgress,
          item.id
        );
        resultBlob = compRes.blob;
        processorMode = compRes.processorMode;
      } else if (item.category === 'image' && targetExt === 'pdf') {
        resultBlob = await pdfHelpers.imagesToPdf([item.file], item.options, onProgress);
      } else if (item.category === 'document' && targetExt === 'pdf') {
        const { convertDocumentFile } = await import('./documentConverter');
        resultBlob = await convertDocumentFile(
          item.file,
          item.originalExtension,
          targetExt,
          onProgress,
          item.options
        );
      } else {
        throw new Error(`Unsupported conversion from .${item.originalExtension} to .${targetExt}.`);
      }
    } else if (item.category === 'image') {
      const { convertImageFile } = await import('./imageConverter');
      const imgRes = await convertImageFile(item.file, targetExt, item.options, onProgress, item.id);
      resultBlob = imgRes.blob;
      processorMode = imgRes.processorMode;
    } else if (item.category === 'document') {
      const { convertDocumentFile } = await import('./documentConverter');
      resultBlob = await convertDocumentFile(
        item.file,
        item.originalExtension,
        targetExt,
        onProgress,
        item.options
      );
    } else if (item.category === 'video') {
      const { convertVideoFile } = await import('./videoConverter');
      const vidRes = await convertVideoFile(item.file, targetExt, item.options, onProgress, item.id);
      resultBlob = vidRes.blob;
      processorMode = vidRes.processorMode;
    } else if (item.category === 'audio') {
      const { convertAudioFile } = await import('./audioEncoder');
      const audRes = await convertAudioFile(item.file, targetExt, item.options, onProgress, item.id);
      resultBlob = audRes.blob;
      processorMode = audRes.processorMode;
    } else {
      throw new Error(`Unsupported conversion from .${item.originalExtension} to .${targetExt}.`);
    }

    // Mandatory pre-success output validation
    const actualExt = finalName.split('.').pop()?.toLowerCase() || targetExt;
    const isVisualReplicaDocx =
      actualExt === 'docx' &&
      item.category === 'pdf' &&
      item.options.pdfConversionMode === 'visual-replica';

    await validateConvertedOutput(resultBlob, {
      targetFormat: actualExt,
      expectReadableText:
        actualExt === 'docx' &&
        !isVisualReplicaDocx &&
        (item.category === 'pdf' || item.category === 'document'),
      expectVisualOrText: isVisualReplicaDocx,
      expectedPdfPageCount:
        item.category === 'image' && actualExt === 'pdf' ? 1 : undefined,
      minArchiveEntries: actualExt === 'zip' ? extraOutputs?.length || 1 : undefined,
    });

    if (extraOutputs && extraOutputs.length > 0) {
      for (const extra of extraOutputs) {
        const extraExt = extra.name.split('.').pop()?.toLowerCase() || targetExt;
        await validateConvertedOutput(extra.blob, {
          targetFormat: extraExt,
          expectedPdfPageCount: extraExt === 'pdf' ? 1 : undefined,
        });
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'We could not convert this file. Please try again.';
    throw new Error(errorMsg);
  }

  const durationMs = Date.now() - startTime;
  item.timeTakenMs = durationMs;

  return {
    blob: resultBlob,
    convertedName: finalName,
    size: resultBlob.size,
    processorMode,
    extraOutputs,
    durationMs,
  };
}

export async function createZipArchive(items: FileConversionItem[]): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const completed = items.filter((it) => it.status === 'completed' && it.convertedBlob && it.convertedBlob.size > 0);
  if (completed.length === 0) {
    throw new Error('No successfully converted files available to download.');
  }

  const usedNames = new Set<string>();

  for (let idx = 0; idx < completed.length; idx++) {
    const item = completed[idx];
    const targetExt = item.targetFormat.toLowerCase();
    const baseName = sanitizeBaseFilename(item.name);
    let filename = item.convertedName || `${baseName}.${targetExt}`;

    if (usedNames.has(filename)) {
      const dotIdx = filename.lastIndexOf('.');
      const namePart = dotIdx !== -1 ? filename.slice(0, dotIdx) : filename;
      const extPart = dotIdx !== -1 ? filename.slice(dotIdx) : `.${targetExt}`;
      let counter = 2;
      while (usedNames.has(`${namePart}-${counter}${extPart}`)) {
        counter++;
      }
      filename = `${namePart}-${counter}${extPart}`;
    }

    usedNames.add(filename);
    zip.file(filename, item.convertedBlob!);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  await validateConvertedOutput(zipBlob, {
    targetFormat: 'zip',
    minArchiveEntries: completed.length,
  });

  return zipBlob;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function triggerDownload(blob: Blob, filename: string): void {
  if (!blob || blob.size === 0) {
    throw new Error('The converted file could not be generated correctly. Please try again.');
  }
  const safeFilename = filename && filename.trim() ? filename.trim() : 'fylovanta-output';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 60000);
}
