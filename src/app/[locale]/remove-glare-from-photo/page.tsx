import Link from "next/link";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { getLinkHref } from "~/configs/buildLink";

export async function generateMetadata({ params: { locale } }) {
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/remove-glare-from-photo` : `/${locale}/remove-glare-from-photo`;
  const title = "Remove Glare from Photo Online | AI Glare Remover";
  const description = "Remove glare from photos online with AI. Fix shiny hotspots fast and export clean results as JPG, PNG, or WebP.";
  return {
    title,
    description,
    keywords: [
      "remove glare from photo",
      "photo glare remover",
      "remove glare online",
      "reduce reflection in photo",
      "remove shiny highlights"
    ],
    alternates: { canonical: canonicalUrl },
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

export default function RemoveGlareFromPhotoPage({ params: { locale } }) {
  const homeModeHref = `${getLinkHref(locale, '')}?mode=glare`;
  return (
    <>
      <Header locale={locale} page="remove-glare-from-photo" />
      <main className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Remove Glare from Photo Online</h1>
          <p className="mt-5 text-lg text-slate-600">
            Use AI to reduce harsh glare and reflective hotspots on glasses, skin, products, windows, and glossy surfaces while keeping details natural.
          </p>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">How to remove glare in 3 steps</h2>
            <ol className="mt-4 list-decimal pl-6 space-y-2 text-slate-700">
              <li>Upload your photo to the AI image cleanup tool.</li>
              <li>Paint over the glare area you want to fix.</li>
              <li>Click process and download your clean result.</li>
            </ol>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Why this works better</h2>
            <ul className="mt-4 list-disc pl-6 space-y-2 text-slate-700">
              <li>Targets only selected glare regions.</li>
              <li>Preserves texture and boundaries in nearby areas.</li>
              <li>Supports JPG, PNG, and WebP export.</li>
            </ul>
          </div>

          <div className="mt-12">
            <Link href={homeModeHref} className="inline-flex items-center rounded-full bg-primary-600 px-8 py-3 text-white font-semibold hover:bg-primary-700 transition-colors">
              Start Removing Now
            </Link>
          </div>
        </div>
      </main>
      <Footer locale={locale} page="remove-glare-from-photo" />
    </>
  );
}
