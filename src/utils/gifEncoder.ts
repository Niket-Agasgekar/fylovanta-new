/**
 * Pure TypeScript GIF89a static and animated GIF encoder with LZW compression and color table quantization.
 * Produces valid, standard GIF89a files that open in any image viewer, browser, or platform.
 */

export interface GifFrame {
  imageData: ImageData;
  delayMs?: number; // Delay in milliseconds (e.g. 100ms for 10fps)
}

export function encodeFramesToGif(frames: GifFrame[], width: number, height: number): Blob {
  if (frames.length === 0) {
    throw new Error('Cannot create GIF without frames.');
  }

  const out: number[] = [];

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      out.push(str.charCodeAt(i));
    }
  }

  function writeShort(val: number) {
    out.push(val & 0xff);
    out.push((val >> 8) & 0xff);
  }

  // 1. Header
  writeString('GIF89a');

  // 2. Logical Screen Descriptor
  writeShort(width);
  writeShort(height);
  // Packed field: Global Color Table Flag = 0 (we use Local Color Tables per frame for highest color fidelity)
  // Color resolution = 7 (8 bits/pixel), Sort flag = 0, Size of global color table = 0
  out.push(0x70);
  out.push(0); // Background color index
  out.push(0); // Pixel aspect ratio

  // 3. Application Extension for looping (Netscape 2.0)
  if (frames.length > 1) {
    out.push(0x21); // Extension Introducer
    out.push(0xff); // Application Extension Label
    out.push(11); // Block Size
    writeString('NETSCAPE2.0');
    out.push(3); // Sub-block size
    out.push(1); // Sub-block ID
    writeShort(0); // Loop count (0 = infinite)
    out.push(0); // Block Terminator
  }

  // 4. Encode each frame
  for (const frame of frames) {
    const { palette, indexedPixels } = quantizeFrame(frame.imageData);
    const delayCentiseconds = Math.max(2, Math.round((frame.delayMs || 100) / 10));

    // Graphics Control Extension
    out.push(0x21); // Extension Introducer
    out.push(0xf9); // Graphic Control Label
    out.push(4); // Block Size
    out.push(0x04); // Packed: Disposal Method = 1 (Do not dispose), Transparent Color Flag = 0
    writeShort(delayCentiseconds);
    out.push(0); // Transparent color index
    out.push(0); // Block Terminator

    // Image Descriptor
    out.push(0x2c); // Image Separator
    writeShort(0); // Left
    writeShort(0); // Top
    writeShort(width);
    writeShort(height);
    // Packed: Local Color Table Flag = 1, Interlace = 0, Sort = 0, Size = 7 (2^(7+1) = 256 colors)
    out.push(0x87);

    // Local Color Table (256 RGB entries = 768 bytes)
    for (let i = 0; i < 256; i++) {
      const color = palette[i] || [0, 0, 0];
      out.push(color[0], color[1], color[2]);
    }

    // LZW Image Data
    const minCodeSize = 8;
    out.push(minCodeSize);
    const lzwBytes = lzwCompress(minCodeSize, indexedPixels);

    // Write sub-blocks of max 255 bytes
    let offset = 0;
    while (offset < lzwBytes.length) {
      const blockSize = Math.min(255, lzwBytes.length - offset);
      out.push(blockSize);
      for (let i = 0; i < blockSize; i++) {
        out.push(lzwBytes[offset + i]);
      }
      offset += blockSize;
    }
    out.push(0); // Block Terminator
  }

  // 5. Trailer
  out.push(0x3b);

  const uint8 = new Uint8Array(out);
  return new Blob([uint8], { type: 'image/gif' });
}

/**
 * Quantizes an ImageData into a 256-color palette and indexed pixel array.
 */
function quantizeFrame(imageData: ImageData): { palette: [number, number, number][]; indexedPixels: number[] } {
  const data = imageData.data;
  const numPixels = imageData.width * imageData.height;
  const indexedPixels = new Array<number>(numPixels);

  // Fast popular color clustering / uniform quantization
  const colorMap = new Map<number, number>();
  const palette: [number, number, number][] = [];

  for (let i = 0; i < numPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3] / 255;

    // Blend over white if transparent
    const finalR = Math.round(r * a + 255 * (1 - a));
    const finalG = Math.round(g * a + 255 * (1 - a));
    const finalB = Math.round(b * a + 255 * (1 - a));

    // Reduce to 5-bit color space (32 levels per channel = 32768 colors) for grouping
    const key = ((finalR >> 3) << 10) | ((finalG >> 3) << 5) | (finalB >> 3);

    let index = colorMap.get(key);
    if (index === undefined) {
      if (palette.length < 256) {
        index = palette.length;
        palette.push([finalR, finalG, finalB]);
        colorMap.set(key, index);
      } else {
        // Find closest color in palette
        index = findClosestColor(finalR, finalG, finalB, palette);
        colorMap.set(key, index);
      }
    }
    indexedPixels[i] = index;
  }

  // Pad palette to 256 entries
  while (palette.length < 256) {
    palette.push([0, 0, 0]);
  }

  return { palette, indexedPixels };
}

function findClosestColor(r: number, g: number, b: number, palette: [number, number, number][]): number {
  let minDiff = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const diff = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = i;
      if (diff === 0) break;
    }
  }
  return bestIdx;
}

/**
 * GIF standard LZW encoder.
 */
function lzwCompress(minCodeSize: number, indexedPixels: number[]): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxDictSize = 4096;

  // LZW dictionary: map string/prefix to code
  let dict = new Map<string, number>();

  const resetDict = () => {
    dict.clear();
    for (let i = 0; i < clearCode; i++) {
      dict.set(String(i), i);
    }
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  };

  resetDict();

  // Bit packing stream
  const outBytes: number[] = [];
  let curAccum = 0;
  let curBits = 0;

  function writeBits(code: number, nBits: number) {
    curAccum |= code << curBits;
    curBits += nBits;
    while (curBits >= 8) {
      outBytes.push(curAccum & 0xff);
      curAccum >>= 8;
      curBits -= 8;
    }
  }

  // Initial Clear code
  writeBits(clearCode, codeSize);

  if (indexedPixels.length > 0) {
    let currentPrefix = String(indexedPixels[0]);

    for (let i = 1; i < indexedPixels.length; i++) {
      const nextVal = indexedPixels[i];
      const combined = currentPrefix + ',' + nextVal;

      if (dict.has(combined)) {
        currentPrefix = combined;
      } else {
        writeBits(dict.get(currentPrefix)!, codeSize);

        if (nextCode < maxDictSize) {
          dict.set(combined, nextCode++);
          if (nextCode > (1 << codeSize) && codeSize < 12) {
            codeSize++;
          }
        } else {
          // Dictionary full, send clear code
          writeBits(clearCode, codeSize);
          resetDict();
        }

        currentPrefix = String(nextVal);
      }
    }

    writeBits(dict.get(currentPrefix)!, codeSize);
  }

  // End of Information code
  writeBits(eoiCode, codeSize);

  // Flush remaining bits
  if (curBits > 0) {
    outBytes.push(curAccum & 0xff);
  }

  return outBytes;
}
