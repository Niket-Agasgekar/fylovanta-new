import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import compression from 'compression';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import type { ViteDevServer } from 'vite';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MAX_UPLOAD_MB = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 25));
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const TEMP_ROOT = path.join(os.tmpdir(), 'fylovanta-jobs');

const ENABLE_MEDIA_TOOLS =
  String(process.env.ENABLE_MEDIA_TOOLS ?? process.env.VITE_ENABLE_MEDIA_TOOLS ?? 'false').toLowerCase() ===
  'true';
const ENABLE_SERVER_FALLBACKS =
  String(
    process.env.ENABLE_SERVER_FALLBACKS ?? process.env.VITE_ENABLE_SERVER_FALLBACKS ?? 'false'
  ).toLowerCase() === 'true';

const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const CONTACT_TO_EMAIL = (process.env.CONTACT_TO_EMAIL || 'niketagasgekar@gmail.com').trim();
const CONTACT_FROM_EMAIL = (
  process.env.CONTACT_FROM_EMAIL || 'Fylovanta Support <onboarding@resend.dev>'
).trim();
const GSC_VERIFICATION = (
  process.env.GSC_VERIFICATION ||
  process.env.VITE_GSC_VERIFICATION ||
  ''
).trim();
const GA_CONFIGURED = Boolean((process.env.VITE_GA_MEASUREMENT_ID || '').trim());
const ADSENSE_ENABLED = String(process.env.VITE_ADSENSE_ENABLED || '').toLowerCase() === 'true';

const RESEND_CONFIGURED = Boolean(RESEND_API_KEY && CONTACT_TO_EMAIL && CONTACT_FROM_EMAIL);

fs.mkdirSync(TEMP_ROOT, { recursive: true });

interface RouteMetaEntry {
  title: string;
  description: string;
  category?: string;
}

interface RouteMetaFile {
  home: RouteMetaEntry;
  routes: Record<string, RouteMetaEntry>;
}

const routeMetaPath = path.join(__dirname, 'src', 'data', 'routeMeta.json');
const ROUTE_META = JSON.parse(fs.readFileSync(routeMetaPath, 'utf-8')) as RouteMetaFile;

const MEDIA_TOOL_SLUGS = new Set([
  'compress-video',
  'compress-audio',
  'mp4-to-mp3',
  'mov-to-mp4',
  'video-to-gif',
  'audio-converter',
  'mp3-converter',
  'wav-converter',
  'video-converter',
  'mp4-converter',
]);

const MEDIA_CATEGORY_SLUGS = new Set(['video-tools', 'audio-tools']);

