import JSZip from 'jszip';
import jsPDF from 'jspdf';
import type { ConversionOptions } from '../types';

interface OoxmlRunStyle {
  fontFamily: string;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  colorHex: string;
  highlightHex?: string;
}

interface OoxmlRun {
  text: string;
  fieldType?: 'PAGE' | 'NUMPAGES';
  style: OoxmlRunStyle;
  isLineBreak?: boolean;
  isTab?: boolean;
}

interface OoxmlImage {
  bytes: Uint8Array;
  mimeType: 'image/png' | 'image/jpeg';
  format: 'PNG' | 'JPEG';
  widthPt: number;
  heightPt: number;
}

interface OoxmlParagraph {
  kind: 'paragraph';
  align: 'left' | 'center' | 'right' | 'justify';
  indentLeftPt: number;
  firstLinePt: number;
  hangingPt: number;
  spaceBeforePt: number;
  spaceAfterPt: number;
  lineSpacingMult: number;
  exactLinePt?: number;
  pageBreakBefore: boolean;
  hasPageBreakAfter: boolean;
  shadingHex?: string;
  leftBorderColorHex?: string;
  listMarker?: string;
  runs: OoxmlRun[];
  images: OoxmlImage[];
}

interface OoxmlTableBorder {
  present: boolean;
  colorHex: string;
  sizePt: number;
}

interface OoxmlTableCell {
  colSpan: number;
  rowSpan: number;
  covered: boolean;
  widthPt: number;
  shadingHex?: string;
  vAlign: 'top' | 'middle' | 'bottom';
  padTopPt: number;
  padBottomPt: number;
  padLeftPt: number;
  padRightPt: number;
  borders: {
    top: OoxmlTableBorder;
    bottom: OoxmlTableBorder;
    left: OoxmlTableBorder;
    right: OoxmlTableBorder;
  };
  paragraphs: OoxmlParagraph[];
}

interface OoxmlTable {
  kind: 'table';
  colWidthsPt: number[];
  rowMinHeightsPt: number[];
  grid: OoxmlTableCell[][];
}

type OoxmlBlock = OoxmlParagraph | OoxmlTable;

interface OoxmlSection {
  widthPt: number;
  heightPt: number;
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number; header: number; footer: number };
  headerBlocks: OoxmlBlock[];
  footerBlocks: OoxmlBlock[];
  blocks: OoxmlBlock[];
}

interface StyleDef {
  basedOn?: string;
  pAlign?: 'left' | 'center' | 'right' | 'justify';
  pIndentLeftPt?: number;
  pFirstLinePt?: number;
  pHangingPt?: number;
  pSpaceBeforePt?: number;
  pSpaceAfterPt?: number;
  pLineMult?: number;
  pExactLinePt?: number;
  pPageBreakBefore?: boolean;
  pShadingHex?: string;
  pLeftBorderHex?: string;
  fontFamily?: string;
  fontSizePt?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  colorHex?: string;
  highlightHex?: string;
}

interface NumberingLevelDef {
  numFmt: string;
  lvlText: string;
  indentLeftPt: number;
  hangingPt: number;
}

const DEFAULT_RUN_STYLE: OoxmlRunStyle = {
  fontFamily: 'Calibri',
  fontSizePt: 11,
  bold: false,
  italic: false,
  underline: false,
  colorHex: '0F172A',
};

const HIGHLIGHT_NAME_TO_HEX: Record<string, string> = {
  yellow: 'FEF08A',
  green: 'BBF7D0',
  cyan: 'A5F3FC',
  magenta: 'FBCFE8',
  blue: 'BFDBFE',
  red: 'FECACA',
  darkblue: '1E3A8A',
  darkcyan: '155E75',
  darkgreen: '166534',
  darkmagenta: '86198F',
  darkred: '991B1B',
  darkyellow: 'CA8A04',
  darkgray: '475569',
  lightgray: 'E2E8F0',
  black: '0F172A',
};

function childElements(parent: Element | Document | null | undefined, localName?: string): Element[] {
  if (!parent) return [];
  const res: Element[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i];
    if (node.nodeType === 1) {
      const el = node as Element;
      const ln = el.localName || el.tagName.split(':').pop() || '';
      if (!localName || ln === localName) {
        res.push(el);
      }
    }
  }
  return res;
}

function findChild(parent: Element | null | undefined, localName: string): Element | undefined {
  if (!parent) return undefined;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i];
    if (node.nodeType === 1) {
      const el = node as Element;
      const ln = el.localName || el.tagName.split(':').pop() || '';
      if (ln === localName) return el;
    }
  }
  return undefined;
}

function findAllDescendants(root: Element | Document | null | undefined, localName: string): Element[] {
  if (!root) return [];
  const res: Element[] = [];
  const walk = (node: Node) => {
    for (let i = 0; i < node.childNodes.length; i++) {
      const ch = node.childNodes[i];
      if (ch.nodeType === 1) {
        const el = ch as Element;
        const ln = el.localName || el.tagName.split(':').pop() || '';
        if (ln === localName) res.push(el);
        walk(el);
      }
    }
  };
  walk(root);
  return res;
}

function attr(el: Element | null | undefined, localName: string): string | undefined {
  if (!el) return undefined;
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    const ln = a.localName || a.name.split(':').pop() || '';
    if (ln === localName) return a.value;
  }
  return undefined;
}

function twipsToPt(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const num = parseFloat(val);
  return Number.isFinite(num) ? num / 20 : fallback;
}

function sanitizeHexColor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const clean = raw.replace(/^#/, '').trim().toUpperCase();
  if (clean === 'AUTO' || clean === 'NONE' || clean === 'TRANSPARENT') return undefined;
  if (/^[0-9A-F]{6}$/.test(clean)) return clean;
  return undefined;
}

