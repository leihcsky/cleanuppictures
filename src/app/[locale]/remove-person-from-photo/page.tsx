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
  const canonicalUrl = absoluteCanonicalUrl(origin, locale, "remove-person-from-photo");
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
  const origin = getPublicSiteOriginNoSlash();
  const pageUrl = absoluteCanonicalUrl(origin, locale, "remove-person-from-photo");
  const homeCanonicalUrl = absoluteCanonicalUrl(origin, locale, "");
  const px = (remote: string) => getImageProxyHref(locale, remote);
  const cases = [
    {
      title: "Group photo — remove one person",
      desc: "Erase a single person from a formal or large group shot while keeping everyone else looking natural.",
      note: "Ideal for class photos, team pictures, and events where one face needs to disappear from the frame.",
      beforeUrl: px(publicCdnUrl("remove-people/sample1-remove-people-before.jpg")),
      afterUrl: px(publicCdnUrl("remove-people/sample1-remove-people-after.jpg"))
    },
    {
      title: "Friends group shot — remove someone",
      desc: "Take one person out of a casual friends photo when you need a cleaner crop or updated group image.",
      note: "Works for social posts and albums where you still want the scene to feel spontaneous and real.",
      beforeUrl: px(publicCdnUrl("remove-people/sample2-remove-people-before.jpg")),
      afterUrl: px(publicCdnUrl("remove-people/sample2-remove-people-after.jpg"))
    },
    {
      title: "Meeting room — remove an attendee",
      desc: "Remove one person from a conference or meeting photo for reports, decks, or internal comms.",
      note: "Handy when someone has left the team, privacy matters, or the slide needs a tighter group.",
      beforeUrl: px(publicCdnUrl("remove-people/sample3-remove-people-before.jpg")),
      afterUrl: px(publicCdnUrl("remove-people/sample3-remove-people-after.jpg"))
    }
  ];
  const faqItems = [
    {
      q: "Is this remove people from photo tool free?",
      a: "You can start for free and process common person removal edits online."
    },
    {
      q: "Can I remove someone from a group or class photo?",
      a: "Yes. Paint over the person you want gone—alone or together with others—and run removal. Multiple passes help in tight groups."
    },
    {
      q: "How do I get more natural edges after removing a person?",
      a: "Paint slightly beyond the subject boundary so AI gets enough nearby context to reconstruct textures naturally."
    },
    {
      q: "Does it work for meeting or office photos?",
      a: "Yes. It is useful for team pictures and conference shots when someone should not appear or you need a tighter group for slides."
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
      "description": "Remove people from photos online with AI for group shots, friend photos, and meeting scenes.",
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
      "description": "AI tool to remove a person from group photos, friend shots, and meeting images with natural background fill.",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "featureList": [
        "Remove one person from group and team photos",
        "Friend photos and meeting room cleanup",
        "Brush-based local editing",
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
        { "@type": "ListItem", "position": 2, "name": "Remove People from Photo", "item": pageUrl }
      ]
    }
  ];
  const homeModeHref = `${getLinkHref(locale, '')}?mode=person`;
  const relatedTools = [
    { label: "Object remover for photos", href: "object-remover-for-photos" },
    { label: "Remove text from images", href: "remove-text-from-images" },
    { label: "Remove shadow from photo", href: "remove-shadow" },
    { label: "Remove emoji from photo", href: "remove-emoji-from-photo" }
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <Header locale={locale} page="remove-person-from-photo" />
      <main className="bg-slate-50 pt-28">
        <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">Remove People from Photo Online</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl">
            Remove one or more people from photos in seconds with AI—group pictures, friend shots, meeting rooms, and busy backgrounds—with natural-looking fills.
          </p>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Great when someone should not appear in the final image, you need a cleaner team or class photo, or a presentation-ready picture without a reshoot.
          </p>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">BEFORE</p>
                  <img
                    src={cases[0].beforeUrl}
                    alt="Before remove person"
                    className="w-full h-56 object-contain object-center bg-slate-100 rounded-xl"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">AFTER</p>
                  <img
                    src={cases[0].afterUrl}
                    alt="After remove person"
                    className="w-full h-56 object-contain object-center bg-slate-100 rounded-xl"
                  />
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
                <p className="mt-2 text-sm text-slate-600">Upload a group photo, friends shot, meeting image, or any picture with people to edit. JPG, PNG, and WebP are supported.</p>
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
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Built for real group situations</h3><p className="mt-2 text-sm text-slate-600">From class and team photos to nights out and office meetings—remove who you need without rebuilding the whole shot.</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">Fast online editing</h3><p className="mt-2 text-sm text-slate-600">Upload, brush, process, and download in a simple browser flow.</p></div>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-3xl font-bold text-slate-900">Use cases and results</h2>
            <p className="mt-3 text-slate-600">See how group, social, and workplace photos look after removing one person from the frame.</p>
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
            <p className="mt-3 text-slate-600">Explore related cleanup tools for objects, text overlays, shadows, and emoji marks.</p>
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
      <Footer locale={locale} page="remove-person-from-photo" />
    </>
  );
}
