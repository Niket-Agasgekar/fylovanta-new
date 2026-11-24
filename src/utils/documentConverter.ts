import mammoth from 'mammoth';
import { marked } from 'marked';
import jsPDF from 'jspdf';
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
} from 'docx';
import type { ConversionOptions } from '../types';

export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  colorHex?: string;
  highlightHex?: string;
}

export interface TableCellNode {
  isHeader: boolean;
  colSpan?: number;
  rowSpan?: number;
  shadingHex?: string;
  runs: InlineRun[];
}

export type DocBlock =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; align?: 'left' | 'center' | 'right'; runs: InlineRun[] }
  | { type: 'paragraph'; align?: 'left' | 'center' | 'right'; runs: InlineRun[] }
  | { type: 'blockquote'; runs: InlineRun[] }
  | { type: 'list-item'; ordered: boolean; index: number; level?: number; runs: InlineRun[] }
  | { type: 'code'; text: string }
  | { type: 'table'; rows: TableCellNode[][] }
  | { type: 'image'; dataUrl: string; alt?: string }
  | { type: 'hr' };

function parseCssColorToHex(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  const named: Record<string, string> = {
    black: '0F172A',
    white: 'FFFFFF',
    red: 'DC2626',
    blue: '2563EB',
    green: '16A34A',
    yellow: 'FEF08A',
    orange: 'EA580C',
    purple: '9333EA',
    gray: '475569',
    grey: '475569',
  };
  if (named[s]) return named[s];
  const hex6 = s.match(/^#([0-9a-f]{6})$/i);
  if (hex6) return hex6[1].toUpperCase();
  const hex3 = s.match(/^#([0-9a-f]{3})$/i);
  if (hex3) {
    const [, h] = hex3;
    return `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toUpperCase();
  }
  const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const toH = (v: string) => Math.max(0, Math.min(255, parseInt(v, 10))).toString(16).padStart(2, '0').toUpperCase();
    return `${toH(rgbMatch[1])}${toH(rgbMatch[2])}${toH(rgbMatch[3])}`;
  }
  return undefined;
}

function hexToRgbTuple(hex: string | undefined, fallback: [number, number, number] = [15, 23, 42]): [number, number, number] {
  if (!hex || !/^[0-9A-F]{6}$/i.test(hex)) return fallback;
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function detectCsvDelimiter(normalizedCsv: string): string {
  const firstLine = normalizedCsv
    .split('\n')
    .find((line) => line.trim().length > 0) || '';
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;

  for (const delim of candidates) {
    let inQuotes = false;
    let count = 0;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes && ch === delim) {
        count++;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      best = delim;
    }
  }
  return best;
}

/**
 * Parses CSV/TSV text (RFC-4180 compliant for quoted cells & escaped quotes) into JSON array string.
 */
export function csvToJsonString(csvText: string): string {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  if (!cleanText.trim()) {
    throw new Error('The CSV file is empty and contains no data rows.');
  }

  const normalized = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const delimiter = detectCsvDelimiter(normalized);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"' && currentCell === '') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\n') {
        currentRow.push(currentCell);
        if (currentRow.some((cell) => cell.trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    throw new Error('The CSV file contains no valid rows.');
  }

  const maxCols = Math.max(...rows.map((r) => r.length));
  const seenHeaders = new Map<string, number>();
  const headers: string[] = [];

  for (let idx = 0; idx < maxCols; idx++) {
    const rawHeader = (rows[0][idx] ?? '').trim() || `column_${idx + 1}`;
    const count = (seenHeaders.get(rawHeader) || 0) + 1;
    seenHeaders.set(rawHeader, count);
    headers.push(count > 1 ? `${rawHeader}_${count}` : rawHeader);
  }

  const records = rows.slice(1).map((row) => {
    const obj: Record<string, string | number | boolean | null> = {};
    headers.forEach((header, idx) => {
      const raw = (row[idx] ?? '').trim();
      if (raw === '') {
        obj[header] = '';
      } else if (raw === 'true') {
        obj[header] = true;
      } else if (raw === 'false') {
        obj[header] = false;
      } else if (raw === 'null') {
        obj[header] = null;
      } else if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(raw)) {
        const parsedNum = Number(raw);
        // Preserve precision and leading-zero IDs (e.g. >15-digit IDs remain exact strings)
        if (
          Number.isFinite(parsedNum) &&
          (!Number.isInteger(parsedNum) || Number.isSafeInteger(parsedNum)) &&
          raw.replace(/^-/, '').split('.')[0].length <= 15
        ) {
          obj[header] = parsedNum;
        } else {
          obj[header] = raw;
        }
      } else {
        obj[header] = raw;
      }
    });
    return obj;
  });

  return JSON.stringify(records, null, 2);
}

function flattenRecordRecursive(
  obj: Record<string, unknown>,
  prefix = '',
  out: Record<string, string> = {}
): Record<string, string> {
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val === null || val === undefined) {
      out[fullKey] = '';
    } else if (Array.isArray(val)) {
      out[fullKey] = JSON.stringify(val);
    } else if (typeof val === 'object') {
      const nestedEntries = Object.entries(val as Record<string, unknown>);
      if (nestedEntries.length === 0) {
        out[fullKey] = '';
      } else {
        flattenRecordRecursive(val as Record<string, unknown>, fullKey, out);
      }
    } else {
      out[fullKey] = String(val);
    }
  }
  return out;
}

/**
 * Converts JSON array/object into RFC-4180 CSV string (with recursive nested object flattening)
 */
export function jsonToCsvString(jsonText: string): string {
  const cleanJson = jsonText.replace(/^\uFEFF/, '').trim();
  if (!cleanJson) {
    throw new Error('The JSON file is empty.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    throw new Error('Invalid JSON file. Please verify the JSON syntax.');
  }

  const arr: Record<string, unknown>[] = Array.isArray(parsed)
    ? parsed.map((item) =>
        typeof item === 'object' && item !== null && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : { value: item }
      )
    : typeof parsed === 'object' && parsed !== null
    ? [parsed as Record<string, unknown>]
    : [{ value: parsed }];

  if (arr.length === 0) {
    throw new Error('The JSON array is empty and has no records to export to CSV.');
  }

  const flattened = arr.map((row) => flattenRecordRecursive(row));
  const headers = Array.from(new Set(flattened.flatMap((row) => Object.keys(row))));

  if (headers.length === 0) {
    throw new Error('The JSON objects contain no fields to export to CSV.');
  }

  const escapeCell = (val: string) => {
    if (/[",\n\r]/.test(val)) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...flattened.map((row) => headers.map((h) => escapeCell(row[h] ?? '')).join(',')),
  ];

  return lines.join('\r\n');
}

function normalizeInlineRuns(runs: InlineRun[]): InlineRun[] {
  const merged: InlineRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const prev = merged[merged.length - 1];
    if (
      prev &&
      Boolean(prev.bold) === Boolean(run.bold) &&
      Boolean(prev.italic) === Boolean(run.italic) &&
      Boolean(prev.underline) === Boolean(run.underline) &&
      Boolean(prev.code) === Boolean(run.code) &&
      (prev.colorHex || '') === (run.colorHex || '') &&
      (prev.highlightHex || '') === (run.highlightHex || '')
    ) {
      prev.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

function getInlineCssProp(el: Element, propName: string): string | undefined {
  const styleAttr = el.getAttribute('style') || '';
  const re = new RegExp(`(?:^|;)\\s*${propName}\\s*:\\s*([^;]+)`, 'i');
  const m = styleAttr.match(re);
  return m ? m[1].trim() : undefined;
}

function getElementTextAlign(el: Element): 'left' | 'center' | 'right' | undefined {
  const alignAttr = (getInlineCssProp(el, 'text-align') || el.getAttribute('align') || '').toLowerCase();
  if (alignAttr === 'center' || alignAttr === 'right' || alignAttr === 'left') {
    return alignAttr;
  }
  return undefined;
}

function collectDomInlineRuns(node: Node, style: Omit<InlineRun, 'text'> = {}): InlineRun[] {
  const runs: InlineRun[] = [];
  if (node.nodeType === 3) {
    const raw = (node.textContent || '').replace(/\s+/g, ' ');
    if (raw) runs.push({ text: raw, ...style });
    return runs;
  }

  if (node.nodeType !== 1) return runs;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (['script', 'style', 'noscript', 'template', 'svg'].includes(tag)) {
    return runs;
  }
  if (tag === 'br') {
    runs.push({ text: '\n', ...style });
    return runs;
  }

  const cssWeight = (getInlineCssProp(el, 'font-weight') || '').toLowerCase();
  const cssStyle = (getInlineCssProp(el, 'font-style') || '').toLowerCase();
  const cssDeco = (getInlineCssProp(el, 'text-decoration') || '').toLowerCase();
  const cssColor = parseCssColorToHex(getInlineCssProp(el, 'color') || el.getAttribute('color'));
  const cssBg = parseCssColorToHex(getInlineCssProp(el, 'background-color') || getInlineCssProp(el, 'background'));

  const nextStyle: Omit<InlineRun, 'text'> = {
    bold: style.bold || tag === 'strong' || tag === 'b' || cssWeight === 'bold' || Number(cssWeight) >= 600,
    italic: style.italic || tag === 'em' || tag === 'i' || cssStyle === 'italic',
    underline: style.underline || tag === 'u' || cssDeco.includes('underline'),
    code: style.code || tag === 'code' || tag === 'kbd',
    colorHex: cssColor || style.colorHex,
    highlightHex: cssBg || (tag === 'mark' ? 'FEF08A' : style.highlightHex),
  };

  for (const child of Array.from(el.childNodes)) {
    runs.push(...collectDomInlineRuns(child, nextStyle));
  }
  return normalizeInlineRuns(runs);
}

/**
 * Parses HTML string into structured DocBlock AST.
 * Uses DOMParser in browsers and a deterministic lightweight HTML parser fallback in Node.
 */
export function parseHtmlToBlocks(html: string): DocBlock[] {
  if (!html || !html.trim()) return [];

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks: DocBlock[] = [];

    const walkList = (listEl: Element, level: number) => {
      const ordered = listEl.tagName.toLowerCase() === 'ol';
      let itemIdx = 1;
      for (const li of Array.from(listEl.children)) {
        if (li.tagName.toLowerCase() === 'li') {
          const inlineParts: InlineRun[] = [];
          const subLists: Element[] = [];
          for (const ch of Array.from(li.childNodes)) {
            if (ch.nodeType === 1 && ['ul', 'ol'].includes((ch as Element).tagName.toLowerCase())) {
              subLists.push(ch as Element);
            } else {
              inlineParts.push(...collectDomInlineRuns(ch));
            }
          }
          const runs = normalizeInlineRuns(inlineParts);
          if (runs.some((r) => r.text.trim())) {
            blocks.push({ type: 'list-item', ordered, index: itemIdx++, level, runs });
          }
          for (const sub of subLists) {
            walkList(sub, level + 1);
          }
        }
      }
    };

    const walk = (container: Element) => {
      let pendingInline: InlineRun[] = [];

      const flushInline = () => {
        const cleaned = normalizeInlineRuns(pendingInline);
        const text = cleaned.map((r) => r.text).join('').trim();
        if (text) {
          blocks.push({ type: 'paragraph', runs: cleaned });
        }
        pendingInline = [];
      };

      for (const child of Array.from(container.childNodes)) {
        if (child.nodeType === 3) {
          const t = (child.textContent || '').replace(/\s+/g, ' ');
          if (t.trim()) pendingInline.push({ text: t });
          continue;
        }
        if (child.nodeType !== 1) continue;

        const el = child as Element;
        const tag = el.tagName.toLowerCase();

        if (['script', 'style', 'noscript', 'template', 'head'].includes(tag)) {
          continue;
        }

        if (/^h[1-6]$/.test(tag)) {
          flushInline();
          const level = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
          const runs = collectDomInlineRuns(el);
          if (runs.some((r) => r.text.trim())) {
            blocks.push({ type: 'heading', level, align: getElementTextAlign(el), runs });
          }
        } else if (tag === 'p') {
          flushInline();
          const imgs = Array.from(el.querySelectorAll('img'));
          const runs = collectDomInlineRuns(el);
          if (runs.some((r) => r.text.trim())) {
            blocks.push({ type: 'paragraph', align: getElementTextAlign(el), runs });
          }
          for (const img of imgs) {
            const src = img.getAttribute('src') || '';
            if (src.startsWith('data:image/')) {
              blocks.push({ type: 'image', dataUrl: src, alt: img.getAttribute('alt') || undefined });
            }
          }
        } else if (tag === 'blockquote') {
          flushInline();
          const runs = collectDomInlineRuns(el);
          if (runs.some((r) => r.text.trim())) {
            blocks.push({ type: 'blockquote', runs });
          }
        } else if (tag === 'pre') {
          flushInline();
          const codeText = (el.textContent || '').replace(/\r\n/g, '\n').trimEnd();
          if (codeText) {
            blocks.push({ type: 'code', text: codeText });
          }
        } else if (tag === 'ul' || tag === 'ol') {
          flushInline();
          walkList(el, 0);
        } else if (tag === 'table') {
          flushInline();
          const tableRows: TableCellNode[][] = [];
          const trList = el.querySelectorAll('tr');
          for (const tr of Array.from(trList)) {
            const rowCells: TableCellNode[] = [];
            for (const cell of Array.from(tr.children)) {
              const cTag = cell.tagName.toLowerCase();
              if (cTag === 'th' || cTag === 'td') {
                const colSpan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
                const rowSpan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1);
                const shadingHex = parseCssColorToHex(
                  getInlineCssProp(cell, 'background-color') || getInlineCssProp(cell, 'background')
                );
                rowCells.push({
                  isHeader: cTag === 'th' || tr.parentElement?.tagName.toLowerCase() === 'thead',
                  colSpan: colSpan > 1 ? colSpan : undefined,
                  rowSpan: rowSpan > 1 ? rowSpan : undefined,
                  shadingHex,
                  runs: collectDomInlineRuns(cell),
                });
              }
            }
            if (rowCells.length > 0) tableRows.push(rowCells);
          }
          if (tableRows.length > 0) {
            blocks.push({ type: 'table', rows: tableRows });
          }
        } else if (tag === 'img') {
          flushInline();
          const src = el.getAttribute('src') || '';
          if (src.startsWith('data:image/')) {
            blocks.push({ type: 'image', dataUrl: src, alt: el.getAttribute('alt') || undefined });
          }
        } else if (tag === 'hr') {
          flushInline();
          blocks.push({ type: 'hr' });
        } else if (['div', 'section', 'article', 'main', 'header', 'footer', 'aside'].includes(tag)) {
          flushInline();
          walk(el);
        } else {
          pendingInline.push(...collectDomInlineRuns(el));
        }
      }

      flushInline();
    };

    if (doc.body) {
      walk(doc.body);
    }
    return blocks;
  }

  // Fallback parser for headless Node environments without DOMParser
  return parseHtmlFallbackNoDom(html);
}

function stripTagsToRuns(fragment: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const tokenRegex = /(<\/?(?:strong|b|em|i|u|code|br)\b[^>]*>|<[^>]+>)/gi;
  let lastIdx = 0;
  let bold = 0;
  let italic = 0;
  let underline = 0;
  let code = 0;

  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(fragment)) !== null) {
    if (m.index > lastIdx) {
      const txt = decodeHtmlEntities(fragment.slice(lastIdx, m.index)).replace(/\s+/g, ' ');
      if (txt) {
        runs.push({
          text: txt,
          bold: bold > 0,
          italic: italic > 0,
          underline: underline > 0,
          code: code > 0,
        });
      }
    }
    const tag = m[1].toLowerCase();
    if (/^<(strong|b)\b/.test(tag)) bold++;
    else if (/^<\/(strong|b)>/.test(tag)) bold = Math.max(0, bold - 1);
    else if (/^<(em|i)\b/.test(tag)) italic++;
    else if (/^<\/(em|i)>/.test(tag)) italic = Math.max(0, italic - 1);
    else if (/^<u\b/.test(tag)) underline++;
    else if (/^<\/u>/.test(tag)) underline = Math.max(0, underline - 1);
    else if (/^<code\b/.test(tag)) code++;
    else if (/^<\/code>/.test(tag)) code = Math.max(0, code - 1);
    else if (/^<br\b/.test(tag)) runs.push({ text: '\n' });
    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < fragment.length) {
    const txt = decodeHtmlEntities(fragment.slice(lastIdx)).replace(/\s+/g, ' ');
    if (txt) {
      runs.push({
        text: txt,
        bold: bold > 0,
        italic: italic > 0,
        underline: underline > 0,
        code: code > 0,
      });
    }
  }
  return normalizeInlineRuns(runs);
}

function parseHtmlFallbackNoDom(html: string): DocBlock[] {
  const cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');

  const blocks: DocBlock[] = [];
  const blockRegex =
    /<(h[1-6]|p|blockquote|pre|ul|ol|table|hr|img)\b([^>]*)>([\s\S]*?)<\/\1>|<hr\b[^>]*\/?>|<img\b([^>]*)>/gi;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = blockRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      const gap = cleaned.slice(lastIndex, match.index);
      const runs = stripTagsToRuns(gap);
      if (runs.some((r) => r.text.trim())) {
        blocks.push({ type: 'paragraph', runs });
      }
    }
    lastIndex = blockRegex.lastIndex;

    const full = match[0];
    if (/^<hr\b/i.test(full)) {
      blocks.push({ type: 'hr' });
      continue;
    }
    if (/^<img\b/i.test(full)) {
      const attrStr = match[4] || '';
      const srcMatch = attrStr.match(/src\s*=\s*["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1].startsWith('data:image/')) {
        blocks.push({ type: 'image', dataUrl: srcMatch[1] });
      }
      continue;
    }

    const tag = match[1].toLowerCase();
    const inner = match[3] || '';

    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
      const runs = stripTagsToRuns(inner);
      if (runs.some((r) => r.text.trim())) {
        blocks.push({ type: 'heading', level, runs });
      }
    } else if (tag === 'p') {
      const runs = stripTagsToRuns(inner);
      if (runs.some((r) => r.text.trim())) {
        blocks.push({ type: 'paragraph', runs });
      }
    } else if (tag === 'blockquote') {
      const runs = stripTagsToRuns(inner);
      if (runs.some((r) => r.text.trim())) {
        blocks.push({ type: 'blockquote', runs });
      }
    } else if (tag === 'pre') {
      const text = decodeHtmlEntities(inner.replace(/<[^>]+>/g, '')).trimEnd();
      if (text) blocks.push({ type: 'code', text });
    } else if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      let idx = 1;
      while ((liMatch = liRegex.exec(inner)) !== null) {
        const runs = stripTagsToRuns(liMatch[1]);
        if (runs.some((r) => r.text.trim())) {
          blocks.push({ type: 'list-item', ordered, index: idx++, runs });
        }
      }
    } else if (tag === 'table') {
      const rows: TableCellNode[][] = [];
      const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch: RegExpExecArray | null;
      while ((trMatch = trRegex.exec(inner)) !== null) {
        const rowCells: TableCellNode[] = [];
        const cellRegex = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
        let cellMatch: RegExpExecArray | null;
        while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
          rowCells.push({
            isHeader: cellMatch[1].toLowerCase() === 'th',
            runs: stripTagsToRuns(cellMatch[2]),
          });
        }
        if (rowCells.length > 0) rows.push(rowCells);
      }
      if (rows.length > 0) blocks.push({ type: 'table', rows });
    }
  }

  if (lastIndex < cleaned.length) {
    const tail = stripTagsToRuns(cleaned.slice(lastIndex));
    if (tail.some((r) => r.text.trim())) {
      blocks.push({ type: 'paragraph', runs: tail });
    }
  }

  return blocks;
}

export function blocksToPlainText(blocks: DocBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
      case 'blockquote':
        lines.push(block.runs.map((r) => r.text).join('').trim());
        break;
      case 'list-item':
        lines.push(
          `${block.ordered ? `${block.index}.` : '•'} ${block.runs.map((r) => r.text).join('').trim()}`
        );
        break;
      case 'code':
        lines.push(block.text);
        break;
      case 'table':
        for (const row of block.rows) {
          lines.push(row.map((c) => c.runs.map((r) => r.text).join('').trim()).join('\t'));
        }
        break;
      case 'hr':
        lines.push('---');
        break;
      case 'image':
        if (block.alt) lines.push(`[Image: ${block.alt}]`);
        break;
    }
  }
  return lines.filter((l) => l.length > 0).join('\n\n');
}

function blocksToMarkdown(blocks: DocBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    const formatRuns = (runs: InlineRun[]) =>
      runs
        .map((r) => {
          let t = r.text;
          if (!t.trim()) return t;
          if (r.code) return `\`${t}\``;
          if (r.bold && r.italic) return `***${t}***`;
          if (r.bold) return `**${t}**`;
          if (r.italic) return `*${t}*`;
          return t;
        })
        .join('');

    switch (block.type) {
      case 'heading':
        parts.push(`${'#'.repeat(block.level)} ${formatRuns(block.runs).trim()}`);
        break;
      case 'paragraph':
        parts.push(formatRuns(block.runs).trim());
        break;
      case 'blockquote':
        parts.push(`> ${formatRuns(block.runs).trim()}`);
        break;
      case 'list-item':
        parts.push(`${block.ordered ? `${block.index}.` : '-'} ${formatRuns(block.runs).trim()}`);
        break;
      case 'code':
        parts.push(`\`\`\`\n${block.text}\n\`\`\``);
        break;
      case 'table': {
        const rows = block.rows;
        if (rows.length === 0) break;
        const colCount = Math.max(...rows.map((r) => r.length));
        const toRow = (cells: TableCellNode[]) =>
          `| ${Array.from({ length: colCount }, (_, i) =>
            (cells[i] ? formatRuns(cells[i].runs).trim() : '').replace(/\|/g, '\\|')
          ).join(' | ')} |`;
        parts.push(
          [
            toRow(rows[0]),
            `| ${Array.from({ length: colCount }, () => '---').join(' | ')} |`,
            ...rows.slice(1).map(toRow),
          ].join('\n')
        );
        break;
      }
      case 'hr':
        parts.push('---');
        break;
      case 'image':
        parts.push(`![${block.alt || 'image'}](${block.dataUrl})`);
        break;
    }
  }
  return parts.join('\n\n');
}