function parseHexToRgb(hex: string): [number, number, number] {
  const clean = sanitizeHexColor(hex) || '0F172A';
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function parseBoolToggle(el: Element | undefined): boolean | undefined {
  if (!el) return undefined;
  const v = attr(el, 'val');
  if (v === undefined) return true;
  return v !== '0' && v.toLowerCase() !== 'false' && v.toLowerCase() !== 'off';
}

function parseXml(xmlText: string): Document | null {
  if (!xmlText || typeof DOMParser === 'undefined') return null;
  const parsed = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (parsed.getElementsByTagName('parsererror').length > 0) return null;
  return parsed;
}

function parseRPrElement(rPr: Element | undefined): Partial<StyleDef> {
  if (!rPr) return {};
  const out: Partial<StyleDef> = {};

  const rFonts = findChild(rPr, 'rFonts');
  const fontName = attr(rFonts, 'ascii') || attr(rFonts, 'hAnsi') || attr(rFonts, 'cs');
  if (fontName) out.fontFamily = fontName;

  const sz = findChild(rPr, 'sz') || findChild(rPr, 'szCs');
  const szVal = attr(sz, 'val');
  if (szVal) {
    const pt = parseFloat(szVal) / 2;
    if (Number.isFinite(pt) && pt > 0) out.fontSizePt = pt;
  }

  const b = parseBoolToggle(findChild(rPr, 'b'));
  if (b !== undefined) out.bold = b;

  const i = parseBoolToggle(findChild(rPr, 'i'));
  if (i !== undefined) out.italic = i;

  const u = findChild(rPr, 'u');
  if (u) {
    const uVal = (attr(u, 'val') || 'single').toLowerCase();
    out.underline = uVal !== 'none';
  }

  const colorHex = sanitizeHexColor(attr(findChild(rPr, 'color'), 'val'));
  if (colorHex) out.colorHex = colorHex;

  const hlVal = attr(findChild(rPr, 'highlight'), 'val')?.toLowerCase();
  if (hlVal && HIGHLIGHT_NAME_TO_HEX[hlVal]) {
    out.highlightHex = HIGHLIGHT_NAME_TO_HEX[hlVal];
  } else {
    const shdFill = sanitizeHexColor(attr(findChild(rPr, 'shd'), 'fill'));
    if (shdFill && shdFill !== 'FFFFFF') out.highlightHex = shdFill;
  }

  return out;
}

function parsePPrElement(pPr: Element | undefined): Partial<StyleDef> {
  if (!pPr) return {};
  const out: Partial<StyleDef> = {};

  const jc = attr(findChild(pPr, 'jc'), 'val')?.toLowerCase();
  if (jc === 'center') out.pAlign = 'center';
  else if (jc === 'right' || jc === 'end') out.pAlign = 'right';
  else if (jc === 'both' || jc === 'distribute') out.pAlign = 'justify';
  else if (jc === 'left' || jc === 'start') out.pAlign = 'left';

  const ind = findChild(pPr, 'ind');
  if (ind) {
    const leftVal = attr(ind, 'left') || attr(ind, 'start');
    if (leftVal !== undefined) out.pIndentLeftPt = Math.max(0, twipsToPt(leftVal, 0));
    const firstVal = attr(ind, 'firstLine');
    if (firstVal !== undefined) out.pFirstLinePt = twipsToPt(firstVal, 0);
    const hangVal = attr(ind, 'hanging');
    if (hangVal !== undefined) out.pHangingPt = twipsToPt(hangVal, 0);
  }

  const spacing = findChild(pPr, 'spacing');
  if (spacing) {
    const before = attr(spacing, 'before');
    if (before !== undefined) out.pSpaceBeforePt = Math.max(0, twipsToPt(before, 0));
    const after = attr(spacing, 'after');
    if (after !== undefined) out.pSpaceAfterPt = Math.max(0, twipsToPt(after, 0));
    const line = attr(spacing, 'line');
    const lineRule = (attr(spacing, 'lineRule') || 'auto').toLowerCase();
    if (line !== undefined) {
      const val = parseFloat(line);
      if (Number.isFinite(val) && val > 0) {
        if (lineRule === 'exact' || lineRule === 'atleast') {
          out.pExactLinePt = val / 20;
        } else {
          out.pLineMult = Math.max(1.0, Math.min(2.6, val / 240));
        }
      }
    }
  }

  if (findChild(pPr, 'pageBreakBefore')) {
    const val = parseBoolToggle(findChild(pPr, 'pageBreakBefore'));
    out.pPageBreakBefore = val ?? true;
  }

  const shdFill = sanitizeHexColor(attr(findChild(pPr, 'shd'), 'fill'));
  if (shdFill && shdFill !== 'FFFFFF') out.pShadingHex = shdFill;

  const pBdr = findChild(pPr, 'pBdr');
  const leftBdr = findChild(pBdr, 'left');
  if (leftBdr && attr(leftBdr, 'val') !== 'none') {
    out.pLeftBorderHex = sanitizeHexColor(attr(leftBdr, 'color')) || '2563EB';
  }

  const rPrInPPr = parseRPrElement(findChild(pPr, 'rPr'));
  return { ...out, ...rPrInPPr };
}

function parseStylesXml(xmlText: string | null): {
  docDefault: StyleDef;
  styles: Map<string, StyleDef>;
} {
  const styles = new Map<string, StyleDef>();
  let docDefault: StyleDef = {
    fontFamily: DEFAULT_RUN_STYLE.fontFamily,
    fontSizePt: DEFAULT_RUN_STYLE.fontSizePt,
    colorHex: DEFAULT_RUN_STYLE.colorHex,
    pSpaceBeforePt: 0,
    pSpaceAfterPt: 6,
    pLineMult: 1.18,
  };

  if (!xmlText) return { docDefault, styles };
  const doc = parseXml(xmlText);
  if (!doc) return { docDefault, styles };

  const root = doc.documentElement;
  const defaultsEl = findChild(root, 'docDefaults');
  if (defaultsEl) {
    const rDef = parseRPrElement(findChild(findChild(defaultsEl, 'rPrDefault'), 'rPr'));
    const pDef = parsePPrElement(findChild(findChild(defaultsEl, 'pPrDefault'), 'pPr'));
    docDefault = { ...docDefault, ...pDef, ...rDef };
  }

  const rawMap = new Map<string, StyleDef>();
  for (const st of childElements(root, 'style')) {
    const styleId = attr(st, 'styleId');
    if (!styleId) continue;
    const basedOn = attr(findChild(st, 'basedOn'), 'val');
    const pProps = parsePPrElement(findChild(st, 'pPr'));
    const rProps = parseRPrElement(findChild(st, 'rPr'));
    rawMap.set(styleId, { basedOn, ...pProps, ...rProps });
  }

  const resolve = (id: string, visited = new Set<string>()): StyleDef => {
    if (styles.has(id)) return styles.get(id)!;
    if (visited.has(id)) return {};
    visited.add(id);
    const raw = rawMap.get(id);
    if (!raw) return {};
    const parent = raw.basedOn ? resolve(raw.basedOn, visited) : {};
    const merged: StyleDef = { ...parent, ...raw };
    styles.set(id, merged);
    return merged;
  };

  for (const id of rawMap.keys()) {
    resolve(id);
  }

  return { docDefault, styles };
}

function parseNumberingXml(xmlText: string | null): Map<string, Map<number, NumberingLevelDef>> {
  const result = new Map<string, Map<number, NumberingLevelDef>>();
  if (!xmlText) return result;
  const doc = parseXml(xmlText);
  if (!doc) return result;

  const root = doc.documentElement;
  const abstractMap = new Map<string, Map<number, NumberingLevelDef>>();

  for (const abs of childElements(root, 'abstractNum')) {
    const absId = attr(abs, 'abstractNumId');
    if (!absId) continue;
    const levels = new Map<number, NumberingLevelDef>();
    for (const lvl of childElements(abs, 'lvl')) {
      const ilvl = parseInt(attr(lvl, 'ilvl') || '0', 10);
      const numFmt = attr(findChild(lvl, 'numFmt'), 'val') || 'bullet';
      const lvlText = attr(findChild(lvl, 'lvlText'), 'val') || '•';
      const ind = findChild(findChild(lvl, 'pPr'), 'ind');
      const indentLeftPt = twipsToPt(attr(ind, 'left') || attr(ind, 'start'), (ilvl + 1) * 18);
      const hangingPt = twipsToPt(attr(ind, 'hanging'), 12);
      levels.set(ilvl, { numFmt, lvlText, indentLeftPt, hangingPt });
    }
    abstractMap.set(absId, levels);
  }

  for (const numEl of childElements(root, 'num')) {
    const numId = attr(numEl, 'numId');
    const absId = attr(findChild(numEl, 'abstractNumId'), 'val');
    if (numId && absId && abstractMap.has(absId)) {
      result.set(numId, abstractMap.get(absId)!);
    }
  }

  return result;
}

function parseRelsXml(xmlText: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!xmlText) return map;
  const doc = parseXml(xmlText);
  if (!doc) return map;
  for (const rel of childElements(doc.documentElement, 'Relationship')) {
    const id = attr(rel, 'Id');
    const target = attr(rel, 'Target');
    if (id && target) map.set(id, target);
  }
  return map;
}

function toRoman(num: number, upper: boolean): string {
  const table: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let n = Math.max(1, num);
  let out = '';
  for (const [val, sym] of table) {
    while (n >= val) {
      out += sym;
      n -= val;
    }
  }
  return upper ? out : out.toLowerCase();
}

