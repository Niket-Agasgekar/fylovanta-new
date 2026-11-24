import JSZip from 'jszip';
import mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';

export interface OutputValidationOptions {
  targetFormat: string;
  expectedMimeType?: string;
  expectedPdfPageCount?: number;
  minPdfPageCount?: number;
  expectReadableText?: boolean;
  expectVisualOrText?: boolean;
  minArchiveEntries?: number;
}

export interface OutputValidationResult {
  valid: boolean;
  byteLength: number;
  details?: string;
}

const FORMAT_MIME_MAP: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
  zip: ['application/zip', 'application/x-zip-compressed'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  avif: ['image/avif'],
  gif: ['image/gif'],
  bmp: ['image/bmp', 'image/x-ms-bmp'],
  ico: ['image/x-icon', 'image/vnd.microsoft.icon'],
  json: ['application/json'],
  csv: ['text/csv'],
  html: ['text/html'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/plain'],
};

function matchesAscii(bytes: Uint8Array, offset: number, ascii: string): boolean {
  if (bytes.length < offset + ascii.length) return false;
  for (let i = 0; i < ascii.length; i++) {
    if (bytes[offset + i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

async function verifyBrowserImageDecode(blob: Blob): Promise<{ width: number; height: number }> {
  if (typeof Image === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    // Non-DOM Node test environment: skip DOM Image decode and rely on binary header checks
    return { width: 1, height: 1 };
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      if (width <= 0 || height <= 0) {
        reject(new Error('Decoded image has invalid zero dimensions.'));
      } else {
        resolve({ width, height });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Generated image file failed browser decode validation.'));
    };
    img.src = url;
  });
}

function validateMimeMatch(blob: Blob, targetExt: string, expectedMimeType?: string): void {
  const actual = (blob.type || '').split(';')[0].trim().toLowerCase();
  if (!actual) return;

  if (expectedMimeType) {
    const cleanExpected = expectedMimeType.split(';')[0].trim().toLowerCase();
    if (actual !== cleanExpected && !(targetExt === 'docx' && actual === 'application/zip')) {
      throw new Error(
        `Output format mismatch: expected ${cleanExpected} for .${targetExt}, but got ${actual}.`
      );
    }
    return;
  }

  const allowed = FORMAT_MIME_MAP[targetExt];
  if (allowed && !allowed.includes(actual)) {
    throw new Error(
      `Output format mismatch: .${targetExt} file was encoded as ${actual} instead of ${allowed[0]}.`
    );
  }
}

export async function validateConvertedOutput(
  blob: Blob,
  options: OutputValidationOptions
): Promise<OutputValidationResult> {
  const ext = options.targetFormat.toLowerCase().replace(/^\./, '');

  if (!blob || !(blob instanceof Blob) || blob.size === 0) {
    throw new Error('The converted output file is empty (0 bytes).');
  }

  validateMimeMatch(blob, ext, options.expectedMimeType);

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length === 0) {
    throw new Error('The converted output contains no binary data.');
  }

  switch (ext) {
    case 'pdf': {
      if (!matchesAscii(bytes, 0, '%PDF-')) {
        throw new Error('Generated PDF failed binary header validation (%PDF- signature missing).');
      }
      let pdfDoc: PDFDocument;
      try {
        pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      } catch {
        throw new Error('Generated PDF structure could not be parsed cleanly.');
      }
      const pageCount = pdfDoc.getPageCount();
      if (pageCount < (options.minPdfPageCount ?? 1)) {
        throw new Error('Generated PDF contains zero pages.');
      }
      if (
        typeof options.expectedPdfPageCount === 'number' &&
        pageCount !== options.expectedPdfPageCount
      ) {
        throw new Error(
          `Generated PDF page count mismatch (expected ${options.expectedPdfPageCount}, got ${pageCount}).`
        );
      }
      return { valid: true, byteLength: bytes.length, details: `${pageCount} pages` };
    }

    case 'docx': {
      if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
        throw new Error('Generated Word (.docx) file failed ZIP container signature validation.');
      }
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(buffer);
      } catch {
        throw new Error('Generated Word (.docx) archive could not be opened.');
      }
      const contentTypes = zip.file('[Content_Types].xml');
      const documentXmlFile = zip.file('word/document.xml');
      if (!contentTypes || !documentXmlFile) {
        throw new Error('Generated Word (.docx) is missing required OOXML parts.');
      }
      const documentXml = await documentXmlFile.async('string');
      if (!documentXml.includes('<w:document') || !documentXml.includes('<w:body')) {
        throw new Error('Generated Word (.docx) document.xml structure is invalid.');
      }
      const extracted = await mammoth.extractRawText({ arrayBuffer: buffer });
      const textLen = extracted.value.trim().length;
      const mediaFiles = Object.keys(zip.files).filter((k) => /^word\/media\/.+/.test(k));
      const hasEmbeddedImages = mediaFiles.length > 0 && documentXml.includes('<w:drawing');

      if (options.expectReadableText && textLen === 0) {
        throw new Error('Generated Word (.docx) contains no readable text content.');
      }
      if (options.expectVisualOrText && textLen === 0 && !hasEmbeddedImages) {
        throw new Error(
          'Generated Visual Replica Word (.docx) contains neither readable text nor embedded page images.'
        );
      }
      return {
        valid: true,
        byteLength: bytes.length,
        details: textLen > 0 ? `${textLen} chars` : `${mediaFiles.length} embedded page image(s)`,
      };
    }

    case 'zip': {
      if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        throw new Error('Generated ZIP archive failed PK header validation.');
      }
      let zip: JSZip;
      try {
        zip = await JSZip.loadAsync(buffer);
      } catch {
        throw new Error('Generated ZIP archive is corrupted and could not be opened.');
      }
      const entries = Object.values(zip.files).filter((f) => !f.dir);
      if (entries.length < (options.minArchiveEntries ?? 1)) {
        throw new Error('Generated ZIP archive contains no files.');
      }
      return { valid: true, byteLength: bytes.length, details: `${entries.length} entries` };
    }

    case 'png': {
      const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      if (bytes.length < 24 || !sig.every((b, idx) => bytes[idx] === b) || !matchesAscii(bytes, 12, 'IHDR')) {
        throw new Error('Generated PNG file failed binary signature validation.');
      }
      const dims = await verifyBrowserImageDecode(blob);
      return { valid: true, byteLength: bytes.length, details: `${dims.width}x${dims.height}` };
    }

    case 'jpg':
    case 'jpeg': {
      if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
        throw new Error('Generated JPG file failed JPEG header validation.');
      }
      const dims = await verifyBrowserImageDecode(blob);
      return { valid: true, byteLength: bytes.length, details: `${dims.width}x${dims.height}` };
    }

    case 'webp': {
      if (bytes.length < 12 || !matchesAscii(bytes, 0, 'RIFF') || !matchesAscii(bytes, 8, 'WEBP')) {
        throw new Error('Generated WebP file failed RIFF/WEBP signature validation.');
      }
      const dims = await verifyBrowserImageDecode(blob);
      return { valid: true, byteLength: bytes.length, details: `${dims.width}x${dims.height}` };
    }

    case 'gif': {
      if (!matchesAscii(bytes, 0, 'GIF87a') && !matchesAscii(bytes, 0, 'GIF89a')) {
        throw new Error('Generated GIF file failed GIF87a/GIF89a signature validation.');
      }
      if (bytes[bytes.length - 1] !== 0x3b) {
        throw new Error('Generated GIF file is missing the required trailer byte.');
      }
      const dims = await verifyBrowserImageDecode(blob);
      return { valid: true, byteLength: bytes.length, details: `${dims.width}x${dims.height}` };
    }

    case 'bmp': {
      if (bytes.length < 54 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
        throw new Error('Generated BMP file failed BM header validation.');
      }
      const view = new DataView(buffer);
      const declaredSize = view.getUint32(2, true);
      if (declaredSize !== bytes.length) {
        throw new Error('Generated BMP header file size does not match byte length.');
      }
      return { valid: true, byteLength: bytes.length };
    }

    case 'ico': {
      if (bytes.length < 22) {
        throw new Error('Generated ICO file is truncated.');
      }
      const view = new DataView(buffer);
      const reserved = view.getUint16(0, true);
      const type = view.getUint16(2, true);
      const count = view.getUint16(4, true);
      const payloadOffset = view.getUint32(18, true);
      if (reserved !== 0 || type !== 1 || count < 1 || payloadOffset >= bytes.length) {
        throw new Error('Generated ICO directory header is invalid.');
      }
      return { valid: true, byteLength: bytes.length };
    }

    case 'avif': {
      if (bytes.length < 12 || !matchesAscii(bytes, 4, 'ftyp')) {
        throw new Error('Generated AVIF file failed ISOBMFF ftyp signature validation.');
      }
      const dims = await verifyBrowserImageDecode(blob);
      return { valid: true, byteLength: bytes.length, details: `${dims.width}x${dims.height}` };
    }

    case 'json': {
      const text = new TextDecoder('utf-8').decode(bytes);
      if (!text.trim()) {
        throw new Error('Generated JSON file is empty.');
      }
      try {
        JSON.parse(text);
      } catch {
        throw new Error('Generated JSON file failed syntax parsing validation.');
      }
      return { valid: true, byteLength: bytes.length };
    }

    case 'csv': {
      const text = new TextDecoder('utf-8').decode(bytes);
      if (!text.trim() || text.includes('\u0000')) {
        throw new Error('Generated CSV file is empty or contains invalid binary bytes.');
      }
      return { valid: true, byteLength: bytes.length };
    }

    case 'html': {
      const text = new TextDecoder('utf-8').decode(bytes);
      if (!text.trim() || (!text.includes('<html') && !text.includes('<!DOCTYPE'))) {
        throw new Error('Generated HTML document failed HTML structure validation.');
      }
      return { valid: true, byteLength: bytes.length };
    }

    case 'txt':
    case 'md': {
      const text = new TextDecoder('utf-8').decode(bytes);
      if (!text.trim() || text.includes('\u0000')) {
        throw new Error(`Generated .${ext} output contains no readable text content.`);
      }
      return { valid: true, byteLength: bytes.length };
    }

    default:
      return { valid: true, byteLength: bytes.length };
  }
}
