/**
 * Pure TypeScript BMP (Bitmap) file format encoder.
 * Encodes Canvas ImageData into standard 24-bit uncompressed Windows BMP file (with 54-byte header).
 */

export function encodeImageDataToBmp(imageData: ImageData): Blob {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // BMP rows must be padded to a multiple of 4 bytes
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // --- BITMAPFILEHEADER (14 bytes) ---
  // 'BM' identifier
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  // File size
  view.setUint32(2, fileSize, true);
  // Reserved 1 & 2
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  // Offset to pixel data
  view.setUint32(10, 54, true);

  // --- BITMAPINFOHEADER (40 bytes) ---
  // Header size
  view.setUint32(14, 40, true);
  // Image width
  view.setInt32(18, width, true);
  // Image height (positive for bottom-up)
  view.setInt32(22, height, true);
  // Planes
  view.setUint16(26, 1, true);
  // Bits per pixel (24-bit RGB)
  view.setUint16(28, 24, true);
  // Compression (0 = BI_RGB, uncompressed)
  view.setUint32(30, 0, true);
  // Image size
  view.setUint32(34, pixelArraySize, true);
  // X pixels per meter (~72 DPI)
  view.setInt32(38, 2835, true);
  // Y pixels per meter (~72 DPI)
  view.setInt32(42, 2835, true);
  // Colors in palette
  view.setUint32(46, 0, true);
  // Important colors
  view.setUint32(50, 0, true);

  // --- PIXEL DATA (Bottom-up, BGR format) ---
  let offset = 54;
  const padding = rowSize - width * 3;

  for (let y = height - 1; y >= 0; y--) {
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowStart + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3] / 255;

      // Blend over white background for transparent pixels
      const finalR = Math.round(r * a + 255 * (1 - a));
      const finalG = Math.round(g * a + 255 * (1 - a));
      const finalB = Math.round(b * a + 255 * (1 - a));

      // BMP stores in BGR order
      view.setUint8(offset++, finalB);
      view.setUint8(offset++, finalG);
      view.setUint8(offset++, finalR);
    }

    // Write padding bytes
    for (let p = 0; p < padding; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}