function toAlpha(num: number, upper: boolean): string {
  let n = Math.max(1, num);
  let out = '';
  while (n > 0) {
    n--;
    out = String.fromCharCode((upper ? 65 : 97) + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

function formatListNumber(numFmt: string, lvlText: string, count: number, ilvl: number): string {
  if (numFmt === 'bullet') {
    const bullets = ['•', '◦', '▪', '▫'];
    const ch = lvlText && lvlText.length <= 2 && !lvlText.includes('%') ? lvlText : bullets[ilvl % bullets.length];
    return `${ch} `;
  }
  let formatted = String(count);
  if (numFmt === 'lowerLetter') formatted = toAlpha(count, false);
  else if (numFmt === 'upperLetter') formatted = toAlpha(count, true);
  else if (numFmt === 'lowerRoman') formatted = toRoman(count, false);
  else if (numFmt === 'upperRoman') formatted = toRoman(count, true);

  if (lvlText && lvlText.includes(`%${ilvl + 1}`)) {
    return `${lvlText.replace(`%${ilvl + 1}`, formatted)} `;
  }
  return `${formatted}. `;
}

function parseBordersFromEl(
  bordersEl: Element | undefined,
  fallback?: OoxmlTableCell['borders']
): OoxmlTableCell['borders'] {
  const defBorder = (side: 'top' | 'bottom' | 'left' | 'right', fb?: OoxmlTableBorder): OoxmlTableBorder => {
    const el = findChild(bordersEl, side);
    if (!el) return fb || { present: true, colorHex: 'CBD5E1', sizePt: 0.6 };
    const val = (attr(el, 'val') || 'single').toLowerCase();
    if (val === 'none' || val === 'nil') {
      return { present: false, colorHex: 'FFFFFF', sizePt: 0 };
    }
    const colorHex = sanitizeHexColor(attr(el, 'color')) || fb?.colorHex || 'CBD5E1';
    const szEighths = parseFloat(attr(el, 'sz') || '4');
    const sizePt = Math.max(0.35, Math.min(3, (Number.isFinite(szEighths) ? szEighths : 4) / 8));
    return { present: true, colorHex, sizePt };
  };

  return {
    top: defBorder('top', fallback?.top),
    bottom: defBorder('bottom', fallback?.bottom),
    left: defBorder('left', fallback?.left),
    right: defBorder('right', fallback?.right),
  };
}

export async function convertDocxToPdfHighFidelity(
  file: File,
  options: ConversionOptions = {},
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(12, 'Reading Word (.docx) OOXML package...');
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('The Word (.docx) document is missing word/document.xml.');
  }

  const [docXmlText, stylesXmlText, numberingXmlText, relsXmlText] = await Promise.all([
    docXmlFile.async('string'),
    zip.file('word/styles.xml')?.async('string') ?? Promise.resolve(null),
    zip.file('word/numbering.xml')?.async('string') ?? Promise.resolve(null),
    zip.file('word/_rels/document.xml.rels')?.async('string') ?? Promise.resolve(null),
  ]);

  const docXml = parseXml(docXmlText);
  if (!docXml) {
    throw new Error('Could not parse Word (.docx) XML structure.');
  }

  const { docDefault, styles } = parseStylesXml(stylesXmlText);
  const numbering = parseNumberingXml(numberingXmlText);
  const docRels = parseRelsXml(relsXmlText);

  // Cache embedded media bytes by zip path
  const mediaCache = new Map<string, { bytes: Uint8Array; mimeType: 'image/png' | 'image/jpeg'; format: 'PNG' | 'JPEG' }>();
  const loadMediaByTarget = async (
    rels: Map<string, string>,
    rId: string
  ): Promise<{ bytes: Uint8Array; mimeType: 'image/png' | 'image/jpeg'; format: 'PNG' | 'JPEG' } | null> => {
    const rawTarget = rels.get(rId);
    if (!rawTarget) return null;
    const normalized = rawTarget.startsWith('/')
      ? rawTarget.slice(1)
      : rawTarget.startsWith('word/')
      ? rawTarget
      : `word/${rawTarget.replace(/^\.\//, '')}`;
    if (mediaCache.has(normalized)) return mediaCache.get(normalized)!;

    const entry = zip.file(normalized);
    if (!entry) return null;
    const bytes = await entry.async('uint8array');
    const isPng =
      bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isPng && !isJpg) return null;

    const info = {
      bytes,
      mimeType: (isPng ? 'image/png' : 'image/jpeg') as 'image/png' | 'image/jpeg',
      format: (isPng ? 'PNG' : 'JPEG') as 'PNG' | 'JPEG',
    };
    mediaCache.set(normalized, info);
    return info;
  };

  const listCounters = new Map<string, Map<number, number>>();

  const parseParagraphEl = async (
    pEl: Element,
    rels: Map<string, string>,
    trackCounters = true
  ): Promise<OoxmlParagraph> => {
    const pPr = findChild(pEl, 'pPr');
    const pStyleId = attr(findChild(pPr, 'pStyle'), 'val');
    const styleDef = pStyleId ? styles.get(pStyleId) || {} : {};
    const directP = parsePPrElement(pPr);

    const effectiveP: StyleDef = { ...docDefault, ...styleDef, ...directP };

    let listMarker: string | undefined;
    let listIndentPt = effectiveP.pIndentLeftPt ?? 0;
    let listHangingPt = effectiveP.pHangingPt ?? 0;

    const numPr = findChild(pPr, 'numPr');
    const numId = attr(findChild(numPr, 'numId'), 'val');
    const ilvl = parseInt(attr(findChild(numPr, 'ilvl'), 'val') || '0', 10);
    if (numId && numId !== '0' && numbering.has(numId)) {
      const lvlDef = numbering.get(numId)!.get(ilvl);
      if (lvlDef) {
        let count = 1;
        if (trackCounters) {
          if (!listCounters.has(numId)) listCounters.set(numId, new Map());
          const map = listCounters.get(numId)!;
          count = (map.get(ilvl) || 0) + 1;
          map.set(ilvl, count);
          for (const k of Array.from(map.keys())) {
            if (k > ilvl) map.delete(k);
          }
        }
        listMarker = formatListNumber(lvlDef.numFmt, lvlDef.lvlText, count, ilvl);
        if (directP.pIndentLeftPt === undefined) listIndentPt = lvlDef.indentLeftPt;
        if (directP.pHangingPt === undefined) listHangingPt = lvlDef.hangingPt;
      }
    }

    const runs: OoxmlRun[] = [];
    const images: OoxmlImage[] = [];
    let hasPageBreakAfter = false;
    let activeField: 'PAGE' | 'NUMPAGES' | null = null;

    const processRunEl = async (rEl: Element, linkColor?: string) => {
      const rPr = findChild(rEl, 'rPr');
      const rStyleId = attr(findChild(rPr, 'rStyle'), 'val');
      const rStyleDef = rStyleId ? styles.get(rStyleId) || {} : {};
      const directR = parseRPrElement(rPr);

      const mergedStyle: OoxmlRunStyle = {
        fontFamily: directR.fontFamily || rStyleDef.fontFamily || effectiveP.fontFamily || DEFAULT_RUN_STYLE.fontFamily,
        fontSizePt: directR.fontSizePt || rStyleDef.fontSizePt || effectiveP.fontSizePt || DEFAULT_RUN_STYLE.fontSizePt,
        bold: directR.bold ?? rStyleDef.bold ?? effectiveP.bold ?? false,
        italic: directR.italic ?? rStyleDef.italic ?? effectiveP.italic ?? false,
        underline: directR.underline ?? rStyleDef.underline ?? effectiveP.underline ?? Boolean(linkColor),
        colorHex: directR.colorHex || rStyleDef.colorHex || linkColor || effectiveP.colorHex || DEFAULT_RUN_STYLE.colorHex,
        highlightHex: directR.highlightHex || rStyleDef.highlightHex || effectiveP.highlightHex,
      };

      for (const ch of childElements(rEl)) {
        const ln = ch.localName || ch.tagName.split(':').pop() || '';
        if (ln === 't' || ln === 'delText') {
          const text = ch.textContent || '';
          if (activeField) {
            // Skip cached display digit inside fldChar separate..end because we render live field
            continue;
          }
          if (text) runs.push({ text, style: mergedStyle });
        } else if (ln === 'tab') {
          runs.push({ text: '    ', style: mergedStyle, isTab: true });
        } else if (ln === 'br') {
          const brType = (attr(ch, 'type') || '').toLowerCase();
          if (brType === 'page') {
            hasPageBreakAfter = true;
          } else {
            runs.push({ text: '\n', style: mergedStyle, isLineBreak: true });
          }
        } else if (ln === 'fldChar') {
          const fType = (attr(ch, 'fldCharType') || '').toLowerCase();
          if (fType === 'begin') activeField = null;
          else if (fType === 'end') activeField = null;
        } else if (ln === 'instrText') {
          const instr = (ch.textContent || '').trim().toUpperCase();
          if (instr.includes('NUMPAGES')) {
            activeField = 'NUMPAGES';
            runs.push({ text: '', fieldType: 'NUMPAGES', style: mergedStyle });
          } else if (instr.includes('PAGE')) {
            activeField = 'PAGE';
            runs.push({ text: '', fieldType: 'PAGE', style: mergedStyle });
          }
        } else if (ln === 'drawing' || ln === 'pict') {
          const blip = findAllDescendants(ch, 'blip')[0];
          const rId = attr(blip, 'embed') || attr(blip, 'link');
          if (rId) {
            const media = await loadMediaByTarget(rels, rId);
            if (media) {
              const extent = findAllDescendants(ch, 'extent')[0];
              const cx = parseFloat(attr(extent, 'cx') || '0');
              const cy = parseFloat(attr(extent, 'cy') || '0');
              const widthPt = cx > 0 ? cx / 12700 : 240;
              const heightPt = cy > 0 ? cy / 12700 : 160;
              images.push({ ...media, widthPt, heightPt });
            }
          }
        }
      }
    };

    for (const child of childElements(pEl)) {
      const ln = child.localName || child.tagName.split(':').pop() || '';
      if (ln === 'r') {
        await processRunEl(child);
      } else if (ln === 'hyperlink') {
        for (const r of childElements(child, 'r')) {
          await processRunEl(r, '2563EB');
        }
      } else if (ln === 'fldSimple') {
        const instr = (attr(child, 'instr') || '').trim().toUpperCase();
        const r = findChild(child, 'r');
        const rPr = findChild(r, 'rPr');
        const directR = parseRPrElement(rPr);
        const st: OoxmlRunStyle = {
          fontFamily: directR.fontFamily || effectiveP.fontFamily || DEFAULT_RUN_STYLE.fontFamily,
          fontSizePt: directR.fontSizePt || effectiveP.fontSizePt || DEFAULT_RUN_STYLE.fontSizePt,
          bold: directR.bold ?? effectiveP.bold ?? false,
          italic: directR.italic ?? effectiveP.italic ?? false,
          underline: directR.underline ?? effectiveP.underline ?? false,
          colorHex: directR.colorHex || effectiveP.colorHex || DEFAULT_RUN_STYLE.colorHex,
          highlightHex: directR.highlightHex || effectiveP.highlightHex,
        };
        if (instr.includes('NUMPAGES')) {
          runs.push({ text: '', fieldType: 'NUMPAGES', style: st });
        } else if (instr.includes('PAGE')) {
          runs.push({ text: '', fieldType: 'PAGE', style: st });
        } else if (r) {
          await processRunEl(r);
        }
      }
    }

    return {
      kind: 'paragraph',
      align: effectiveP.pAlign || 'left',
      indentLeftPt: listIndentPt,
      firstLinePt: effectiveP.pFirstLinePt ?? 0,
      hangingPt: listHangingPt,
      spaceBeforePt: effectiveP.pSpaceBeforePt ?? 0,
      spaceAfterPt: effectiveP.pSpaceAfterPt ?? 6,
      lineSpacingMult: effectiveP.pLineMult ?? 1.18,
      exactLinePt: effectiveP.pExactLinePt,
      pageBreakBefore: Boolean(effectiveP.pPageBreakBefore),
      hasPageBreakAfter,
      shadingHex: effectiveP.pShadingHex,
      leftBorderColorHex: effectiveP.pLeftBorderHex,
      listMarker,
      runs,
      images,
    };
  };

  const parseTableEl = async (tblEl: Element, rels: Map<string, string>): Promise<OoxmlTable> => {
    const tblPr = findChild(tblEl, 'tblPr');
    const tblBordersEl = findChild(tblPr, 'tblBorders');
    const insideH = findChild(tblBordersEl, 'insideH');
    const insideV = findChild(tblBordersEl, 'insideV');
    const outerBorders = parseBordersFromEl(tblBordersEl);
    const defaultCellBorders: OoxmlTableCell['borders'] = {
      top: insideH
        ? parseBordersFromEl(tblBordersEl, outerBorders).top
        : outerBorders.top,
      bottom: outerBorders.bottom,
      left: insideV ? outerBorders.left : outerBorders.left,
      right: outerBorders.right,
    };

    const gridCols = childElements(findChild(tblEl, 'tblGrid'), 'gridCol').map((gc) =>
      Math.max(18, twipsToPt(attr(gc, 'w'), 72))
    );

    const trEls = childElements(tblEl, 'tr');
    const rawGrid: Array<Array<{ cell: OoxmlTableCell; vMergeVal?: string }>> = [];
    const rowMinHeightsPt: number[] = [];
    let maxCols = gridCols.length;

    for (const tr of trEls) {
      const trPr = findChild(tr, 'trPr');
      const trH = twipsToPt(attr(findChild(trPr, 'trHeight'), 'val'), 18);
      rowMinHeightsPt.push(Math.max(12, trH));

      const rowSlots: Array<{ cell: OoxmlTableCell; vMergeVal?: string }> = [];
      let colCursor = 0;

      for (const tc of childElements(tr, 'tc')) {
        const tcPr = findChild(tc, 'tcPr');
        const gridSpan = Math.max(1, parseInt(attr(findChild(tcPr, 'gridSpan'), 'val') || '1', 10));
        const vMergeEl = findChild(tcPr, 'vMerge');
        const vMergeVal = vMergeEl ? (attr(vMergeEl, 'val') || 'continue').toLowerCase() : undefined;

        const tcW = twipsToPt(attr(findChild(tcPr, 'tcW'), 'w'), 0);
        const gridW = gridCols
          .slice(colCursor, colCursor + gridSpan)
          .reduce((s, w) => s + w, 0);
        const widthPt = tcW > 0 ? tcW : gridW > 0 ? gridW : gridSpan * 72;

        const shdFill = sanitizeHexColor(attr(findChild(tcPr, 'shd'), 'fill'));
        const vAlignRaw = (attr(findChild(tcPr, 'vAlign'), 'val') || 'top').toLowerCase();
        const vAlign: 'top' | 'middle' | 'bottom' =
          vAlignRaw === 'center' ? 'middle' : vAlignRaw === 'bottom' ? 'bottom' : 'top';

        const tcMar = findChild(tcPr, 'tcMar');
        const padTopPt = twipsToPt(attr(findChild(tcMar, 'top'), 'w'), 4);
        const padBottomPt = twipsToPt(attr(findChild(tcMar, 'bottom'), 'w'), 4);
        const padLeftPt = twipsToPt(attr(findChild(tcMar, 'left'), 'w'), 5);
        const padRightPt = twipsToPt(attr(findChild(tcMar, 'right'), 'w'), 5);

        const tcBordersEl = findChild(tcPr, 'tcBorders');
        const borders = tcBordersEl ? parseBordersFromEl(tcBordersEl, defaultCellBorders) : defaultCellBorders;

        const paragraphs: OoxmlParagraph[] = [];
        for (const pChild of childElements(tc, 'p')) {
          paragraphs.push(await parseParagraphEl(pChild, rels, true));
        }

        const cellObj: OoxmlTableCell = {
          colSpan: gridSpan,
          rowSpan: 1,
          covered: vMergeVal === 'continue',
          widthPt,
          shadingHex: shdFill && shdFill !== 'FFFFFF' ? shdFill : undefined,
          vAlign,
          padTopPt,
          padBottomPt,
          padLeftPt,
          padRightPt,
          borders,
          paragraphs,
        };

        rowSlots.push({ cell: cellObj, vMergeVal });
        for (let s = 1; s < gridSpan; s++) {
          rowSlots.push({
            cell: { ...cellObj, colSpan: 1, covered: true, paragraphs: [] },
            vMergeVal,
          });
        }
        colCursor += gridSpan;
      }

      maxCols = Math.max(maxCols, rowSlots.length);
      rawGrid.push(rowSlots);
    }

    // Normalize column count & resolve vertical rowSpan across vMerge chains
    const colWidthsPt =
      gridCols.length >= maxCols
        ? gridCols.slice(0, maxCols)
        : Array.from({ length: maxCols }, (_, c) => gridCols[c] || 72);

    const grid: OoxmlTableCell[][] = rawGrid.map((row) =>
      Array.from({ length: maxCols }, (_, c) =>
        row[c]?.cell || {
          colSpan: 1,
          rowSpan: 1,
          covered: false,
          widthPt: colWidthsPt[c],
          vAlign: 'top' as const,
          padTopPt: 4,
          padBottomPt: 4,
          padLeftPt: 5,
          padRightPt: 5,
          borders: defaultCellBorders,
          paragraphs: [],
        }
      )
    );

    for (let c = 0; c < maxCols; c++) {
      for (let r = 0; r < rawGrid.length; r++) {
        const slot = rawGrid[r][c];
        if (!slot || slot.cell.covered) continue;
        if (slot.vMergeVal === 'restart') {
          let spanR = 1;
          while (
            r + spanR < rawGrid.length &&
            rawGrid[r + spanR][c]?.vMergeVal === 'continue'
          ) {
            grid[r + spanR][c].covered = true;
            spanR++;
          }
          grid[r][c].rowSpan = spanR;
        }
      }
    }

    return {
      kind: 'table',
      colWidthsPt,
      rowMinHeightsPt,
      grid,
    };
  };

  const parseHeaderOrFooter = async (partTarget: string): Promise<OoxmlBlock[]> => {
    const cleanPath = partTarget.startsWith('/')
      ? partTarget.slice(1)
      : partTarget.startsWith('word/')
      ? partTarget
      : `word/${partTarget.replace(/^\.\//, '')}`;
    const entry = zip.file(cleanPath);
    if (!entry) return [];
    const xmlStr = await entry.async('string');
    const xmlDoc = parseXml(xmlStr);
    if (!xmlDoc) return [];

    const partName = cleanPath.split('/').pop() || '';
    const relsPath = `word/_rels/${partName}.rels`;
    const partRelsStr = await zip.file(relsPath)?.async('string');
    const partRels = parseRelsXml(partRelsStr || null);
    const mergedRels = new Map<string, string>([...docRels, ...partRels]);

    const blocks: OoxmlBlock[] = [];
    for (const el of childElements(xmlDoc.documentElement)) {
      const ln = el.localName || el.tagName.split(':').pop() || '';
      if (ln === 'p') blocks.push(await parseParagraphEl(el, mergedRels, false));
      else if (ln === 'tbl') blocks.push(await parseTableEl(el, mergedRels));
    }
    return blocks;
  };

  const buildSectionMeta = async (sectPr: Element | undefined) => {
    const defaultW = options.pageSize === 'letter' ? 612 : 595.28;
    const defaultH = options.pageSize === 'letter' ? 792 : 841.89;
    const pgSz = findChild(sectPr, 'pgSz');
    const rawW = twipsToPt(attr(pgSz, 'w'), defaultW);
    const rawH = twipsToPt(attr(pgSz, 'h'), defaultH);
    const orientAttr = (attr(pgSz, 'orient') || '').toLowerCase();
    const orientation: 'portrait' | 'landscape' =
      orientAttr === 'landscape' || rawW > rawH ? 'landscape' : 'portrait';

    const pgMar = findChild(sectPr, 'pgMar');
    const margins = {
      top: twipsToPt(attr(pgMar, 'top'), 54),
      right: twipsToPt(attr(pgMar, 'right'), 54),
      bottom: twipsToPt(attr(pgMar, 'bottom'), 54),
      left: twipsToPt(attr(pgMar, 'left'), 54),
      header: twipsToPt(attr(pgMar, 'header'), 24),
      footer: twipsToPt(attr(pgMar, 'footer'), 24),
    };

    let headerBlocks: OoxmlBlock[] = [];
    let footerBlocks: OoxmlBlock[] = [];

    const headerRefs = childElements(sectPr, 'headerReference');
    const defHeader = headerRefs.find((h) => (attr(h, 'type') || 'default') === 'default') || headerRefs[0];
    const headerRid = attr(defHeader, 'id');
    if (headerRid && docRels.has(headerRid)) {
      headerBlocks = await parseHeaderOrFooter(docRels.get(headerRid)!);
    }

    const footerRefs = childElements(sectPr, 'footerReference');
    const defFooter = footerRefs.find((f) => (attr(f, 'type') || 'default') === 'default') || footerRefs[0];
    const footerRid = attr(defFooter, 'id');
    if (footerRid && docRels.has(footerRid)) {
      footerBlocks = await parseHeaderOrFooter(docRels.get(footerRid)!);
    }

    return {
      widthPt: Math.max(72, rawW),
      heightPt: Math.max(72, rawH),
      orientation,
      margins,
      headerBlocks,
      footerBlocks,
    };
  };

  onProgress?.(35, 'Parsing Word layout, sections, tables, and graphics...');

  const body = findChild(docXml.documentElement, 'body');
  if (!body) {
    throw new Error('The Word (.docx) document has no body element.');
  }

  const sections: OoxmlSection[] = [];
  let currentBlocks: OoxmlBlock[] = [];

  for (const child of childElements(body)) {
    const ln = child.localName || child.tagName.split(':').pop() || '';
    if (ln === 'p') {
      const pBlock = await parseParagraphEl(child, docRels, true);
      currentBlocks.push(pBlock);
      const sectPrInPPr = findChild(findChild(child, 'pPr'), 'sectPr');
      if (sectPrInPPr) {
        const meta = await buildSectionMeta(sectPrInPPr);
        sections.push({ ...meta, blocks: currentBlocks });
        currentBlocks = [];
      }
    } else if (ln === 'tbl') {
      currentBlocks.push(await parseTableEl(child, docRels));
    }
  }

  const finalSectPr = findChild(body, 'sectPr');
  if (currentBlocks.length > 0 || sections.length === 0) {
    const meta = await buildSectionMeta(finalSectPr);
    sections.push({ ...meta, blocks: currentBlocks });
  }

  const hasContent = sections.some(
    (s) =>
      s.blocks.some((b) =>
        b.kind === 'table'
          ? b.grid.length > 0
          : b.images.length > 0 || b.runs.some((r) => r.text.trim().length > 0 || Boolean(r.fieldType))
      )
  );
  if (!hasContent) {
    throw new Error('The uploaded Word (.docx) document appears to be empty.');
  }

  // Decide hybrid renderer: Vector jsPDF for WinAnsi-safe docs, high-DPI Unicode Canvas when non-WinAnsi chars appear
  const normalizeWinAnsiText = (text: string): string =>
    text
      .replace(/[\uF0B7\u25CF\u25AA\u25A0]/g, '•')
      .replace(/[\u25E6\u25CB\u25AB\uF0A7\uF06F\uF071\uF0D8]/g, 'o')
      .replace(/[\u2010\u2011\u2012\u2212]/g, '-')
      .replace(/\u00A0/g, ' ');

  const isWinAnsiSafe = (text: string) =>
    /^[\t\n\r\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]*$/.test(
      normalizeWinAnsiText(text)
    );

  const checkBlocksWinAnsi = (blocks: OoxmlBlock[]): boolean => {
    for (const blk of blocks) {
      if (blk.kind === 'paragraph') {
        if (blk.listMarker && !isWinAnsiSafe(blk.listMarker)) return false;
        for (const r of blk.runs) {
          if (!isWinAnsiSafe(r.text)) return false;
        }
      } else {
        for (const row of blk.grid) {
          for (const cell of row) {
            if (!checkBlocksWinAnsi(cell.paragraphs)) return false;
          }
        }
      }
    }
    return true;
  };

  const allWinAnsi = sections.every(
    (s) =>
      checkBlocksWinAnsi(s.blocks) &&
      checkBlocksWinAnsi(s.headerBlocks) &&
      checkBlocksWinAnsi(s.footerBlocks)
  );

  onProgress?.(68, 'Rendering pages to PDF...');

  if (allWinAnsi || typeof document === 'undefined') {
    return renderSectionsVectorPdf(sections);
  }
  return await renderSectionsUnicodeCanvasPdf(sections);
}

function normalizeForVectorPdf(text: string): string {
  return text
    .replace(/[\uF0B7\u25CF\u25AA\u25A0]/g, '•')
    .replace(/[\u25E6\u25CB\u25AB\uF0A7\uF06F\uF071\uF0D8]/g, 'o')
    .replace(/[\u2010\u2011\u2012\u2212]/g, '-')
    .replace(/\u00A0/g, ' ');
}

function mapFontToJsPdf(family: string): 'helvetica' | 'times' | 'courier' {
  const lower = family.toLowerCase();
  if (/times|georgia|garamond|cambria|palatino|serif/.test(lower) && !/sans/.test(lower)) {
    return 'times';
  }
  if (/courier|consolas|monaco|menlo|mono/.test(lower)) {
    return 'courier';
  }
  return 'helvetica';
}

function expandRunText(run: OoxmlRun, pageNum: number, totalPages: number): string {
  if (run.fieldType === 'PAGE') return String(pageNum);
  if (run.fieldType === 'NUMPAGES') return String(totalPages);
  return normalizeForVectorPdf(run.text);
}

function isFullPageReplicaSection(sec: OoxmlSection): OoxmlImage | null {
  if (
    sec.margins.left > 4 ||
    sec.margins.right > 4 ||
    sec.margins.top > 4 ||
    sec.margins.bottom > 4
  ) {
    return null;
  }
  const allImgs = sec.blocks.flatMap((b) => (b.kind === 'paragraph' ? b.images : []));
  const allText = sec.blocks
    .flatMap((b) => (b.kind === 'paragraph' ? b.runs.map((r) => r.text).join('') : ''))
    .join('')
    .trim();
  if (allImgs.length === 1 && !allText) {
    const img = allImgs[0];
    if (img.widthPt >= sec.widthPt * 0.9 && img.heightPt >= sec.heightPt * 0.9) {
      return img;
    }
  }
  return null;
}

function renderSectionsVectorPdf(sections: OoxmlSection[]): Blob {
  const first = sections[0];
  const doc = new jsPDF({
    orientation: first.orientation,
    unit: 'pt',
    format: [Math.min(first.widthPt, first.heightPt), Math.max(first.widthPt, first.heightPt)],
    compress: true,
  });

  const pageRegistry: Array<{ pageIndex: number; section: OoxmlSection; skipHf: boolean }> = [];
  let pageCreated = false;

  const startPageForSection = (sec: OoxmlSection, skipHf = false) => {
    if (!pageCreated) {
      pageCreated = true;
    } else {
      doc.addPage(
        [Math.min(sec.widthPt, sec.heightPt), Math.max(sec.widthPt, sec.heightPt)],
        sec.orientation
      );
    }
    const pageIndex = doc.getNumberOfPages();
    pageRegistry.push({ pageIndex, section: sec, skipHf });
    return sec.margins.top;
  };

  interface WrappedToken {
    text: string;
    style: OoxmlRunStyle;
    width: number;
  }

  const layoutParagraphTokens = (
    p: OoxmlParagraph,
    availW: number,
    pageNum: number,
    totalPages: number
  ): Array<{ tokens: WrappedToken[]; lineW: number; maxFontPt: number; lineH: number }> => {
    const firstIndentOffset = p.hangingPt > 0 ? 0 : p.firstLinePt;
    const rawPieces: Array<{ text: string; style: OoxmlRunStyle; newline?: boolean }> = [];

    if (p.listMarker) {
      const refStyle = p.runs[0]?.style || DEFAULT_RUN_STYLE;
      rawPieces.push({ text: normalizeForVectorPdf(p.listMarker), style: { ...refStyle, bold: true } });
    }

    for (const r of p.runs) {
      if (r.isLineBreak) {
        rawPieces.push({ text: '', style: r.style, newline: true });
        continue;
      }
      const txt = expandRunText(r, pageNum, totalPages);
      if (!txt) continue;
      for (const part of txt.split(/( +)/)) {
        if (part) rawPieces.push({ text: part, style: r.style });
      }
    }

    const lines: Array<{ tokens: WrappedToken[]; lineW: number; maxFontPt: number; lineH: number }> = [];
    let curTokens: WrappedToken[] = [];
    let curW = 0;
    let isFirstLine = true;

    const pushLine = () => {
      const maxFontPt = curTokens.reduce((m, t) => Math.max(m, t.style.fontSizePt), 10);
      const lineH = p.exactLinePt || maxFontPt * p.lineSpacingMult;
      lines.push({ tokens: curTokens, lineW: curW, maxFontPt, lineH });
      curTokens = [];
      curW = 0;
      isFirstLine = false;
    };

    for (const piece of rawPieces) {
      if (piece.newline) {
        pushLine();
        continue;
      }
      const fam = mapFontToJsPdf(piece.style.fontFamily);
      const st =
        piece.style.bold && piece.style.italic
          ? 'bolditalic'
          : piece.style.bold
          ? 'bold'
          : piece.style.italic
          ? 'italic'
          : 'normal';
      doc.setFont(fam, st);
      doc.setFontSize(piece.style.fontSizePt);
      const w = doc.getTextWidth(piece.text);
      const lineLimit = Math.max(24, availW - (isFirstLine ? firstIndentOffset : 0));

      if (curTokens.length === 0 && piece.text.trim() === '') continue;

      if (curW + w > lineLimit && piece.text.trim() !== '') {
        if (w > lineLimit) {
          const splitParts = doc.splitTextToSize(piece.text, lineLimit) as string[];
          for (let sIdx = 0; sIdx < splitParts.length; sIdx++) {
            if (sIdx > 0 || curTokens.length > 0) pushLine();
            const pw = doc.getTextWidth(splitParts[sIdx]);
            curTokens.push({ text: splitParts[sIdx], style: piece.style, width: pw });
            curW += pw;
          }
          continue;
        }
        pushLine();
      }
      curTokens.push({ text: piece.text, style: piece.style, width: w });
      curW += w;
    }

    if (curTokens.length > 0 || lines.length === 0) {
      pushLine();
    }
    return lines;
  };

  const drawWrappedLine = (
    line: { tokens: WrappedToken[]; lineW: number; maxFontPt: number },
    xBase: number,
    availW: number,
    yBaseline: number,
    align: OoxmlParagraph['align'],
    extraIndentFirstLine: number
  ) => {
    const effAvail = Math.max(20, availW - extraIndentFirstLine);
    let x = xBase + extraIndentFirstLine;
    if (align === 'center') x = xBase + Math.max(0, (effAvail - line.lineW) / 2);
    else if (align === 'right') x = xBase + Math.max(0, effAvail - line.lineW);

    for (const tok of line.tokens) {
      if (tok.style.highlightHex) {
        const [hr, hg, hb] = parseHexToRgb(tok.style.highlightHex);
        doc.setFillColor(hr, hg, hb);
        doc.rect(x, yBaseline - tok.style.fontSizePt * 0.88, tok.width, tok.style.fontSizePt * 1.15, 'F');
      }
      const fam = mapFontToJsPdf(tok.style.fontFamily);
      const st =
        tok.style.bold && tok.style.italic
          ? 'bolditalic'
          : tok.style.bold
          ? 'bold'
          : tok.style.italic
          ? 'italic'
          : 'normal';
      doc.setFont(fam, st);
      doc.setFontSize(tok.style.fontSizePt);
      const [tr, tg, tb] = parseHexToRgb(tok.style.colorHex);
      doc.setTextColor(tr, tg, tb);
      doc.text(tok.text, x, yBaseline);

      if (tok.style.underline && tok.text.trim()) {
        doc.setDrawColor(tr, tg, tb);
        doc.setLineWidth(Math.max(0.5, tok.style.fontSizePt * 0.06));
        doc.line(x, yBaseline + 1.6, x + tok.width, yBaseline + 1.6);
      }
      x += tok.width;
    }
  };

  for (const sec of sections) {
    const replicaImg = isFullPageReplicaSection(sec);
    if (replicaImg) {
      startPageForSection(sec, true);
      doc.addImage(
        replicaImg.bytes,
        replicaImg.format,
        0,
        0,
        sec.widthPt,
        sec.heightPt,
        undefined,
        'FAST'
      );
      continue;
    }

    let cursorY = startPageForSection(sec, false);
    const maxY = sec.heightPt - sec.margins.bottom;
    const contentW = Math.max(72, sec.widthPt - sec.margins.left - sec.margins.right);

    const ensureY = (neededPt: number) => {
      if (cursorY + neededPt > maxY) {
        cursorY = startPageForSection(sec, false);
      }
    };

    for (const blk of sec.blocks) {
      if (blk.kind === 'paragraph') {
        if (blk.pageBreakBefore && cursorY > sec.margins.top + 4) {
          cursorY = startPageForSection(sec, false);
        }

        const xStart = sec.margins.left + Math.max(0, blk.indentLeftPt - blk.hangingPt);
        const availW = Math.max(48, contentW - Math.max(0, blk.indentLeftPt - blk.hangingPt));
        const hasText = blk.runs.some((r) => r.text.length > 0 || r.fieldType) || Boolean(blk.listMarker);

        if (hasText) {
          cursorY += blk.spaceBeforePt;
          const lines = layoutParagraphTokens(blk, availW, 1, 1);
          const totalParaH = lines.reduce((s, l) => s + l.lineH, 0);
          const paraStartY = cursorY;

          if (blk.shadingHex && lines.length > 0) {
            ensureY(Math.min(totalParaH, lines[0].lineH));
            const [sr, sg, sb] = parseHexToRgb(blk.shadingHex);
            doc.setFillColor(sr, sg, sb);
            doc.rect(xStart - 3, cursorY - 2, availW + 6, totalParaH + 2, 'F');
          }

          lines.forEach((line, lIdx) => {
            ensureY(line.lineH);
            const yBaseline = cursorY + line.maxFontPt * 0.85;
            drawWrappedLine(
              line,
              xStart,
              availW,
              yBaseline,
              blk.align,
              lIdx === 0 && blk.hangingPt === 0 ? blk.firstLinePt : 0
            );
            cursorY += line.lineH;
          });

          if (blk.leftBorderColorHex) {
            const [br, bg, bb] = parseHexToRgb(blk.leftBorderColorHex);
            doc.setDrawColor(br, bg, bb);
            doc.setLineWidth(2);
            doc.line(sec.margins.left + 4, paraStartY, sec.margins.left + 4, cursorY - 2);
          }

          cursorY += blk.spaceAfterPt;
        } else if (blk.images.length === 0) {
          cursorY += Math.max(8, blk.spaceBeforePt + blk.spaceAfterPt);
        }

        for (const img of blk.images) {
          const scale = img.widthPt > availW ? availW / img.widthPt : 1;
          const w = Math.max(8, img.widthPt * scale);
          const h = Math.max(8, img.heightPt * scale);
          ensureY(h + 6);
          let imgX = xStart;
          if (blk.align === 'center') imgX = sec.margins.left + (contentW - w) / 2;
          else if (blk.align === 'right') imgX = sec.margins.left + contentW - w;
          doc.addImage(img.bytes, img.format, imgX, cursorY, w, h, undefined, 'FAST');
          cursorY += h + 8;
        }

        if (blk.hasPageBreakAfter) {
          cursorY = startPageForSection(sec, false);
        }
      } else {
        // Table block with gridSpan, rowSpan (vMerge), shading, borders, and vAlign
        const rawTblW = blk.colWidthsPt.reduce((s, w) => s + w, 0);
        const scaleX = rawTblW > contentW ? contentW / rawTblW : 1;
        const colWs = blk.colWidthsPt.map((w) => w * scaleX);
        const numRows = blk.grid.length;
        const numCols = colWs.length;

        // Precompute cell wrapped content and intrinsic heights
        const cellLayouts: Array<
          Array<{
            paraLines: Array<{
              p: OoxmlParagraph;
              lines: Array<{ tokens: WrappedToken[]; lineW: number; maxFontPt: number; lineH: number }>;
            }>;
            contentH: number;
          }>
        > = [];

        const rowHeights = blk.rowMinHeightsPt.map((h) => Math.max(14, h));

        for (let r = 0; r < numRows; r++) {
          cellLayouts[r] = [];
          for (let c = 0; c < numCols; c++) {
            const cell = blk.grid[r][c];
            if (cell.covered) {
              cellLayouts[r][c] = { paraLines: [], contentH: 0 };
              continue;
            }
            const spanW = colWs.slice(c, c + cell.colSpan).reduce((s, w) => s + w, 0);
            const innerW = Math.max(12, spanW - cell.padLeftPt - cell.padRightPt);
            const paraLines = cell.paragraphs.map((p) => ({
              p,
              lines: layoutParagraphTokens(p, innerW, 1, 1),
            }));
            const textH = paraLines.reduce(
              (sum, pl) => sum + pl.lines.reduce((ls, l) => ls + l.lineH, 0) + pl.p.spaceBeforePt + pl.p.spaceAfterPt,
              0
            );
            const totalH = Math.max(14, textH + cell.padTopPt + cell.padBottomPt);
            cellLayouts[r][c] = { paraLines, contentH: totalH };
            if (cell.rowSpan === 1) {
              rowHeights[r] = Math.max(rowHeights[r], totalH);
            }
          }
        }

        // Distribute extra height for vertically merged cells across spanned rows
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            const cell = blk.grid[r][c];
            if (!cell.covered && cell.rowSpan > 1) {
              const needed = cellLayouts[r][c].contentH;
              const currentSpanH = rowHeights
                .slice(r, r + cell.rowSpan)
                .reduce((s, h) => s + h, 0);
              if (needed > currentSpanH) {
                rowHeights[r + cell.rowSpan - 1] += needed - currentSpanH;
              }
            }
          }
        }

        // Track active row-breaks so we can paginate tables cleanly row by row
        let rowYOffsets: number[] = [];
        let pageStartRow = 0;

        const renderTableRowsSlice = (fromRow: number, toRow: number, startY: number) => {
          const yOffsets: number[] = [];
          let accY = startY;
          for (let r = fromRow; r <= toRow; r++) {
            yOffsets[r] = accY;
            accY += rowHeights[r];
          }

          for (let r = fromRow; r < toRow; r++) {
            let x = sec.margins.left;
            for (let c = 0; c < numCols; c++) {
              const cell = blk.grid[r][c];
              if (cell.covered) {
                x += colWs[c];
                continue;
              }
              const spanW = colWs.slice(c, c + cell.colSpan).reduce((s, w) => s + w, 0);
              const endR = Math.min(toRow, r + cell.rowSpan);
              let spanH = 0;
              for (let rr = r; rr < endR; rr++) spanH += rowHeights[rr];

              const cellY = yOffsets[r];
              if (cell.shadingHex) {
                const [sr, sg, sb] = parseHexToRgb(cell.shadingHex);
                doc.setFillColor(sr, sg, sb);
                doc.rect(x, cellY, spanW, spanH, 'F');
              }

              const drawBorder = (b: OoxmlTableBorder, x1: number, y1: number, x2: number, y2: number) => {
                if (!b.present) return;
                const [br, bg, bb] = parseHexToRgb(b.colorHex);
                doc.setDrawColor(br, bg, bb);
                doc.setLineWidth(b.sizePt);
                doc.line(x1, y1, x2, y2);
              };
              drawBorder(cell.borders.top, x, cellY, x + spanW, cellY);
              drawBorder(cell.borders.bottom, x, cellY + spanH, x + spanW, cellY + spanH);
              drawBorder(cell.borders.left, x, cellY, x, cellY + spanH);
              drawBorder(cell.borders.right, x + spanW, cellY, x + spanW, cellY + spanH);

              const layout = cellLayouts[r][c];
              const innerTextH = Math.max(0, layout.contentH - cell.padTopPt - cell.padBottomPt);
              let textY = cellY + cell.padTopPt;
              if (cell.vAlign === 'middle') {
                textY = cellY + Math.max(cell.padTopPt, (spanH - innerTextH) / 2);
              } else if (cell.vAlign === 'bottom') {
                textY = cellY + Math.max(cell.padTopPt, spanH - cell.padBottomPt - innerTextH);
              }

              const innerW = Math.max(12, spanW - cell.padLeftPt - cell.padRightPt);
              for (const pl of layout.paraLines) {
                textY += pl.p.spaceBeforePt;
                for (const line of pl.lines) {
                  drawWrappedLine(
                    line,
                    x + cell.padLeftPt,
                    innerW,
                    textY + line.maxFontPt * 0.85,
                    pl.p.align,
                    0
                  );
                  textY += line.lineH;
                }
                textY += pl.p.spaceAfterPt;
              }
              x += colWs[c];
            }
          }
          return accY;
        };

        for (let r = 0; r < numRows; r++) {
          const canBreakHere = !blk.grid[r].some((cell) => cell.covered);
          if (r > pageStartRow && canBreakHere && cursorY + rowHeights[r] > maxY) {
            renderTableRowsSlice(pageStartRow, r, cursorY - rowYOffsets.slice(pageStartRow, r).reduce((s, h) => s + h, 0));
            cursorY = startPageForSection(sec, false);
            pageStartRow = r;
          }
          rowYOffsets[r] = rowHeights[r];
          cursorY += rowHeights[r];
        }
        const sliceH = rowHeights.slice(pageStartRow, numRows).reduce((s, h) => s + h, 0);
        renderTableRowsSlice(pageStartRow, numRows, cursorY - sliceH);
        cursorY += 8;
      }
    }
  }

  // Second pass: stamp section Headers and Footers with exact PAGE / NUMPAGES
  const totalPages = doc.getNumberOfPages();
  for (const reg of pageRegistry) {
    if (reg.skipHf) continue;
    const sec = reg.section;
    doc.setPage(reg.pageIndex);
    const contentW = Math.max(72, sec.widthPt - sec.margins.left - sec.margins.right);

    const drawHfBlocks = (blocks: OoxmlBlock[], startY: number) => {
      let y = startY;
      for (const blk of blocks) {
        if (blk.kind !== 'paragraph') continue;
        const lines = layoutParagraphTokens(blk, contentW, reg.pageIndex, totalPages);
        for (const line of lines) {
          drawWrappedLine(line, sec.margins.left, contentW, y + line.maxFontPt * 0.85, blk.align, 0);
          y += line.lineH;
        }
      }
    };

    if (sec.headerBlocks.length > 0) {
      drawHfBlocks(sec.headerBlocks, Math.max(14, sec.margins.header));
    }
    if (sec.footerBlocks.length > 0) {
      drawHfBlocks(sec.footerBlocks, sec.heightPt - Math.max(24, sec.margins.footer + 12));
    }
  }

  return doc.output('blob');
}

