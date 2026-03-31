import Link from "next/link";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { getLinkHref } from "~/configs/buildLink";

export async function generateMetadata({ params: { locale } }) {
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'CleanupPictures';
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/features` : `/${locale}/features`;
  const title = "AI Image Cleanup Features | Object, Text, People, Shadow";
  const description = "Explore detailed AI image cleanup modules for object, text, people, emoji, and shadow removal. Each feature includes examples and direct tool links.";
  return {
    title,
    description,
    keywords: [
      "ai image cleanup features",
      "object remover feature",
      "remove text from images",
      "remove people from photo",
      "remove emoji from photo",
      "remove shadow from photo"
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

export default function FeaturesPage({ params: { locale } }) {
  const modules = [
    {
      keyword: "Object Remover for Photos",
      title: "Remove unwanted objects from photos",
      desc: "Erase signs, clutter, wires, and distractions while keeping scene details natural and clean.",
      example: "Travel photos: remove street signs or random objects near landmarks.",
      outcome: "Result: cleaner composition that keeps attention on the main subject.",
      href: "object-remover-for-photos",
      cta: "Open Object Remover"
    },
    {
      keyword: "Remove Text from Images",
      title: "Clean text, labels, and watermarks",
      desc: "Brush over text overlays and let AI rebuild the background for cleaner content assets.",
      example: "Product visuals: remove labels, captions, and promo text overlays.",
      outcome: "Result: cleaner assets ready for listing pages and ad creatives.",
      href: "remove-text-from-images",
      cta: "Open Text Remover"
    },
    {
      keyword: "Remove People from Photo",
      title: "Delete tourists and background strangers",
      desc: "Remove distracting people from portraits, travel shots, and listing photos in a few steps.",
      example: "Destination shots: clear crowds behind the main subject.",
      outcome: "Result: stronger subject focus with less visual distraction.",
      href: "remove-person-from-photo",
      cta: "Open People Remover"
    },
    {
      keyword: "Remove Emoji from Photo",
      title: "Erase emoji and sticker overlays",
      desc: "Remove emoji marks and stickers from images while preserving surrounding texture.",
      example: "Social content: remove sticker overlays from reposted images.",
      outcome: "Result: cleaner visuals suitable for brand and campaign use.",
      href: "remove-emoji-from-photo",
      cta: "Open Emoji Remover"
    },
    {
      keyword: "Remove Shadow from Photo",
      title: "Reduce harsh shadows and dark cast",
      desc: "Fix uneven lighting and shadow-heavy areas for clearer portraits, products, and interiors.",
      example: "Portrait edits: soften hard side-light shadows on the face.",
      outcome: "Result: brighter and more balanced photos without heavy retouching.",
      href: "remove-shadow",
      cta: "Open Shadow Remover"
    }
  ];
  return (
    <>
      <Header locale={locale} page="features" />
      <main className="bg-slate-50 min-h-screen">
        <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">AI Image Cleanup Features</h1>
          <p className="mt-5 text-lg text-slate-600 max-w-4xl">One core editor with multiple cleanup modes. Explore each module below with targeted scenarios and direct links to start editing.</p>
          <section className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {modules.map((item) => (
              <article key={item.href} className="rounded-3xl bg-white border border-slate-200 p-7 shadow-sm">
                <p className="inline-flex rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">{item.keyword}</p>
                <h2 className="mt-4 text-2xl font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-3 text-slate-600 leading-relaxed">{item.desc}</p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">{item.example}</p>
                  <p className="mt-2 text-sm text-slate-500">{item.outcome}</p>
                </div>
                <div className="mt-6">
                  <Link href={getLinkHref(locale, item.href)} className="inline-flex items-center rounded-full bg-primary-600 px-6 py-2.5 text-white font-semibold hover:bg-primary-700 transition-colors">
                    {item.cta}
                  </Link>
                </div>
              </article>
            ))}
          </section>
          <div className="mt-14 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Use one simple process across all modules</h2>
            <p className="mt-3 text-slate-600">Upload your image, brush over the area you want to remove, run AI cleanup, then export as JPG, PNG, or WebP.</p>
            <div className="mt-5">
              <Link href={getLinkHref(locale, '')} className="inline-flex items-center rounded-full bg-slate-900 px-7 py-3 text-white font-semibold hover:bg-slate-800 transition-colors">
                Open Main Tool
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} page="features" />
    </>
  );
}
