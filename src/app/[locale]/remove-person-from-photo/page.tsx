import Link from "next/link";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { getLinkHref } from "~/configs/buildLink";
import UploadRedirectCard from "./UploadRedirectCard";

export async function generateMetadata({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/remove-person-from-photo` : `/${locale}/remove-person-from-photo`;
  const title = "Remove People from Photo Online | AI Person Remover";
  const description = "Remove people from photos online with AI. Erase tourists, crowds, and background strangers fast with natural results. Export JPG, PNG, or WebP.";
  return {
    title,
    description,
    keywords: [
      "remove person from photo",
      "remove people from photo online",
      "remove people from photos free",
      "remove people from image",
      "delete person from picture",
      "erase people from photo",
      "remove tourists from photos",
      "remove crowd from photo",
      "ai person remover",
      "ai people remover",
      "ai person remover",
      "photo cleanup tool"
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

export default function RemovePersonFromPhotoPage({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const pageUrl = origin ? `${origin}/${locale}/remove-person-from-photo` : `/${locale}/remove-person-from-photo`;
  const cases = [
    {
      title: "Travel photo cleanup",
      desc: "Remove tourists and passersby from landmark photos to keep focus on the destination.",
      note: "Best for busy landmarks where background crowds distract from the location story.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-building-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-building-after.jpg"
    },
    {
      title: "Portrait background cleanup",
      desc: "Delete distracting people behind your subject and keep the portrait composition clean.",
      note: "Great for portraits that need full attention on the main subject without background interruptions.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-portrait-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-portrait-after.png"
    },
    {
      title: "E-commerce scene cleanup",
      desc: "Remove unwanted people or reflections from product scenes for conversion-ready visuals.",
      note: "Useful for listing images where cleaner product framing helps buyers focus faster.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-product-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-product-after.jpg"
    }
  ];
  const faqItems = [
    {
      q: "Is this remove people from photo tool free?",
      a: "You can start for free and process common person removal edits online."
    },
    {
      q: "Can I remove tourists or crowds from travel photos?",
      a: "Yes. Brush each person area you want to remove and process in one or multiple passes for clean travel photos."
    },
    {
      q: "How do I get more natural edges after removing a person?",
      a: "Paint slightly beyond the subject boundary so AI gets enough nearby context to reconstruct textures naturally."
    },
    {
      q: "Can I use this for ecommerce and listing images?",
      a: "Yes. It works for product scenes, lifestyle images, and property photos where unwanted people reduce clarity."
    },
    {
      q: "What image formats are supported?",
      a: "Input and export support JPG, PNG, and WebP."
    },
    {
      q: "Can I remove multiple people in one photo?",
      a: "Yes. Mark all unwanted people in one pass or do multiple passes for more precise cleanup in crowded scenes."
    }
  ];
  const pageSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Remove People from Photo Online",
      "description": "Remove people from photos online with AI and clean distracting subjects from travel, portrait, and ecommerce images.",
      "url": pageUrl,
      "inLanguage": locale
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI Person Remover",
      "applicationCategory": "PhotographyApplication",
      "operatingSystem": "Web",
      "url": pageUrl,
      "description": "AI tool to remove people from photos while preserving realistic background continuity.",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "featureList": [
        "Remove people from photo online",
        "Erase tourists and crowd from background",
        "Brush-based local editing steps",
        "JPG PNG WebP export"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map((faq) => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": { "@type": "Answer", "text": faq.a }
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": brand, "item": origin ? `${origin}/${locale}` : `/${locale}` },
        { "@type": "ListItem", "position": 2, "name": "Remove People from Photo", "item": pageUrl }
      ]
    }
  ];
  const homeModeHref = `${getLinkHref(locale, '')}?mode=person`;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <Header locale={locale} page="remove-person-from-photo" />
      <main className="bg-slate-50 pt-28">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Remove People from Photo Online</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl">
            Remove unwanted people from photos in seconds with AI. Clean up tourists, crowds, and background strangers while keeping natural texture and composition.
          </p>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Perfect for travel photography, portraits, real estate, and ecommerce visuals where unwanted people distract from the main subject.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">BEFORE</p>
                  <img src="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-building-before.jpg" alt="Before remove person" className="w-full h-56 object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">AFTER</p>
                  <img src="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-building-after.jpg" alt="After remove person" className="w-full h-56 object-cover rounded-xl" />
                </div>
              </div>
            </div>
            <UploadRedirectCard locale={locale} />
          </div>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">How to remove people from photos online</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 1</p>
                <h3 className="mt-2 font-semibold text-slate-900">Import your image</h3>
                <p className="mt-2 text-sm text-slate-600">Upload a travel, portrait, street, or ecommerce image. JPG, PNG, and WebP are supported.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 2</p>
                <h3 className="mt-2 font-semibold text-slate-900">Brush unwanted people</h3>
                <p className="mt-2 text-sm text-slate-600">Paint over the person area and include a little extra edge. This improves reconstruction quality and removes residual artifacts.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 3</p>
                <h3 className="mt-2 font-semibold text-slate-900">Download the result</h3>
                <p className="mt-2 text-sm text-slate-600">Run AI cleanup, preview before/after, then export your final image in high quality.</p>
              </div>
            </div>
          </section>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Why use this AI person remover</h2>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Simple focused editing</h3><p className="mt-2 text-sm text-slate-600">Designed for quickly removing unwanted people without complicated retouch steps.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Natural background continuity</h3><p className="mt-2 text-sm text-slate-600">AI reconstructs nearby texture to avoid obvious cloning artifacts in complex scenes.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Works for multiple scenarios</h3><p className="mt-2 text-sm text-slate-600">Use it for travel photos, portraits, social media assets, property listings, and product scenes.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Fast online editing</h3><p className="mt-2 text-sm text-slate-600">Upload, brush, process, and download in a simple browser flow.</p></div>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-3xl font-bold text-slate-900">Use cases and results</h2>
            <p className="mt-3 text-slate-600">See how different scenes look cleaner after removing distracting people from the background.</p>
            <div className="mt-7 space-y-8">
              {cases.map((item) => (
                <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8 shadow-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-3 text-slate-600">{item.desc}</p>
                      <p className="mt-3 text-sm text-slate-500">{item.note}</p>
                      <div className="mt-5">
                        <Link href={homeModeHref} className="inline-flex items-center rounded-full bg-primary-600 px-6 py-2.5 text-white font-semibold hover:bg-primary-700 transition-colors">
                          Start Removing Now
                        </Link>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <img src={item.beforeUrl} alt={`${item.title} before`} className="w-full h-48 object-cover rounded-xl" />
                      <img src={item.afterUrl} alt={`${item.title} after`} className="w-full h-48 object-cover rounded-xl" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-14 rounded-3xl bg-slate-900 border border-slate-800 p-8 lg:p-10">
            <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqItems.map((item) => (
                <div key={item.q} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="font-semibold text-white">{item.q}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer locale={locale} page="remove-person-from-photo" />
    </>
  );
}
