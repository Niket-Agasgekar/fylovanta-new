import * as pdfjsLib from 'pdfjs-dist';

export type Matrix2D = [number, number, number, number, number, number];

export interface PdfSpanInfo {
  str: string;
  x: number;
  yTop: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  colorHex: string;
  highlightHex?: string;
  fillAlpha: number;
  angleDeg: number;
  isWatermark: boolean;
  hasEOL: boolean;
}

export interface PdfVectorRect {
  x: number;
  yTop: number;
  width: number;
  height: number;
  fillColorHex?: string;
  strokeColorHex?: string;
  fillAlpha: number;
  lineWidth: number;
}

export interface PdfVectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colorHex: string;
  lineWidth: number;
}

export interface PdfPlacedImage {
  x: number;
  yTop: number;
  widthPt: number;
  heightPt: number;
  bytes: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
  isBackground: boolean;
}

export interface DetectedPdfTableCell {
  colStart: number;
  colSpan: number;
  rowSpan: number;
  covered: boolean;
  shadingHex?: string;
  borderColorHex?: string;
  hasTopBorder: boolean;
  hasBottomBorder: boolean;
  hasLeftBorder: boolean;
  hasRightBorder: boolean;
  spans: PdfSpanInfo[];
}

export interface DetectedPdfTable {
  x: number;
  yTop: number;
  width: number;
  height: number;
  colWidthsPt: number[];
  rowHeightsPt: number[];
  grid: DetectedPdfTableCell[][];
}

export interface InspectedPdfPage {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  spans: PdfSpanInfo[];
  tables: DetectedPdfTable[];
  images: PdfPlacedImage[];
  watermarks: string[];
  imagePaintOps: number;
  fontSubstitutions: string[];
}

const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 1, 0, 0];

function mulMatrix(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

function applyMatrix(m: Matrix2D, x: number, y: number): { x: number; y: number } {
  return {
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
  };
}

function toHexByte(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, '0');
}

function parseColorArg(args: unknown, kind: 'rgb' | 'gray' | 'cmyk'): string | undefined {
  if (!args) return undefined;
  const arr = Array.isArray(args) ? args : [args];
  if (typeof arr[0] === 'string') {
    const s = arr[0].trim();
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(s)) {
      return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
    }
  }
  const nums = arr.map((v) => Number(v)).filter((v) => !Number.isNaN(v));
  if (kind === 'rgb' && nums.length >= 3) {
    const scale = nums[0] <= 1 && nums[1] <= 1 && nums[2] <= 1 ? 255 : 1;
    return `#${toHexByte(nums[0] * scale)}${toHexByte(nums[1] * scale)}${toHexByte(nums[2] * scale)}`;
  }
  if (kind === 'gray' && nums.length >= 1) {
    const scale = nums[0] <= 1 ? 255 : 1;
    const g = toHexByte(nums[0] * scale);
    return `#${g}${g}${g}`;
  }
  if (kind === 'cmyk' && nums.length >= 4) {
    const [c, m, y, k] = nums.map((v) => (v > 1 ? v / 100 : v));
    const r = 255 * (1 - c) * (1 - k);
    const g = 255 * (1 - m) * (1 - k);
    const b = 255 * (1 - y) * (1 - k);
    return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  }
  return undefined;
}

export function mapPdfFontToWordFamily(
  rawDesc: string,
  hasNonLatin: boolean
): { family: string; substituted: string | null } {
  const lower = rawDesc.toLowerCase();
  if (hasNonLatin) {
    return {
      family: 'Noto Sans',
      substituted: rawDesc ? `${rawDesc.trim()} → Noto Sans` : null,
    };
  }
  if (/times|georgia|garamond|cambria|palatino|baskerville|serif/.test(lower) && !/sans/.test(lower)) {
    return {
      family: 'Times New Roman',
      substituted: /times/.test(lower) ? null : `${rawDesc.trim()} → Times New Roman`,
    };
  }
  if (/courier|consolas|monaco|menlo|mono|typewriter/.test(lower)) {
    return {
      family: 'Courier New',
      substituted: /courier/.test(lower) ? null : `${rawDesc.trim()} → Courier New`,
    };
  }
  if (/calibri/.test(lower)) {
    return { family: 'Calibri', substituted: null };
  }
  if (/arial|helvetica/.test(lower)) {
    return { family: 'Arial', substituted: null };
  }
  if (/segoe|roboto|inter|open\s*sans|noto|sans/.test(lower)) {
    return {
      family: 'Calibri',
      substituted: rawDesc ? `${rawDesc.trim()} → Calibri` : null,
    };
  }
  return { family: 'Calibri', substituted: null };
}

interface TextPaintRecord {
  x: number;
  yTop: number;
  str: string;
  colorHex: string;
  fillAlpha: number;
}

interface GraphicsState {
  ctm: Matrix2D;
  fillColorHex: string;
  strokeColorHex: string;
  fillAlpha: number;
  strokeAlpha: number;
  lineWidth: number;
  fontSize: number;
}

