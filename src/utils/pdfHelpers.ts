import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  ImageRun,
  AlignmentType,
  VerticalAlign,
  HeightRule,
  Header,
  Footer,
  PageNumber,
  PageOrientation,
  type ISectionOptions,
} from 'docx';
import { ConversionOptions, ExtraOutputFile } from '../types';
import { FEATURES } from '../config/features';
import { convertViaServer, getServerCapabilities } from './serverApi';
import {
  inspectPdfPageDeep,
  type InspectedPdfPage,
  type PdfSpanInfo,
  type DetectedPdfTable,
  type PdfPlacedImage,
} from './pdfPageInspector';

// Configure local Vite-bundled PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfThumbnailInfo {
  pageNumber: number;
  dataUrl: string;
}

export interface PdfInspectionResult {
  pageCount: number;
  thumbnails: PdfThumbnailInfo[];
}

async function withPdfJsDocument<T>(
  arrayBuffer: ArrayBuffer,
  fn: (pdf: pdfjsLib.PDFDocumentProxy) => Promise<T>
): Promise<T> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  try {
    return await fn(pdf);
  } finally {
    await pdf.cleanup().catch(() => {});
    await loadingTask.destroy().catch(() => {});
  }
}

async function loadReadablePdfDocument(arrayBuffer: ArrayBuffer): Promise<PDFDocument> {
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('encrypt') || msg.includes('password')) {
      throw new Error(
        'This PDF is password-protected or encrypted. Please unlock the PDF first so content is not blank or lost.'
      );
    }
    throw new Error(
      'Could not read this PDF file. Please verify it is a valid, uncorrupted PDF document.'
    );
  }

  if (pdfDoc.isEncrypted) {
    throw new Error(
      'This PDF is encrypted. Please remove password protection before processing.'
    );
  }

  return pdfDoc;
}

async function assertPdfBlobMatchesPages(blob: Blob, expectedPages?: number): Promise<void> {
  const buf = await blob.arrayBuffer();
  const checkDoc = await PDFDocument.load(buf, { ignoreEncryption: false });
  const actualPages = checkDoc.getPageCount();
  if (actualPages === 0) {
    throw new Error('Generated PDF contains zero pages.');
  }
  if (typeof expectedPages === 'number' && actualPages !== expectedPages) {
    throw new Error(
      `Generated PDF page count mismatch (expected ${expectedPages}, got ${actualPages}).`
    );
  }
}

/**
 * Inspects a PDF file locally using PDF.js to obtain exact page count and low-res page thumbnails
 */
export async function inspectPdfDocument(
  file: File,
  maxThumbnails = 24
): Promise<PdfInspectionResult> {
  const arrayBuffer = await file.arrayBuffer();
  return await withPdfJsDocument(arrayBuffer, async (pdf) => {
    const pageCount = pdf.numPages;
    const thumbnails: PdfThumbnailInfo[] = [];

    const limit = Math.min(pageCount, maxThumbnails);
    for (let pageNum = 1; pageNum <= limit; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.35 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        thumbnails.push({
          pageNumber: pageNum,
          dataUrl: canvas.toDataURL('image/jpeg', 0.72),
        });
      }
      canvas.width = 0;
      canvas.height = 0;
    }

    return { pageCount, thumbnails };
  });
}

/**
 * Renders every page of a PDF document to JPG, PNG, or WebP images locally using PDF.js.
 * Returns single image Blob for 1-page PDFs, or a ZIP archive + individual page blobs for multi-page PDFs.
 */
export async function pdfToImages(
  file: File,
  targetFormat: 'jpg' | 'png' | 'webp',
  options: ConversionOptions = {},
  onProgress?: (progress: number, message: string) => void
): Promise<{ blob: Blob; convertedName: string; extraOutputs: ExtraOutputFile[] }> {
  onProgress?.(10, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();

  return await withPdfJsDocument(arrayBuffer, async (pdf) => {
    const totalPages = pdf.numPages;
    if (totalPages === 0) {
      throw new Error('The PDF document contains no pages.');
    }

    const targetPages = parsePageRange(options.pageRange, totalPages);
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'document';
    const mimeType =
      targetFormat === 'png'
        ? 'image/png'
        : targetFormat === 'webp'
        ? 'image/webp'
        : 'image/jpeg';
    const quality = Math.max(0.2, Math.min(1.0, options.quality ?? 0.92));

    const extraOutputs: ExtraOutputFile[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const pageNumber = targetPages[i];
      onProgress?.(
        Math.round(15 + (i / targetPages.length) * 70),
        `Rendering page ${pageNumber} of ${totalPages}...`
      );

      const page = await pdf.getPage(pageNumber);
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create 2D canvas context for PDF rendering.');
      }

      // PDF pages have a white paper background; fill white so dark text stays legible in all viewers
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const pageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (!b || b.size === 0) {
              reject(new Error(`Failed to encode page ${pageNumber} as ${targetFormat.toUpperCase()}.`));
              return;
            }
            const actualMime = (b.type || '').toLowerCase();
            if (actualMime && actualMime !== mimeType) {
              reject(
                new Error(
                  `Your browser does not support encoding ${targetFormat.toUpperCase()} directly (returned ${actualMime}). Please choose JPG or PNG.`
                )
              );
              return;
            }
            resolve(b);
          },
          mimeType,
          quality
        );
      });

      canvas.width = 0;
      canvas.height = 0;

      const pageFilename = `${baseName}-page-${pageNumber}.${targetFormat}`;
      extraOutputs.push({
        name: pageFilename,
        blob: pageBlob,
        size: pageBlob.size,
        previewUrl: typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(pageBlob) : undefined,
      });
    }

    if (extraOutputs.length === 1) {
      onProgress?.(100, 'Complete');
      return {
        blob: extraOutputs[0].blob,
        convertedName: extraOutputs[0].name,
        extraOutputs,
      };
    }

    onProgress?.(90, `Packaging ${extraOutputs.length} pages into ZIP...`);
    const zip = new JSZip();
    for (const out of extraOutputs) {
      zip.file(out.name, out.blob);
    }
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    onProgress?.(100, 'Complete');
    return {
      blob: zipBlob,
      convertedName: `${baseName}-pages.zip`,
      extraOutputs,
    };
  });
}

interface PositionedSpan {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  hasEOL: boolean;
}

interface ReconstructedLine {
  y: number;
  xStart: number;
  xEnd: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  text: string;
  cells: Array<{ xStart: number; text: string; bold: boolean; italic: boolean }>;
}

interface ExtractedPdfImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

interface ExtractedPdfPage {
  pageNumber: number;
  pageWidth: number;
  lines: ReconstructedLine[];
  plainLines: string[];
  images: ExtractedPdfImage[];
  imagePaintOps: number;
}

function joinSpansWithAccurateSpacing(spans: PositionedSpan[]): {
  text: string;
  cells: Array<{ xStart: number; text: string; bold: boolean; italic: boolean }>;
} {
  if (spans.length === 0) return { text: '', cells: [] };

  const sorted = [...spans].sort((a, b) => a.x - b.x);
  const cells: Array<{ xStart: number; text: string; bold: boolean; italic: boolean }> = [];

  let fullText = '';
  let currentCellText = '';
  let currentCellX = sorted[0].x;
  let currentCellBold = sorted[0].bold;
  let currentCellItalic = sorted[0].italic;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (i === 0) {
      fullText += cur.str;
      currentCellText += cur.str;
      continue;
    }

    const prev = sorted[i - 1];
    const prevRight = prev.x + Math.max(0, prev.width);
    const gap = cur.x - prevRight;
    const refFont = Math.max(6, prev.fontSize || cur.fontSize || 11);
    const wordSpaceThreshold = refFont * 0.16;
    const tableGapThreshold = refFont * 1.6;

    const needsSpace =
      gap > wordSpaceThreshold &&
      !fullText.endsWith(' ') &&
      !cur.str.startsWith(' ');

    if (gap >= tableGapThreshold && currentCellText.trim().length > 0) {
      cells.push({
        xStart: currentCellX,
        text: currentCellText.trim(),
        bold: currentCellBold,
        italic: currentCellItalic,
      });
      currentCellText = cur.str.trimStart();
      currentCellX = cur.x;
      currentCellBold = cur.bold;
      currentCellItalic = cur.italic;
    } else {
      if (needsSpace) currentCellText += ' ';
      currentCellText += cur.str;
      currentCellBold = currentCellBold && cur.bold;
    }

    if (needsSpace) fullText += ' ';
    fullText += cur.str;
  }

  if (currentCellText.trim().length > 0) {
    cells.push({
      xStart: currentCellX,
      text: currentCellText.trim(),
      bold: currentCellBold,
      italic: currentCellItalic,
    });
  }

  return {
    text: fullText.replace(/\s+/g, ' ').trim(),
    cells,
  };
}

function groupSpansIntoLines(spans: PositionedSpan[]): ReconstructedLine[] {
  if (spans.length === 0) return [];
  const sortedByY = [...spans].sort((a, b) => b.y - a.y || a.x - b.x);
  const rawLines: PositionedSpan[][] = [];

  for (const span of sortedByY) {
    const lastLine = rawLines[rawLines.length - 1];
    if (!lastLine) {
      rawLines.push([span]);
      continue;
    }
    const lineAvgY = lastLine.reduce((acc, s) => acc + s.y, 0) / lastLine.length;
    const tol = Math.max(2.6, Math.max(lastLine[0].fontSize, span.fontSize) * 0.36);
    if (Math.abs(span.y - lineAvgY) <= tol) {
      lastLine.push(span);
    } else {
      rawLines.push([span]);
    }
  }

  const lines: ReconstructedLine[] = [];
  for (const lineSpans of rawLines) {
    const { text, cells } = joinSpansWithAccurateSpacing(lineSpans);
    if (!text) continue;
    const xs = lineSpans.map((s) => s.x);
    const xEnds = lineSpans.map((s) => s.x + Math.max(0, s.width));
    const avgY = lineSpans.reduce((acc, s) => acc + s.y, 0) / lineSpans.length;
    const weightedFont =
      lineSpans.reduce((acc, s) => acc + s.fontSize * Math.max(1, s.str.length), 0) /
      lineSpans.reduce((acc, s) => acc + Math.max(1, s.str.length), 0);
    const totalChars = lineSpans.reduce((acc, s) => acc + s.str.trim().length, 0);
    const boldChars = lineSpans.reduce((acc, s) => acc + (s.bold ? s.str.trim().length : 0), 0);
    const italicChars = lineSpans.reduce((acc, s) => acc + (s.italic ? s.str.trim().length : 0), 0);

    lines.push({
      y: avgY,
      xStart: Math.min(...xs),
      xEnd: Math.max(...xEnds),
      fontSize: weightedFont,
      bold: totalChars > 0 && boldChars / totalChars >= 0.65,
      italic: totalChars > 0 && italicChars / totalChars >= 0.65,
      text,
      cells,
    });
  }

  return lines;
}

