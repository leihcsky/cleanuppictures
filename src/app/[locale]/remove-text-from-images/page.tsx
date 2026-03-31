import Link from "next/link";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { getLinkHref } from "~/configs/buildLink";
import UploadRedirectCard from "./UploadRedirectCard";

export async function generateMetadata({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/remove-text-from-images` : `/${locale}/remove-text-from-images`;
  const title = "Remove Text from Images Online | AI Text Remover";
  const description = "Remove text from images online with AI. Erase watermarks, captions, and logos fast with natural cleanup. Export JPG, PNG, or WebP.";
  return {
    title,
    description,
    keywords: [
      "remove text from images",
      "remove text from image online",
      "ai text remover",
      "erase text from photo",
      "remove watermark from image",
      "delete caption from photo",
      "remove logo from image",
      "photo text remover free",
      "remove words from picture",
      "online text eraser"
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

export default function RemoveTextFromImagesPage({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const pageUrl = origin ? `${origin}/${locale}/remove-text-from-images` : `/${locale}/remove-text-from-images`;
  const homeModeHref = `${getLinkHref(locale, '')}?mode=text`;
  const cases = [
    {
      title: "Product image label cleanup",
      desc: "Remove printed labels, promo text, and stickers from product photos for cleaner listings.",
      note: "Ideal for ecommerce images where extra labels distract from the product itself.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-product-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-product-after.jpg"
    },
    {
      title: "Sign and text removal in street photos",
      desc: "Erase signs, numbers, and distracting text in travel or street images while keeping scene continuity.",
      note: "Useful for travel and street scenes when signs or numbers pull focus from the subject.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-after.jpg"
    },
    {
      title: "Watermark and overlay cleanup",
      desc: "Remove text overlays and watermark-style marks from photos when you need a cleaner visual output.",
      note: "Great for reused marketing visuals that need cleaner backgrounds before republishing.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-building-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-building-after.jpg"
    }
  ];
  const faqItems = [
    {
      q: "Is this remove text from images tool free?",
      a: "You can start for free and remove common text elements online."
    },
    {
      q: "What kind of text can I remove?",
      a: "You can remove labels, captions, logos, signs, numbers, and watermark-like overlays."
    },
    {
      q: "How do I get better results around text edges?",
      a: "Brush slightly wider than the text area so AI can blend surrounding pixels more naturally."
    },
    {
      q: "Can I use this for ecommerce and social images?",
      a: "Yes. It works well for product photos, social posts, ads, and listing visuals."
    },
    {
      q: "What image formats are supported?",
      a: "Input and export support JPG, PNG, and WebP."
    },
    {
      q: "Can I remove multiple text elements at once?",
      a: "Yes. You can mark several text areas in one edit, then run removal and refine with another pass if needed."
    }
  ];
  const pageSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Remove Text from Images Online",
      "description": "Remove text from images online with AI for product photos, travel scenes, and social media visuals.",
      "url": pageUrl,
      "inLanguage": locale
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI Text Remover",
      "applicationCategory": "PhotographyApplication",
      "operatingSystem": "Web",
      "url": pageUrl,
      "description": "AI tool to erase text from images while preserving natural background details.",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "featureList": [
        "Remove text from images online",
        "Erase captions labels and watermarks",
        "Brush-based local cleanup steps",
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
        { "@type": "ListItem", "position": 2, "name": "Remove Text from Images", "item": pageUrl }
      ]
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <Header locale={locale} page="remove-text-from-images" />
      <main className="bg-slate-50 pt-28">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Remove Text from Images Online</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl">
            Remove unwanted text from images in seconds with AI. Clean up labels, captions, watermarks, and logos while keeping natural texture and composition.
          </p>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Great for ecommerce photos, social visuals, travel shots, and marketing assets that need a cleaner final look.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">BEFORE</p>
                  <img src="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-before.jpg" alt="Before remove text" className="w-full h-56 object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">AFTER</p>
                  <img src="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-after.jpg" alt="After remove text" className="w-full h-56 object-cover rounded-xl" />
                </div>
              </div>
            </div>
            <UploadRedirectCard locale={locale} />
          </div>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">How to remove text from images online</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 1</p>
                <h3 className="mt-2 font-semibold text-slate-900">Upload your image</h3>
                <p className="mt-2 text-sm text-slate-600">Upload one image from your device. JPG, PNG, and WebP are supported.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 2</p>
                <h3 className="mt-2 font-semibold text-slate-900">Brush the text area</h3>
                <p className="mt-2 text-sm text-slate-600">Paint over text, labels, or logos and include a small border around each element.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 3</p>
                <h3 className="mt-2 font-semibold text-slate-900">Download clean image</h3>
                <p className="mt-2 text-sm text-slate-600">Run text removal, review the result, and export your final image in high quality.</p>
              </div>
            </div>
          </section>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Why use this AI text remover</h2>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Quick text cleanup</h3><p className="mt-2 text-sm text-slate-600">Remove distracting text without complicated manual retouching.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Natural background fill</h3><p className="mt-2 text-sm text-slate-600">AI rebuilds nearby textures to keep cleaned areas visually consistent.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Works across use cases</h3><p className="mt-2 text-sm text-slate-600">Use it for product photos, social creatives, travel images, and promotional assets.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Online and easy to use</h3><p className="mt-2 text-sm text-slate-600">No software install needed. Upload, brush, remove, and download in one flow.</p></div>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-3xl font-bold text-slate-900">Use cases and results</h2>
            <p className="mt-3 text-slate-600">See how text removal helps clean up different kinds of image content.</p>
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
      <Footer locale={locale} page="remove-text-from-images" />
    </>
  );
}