function isDisabledMediaRoute(slug: string): boolean {
  if (ENABLE_MEDIA_TOOLS || !slug) return false;
  const clean = slug.replace(/^\//, '').toLowerCase();
  return MEDIA_TOOL_SLUGS.has(clean) || MEDIA_CATEGORY_SLUGS.has(clean);
}

async function sendContactEmailViaResend(params: {
  referenceId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ delivered: boolean; providerId?: string; error?: string }> {
  if (!RESEND_CONFIGURED) {
    return { delivered: false, error: 'Resend email delivery is not configured.' };
  }

  const textBody = [
    `New Fylovanta Contact Inquiry`,
    `Reference ID: ${params.referenceId}`,
    `From: ${params.name} <${params.email}>`,
    `Subject: ${params.subject}`,
    ``,
    `Message:`,
    params.message,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0F172A; line-height: 1.6; max-width: 600px;">
      <h2 style="margin: 0 0 12px; font-size: 18px;">New Fylovanta Contact Inquiry</h2>
      <p style="margin: 0 0 8px; font-size: 13px; color: #475569;"><strong>Reference ID:</strong> ${escapeHtml(params.referenceId)}</p>
      <p style="margin: 0 0 8px; font-size: 13px; color: #475569;"><strong>From:</strong> ${escapeHtml(params.name)} &lt;${escapeHtml(params.email)}&gt;</p>
      <p style="margin: 0 0 16px; font-size: 13px; color: #475569;"><strong>Subject:</strong> ${escapeHtml(params.subject)}</p>
      <div style="background: #F7F9FC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 14px; white-space: pre-wrap; font-size: 14px;">${escapeHtml(params.message)}</div>
    </div>
  `.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: params.email,
        subject: `[${params.referenceId}] ${params.subject} — Fylovanta Contact`,
        text: textBody,
        html: htmlBody,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return {
        delivered: false,
        error: body.message || `Resend returned HTTP ${res.status}.`,
      };
    }

    return { delivered: true, providerId: body.id };
  } catch (err) {
    return {
      delivered: false,
      error: err instanceof Error ? err.message : 'Resend request failed.',
    };
  }
}

// Detect optional local system binaries at startup (only used when feature flags are enabled)
const capabilities = {
  ffmpeg: false,
  ffprobe: false,
  ghostscript: false,
  imagemagick: false,
};

async function detectBinaries(): Promise<void> {
  const checks: Array<{ key: keyof typeof capabilities; bin: string; args: string[] }> = [
    { key: 'ffmpeg', bin: 'ffmpeg', args: ['-version'] },
    { key: 'ffprobe', bin: 'ffprobe', args: ['-version'] },
    { key: 'ghostscript', bin: 'gs', args: ['--version'] },
    { key: 'imagemagick', bin: 'convert', args: ['-version'] },
  ];
  await Promise.all(
    checks.map(async (item) => {
      try {
        await execFileAsync(item.bin, item.args, { timeout: 3000 });
        capabilities[item.key] = true;
      } catch {
        capabilities[item.key] = false;
      }
    })
  );
}

// Track all per-limiter sliding-window maps so our sweep prevents unbounded memory growth
const registeredRateMaps: Array<Map<string, number[]>> = [];

function createRateLimiter(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, number[]>();
  registeredRateMaps.push(buckets);

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const history = (buckets.get(ip) || []).filter((ts) => now - ts < windowMs);
    if (history.length >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests from this network address. Please wait a moment and try again.',
      });
      return;
    }
    history.push(now);
    if (buckets.size > 10000 && !buckets.has(ip)) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
    buckets.set(ip, history);
    next();
  };
}

// Background sweep every 5 minutes: delete orphaned temp directories & prune stale rate-limit buckets
setInterval(() => {
  const now = Date.now();
  try {
    const entries = fs.readdirSync(TEMP_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(TEMP_ROOT, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > 15 * 60 * 1000) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      } catch {
        // ignore concurrent deletion
      }
    }
  } catch {
    // ignore sweep error
  }

  for (const map of registeredRateMaps) {
    for (const [key, timestamps] of map.entries()) {
      const recent = timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (recent.length === 0) {
        map.delete(key);
      } else {
        map.set(key, recent);
      }
    }
  }
}, 5 * 60 * 1000).unref();

function sanitizeFilename(name: string): string {
  const base = path.basename(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'file';
}

function sanitizeExt(ext: unknown): string {
  return String(ext || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);
}

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || req.protocol || 'https';
  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
  const host =
    (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader) ||
    process.env.VITE_SITE_DOMAIN ||
    'fylovanta.com';
  return `${proto}://${host}`;
}

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const jobDirs = new WeakMap<Request, string>();

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const jobDir = path.join(TEMP_ROOT, crypto.randomUUID());
    fs.mkdirSync(jobDir, { recursive: true });
    jobDirs.set(req, jobDir);
    cb(null, jobDir);
  },
  filename: (_req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

function cleanupJobDir(req: Request): void {
  const jobDir = jobDirs.get(req);
  if (!jobDir) return;
  try {
    fs.rmSync(jobDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup error
  }
}

function handleSingleUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    cleanupJobDir(req);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          error: `File exceeds the ${MAX_UPLOAD_MB} MB server processing limit. Use in-browser tools or a smaller file.`,
        });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(400).json({
      error: err instanceof Error ? err.message : 'File upload failed.',
    });
  });
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  weba: 'audio/webm',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const IMAGE_FORMATS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'ico',
  'avif',
  'tiff',
  'tif',
  'heic',
  'heif',
  'svg',
]);
const AUDIO_FORMATS = new Set(['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'weba']);
const VIDEO_FORMATS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'gif']);

