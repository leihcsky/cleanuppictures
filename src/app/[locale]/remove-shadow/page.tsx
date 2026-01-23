import RemoveShadowTool from "~/components/RemoveShadowTool";

export const revalidate = 120;

export async function generateMetadata({ params: { locale = '' } }) {
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveShadowPageText();
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const title = (pageText.title || '').replace(/%brand%/g, brand);
  const description = (pageText.description || '').replace(/%brand%/g, brand);
  const canonicalUrl = origin ? `${origin}/${locale}/remove-shadow` : `/${locale}/remove-shadow`;
  return {
    title,
    description,
    keywords: [
      brand,
      'reduce shadow',
      'shadow reduction',
      'improve photo lighting',
      'fix dark areas',
      'png jpg webp export'
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

export default async function Page({ params: { locale = '' } }) {
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveShadowPageText();
  const toolText = await languageModule.getToolPageText();
  return (
    <RemoveShadowTool
      locale={locale}
      pageName={'remove-shadow'}
      pageText={pageText}
      toolText={toolText}
    />
  )
}

