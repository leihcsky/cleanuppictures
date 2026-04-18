/**
 * Public URLs for R2-hosted marketing/sample assets (browser-visible).
 * Production: set NEXT_PUBLIC_CDN_URL=https://cdn.cleanuppictures.org (or your custom domain).
 * Optional NEXT_PUBLIC_STORAGE_URL (full origin, no trailing slash) is used if CDN URL is unset.
 */
export function getPublicCdnBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_CDN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL?.trim();
  if (storageUrl) return storageUrl.replace(/\/$/, "");

  return "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev";
}

/** Path relative to bucket root, e.g. "remove-emoji/sample1.jpg" (leading slash optional). */
export function publicCdnUrl(relativePath: string): string {
  const base = getPublicCdnBaseUrl();
  const path = relativePath.replace(/^\//, "");
  return `${base}/${path}`;
}