function clusterValues(values: number[], tol = 3.5): number[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = clusters[clusters.length - 1];
    const avg = last.reduce((s, v) => s + v, 0) / last.length;
    if (sorted[i] - avg <= tol) {
      last.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }
  return clusters.map((c) => c.reduce((s, v) => s + v, 0) / c.length);
}

function extractPathSegments(
  opsListCoords: unknown,
  fullMatrix: Matrix2D,
  isStroke: boolean,
  isFill: boolean,
  fillColorHex: string,
  strokeColorHex: string,
  fillAlpha: number,
  lineWidth: number,
  rectsOut: PdfVectorRect[],
  linesOut: PdfVectorLine[]
): void {
  const args = opsListCoords as unknown[];
  const coordsHolder = args?.[1];
  const minMax = args?.[2] as ArrayLike<number> | undefined;

  // Decode subpaths from PDF.js constructPath coordinate stream
  const coordList: number[] = [];
  if (Array.isArray(coordsHolder) && coordsHolder.length > 0) {
    const first = coordsHolder[0];
    if (typeof first === 'number') {
      for (let k = 0; k < coordsHolder.length; k++) coordList.push(Number(coordsHolder[k]));
    } else if (first && typeof first === 'object' && 'length' in (first as ArrayLike<number>)) {
      const typed = first as ArrayLike<number>;
      for (let k = 0; k < typed.length; k++) coordList.push(Number(typed[k]));
    }
  }

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  const subPoints: Array<{ x: number; y: number }> = [];
  let i = 0;

  const flushSubpath = (closed: boolean) => {
    if (subPoints.length === 2 && !closed && isStroke) {
      const p1 = subPoints[0];
      const p2 = subPoints[1];
      if (Math.hypot(p2.x - p1.x, p2.y - p1.y) >= 4) {
        linesOut.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          colorHex: strokeColorHex,
          lineWidth,
        });
      }
    } else if (subPoints.length >= 2 && isStroke && !closed) {
      for (let s = 1; s < subPoints.length; s++) {
        const p1 = subPoints[s - 1];
        const p2 = subPoints[s];
        if (Math.hypot(p2.x - p1.x, p2.y - p1.y) >= 4) {
          linesOut.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            colorHex: strokeColorHex,
            lineWidth,
          });
        }
      }
    } else if (subPoints.length >= 3) {
      const xs = subPoints.map((p) => p.x);
      const ys = subPoints.map((p) => p.y);
      const x0 = Math.min(...xs);
      const x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      const y1 = Math.max(...ys);
      const w = x1 - x0;
      const h = y1 - y0;
      if (w >= 2 && h >= 1) {
        if (isFill || isStroke) {
          rectsOut.push({
            x: x0,
            yTop: y0,
            width: w,
            height: h,
            fillColorHex: isFill ? fillColorHex : undefined,
            strokeColorHex: isStroke ? strokeColorHex : undefined,
            fillAlpha,
            lineWidth,
          });
        }
        if (isStroke && w >= 6 && h >= 6) {
          linesOut.push(
            { x1: x0, y1: y0, x2: x1, y2: y0, colorHex: strokeColorHex, lineWidth },
            { x1: x0, y1: y1, x2: x1, y2: y1, colorHex: strokeColorHex, lineWidth },
            { x1: x0, y1: y0, x2: x0, y2: y1, colorHex: strokeColorHex, lineWidth },
            { x1: x1, y1: y0, x2: x1, y2: y1, colorHex: strokeColorHex, lineWidth }
          );
        }
      }
    }
    subPoints.length = 0;
  };

  while (i < coordList.length) {
    const cmd = coordList[i++];
    if (cmd === 0 && i + 1 < coordList.length) {
      if (subPoints.length > 0) flushSubpath(false);
      const rawX = coordList[i++];
      const rawY = coordList[i++];
      const pt = applyMatrix(fullMatrix, rawX, rawY);
      curX = pt.x;
      curY = pt.y;
      startX = pt.x;
      startY = pt.y;
      subPoints.push({ x: pt.x, y: pt.y });
    } else if (cmd === 1 && i + 1 < coordList.length) {
      const rawX = coordList[i++];
      const rawY = coordList[i++];
      const pt = applyMatrix(fullMatrix, rawX, rawY);
      curX = pt.x;
      curY = pt.y;
      subPoints.push({ x: pt.x, y: pt.y });
    } else if (cmd === 2 && i + 5 < coordList.length) {
      // curveTo: advance to endpoint
      i += 4;
      const rawX = coordList[i++];
      const rawY = coordList[i++];
      const pt = applyMatrix(fullMatrix, rawX, rawY);
      curX = pt.x;
      curY = pt.y;
      subPoints.push({ x: pt.x, y: pt.y });
    } else if (cmd === 3 && i + 3 < coordList.length) {
      // rectangle shortcut if present: x, y, w, h
      if (subPoints.length > 0) flushSubpath(false);
      const rx = coordList[i++];
      const ry = coordList[i++];
      const rw = coordList[i++];
      const rh = coordList[i++];
      const p1 = applyMatrix(fullMatrix, rx, ry);
      const p2 = applyMatrix(fullMatrix, rx + rw, ry + rh);
      const x0 = Math.min(p1.x, p2.x);
      const y0 = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      if (w >= 2 && h >= 0.5) {
        rectsOut.push({
          x: x0,
          yTop: y0,
          width: w,
          height: h,
          fillColorHex: isFill ? fillColorHex : undefined,
          strokeColorHex: isStroke ? strokeColorHex : undefined,
          fillAlpha,
          lineWidth,
        });
      }
      void curX;
      void curY;
      void startX;
      void startY;
    } else if (cmd === 4) {
      flushSubpath(true);
    } else {
      break;
    }
  }
  if (subPoints.length > 0) flushSubpath(false);

  // Fallback to bounding box if coords could not be parsed cleanly
  if (coordList.length === 0 && minMax && minMax.length >= 4) {
    const p1 = applyMatrix(fullMatrix, Number(minMax[0]), Number(minMax[1]));
    const p2 = applyMatrix(fullMatrix, Number(minMax[2]), Number(minMax[3]));
    const x0 = Math.min(p1.x, p2.x);
    const y0 = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    if (w >= 4 && h >= 1) {
      rectsOut.push({
        x: x0,
        yTop: y0,
        width: w,
        height: h,
        fillColorHex: isFill ? fillColorHex : undefined,
        strokeColorHex: isStroke ? strokeColorHex : undefined,
        fillAlpha,
        lineWidth,
      });
    }
  }
}