/**
 * Recursive XY-Cut multi-column reading order organizer:
 * Splits horizontal bands across clear vertical gaps, then splits multi-column bands
 * across vertical gutters so 2-column / 3-column PDFs read column-by-column cleanly.
 */
function orderSpansWithXyCut(spans: PositionedSpan[], depth = 0): ReconstructedLine[] {
  if (spans.length === 0) return [];
  if (depth > 5 || spans.length < 4) {
    return groupSpansIntoLines(spans);
  }

  const avgFont =
    spans.reduce((acc, s) => acc + s.fontSize, 0) / Math.max(1, spans.length);

  // 1. Check for vertical column gutter FIRST so multi-column text is never sliced row-by-row
  const minX = Math.floor(Math.min(...spans.map((s) => s.x)));
  const maxX = Math.ceil(Math.max(...spans.map((s) => s.x + Math.max(4, s.width))));
  const spanWidth = maxX - minX;

  if (spanWidth > 120) {
    const bucketSize = 2;
    const bucketCount = Math.ceil(spanWidth / bucketSize);
    const occupied = new Uint8Array(bucketCount);

    for (const s of spans) {
      const startB = Math.max(0, Math.floor((s.x - minX) / bucketSize));
      const endB = Math.min(
        bucketCount - 1,
        Math.floor((s.x + Math.max(2, s.width) - minX) / bucketSize)
      );
      for (let b = startB; b <= endB; b++) occupied[b] = 1;
    }

    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    for (let b = 0; b < bucketCount; b++) {
      if (occupied[b] === 0) {
        if (curStart === -1) curStart = b;
      } else {
        if (curStart !== -1) {
          const len = b - curStart;
          if (len > bestLen && curStart > 4 && b < bucketCount - 4) {
            bestLen = len;
            bestStart = curStart;
          }
          curStart = -1;
        }
      }
    }

    const gutterWidthPt = bestLen * bucketSize;
    if (bestStart !== -1 && gutterWidthPt >= Math.max(14, avgFont * 1.15)) {
      const splitX = minX + (bestStart + bestLen / 2) * bucketSize;
      const leftSpans = spans.filter((s) => s.x + s.width * 0.5 < splitX);
      const rightSpans = spans.filter((s) => s.x + s.width * 0.5 >= splitX);

      // Verify both sides are genuine multi-line columns (not just a 2-column table row)
      const leftUniqueYs = new Set(leftSpans.map((s) => Math.round(s.y / 6))).size;
      const rightUniqueYs = new Set(rightSpans.map((s) => Math.round(s.y / 6))).size;
      const leftChars = leftSpans.reduce((acc, s) => acc + s.str.trim().length, 0);
      const rightChars = rightSpans.reduce((acc, s) => acc + s.str.trim().length, 0);

      if (leftUniqueYs >= 2 && rightUniqueYs >= 2 && leftChars >= 20 && rightChars >= 20) {
        return [
          ...orderSpansWithXyCut(leftSpans, depth + 1),
          ...orderSpansWithXyCut(rightSpans, depth + 1),
        ];
      }
    }
  }

  // 2. Otherwise check for horizontal band split (e.g. full-width title above multi-column body)
  const ySorted = [...spans].sort((a, b) => b.y - a.y);
  const hGapThreshold = Math.max(18, avgFont * 1.65);

  let maxYGap = 0;
  let splitYIdx = -1;
  for (let i = 1; i < ySorted.length; i++) {
    const gap = ySorted[i - 1].y - ySorted[i].y;
    if (gap > maxYGap) {
      maxYGap = gap;
      splitYIdx = i;
    }
  }

  if (splitYIdx > 0 && maxYGap >= hGapThreshold && splitYIdx >= 1 && ySorted.length - splitYIdx >= 1) {
    const topBand = ySorted.slice(0, splitYIdx);
    const bottomBand = ySorted.slice(splitYIdx);
    return [
      ...orderSpansWithXyCut(topBand, depth + 1),
      ...orderSpansWithXyCut(bottomBand, depth + 1),
    ];
  }

  return groupSpansIntoLines(spans);
}

async function tryExtractPageImages(
  page: pdfjsLib.PDFPageProxy,
  opsList: { fnArray: number[]; argsArray: unknown[] }
): Promise<ExtractedPdfImage[]> {
  if (typeof document === 'undefined') return [];

  const images: ExtractedPdfImage[] = [];
  const seenNames = new Set<string>();
  const ops = pdfjsLib.OPS;

  for (let i = 0; i < opsList.fnArray.length; i++) {
    const fn = opsList.fnArray[i];
    if (fn !== ops.paintImageXObject && fn !== ops.paintInlineImageXObject) continue;

    try {
      const arg0 = opsList.argsArray[i] as unknown[];
      let imgObj: unknown = null;

      if (fn === ops.paintImageXObject && typeof arg0?.[0] === 'string') {
        const objName = arg0[0];
        if (seenNames.has(objName)) continue;
        seenNames.add(objName);
        const pool = objName.startsWith('g_') ? page.commonObjs : page.objs;
        if (pool.has(objName)) {
          imgObj = pool.get(objName);
        } else {
          imgObj = await new Promise<unknown>((resolve) => {
            const timer = setTimeout(() => resolve(null), 1500);
            try {
              pool.get(
                objName,
                (data: unknown) => {
                  clearTimeout(timer);
                  resolve(data);
                },
                () => {
                  clearTimeout(timer);
                  resolve(null);
                }
              );
            } catch {
              clearTimeout(timer);
              resolve(null);
            }
          });
        }
      } else if (fn === ops.paintInlineImageXObject) {
        imgObj = arg0?.[0];
      }

      if (!imgObj || typeof imgObj !== 'object') continue;

      const candidate = imgObj as {
        width?: number;
        height?: number;
        bitmap?: ImageBitmap;
        data?: Uint8Array | Uint8ClampedArray;
        kind?: number;
      };

      const w = candidate.width || candidate.bitmap?.width || 0;
      const h = candidate.height || candidate.bitmap?.height || 0;
      // Ignore tiny 1x1 / bullet / spacer artifacts
      if (w < 24 || h < 24 || w > 6000 || h > 6000) continue;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      if (candidate.bitmap) {
        ctx.drawImage(candidate.bitmap, 0, 0, w, h);
      } else if (candidate.data) {
        const raw = candidate.data;
        const imgData = ctx.createImageData(w, h);
        const rgba = imgData.data;

        if (raw.length === w * h * 4) {
          rgba.set(raw);
        } else if (raw.length === w * h * 3) {
          for (let p = 0, q = 0; p < raw.length; p += 3, q += 4) {
            rgba[q] = raw[p];
            rgba[q + 1] = raw[p + 1];
            rgba[q + 2] = raw[p + 2];
            rgba[q + 3] = 255;
          }
        } else if (raw.length === w * h) {
          for (let p = 0, q = 0; p < raw.length; p++, q += 4) {
            rgba[q] = raw[p];
            rgba[q + 1] = raw[p];
            rgba[q + 2] = raw[p];
            rgba[q + 3] = 255;
          }
        } else {
          canvas.width = 0;
          canvas.height = 0;
          continue;
        }
        ctx.putImageData(imgData, 0, 0);
      } else {
        canvas.width = 0;
        canvas.height = 0;
        continue;
      }

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      canvas.width = 0;
      canvas.height = 0;

      if (pngBlob && pngBlob.size > 0) {
        images.push({
          bytes: new Uint8Array(await pngBlob.arrayBuffer()),
          width: w,
          height: h,
        });
      }
    } catch {
      // Skip exotic PDF image color spaces cleanly without aborting text conversion
    }
  }

  return images;
}

/**
 * Extracts structured text lines, reading order, font metadata, and images per page using PDF.js
 */
async function extractStructuredPdfPages(
  file: File,
  includeImages: boolean,
  onProgress?: (progress: number, message: string) => void
): Promise<ExtractedPdfPage[]> {
  onProgress?.(15, 'Reading PDF text layer...');
  const arrayBuffer = await file.arrayBuffer();

  return await withPdfJsDocument(arrayBuffer, async (pdf) => {
    const totalPages = pdf.numPages;
    if (totalPages === 0) {
      throw new Error('The PDF document contains no pages.');
    }

    const pages: ExtractedPdfPage[] = [];
    const ops = pdfjsLib.OPS;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(
        Math.round(20 + (pageNum / totalPages) * 55),
        `Extracting layout & text from page ${pageNum} of ${totalPages}...`
      );

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      const styles = (textContent.styles || {}) as Record<string, { fontFamily?: string }>;

      const spans: PositionedSpan[] = [];
      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        if (item.str.length === 0 && !item.hasEOL) continue;
        if (item.str.trim().length === 0) continue;

        const transform = item.transform as number[];
        const x = transform[4];
        const y = transform[5];
        const fontSize = Math.max(
          6,
          Math.hypot(transform[0], transform[1]) || item.height || 11
        );
        const fontName = String(item.fontName || '');
        const family = String(styles[fontName]?.fontFamily || '');
        const fontDesc = `${fontName} ${family}`.toLowerCase();

        spans.push({
          str: item.str,
          x,
          y,
          width: Math.max(0, item.width || 0),
          fontSize,
          bold: /bold|black|heavy|semibold|demi/.test(fontDesc),
          italic: /italic|oblique/.test(fontDesc),
          hasEOL: Boolean(item.hasEOL),
        });
      }

      const opsList = await page.getOperatorList();
      let imagePaintOps = 0;
      for (const fn of opsList.fnArray) {
        if (
          fn === ops.paintImageXObject ||
          fn === ops.paintInlineImageXObject ||
          fn === ops.paintImageMaskXObject
        ) {
          imagePaintOps++;
        }
      }

      if (includeImages && imagePaintOps > 0 && typeof document !== 'undefined') {
        const tmpVp = page.getViewport({ scale: 0.25 });
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = Math.max(1, Math.floor(tmpVp.width));
        tmpCanvas.height = Math.max(1, Math.floor(tmpVp.height));
        const tmpCtx = tmpCanvas.getContext('2d');
        if (tmpCtx) {
          await page
            .render({ canvas: tmpCanvas, canvasContext: tmpCtx, viewport: tmpVp })
            .promise.catch(() => {});
        }
        tmpCanvas.width = 0;
        tmpCanvas.height = 0;
      }

      const images = includeImages ? await tryExtractPageImages(page, opsList) : [];
      const orderedLines = orderSpansWithXyCut(spans);

      pages.push({
        pageNumber: pageNum,
        pageWidth: viewport.width,
        lines: orderedLines,
        plainLines: orderedLines.map((l) => l.text),
        images,
        imagePaintOps,
      });
    }

    const totalReadableChars = pages.reduce(
      (sum, p) => sum + p.plainLines.join('').replace(/\s+/g, '').length,
      0
    );
    const totalImageOps = pages.reduce((sum, p) => sum + p.imagePaintOps, 0);

    if (totalReadableChars < 8) {
      if (totalImageOps > 0) {
        throw new Error(
          'This PDF appears to be a scanned or image-only document with no selectable text layer. OCR is required before converting scanned PDFs into editable Word or text files.'
        );
      }
      throw new Error(
        'No selectable text content was found in this PDF document.'
      );
    }

    return pages;
  });
}

