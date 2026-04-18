import Link from "next/link";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { getLinkHref, getImageProxyHref } from "~/configs/buildLink";
import { publicCdnUrl } from "~/libs/cdnPublic";
import UploadRedirectCard from "./UploadRedirectCard";

export async function generateMetadata({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/remove-shadow` : `/${locale}/remove-shadow`;
  const title = "Remove Shadow from Photo Online | AI Shadow Remover";
  const description = "Remove shadow from photo online with AI. Fix harsh shadows fast and export clean results as JPG, PNG, or WebP.";
  return {
    title,
    description,
    keywords: [
      "remove shadow from photo",
      "remove shadow from image online",
      "ai shadow remover",
      "shadow remover tool",
      "reduce harsh shadows",
      "fix photo lighting online",
      "remove shadow from face",
      "brighten dark areas in photos",
      "product photo shadow removal",
      "portrait shadow cleanup"
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

export default function RemoveShadowPage({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const pageUrl = origin ? `${origin}/${locale}/remove-shadow` : `/${locale}/remove-shadow`;
  const homeModeHref = `${getLinkHref(locale, '')}?mode=shadow`;
  const px = (remote: string) => getImageProxyHref(locale, remote);
  const cases = [
    {
      title: "Portrait shadow cleanup",
      desc: "Reduce harsh facial shadows from sunlight, hats, and side lighting while keeping skin detail natural.",
      note: "Best for portraits where strong side light creates dark facial patches and uneven tone.",
      beforeUrl: publicCdnUrl("removeshadow/sample-portrait-before.jpg"),
      afterUrl: publicCdnUrl("removeshadow/sample-portrait-after.png")
    },
    {
      title: "Product photo lighting fix",
      desc: "Clean up hard cast shadows on products for brighter and more conversion-ready ecommerce images.",
      note: "Useful for listings where heavy shadows hide key product details and texture.",
      beforeUrl: publicCdnUrl("removeshadow/sample-product-before.jpg"),
      afterUrl: publicCdnUrl("removeshadow/sample-product-after.jpg")
    },
    {
      title: "Traffic sign shadow cleanup",
      desc: "Reduce strong cast shadows on road signs and reflective panels so symbols, text, and colors stay readable in street and documentation photos.",
      note: "Best when poles, nearby objects, or low sun leave uneven shadows across the sign face.",
      beforeUrl: publicCdnUrl("removeshadow/sample-traffic-signs-before.jpg"),
      afterUrl: publicCdnUrl("removeshadow/sample-traffic-signs-after.jpg")
    }
  ];
  const faqItems = [
    { q: "Is this remove shadow from photo tool free?", a: "You can start for free and process common shadow cleanup edits online." },
    { q: "Can I remove hard facial shadows from portraits?", a: "Yes. Brush over dark shadow regions and run cleanup to brighten and rebalance the area." },
    { q: "How do I get better blending at shadow edges?", a: "Brush slightly beyond the shadow boundary so the AI can blend transitions naturally." },
    { q: "Can I use this for product and listing photos?", a: "Yes. It works well for ecommerce products, real-estate photos, and marketing assets." },
    { q: "What image formats are supported?", a: "Input and export support JPG, PNG, and WebP." },
    { q: "Can I fix shadows in only one area of the photo?", a: "Yes. Brush only the shadow region you want to improve, so the rest of the image stays untouched." }
  ];
  const pageSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Remove Shadow from Photo Online",
      "description": "Remove shadow from photos online with AI for portraits, ecommerce, street signs, and interior photography.",
      "url": pageUrl,
      "inLanguage": locale
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI Shadow Remover",
      "applicationCategory": "PhotographyApplication",
      "operatingSystem": "Web",
      "url": pageUrl,
      "description": "AI tool to reduce harsh shadows from photos while preserving natural texture.",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "featureList": [
        "Remove shadow from photo online",
        "Fix hard cast shadows and dark areas",
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
        { "@type": "ListItem", "position": 2, "name": "Remove Shadow from Photo", "item": pageUrl }
      ]
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <Header locale={locale} page="remove-shadow" />
      <main className="bg-slate-50 pt-28">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Remove Shadow from Photo Online</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl">
            Remove harsh shadows from photos in seconds with AI. Fix uneven lighting while keeping natural texture and clean visual balance.
          </p>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Great for portraits, ecommerce product photos, traffic signs in street scenes, and interior images where shadows reduce clarity.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">BEFORE</p>
                  <img src={px(publicCdnUrl("removeshadow/sample-portrait-before.jpg"))} alt="Before remove shadow" className="w-full h-56 object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">AFTER</p>
                  <img src={px(publicCdnUrl("removeshadow/sample-portrait-after.png"))} alt="After remove shadow" className="w-full h-56 object-cover rounded-xl" />
                </div>
              </div>
            </div>
            <UploadRedirectCard locale={locale} />
          </div>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">How to remove shadow from photos online</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 1</p>
                <h3 className="mt-2 font-semibold text-slate-900">Upload your image</h3>
                <p className="mt-2 text-sm text-slate-600">Upload one image from your device. JPG, PNG, and WebP are supported.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 2</p>
                <h3 className="mt-2 font-semibold text-slate-900">Brush shadow areas</h3>
                <p className="mt-2 text-sm text-slate-600">Paint over shadow regions and include a small edge around dark boundaries.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 3</p>
                <h3 className="mt-2 font-semibold text-slate-900">Download balanced result</h3>
                <p className="mt-2 text-sm text-slate-600">Run cleanup, review the result, then export your final image in high quality.</p>
              </div>
            </div>
          </section>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Why use this AI shadow remover</h2>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Fast shadow correction</h3><p className="mt-2 text-sm text-slate-600">Clean up harsh shadows quickly without complicated manual retouching.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Natural lighting balance</h3><p className="mt-2 text-sm text-slate-600">AI reconstructs nearby regions to keep transitions smooth and realistic.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Works for many scenarios</h3><p className="mt-2 text-sm text-slate-600">Useful for portraits, product photos, traffic signs, room photos, and marketing images.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Online and easy to use</h3><p className="mt-2 text-sm text-slate-600">No software installation needed. Edit and export directly in your browser.</p></div>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-3xl font-bold text-slate-900">Use cases and results</h2>
            <p className="mt-3 text-slate-600">See how shadow removal improves clarity for people, products, street signage, and more.</p>
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
                      <img src={px(item.beforeUrl)} alt={`${item.title} before`} className="w-full h-48 object-contain object-center bg-slate-100 rounded-xl" />
                      <img src={px(item.afterUrl)} alt={`${item.title} after`} className="w-full h-48 object-contain object-center bg-slate-100 rounded-xl" />
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
      <Footer locale={locale} page="remove-shadow" />
    </>
  );
}