async function resolveImageObjectToPng(
  page: pdfjsLib.PDFPageProxy,
  fn: number,
  arg0: unknown[]
): Promise<{ bytes: Uint8Array; pixelWidth: number; pixelHeight: number } | null> {
  if (typeof document === 'undefined') return null;
  const ops = pdfjsLib.OPS;
  let imgObj: unknown = null;

  if (fn === ops.paintImageXObject && typeof arg0?.[0] === 'string') {
    const objName = arg0[0];
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

  if (!imgObj || typeof imgObj !== 'object') return null;
  const candidate = imgObj as {
    width?: number;
    height?: number;
    bitmap?: ImageBitmap;
    data?: Uint8Array | Uint8ClampedArray;
  };
  const w = candidate.width || candidate.bitmap?.width || 0;
  const h = candidate.height || candidate.bitmap?.height || 0;
  if (w < 20 || h < 20 || w > 6000 || h > 6000) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
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
        return null;
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      return null;
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!blob || blob.size === 0) return null;
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      pixelWidth: w,
      pixelHeight: h,
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function detectVectorTables(
  lines: PdfVectorLine[],
  rects: PdfVectorRect[],
  spans: PdfSpanInfo[]
): DetectedPdfTable[] {
  const hLines: Array<{ y: number; x1: number; x2: number; color: string }> = [];
  const vLines: Array<{ x: number; y1: number; y2: number; color: string }> = [];

  for (const l of lines) {
    const dx = Math.abs(l.x2 - l.x1);
    const dy = Math.abs(l.y2 - l.y1);
    if (dy <= 2 && dx >= 24) {
      hLines.push({
        y: (l.y1 + l.y2) / 2,
        x1: Math.min(l.x1, l.x2),
        x2: Math.max(l.x1, l.x2),
        color: l.colorHex,
      });
    } else if (dx <= 2 && dy >= 12) {
      vLines.push({
        x: (l.x1 + l.x2) / 2,
        y1: Math.min(l.y1, l.y2),
        y2: Math.max(l.y1, l.y2),
        color: l.colorHex,
      });
    }
  }

  // Keep stroked cell boxes, plus unstroked filled cells only when aligned with sibling grid rects or lines
  const candidateRects = rects.filter(
    (r) => r.width >= 20 && r.height >= 12 && r.width < 560 && r.height < 680
  );
  const boxRects = candidateRects.filter((r, idx) => {
    if (r.strokeColorHex) return true;
    const hasAlignedSibling = candidateRects.some(
      (o, oIdx) =>
        oIdx !== idx &&
        ((Math.abs(o.yTop - r.yTop) <= 3 && Math.abs(o.height - r.height) <= 4) ||
          (Math.abs(o.x - r.x) <= 3 && Math.abs(o.width - r.width) <= 6))
    );
    const touchesGridLine =
      hLines.some(
        (h) =>
          (Math.abs(h.y - r.yTop) <= 3 || Math.abs(h.y - (r.yTop + r.height)) <= 3) &&
          h.x1 <= r.x + r.width + 3 &&
          h.x2 >= r.x - 3
      ) ||
      vLines.some(
        (v) =>
          (Math.abs(v.x - r.x) <= 3 || Math.abs(v.x - (r.x + r.width)) <= 3) &&
          v.y1 <= r.yTop + r.height + 3 &&
          v.y2 >= r.yTop - 3
      );
    return hasAlignedSibling || touchesGridLine;
  });

  if (hLines.length < 2 && boxRects.length < 3) {
    return [];
  }

  // Build candidate grid regions from intersecting horizontal & vertical lines or adjacent cell rectangles
  const allYAnchors = [
    ...hLines.map((h) => ({ y: h.y, x1: h.x1, x2: h.x2 })),
    ...boxRects.flatMap((r) => [
      { y: r.yTop, x1: r.x, x2: r.x + r.width },
      { y: r.yTop + r.height, x1: r.x, x2: r.x + r.width },
    ]),
  ].sort((a, b) => a.y - b.y);

  if (allYAnchors.length < 2) return [];

  // Cluster anchors into separate vertical table bands
  const bands: Array<typeof allYAnchors> = [[allYAnchors[0]]];
  for (let i = 1; i < allYAnchors.length; i++) {
    const curBand = bands[bands.length - 1];
    const bandMaxY = Math.max(...curBand.map((a) => a.y));
    const bandMinX = Math.min(...curBand.map((a) => a.x1));
    const bandMaxX = Math.max(...curBand.map((a) => a.x2));
    const gapY = allYAnchors[i].y - bandMaxY;
    const hasVerticalBridge = vLines.some(
      (v) => v.y1 <= bandMaxY + 4 && v.y2 >= allYAnchors[i].y - 4
    );
    const hasRectBridge = boxRects.some(
      (r) => r.yTop <= bandMaxY + 4 && r.yTop + r.height >= allYAnchors[i].y - 4
    );
    const alignedHorizontalRule =
      gapY <= 34 &&
      Math.abs(allYAnchors[i].x1 - bandMinX) <= 18 &&
      Math.abs(allYAnchors[i].x2 - bandMaxX) <= 18;
    if (gapY <= 14 || hasVerticalBridge || hasRectBridge || alignedHorizontalRule) {
      curBand.push(allYAnchors[i]);
    } else {
      bands.push([allYAnchors[i]]);
    }
  }

  const tables: DetectedPdfTable[] = [];

  for (const band of bands) {
    const minY = Math.min(...band.map((b) => b.y));
    const maxY = Math.max(...band.map((b) => b.y));
    const minX = Math.min(...band.map((b) => b.x1));
    const maxX = Math.max(...band.map((b) => b.x2));
    if (maxY - minY < 24 || maxX - minX < 80) continue;

    const bandHLines = hLines.filter((h) => h.y >= minY - 3 && h.y <= maxY + 3 && h.x2 >= minX - 3 && h.x1 <= maxX + 3);
    const bandVLines = vLines.filter((v) => v.x >= minX - 3 && v.x <= maxX + 3 && v.y2 >= minY - 3 && v.y1 <= maxY + 3);
    const bandRects = boxRects.filter(
      (r) => r.yTop >= minY - 3 && r.yTop + r.height <= maxY + 3 && r.x >= minX - 3 && r.x + r.width <= maxX + 3
    );

    const rawRowYs = [
      ...bandHLines.map((h) => h.y),
      ...bandRects.flatMap((r) => [r.yTop, r.yTop + r.height]),
    ];
    const rawColXs = [
      minX,
      maxX,
      ...bandVLines.map((v) => v.x),
      ...bandRects.flatMap((r) => [r.x, r.x + r.width]),
    ];

    const rowYs = clusterValues(rawRowYs, 4);
    const colXs = clusterValues(rawColXs, 5);

    if (rowYs.length < 3 || colXs.length < 3) continue; // at least 2 rows x 2 cols

    const numRows = rowYs.length - 1;
    const numCols = colXs.length - 1;
    if (numRows > 60 || numCols > 16) continue;

    const colWidthsPt = Array.from({ length: numCols }, (_, c) => Math.max(12, colXs[c + 1] - colXs[c]));
    const rowHeightsPt = Array.from({ length: numRows }, (_, r) => Math.max(10, rowYs[r + 1] - rowYs[r]));

    // Require actual text inside this grid region
    const tableSpans = spans.filter(
      (s) =>
        !s.isWatermark &&
        s.x + s.width * 0.5 >= colXs[0] - 4 &&
        s.x + s.width * 0.5 <= colXs[numCols] + 4 &&
        s.yTop >= rowYs[0] - 6 &&
        s.yTop <= rowYs[numRows] + 6
    );
    if (tableSpans.length < 2) continue;

    const hasTopLine = (r: number, c: number) =>
      bandHLines.some(
        (h) => Math.abs(h.y - rowYs[r]) <= 4.5 && h.x1 <= colXs[c] + 5 && h.x2 >= colXs[c + 1] - 5
      ) ||
      bandRects.some(
        (rect) =>
          rect.strokeColorHex &&
          Math.abs(rect.yTop - rowYs[r]) <= 4.5 &&
          rect.x <= colXs[c] + 5 &&
          rect.x + rect.width >= colXs[c + 1] - 5
      );

    const hasBottomLine = (r: number, c: number) =>
      bandHLines.some(
        (h) => Math.abs(h.y - rowYs[r + 1]) <= 4.5 && h.x1 <= colXs[c] + 5 && h.x2 >= colXs[c + 1] - 5
      ) ||
      bandRects.some(
        (rect) =>
          rect.strokeColorHex &&
          Math.abs(rect.yTop + rect.height - rowYs[r + 1]) <= 4.5 &&
          rect.x <= colXs[c] + 5 &&
          rect.x + rect.width >= colXs[c + 1] - 5
      );

    const hasLeftLine = (r: number, c: number) =>
      bandVLines.some(
        (v) => Math.abs(v.x - colXs[c]) <= 5 && v.y1 <= rowYs[r] + 5 && v.y2 >= rowYs[r + 1] - 5
      ) ||
      bandRects.some(
        (rect) =>
          rect.strokeColorHex &&
          Math.abs(rect.x - colXs[c]) <= 5 &&
          rect.yTop <= rowYs[r] + 5 &&
          rect.yTop + rect.height >= rowYs[r + 1] - 5
      );

    const hasRightLine = (r: number, c: number) =>
      bandVLines.some(
        (v) => Math.abs(v.x - colXs[c + 1]) <= 5 && v.y1 <= rowYs[r] + 5 && v.y2 >= rowYs[r + 1] - 5
      ) ||
      bandRects.some(
        (rect) =>
          rect.strokeColorHex &&
          Math.abs(rect.x + rect.width - colXs[c + 1]) <= 5 &&
          rect.yTop <= rowYs[r] + 5 &&
          rect.yTop + rect.height >= rowYs[r + 1] - 5
      );

    const grid: DetectedPdfTableCell[][] = Array.from({ length: numRows }, (_, r) =>
      Array.from({ length: numCols }, (_, c) => {
        const cx = (colXs[c] + colXs[c + 1]) / 2;
        const cy = (rowYs[r] + rowYs[r + 1]) / 2;
        const bgRect = bandRects.find(
          (rect) =>
            rect.fillColorHex &&
            rect.fillColorHex !== '#ffffff' &&
            cx >= rect.x - 1 &&
            cx <= rect.x + rect.width + 1 &&
            cy >= rect.yTop - 1 &&
            cy <= rect.yTop + rect.height + 1
        );
        const borderLine = bandHLines[0] || bandVLines[0];
        return {
          colStart: c,
          colSpan: 1,
          rowSpan: 1,
          covered: false,
          shadingHex: bgRect?.fillColorHex,
          borderColorHex: bgRect?.strokeColorHex || borderLine?.color || '#CBD5E1',
          hasTopBorder: hasTopLine(r, c),
          hasBottomBorder: hasBottomLine(r, c),
          hasLeftBorder: hasLeftLine(r, c),
          hasRightBorder: hasRightLine(r, c),
          spans: [],
        };
      })
    );

    // Infer horizontal colSpan & vertical rowSpan where interior border dividers are absent
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (cell.covered) continue;

        let spanCols = 1;
        while (c + spanCols < numCols && !hasRightLine(r, c + spanCols - 1)) {
          // Verify there is no left border on neighbor either
          if (hasLeftLine(r, c + spanCols)) break;
          spanCols++;
        }
        cell.colSpan = spanCols;
        for (let cc = c + 1; cc < c + spanCols; cc++) {
          grid[r][cc].covered = true;
        }
      }
    }

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cell = grid[r][c];
        if (cell.covered) continue;
        let spanRows = 1;
        while (r + spanRows < numRows && !hasBottomLine(r + spanRows - 1, c)) {
          if (hasTopLine(r + spanRows, c)) break;
          if (grid[r + spanRows][c].colSpan !== cell.colSpan) break;
          spanRows++;
        }
        cell.rowSpan = spanRows;
        for (let rr = r + 1; rr < r + spanRows; rr++) {
          for (let cc = c; cc < c + cell.colSpan; cc++) {
            grid[rr][cc].covered = true;
          }
        }
      }
    }

    // Assign spans into owning non-covered grid cells
    for (const sp of tableSpans) {
      const spMidX = sp.x + Math.min(sp.width * 0.25, 12);
      const spMidY = sp.yTop;
      let targetR = numRows - 1;
      for (let r = 0; r < numRows; r++) {
        if (spMidY <= rowYs[r + 1] + 2) {
          targetR = r;
          break;
        }
      }
      let targetC = numCols - 1;
      for (let c = 0; c < numCols; c++) {
        if (spMidX <= colXs[c + 1] + 2) {
          targetC = c;
          break;
        }
      }
      // Walk up/left if cell is covered by a merged parent
      while (targetC > 0 && grid[targetR][targetC].covered) {
        if (!grid[targetR][targetC - 1].covered || grid[targetR][targetC - 1].colSpan > 1) {
          targetC--;
        } else {
          break;
        }
      }
      while (targetR > 0 && grid[targetR][targetC].covered) {
        targetR--;
      }
      grid[targetR][targetC].spans.push(sp);
    }

    tables.push({
      x: colXs[0],
      yTop: rowYs[0],
      width: colXs[numCols] - colXs[0],
      height: rowYs[numRows] - rowYs[0],
      colWidthsPt,
      rowHeightsPt,
      grid,
    });
  }

  return tables;
}

