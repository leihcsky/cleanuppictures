import PageComponent from "./PageComponent";
// Server-only imports moved into function scope

export const revalidate = 120;
export async function generateMetadata({ params: { locale = '' } }) {
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);
  const languageModule = await import('~/i18n/languageText');
  const indexText = await languageModule.getIndexPageText();
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const title = (indexText.title || '').replace(/%brand%/g, brand);
  const description = (indexText.description || '').replace(/%brand%/g, brand);
  const canonicalUrl = origin ? `${origin}/${locale}` : `/${locale}`;
    return {
      title,
      description,
      keywords: [
        brand,
        'online image cleanup',
        'remove background color',
        'remove shadow',
        'remove emoji',
        'transparent png',
        'transparent webp',
        'png jpg webp export',
        'privacy-first'
      ],
      alternates: {
        canonical: canonicalUrl
      },
    openGraph: {
      title,
      description,
      locale,
      siteName: brand,
      type: 'website',
      url: canonicalUrl
    },
    twitter: {
      card: 'summary',
      title,
      description
    },
    ...(origin ? { metadataBase: new URL(origin) } : {})
  };
}
export default async function IndexPage({ params: { locale = '' }, searchParams: searchParams }) {
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);

  const languageModule = await import('~/i18n/languageText');
  const indexText = await languageModule.getIndexPageText();
  const toolText = await languageModule.getToolPageText();

  return (
    <PageComponent
      locale={locale}
      indexText={indexText}
      toolText={toolText}
    />
  )
}
