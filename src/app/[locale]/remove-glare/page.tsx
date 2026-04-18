import RemoveShadowTool from "~/components/RemoveShadowTool";
import { absoluteCanonicalUrl, getPublicSiteOriginNoSlash } from "~/libs/seoCanonical";

export async function generateMetadata({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveGlarePageText();
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'CleanupPictures';
  const origin = getPublicSiteOriginNoSlash();
  const canonicalUrl = absoluteCanonicalUrl(origin, locale, "remove-glare");

  return {
    title: pageText.title,
    description: pageText.description,
    keywords: [
      'remove glare from photos',
      'remove glare from image online',
      'photo glare remover',
      'screen glare remover',
      'glare reduction tool',
      'remove reflections from photos',
      'fix shiny highlights in pictures',
      'reduce glare on glasses photo',
      'improve photo clarity online',
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

export default async function RemoveGlarePage({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveGlarePageText();
  const toolText = await languageModule.getToolPageText();

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Remove Glare from Photos",
      "description": pageText.description,
      "applicationCategory": "PhotographyApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "Reduce harsh glare and shiny hotspots",
        "Fix reflections on glass and glossy surfaces",
        "Improve visibility in overexposed highlight areas",
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
      ]
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
        pageName="remove-glare"
        pageText={pageText}
        toolText={toolText}
        apiPath="remove-glare"
      />
    </>
  )
}
