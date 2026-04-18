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
  const canonicalUrl = origin ? `${origin}/${locale}/remove-emoji-from-photo` : `/${locale}/remove-emoji-from-photo`;
  const title = "Remove Emoji from Photo Online | AI Emoji Remover";
  const description = "Remove emoji, stickers, and overlays from photos online with AI. Fast cleanup with natural results and JPG, PNG, WebP export.";
  return {
    title,
    description,
    keywords: [
      "remove emoji from photo",
      "remove emoji from image online",
      "emoji remover",
      "erase emoji from photo",
      "remove sticker from photo",
      "remove emoji overlay",
      "remove icon from image",
      "ai emoji remover",
      "photo emoji remover free",
      "online emoji eraser"
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

export default function RemoveEmojiFromPhotoPage({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const pageUrl = origin ? `${origin}/${locale}/remove-emoji-from-photo` : `/${locale}/remove-emoji-from-photo`;
  const homeModeHref = `${getLinkHref(locale, '')}?mode=text`;
  const px = (remote: string) => getImageProxyHref(locale, remote);
  const cases = [
    {
      title: "Portrait emoji cleanup",
      desc: "Remove large emoji overlays from portrait photos while preserving natural facial details.",
      note: "Ideal for recovering personal photos where face stickers block key features.",
      beforeUrl: publicCdnUrl("remove-emoji/sample1-remove-emoji-before.jpg"),
      afterUrl: publicCdnUrl("remove-emoji/sample1-remove-emoji-after.jpg")
    },
    {
      title: "Business meeting photos",
      desc: "Clean emoji marks and overlays from meeting images for presentations and reports.",
      note: "Great for professional decks where visual clarity and context matter.",
      beforeUrl: publicCdnUrl("remove-emoji/sample2-remove-emoji-before.jpg"),
      afterUrl: publicCdnUrl("remove-emoji/sample2-remove-emoji-after.jpg")
    },
    {
      title: "Product image cleanup",
      desc: "Remove sticker-like emoji elements from product photos for cleaner commercial visuals.",
      note: "Useful for storefront, ads, and catalog images that need a polished appearance.",
      beforeUrl: publicCdnUrl("remove-emoji/sample3-remove-emoji-before.jpg"),
      afterUrl: publicCdnUrl("remove-emoji/sample3-remove-emoji-after.jpg")
    }
  ];
  const faqItems = [
    { q: "Is this remove emoji from photo tool free?", a: "You can start for free and remove common emoji overlays online." },
    { q: "Can I remove stickers and icon overlays too?", a: "Yes. The same process can erase emoji, stickers, and icon-like marks." },
    { q: "How do I get clean blending after emoji removal?", a: "Brush slightly wider than the emoji edge so AI can rebuild nearby texture naturally." },
    { q: "Can I use this for ecommerce and social assets?", a: "Yes. It works for product photos, social media creatives, and promo visuals." },
    { q: "What image formats are supported?", a: "Input and export support JPG, PNG, and WebP." },
    { q: "Can I remove multiple emoji or stickers in one image?", a: "Yes. Select multiple emoji or sticker areas and remove them together, then refine any leftovers in another pass." }
  ];
  const pageSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Remove Emoji from Photo Online",
      "description": "Remove emoji from photos online with AI for social media, ecommerce, and content cleanup.",
      "url": pageUrl,
      "inLanguage": locale
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI Emoji Remover",
      "applicationCategory": "PhotographyApplication",
      "operatingSystem": "Web",
      "url": pageUrl,
      "description": "AI tool to remove emoji overlays from photos while preserving natural background details.",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "featureList": [
        "Remove emoji from photo online",
        "Erase stickers and overlays",
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
        { "@type": "ListItem", "position": 2, "name": "Remove Emoji from Photo", "item": pageUrl }
      ]
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <Header locale={locale} page="remove-emoji-from-photo" />
      <main className="bg-slate-50 pt-28">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Remove Emoji from Photo Online</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl">
            Remove emoji overlays from photos in seconds with AI. Clean up stickers, icon marks, and decorative emoji while keeping natural texture and composition.
          </p>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Great for social media cleanup, ecommerce visuals, and content teams that need polished images.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">BEFORE</p>
                  <img src={px(publicCdnUrl("remove-emoji/sample1-remove-emoji-before.jpg"))} alt="Before remove emoji" className="w-full h-56 object-cover rounded-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">AFTER</p>
                  <img src={px(publicCdnUrl("remove-emoji/sample1-remove-emoji-after.jpg"))} alt="After remove emoji" className="w-full h-56 object-cover rounded-xl" />
                </div>
              </div>
            </div>
            <UploadRedirectCard locale={locale} />
          </div>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">How to remove emoji from photos online</h2>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 1</p>
                <h3 className="mt-2 font-semibold text-slate-900">Upload your image</h3>
                <p className="mt-2 text-sm text-slate-600">Upload one image from your device. JPG, PNG, and WebP are supported.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 2</p>
                <h3 className="mt-2 font-semibold text-slate-900">Brush emoji area</h3>
                <p className="mt-2 text-sm text-slate-600">Paint over each emoji or sticker and include a small border around the edge.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-sm font-semibold text-primary-700">Step 3</p>
                <h3 className="mt-2 font-semibold text-slate-900">Download clean image</h3>
                <p className="mt-2 text-sm text-slate-600">Run removal, check the result, then export your final image in high quality.</p>
              </div>
            </div>
          </section>

          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Why use this AI emoji remover</h2>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Simple cleanup flow</h3><p className="mt-2 text-sm text-slate-600">Upload, brush, and remove in a few clicks without complex editing tools.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Natural background fill</h3><p className="mt-2 text-sm text-slate-600">AI rebuilds nearby texture so removed emoji areas look more realistic.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Works for different content</h3><p className="mt-2 text-sm text-slate-600">Use it on social images, product photos, and branded visuals.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Online and fast</h3><p className="mt-2 text-sm text-slate-600">No installation needed. Edit and export directly in your browser.</p></div>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-3xl font-bold text-slate-900">Use cases and results</h2>
            <p className="mt-3 text-slate-600">See how emoji removal helps clean up different visual scenarios.</p>
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
      <Footer locale={locale} page="remove-emoji-from-photo" />
    </>
  );
}
