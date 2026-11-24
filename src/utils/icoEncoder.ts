/**
 * Pure TypeScript ICO (Windows Icon) file format encoder.
 * Encapsulates PNG image bytes into a standard Microsoft Windows ICO container (ICONDIR + ICONDIRENTRY).
 */

export async function encodeCanvasToIco(canvas: HTMLCanvasElement): Promise<Blob> {
  // 1. Export canvas as PNG blob first
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to encode PNG for ICO payload.'));
    }, 'image/png');
  });

  const pngBuffer = await pngBlob.arrayBuffer();
  const pngBytes = new Uint8Array(pngBuffer);
  const pngSize = pngBytes.length;

  const width = Math.min(256, canvas.width);
  const height = Math.min(256, canvas.height);

  // Total ICO file size: Header (6 bytes) + 1 Directory Entry (16 bytes) + PNG payload
  const icoSize = 6 + 16 + pngSize;
  const icoBuffer = new ArrayBuffer(icoSize);
  const view = new DataView(icoBuffer);
  const uint8View = new Uint8Array(icoBuffer);

  // --- ICONDIR (6 bytes) ---
  view.setUint16(0, 0, true); // Reserved, must be 0
  view.setUint16(2, 1, true); // Resource type: 1 for Icon (.ICO)
  view.setUint16(4, 1, true); // Number of images: 1

  // --- ICONDIRENTRY (16 bytes) ---
  view.setUint8(6, width >= 256 ? 0 : width); // Width in pixels (0 means 256)
  view.setUint8(7, height >= 256 ? 0 : height); // Height in pixels (0 means 256)
  view.setUint8(8, 0); // Number of colors in palette (0 for truecolor)
  view.setUint8(9, 0); // Reserved, must be 0
  view.setUint16(10, 1, true); // Color planes (1)
  view.setUint16(12, 32, true); // Bits per pixel (32-bit RGBA)
  view.setUint32(14, pngSize, true); // Size of the image's data in bytes
  view.setUint32(18, 22, true); // Offset of image data from beginning of file (6 + 16 = 22)

  // --- IMAGE DATA (PNG Payload starting at byte offset 22) ---
  uint8View.set(pngBytes, 22);

  return new Blob([icoBuffer], { type: 'image/x-icon' });
}