async function startServer(): Promise<void> {
  await detectBinaries();

  const app = express();
  app.set('trust proxy', 1);

  // HTTP Compression & Baseline Security Headers
  app.use(compression());
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  // 1. Health & Feature Status Endpoint
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      capabilities,
      features: {
        mediaToolsEnabled: ENABLE_MEDIA_TOOLS,
        serverFallbacksEnabled: ENABLE_SERVER_FALLBACKS,
      },
      integrations: {
        resendConfigured: RESEND_CONFIGURED,
        gaConfigured: GA_CONFIGURED,
        adsenseEnabled: ADSENSE_ENABLED,
      },
      maxUploadMb: MAX_UPLOAD_MB,
      retentionPolicy: 'browser-first-zero-storage',
    });
  });

  // 2. Contact Form Endpoint (Stateless Resend Email Delivery; zero database storage)
  app.post('/api/contact', createRateLimiter(5, 5 * 60 * 1000), async (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const { name, email, subject, message, company, website, formStartedAt } = body;

    // Anti-spam honeypot check
    if (
      (typeof company === 'string' && company.trim().length > 0) ||
      (typeof website === 'string' && website.trim().length > 0)
    ) {
      res.status(400).json({ ok: false, emailDelivered: false, error: 'Invalid submission.' });
      return;
    }

    // Anti-bot minimum human interaction delay check when formStartedAt is supplied
    if (formStartedAt !== undefined && formStartedAt !== null) {
      const started = Number(formStartedAt);
      if (Number.isFinite(started) && Date.now() - started < 1200) {
        res.status(400).json({
          ok: false,
          emailDelivered: false,
          error: 'Please wait a moment before submitting the form.',
        });
        return;
      }
    }

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim() : '';
    const cleanSubject =
      typeof subject === 'string' && subject.trim()
        ? subject.trim().slice(0, 120)
        : 'General Support';
    const cleanMessage = typeof message === 'string' ? message.trim() : '';

    if (cleanName.length < 2 || cleanName.length > 100) {
      res.status(400).json({
        ok: false,
        emailDelivered: false,
        error: 'Please provide your name (2–100 characters).',
      });
      return;
    }
    if (
      !cleanEmail ||
      cleanEmail.length > 180 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      res.status(400).json({
        ok: false,
        emailDelivered: false,
        error: 'Please provide a valid email address.',
      });
      return;
    }
    if (cleanMessage.length < 10 || cleanMessage.length > 3000) {
      res.status(400).json({
        ok: false,
        emailDelivered: false,
        error: 'Please enter a message between 10 and 3000 characters.',
      });
      return;
    }

    if (!RESEND_CONFIGURED) {
      res.status(503).json({
        ok: false,
        emailDelivered: false,
        error: `Contact email delivery is not configured on this host yet. Please email ${CONTACT_TO_EMAIL} directly.`,
      });
      return;
    }

    const referenceId = `FV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const emailResult = await sendContactEmailViaResend({
      referenceId,
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
    });

    if (!emailResult.delivered) {
      res.status(502).json({
        ok: false,
        emailDelivered: false,
        error: `We could not deliver your message via email right now. Please try again or email ${CONTACT_TO_EMAIL} directly.`,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      referenceId,
      emailDelivered: true,
      receivedAt: new Date().toISOString(),
      notice: 'Your inquiry has been delivered to Fylovanta support.',
    });
  });

  // 3. Optional Ghostscript PDF Compression Fallback Endpoint (feature-flagged off by default)
  app.post(
    '/api/compress-pdf',
    createRateLimiter(30, 60 * 1000),
    handleSingleUpload,
    async (req, res) => {
      const jobDir = jobDirs.get(req);
      const cleanup = () => cleanupJobDir(req);
      res.on('close', cleanup);

      try {
        if (!ENABLE_SERVER_FALLBACKS) {
          cleanup();
          res.status(503).json({
            error:
              'Server-side PDF fallback is disabled on this host. Use Fylovanta in-browser PDF compression instead.',
          });
          return;
        }

        if (!req.file || !jobDir) {
          cleanup();
          res.status(400).json({ error: 'No PDF file uploaded.' });
          return;
        }

        if (!capabilities.ghostscript) {
          cleanup();
          res.status(503).json({ error: 'Ghostscript compression engine is unavailable on this host.' });
          return;
        }

        const inputPath = req.file.path;
        const originalSize = req.file.size;
        const baseName = sanitizeFilename(req.file.originalname).replace(/\.[^/.]+$/, '') || 'document';
        const outputName = `${baseName}-compressed.pdf`;
        const outputPath = path.join(jobDir, outputName);

        let options: Record<string, unknown> = Object.create(null);
        try {
          options = req.body?.options ? JSON.parse(String(req.body.options)) : Object.create(null);
        } catch {
          options = Object.create(null);
        }

        const level = options.pdfCompression || 'medium';
        const pdfSetting = level === 'high' ? '/screen' : level === 'low' ? '/printer' : '/ebook';

        await execFileAsync(
          'gs',
          [
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            `-dPDFSETTINGS=${pdfSetting}`,
            '-dNOPAUSE',
            '-dQUIET',
            '-dBATCH',
            `-sOutputFile=${outputPath}`,
            inputPath,
          ],
          { timeout: 120000 }
        );

        if (!fs.existsSync(outputPath)) {
          throw new Error('Failed to generate compressed PDF.');
        }

        const compressedStat = fs.statSync(outputPath);
        const finalFile =
          compressedStat.size > 0 && compressedStat.size < originalSize ? outputPath : inputPath;
        const finalSize = fs.statSync(finalFile).size;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputName)}"`);
        res.setHeader('X-Original-Size', String(originalSize));
        res.setHeader('X-Processed-Size', String(finalSize));
        res.setHeader('Cache-Control', 'no-store');

        const stream = fs.createReadStream(finalFile);
        stream.on('end', cleanup);
        stream.on('error', cleanup);
        stream.pipe(res);
      } catch (err) {
        cleanup();
        res.status(500).json({
          error: err instanceof Error ? err.message : 'PDF compression failed.',
        });
      }
    }
  );

  // 4. Optional Unified Media & Legacy Image Transcoding Endpoint (feature-flagged off by default)
  app.post(
    '/api/convert',
    createRateLimiter(30, 60 * 1000),
    handleSingleUpload,
    async (req, res) => {
      const jobDir = jobDirs.get(req);
      const cleanup = () => cleanupJobDir(req);
      res.on('close', cleanup);

      try {
        if (!req.file || !jobDir) {
          cleanup();
          res.status(400).json({ error: 'No file uploaded.' });
          return;
        }

        const targetFormat = sanitizeExt(req.body?.targetFormat);
        if (!targetFormat || !MIME_BY_EXT[targetFormat]) {
          cleanup();
          res.status(400).json({ error: `Unsupported target format: "${targetFormat}".` });
          return;
        }

        let options: Record<string, unknown> = Object.create(null);
        try {
          options = req.body?.options ? JSON.parse(String(req.body.options)) : Object.create(null);
        } catch {
          options = Object.create(null);
        }

        const inputPath = req.file.path;
        const inputExt = sanitizeExt(path.extname(req.file.originalname).replace('.', '')) || 'bin';
        const baseName = sanitizeFilename(req.file.originalname).replace(/\.[^/.]+$/, '') || 'converted';
        const outputFilename = `${baseName}.${targetFormat}`;
        const outputPath = path.join(jobDir, `out-${crypto.randomBytes(4).toString('hex')}.${targetFormat}`);

        const isImageTransform =
          IMAGE_FORMATS.has(inputExt) && IMAGE_FORMATS.has(targetFormat) && targetFormat !== 'gif';
        const isMediaTransform =
          AUDIO_FORMATS.has(targetFormat) || VIDEO_FORMATS.has(targetFormat) || AUDIO_FORMATS.has(inputExt) || VIDEO_FORMATS.has(inputExt);

        if (isImageTransform) {
          if (!ENABLE_SERVER_FALLBACKS) {
            cleanup();
            res.status(503).json({
              error:
                'Server-side image fallback is disabled on this host. Convert images directly in your browser.',
            });
            return;
          }
          if (!capabilities.imagemagick) {
            cleanup();
            res.status(503).json({ error: 'ImageMagick processor is unavailable.' });
            return;
          }

          const imArgs = [inputPath, '-auto-orient'];
          if (options.stripMetadata !== false) {
            imArgs.push('-strip');
          }
          if (options.rotate && Number(options.rotate) % 360 !== 0) {
            imArgs.push('-rotate', String(Number(options.rotate) % 360));
          }
          if (options.grayscale) {
            imArgs.push('-colorspace', 'Gray');
          }
          if (options.resizeMode === 'percentage' && options.percentage) {
            const pct = Math.max(10, Math.min(300, Number(options.percentage)));
            imArgs.push('-resize', `${pct}%`);
          } else if (options.resizeMode === 'custom' && (options.width || options.height)) {
            const w = options.width ? String(Math.max(1, Math.min(8000, Number(options.width)))) : '';
            const h = options.height ? String(Math.max(1, Math.min(8000, Number(options.height)))) : '';
            const force = options.maintainAspectRatio === false ? '!' : '';
            imArgs.push('-resize', `${w}x${h}${force}`);
          }
          if (['jpg', 'jpeg', 'webp', 'avif'].includes(targetFormat)) {
            const q = Math.round(Math.max(0.2, Math.min(1.0, Number(options.quality ?? 0.92))) * 100);
            imArgs.push('-quality', String(q));
          }
          if (['jpg', 'jpeg', 'bmp'].includes(targetFormat)) {
            imArgs.push('-background', 'white', '-alpha', 'remove', '-alpha', 'off');
          }
          imArgs.push(`${targetFormat}:${outputPath}`);

          await execFileAsync('convert', imArgs, { timeout: 90000 });
        } else if (isMediaTransform && AUDIO_FORMATS.has(targetFormat)) {
          if (!ENABLE_MEDIA_TOOLS) {
            cleanup();
            res.status(503).json({
              error: 'Audio and video transcoding tools are temporarily disabled on this host.',
            });
            return;
          }
          if (!capabilities.ffmpeg) {
            cleanup();
            res.status(503).json({ error: 'FFmpeg audio encoder is unavailable.' });
            return;
          }

          const bitrate = ['64k', '128k', '192k', '256k', '320k'].includes(String(options.audioBitrate))
            ? String(options.audioBitrate)
            : '192k';
          const sampleRate = [22050, 44100, 48000].includes(Number(options.audioSampleRate))
            ? String(options.audioSampleRate)
            : '44100';
          const channels = options.audioChannels === '1' ? '1' : '2';
          const volume = Math.max(0.1, Math.min(2.0, Number(options.audioVolume ?? 1.0)));

          const ffArgs = ['-y', '-i', inputPath, '-vn', '-ar', sampleRate, '-ac', channels];
          if (volume !== 1.0) {
            ffArgs.push('-filter:a', `volume=${volume}`);
          }

          if (targetFormat === 'mp3') {
            ffArgs.push('-c:a', 'libmp3lame', '-b:a', bitrate);
          } else if (targetFormat === 'wav') {
            ffArgs.push('-c:a', 'pcm_s16le');
          } else if (targetFormat === 'ogg') {
            ffArgs.push('-c:a', 'libvorbis', '-b:a', bitrate);
          } else if (targetFormat === 'aac' || targetFormat === 'm4a') {
            ffArgs.push('-c:a', 'aac', '-b:a', bitrate);
            if (targetFormat === 'm4a') {
              ffArgs.push('-f', 'ipod');
            }
          } else if (targetFormat === 'flac') {
            ffArgs.push('-c:a', 'flac');
          } else if (targetFormat === 'weba') {
            ffArgs.push('-c:a', 'libopus', '-b:a', bitrate);
          }

          ffArgs.push(outputPath);
          await execFileAsync('ffmpeg', ffArgs, { timeout: 150000 });
        } else if (isMediaTransform && VIDEO_FORMATS.has(targetFormat)) {
          if (!ENABLE_MEDIA_TOOLS) {
            cleanup();
            res.status(503).json({
              error: 'Audio and video transcoding tools are temporarily disabled on this host.',
            });
            return;
          }
          if (!capabilities.ffmpeg) {
            cleanup();
            res.status(503).json({ error: 'FFmpeg video transcoder is unavailable.' });
            return;
          }

          const ffArgs = ['-y', '-i', inputPath];

          if (targetFormat === 'gif') {
            const fps = Math.max(5, Math.min(24, Number(options.gifFps || 12)));
            const width = Math.max(160, Math.min(800, Number(options.gifWidth || 480)));
            ffArgs.push(
              '-t',
              '20',
              '-vf',
              `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
              '-loop',
              '0',
              outputPath
            );
          } else {
            const resMap: Record<string, string> = {
              '1080p': 'scale=-2:1080',
              '720p': 'scale=-2:720',
              '480p': 'scale=-2:480',
              '360p': 'scale=-2:360',
            };
            const vfParts: string[] = [];
            if (options.videoResolution && resMap[String(options.videoResolution)]) {
              vfParts.push(resMap[String(options.videoResolution)]);
            } else {
              vfParts.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');
            }
            if (options.videoFps) {
              vfParts.push(`fps=${Math.max(10, Math.min(60, Number(options.videoFps)))}`);
            }

            const crf =
              options.videoQuality === 'high' ? '20' : options.videoQuality === 'low' ? '30' : '24';

            if (targetFormat === 'webm') {
              ffArgs.push(
                '-vf',
                vfParts.join(','),
                '-c:v',
                'libvpx',
                '-crf',
                crf,
                '-b:v',
                '1M',
                '-c:a',
                'libvorbis',
                '-deadline',
                'realtime',
                outputPath
              );
            } else {
              ffArgs.push(
                '-vf',
                vfParts.join(','),
                '-c:v',
                'libx264',
                '-preset',
                'veryfast',
                '-crf',
                crf,
                '-pix_fmt',
                'yuv420p',
                '-c:a',
                'aac',
                '-b:a',
                '128k',
                '-movflags',
                '+faststart',
                outputPath
              );
            }
          }

          await execFileAsync('ffmpeg', ffArgs, { timeout: 180000 });
        } else {
          cleanup();
          res
            .status(400)
            .json({ error: `Conversion from .${inputExt} to .${targetFormat} is not supported.` });
          return;
        }

        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
          throw new Error('Converted output file could not be generated.');
        }

        res.setHeader('Content-Type', MIME_BY_EXT[targetFormat] || 'application/octet-stream');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(outputFilename)}"`
        );
        res.setHeader('Cache-Control', 'no-store');

        const stream = fs.createReadStream(outputPath);
        stream.on('end', cleanup);
        stream.on('error', cleanup);
        stream.pipe(res);
      } catch (err) {
        cleanup();
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Server conversion failed.',
        });
      }
    }
  );

  // 5. AdSense ads.txt endpoint (optional, disabled by default)
  app.get('/ads.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const clientId = (process.env.ADSENSE_CLIENT_ID || process.env.VITE_ADSENSE_CLIENT_ID || '').trim();
    const isValidPub = /^ca-pub-\d{10,20}$/.test(clientId) && !/^ca-pub-0+$/.test(clientId);
    const pubMatch = ADSENSE_ENABLED && isValidPub ? clientId.match(/pub-\d+/) : null;
    if (pubMatch) {
      res.send(`google.com, ${pubMatch[0]}, DIRECT, f08c47fec0942fa0\n`);
    } else {
      res.send('# Google AdSense is currently disabled.\n');
    }
  });

  // 6. Dynamic robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = getBaseUrl(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  // 7. Dynamic XML Sitemap omitting paused media routes when ENABLE_MEDIA_TOOLS=false
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = getBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];
    const slugs = Object.keys(ROUTE_META.routes || {}).filter((slug) => !isDisabledMediaRoute(slug));

    const urls = [
      `  <url>\n    <loc>${escapeHtml(baseUrl)}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
      ...slugs.map((slug) => {
        const meta = ROUTE_META.routes[slug];
        const isLegal = meta?.category === 'legal';
        const priority = isLegal ? '0.4' : '0.9';
        const freq = isLegal ? 'monthly' : 'weekly';
        return `  <url>\n    <loc>${escapeHtml(baseUrl)}/${escapeHtml(slug)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
      }),
    ];

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
        '\n'
      )}\n</urlset>\n`
    );
  });

  // 8. Vite Dev Middleware OR Production Static Serving + SSR SEO Meta Injection
  const isProd =
    process.env.NODE_ENV === 'production' &&
    fs.existsSync(path.join(__dirname, 'dist', 'index.html'));
  let vite: ViteDevServer | null = null;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(path.join(__dirname, 'dist'), {
        index: false,
        maxAge: '7d',
      })
    );
  }

  // Catch-all HTML handler with SSR route metadata injection & authentic HTTP 404 status for unknown paths
  app.use('*', async (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) {
      res.status(404).json({ error: 'API route not found.' });
      return;
    }

    try {
      const cleanPath = (req.originalUrl.split('?')[0] || '/').replace(/\/+$/, '') || '/';
      const slug = cleanPath === '/' ? '' : cleanPath.replace(/^\//, '').toLowerCase();
      const baseUrl = getBaseUrl(req);

      const routeInfo = slug ? ROUTE_META.routes?.[slug] : ROUTE_META.home;
      const is404 = Boolean(slug && !routeInfo);
      const isDisabled = isDisabledMediaRoute(slug);

      const title = is404
        ? 'Page Not Found (404) — Fylovanta'
        : routeInfo?.title || ROUTE_META.home.title;
      const description = is404
        ? 'The requested tool or page could not be found on Fylovanta.'
        : routeInfo?.description || ROUTE_META.home.description;
      const canonical = is404
        ? `${baseUrl}/404`
        : `${baseUrl}${cleanPath === '/' ? '/' : `/${slug}`}`;
      const robotsContent = is404 || isDisabled ? 'noindex, follow' : 'index, follow';
      const ogImageUrl = `${baseUrl}/fylovanta-og.png`;

      const templatePath = isProd
        ? path.join(__dirname, 'dist', 'index.html')
        : path.join(__dirname, 'index.html');
      let html = fs.readFileSync(templatePath, 'utf-8');

      if (!isProd && vite) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }

      // Inject dynamic SEO tags directly into SSR HTML response for search crawlers & social scrapers
      html = html
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
        .replace(
          /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="description" content="${escapeHtml(description)}" />`
        )
        .replace(
          /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="robots" content="${robotsContent}" />`
        )
        .replace(
          /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
          `<link rel="canonical" href="${escapeHtml(canonical)}" />`
        )
        .replace(
          /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
          `<meta property="og:title" content="${escapeHtml(title)}" />`
        )
        .replace(
          /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
          `<meta property="og:description" content="${escapeHtml(description)}" />`
        )
        .replace(
          /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
          `<meta property="og:url" content="${escapeHtml(canonical)}" />`
        )
        .replace(
          /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
          `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`
        )
        .replace(
          /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="twitter:title" content="${escapeHtml(title)}" />`
        )
        .replace(
          /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="twitter:description" content="${escapeHtml(description)}" />`
        )
        .replace(
          /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
          `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`
        );

      if (GSC_VERIFICATION && !/name="google-site-verification"/i.test(html)) {
        html = html.replace(
          /<\/head>/i,
          `  <meta name="google-site-verification" content="${escapeHtml(GSC_VERIFICATION)}" />\n  </head>`
        );
      }

      res
        .status(is404 ? 404 : 200)
        .set({ 'Content-Type': 'text/html; charset=utf-8' })
        .send(html);
    } catch (err) {
      if (vite && err instanceof Error) {
        vite.ssrFixStacktrace(err);
      }
      next(err);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Fylovanta server running at http://localhost:${PORT} (mediaTools=${ENABLE_MEDIA_TOOLS}, serverFallbacks=${ENABLE_SERVER_FALLBACKS}, resend=${RESEND_CONFIGURED})`
    );
  });
}

startServer();
