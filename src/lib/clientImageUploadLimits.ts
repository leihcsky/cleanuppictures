/** Max decoded image bytes accepted for upload/processing (15 MiB). */
export const MAX_UPLOAD_IMAGE_BYTES = 15 * 1024 * 1024;

export function estimateDataUrlDecodedBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return Math.floor(dataUrl.length * 0.75);
  const b64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export function fileExceedsUploadByteLimit(file: File): boolean {
  return file.size > MAX_UPLOAD_IMAGE_BYTES;
}

export function dataUrlExceedsUploadByteLimit(dataUrl: string): boolean {
  if (!/^data:image\//i.test(dataUrl)) return false;
  return estimateDataUrlDecodedBytes(dataUrl) > MAX_UPLOAD_IMAGE_BYTES;
}