export async function inspectPdfPageDeep(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number,
  includeImages: boolean
): Promise<InspectedPdfPage> {
  const viewport = page.getViewport({ scale: 1.0 });
  const vpMatrix = viewport.transform as Matrix2D;
  const widthPt = viewport.width;
  const heightPt = viewport.height;
  const orientation: 'portrait' | 'landscape' = widthPt > heightPt ? 'landscape' : 'portrait';

  const opsList = await page.getOperatorList();
  const ops = pdfjsLib.OPS;

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

  const stack: GraphicsState[] = [];
  let state: GraphicsState = {
    ctm: [...IDENTITY_MATRIX] as Matrix2D,
    fillColorHex: '#000000',
    strokeColorHex: '#000000',
    fillAlpha: 1,
    strokeAlpha: 1,
    lineWidth: 1,
    fontSize: 11,
  };
  let textMatrix: Matrix2D = [...IDENTITY_MATRIX] as Matrix2D;
  let textLineMatrix: Matrix2D = [...IDENTITY_MATRIX] as Matrix2D;
  let textLeading = 14;

  const textPaintEvents: TextPaintRecord[] = [];
  const vectorRects: PdfVectorRect[] = [];
  const vectorLines: PdfVectorLine[] = [];
  const images: PdfPlacedImage[] = [];
  const seenImgPositions = new Set<string>();

  for (let i = 0; i < opsList.fnArray.length; i++) {
    const fn = opsList.fnArray[i];
    const args = opsList.argsArray[i] as unknown[];

    if (fn === ops.save) {
      stack.push({ ...state, ctm: [...state.ctm] as Matrix2D });
    } else if (fn === ops.restore) {
      const prev = stack.pop();
      if (prev) state = prev;
    } else if (fn === ops.transform && Array.isArray(args) && args.length >= 6) {
      const m: Matrix2D = [
        Number(args[0]),
        Number(args[1]),
        Number(args[2]),
        Number(args[3]),
        Number(args[4]),
        Number(args[5]),
      ];
      state.ctm = mulMatrix(state.ctm, m);
    } else if (fn === ops.setFillRGBColor) {
      state.fillColorHex = parseColorArg(args, 'rgb') || state.fillColorHex;
    } else if (fn === ops.setFillGray) {
      state.fillColorHex = parseColorArg(args, 'gray') || state.fillColorHex;
    } else if (fn === ops.setFillCMYKColor) {
      state.fillColorHex = parseColorArg(args, 'cmyk') || state.fillColorHex;
    } else if (fn === ops.setStrokeRGBColor) {
      state.strokeColorHex = parseColorArg(args, 'rgb') || state.strokeColorHex;
    } else if (fn === ops.setStrokeGray) {
      state.strokeColorHex = parseColorArg(args, 'gray') || state.strokeColorHex;
    } else if (fn === ops.setStrokeCMYKColor) {
      state.strokeColorHex = parseColorArg(args, 'cmyk') || state.strokeColorHex;
    } else if (fn === ops.setLineWidth && Array.isArray(args) && args.length >= 1) {
      state.lineWidth = Math.max(0.25, Number(args[0]) || 1);
    } else if (fn === ops.setGState && Array.isArray(args) && Array.isArray(args[0])) {
      for (const pair of args[0] as Array<[string, unknown]>) {
        if (pair?.[0] === 'ca' && typeof pair[1] === 'number') state.fillAlpha = pair[1];
        if (pair?.[0] === 'CA' && typeof pair[1] === 'number') state.strokeAlpha = pair[1];
      }
    } else if (fn === ops.beginText) {
      textMatrix = [...IDENTITY_MATRIX] as Matrix2D;
      textLineMatrix = [...IDENTITY_MATRIX] as Matrix2D;
    } else if (fn === ops.setFont && Array.isArray(args) && args.length >= 2) {
      state.fontSize = Math.abs(Number(args[1])) || state.fontSize;
    } else if (fn === ops.setLeading && Array.isArray(args) && args.length >= 1) {
      textLeading = Number(args[0]) || textLeading;
    } else if (fn === ops.setTextMatrix && Array.isArray(args) && args[0]) {
      const m = args[0] as ArrayLike<number>;
      if (m.length >= 6) {
        textMatrix = [Number(m[0]), Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])];
        textLineMatrix = [...textMatrix] as Matrix2D;
      }
    } else if ((fn === ops.moveText || fn === ops.setLeadingMoveText) && Array.isArray(args) && args.length >= 2) {
      const tx = Number(args[0]) || 0;
      const ty = Number(args[1]) || 0;
      if (fn === ops.setLeadingMoveText) textLeading = -ty;
      textLineMatrix = mulMatrix(textLineMatrix, [1, 0, 0, 1, tx, ty]);
      textMatrix = [...textLineMatrix] as Matrix2D;
    } else if (fn === ops.nextLine) {
      textLineMatrix = mulMatrix(textLineMatrix, [1, 0, 0, 1, 0, -textLeading]);
      textMatrix = [...textLineMatrix] as Matrix2D;
    } else if ((fn === ops.showText || fn === ops.showSpacedText) && Array.isArray(args) && Array.isArray(args[0])) {
      const fullM = mulMatrix(vpMatrix, mulMatrix(state.ctm, textMatrix));
      let str = '';
      for (const glyph of args[0] as Array<{ unicode?: string; isSpace?: boolean } | number>) {
        if (glyph && typeof glyph === 'object' && typeof glyph.unicode === 'string') {
          str += glyph.unicode;
        }
      }
      if (str.trim()) {
        textPaintEvents.push({
          x: fullM[4],
          yTop: fullM[5],
          str: str.trim(),
          colorHex: state.fillColorHex,
          fillAlpha: state.fillAlpha,
        });
      }
    } else if (fn === ops.constructPath && Array.isArray(args)) {
      const paintOp = Number(args[0]);
      const isStroke = paintOp === ops.stroke || paintOp === ops.closeStroke || paintOp === ops.fillStroke || paintOp === ops.eoFillStroke || paintOp === ops.closeFillStroke || paintOp === ops.closeEOFillStroke;
      const isFill = paintOp === ops.fill || paintOp === ops.eoFill || paintOp === ops.fillStroke || paintOp === ops.eoFillStroke || paintOp === ops.closeFillStroke || paintOp === ops.closeEOFillStroke;
      if (isStroke || isFill) {
        const fullM = mulMatrix(vpMatrix, state.ctm);
        extractPathSegments(
          args,
          fullM,
          isStroke,
          isFill,
          state.fillColorHex,
          state.strokeColorHex,
          state.fillAlpha,
          state.lineWidth,
          vectorRects,
          vectorLines
        );
      }
    } else if (
      includeImages &&
      (fn === ops.paintImageXObject || fn === ops.paintInlineImageXObject)
    ) {
      const fullM = mulMatrix(vpMatrix, state.ctm);
      const p0 = applyMatrix(fullM, 0, 0);
      const p1 = applyMatrix(fullM, 1, 1);
      const x = Math.min(p0.x, p1.x);
      const yTop = Math.min(p0.y, p1.y);
      const wPt = Math.abs(p1.x - p0.x);
      const hPt = Math.abs(p1.y - p0.y);
      const posKey = `${Math.round(x)}_${Math.round(yTop)}_${Math.round(wPt)}_${Math.round(hPt)}`;
      if (wPt >= 16 && hPt >= 16 && !seenImgPositions.has(posKey)) {
        seenImgPositions.add(posKey);
        const extracted = await resolveImageObjectToPng(page, fn, args).catch(() => null);
        if (extracted) {
          const isBg = wPt >= widthPt * 0.85 && hPt >= heightPt * 0.85;
          images.push({
            x,
            yTop,
            widthPt: wPt,
            heightPt: hPt,
            bytes: extracted.bytes,
            pixelWidth: extracted.pixelWidth,
            pixelHeight: extracted.pixelHeight,
            isBackground: isBg,
          });
        }
      }
    }
  }

  // Extract text spans using viewport transform so rotated pages & CropBox are exact
  const textContent = await page.getTextContent();
  const styles = (textContent.styles || {}) as Record<string, { fontFamily?: string }>;
  const spans: PdfSpanInfo[] = [];
  const substitutions = new Set<string>();
  const watermarks: string[] = [];

  for (const item of textContent.items) {
    if (!('str' in item)) continue;
    if (item.str.trim().length === 0) continue;

    const itemT = item.transform as Matrix2D;
    const tx = mulMatrix(vpMatrix, itemT);
    const x = tx[4];
    const yTop = tx[5];
    const fontSize = Math.max(6, Math.hypot(itemT[0], itemT[1]) || item.height || 11);
    const angleDeg = (Math.atan2(tx[1], tx[0]) * 180) / Math.PI;
    const fontName = String(item.fontName || '');
    const familyRaw = String(styles[fontName]?.fontFamily || '');
    const fontDesc = `${fontName} ${familyRaw}`.toLowerCase();
    const hasNonLatin = /[^\u0000-\u024F\u2000-\u206F]/.test(item.str);
    const mapped = mapPdfFontToWordFamily(`${familyRaw} ${fontName}`, hasNonLatin);
    if (mapped.substituted) substitutions.add(mapped.substituted);

    // Match closest textPaintEvent for RGB color & opacity
    let matchedPaint: TextPaintRecord | undefined;
    let bestScore = Infinity;
    const cleanStr = item.str.trim();
    for (const ev of textPaintEvents) {
      const dist = Math.hypot(ev.x - x, ev.yTop - yTop);
      if (dist > 36) continue;
      const textOverlap = ev.str.includes(cleanStr) || cleanStr.includes(ev.str) ? 0 : 12;
      const score = dist + textOverlap;
      if (score < bestScore) {
        bestScore = score;
        matchedPaint = ev;
      }
    }

    const fillAlpha = matchedPaint?.fillAlpha ?? 1;
    const colorHex = matchedPaint?.colorHex || '#0F172A';
    const isRotatedWatermark =
      (Math.abs(angleDeg) > 12 && Math.abs(Math.abs(angleDeg) - 180) > 12) ||
      (fillAlpha < 0.45 && fontSize >= 20);

    // Detect underline stroke or thin filled bar just below text baseline
    const spanW = Math.max(4, item.width || cleanStr.length * fontSize * 0.5);
    const isUnderlined =
      vectorLines.some(
        (l) =>
          Math.abs(l.y1 - l.y2) <= 2 &&
          l.y1 >= yTop - 1 &&
          l.y1 <= yTop + fontSize * 0.45 &&
          Math.min(l.x1, l.x2) <= x + 8 &&
          Math.max(l.x1, l.x2) >= x + spanW * 0.65
      ) ||
      vectorRects.some(
        (r) =>
          r.height <= 3.5 &&
          r.yTop >= yTop - 1 &&
          r.yTop <= yTop + fontSize * 0.45 &&
          r.x <= x + 8 &&
          r.x + r.width >= x + spanW * 0.65
      );

    // Detect highlight rectangle directly behind span
    const highlightRect = vectorRects.find(
      (r) =>
        r.fillColorHex &&
        r.fillColorHex !== '#ffffff' &&
        r.height >= fontSize * 0.7 &&
        r.height <= fontSize * 2.1 &&
        r.width <= spanW * 1.35 &&
        r.x <= x + 4 &&
        r.x + r.width >= x + spanW - 4 &&
        r.yTop <= yTop &&
        r.yTop + r.height >= yTop - 2
    );

    if (isRotatedWatermark) {
      watermarks.push(cleanStr);
    }

    spans.push({
      str: item.str,
      x,
      yTop,
      width: Math.max(0, item.width || 0),
      fontSize,
      fontFamily: mapped.family,
      bold: /bold|black|heavy|semibold|demi/.test(fontDesc),
      italic: /italic|oblique/.test(fontDesc),
      underline: isUnderlined,
      colorHex,
      highlightHex: highlightRect?.fillColorHex,
      fillAlpha,
      angleDeg,
      isWatermark: isRotatedWatermark,
      hasEOL: Boolean(item.hasEOL),
    });
  }

  const tables = detectVectorTables(vectorLines, vectorRects, spans);

  const nonWmSpans = spans.filter((s) => !s.isWatermark);
  const contentXs = [
    ...nonWmSpans.map((s) => s.x),
    ...tables.map((t) => t.x),
    ...images.filter((im) => !im.isBackground).map((im) => im.x),
  ];
  const contentRights = [
    ...nonWmSpans.map((s) => s.x + Math.max(8, s.width)),
    ...tables.map((t) => t.x + t.width),
    ...images.filter((im) => !im.isBackground).map((im) => im.x + im.widthPt),
  ];
  const contentTops = [
    ...nonWmSpans.map((s) => s.yTop - s.fontSize),
    ...tables.map((t) => t.yTop),
    ...images.filter((im) => !im.isBackground).map((im) => im.yTop),
  ];
  const contentBottoms = [
    ...nonWmSpans.map((s) => s.yTop + 4),
    ...tables.map((t) => t.yTop + t.height),
    ...images.filter((im) => !im.isBackground).map((im) => im.yTop + im.heightPt),
  ];

  const clampMargin = (val: number, fallback: number, maxVal: number) =>
    Number.isFinite(val) ? Math.max(18, Math.min(maxVal, val)) : fallback;

  const margins = {
    left: clampMargin(Math.min(...contentXs), 54, widthPt * 0.25),
    right: clampMargin(widthPt - Math.max(...contentRights), 54, widthPt * 0.25),
    top: clampMargin(Math.min(...contentTops), 54, heightPt * 0.22),
    bottom: clampMargin(heightPt - Math.max(...contentBottoms), 54, heightPt * 0.22),
  };

  return {
    pageNumber,
    widthPt,
    heightPt,
    orientation,
    margins,
    spans,
    tables,
    images,
    watermarks: Array.from(new Set(watermarks)),
    imagePaintOps,
    fontSubstitutions: Array.from(substitutions),
  };
}
