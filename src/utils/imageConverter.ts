import { ConversionOptions, ProcessorMode } from '../types';
import { FEATURES } from '../config/features';
import { convertViaServer, getServerCapabilities } from './serverApi';

/**
 * Normalizes SVG markup lacking explicit pixel width/height (e.g. viewBox-only SVGs)
 * so browser rasterization does not fall back to 300x150 or blurry thumbnail dimensions.
 */
async function prepareSvgFileForRasterization(
  file: File,
  options: ConversionOptions
): Promise<File> {
  const raw = await file.text();
  const svgTagMatch = raw.match(/<svg\b([^>]*)>/i);
  if (!svgTagMatch) {
    throw new Error(`"${file.name}" does not contain a valid <svg> root element.`);
  }

  const attrs = svgTagMatch[1];
  const hasPixelWidth = /\bwidth\s*=\s*["']\s*\d+(\.\d+)?(px|pt|em|rem)?\s*["']/i.test(attrs) &&
    !/\bwidth\s*=\s*["']\s*[^"']*%/i.test(attrs);
  const hasPixelHeight = /\bheight\s*=\s*["']\s*\d+(\.\d+)?(px|pt|em|rem)?\s*["']/i.test(attrs) &&
    !/\bheight\s*=\s*["']\s*[^"']*%/i.test(attrs);

  if (hasPixelWidth && hasPixelHeight) {
    return file;
  }

  const viewBoxMatch = attrs.match(/\bviewBox\s*=\s*["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*["']/i);
  let targetW = 1024;
  let targetH = 1024;

  if (viewBoxMatch) {
    const vbW = Math.max(1, parseFloat(viewBoxMatch[3]) || 1024);
    const vbH = Math.max(1, parseFloat(viewBoxMatch[4]) || 1024);
    const minRenderLongEdge = 1024;
    const maxCurEdge = Math.max(vbW, vbH);
    const scale =
      options.resizeMode === 'custom' && (options.width || options.height)
        ? 1
        : maxCurEdge < minRenderLongEdge
        ? minRenderLongEdge / maxCurEdge
        : 1;
    targetW = Math.max(1, Math.round(vbW * scale));
    targetH = Math.max(1, Math.round(vbH * scale));
  }

  let updatedAttrs = attrs
    .replace(/\bwidth\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bheight\s*=\s*["'][^"']*["']/gi, '')
    .trim();

  updatedAttrs = `${updatedAttrs} width="${targetW}" height="${targetH}"`.trim();
  const patchedSvg = raw.replace(/<svg\b[^>]*>/i, `<svg ${updatedAttrs}>`);
  return new File([patchedSvg], file.name, { type: 'image/svg+xml' });
}

/**
 * Converts an image file to a different format, applying optional resizing, rotation,
 * grayscale filter, and quality settings via HTML5 Canvas first.
 * Dynamically imports BMP/ICO/GIF encoders on demand.
 */
export async function convertImageFile(
  file: File,
  targetFormat: string,
  options: ConversionOptions = {},
  onProgress?: (progress: number, message: string) => void,
  jobId?: string
): Promise<{ blob: Blob; processorMode: ProcessorMode }> {
  const targetFormatLower = targetFormat.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isSpecialInput = ['heic', 'heif', 'tiff', 'tif'].includes(ext);
  const isSvgInput = ext === 'svg' || file.type.includes('svg');

  onProgress?.(15, 'Loading image...');

  const sourceFile = isSvgInput
    ? await prepareSvgFileForRasterization(file, options)
    : file;

  let imageBitmap: HTMLImageElement | ImageBitmap;
  try {
    imageBitmap = await createImageBitmapOrFallback(sourceFile);
  } catch (decodeErr) {
    if (isSpecialInput || targetFormatLower === 'tiff') {
      if (FEATURES.serverFallbacksEnabled) {
        const caps = await getServerCapabilities();
        if (caps.ok && caps.imagemagick && caps.serverFallbacksEnabled) {
          onProgress?.(25, `Decoding ${ext.toUpperCase()} via optional server fallback...`);
          const serverRes = await convertViaServer(
            '/api/convert',
            file,
            targetFormatLower,
            options,
            onProgress,
            jobId
          );
          return { blob: serverRes.blob, processorMode: 'server' };
        }
      }
      throw new Error(
        `Your current browser cannot natively decode ${ext.toUpperCase()} images in client memory. Please use Safari on Apple devices or convert from JPG/PNG/WebP directly in-browser.`
      );
    }
    throw decodeErr;
  }

  onProgress?.(40, 'Applying image transformations...');

  const srcW =
    'naturalWidth' in imageBitmap
      ? imageBitmap.naturalWidth || imageBitmap.width
      : imageBitmap.width;
  const srcH =
    'naturalHeight' in imageBitmap
      ? imageBitmap.naturalHeight || imageBitmap.height
      : imageBitmap.height;

  if (!srcW || !srcH || srcW <= 0 || srcH <= 0) {
    if ('close' in imageBitmap && typeof imageBitmap.close === 'function') {
      imageBitmap.close();
    }
    throw new Error(`"${file.name}" decoded with invalid dimensions (${srcW}x${srcH}).`);
  }

  let targetW = srcW;
  let targetH = srcH;

  if (options.resizeMode === 'percentage' && options.percentage) {
    const scale = options.percentage / 100;
    targetW = Math.max(1, Math.round(srcW * scale));
    targetH = Math.max(1, Math.round(srcH * scale));
  } else if (options.resizeMode === 'custom') {
    if (options.width && options.height) {
      targetW = Math.max(1, options.width);
      targetH = Math.max(1, options.height);
    } else if (options.width && !options.height) {
      targetW = Math.max(1, options.width);
      targetH =
        options.maintainAspectRatio !== false
          ? Math.max(1, Math.round((srcH / srcW) * options.width))
          : srcH;
    } else if (options.height && !options.width) {
      targetH = Math.max(1, options.height);
      targetW =
        options.maintainAspectRatio !== false
          ? Math.max(1, Math.round((srcW / srcH) * options.height))
          : srcW;
    }
  }

  if (targetFormatLower === 'ico') {
    const maxDim = Math.max(targetW, targetH);
    if (maxDim > 256) {
      const icoScale = 256 / maxDim;
      targetW = Math.max(1, Math.round(targetW * icoScale));
      targetH = Math.max(1, Math.round(targetH * icoScale));
    }
  }

  const rotation = ((options.rotate || 0) % 360 + 360) % 360;
  const is90or270 = rotation === 90 || rotation === 270;
  const canvasW = is90or270 ? targetH : targetW;
  const canvasH = is90or270 ? targetW : targetH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;

  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to create Canvas 2D rendering context.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (['jpg', 'jpeg', 'bmp'].includes(targetFormatLower)) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    ctx.drawImage(imageBitmap, -targetW / 2, -targetH / 2, targetW, targetH);
    ctx.restore();

    if (options.grayscale) {
      onProgress?.(65, 'Applying grayscale filter...');
      const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    onProgress?.(80, `Encoding ${targetFormat.toUpperCase()} file...`);

    if (targetFormatLower === 'bmp') {
      const { encodeImageDataToBmp } = await import('./bmpEncoder');
      const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
      const bmpBlob = encodeImageDataToBmp(imgData);
      onProgress?.(100, 'Complete');
      return { blob: bmpBlob, processorMode: 'browser' };
    }

    if (targetFormatLower === 'ico') {
      const { encodeCanvasToIco } = await import('./icoEncoder');
      const icoBlob = await encodeCanvasToIco(canvas);
      onProgress?.(100, 'Complete');
      return { blob: icoBlob, processorMode: 'browser' };
    }

    if (targetFormatLower === 'gif') {
      const { encodeFramesToGif } = await import('./gifEncoder');
      const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
      const gifBlob = encodeFramesToGif([{ imageData: imgData, delayMs: 100 }], canvasW, canvasH);
      onProgress?.(100, 'Complete');
      return { blob: gifBlob, processorMode: 'browser' };
    }

    let mimeType = 'image/png';
    const quality = Math.max(0.1, Math.min(1.0, options.quality ?? 0.92));

    switch (targetFormatLower) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      case 'avif':
        mimeType = 'image/avif';
        break;
      case 'png':
      default:
        mimeType = 'image/png';
        break;
    }

    const resultBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size === 0) {
            reject(
              new Error(
                `Failed to encode image as ${targetFormat.toUpperCase()}. Your browser may not support exporting ${targetFormat.toUpperCase()}.`
              )
            );
            return;
          }
          const actualMime = (blob.type || '').toLowerCase();
          if (actualMime && actualMime !== mimeType) {
            reject(
              new Error(
                `Your browser does not support native ${targetFormat.toUpperCase()} encoding (it fell back to ${actualMime}). Please choose WebP, PNG, or JPG instead.`
              )
            );
            return;
          }
          resolve(blob);
        },
        mimeType,
        quality
      );
    });

    onProgress?.(100, 'Complete');
    return { blob: resultBlob, processorMode: 'browser' };
  } finally {
    if ('close' in imageBitmap && typeof imageBitmap.close === 'function') {
      imageBitmap.close();
    }
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function createImageBitmapOrFallback(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if (
    typeof createImageBitmap === 'function' &&
    !file.type.includes('svg') &&
    !file.name.toLowerCase().endsWith('.svg')
  ) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fallback to Image element
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          `Could not decode image file "${file.name}". Please ensure it is a valid, uncorrupted image.`
        )
      );
    };
    img.src = url;
  });
}