function blocksToCsv(blocks: DocBlock[], fallbackRawText: string): string {
  const tableBlock = blocks.find((b): b is Extract<DocBlock, { type: 'table' }> => b.type === 'table');
  const escapeCell = (val: string) =>
    /[",\n\r]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;

  if (tableBlock && tableBlock.rows.length > 0) {
    return tableBlock.rows
      .map((row) =>
        row.map((cell) => escapeCell(cell.runs.map((r) => r.text).join('').trim())).join(',')
      )
      .join('\r\n');
  }

  const lines = fallbackRawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('The source document contains no text or table rows to export as CSV.');
  }

  return ['line_number,content', ...lines.map((line, i) => `${i + 1},${escapeCell(line)}`)].join(
    '\r\n'
  );
}

/**
 * Extracts clean text & HTML from a DOCX file using mammoth
 */
export async function extractDocxContent(file: File): Promise<{ text: string; html: string }> {
  const buffer = await file.arrayBuffer();
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer: buffer }),
    mammoth.convertToHtml({ arrayBuffer: buffer }),
  ]);
  return {
    text: textResult.value || '',
    html: htmlResult.value || '',
  };
}

function decodeDataUrlBytes(dataUrl: string): {
  bytes: Uint8Array;
  type: 'png' | 'jpg' | 'gif';
} | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/i);
  if (!match) return null;
  const subtype = match[1].toLowerCase() === 'jpeg' ? 'jpg' : (match[1].toLowerCase() as 'png' | 'jpg' | 'gif');
  const binStr = atob(match[2]);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return { bytes, type: subtype };
}