export async function pdfToText(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  const pages = await extractStructuredPdfPages(file, false, onProgress);
  onProgress?.(90, 'Formatting extracted text...');

  const content = pages
    .map((p) => {
      const body =
        p.plainLines.length > 0
          ? p.plainLines.join('\n')
          : '[No selectable text on this page]';
      return `--- Page ${p.pageNumber} ---\n${body}`;
    })
    .join('\n\n');

  onProgress?.(100, 'Complete');
  return new Blob([content], { type: 'text/plain;charset=utf-8' });
}

interface RichLine {
  yTop: number;
  xStart: number;
  xEnd: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  text: string;
  spans: PdfSpanInfo[];
  cells: Array<{ xStart: number; text: string; spans: PdfSpanInfo[]; bold: boolean; italic: boolean }>;
}

function makeDocxPageSize(widthPt: number, heightPt: number) {
  const isLandscape = widthPt > heightPt;
  const minPt = Math.min(widthPt, heightPt);
  const maxPt = Math.max(widthPt, heightPt);
  return {
    width: Math.max(1440, Math.round(minPt * 20)),
    height: Math.max(1440, Math.round(maxPt * 20)),
    orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
  };
}

function joinRichSpans(spans: PdfSpanInfo[]): {
  text: string;
  orderedSpans: PdfSpanInfo[];
  cells: Array<{ xStart: number; text: string; spans: PdfSpanInfo[]; bold: boolean; italic: boolean }>;
} {
  if (spans.length === 0) return { text: '', orderedSpans: [], cells: [] };
  const sorted = [...spans].sort((a, b) => a.x - b.x);
  const cells: Array<{ xStart: number; text: string; spans: PdfSpanInfo[]; bold: boolean; italic: boolean }> = [];
  const orderedSpans: PdfSpanInfo[] = [];

  let fullText = '';
  let currentCellText = '';
  let currentCellSpans: PdfSpanInfo[] = [];
  let currentCellX = sorted[0].x;
  let currentCellBold = sorted[0].bold;
  let currentCellItalic = sorted[0].italic;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (i === 0) {
      fullText += cur.str;
      orderedSpans.push(cur);
      currentCellText += cur.str;
      currentCellSpans.push(cur);
      continue;
    }

    const prev = sorted[i - 1];
    const prevRight = prev.x + Math.max(0, prev.width);
    const gap = cur.x - prevRight;
    const refFont = Math.max(6, prev.fontSize || cur.fontSize || 11);
    const wordSpaceThreshold = refFont * 0.16;
    const tableGapThreshold = refFont * 1.75;

    const needsSpace =
      gap > wordSpaceThreshold && !fullText.endsWith(' ') && !cur.str.startsWith(' ');

    if (gap >= tableGapThreshold && currentCellText.trim().length > 0) {
      cells.push({
        xStart: currentCellX,
        text: currentCellText.trim(),
        spans: currentCellSpans,
        bold: currentCellBold,
        italic: currentCellItalic,
      });
      if (needsSpace) {
        orderedSpans.push({
          ...cur,
          str: ' ',
          width: gap,
          bold: prev.bold && cur.bold,
          underline: false,
          highlightHex: undefined,
        });
      }
      currentCellText = cur.str.trimStart();
      currentCellSpans = [cur];
      currentCellX = cur.x;
      currentCellBold = cur.bold;
      currentCellItalic = cur.italic;
    } else {
      if (needsSpace) {
        currentCellText += ' ';
        currentCellSpans.push({ ...cur, str: ' ' + cur.str, x: prevRight });
        orderedSpans.push({
          ...cur,
          str: ' ',
          width: gap,
          bold: prev.bold && cur.bold,
          underline: false,
          highlightHex: undefined,
        });
      }
      if (!needsSpace) {
        currentCellSpans.push(cur);
      }
      currentCellText += cur.str;
      currentCellBold = currentCellBold && cur.bold;
    }

    if (needsSpace) fullText += ' ';
    fullText += cur.str;
    orderedSpans.push(cur);
  }

  if (currentCellText.trim().length > 0) {
    cells.push({
      xStart: currentCellX,
      text: currentCellText.trim(),
      spans: currentCellSpans,
      bold: currentCellBold,
      italic: currentCellItalic,
    });
  }

  return {
    text: fullText.replace(/\s+/g, ' ').trim(),
    orderedSpans,
    cells,
  };
}

function groupRichSpansIntoLines(spans: PdfSpanInfo[]): RichLine[] {
  if (spans.length === 0) return [];
  const sortedByY = [...spans].sort((a, b) => a.yTop - b.yTop || a.x - b.x);
  const rawLines: PdfSpanInfo[][] = [];

  for (const span of sortedByY) {
    const lastLine = rawLines[rawLines.length - 1];
    if (!lastLine) {
      rawLines.push([span]);
      continue;
    }
    const lineAvgY = lastLine.reduce((acc, s) => acc + s.yTop, 0) / lastLine.length;
    const tol = Math.max(2.6, Math.max(lastLine[0].fontSize, span.fontSize) * 0.36);
    if (Math.abs(span.yTop - lineAvgY) <= tol) {
      lastLine.push(span);
    } else {
      rawLines.push([span]);
    }
  }

  const lines: RichLine[] = [];
  for (const lineSpans of rawLines) {
    const { text, orderedSpans, cells } = joinRichSpans(lineSpans);
    if (!text) continue;
    const xs = lineSpans.map((s) => s.x);
    const xEnds = lineSpans.map((s) => s.x + Math.max(0, s.width));
    const avgY = lineSpans.reduce((acc, s) => acc + s.yTop, 0) / lineSpans.length;
    const weightedFont =
      lineSpans.reduce((acc, s) => acc + s.fontSize * Math.max(1, s.str.length), 0) /
      lineSpans.reduce((acc, s) => acc + Math.max(1, s.str.length), 0);
    const totalChars = lineSpans.reduce((acc, s) => acc + s.str.trim().length, 0);
    const boldChars = lineSpans.reduce((acc, s) => acc + (s.bold ? s.str.trim().length : 0), 0);
    const italicChars = lineSpans.reduce((acc, s) => acc + (s.italic ? s.str.trim().length : 0), 0);

    lines.push({
      yTop: avgY,
      xStart: Math.min(...xs),
      xEnd: Math.max(...xEnds),
      fontSize: weightedFont,
      bold: totalChars > 0 && boldChars / totalChars >= 0.65,
      italic: totalChars > 0 && italicChars / totalChars >= 0.65,
      text,
      spans: orderedSpans,
      cells,
    });
  }

  return lines;
}

function orderRichSpansWithXyCutTopDown(spans: PdfSpanInfo[], depth = 0): RichLine[] {
  if (spans.length === 0) return [];
  if (depth > 5 || spans.length < 4) {
    return groupRichSpansIntoLines(spans);
  }

  const avgFont = spans.reduce((acc, s) => acc + s.fontSize, 0) / Math.max(1, spans.length);

  // 1. Split full-width horizontal bands across clear vertical whitespace FIRST (title above 2-col body)
  const ySorted = [...spans].sort((a, b) => a.yTop - b.yTop);
  const hGapThreshold = Math.max(18, avgFont * 1.65);

  let maxYGap = 0;
  let splitYIdx = -1;
  for (let i = 1; i < ySorted.length; i++) {
    const gap = ySorted[i].yTop - ySorted[i - 1].yTop;
    if (gap > maxYGap) {
      maxYGap = gap;
      splitYIdx = i;
    }
  }

  // Check if there's a clean horizontal split where top band doesn't overlap bottom band vertically
  if (splitYIdx > 0 && maxYGap >= hGapThreshold && splitYIdx >= 1 && ySorted.length - splitYIdx >= 1) {
    const topBand = ySorted.slice(0, splitYIdx);
    const bottomBand = ySorted.slice(splitYIdx);
    return [
      ...orderRichSpansWithXyCutTopDown(topBand, depth + 1),
      ...orderRichSpansWithXyCutTopDown(bottomBand, depth + 1),
    ];
  }

  // 2. Check for vertical column gutter inside the current horizontal band
  const minX = Math.floor(Math.min(...spans.map((s) => s.x)));
  const maxX = Math.ceil(Math.max(...spans.map((s) => s.x + Math.max(4, s.width))));
  const spanWidth = maxX - minX;

  if (spanWidth > 120) {
    const bucketSize = 2;
    const bucketCount = Math.ceil(spanWidth / bucketSize);
    const occupied = new Uint8Array(bucketCount);

    for (const s of spans) {
      const startB = Math.max(0, Math.floor((s.x - minX) / bucketSize));
      const endB = Math.min(
        bucketCount - 1,
        Math.floor((s.x + Math.max(2, s.width) - minX) / bucketSize)
      );
      for (let b = startB; b <= endB; b++) occupied[b] = 1;
    }

    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    for (let b = 0; b < bucketCount; b++) {
      if (occupied[b] === 0) {
        if (curStart === -1) curStart = b;
      } else if (curStart !== -1) {
        const len = b - curStart;
        if (len > bestLen && curStart > 4 && b < bucketCount - 4) {
          bestLen = len;
          bestStart = curStart;
        }
        curStart = -1;
      }
    }

    const gutterWidthPt = bestLen * bucketSize;
    if (bestStart !== -1 && gutterWidthPt >= Math.max(14, avgFont * 1.15)) {
      const splitX = minX + (bestStart + bestLen / 2) * bucketSize;
      const leftSpans = spans.filter((s) => s.x + s.width * 0.5 < splitX);
      const rightSpans = spans.filter((s) => s.x + s.width * 0.5 >= splitX);

      const leftUniqueYs = new Set(leftSpans.map((s) => Math.round(s.yTop / 6))).size;
      const rightUniqueYs = new Set(rightSpans.map((s) => Math.round(s.yTop / 6))).size;
      const leftChars = leftSpans.reduce((acc, s) => acc + s.str.trim().length, 0);
      const rightChars = rightSpans.reduce((acc, s) => acc + s.str.trim().length, 0);

      if (leftUniqueYs >= 2 && rightUniqueYs >= 2 && leftChars >= 18 && rightChars >= 18) {
        return [
          ...orderRichSpansWithXyCutTopDown(leftSpans, depth + 1),
          ...orderRichSpansWithXyCutTopDown(rightSpans, depth + 1),
        ];
      }
    }
  }

  return groupRichSpansIntoLines(spans);
}

