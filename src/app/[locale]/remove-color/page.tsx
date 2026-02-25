import RemoveColorTool from "~/components/RemoveColorTool";
// Defer i18n imports to runtime to avoid issues during static path generation

export async function generateMetadata({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveColorPageText();
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/remove-color` : `/${locale}/remove-color`;

  return {
    title: pageText.title,
    description: pageText.description,
    keywords: [
      'remove color from image',
      'transparent background',
      'remove background color',
      'make image transparent',
      'delete color from photo',
      'png jpg webp export'
    ],
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title: pageText.title,
      description: pageText.description,
      locale,
      siteName: brand,
      type: 'website',
      url: canonicalUrl
    },
    twitter: {
      card: 'summary',
      title: pageText.title,
      description: pageText.description
    },
    ...(origin ? { metadataBase: new URL(origin) } : {})
  }
}

export default async function RemoveColorPage({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveColorPageText();
  const toolText = await languageModule.getToolPageText();

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Remove Color from Image",
    "description": pageText.description,
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Remove specific colors from images",
      "Make background transparent",
      "Export as PNG, JPG, WebP",
      "Adjust tolerance for precise removal"
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <RemoveColorTool
        locale={locale}
        pageName="remove-color"
        pageText={pageText}
        toolText={toolText}
      />
    </>
  )
}
