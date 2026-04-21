'use client';

import { MAX_UPLOAD_IMAGE_BYTES, estimateDataUrlDecodedBytes } from '~/lib/clientImageUploadLimits';

export type CompressedImageFields = {
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
};

/**
 * Canvas exports as PNG are often far larger than the original JPEG on disk.
 * Encode as JPEG and optionally downscale until the data URL is under the API byte limit.
 */
export async function compressImageDataUrlForApiUpload(
  dataUrl: string,
  widthHint: number,
  heightHint: number,
  maxBytes = MAX_UPLOAD_IMAGE_BYTES
): Promise<CompressedImageFields> {
  if (typeof window === 'undefined') {
    return { imageDataUrl: dataUrl, imageWidth: widthHint, imageHeight: heightHint };
  }
  if (!/^data:image\//i.test(dataUrl)) {
    return { imageDataUrl: dataUrl, imageWidth: widthHint, imageHeight: heightHint };
  }
  if (estimateDataUrlDecodedBytes(dataUrl) <= maxBytes) {
    return { imageDataUrl: dataUrl, imageWidth: widthHint, imageHeight: heightHint };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || widthHint;
      const h = img.naturalHeight || heightHint;
      if (!w || !h) {
        reject(new Error('Invalid image dimensions'));
        return;
      }

      const encodeJpeg = (canvas: HTMLCanvasElement, q: number) => canvas.toDataURL('image/jpeg', q);

      let canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      const qualities = [0.92, 0.88, 0.82, 0.75, 0.68, 0.62, 0.55, 0.48, 0.42, 0.36, 0.3];
      for (const q of qualities) {
        const out = encodeJpeg(canvas, q);
        if (estimateDataUrlDecodedBytes(out) <= maxBytes) {
          resolve({ imageDataUrl: out, imageWidth: w, imageHeight: h });
          return;
        }
      }

      let scale = 0.9;
      while (scale >= 0.28) {
        const nw = Math.max(1, Math.round(w * scale));
        const nh = Math.max(1, Math.round(h * scale));
        const c2 = document.createElement('canvas');
        c2.width = nw;
        c2.height = nh;
        const c2ctx = c2.getContext('2d');
        if (!c2ctx) break;
        c2ctx.drawImage(img, 0, 0, nw, nh);
        for (const q of [0.85, 0.75, 0.65, 0.55, 0.45, 0.35]) {
          const out = encodeJpeg(c2, q);
          if (estimateDataUrlDecodedBytes(out) <= maxBytes) {
            resolve({ imageDataUrl: out, imageWidth: nw, imageHeight: nh });
            return;
          }
        }
        scale -= 0.06;
      }

      reject(new Error('Unable to compress image under upload limit'));
    };
    img.onerror = () => reject(new Error('Failed to decode image for compression'));
    img.src = dataUrl;
  });
}