function pdfSpansToDocxRuns(spans: PdfSpanInfo[], sizeOverridePt?: number, forceBold?: boolean): TextRun[] {
  const merged: Array<{
    text: string;
    font: string;
    size: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    color: string;
    highlightHex?: string;
  }> = [];

  for (const sp of spans) {
    if (!sp.str) continue;
    const size = Math.min(72, Math.max(12, Math.round((sizeOverridePt ?? sp.fontSize) * 2)));
    const color = sp.colorHex.replace(/^#/, '').toUpperCase() || '0F172A';
    const bold = Boolean(forceBold || sp.bold);
    const italic = Boolean(sp.italic);
    const underline = Boolean(sp.underline);
    const font = sp.fontFamily || 'Calibri';
    const highlightHex = sp.highlightHex?.replace(/^#/, '').toUpperCase();

    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.font === font &&
      prev.size === size &&
      prev.bold === bold &&
      prev.italic === italic &&
      prev.underline === underline &&
      prev.color === color &&
      prev.highlightHex === highlightHex
    ) {
      prev.text += sp.str;
    } else {
      merged.push({ text: sp.str, font, size, bold, italic, underline, color, highlightHex });
    }
  }

  return merged.map(
    (m) =>
      new TextRun({
        text: m.text,
        font: m.font,
        size: m.size,
        bold: m.bold,
        italics: m.italic,
        underline: m.underline ? {} : undefined,
        color: m.color,
        shading: m.highlightHex ? { type: ShadingType.CLEAR, fill: m.highlightHex } : undefined,
      })
  );
}

function inferLineAlignment(
  xStart: number,
  xEnd: number,
  marginLeft: number,
  pageWidthPt: number,
  marginRight: number
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const contentWidth = Math.max(120, pageWidthPt - marginLeft - marginRight);
  const contentRight = pageWidthPt - marginRight;
  const lineWidth = Math.max(0, xEnd - xStart);
  const pageCenter = marginLeft + contentWidth / 2;
  const lineCenter = xStart + lineWidth / 2;

  if (
    lineWidth < contentWidth * 0.84 &&
    xStart > marginLeft + 22 &&
    Math.abs(lineCenter - pageCenter) <= 18
  ) {
    return AlignmentType.CENTER;
  }
  if (
    lineWidth < contentWidth * 0.72 &&
    xStart > marginLeft + contentWidth * 0.34 &&
    Math.abs(xEnd - contentRight) <= 16
  ) {
    return AlignmentType.RIGHT;
  }
  return AlignmentType.LEFT;
}

function buildDetectedVectorTable(table: DetectedPdfTable): Table {
  const colWidthsTwips = table.colWidthsPt.map((w) => Math.max(240, Math.round(w * 20)));
  const totalWidthTwips = colWidthsTwips.reduce((s, w) => s + w, 0);

  const rows = table.grid.map((rowCells, rIdx) => {
    const rowHeightTwips = Math.max(240, Math.round((table.rowHeightsPt[rIdx] || 18) * 20));
    const docxCells: TableCell[] = [];

    for (let c = 0; c < rowCells.length; c++) {
      const cell = rowCells[c];
      if (cell.covered) continue;

      let cellWidthTwips = 0;
      for (let k = c; k < Math.min(colWidthsTwips.length, c + cell.colSpan); k++) {
        cellWidthTwips += colWidthsTwips[k];
      }

      const cellLines = groupRichSpansIntoLines(cell.spans);
      const cellX0 = table.x + table.colWidthsPt.slice(0, c).reduce((s, w) => s + w, 0);
      const cellW = table.colWidthsPt.slice(c, c + cell.colSpan).reduce((s, w) => s + w, 0);

      const cellParagraphs =
        cellLines.length > 0
          ? cellLines.map((cl) => {
              const lineCenter = (cl.xStart + cl.xEnd) / 2;
              const cellCenter = cellX0 + cellW / 2;
              let align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
              if (cl.xEnd - cl.xStart < cellW * 0.78) {
                if (Math.abs(lineCenter - cellCenter) <= Math.max(8, cellW * 0.12)) {
                  align = AlignmentType.CENTER;
                } else if (cl.xStart - cellX0 > cellW * 0.35) {
                  align = AlignmentType.RIGHT;
                }
              }
              return new Paragraph({
                alignment: align,
                spacing: { before: 20, after: 20 },
                children: pdfSpansToDocxRuns(cl.spans),
              });
            })
          : [new Paragraph({ children: [new TextRun({ text: '' })] })];

      const borderHex = (cell.borderColorHex || '#CBD5E1').replace(/^#/, '').toUpperCase();
      const fillHex = cell.shadingHex?.replace(/^#/, '').toUpperCase();

      docxCells.push(
        new TableCell({
          columnSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
          rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
          width: { size: Math.max(240, cellWidthTwips), type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          shading: fillHex ? { type: ShadingType.CLEAR, fill: fillHex } : undefined,
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          borders: {
            top: cell.hasTopBorder
              ? { style: BorderStyle.SINGLE, size: 4, color: borderHex }
              : { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            bottom: cell.hasBottomBorder
              ? { style: BorderStyle.SINGLE, size: 4, color: borderHex }
              : { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            left: cell.hasLeftBorder
              ? { style: BorderStyle.SINGLE, size: 4, color: borderHex }
              : { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            right: cell.hasRightBorder
              ? { style: BorderStyle.SINGLE, size: 4, color: borderHex }
              : { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          },
          children: cellParagraphs,
        })
      );
    }

    return new TableRow({
      height: { value: rowHeightTwips, rule: HeightRule.ATLEAST },
      cantSplit: true,
      children: docxCells,
    });
  });

  return new Table({
    width: { size: totalWidthTwips, type: WidthType.DXA },
    columnWidths: colWidthsTwips,
    rows,
  });
}

function buildFallbackBorderlessTable(tableLines: RichLine[]): Table {
  const colPositions: number[] = [];
  for (const line of tableLines) {
    for (const cell of line.cells) {
      if (!colPositions.some((x) => Math.abs(x - cell.xStart) <= 18)) {
        colPositions.push(cell.xStart);
      }
    }
  }
  colPositions.sort((a, b) => a - b);

  const rows = tableLines.map((line, rIdx) => {
    const slotSpans: PdfSpanInfo[][] = Array.from({ length: colPositions.length }, () => []);
    for (const cell of line.cells) {
      let bestCol = 0;
      let bestDist = Infinity;
      for (let c = 0; c < colPositions.length; c++) {
        const d = Math.abs(colPositions[c] - cell.xStart);
        if (d < bestDist) {
          bestDist = d;
          bestCol = c;
        }
      }
      if (slotSpans[bestCol].length > 0 && cell.spans[0]) {
        slotSpans[bestCol].push({ ...cell.spans[0], str: ' ' });
      }
      slotSpans[bestCol].push(...cell.spans);
    }

    const isHeaderRow = rIdx === 0 && line.bold;
    return new TableRow({
      cantSplit: true,
      children: slotSpans.map(
        (spans) =>
          new TableCell({
            shading: isHeaderRow ? { type: ShadingType.CLEAR, fill: 'F1F5F9' } : undefined,
            margins: { top: 65, bottom: 65, left: 95, right: 95 },
            children: [
              new Paragraph({
                children:
                  spans.length > 0
                    ? pdfSpansToDocxRuns(spans, undefined, isHeaderRow)
                    : [new TextRun({ text: '' })],
              }),
            ],
          })
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
    },
    rows,
  });
}

function normalizeHeaderFooterTemplate(text: string): string {
  return text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildHeaderFooterParagraph(
  line: RichLine,
  pageNumber: number,
  pageWidthPt: number,
  marginLeft: number,
  marginRight: number
): Paragraph {
  const align = inferLineAlignment(line.xStart, line.xEnd, marginLeft, pageWidthPt, marginRight);
  const children: TextRun[] = [];
  const pageNumToken = String(pageNumber);

  // Replace standalone page number token matching current pageNumber with dynamic PageNumber.CURRENT
  let matchedPageNum = false;
  for (const sp of line.spans) {
    const exactMatch = sp.str.trim() === pageNumToken;
    const inlineMatch = !exactMatch && new RegExp(`(^|\\bPage\\s+|\\s)${pageNumToken}(\\b|$)`, 'i').test(sp.str);
    if (!matchedPageNum && exactMatch) {
      matchedPageNum = true;
      children.push(
        new TextRun({
          children: [PageNumber.CURRENT],
          font: sp.fontFamily || 'Calibri',
          size: Math.min(28, Math.max(14, Math.round(sp.fontSize * 2))),
          bold: sp.bold,
          italics: sp.italic,
          color: sp.colorHex.replace(/^#/, '').toUpperCase() || '475569',
        })
      );
    } else if (!matchedPageNum && inlineMatch) {
      const idx = sp.str.lastIndexOf(pageNumToken);
      const before = sp.str.slice(0, idx);
      const after = sp.str.slice(idx + pageNumToken.length);
      const baseRunOpts = {
        font: sp.fontFamily || 'Calibri',
        size: Math.min(28, Math.max(14, Math.round(sp.fontSize * 2))),
        bold: sp.bold,
        italics: sp.italic,
        color: sp.colorHex.replace(/^#/, '').toUpperCase() || '475569',
      };
      if (before) children.push(new TextRun({ ...baseRunOpts, text: before }));
      children.push(new TextRun({ ...baseRunOpts, children: [PageNumber.CURRENT] }));
      if (after) children.push(new TextRun({ ...baseRunOpts, text: after }));
      matchedPageNum = true;
    } else {
      children.push(...pdfSpansToDocxRuns([sp]));
    }
  }

  return new Paragraph({
    alignment: align,
    spacing: { before: 0, after: 0 },
    children,
  });
}

function buildImageParagraph(img: PdfPlacedImage, page: InspectedPdfPage): Paragraph {
  const maxContentPt = Math.max(120, page.widthPt - page.margins.left - page.margins.right);
  const scale = img.widthPt > maxContentPt ? maxContentPt / img.widthPt : 1;
  const wPx = Math.max(1, Math.round(img.widthPt * scale * (96 / 72)));
  const hPx = Math.max(1, Math.round(img.heightPt * scale * (96 / 72)));
  const align = inferLineAlignment(
    img.x,
    img.x + img.widthPt,
    page.margins.left,
    page.widthPt,
    page.margins.right
  );

  return new Paragraph({
    alignment: align,
    spacing: { before: 80, after: 100 },
    children: [
      new ImageRun({
        data: img.bytes,
        type: 'png',
        transformation: { width: wPx, height: hPx },
      }),
    ],
  });
}

function buildEditablePageElements(
  page: InspectedPdfPage,
  bodySpans: PdfSpanInfo[],
  medianFont: number
): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [];
  const marginLeft = page.margins.left;
  const marginRight = page.margins.right;
  const contentWidth = Math.max(120, page.widthPt - marginLeft - marginRight);

  // Interleave tables, non-background images, and span bands in exact top-down Y order
  const fixedBlocks: Array<
    | { kind: 'table'; yTop: number; yBottom: number; table: DetectedPdfTable }
    | { kind: 'image'; yTop: number; yBottom: number; image: PdfPlacedImage }
  > = [
    ...page.tables.map((t) => ({
      kind: 'table' as const,
      yTop: t.yTop,
      yBottom: t.yTop + t.height,
      table: t,
    })),
    ...page.images
      .filter((im) => !im.isBackground)
      .map((im) => ({
        kind: 'image' as const,
        yTop: im.yTop,
        yBottom: im.yTop + im.heightPt,
        image: im,
      })),
  ].sort((a, b) => a.yTop - b.yTop);

  // Partition bodySpans into vertical bands relative to fixedBlocks
  const emitSpanRegion = (regionSpans: PdfSpanInfo[]) => {
    if (regionSpans.length === 0) return;
    const lines = orderRichSpansWithXyCutTopDown(regionSpans);
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const dyAbove = i > 0 ? Math.max(0, line.yTop - lines[i - 1].yTop - line.fontSize) : 0;
      const beforeTwips = i === 0 ? 0 : Math.min(360, Math.max(0, Math.round(dyAbove * 14)));

      // 1. Borderless multi-column tab-aligned table fallback (when vector grid was absent)
      if (line.cells.length >= 2) {
        const tableLines: RichLine[] = [line];
        let j = i + 1;
        while (j < lines.length && lines[j].cells.length >= 2) {
          const dy = Math.abs(lines[j].yTop - lines[j - 1].yTop);
          if (dy > line.fontSize * 3.5) break;
          tableLines.push(lines[j]);
          j++;
        }
        if (tableLines.length >= 2) {
          out.push(buildFallbackBorderlessTable(tableLines));
          out.push(new Paragraph({ text: '', spacing: { after: 80 } }));
          i = j;
          continue;
        }
      }

      // 2. Headings (never misclassify bullet/numbered items)
      const isBulletLine = /^([•◦▪▫●○\-*–]|\d+[.)])\s+/.test(line.text);
      const isShort = line.text.length <= 120;
      const align = inferLineAlignment(line.xStart, line.xEnd, marginLeft, page.widthPt, marginRight);

      if (!isBulletLine && isShort && line.fontSize >= medianFont * 1.32) {
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: align,
            spacing: { before: Math.max(120, beforeTwips), after: 100 },
            children: pdfSpansToDocxRuns(line.spans, undefined, true),
          })
        );
        i++;
        continue;
      }

      if (
        !isBulletLine &&
        isShort &&
        (line.fontSize >= medianFont * 1.14 ||
          (line.bold && line.fontSize >= medianFont * 0.98 && !/[.,;]$/.test(line.text)))
      ) {
        out.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment: align,
            spacing: { before: Math.max(100, beforeTwips), after: 80 },
            children: pdfSpansToDocxRuns(line.spans, undefined, true),
          })
        );
        i++;
        continue;
      }

      // 3. Nested bullet / numbered list items
      const bulletMatch = line.text.match(/^([•◦▪▫●○\-*–]|\d+[.)])\s+(.*)$/);
      if (bulletMatch) {
        const marker = bulletMatch[1];
        const isOrdered = /^\d+[.)]$/.test(marker);
        const relIndentPt = Math.max(0, line.xStart - marginLeft);
        const level = Math.min(4, Math.floor(relIndentPt / 18));

        // Strip leading marker cleanly from first span while preserving formatting of remaining spans
        const cleanedSpans: PdfSpanInfo[] = [];
        let strippedMarker = false;
        const markerRe = isOrdered ? /^\s*\d+[.)]\s*/ : /^\s*[•◦▪▫●○\-*–]\s*/;

        for (const sp of line.spans) {
          if (!strippedMarker) {
            const replaced = sp.str.replace(markerRe, '');
            if (replaced !== sp.str) {
              strippedMarker = true;
              if (replaced) cleanedSpans.push({ ...sp, str: replaced });
              continue;
            }
          }
          cleanedSpans.push(sp);
        }

        // Merge continuation lines that stay indented with this list item
        while (i + 1 < lines.length) {
          const next = lines[i + 1];
          const dy = next.yTop - lines[i].yTop;
          const nextIsSpecial =
            /^([•◦▪▫●○\-*–]|\d+[.)])\s+/.test(next.text) ||
            next.fontSize >= medianFont * 1.14 ||
            next.cells.length >= 2;
          if (!nextIsSpecial && dy >= 0 && dy <= line.fontSize * 1.6 && next.xStart > line.xStart + 3) {
            cleanedSpans.push({ ...next.spans[0], str: ' ' });
            cleanedSpans.push(...next.spans);
            i++;
          } else {
            break;
          }
        }

        if (isOrdered) {
          const leftTwips = 360 + level * 260;
          out.push(
            new Paragraph({
              indent: { left: leftTwips, hanging: 240 },
              spacing: { before: beforeTwips > 80 ? 60 : 0, after: 70 },
              children: [
                new TextRun({
                  text: `${marker} `,
                  bold: true,
                  font: line.spans[0]?.fontFamily || 'Calibri',
                  size: Math.min(28, Math.max(18, Math.round(line.fontSize * 2))),
                }),
                ...pdfSpansToDocxRuns(cleanedSpans),
              ],
            })
          );
        } else {
          out.push(
            new Paragraph({
              bullet: { level },
              spacing: { before: beforeTwips > 80 ? 60 : 0, after: 70 },
              children: pdfSpansToDocxRuns(cleanedSpans),
            })
          );
        }
        i++;
        continue;
      }

      // 4. Body paragraphs preserving inline formatting, alignment, first-line indent, and line spacing
      const paraSpans: PdfSpanInfo[] = [...line.spans];
      const firstLineX = line.xStart;
      let bodyLineX = line.xStart;
      let maxLineRight = line.xEnd;
      const lineDeltas: number[] = [];

      while (i + 1 < lines.length) {
        const cur = lines[i];
        const next = lines[i + 1];
        const dy = next.yTop - cur.yTop;
        const nextIsSpecial =
          next.cells.length >= 2 ||
          next.fontSize >= medianFont * 1.14 ||
          (next.bold && next.text.length <= 120 && !/[.,;]$/.test(next.text)) ||
          /^([•◦▪▫●○\-*–]|\d+[.)])\s+/.test(next.text);

        const columnJump = dy < -cur.fontSize || Math.abs(next.xStart - cur.xStart) > 48;
        const curEndedShort =
          /[.!?:"”)]$/.test(cur.text) &&
          cur.xEnd < Math.max(maxLineRight, marginLeft + contentWidth * 0.72) - 42;

        if (nextIsSpecial || columnJump || curEndedShort || dy > cur.fontSize * 1.72) {
          break;
        }

        if (dy > 0) lineDeltas.push(dy);
        bodyLineX = Math.min(bodyLineX, next.xStart);
        maxLineRight = Math.max(maxLineRight, next.xEnd);

        const lastSp = paraSpans[paraSpans.length - 1];
        if (lastSp && lastSp.str.endsWith('-') && /^[a-z]/.test(next.text)) {
          lastSp.str = lastSp.str.slice(0, -1);
        } else if (next.spans[0]) {
          paraSpans.push({ ...next.spans[0], str: ' ' });
        }
        paraSpans.push(...next.spans);
        i++;
      }

      const avgDy =
        lineDeltas.length > 0
          ? lineDeltas.reduce((s, d) => s + d, 0) / lineDeltas.length
          : line.fontSize * 1.2;
      const lineSpacingTwips = Math.min(420, Math.max(240, Math.round((avgDy / line.fontSize) * 240)));
      const leftIndentTwips = Math.max(0, Math.round((bodyLineX - marginLeft) * 20));
      const firstLineDeltaTwips =
        firstLineX - bodyLineX > 6 ? Math.round((firstLineX - bodyLineX) * 20) : undefined;

      out.push(
        new Paragraph({
          alignment: align,
          indent:
            leftIndentTwips > 40 || firstLineDeltaTwips
              ? {
                  left: leftIndentTwips > 40 ? leftIndentTwips : undefined,
                  firstLine: firstLineDeltaTwips,
                }
              : undefined,
          spacing: {
            before: beforeTwips,
            after: 110,
            line: lineSpacingTwips,
          },
          children: pdfSpansToDocxRuns(paraSpans),
        })
      );
      i++;
    }
  };

  let prevY = -Infinity;
  for (const blk of fixedBlocks) {
    const bandSpans = bodySpans.filter((s) => s.yTop >= prevY && s.yTop < blk.yTop);
    emitSpanRegion(bandSpans);
    if (blk.kind === 'table') {
      out.push(buildDetectedVectorTable(blk.table));
      out.push(new Paragraph({ text: '', spacing: { before: 40, after: 80 } }));
    } else {
      out.push(buildImageParagraph(blk.image, page));
    }
    prevY = Math.max(prevY, blk.yBottom);
  }
  const trailingSpans = bodySpans.filter((s) => s.yTop >= prevY);
  emitSpanRegion(trailingSpans);

  return out;
}

