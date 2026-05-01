import Link from "next/link";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { getLinkHref, getImageProxyHref } from "~/configs/buildLink";
import { publicCdnUrl } from "~/libs/cdnPublic";
import { absoluteCanonicalUrl, getPublicSiteOriginNoSlash } from "~/libs/seoCanonical";
import UploadRedirectCard from "./UploadRedirectCard";

export async function generateMetadata({ params: { locale } }) {
  const brand = 'CleanupPictures';
  const origin = getPublicSiteOriginNoSlash();
  const canonicalUrl = absoluteCanonicalUrl(origin, locale, "remove-text-from-images");
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
  const origin = getPublicSiteOriginNoSlash();
  const pageUrl = absoluteCanonicalUrl(origin, locale, "remove-text-from-images");
  const homeCanonicalUrl = absoluteCanonicalUrl(origin, locale, "");
  const homeModeHref = `${getLinkHref(locale, '')}?mode=text`;
  const relatedTools = [
    { label: "Object remover for photos", href: "object-remover-for-photos" },
    { label: "Remove people from photo", href: "remove-person-from-photo" },
    { label: "Remove shadow from photo", href: "remove-shadow" },
    { label: "Remove emoji from photo", href: "remove-emoji-from-photo" }
  ];
  const px = (remote: string) => getImageProxyHref(locale, remote);
  const cases = [
    {
      title: "Apparel — remove printed words on clothing",
      desc: "Erase slogans, brand lines, or small print on shirts and jackets so the outfit photo looks cleaner.",
      note: "Great for lookbooks, resale listings, and social posts where you want the garment without distracting lettering.",
      beforeUrl: px(publicCdnUrl("remove-text/sample1-remove-text-before.jpg")),
      afterUrl: px(publicCdnUrl("remove-text/sample1-remove-text-after.jpg"))
    },
    {
      title: "Facades — remove house or door numbers",
      desc: "Take numbers or name plaques off doors and walls when you need a neutral exterior shot.",
      note: "Useful for privacy, generic stock-style shots, or cleaner real-estate and neighborhood visuals.",
      beforeUrl: px(publicCdnUrl("remove-text/sample2-remove-text-before.jpg")),
      afterUrl: px(publicCdnUrl("remove-text/sample2-remove-text-after.jpg"))
    },
    {
      title: "Travel photos — remove on-image text",
      desc: "Clean captions, stickers, or small signs from scenic shots while keeping the landscape natural.",
      note: "Handy for albums, blogs, and prints where you want the scene without extra typography.",
      beforeUrl: px(publicCdnUrl("remove-text/sample3-remove-text-before.jpg")),
      afterUrl: px(publicCdnUrl("remove-text/sample3-remove-text-after.jpg"))
    }
  ];
  const faqItems = [
    {
      q: "Is this remove text from images tool free?",
      a: "You can start for free and remove common text elements online."
    },
    {
      q: "What kind of text can I remove?",
      a: "You can remove print on clothing, house or door numbers, travel captions and small signs, plus logos and watermark-like overlays."
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
      "description": "Remove text from images online with AI for clothing prints, door numbers, and travel photo overlays.",
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
      "description": "AI tool to remove text on clothes, façades, and travel images with natural inpainting.",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "featureList": [
        "Remove text from images online",
        "Clothing prints, door numbers, travel text cleanup",
        "Brush-based local cleanup",
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
        { "@type": "ListItem", "position": 1, "name": brand, "item": homeCanonicalUrl },
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
            Remove unwanted text from images in seconds with AI—printing on clothes, numbers on doors, captions on travel shots, and more—while keeping fabrics, walls, and scenery looking natural.
          </p>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Ideal for fashion and resale photos, exterior and listing visuals, and travel content when typography gets in the way.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">BEFORE</p>
                  <img
                    src={cases[0].beforeUrl}
                    alt="Before remove text"
                    className="w-full h-56 object-contain object-center bg-slate-100 rounded-xl"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">AFTER</p>
                  <img
                    src={cases[0].afterUrl}
                    alt="After remove text"
                    className="w-full h-56 object-contain object-center bg-slate-100 rounded-xl"
                  />
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
                <p className="mt-2 text-sm text-slate-600">Paint over words on fabric, plaques, signs, or overlays and leave a thin margin around each block of text.</p>
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
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">From wardrobe to wanderlust</h3><p className="mt-2 text-sm text-slate-600">Fashion shots, building façades, and vacation frames—one workflow for local text cleanup.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Online and easy to use</h3><p className="mt-2 text-sm text-slate-600">No software install needed. Upload, brush, remove, and download in one flow.</p></div>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-3xl font-bold text-slate-900">Use cases and results</h2>
            <p className="mt-3 text-slate-600">See before and after examples for clothing, door numbers, and travel scenes.</p>
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
                          Start editing your image
                        </Link>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <img
                        src={item.beforeUrl}
                        alt={`${item.title} before`}
                        className="w-full h-48 object-contain object-center bg-slate-100 rounded-xl"
                      />
                      <img
                        src={item.afterUrl}
                        alt={`${item.title} after`}
                        className="w-full h-48 object-contain object-center bg-slate-100 rounded-xl"
                      />
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
          <section className="mt-14 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Related tools</h2>
            <p className="mt-3 text-slate-600">Need another cleanup flow? Jump to dedicated pages for objects, people, shadows, and emoji.</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={getLinkHref(locale, tool.href)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 hover:text-primary-700 hover:border-primary-300 transition-colors"
                >
                  {tool.label}
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link href={homeModeHref} className="inline-flex items-center rounded-full bg-primary-600 px-6 py-2.5 text-white font-semibold hover:bg-primary-700 transition-colors">
                Start editing your image
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer locale={locale} page="remove-text-from-images" />
    </>
  );
}