function getRasterImageSizeFromBytes(
  bytes: Uint8Array,
  type: 'png' | 'jpg' | 'gif'
): { width: number; height: number } {
  if (type === 'png' && bytes.length >= 24) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      width: Math.max(1, view.getUint32(16, false)),
      height: Math.max(1, view.getUint32(20, false)),
    };
  }
  if (type === 'gif' && bytes.length >= 10) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      width: Math.max(1, view.getUint16(6, true)),
      height: Math.max(1, view.getUint16(8, true)),
    };
  }
  if (type === 'jpg') {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        const h = (bytes[i + 5] << 8) | bytes[i + 6];
        const w = (bytes[i + 7] << 8) | bytes[i + 8];
        if (w > 0 && h > 0) return { width: w, height: h };
      }
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      i += 2 + Math.max(2, len);
    }
  }
  return { width: 420, height: 280 };
}

function inlineRunsToDocxTextRuns(runs: InlineRun[], fontSizeHalfPts = 22): TextRun[] {
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold,
        italics: run.italic,
        underline: run.underline ? {} : undefined,
        font: run.code ? 'Courier New' : undefined,
        color: run.colorHex || undefined,
        shading: run.highlightHex ? { type: ShadingType.CLEAR, fill: run.highlightHex } : undefined,
        size: fontSizeHalfPts,
      })
  );
}