async function pdfToDocxVisualReplica(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Visual Replica Word export requires a browser Canvas environment.');
  }

  onProgress?.(10, 'Loading PDF pages for Visual Replica rendering...');
  const arrayBuffer = await file.arrayBuffer();

  return await withPdfJsDocument(arrayBuffer, async (pdf) => {
    const totalPages = pdf.numPages;
    if (totalPages === 0) {
      throw new Error('The PDF document contains no pages.');
    }

    const sections: ISectionOptions[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(
        Math.round(15 + ((pageNum - 1) / totalPages) * 72),
        `Rendering page ${pageNum} of ${totalPages} as Visual Replica...`
      );

      const page = await pdf.getPage(pageNum);
      const baseVp = page.getViewport({ scale: 1.0 });
      const widthPt = Math.max(72, baseVp.width);
      const heightPt = Math.max(72, baseVp.height);

      // Scale ~2.1x while capping longest edge <= 2300px to keep browser memory safe
      const maxDimPt = Math.max(widthPt, heightPt);
      const scale = Math.min(2.25, Math.max(1.5, 2200 / maxDimPt));
      const renderVp = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(renderVp.width));
      canvas.height = Math.max(1, Math.floor(renderVp.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create 2D canvas context for Visual Replica rendering.');
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport: renderVp }).promise;

      let imgBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      let imgType: 'png' | 'jpg' = 'png';

      if (!imgBlob || imgBlob.size > 2_200_000) {
        imgBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.93)
        );
        imgType = 'jpg';
      }

      // Immediately release backing store to avoid OOM on large multi-page PDFs
      canvas.width = 0;
      canvas.height = 0;

      if (!imgBlob || imgBlob.size === 0) {
        throw new Error(`Failed to encode Visual Replica image for page ${pageNum}.`);
      }

      const imgBytes = new Uint8Array(await imgBlob.arrayBuffer());
      const pxWidth = Math.max(1, Math.round(widthPt * (96 / 72)));
      // Subtract 1pt before px conversion so Word/OOXML renderers do not wrap onto a trailing blank page
      const pxHeight = Math.max(1, Math.round((heightPt - 1) * (96 / 72)));

      sections.push({
        properties: {
          page: {
            size: makeDocxPageSize(widthPt, heightPt),
            margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0, gutter: 0 },
          },
        },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0, line: 240 },
            children: [
              new ImageRun({
                data: imgBytes,
                type: imgType,
                transformation: { width: pxWidth, height: pxHeight },
              }),
            ],
          }),
        ],
      });
    }

    onProgress?.(92, 'Packaging Visual Replica Word (.docx)...');
    const doc = new Document({
      creator: 'Fylovanta',
      title: file.name.replace(/\.[^/.]+$/, '') || 'Visual Replica Document',
      description:
        'Visual Replica Word export: pages are embedded as fixed high-resolution page images and are not individually editable.',
      sections,
    });

    const outBlob = await Packer.toBlob(doc);
    onProgress?.(100, 'Complete');
    return outBlob;
  });
}

