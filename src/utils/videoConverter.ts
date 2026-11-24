import { ConversionOptions, ProcessorMode } from '../types';
import { FEATURES } from '../config/features';
import { convertViaServer } from './serverApi';

/**
 * Video converter gated by FEATURES.mediaToolsEnabled for free-tier server sustainability.
 * Preserves FFmpeg + Canvas GIF89a implementation when enabled.
 */
export async function convertVideoFile(
  file: File,
  targetFormat: string,
  options: ConversionOptions = {},
  onProgress?: (progress: number, message: string) => void,
  jobId?: string
): Promise<{ blob: Blob; processorMode: ProcessorMode }> {
  if (!FEATURES.mediaToolsEnabled) {
    throw new Error(
      'Video conversion tools are temporarily unavailable on this deployment while Fylovanta prioritizes fast browser-side PDF, image, and document tools.'
    );
  }

  const targetLower = targetFormat.toLowerCase();

  try {
    const serverRes = await convertViaServer('/api/convert', file, targetLower, options, onProgress, jobId);
    return { blob: serverRes.blob, processorMode: 'server' };
  } catch (serverErr) {
    if (targetLower === 'gif') {
      const gifBlob = await convertVideoToGifLocal(file, options, onProgress);
      return { blob: gifBlob, processorMode: 'browser' };
    }
    throw serverErr;
  }
}

async function convertVideoToGifLocal(
  file: File,
  options: ConversionOptions = {},
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(10, 'Loading video locally...');
  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video. The format may be unsupported by this browser.'));
    };
  });

  const duration = Math.min(video.duration || 6, 12);
  const fps = Math.min(20, Math.max(5, options.gifFps || 10));
  const totalFrames = Math.max(1, Math.floor(duration * fps));
  const frameInterval = duration / totalFrames;

  const targetWidth = options.gifWidth || Math.min(video.videoWidth || 480, 480);
  const targetHeight = Math.round(((video.videoHeight || 360) / (video.videoWidth || 480)) * targetWidth);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    URL.revokeObjectURL(videoUrl);
    throw new Error('Could not initialize canvas context.');
  }

  const gifFrames: Array<{ imageData: ImageData; delayMs: number }> = [];
  const frameDelayMs = Math.round(1000 / fps);

  for (let f = 0; f < totalFrames; f++) {
    const time = f * frameInterval;
    video.currentTime = time;
    await new Promise<void>((res) => {
      video.onseeked = () => res();
    });

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    gifFrames.push({ imageData: imgData, delayMs: frameDelayMs });

    const progressPercent = Math.round(15 + (f / totalFrames) * 65);
    onProgress?.(progressPercent, `Encoding frame ${f + 1} of ${totalFrames}...`);
  }

  URL.revokeObjectURL(videoUrl);
  canvas.width = 0;
  canvas.height = 0;
  onProgress?.(85, 'Assembling animated GIF89a file...');

  const { encodeFramesToGif } = await import('./gifEncoder');
  const gifBlob = encodeFramesToGif(gifFrames, targetWidth, targetHeight);
  if (!gifBlob || gifBlob.size === 0) {
    throw new Error('The converted file could not be generated correctly. Please try again.');
  }

  onProgress?.(100, 'Complete');
  return gifBlob;
}