function toDocxAlign(align?: 'left' | 'center' | 'right') {
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}

/**
 * Generates a rich .docx Word file preserving headings, inline styles, colors, alignment, nested lists, merged tables, and embedded images.
 */
export async function htmlBlocksToDocxBlob(blocks: DocBlock[]): Promise<Blob> {
  const children: Array<Paragraph | Table> = [];
  const headingLevels = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ] as const;

  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        children.push(
          new Paragraph({
            heading: headingLevels[Math.min(5, Math.max(0, block.level - 1))],
            alignment: toDocxAlign(block.align),
            children: inlineRunsToDocxTextRuns(
              block.runs,
              block.level === 1 ? 32 : block.level === 2 ? 26 : 24
            ),
            spacing: { before: 160, after: 120 },
          })
        );
        break;
      case 'paragraph':
        children.push(
          new Paragraph({
            alignment: toDocxAlign(block.align),
            children: inlineRunsToDocxTextRuns(block.runs, 22),
            spacing: { after: 120 },
          })
        );
        break;
      case 'blockquote':
        children.push(
          new Paragraph({
            children: inlineRunsToDocxTextRuns(
              block.runs.map((r) => ({ ...r, italic: true })),
              22
            ),
            indent: { left: 480 },
            spacing: { before: 80, after: 120 },
          })
        );
        break;
      case 'list-item': {
        const lvl = Math.min(4, block.level ?? 0);
        if (block.ordered) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${block.index}. `, bold: true, size: 22 }),
                ...inlineRunsToDocxTextRuns(block.runs, 22),
              ],
              indent: { left: 360 + lvl * 260, hanging: 240 },
              spacing: { after: 80 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              bullet: { level: lvl },
              children: inlineRunsToDocxTextRuns(block.runs, 22),
              spacing: { after: 80 },
            })
          );
        }
        break;
      }
      case 'code':
        for (const line of block.text.split('\n')) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: line || ' ', font: 'Courier New', size: 20 })],
              shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
              indent: { left: 240 },
              spacing: { after: 40 },
            })
          );
        }
        break;
      case 'table': {
        const rows = block.rows.map(
          (rowCells) =>
            new TableRow({
              children: rowCells.map(
                (cell) =>
                  new TableCell({
                    columnSpan: cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined,
                    rowSpan: cell.rowSpan && cell.rowSpan > 1 ? cell.rowSpan : undefined,
                    shading: cell.shadingHex
                      ? { type: ShadingType.CLEAR, fill: cell.shadingHex }
                      : cell.isHeader
                      ? { type: ShadingType.CLEAR, fill: 'F1F5F9' }
                      : undefined,
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        children: inlineRunsToDocxTextRuns(
                          cell.runs.map((r) => ({ ...r, bold: r.bold || cell.isHeader })),
                          20
                        ),
                      }),
                    ],
                  })
              ),
            })
        );
        children.push(
          new Table({
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
          })
        );
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        break;
      }
      case 'image': {
        const decoded = decodeDataUrlBytes(block.dataUrl);
        if (decoded) {
          const natural = getRasterImageSizeFromBytes(decoded.bytes, decoded.type);
          const maxW = 460;
          const scale = natural.width > maxW ? maxW / natural.width : 1;
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: decoded.bytes,
                  type: decoded.type,
                  transformation: {
                    width: Math.max(1, Math.round(natural.width * scale)),
                    height: Math.max(1, Math.round(natural.height * scale)),
                  },
                }),
              ],
              spacing: { before: 120, after: 120 },
            })
          );
        }
        break;
      }
      case 'hr':
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '────────────────────────────────────────', color: '94A3B8' })],
            spacing: { before: 100, after: 100 },
          })
        );
        break;
    }
  }

  if (children.length === 0) {
    throw new Error('The source document contains no extractable text or structure.');
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generates a real .docx Word file from plain text or markdown lines
 */
export async function textToDocxBlob(text: string): Promise<Blob> {
  const html = await marked.parse(text);
  const blocks = parseHtmlToBlocks(html);
  return await htmlBlocksToDocxBlob(blocks);
}

function isWinAnsiSafe(text: string): boolean {
  return /^[\t\n\r\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]*$/.test(
    text
  );
}

function blocksAreWinAnsiSafe(blocks: DocBlock[]): boolean {
  for (const b of blocks) {
    if (b.type === 'code') {
      if (!isWinAnsiSafe(b.text)) return false;
    } else if (b.type === 'table') {
      for (const row of b.rows) {
        for (const cell of row) {
          if (!isWinAnsiSafe(cell.runs.map((r) => r.text).join(''))) return false;
        }
      }
    } else if ('runs' in b) {
      if (!isWinAnsiSafe(b.runs.map((r) => r.text).join(''))) return false;
    }
  }
  return true;
}

function renderRichVectorPdfBlob(
  blocks: DocBlock[],
  pageFormat: 'a4' | 'letter',
  orientation: 'portrait' | 'landscape'
): Blob {
  const doc = new jsPDF({ orientation, unit: 'mm', format: pageFormat, compress: true });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxLineWidth = pageWidth - margin * 2;
  let cursorY = margin + 4;

  const ensureSpace = (neededMm: number) => {
    if (cursorY + neededMm > pageHeight - margin) {
      doc.addPage(pageFormat, orientation);
      cursorY = margin + 4;
    }
  };

  const drawWrappedRuns = (
    runs: InlineRun[],
    startX: number,
    availWidth: number,
    fontSize: number,
    lineHeightMm: number,
    defaultColorRgb: [number, number, number] = [15, 23, 42],
    align: 'left' | 'center' | 'right' = 'left'
  ) => {
    doc.setFontSize(fontSize);

    type WordTok = {
      text: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      code?: boolean;
      colorHex?: string;
      highlightHex?: string;
      newline?: boolean;
      width: number;
    };

    const setStyle = (w: { bold?: boolean; italic?: boolean; code?: boolean }) => {
      const family = w.code ? 'courier' : 'helvetica';
      const style = w.bold && w.italic ? 'bolditalic' : w.bold ? 'bold' : w.italic ? 'italic' : 'normal';
      doc.setFont(family, style);
    };

    const rawTokens: Array<Omit<WordTok, 'width'>> = [];
    for (const run of runs) {
      const segments = run.text.split(/(\n)/);
      for (const seg of segments) {
        if (seg === '\n') {
          rawTokens.push({ text: '', newline: true });
          continue;
        }
        const parts = seg.split(/( +)/);
        for (const p of parts) {
          if (p) {
            rawTokens.push({
              text: p,
              bold: run.bold,
              italic: run.italic,
              underline: run.underline,
              code: run.code,
              colorHex: run.colorHex,
              highlightHex: run.highlightHex,
            });
          }
        }
      }
    }

    const lines: Array<{ tokens: WordTok[]; lineW: number }> = [];
    let curLine: WordTok[] = [];
    let curW = 0;

    for (const tok of rawTokens) {
      if (tok.newline) {
        lines.push({ tokens: curLine, lineW: curW });
        curLine = [];
        curW = 0;
        continue;
      }
      setStyle(tok);
      const tokenW = doc.getTextWidth(tok.text);
      if (curLine.length === 0 && tok.text.trim() === '') continue;

      if (curW + tokenW > availWidth && tok.text.trim() !== '') {
        if (tokenW > availWidth) {
          const subLines = doc.splitTextToSize(tok.text, availWidth) as string[];
          for (let sIdx = 0; sIdx < subLines.length; sIdx++) {
            if (sIdx > 0 || curLine.length > 0) {
              lines.push({ tokens: curLine, lineW: curW });
              curLine = [];
              curW = 0;
            }
            const sw = doc.getTextWidth(subLines[sIdx]);
            curLine.push({ ...tok, text: subLines[sIdx], width: sw });
            curW += sw;
          }
          continue;
        }
        lines.push({ tokens: curLine, lineW: curW });
        curLine = [];
        curW = 0;
      }

      curLine.push({ ...tok, width: tokenW });
      curW += tokenW;
    }
    if (curLine.length > 0 || lines.length === 0) {
      lines.push({ tokens: curLine, lineW: curW });
    }

    for (const line of lines) {
      ensureSpace(lineHeightMm);
      let x = startX;
      if (align === 'center') x = startX + Math.max(0, (availWidth - line.lineW) / 2);
      else if (align === 'right') x = startX + Math.max(0, availWidth - line.lineW);

      for (const word of line.tokens) {
        if (word.highlightHex) {
          const [hr, hg, hb] = hexToRgbTuple(word.highlightHex);
          doc.setFillColor(hr, hg, hb);
          doc.rect(x, cursorY - fontSize * 0.3, word.width, lineHeightMm * 0.85, 'F');
        }
        setStyle(word);
        const [tr, tg, tb] = hexToRgbTuple(word.colorHex, defaultColorRgb);
        doc.setTextColor(tr, tg, tb);
        doc.text(word.text, x, cursorY);
        if (word.underline && word.text.trim()) {
          doc.setDrawColor(tr, tg, tb);
          doc.setLineWidth(0.25);
          doc.line(x, cursorY + 0.7, x + word.width, cursorY + 0.7);
        }
        x += word.width;
      }
      cursorY += lineHeightMm;
    }
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const sizeMap: Record<number, number> = { 1: 18, 2: 15, 3: 13, 4: 11.5, 5: 10.5, 6: 10 };
        const sz = sizeMap[block.level] || 12;
        const lh = sz * 0.48;
        cursorY += block.level <= 2 ? 3 : 2;
        ensureSpace(lh + 2);
        drawWrappedRuns(
          block.runs.map((r) => ({ ...r, bold: true })),
          margin,
          maxLineWidth,
          sz,
          lh,
          [15, 23, 42],
          block.align || 'left'
        );
        cursorY += 1.5;
        break;
      }
      case 'paragraph':
        drawWrappedRuns(block.runs, margin, maxLineWidth, 10.5, 5.4, [15, 23, 42], block.align || 'left');
        cursorY += 2.2;
        break;
      case 'blockquote': {
        const startY = cursorY - 3;
        drawWrappedRuns(
          block.runs.map((r) => ({ ...r, italic: true })),
          margin + 5,
          maxLineWidth - 5,
          10.5,
          5.4,
          [71, 85, 105]
        );
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.8);
        doc.line(margin + 1.5, Math.max(margin, startY), margin + 1.5, cursorY - 3);
        cursorY += 2;
        break;
      }
      case 'list-item': {
        const lvl = Math.min(4, block.level ?? 0);
        const listIndent = lvl * 6;
        const prefix = block.ordered ? `${block.index}. ` : '• ';
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        ensureSpace(5.4);
        doc.text(prefix, margin + 2 + listIndent, cursorY);
        drawWrappedRuns(block.runs, margin + 8 + listIndent, maxLineWidth - 8 - listIndent, 10.5, 5.4);
        cursorY += 1.2;
        break;
      }
      case 'code': {
        doc.setFont('courier', 'normal');
        doc.setFontSize(9.2);
        const codeLines = block.text.split('\n').flatMap((l) => doc.splitTextToSize(l || ' ', maxLineWidth - 6) as string[]);
        for (const cl of codeLines) {
          ensureSpace(5.2);
          doc.setFillColor(241, 245, 249);
          doc.rect(margin, cursorY - 3.6, maxLineWidth, 4.8, 'F');
          doc.setTextColor(15, 23, 42);
          doc.text(cl, margin + 3, cursorY);
          cursorY += 4.8;
        }
        cursorY += 2.5;
        break;
      }
      case 'table': {
        const colCount = Math.max(
          ...block.rows.map((r) => r.reduce((sum, cell) => sum + (cell.colSpan || 1), 0))
        );
        const colW = maxLineWidth / Math.max(1, colCount);
        const cellPadX = 2.2;
        const cellLineH = 4.6;
        const occupied = new Set<string>();

        const expandedRows: Array<{
          cells: Array<{ cStart: number; colSpan: number; rowSpan: number; node?: TableCellNode }>;
          rowH: number;
          wrapped: string[][];
        }> = [];

        block.rows.forEach((row, rIdx) => {
          doc.setFontSize(9.5);
          const placed: Array<{ cStart: number; colSpan: number; rowSpan: number; node?: TableCellNode }> = [];
          const wrapped: string[][] = [];
          let cCursor = 0;

          for (const cell of row) {
            while (occupied.has(`${rIdx},${cCursor}`) && cCursor < colCount) cCursor++;
            const cs = Math.max(1, cell.colSpan || 1);
            const rs = Math.max(1, cell.rowSpan || 1);
            for (let rr = rIdx; rr < rIdx + rs; rr++) {
              for (let cc = cCursor; cc < cCursor + cs; cc++) {
                if (rr !== rIdx || cc !== cCursor) occupied.add(`${rr},${cc}`);
              }
            }
            const spanW = cs * colW;
            const txt = cell.runs.map((r) => r.text).join('').trim();
            doc.setFont('helvetica', cell.isHeader ? 'bold' : 'normal');
            const lines = (doc.splitTextToSize(txt || ' ', spanW - cellPadX * 2) as string[]) || [''];
            placed.push({ cStart: cCursor, colSpan: cs, rowSpan: rs, node: cell });
            wrapped.push(lines);
            cCursor += cs;
          }

          const maxLines = Math.max(
            1,
            ...placed.map((p, idx) => (p.rowSpan > 1 ? 1 : wrapped[idx].length))
          );
          const rowH = maxLines * cellLineH + 3.5;
          expandedRows.push({ cells: placed, rowH, wrapped });
        });

        expandedRows.forEach((er, rIdx) => {
          ensureSpace(er.rowH);
          er.cells.forEach((p, idx) => {
            const cellX = margin + p.cStart * colW;
            const spanW = p.colSpan * colW;
            let spanH = er.rowH;
            for (let rr = rIdx + 1; rr < Math.min(expandedRows.length, rIdx + p.rowSpan); rr++) {
              spanH += expandedRows[rr].rowH;
            }
            const fillHex = p.node?.shadingHex || (p.node?.isHeader ? 'F1F5F9' : undefined);
            doc.setDrawColor(203, 213, 225);
            if (fillHex) {
              const [fr, fg, fb] = hexToRgbTuple(fillHex);
              doc.setFillColor(fr, fg, fb);
              doc.rect(cellX, cursorY - 3.5, spanW, spanH, 'FD');
            } else {
              doc.rect(cellX, cursorY - 3.5, spanW, spanH, 'S');
            }
            doc.setFont('helvetica', p.node?.isHeader ? 'bold' : 'normal');
            doc.setTextColor(15, 23, 42);
            er.wrapped[idx].forEach((line, lIdx) => {
              doc.text(line, cellX + cellPadX, cursorY + lIdx * cellLineH + 0.6);
            });
          });
          cursorY += er.rowH;
        });
        cursorY += 3;
        break;
      }
      case 'image': {
        const decoded = decodeDataUrlBytes(block.dataUrl);
        if (decoded && decoded.type !== 'gif') {
          const natural = getRasterImageSizeFromBytes(decoded.bytes, decoded.type);
          const ratio = Math.min(maxLineWidth / natural.width, 140 / natural.height);
          const wMm = Math.max(10, natural.width * ratio);
          const hMm = Math.max(10, natural.height * ratio);
          ensureSpace(hMm + 4);
          doc.addImage(
            block.dataUrl,
            decoded.type === 'jpg' ? 'JPEG' : 'PNG',
            margin,
            cursorY - 2,
            wMm,
            hMm,
            undefined,
            'FAST'
          );
          cursorY += hMm + 4;
        }
        break;
      }
      case 'hr':
        ensureSpace(4);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 4;
        break;
    }
  }

  return doc.output('blob');
}

/**
 * Full Unicode Canvas-to-PDF renderer preserving Hindi/CJK/Arabic/₹/emojis and rich formatting.
 */
async function renderUnicodeCanvasPdfBlob(
  blocks: DocBlock[],
  pageFormat: 'a4' | 'letter',
  orientation: 'portrait' | 'landscape'
): Promise<Blob> {
  const mmW = pageFormat === 'letter' ? 215.9 : 210;
  const mmH = pageFormat === 'letter' ? 279.4 : 297;
  const pageMmW = orientation === 'landscape' ? mmH : mmW;
  const pageMmH = orientation === 'landscape' ? mmW : mmH;

  // Render at 150 DPI equivalent (~5.9 px/mm)
  const pxPerMm = 6;
  const canvasW = Math.round(pageMmW * pxPerMm);
  const canvasH = Math.round(pageMmH * pxPerMm);
  const marginPx = Math.round(16 * pxPerMm);
  const contentW = canvasW - marginPx * 2;

  const pages: string[] = [];

  const createPageCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);
    return { canvas, ctx };
  };

  let current = createPageCanvas();
  let cursorY = marginPx + 24;

  const commitPage = () => {
    pages.push(current.canvas.toDataURL('image/jpeg', 0.92));
    current.canvas.width = 0;
    current.canvas.height = 0;
    current = createPageCanvas();
    cursorY = marginPx + 24;
  };

  const ensureSpacePx = (neededPx: number) => {
    if (cursorY + neededPx > canvasH - marginPx) {
      commitPage();
    }
  };

  const buildFont = (sizePx: number, style: { bold?: boolean; italic?: boolean; code?: boolean }) => {
    const family = style.code
      ? 'ui-monospace, "Courier New", monospace'
      : 'system-ui, -apple-system, "Segoe UI", "Noto Sans", sans-serif';
    return `${style.italic ? 'italic ' : ''}${style.bold ? 'bold ' : ''}${sizePx}px ${family}`;
  };

  const drawRunsPx = (
    runs: InlineRun[],
    startX: number,
    availW: number,
    fontSizePx: number,
    lineHeightPx: number,
    defaultColor = '#0F172A',
    align: 'left' | 'center' | 'right' = 'left'
  ) => {
    type TokPx = {
      text: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      code?: boolean;
      colorHex?: string;
      highlightHex?: string;
      newline?: boolean;
      width: number;
    };

    const rawTokens: Array<Omit<TokPx, 'width'>> = [];
    for (const run of runs) {
      for (const seg of run.text.split(/(\n)/)) {
        if (seg === '\n') {
          rawTokens.push({ text: '', newline: true });
          continue;
        }
        for (const p of seg.split(/( +)/)) {
          if (p) {
            rawTokens.push({
              text: p,
              bold: run.bold,
              italic: run.italic,
              underline: run.underline,
              code: run.code,
              colorHex: run.colorHex,
              highlightHex: run.highlightHex,
            });
          }
        }
      }
    }

    const lines: Array<{ tokens: TokPx[]; lineW: number }> = [];
    let curLine: TokPx[] = [];
    let curW = 0;

    for (const w of rawTokens) {
      if (w.newline) {
        lines.push({ tokens: curLine, lineW: curW });
        curLine = [];
        curW = 0;
        continue;
      }
      if (curLine.length === 0 && w.text.trim() === '') continue;
      current.ctx.font = buildFont(fontSizePx, w);
      const tokenW = current.ctx.measureText(w.text).width;
      if (curW + tokenW > availW && w.text.trim() !== '') {
        lines.push({ tokens: curLine, lineW: curW });
        curLine = [];
        curW = 0;
      }
      curLine.push({ ...w, width: tokenW });
      curW += tokenW;
    }
    if (curLine.length > 0 || lines.length === 0) lines.push({ tokens: curLine, lineW: curW });

    for (const line of lines) {
      ensureSpacePx(lineHeightPx);
      let x = startX;
      if (align === 'center') x = startX + Math.max(0, (availW - line.lineW) / 2);
      else if (align === 'right') x = startX + Math.max(0, availW - line.lineW);

      for (const w of line.tokens) {
        if (w.highlightHex) {
          current.ctx.fillStyle = `#${w.highlightHex}`;
          current.ctx.fillRect(x, cursorY - fontSizePx * 0.88, w.width, fontSizePx * 1.15);
        }
        current.ctx.font = buildFont(fontSizePx, w);
        const col = w.colorHex ? `#${w.colorHex}` : defaultColor;
        current.ctx.fillStyle = col;
        current.ctx.fillText(w.text, x, cursorY);
        if (w.underline && w.text.trim()) {
          current.ctx.strokeStyle = col;
          current.ctx.lineWidth = Math.max(1.5, fontSizePx * 0.06);
          current.ctx.beginPath();
          current.ctx.moveTo(x, cursorY + 3);
          current.ctx.lineTo(x + w.width, cursorY + 3);
          current.ctx.stroke();
        }
        x += w.width;
      }
      cursorY += lineHeightPx;
    }
  };

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const sizePxMap: Record<number, number> = { 1: 42, 2: 34, 3: 29, 4: 25, 5: 23, 6: 22 };
        const sz = sizePxMap[block.level] || 28;
        cursorY += 12;
        drawRunsPx(
          block.runs.map((r) => ({ ...r, bold: true })),
          marginPx,
          contentW,
          sz,
          Math.round(sz * 1.35),
          '#0F172A',
          block.align || 'left'
        );
        cursorY += 8;
        break;
      }
      case 'paragraph':
        drawRunsPx(block.runs, marginPx, contentW, 23, 33, '#0F172A', block.align || 'left');
        cursorY += 12;
        break;
      case 'blockquote': {
        const startY = cursorY - 22;
        drawRunsPx(
          block.runs.map((r) => ({ ...r, italic: true })),
          marginPx + 24,
          contentW - 24,
          23,
          33,
          '#475569'
        );
        current.ctx.fillStyle = '#2563EB';
        current.ctx.fillRect(marginPx + 8, Math.max(marginPx, startY), 4, Math.max(12, cursorY - startY - 12));
        cursorY += 10;
        break;
      }
      case 'list-item': {
        const prefix = block.ordered ? `${block.index}. ` : '• ';
        ensureSpacePx(33);
        current.ctx.font = buildFont(23, { bold: true });
        current.ctx.fillStyle = '#0F172A';
        current.ctx.fillText(prefix, marginPx + 8, cursorY);
        drawRunsPx(block.runs, marginPx + 40, contentW - 40, 23, 33);
        cursorY += 6;
        break;
      }
      case 'code': {
        const lines = block.text.split('\n');
        current.ctx.font = buildFont(20, { code: true });
        for (const line of lines) {
          ensureSpacePx(28);
          current.ctx.fillStyle = '#F1F5F9';
          current.ctx.fillRect(marginPx, cursorY - 20, contentW, 28);
          current.ctx.fillStyle = '#0F172A';
          current.ctx.fillText(line, marginPx + 14, cursorY);
          cursorY += 28;
        }
        cursorY += 12;
        break;
      }
      case 'table': {
        const colCount = Math.max(...block.rows.map((r) => r.length));
        const colW = contentW / Math.max(1, colCount);
        for (const row of block.rows) {
          const rowH = 44;
          ensureSpacePx(rowH);
          const isHeader = row.some((c) => c.isHeader);
          for (let c = 0; c < colCount; c++) {
            const x = marginPx + c * colW;
            if (isHeader) {
              current.ctx.fillStyle = '#F1F5F9';
              current.ctx.fillRect(x, cursorY - 28, colW, rowH);
            }
            current.ctx.strokeStyle = '#CBD5E1';
            current.ctx.lineWidth = 1.5;
            current.ctx.strokeRect(x, cursorY - 28, colW, rowH);
            const cellTxt = row[c] ? row[c].runs.map((r) => r.text).join('').trim() : '';
            current.ctx.font = buildFont(20, { bold: row[c]?.isHeader });
            current.ctx.fillStyle = '#0F172A';
            current.ctx.fillText(cellTxt.slice(0, 60), x + 10, cursorY);
          }
          cursorY += rowH;
        }
        cursorY += 14;
        break;
      }
      case 'image': {
        const img = await new Promise<HTMLImageElement | null>((resolve) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => resolve(null);
          el.src = block.dataUrl;
        });
        if (img && img.naturalWidth > 0) {
          const ratio = Math.min(contentW / img.naturalWidth, 720 / img.naturalHeight);
          const w = Math.max(20, Math.round(img.naturalWidth * ratio));
          const h = Math.max(20, Math.round(img.naturalHeight * ratio));
          ensureSpacePx(h + 20);
          current.ctx.drawImage(img, marginPx, cursorY - 12, w, h);
          cursorY += h + 20;
        }
        break;
      }
      case 'hr':
        ensureSpacePx(20);
        current.ctx.strokeStyle = '#CBD5E1';
        current.ctx.lineWidth = 2;
        current.ctx.beginPath();
        current.ctx.moveTo(marginPx, cursorY);
        current.ctx.lineTo(canvasW - marginPx, cursorY);
        current.ctx.stroke();
        cursorY += 20;
        break;
    }
  }

  pages.push(current.canvas.toDataURL('image/jpeg', 0.92));
  current.canvas.width = 0;
  current.canvas.height = 0;

  const doc = new jsPDF({ orientation, unit: 'mm', format: pageFormat, compress: true });
  pages.forEach((dataUrl, idx) => {
    if (idx > 0) doc.addPage(pageFormat, orientation);
    doc.addImage(dataUrl, 'JPEG', 0, 0, pageMmW, pageMmH, undefined, 'FAST');
  });

  return doc.output('blob');
}