async function pdfToDocxEditable(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(12, 'Inspecting PDF fonts, tables, colors, and graphics...');
  const arrayBuffer = await file.arrayBuffer();

  return await withPdfJsDocument(arrayBuffer, async (pdf) => {
    const totalPages = pdf.numPages;
    if (totalPages === 0) {
      throw new Error('The PDF document contains no pages.');
    }

    const pages: InspectedPdfPage[] = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(
        Math.round(18 + (pageNum / totalPages) * 58),
        `Analyzing layout on page ${pageNum} of ${totalPages}...`
      );
      const page = await pdf.getPage(pageNum);
      pages.push(await inspectPdfPageDeep(page, pageNum, true));
    }

    const totalReadableChars = pages.reduce(
      (sum, p) => sum + p.spans.filter((s) => !s.isWatermark).map((s) => s.str.trim()).join('').length,
      0
    );
    const totalImageOps = pages.reduce((sum, p) => sum + p.imagePaintOps, 0);

    if (totalReadableChars < 8 && pages.every((p) => p.images.length === 0)) {
      if (totalImageOps > 0) {
        throw new Error(
          'This PDF appears to be scanned/image-only with no selectable text layer. Choose Visual Replica Word mode to preserve the exact page appearance.'
        );
      }
      throw new Error('No selectable text or graphics were found in this PDF document.');
    }

    onProgress?.(82, 'Reconstructing editable Word (.docx) document...');

    // Compute median body font size across all non-watermark spans
    const fontSizes: number[] = [];
    for (const p of pages) {
      for (const s of p.spans) {
        if (!s.isWatermark && s.str.trim().length >= 2) {
          fontSizes.push(Math.round(s.fontSize * 2) / 2);
        }
      }
    }
    fontSizes.sort((a, b) => a - b);
    const medianFont = fontSizes.length > 0 ? fontSizes[Math.floor(fontSizes.length / 2)] : 11;

    // Identify repeated running headers/footers on multi-page PDFs (or tight margin headers/footers)
    const headerTemplates = new Map<string, number>();
    const footerTemplates = new Map<string, number>();

    if (pages.length >= 2) {
      for (const p of pages) {
        const topSpans = p.spans.filter(
          (s) => !s.isWatermark && s.yTop <= p.heightPt * 0.105
        );
        const botSpans = p.spans.filter(
          (s) => !s.isWatermark && s.yTop >= p.heightPt * 0.895
        );
        const topSeen = new Set<string>();
        for (const hl of groupRichSpansIntoLines(topSpans)) {
          const tpl = normalizeHeaderFooterTemplate(hl.text);
          if (tpl && !topSeen.has(tpl)) {
            topSeen.add(tpl);
            headerTemplates.set(tpl, (headerTemplates.get(tpl) || 0) + 1);
          }
        }
        const botSeen = new Set<string>();
        for (const fl of groupRichSpansIntoLines(botSpans)) {
          const tpl = normalizeHeaderFooterTemplate(fl.text);
          if (tpl && !botSeen.has(tpl)) {
            botSeen.add(tpl);
            footerTemplates.set(tpl, (footerTemplates.get(tpl) || 0) + 1);
          }
        }
      }
    }

    const minRepeat = Math.max(2, Math.ceil(pages.length * 0.5));
    const runningHeaderSet = new Set(
      Array.from(headerTemplates.entries())
        .filter(([, count]) => count >= minRepeat)
        .map(([tpl]) => tpl)
    );
    const runningFooterSet = new Set(
      Array.from(footerTemplates.entries())
        .filter(([, count]) => count >= minRepeat)
        .map(([tpl]) => tpl)
    );

    const sections: ISectionOptions[] = [];

    for (let idx = 0; idx < pages.length; idx++) {
      const page = pages[idx];

      // Exclude spans owned by detected vector tables or watermarks
      const nonTableSpans = page.spans.filter((sp) => {
        if (sp.isWatermark) return false;
        const midX = sp.x + Math.min(sp.width * 0.3, 10);
        const insideTable = page.tables.some(
          (t) =>
            midX >= t.x - 4 &&
            midX <= t.x + t.width + 4 &&
            sp.yTop >= t.yTop - 6 &&
            sp.yTop <= t.yTop + t.height + 6
        );
        return !insideTable;
      });

      const headerLines: RichLine[] = [];
      const footerLines: RichLine[] = [];
      const bodySpans: PdfSpanInfo[] = [];

      const topLines = groupRichSpansIntoLines(
        nonTableSpans.filter((s) => s.yTop <= page.heightPt * 0.105)
      );
      const botLines = groupRichSpansIntoLines(
        nonTableSpans.filter((s) => s.yTop >= page.heightPt * 0.895)
      );
      const excludedHeaderSpans = new Set<PdfSpanInfo>();
      const excludedFooterSpans = new Set<PdfSpanInfo>();

      for (const hl of topLines) {
        const tpl = normalizeHeaderFooterTemplate(hl.text);
        if (
          runningHeaderSet.has(tpl) ||
          (pages.length === 1 && hl.yTop <= 42 && hl.fontSize <= medianFont * 0.98)
        ) {
          headerLines.push(hl);
          hl.spans.forEach((s) => excludedHeaderSpans.add(s));
        }
      }

      for (const fl of botLines) {
        const tpl = normalizeHeaderFooterTemplate(fl.text);
        if (
          runningFooterSet.has(tpl) ||
          (pages.length === 1 && fl.yTop >= page.heightPt - 42 && fl.fontSize <= medianFont * 0.98)
        ) {
          footerLines.push(fl);
          fl.spans.forEach((s) => excludedFooterSpans.add(s));
        }
      }

      for (const sp of nonTableSpans) {
        if (!excludedHeaderSpans.has(sp) && !excludedFooterSpans.has(sp)) {
          bodySpans.push(sp);
        }
      }

      const pageElements = buildEditablePageElements(page, bodySpans, medianFont);
      if (pageElements.length === 0) {
        pageElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Page ${page.pageNumber} contains no selectable body text]`,
                italics: true,
                color: '64748B',
              }),
            ],
          })
        );
      }

      const topMarginPt = headerLines.length > 0 ? Math.max(page.margins.top, 44) : page.margins.top;
      const bottomMarginPt = footerLines.length > 0 ? Math.max(page.margins.bottom, 44) : page.margins.bottom;

      sections.push({
        properties: {
          page: {
            size: makeDocxPageSize(page.widthPt, page.heightPt),
            margin: {
              top: Math.round(topMarginPt * 20),
              right: Math.round(page.margins.right * 20),
              bottom: Math.round(bottomMarginPt * 20),
              left: Math.round(page.margins.left * 20),
              header: 360,
              footer: 360,
            },
          },
        },
        headers:
          headerLines.length > 0
            ? {
                default: new Header({
                  children: headerLines.map((hl) =>
                    buildHeaderFooterParagraph(
                      hl,
                      page.pageNumber,
                      page.widthPt,
                      page.margins.left,
                      page.margins.right
                    )
                  ),
                }),
              }
            : undefined,
        footers:
          footerLines.length > 0
            ? {
                default: new Footer({
                  children: footerLines.map((fl) =>
                    buildHeaderFooterParagraph(
                      fl,
                      page.pageNumber,
                      page.widthPt,
                      page.margins.left,
                      page.margins.right
                    )
                  ),
                }),
              }
            : undefined,
        children: pageElements,
      });
    }

    const allSubstitutions = Array.from(new Set(pages.flatMap((p) => p.fontSubstitutions)));
    const doc = new Document({
      creator: 'Fylovanta',
      title: file.name.replace(/\.[^/.]+$/, '') || 'Converted Document',
      description:
        allSubstitutions.length > 0
          ? `Editable Word conversion (font fallbacks applied: ${allSubstitutions.slice(0, 6).join(', ')})`
          : 'Editable Word conversion preserving text styles, tables, lists, and images.',
      sections,
    });

    const blob = await Packer.toBlob(doc);
    onProgress?.(100, 'Complete');
    return blob;
  });
}

export async function pdfToDocx(
  file: File,
  optionsOrProgress?: ConversionOptions | ((progress: number, message: string) => void),
  maybeProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  const options: ConversionOptions =
    typeof optionsOrProgress === 'function' ? {} : optionsOrProgress || {};
  const onProgress =
    typeof optionsOrProgress === 'function' ? optionsOrProgress : maybeProgress;

  if (options.pdfConversionMode === 'visual-replica') {
    return await pdfToDocxVisualReplica(file, onProgress);
  }
  return await pdfToDocxEditable(file, onProgress);
}

export async function imagesToPdf(
  files: File[],
  options: ConversionOptions = {},
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error('No images provided to build PDF.');
  }

  const orientationOption = options.pageOrientation || 'portrait';
  const format = options.pageSize === 'letter' ? 'letter' : 'a4';
  const margin = Math.max(0, options.imageMargin ?? 10);

  let doc: jsPDF | null = null;
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(Math.round(((i + 0.1) / total) * 85), `Processing image ${i + 1} of ${total}...`);

    const rasterData = await rasterizeImageToDataUrl(file);
    const pageOrient: 'portrait' | 'landscape' =
      orientationOption === 'auto'
        ? rasterData.width > rasterData.height
          ? 'landscape'
          : 'portrait'
        : orientationOption;

    if (!doc) {
      doc = new jsPDF({
        orientation: pageOrient,
        unit: 'mm',
        format,
        compress: true,
      });
    } else {
      doc.addPage(format, pageOrient);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxW = Math.max(10, pageWidth - margin * 2);
    const maxH = Math.max(10, pageHeight - margin * 2);

    const ratio = Math.min(maxW / rasterData.width, maxH / rasterData.height);
    const renderW = rasterData.width * ratio;
    const renderH = rasterData.height * ratio;
    const posX = margin + (maxW - renderW) / 2;
    const posY = margin + (maxH - renderH) / 2;

    doc.addImage(
      rasterData.dataUrl,
      rasterData.format,
      posX,
      posY,
      renderW,
      renderH,
      undefined,
      'FAST'
    );
  }

  if (!doc) {
    throw new Error('No images provided to build PDF.');
  }

  onProgress?.(95, 'Finalizing PDF output...');
  const pdfBlob = doc.output('blob');
  await assertPdfBlobMatchesPages(pdfBlob, total);

  onProgress?.(100, 'Complete');
  return pdfBlob;
}

export async function mergePdfFiles(
  files: File[],
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error('Please select at least one PDF file to merge.');
  }

  onProgress?.(10, 'Initializing PDF merger...');
  const mergedPdf = await PDFDocument.create();
  let expectedTotalPages = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(
      Math.round(15 + ((i + 1) / files.length) * 70),
      `Merging document ${i + 1} of ${files.length} (${file.name})...`
    );

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await loadReadablePdfDocument(arrayBuffer);
    const indices = pdf.getPageIndices();
    expectedTotalPages += indices.length;
    const copiedPages = await mergedPdf.copyPages(pdf, indices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  onProgress?.(90, 'Generating merged PDF...');
  const mergedPdfBytes = await mergedPdf.save({ useObjectStreams: true });

  const resultBlob = new Blob([new Uint8Array(mergedPdfBytes)], { type: 'application/pdf' });
  await assertPdfBlobMatchesPages(resultBlob, expectedTotalPages);

  onProgress?.(100, 'Complete');
  return resultBlob;
}

export async function splitPdfFile(
  file: File,
  pageRangeStr?: string,
  onProgress?: (progress: number, message: string) => void,
  splitMode: 'range' | 'extract-all' = 'range'
): Promise<{ blob: Blob; convertedName: string; extraOutputs?: ExtraOutputFile[] }> {
  onProgress?.(15, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await loadReadablePdfDocument(arrayBuffer);
  const totalPages = srcPdf.getPageCount();
  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'document';

  if (totalPages === 0) {
    throw new Error('The PDF document contains no pages.');
  }

  const targetPages = parsePageRange(pageRangeStr, totalPages);

  if (splitMode === 'extract-all') {
    const zip = new JSZip();
    const extraOutputs: ExtraOutputFile[] = [];

    for (let i = 0; i < targetPages.length; i++) {
      const pageNum = targetPages[i];
      onProgress?.(Math.round(20 + (i / targetPages.length) * 65), `Extracting page ${pageNum}...`);
      const singleDoc = await PDFDocument.create();
      const [copied] = await singleDoc.copyPages(srcPdf, [pageNum - 1]);
      singleDoc.addPage(copied);
      const bytes = await singleDoc.save({ useObjectStreams: true });
      const rawBytes = new Uint8Array(bytes);
      const pageBlob = new Blob([rawBytes], { type: 'application/pdf' });
      await assertPdfBlobMatchesPages(pageBlob, 1);
      const pageName = `${baseName}-page-${pageNum}.pdf`;
      zip.file(pageName, rawBytes);
      extraOutputs.push({ name: pageName, blob: pageBlob, size: pageBlob.size });
    }

    onProgress?.(92, 'Bundling split PDFs into ZIP...');
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    onProgress?.(100, 'Complete');
    return {
      blob: zipBlob,
      convertedName: `${baseName}-split-pages.zip`,
      extraOutputs,
    };
  }

  const newPdf = await PDFDocument.create();
  onProgress?.(45, `Extracting ${targetPages.length} selected page(s)...`);

  const zeroIndices = targetPages.map((p) => p - 1);
  const copiedPages = await newPdf.copyPages(srcPdf, zeroIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  onProgress?.(85, 'Assembling extracted PDF...');
  const pdfBytes = await newPdf.save({ useObjectStreams: true });

  const resultBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  await assertPdfBlobMatchesPages(resultBlob, targetPages.length);

  onProgress?.(100, 'Complete');
  return {
    blob: resultBlob,
    convertedName: `${baseName}-extracted.pdf`,
  };
}

/**
 * Re-renders PDF pages in-browser at controlled scale + JPEG compression into a compressed PDF.
 */
async function rasterRecompressPdfInBrowser(
  arrayBuffer: ArrayBuffer,
  compressionLevel: 'low' | 'medium' | 'high',
  onProgress?: (progress: number, message: string) => void
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  const preset =
    compressionLevel === 'high'
      ? { scale: 1.0, jpegQuality: 0.45 }
      : compressionLevel === 'low'
      ? { scale: 1.75, jpegQuality: 0.84 }
      : { scale: 1.35, jpegQuality: 0.68 };

  return await withPdfJsDocument(arrayBuffer, async (pdf) => {
    const totalPages = pdf.numPages;
    if (totalPages === 0 || totalPages > 150) {
      return null;
    }

    let doc: jsPDF | null = null;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(
        Math.round(35 + (pageNum / totalPages) * 50),
        `Recompressing page ${pageNum} of ${totalPages} in browser...`
      );

      const page = await pdf.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1.0 });
      const viewport = page.getViewport({ scale: preset.scale });

      const widthPt = Math.max(72, baseViewport.width);
      const heightPt = Math.max(72, baseViewport.height);
      const orientation: 'portrait' | 'landscape' = widthPt > heightPt ? 'landscape' : 'portrait';

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return null;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const jpegDataUrl = canvas.toDataURL('image/jpeg', preset.jpegQuality);
      canvas.width = 0;
      canvas.height = 0;

      if (!doc) {
        doc = new jsPDF({
          orientation,
          unit: 'pt',
          format: [widthPt, heightPt],
          compress: true,
        });
      } else {
        doc.addPage([widthPt, heightPt], orientation);
      }

      doc.addImage(jpegDataUrl, 'JPEG', 0, 0, widthPt, heightPt, undefined, 'FAST');
    }

    if (!doc) return null;
    const blob = doc.output('blob');
    await assertPdfBlobMatchesPages(blob, totalPages);
    return blob;
  });
}

/**
 * Compresses a PDF using a true Browser-First strategy with strict validity & size checks.
 */
export async function compressPdfFile(
  file: File,
  compressionLevel: 'low' | 'medium' | 'high' = 'medium',
  onProgress?: (progress: number, message: string) => void,
  jobId?: string
): Promise<{ blob: Blob; processorMode: 'browser' | 'server' }> {
  const originalSize = file.size;
  onProgress?.(12, 'Analyzing PDF structure in browser...');
  const arrayBuffer = await file.arrayBuffer();

  // Fail early on encrypted/corrupt PDFs rather than returning misleading output
  const sourceDoc = await loadReadablePdfDocument(arrayBuffer);
  const expectedPages = sourceDoc.getPageCount();
  if (expectedPages === 0) {
    throw new Error('The PDF document contains no pages.');
  }

  // Pass 1: Structural object-stream compression via pdf-lib (lossless / preserves vector text)
  let structuralBlob: Blob | null = null;
  try {
    onProgress?.(22, 'Optimizing PDF object streams locally...');
    const pdfBytes = await sourceDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    const candidate = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    if (candidate.size > 0) {
      await assertPdfBlobMatchesPages(candidate, expectedPages);
      structuralBlob = candidate;
    }
  } catch {
    structuralBlob = null;
  }

  if (
    compressionLevel === 'low' &&
    structuralBlob &&
    structuralBlob.size < originalSize * 0.95
  ) {
    onProgress?.(100, 'Complete');
    return { blob: structuralBlob, processorMode: 'browser' };
  }

  // Pass 2: Browser-side image downsampling + JPEG compression
  let rasterBlob: Blob | null = null;
  try {
    rasterBlob = await rasterRecompressPdfInBrowser(arrayBuffer, compressionLevel, onProgress);
  } catch {
    rasterBlob = null;
  }

  const browserCandidates = [structuralBlob, rasterBlob].filter(
    (b): b is Blob => Boolean(b && b.size > 0 && b.size < originalSize)
  );

  if (browserCandidates.length > 0) {
    browserCandidates.sort((a, b) => a.size - b.size);
    onProgress?.(100, 'Complete');
    return { blob: browserCandidates[0], processorMode: 'browser' };
  }

  // Pass 3: Optional Ghostscript server fallback ONLY if explicitly enabled
  if (FEATURES.serverFallbacksEnabled) {
    const caps = await getServerCapabilities();
    if (caps.ok && caps.ghostscript && caps.serverFallbacksEnabled) {
      try {
        const serverRes = await convertViaServer(
          '/api/compress-pdf',
          file,
          'pdf',
          { pdfCompression: compressionLevel, isCompressOnly: true },
          onProgress,
          jobId
        );
        if (serverRes.blob.size > 0 && serverRes.blob.size < originalSize) {
          await assertPdfBlobMatchesPages(serverRes.blob, expectedPages);
          return { blob: serverRes.blob, processorMode: 'server' };
        }
      } catch {
        // fall through to honest report below
      }
    }
  }

  throw new Error(
    `This PDF (${Math.max(1, Math.round(originalSize / 1024))} KB) is already tightly compressed and could not be reduced further in-browser without increasing file size.`
  );
}

export async function rotatePdfFile(
  file: File,
  rotationDegrees: 90 | 180 | 270 = 90,
  pageRangeStr?: string,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(20, 'Loading PDF pages...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await loadReadablePdfDocument(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();
  if (totalPages === 0) {
    throw new Error('The PDF document contains no pages.');
  }

  const targetPages = new Set(parsePageRange(pageRangeStr, totalPages));
  const pages = pdfDoc.getPages();

  onProgress?.(55, `Rotating ${targetPages.size} page(s) by ${rotationDegrees}°...`);
  pages.forEach((page, idx) => {
    if (targetPages.has(idx + 1)) {
      const currentAngle = page.getRotation().angle || 0;
      page.setRotation(degrees((currentAngle + rotationDegrees) % 360));
    }
  });

  onProgress?.(90, 'Saving rotated PDF...');
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const resultBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  await assertPdfBlobMatchesPages(resultBlob, totalPages);

  onProgress?.(100, 'Complete');
  return resultBlob;
}

export async function addPdfPageNumbers(
  file: File,
  position: 'bottom-center' | 'bottom-right' | 'top-right' = 'bottom-center',
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(20, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await loadReadablePdfDocument(arrayBuffer);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('The PDF document contains no pages.');
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const total = pages.length;

  pages.forEach((page, idx) => {
    onProgress?.(Math.round(30 + ((idx + 1) / total) * 55), `Numbering page ${idx + 1} of ${total}...`);
    const { width, height } = page.getSize();
    const label = `${idx + 1} / ${total}`;
    const fontSize = 10;
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    let x = (width - textWidth) / 2;
    let y = 24;
    if (position === 'bottom-right') {
      x = Math.max(24, width - textWidth - 28);
      y = 24;
    } else if (position === 'top-right') {
      x = Math.max(24, width - textWidth - 28);
      y = Math.max(24, height - 28);
    }

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.28, 0.33, 0.41),
    });
  });

  onProgress?.(92, 'Finalizing numbered PDF...');
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const resultBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  await assertPdfBlobMatchesPages(resultBlob, total);

  onProgress?.(100, 'Complete');
  return resultBlob;
}

async function renderUnicodeWatermarkPng(
  text: string,
  opacity: number
): Promise<{ pngBytes: Uint8Array; width: number; height: number } | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const fontPx = 96;
  ctx.font = `bold ${fontPx}px system-ui, -apple-system, "Segoe UI", "Noto Sans", sans-serif`;
  const metrics = ctx.measureText(text);
  const w = Math.max(200, Math.ceil(metrics.width + 64));
  const h = Math.ceil(fontPx * 1.6);

  canvas.width = w;
  canvas.height = h;
  const ctx2 = canvas.getContext('2d')!;
  ctx2.clearRect(0, 0, w, h);
  ctx2.font = `bold ${fontPx}px system-ui, -apple-system, "Segoe UI", "Noto Sans", sans-serif`;
  ctx2.fillStyle = `rgba(38, 99, 235, ${opacity})`;
  ctx2.textAlign = 'center';
  ctx2.textBaseline = 'middle';
  ctx2.fillText(text, w / 2, h / 2);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  canvas.width = 0;
  canvas.height = 0;

  if (!blob || blob.size === 0) return null;
  return {
    pngBytes: new Uint8Array(await blob.arrayBuffer()),
    width: w,
    height: h,
  };
}

export async function watermarkPdfFile(
  file: File,
  watermarkText = 'CONFIDENTIAL',
  opacity = 0.22,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  const cleanText = watermarkText.trim() || 'CONFIDENTIAL';
  const safeOpacity = Math.max(0.08, Math.min(0.8, Number(opacity) || 0.22));
  const isWinAnsi = /^[\x20-\x7E\u00A0-\u00FF]*$/.test(cleanText);

  onProgress?.(20, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await loadReadablePdfDocument(arrayBuffer);
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('The PDF document contains no pages.');
  }

  const total = pages.length;
  const thetaRad = (35 * Math.PI) / 180;

  if (isWinAnsi) {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    pages.forEach((page, idx) => {
      onProgress?.(Math.round(30 + ((idx + 1) / total) * 55), `Watermarking page ${idx + 1} of ${total}...`);
      const { width, height } = page.getSize();
      const baseSize = Math.min(54, Math.max(20, Math.round(width / Math.max(6, cleanText.length * 0.85))));
      const textWidth = font.widthOfTextAtSize(cleanText, baseSize);

      // Center rotated text accurately around page midpoint
      const x = width / 2 - (textWidth / 2) * Math.cos(thetaRad) + (baseSize / 3) * Math.sin(thetaRad);
      const y = height / 2 - (textWidth / 2) * Math.sin(thetaRad) - (baseSize / 3) * Math.cos(thetaRad);

      page.drawText(cleanText, {
        x,
        y,
        size: baseSize,
        font,
        color: rgb(0.15, 0.39, 0.92),
        opacity: safeOpacity,
        rotate: degrees(35),
      });
    });
  } else {
    const rendered = await renderUnicodeWatermarkPng(cleanText, safeOpacity);
    if (!rendered) {
      throw new Error(
        'Non-Latin watermark characters require a browser Canvas environment to render.'
      );
    }
    const pngImg = await pdfDoc.embedPng(rendered.pngBytes);
    pages.forEach((page, idx) => {
      onProgress?.(Math.round(30 + ((idx + 1) / total) * 55), `Watermarking page ${idx + 1} of ${total}...`);
      const { width, height } = page.getSize();
      const targetW = Math.min(width * 0.72, rendered.width * 0.55);
      const targetH = targetW * (rendered.height / rendered.width);
      const x = width / 2 - (targetW / 2) * Math.cos(thetaRad) + (targetH / 2) * Math.sin(thetaRad);
      const y = height / 2 - (targetW / 2) * Math.sin(thetaRad) - (targetH / 2) * Math.cos(thetaRad);

      page.drawImage(pngImg, {
        x,
        y,
        width: targetW,
        height: targetH,
        rotate: degrees(35),
      });
    });
  }

  onProgress?.(92, 'Saving watermarked PDF...');
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const resultBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  await assertPdfBlobMatchesPages(resultBlob, total);

  onProgress?.(100, 'Complete');
  return resultBlob;
}

function parsePageRange(pageRangeStr: string | undefined, totalPages: number): number[] {
  if (!pageRangeStr || pageRangeStr.trim() === '' || pageRangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pageNumbers: number[] = [];
  const parts = pageRangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        const lo = Math.max(1, Math.min(start, end));
        const hi = Math.min(totalPages, Math.max(start, end));
        for (let p = lo; p <= hi; p++) {
          pageNumbers.push(p);
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pageNumbers.push(pageNum);
      }
    }
  }

  const unique = Array.from(new Set(pageNumbers));
  if (unique.length === 0) {
    throw new Error(`No valid pages selected. Document contains ${totalPages} page(s).`);
  }
  return unique;
}

async function rasterizeImageToDataUrl(
  file: File
): Promise<{ dataUrl: string; width: number; height: number; format: 'JPEG' | 'PNG' }> {
  const isSvg = file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg');
  const isJpeg =
    file.type === 'image/jpeg' ||
    file.name.toLowerCase().endsWith('.jpg') ||
    file.name.toLowerCase().endsWith('.jpeg');

  let loadFile = file;
  if (isSvg) {
    const raw = await file.text();
    const svgMatch = raw.match(/<svg\b([^>]*)>/i);
    if (svgMatch) {
      const attrs = svgMatch[1];
      const hasW = /\bwidth\s*=\s*["']\s*\d+(\.\d+)?(px)?\s*["']/i.test(attrs);
      const hasH = /\bheight\s*=\s*["']\s*\d+(\.\d+)?(px)?\s*["']/i.test(attrs);
      const vb = attrs.match(/\bviewBox\s*=\s*["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*["']/i);
      if ((!hasW || !hasH) && vb) {
        const vbW = Math.max(1, parseFloat(vb[3]) || 1024);
        const vbH = Math.max(1, parseFloat(vb[4]) || 1024);
        const scale = Math.max(vbW, vbH) < 1024 ? 1024 / Math.max(vbW, vbH) : 1;
        const cleanAttrs = attrs
          .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
          .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '')
          .trim();
        const patched = raw.replace(
          /<svg\b[^>]*>/i,
          `<svg ${cleanAttrs} width="${Math.round(vbW * scale)}" height="${Math.round(vbH * scale)}">`
        );
        loadFile = new File([patched], file.name, { type: 'image/svg+xml' });
      }
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(loadFile);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 600;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context creation failed.'));
        return;
      }

      if (isJpeg) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);

      const outFormat: 'JPEG' | 'PNG' = isJpeg ? 'JPEG' : 'PNG';
      const dataUrl = isJpeg
        ? canvas.toDataURL('image/jpeg', 0.92)
        : canvas.toDataURL('image/png');
      canvas.width = 0;
      canvas.height = 0;
      resolve({ dataUrl, width: w, height: h, format: outFormat });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image "${file.name}". Please ensure it is a valid image file.`));
    };
    img.src = url;
  });
}
