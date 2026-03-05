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
      'remove shadow from image online',
      'shadow remover',
      'shadow reduction tool',
      'fix lighting in photos',
      'brighten dark photos',
      'remove shadow from face',
      'reduce harsh shadows',
      'improve photo lighting online',
      'portrait shadow fix',
      'product photo shadow removal',
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

  const schema = [
    {
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
        "Reduce harsh shadows in portraits",
        "Fix uneven lighting in product photos",
        "Improve visibility in dark areas",
        "Export as PNG, JPG, WebP",
        "Local browser processing for privacy"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": pageText.faq1Q, "acceptedAnswer": { "@type": "Answer", "text": pageText.faq1A } },
        { "@type": "Question", "name": pageText.faq2Q, "acceptedAnswer": { "@type": "Answer", "text": pageText.faq2A } },
        { "@type": "Question", "name": pageText.faq3Q, "acceptedAnswer": { "@type": "Answer", "text": pageText.faq3A } },
        { "@type": "Question", "name": pageText.faq4Q, "acceptedAnswer": { "@type": "Answer", "text": pageText.faq4A } },
        { "@type": "Question", "name": pageText.faq5Q, "acceptedAnswer": { "@type": "Answer", "text": pageText.faq5A } },
        { "@type": "Question", "name": pageText.faq6Q, "acceptedAnswer": { "@type": "Answer", "text": pageText.faq6A } },
        { "@type": "Question", "name": pageText.faq7Q, "acceptedAnswer": { "@type": "Answer", "text": pageText.faq7A } }
      ].filter((item) => item.name && item.acceptedAnswer?.text)
    }
  ];

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
