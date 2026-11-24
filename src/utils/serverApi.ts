import { ConversionOptions } from '../types';

export interface ServerCapabilities {
  ok: boolean;
  ffmpeg: boolean;
  ghostscript: boolean;
  imagemagick: boolean;
  mediaToolsEnabled: boolean;
  serverFallbacksEnabled: boolean;
  maxUploadMb: number;
}

let cachedCapabilities: ServerCapabilities | null = null;

export async function getServerCapabilities(): Promise<ServerCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    const data = await res.json();
    cachedCapabilities = {
      ok: true,
      ffmpeg: !!data.capabilities?.ffmpeg,
      ghostscript: !!data.capabilities?.ghostscript,
      imagemagick: !!data.capabilities?.imagemagick,
      mediaToolsEnabled: !!data.features?.mediaToolsEnabled,
      serverFallbacksEnabled: !!data.features?.serverFallbacksEnabled,
      maxUploadMb: Number(data.maxUploadMb) || 25,
    };
    return cachedCapabilities;
  } catch {
    return {
      ok: false,
      ffmpeg: false,
      ghostscript: false,
      imagemagick: false,
      mediaToolsEnabled: false,
      serverFallbacksEnabled: false,
      maxUploadMb: 25,
    };
  }
}

/**
 * Streams a file to the Express ephemeral fallback endpoint (/api/convert or /api/compress-pdf)
 * with upload progress tracking. Files are deleted from the server immediately after response.
 */
export function convertViaServer(
  endpoint: '/api/convert' | '/api/compress-pdf',
  file: File,
  targetFormat: string,
  options: ConversionOptions,
  onProgress?: (progress: number, message: string) => void,
  jobId?: string
): Promise<{ blob: Blob; convertedName: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);
    formData.append('options', JSON.stringify(options || {}));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    if (jobId) {
      xhr.setRequestHeader('X-Fylovanta-Job-Id', jobId);
    }
    xhr.responseType = 'blob';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.min(55, Math.round((event.loaded / event.total) * 50) + 5);
        onProgress?.(pct, 'Uploading to temporary processor...');
      }
    };

    xhr.upload.onload = () => {
      onProgress?.(65, `Processing ${targetFormat.toUpperCase()} on server...`);
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response as Blob;
        if (!blob || blob.size === 0) {
          reject(new Error('Server returned an empty file.'));
          return;
        }
        const disposition = xhr.getResponseHeader('Content-Disposition') || '';
        const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        const baseName = file.name.replace(/\.[^/.]+$/, '') || 'converted';
        const convertedName = match?.[1] ? decodeURIComponent(match[1]) : `${baseName}.${targetFormat}`;
        onProgress?.(100, 'Complete');
        resolve({ blob, convertedName });
      } else {
        try {
          const text = await (xhr.response as Blob).text();
          const parsed = JSON.parse(text);
          reject(new Error(parsed.error || `Server conversion failed (${xhr.status}).`));
        } catch {
          reject(new Error(`Server conversion failed (${xhr.status}).`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while connecting to conversion server.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Conversion timed out. Try a smaller file or lower quality preset.'));
    };

    xhr.timeout = 180000;
    onProgress?.(5, 'Connecting to conversion engine...');
    xhr.send(formData);
  });
}
