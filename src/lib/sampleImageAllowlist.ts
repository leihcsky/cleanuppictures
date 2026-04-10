/**
 * Same host rules as `src/app/[locale]/api/image-proxy/route.ts`.
 * Used to validate `?sample=` before the home editor loads a remote image.
 */
export function isHttpsUrlAllowedForSampleProxy(urlStr: string): boolean {
  try {
    const target = new URL(urlStr.trim());
    if (target.protocol !== "https:") return false;
    const allowlist = (process.env.SAMPLE_IMAGE_PROXY_ALLOWLIST || "r2.dev")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    const host = target.hostname.toLowerCase();
    return allowlist.some((item) => host === item || host.endsWith(`.${item}`));
  } catch {
    return false;
  }
}