async function renderSectionsUnicodeCanvasPdf(sections: OoxmlSection[]): Promise<Blob> {
  const scale = 2.0; // 144 DPI crisp Unicode rendering
  const renderedPages: Array<{ dataUrl: string; widthPt: number; heightPt: number; orientation: 'portrait' | 'landscape' }> = [];

  interface CanvasToken {
    text: string;
    style: OoxmlRunStyle;
    width: number;
  }

  const buildCanvasFont = (st: OoxmlRunStyle) => {
    const fam = /mono|courier|consolas/i.test(st.fontFamily)
      ? 'ui-monospace, "Courier New", monospace'
      : /times|georgia|serif/i.test(st.fontFamily) && !/sans/i.test(st.fontFamily)
      ? 'Georgia, "Times New Roman", serif'
      : 'system-ui, -apple-system, "Segoe UI", "Noto Sans", "Noto Sans Devanagari", sans-serif';
    return `${st.italic ? 'italic ' : ''}${st.bold ? 'bold ' : ''}${st.fontSizePt}px ${fam}`;
  };

  for (const sec of sections) {
    const replicaImg = isFullPageReplicaSection(sec);
    if (replicaImg) {
      const url = URL.createObjectURL(new Blob([new Uint8Array(replicaImg.bytes)], { type: replicaImg.mimeType }));
      const imgEl = await new Promise<HTMLImageElement | null>((resolve) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = url;
      });
      URL.revokeObjectURL(url);
      if (imgEl) {
        const c = document.createElement('canvas');
        c.width = Math.round(sec.widthPt * scale);
        c.height = Math.round(sec.heightPt * scale);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0, c.width, c.height);
        renderedPages.push({
          dataUrl: c.toDataURL('image/jpeg', 0.92),
          widthPt: sec.widthPt,
          heightPt: sec.heightPt,
          orientation: sec.orientation,
        });
        c.width = 0;
        c.height = 0;
      }
      continue;
    }

    const pageCanvases: Array<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> = [];
    const newCanvasPage = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(sec.widthPt * scale);
      c.height = Math.round(sec.heightPt * scale);
      const ctx = c.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, sec.widthPt, sec.heightPt);
      const entry = { canvas: c, ctx };
      pageCanvases.push(entry);
      return entry;
    };

    let cur = newCanvasPage();
    let cursorY = sec.margins.top;
    const maxY = sec.heightPt - sec.margins.bottom;
    const contentW = Math.max(72, sec.widthPt - sec.margins.left - sec.margins.right);

    const ensureY = (neededPt: number) => {
      if (cursorY + neededPt > maxY) {
        cur = newCanvasPage();
        cursorY = sec.margins.top;
      }
    };

    const layoutCanvasPara = (p: OoxmlParagraph, availW: number, pageNum: number, totalPages: number) => {
      const rawPieces: Array<{ text: string; style: OoxmlRunStyle; newline?: boolean }> = [];
      if (p.listMarker) {
        rawPieces.push({ text: p.listMarker, style: { ...(p.runs[0]?.style || DEFAULT_RUN_STYLE), bold: true } });
      }
      for (const r of p.runs) {
        if (r.isLineBreak) {
          rawPieces.push({ text: '', style: r.style, newline: true });
          continue;
        }
        const txt = expandRunText(r, pageNum, totalPages);
        if (!txt) continue;
        for (const part of txt.split(/( +)/)) {
          if (part) rawPieces.push({ text: part, style: r.style });
        }
      }

      const lines: Array<{ tokens: CanvasToken[]; lineW: number; maxFontPt: number; lineH: number }> = [];
      let curTokens: CanvasToken[] = [];
      let curW = 0;
      let isFirstLine = true;
      const firstIndentOffset = p.hangingPt > 0 ? 0 : p.firstLinePt;

      const pushLine = () => {
        const maxFontPt = curTokens.reduce((m, t) => Math.max(m, t.style.fontSizePt), 10);
        const lineH = p.exactLinePt || maxFontPt * p.lineSpacingMult;
        lines.push({ tokens: curTokens, lineW: curW, maxFontPt, lineH });
        curTokens = [];
        curW = 0;
        isFirstLine = false;
      };

      for (const piece of rawPieces) {
        if (piece.newline) {
          pushLine();
          continue;
        }
        cur.ctx.font = buildCanvasFont(piece.style);
        const w = cur.ctx.measureText(piece.text).width;
        const limit = Math.max(24, availW - (isFirstLine ? firstIndentOffset : 0));
        if (curTokens.length === 0 && piece.text.trim() === '') continue;
        if (curW + w > limit && piece.text.trim() !== '') pushLine();
        curTokens.push({ text: piece.text, style: piece.style, width: w });
        curW += w;
      }
      if (curTokens.length > 0 || lines.length === 0) pushLine();
      return lines;
    };

    const drawCanvasLine = (
      ctx: CanvasRenderingContext2D,
      line: { tokens: CanvasToken[]; lineW: number; maxFontPt: number },
      xBase: number,
      availW: number,
      yBaseline: number,
      align: OoxmlParagraph['align'],
      extraFirst: number
    ) => {
      const effAvail = Math.max(20, availW - extraFirst);
      let x = xBase + extraFirst;
      if (align === 'center') x = xBase + Math.max(0, (effAvail - line.lineW) / 2);
      else if (align === 'right') x = xBase + Math.max(0, effAvail - line.lineW);

      for (const tok of line.tokens) {
        if (tok.style.highlightHex) {
          ctx.fillStyle = `#${tok.style.highlightHex}`;
          ctx.fillRect(x, yBaseline - tok.style.fontSizePt * 0.88, tok.width, tok.style.fontSizePt * 1.15);
        }
        ctx.font = buildCanvasFont(tok.style);
        ctx.fillStyle = `#${tok.style.colorHex}`;
        ctx.fillText(tok.text, x, yBaseline);
        if (tok.style.underline && tok.text.trim()) {
          ctx.strokeStyle = `#${tok.style.colorHex}`;
          ctx.lineWidth = Math.max(0.6, tok.style.fontSizePt * 0.06);
          ctx.beginPath();
          ctx.moveTo(x, yBaseline + 1.8);
          ctx.lineTo(x + tok.width, yBaseline + 1.8);
          ctx.stroke();
        }
        x += tok.width;
      }
    };

    for (const blk of sec.blocks) {
      if (blk.kind === 'paragraph') {
        if (blk.pageBreakBefore && cursorY > sec.margins.top + 4) {
          cur = newCanvasPage();
          cursorY = sec.margins.top;
        }
        const xStart = sec.margins.left + Math.max(0, blk.indentLeftPt - blk.hangingPt);
        const availW = Math.max(48, contentW - Math.max(0, blk.indentLeftPt - blk.hangingPt));
        const hasText = blk.runs.some((r) => r.text.length > 0 || r.fieldType) || Boolean(blk.listMarker);

        if (hasText) {
          cursorY += blk.spaceBeforePt;
          const lines = layoutCanvasPara(blk, availW, 1, 1);
          const totalParaH = lines.reduce((s, l) => s + l.lineH, 0);
          const paraStartY = cursorY;

          if (blk.shadingHex && lines.length > 0) {
            ensureY(Math.min(totalParaH, lines[0].lineH));
            cur.ctx.fillStyle = `#${blk.shadingHex}`;
            cur.ctx.fillRect(xStart - 3, cursorY - 2, availW + 6, totalParaH + 2);
          }

          lines.forEach((line, lIdx) => {
            ensureY(line.lineH);
            drawCanvasLine(
              cur.ctx,
              line,
              xStart,
              availW,
              cursorY + line.maxFontPt * 0.85,
              blk.align,
              lIdx === 0 && blk.hangingPt === 0 ? blk.firstLinePt : 0
            );
            cursorY += line.lineH;
          });

          if (blk.leftBorderColorHex) {
            cur.ctx.fillStyle = `#${blk.leftBorderColorHex}`;
            cur.ctx.fillRect(sec.margins.left + 3, paraStartY, 2, Math.max(8, cursorY - paraStartY));
          }
          cursorY += blk.spaceAfterPt;
        }

        for (const img of blk.images) {
          const url = URL.createObjectURL(new Blob([new Uint8Array(img.bytes)], { type: img.mimeType }));
          const imgEl = await new Promise<HTMLImageElement | null>((resolve) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => resolve(null);
            el.src = url;
          });
          URL.revokeObjectURL(url);
          if (imgEl) {
            const imgScale = img.widthPt > availW ? availW / img.widthPt : 1;
            const w = Math.max(8, img.widthPt * imgScale);
            const h = Math.max(8, img.heightPt * imgScale);
            ensureY(h + 6);
            let imgX = xStart;
            if (blk.align === 'center') imgX = sec.margins.left + (contentW - w) / 2;
            else if (blk.align === 'right') imgX = sec.margins.left + contentW - w;
            cur.ctx.drawImage(imgEl, imgX, cursorY, w, h);
            cursorY += h + 8;
          }
        }

        if (blk.hasPageBreakAfter) {
          cur = newCanvasPage();
          cursorY = sec.margins.top;
        }
      } else {
        const rawTblW = blk.colWidthsPt.reduce((s, w) => s + w, 0);
        const scaleX = rawTblW > contentW ? contentW / rawTblW : 1;
        const colWs = blk.colWidthsPt.map((w) => w * scaleX);
        const numRows = blk.grid.length;
        const numCols = colWs.length;
        const rowHeights = blk.rowMinHeightsPt.map((h) => Math.max(14, h));

        const cellLayouts = blk.grid.map((row, r) =>
          row.map((cell, c) => {
            if (cell.covered) return { paraLines: [], contentH: 0 };
            const spanW = colWs.slice(c, c + cell.colSpan).reduce((s, w) => s + w, 0);
            const innerW = Math.max(12, spanW - cell.padLeftPt - cell.padRightPt);
            const paraLines = cell.paragraphs.map((p) => ({
              p,
              lines: layoutCanvasPara(p, innerW, 1, 1),
            }));
            const textH = paraLines.reduce(
              (sum, pl) => sum + pl.lines.reduce((ls, l) => ls + l.lineH, 0) + pl.p.spaceBeforePt + pl.p.spaceAfterPt,
              0
            );
            const totalH = Math.max(14, textH + cell.padTopPt + cell.padBottomPt);
            if (cell.rowSpan === 1) rowHeights[r] = Math.max(rowHeights[r], totalH);
            return { paraLines, contentH: totalH };
          })
        );

        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < numCols; c++) {
            const cell = blk.grid[r][c];
            if (!cell.covered && cell.rowSpan > 1) {
              const needed = cellLayouts[r][c].contentH;
              const curH = rowHeights.slice(r, r + cell.rowSpan).reduce((s, h) => s + h, 0);
              if (needed > curH) rowHeights[r + cell.rowSpan - 1] += needed - curH;
            }
          }
        }

        for (let r = 0; r < numRows; r++) {
          if (cursorY + rowHeights[r] > maxY && !blk.grid[r].some((c) => c.covered)) {
            cur = newCanvasPage();
            cursorY = sec.margins.top;
          }
          let x = sec.margins.left;
          for (let c = 0; c < numCols; c++) {
            const cell = blk.grid[r][c];
            if (cell.covered) {
              x += colWs[c];
              continue;
            }
            const spanW = colWs.slice(c, c + cell.colSpan).reduce((s, w) => s + w, 0);
            const spanH = rowHeights.slice(r, r + cell.rowSpan).reduce((s, h) => s + h, 0);
            if (cell.shadingHex) {
              cur.ctx.fillStyle = `#${cell.shadingHex}`;
              cur.ctx.fillRect(x, cursorY, spanW, spanH);
            }
            const drawSide = (b: OoxmlTableBorder, x1: number, y1: number, x2: number, y2: number) => {
              if (!b.present) return;
              cur.ctx.strokeStyle = `#${b.colorHex}`;
              cur.ctx.lineWidth = b.sizePt;
              cur.ctx.beginPath();
              cur.ctx.moveTo(x1, y1);
              cur.ctx.lineTo(x2, y2);
              cur.ctx.stroke();
            };
            drawSide(cell.borders.top, x, cursorY, x + spanW, cursorY);
            drawSide(cell.borders.bottom, x, cursorY + spanH, x + spanW, cursorY + spanH);
            drawSide(cell.borders.left, x, cursorY, x, cursorY + spanH);
            drawSide(cell.borders.right, x + spanW, cursorY, x + spanW, cursorY + spanH);

            const layout = cellLayouts[r][c];
            const innerTextH = Math.max(0, layout.contentH - cell.padTopPt - cell.padBottomPt);
            let textY = cursorY + cell.padTopPt;
            if (cell.vAlign === 'middle') textY = cursorY + Math.max(cell.padTopPt, (spanH - innerTextH) / 2);
            else if (cell.vAlign === 'bottom') textY = cursorY + Math.max(cell.padTopPt, spanH - cell.padBottomPt - innerTextH);

            const innerW = Math.max(12, spanW - cell.padLeftPt - cell.padRightPt);
            for (const pl of layout.paraLines) {
              textY += pl.p.spaceBeforePt;
              for (const line of pl.lines) {
                drawCanvasLine(
                  cur.ctx,
                  line,
                  x + cell.padLeftPt,
                  innerW,
                  textY + line.maxFontPt * 0.85,
                  pl.p.align,
                  0
                );
                textY += line.lineH;
              }
              textY += pl.p.spaceAfterPt;
            }
            x += colWs[c];
          }
          cursorY += rowHeights[r];
        }
        cursorY += 8;
      }
    }

    const totalSecPages = pageCanvases.length;
    for (let idx = 0; idx < totalSecPages; idx++) {
      const pc = pageCanvases[idx];
      const drawHf = (blocks: OoxmlBlock[], startY: number) => {
        let y = startY;
        for (const blk of blocks) {
          if (blk.kind !== 'paragraph') continue;
          const lines = layoutCanvasPara(blk, contentW, idx + 1, totalSecPages);
          for (const line of lines) {
            drawCanvasLine(pc.ctx, line, sec.margins.left, contentW, y + line.maxFontPt * 0.85, blk.align, 0);
            y += line.lineH;
          }
        }
      };
      if (sec.headerBlocks.length > 0) drawHf(sec.headerBlocks, Math.max(14, sec.margins.header));
      if (sec.footerBlocks.length > 0) drawHf(sec.footerBlocks, sec.heightPt - Math.max(24, sec.margins.footer + 12));

      renderedPages.push({
        dataUrl: pc.canvas.toDataURL('image/jpeg', 0.92),
        widthPt: sec.widthPt,
        heightPt: sec.heightPt,
        orientation: sec.orientation,
      });
      pc.canvas.width = 0;
      pc.canvas.height = 0;
    }
  }

  const first = renderedPages[0];
  const doc = new jsPDF({
    orientation: first.orientation,
    unit: 'pt',
    format: [Math.min(first.widthPt, first.heightPt), Math.max(first.widthPt, first.heightPt)],
    compress: true,
  });

  renderedPages.forEach((p, idx) => {
    if (idx > 0) {
      doc.addPage(
        [Math.min(p.widthPt, p.heightPt), Math.max(p.widthPt, p.heightPt)],
        p.orientation
      );
    }
    doc.addImage(p.dataUrl, 'JPEG', 0, 0, p.widthPt, p.heightPt, undefined, 'FAST');
  });

  return doc.output('blob');
}