/**
 * Renders structured document blocks into PDF, automatically choosing vector PDF for WinAnsi
 * or high-DPI Unicode Canvas PDF for CJK/Indic/Arabic/emoji/symbol documents.
 */
export async function renderDocumentBlocksToPdfBlob(
  blocks: DocBlock[],
  options: ConversionOptions = {}
): Promise<Blob> {
  if (blocks.length === 0) {
    throw new Error('The source document contains no renderable content to export as PDF.');
  }

  const pageFormat = options.pageSize === 'letter' ? 'letter' : 'a4';
  const orientation = options.pageOrientation === 'landscape' ? 'landscape' : 'portrait';

  if (blocksAreWinAnsiSafe(blocks) || typeof document === 'undefined') {
    return renderRichVectorPdfBlob(blocks, pageFormat, orientation);
  }

  return await renderUnicodeCanvasPdfBlob(blocks, pageFormat, orientation);
}

/**
 * Renders plain text lines into a clean multi-page PDF using the rich hybrid renderer.
 */
export function renderPlainTextToPdfBlob(text: string, title?: string): Blob {
  const blocks: DocBlock[] = [];
  if (title) {
    blocks.push({ type: 'heading', level: 1, runs: [{ text: title, bold: true }] });
  }
  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n/);
  for (const p of paragraphs) {
    if (p.trim()) {
      blocks.push({ type: 'paragraph', runs: [{ text: p }] });
    }
  }
  return renderRichVectorPdfBlob(blocks, 'a4', 'portrait');
}

