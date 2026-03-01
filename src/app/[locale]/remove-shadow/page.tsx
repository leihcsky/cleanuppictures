import RemoveShadowTool from "~/components/RemoveShadowTool";

export async function generateMetadata({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveShadowPageText();
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/remove-shadow` : `/${locale}/remove-shadow`;

  return {
    title: pageText.title,
    description: pageText.description,
    keywords: [
      'remove shadow from photo',
      'shadow remover',
      'fix lighting in photos',
      'brighten dark photos',
      'remove shadow from face',
      'png jpg webp export',
      'cleanup pictures'
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

export default async function RemoveShadowPage({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveShadowPageText();
  const toolText = await languageModule.getToolPageText();

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Remove Shadow from Photo",
    "description": pageText.description,
    "applicationCategory": "PhotographyApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Remove harsh shadows from photos",
      "Balance uneven lighting",
      "Export as PNG, JPG, WebP",
      "Adjust shadow reduction strength",
      "Privacy-focused local processing"
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <RemoveShadowTool
        locale={locale}
        pageName="remove-shadow"
        pageText={pageText}
        toolText={toolText}
      />
    </>
  )
}
