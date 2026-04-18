import PageComponent from "./PageComponent";
import { absoluteCanonicalUrl, getPublicSiteOriginNoSlash } from "~/libs/seoCanonical";

export async function generateMetadata({ params: { locale } }) {
  const origin = getPublicSiteOriginNoSlash();
  const canonicalUrl = absoluteCanonicalUrl(origin, locale, "pricing");
  const title = "Pricing Plans | Free, Pro, and Pay-as-you-go Credits";
  const description = "Choose the best plan for AI image cleanup: Free trial, Pro subscription, or pay-as-you-go credits. Start free and upgrade when you need HD and advanced AI.";

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      locale,
      type: 'website',
      url: canonicalUrl
    },
    twitter: {
      card: 'summary',
      title,
      description
    },
    ...(origin ? { metadataBase: new URL(origin) } : {})
  }
}

export default async function PricingPage({ params: { locale } }) {
  return <PageComponent locale={locale} />;
}
