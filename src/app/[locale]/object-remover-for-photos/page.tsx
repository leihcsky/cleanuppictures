import Link from "next/link";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { getLinkHref } from "~/configs/buildLink";
import UploadRedirectCard from "./UploadRedirectCard";

export async function generateMetadata({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/object-remover-for-photos` : `/${locale}/object-remover-for-photos`;
  const title = "Object Remover for Photos Online | AI Object Remover";
  const description = "Remove unwanted objects from photos online with AI. Fast cleanup with natural results and JPG, PNG, WebP export.";
  return {
    title,
    description,
    keywords: [
      "object remover for photos",
      "remove object from photo online",
      "ai object remover",
      "remove unwanted objects from photos",
      "erase object from image",
      "remove distractions from photos",
      "remove clutter from photo",
      "photo object remover free",
      "cleanup photo background",
      "online object eraser"
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

export default function ObjectRemoverForPhotosPage({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const pageUrl = origin ? `${origin}/${locale}/object-remover-for-photos` : `/${locale}/object-remover-for-photos`;
  const homeModeHref = `${getLinkHref(locale, '')}?mode=object`;
  const cases = [
    {
      title: "Street and travel cleanup",
      desc: "Remove traffic signs, bins, and random objects that distract from landmarks and scenery.",
      note: "Ideal for travel photos where background clutter pulls attention away from the destination.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-after.jpg"
    },
    {
      title: "Product photo cleanup",
      desc: "Erase tags, extra props, reflections, and defects to keep product images clean and conversion-ready.",
      note: "Useful for ecommerce listings that need cleaner visuals and stronger product focus.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-product-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-product-after.jpg"
    },
    {
      title: "Property listing cleanup",
      desc: "Remove cables, trash bins, and small visual clutter from interior or exterior real-estate photos.",
      note: "Great for listing photos where cleaner scenes help rooms and facades look more premium.",
      beforeUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-building-before.jpg",
      afterUrl: "https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-building-after.jpg"
    }
  ];
  const faqItems = [
    {
      q: "Is this object remover for photos free?",
      a: "You can start for free and remove common unwanted objects online."
    },
    {
      q: "What kinds of objects can I remove?",
      a: "You can remove signs, wires, trash bins, labels, reflections, and many other distractions."
    },
    {
      q: "How do I get cleaner edges after removing objects?",
      a: "Brush slightly outside the object boundary so the AI has enough nearby area to blend textures naturally."
    },
    {
      q: "Can I use this for ecommerce and listing photos?",
      a: "Yes. It works well for product photos, social assets, and real-estate image cleanup."
    },
    {
      q: "What image formats are supported?",
      a: "Input and export support JPG, PNG, and WebP."
    },
    {
      q: "Can I remove multiple objects in one photo?",
      a: "Yes. You can brush several objects and remove them together, or run multiple passes for cleaner detail."
    }
  ];
  const pageSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Object Remover for Photos Online",
      "description": "Remove unwanted objects from photos online with AI for travel, ecommerce, and property listing cleanup.",
      "url": pageUrl,
      "inLanguage": locale
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI Object Remover for Photos",
      "applicationCategory": "PhotographyApplication",
      "operatingSystem": "Web",
      "url": pageUrl,
      "description": "AI tool to remove unwanted objects from photos while keeping natural background continuity.",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "featureList": [
        "Object remover for photos online",
        "Brush-based local cleanup workflow",
        "Natural background reconstruction",
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
        { "@type": "ListItem", "position": 2, "name": "Object Remover for Photos", "item": pageUrl }
      ]
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <Header locale={locale} page="object-remover-for-photos" />
      <main className="bg-slate-50 pt-28">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Object Remover for Photos Online</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl">
            Remove unwanted objects from photos in seconds with AI. Clean up clutter, signs, wires, and distractions while keeping natural texture and composition.
          </p>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Great for travel shots, ecommerce visuals, social posts, and property listings that need cleaner presentation.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">BEFORE</p>
                  <img src="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-before.jpg" alt="Before remove object" className="w-full h-56 object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">AFTER</p>
                  <img src="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-after.jpg" alt="After remove object" className="w-full h-56 object-cover rounded-xl" />
                </div>
              </div>
            </div>
            <UploadRedirectCard locale={locale} />
          </div>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">How to remove objects from photos online</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 1</p>
                <h3 className="mt-2 font-semibold text-slate-900">Upload your image</h3>
                <p className="mt-2 text-sm text-slate-600">Upload one photo from your device. JPG, PNG, and WebP are supported.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 2</p>
                <h3 className="mt-2 font-semibold text-slate-900">Brush the object</h3>
                <p className="mt-2 text-sm text-slate-600">Paint over the object you want removed and include a small edge around it.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 3</p>
                <h3 className="mt-2 font-semibold text-slate-900">Download clean result</h3>
                <p className="mt-2 text-sm text-slate-600">Run removal, check the result, and export your photo in high quality.</p>
              </div>
            </div>
          </section>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Why use this AI object remover</h2>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Fast and simple steps</h3><p className="mt-2 text-sm text-slate-600">No complex layers or manual cloning. Upload, brush, remove, and export.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Natural background rebuilding</h3><p className="mt-2 text-sm text-slate-600">AI fills removed areas using nearby texture for cleaner and more realistic output.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Useful across industries</h3><p className="mt-2 text-sm text-slate-600">Great for travel creators, ecommerce teams, agencies, and real-estate marketers.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Browser-based editing</h3><p className="mt-2 text-sm text-slate-600">Work directly online with no desktop software installation needed.</p></div>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-3xl font-bold text-slate-900">Use cases and results</h2>
            <p className="mt-3 text-slate-600">See how object removal helps clean up different photo scenes quickly.</p>
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
      <Footer locale={locale} page="object-remover-for-photos" />
    </>
  );
}
