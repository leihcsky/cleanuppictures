export const getLinkHref = (locale = 'en', page = '') => {
  if (page == '') {
    if (locale == 'en') {
      return '/';
    }
    return `/${locale}/`;
  }
  if (locale == 'en') {
    return `/${page}`;
  }
  return `/${locale}/${page}`;
}

/** Append query to a path (pair with getLinkHref: avoid `/en?…`, which next.config redirects to `/` without the query). */
export function hrefWithSearchParams(path: string, params: Record<string, string>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    sp.set(k, v);
  }
  const q = sp.toString();
  if (!q) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${q}`;
}

/** Proxied URL for remote sample images (same path shape as `/${locale}/api/...` used by the tool). */
export function getImageProxyHref(locale: string, remoteUrl: string): string {
  const normalizedLocale = (locale || '').trim();
  const routeLocale = normalizedLocale && normalizedLocale !== 'default' ? normalizedLocale : 'en';
  const base = getLinkHref(routeLocale, 'api/image-proxy');
  return `${base}?url=${encodeURIComponent(remoteUrl)}`;
}


export const getCompressionImageLink = (url) => {
  const beginUrl = process.env.NEXT_PUBLIC_STORAGE_URL + '/cdn-cgi/image/width=512,quality=85/';
  return beginUrl + url;
}


export const getArrayUrlResult = (origin) => {
  if (origin) {
    const jsonResult = JSON.parse(origin);
    if (jsonResult.length > 0) {
      return jsonResult;
    }
  }
  return []
}

export const getTotalLinkHref = (locale = 'en', page = '') => {
  if (page == '') {
    if (locale == 'en') {
      return process.env.NEXT_PUBLIC_SITE_URL + '/';
    }
    return process.env.NEXT_PUBLIC_SITE_URL + `/${locale}/`;
  }
  if (locale == 'en') {
    return process.env.NEXT_PUBLIC_SITE_URL + `/${page}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL + `/${locale}/${page}`;
}

export const getShareToPinterest = (locale = 'en', page = '', sticker:string) => {
  const pinterestUrl = 'https://pinterest.com/pin/create/button/';
  return pinterestUrl + `?description=${encodeURIComponent(sticker)}` + `&url=` + encodeURIComponent(getTotalLinkHref(locale, page));
}
