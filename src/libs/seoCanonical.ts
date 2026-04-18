import { routing } from "~/i18n/routing";

/** Site origin without trailing slash (for metadata, canonical). Prefer `NEXT_PUBLIC_SITE_URL` (matches `getURL` / HeadInfo). */
export function getPublicSiteOriginNoSlash(): string {
  return String(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_WEBSITE_URL ||
      process.env.NEXT_PUBLIC_WEBSITE_ORIGIN ||
      ""
  ).replace(/\/$/, "");
}

/**
 * Canonical URL aligned with next-intl `localePrefix: "as-needed"`:
 * default locale (en) has no `/en` prefix; matches public URLs and `/en` → `/` redirects.
 *
 * @param originNoSlash - e.g. from {@link getPublicSiteOriginNoSlash}
 * @param locale - route locale segment
 * @param pagePath - path after locale, no leading slash (e.g. "pricing", "" for home)
 */
export function absoluteCanonicalUrl(originNoSlash: string, locale: string, pagePath: string): string {
  const o = String(originNoSlash || "").replace(/\/$/, "");
  const path = String(pagePath || "").replace(/^\/+|\/+$/g, "");
  const isDefault = locale === routing.defaultLocale;

  if (!o) {
    if (isDefault) return path ? `/${path}` : "/";
    return path ? `/${locale}/${path}` : `/${locale}`;
  }
  if (isDefault) {
    return path ? `${o}/${path}` : o;
  }
  return path ? `${o}/${locale}/${path}` : `${o}/${locale}`;
}