export function stripHtmlToText(html: string): string {
  const blocks = parseHtmlToBlocks(html);
  const structuredText = blocksToPlainText(blocks);
  if (structuredText.trim()) return structuredText;

  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  ).trim();
}

/**
 * Unified local document converter supporting DOCX, TXT, MD, HTML, CSV, JSON -> PDF, DOCX, HTML, TXT, MD, JSON, CSV
 */
export async function convertDocumentFile(
  file: File,
  sourceExt: string,
  targetFormat: string,
  onProgress?: (progress: number, message: string) => void,
  options: ConversionOptions = {}
): Promise<Blob> {
  const src = sourceExt.toLowerCase();
  const tgt = targetFormat.toLowerCase();

  onProgress?.(15, `Reading ${src.toUpperCase()} document...`);

  // Direct CSV <-> JSON structured data transforms
  if (src === 'csv' && tgt === 'json') {
    const text = await file.text();
    onProgress?.(60, 'Parsing CSV columns to JSON...');
    const jsonStr = csvToJsonString(text);
    onProgress?.(100, 'Complete');
    return new Blob([jsonStr], { type: 'application/json' });
  }

  if (src === 'json' && tgt === 'csv') {
    const text = await file.text();
    onProgress?.(60, 'Flattening JSON records to CSV...');
    const csvStr = jsonToCsvString(text);
    onProgress?.(100, 'Complete');
    return new Blob([csvStr], { type: 'text/csv;charset=utf-8' });
  }

  // Extract structured blocks, HTML, and plain text from source document
  let rawText = '';
  let htmlContent = '';
  let blocks: DocBlock[] = [];

  if (src === 'docx') {
    if (tgt === 'pdf') {
      const { convertDocxToPdfHighFidelity } = await import('./docxToPdf');
      const pdfBlob = await convertDocxToPdfHighFidelity(file, options, onProgress);
      onProgress?.(100, 'Complete');
      return pdfBlob;
    }
    onProgress?.(35, 'Extracting Word document contents...');
    const extracted = await extractDocxContent(file);
    htmlContent = extracted.html;
    blocks = parseHtmlToBlocks(htmlContent);
    rawText = extracted.text || blocksToPlainText(blocks);
    if (!rawText.trim() && blocks.length === 0) {
      throw new Error('The uploaded Word (.docx) document appears to be empty.');
    }
  } else {
    const text = (await file.text()).replace(/^\uFEFF/, '');
    if (!text.trim()) {
      throw new Error(`The uploaded .${src} file is empty.`);
    }

    if (src === 'md') {
      rawText = text;
      htmlContent = await marked.parse(rawText);
      blocks = parseHtmlToBlocks(htmlContent);
    } else if (src === 'html' || src === 'htm') {
      htmlContent = text;
      blocks = parseHtmlToBlocks(htmlContent);
      rawText = stripHtmlToText(htmlContent);
    } else if (src === 'csv') {
      // Build structured HTML table & blocks from CSV so CSV -> PDF / DOCX / HTML preserves tabular layout
      const jsonRecords = JSON.parse(csvToJsonString(text)) as Array<Record<string, unknown>>;
      const headers = jsonRecords.length > 0 ? Object.keys(jsonRecords[0]) : [];
      if (headers.length > 0) {
        const tableRows: TableCellNode[][] = [
          headers.map((h) => ({ isHeader: true, runs: [{ text: h, bold: true }] })),
          ...jsonRecords.map((rec) =>
            headers.map((h) => ({ isHeader: false, runs: [{ text: String(rec[h] ?? '') }] }))
          ),
        ];
        blocks = [{ type: 'table', rows: tableRows }];
        htmlContent = `<table><thead><tr>${headers
          .map((h) => `<th>${escapeHtml(h)}</th>`)
          .join('')}</tr></thead><tbody>${jsonRecords
          .map(
            (rec) =>
              `<tr>${headers.map((h) => `<td>${escapeHtml(String(rec[h] ?? ''))}</td>`).join('')}</tr>`
          )
          .join('')}</tbody></table>`;
        rawText = blocksToPlainText(blocks);
      } else {
        rawText = text;
        blocks = [{ type: 'paragraph', runs: [{ text }] }];
        htmlContent = `<pre>${escapeHtml(text)}</pre>`;
      }
    } else if (src === 'json') {
      const prettyJson = JSON.stringify(JSON.parse(text), null, 2);
      rawText = prettyJson;
      blocks = [{ type: 'code', text: prettyJson }];
      htmlContent = `<pre><code>${escapeHtml(prettyJson)}</code></pre>`;
    } else {
      rawText = text;
      const lines = text.replace(/\r\n/g, '\n').split('\n');
      blocks = lines
        .filter((l) => l.trim().length > 0)
        .map((line) => ({ type: 'paragraph' as const, runs: [{ text: line }] }));
      htmlContent = lines
        .map((l) => `<p>${escapeHtml(l) || '&nbsp;'}</p>`)
        .join('\n');
    }
  }

  onProgress?.(70, `Generating ${tgt.toUpperCase()} output...`);

  if (tgt === 'pdf') {
    const blob = await renderDocumentBlocksToPdfBlob(blocks, options);
    onProgress?.(100, 'Complete');
    return blob;
  }

  if (tgt === 'docx') {
    const blob = await htmlBlocksToDocxBlob(blocks);
    onProgress?.(100, 'Complete');
    return blob;
  }

  if (tgt === 'html') {
    const safeTitle = escapeHtml(file.name.replace(/\.[^/.]+$/, '') || 'Document');
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${safeTitle}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:820px;margin:2rem auto;padding:0 1.25rem;line-height:1.65;color:#0F172A}
h1,h2,h3{line-height:1.25;margin-top:1.5rem}
table{border-collapse:collapse;width:100%;margin:1rem 0}
th,td{border:1px solid #CBD5E1;padding:0.5rem 0.75rem;text-align:left}
th{background:#F1F5F9;font-weight:700}
pre{background:#F1F5F9;padding:1rem;border-radius:8px;overflow-x:auto}
blockquote{border-left:4px solid #2563EB;padding-left:1rem;color:#475569;margin:1rem 0}
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    onProgress?.(100, 'Complete');
    return new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  }

  if (tgt === 'md') {
    const mdOut = src === 'md' ? rawText : blocksToMarkdown(blocks) || rawText;
    onProgress?.(100, 'Complete');
    return new Blob([mdOut], { type: 'text/markdown;charset=utf-8' });
  }

  if (tgt === 'csv') {
    const csvOut = blocksToCsv(blocks, rawText);
    onProgress?.(100, 'Complete');
    return new Blob([csvOut], { type: 'text/csv;charset=utf-8' });
  }

  if (tgt === 'json') {
    const lines = rawText.split(/\r?\n/);
    const jsonBlob = new Blob([JSON.stringify({ filename: file.name, lines }, null, 2)], {
      type: 'application/json',
    });
    onProgress?.(100, 'Complete');
    return jsonBlob;
  }

  // Default: plain text
  onProgress?.(100, 'Complete');
  return new Blob([rawText], { type: 'text/plain;charset=utf-8' });
}
