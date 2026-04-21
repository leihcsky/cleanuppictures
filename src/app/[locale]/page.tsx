import RemoveShadowTool from "~/components/RemoveShadowTool";
import { isHttpsUrlAllowedForSampleProxy } from "~/lib/sampleImageAllowlist";
import { absoluteCanonicalUrl, getPublicSiteOriginNoSlash } from "~/libs/seoCanonical";

export const revalidate = 120;
export async function generateMetadata({ params: { locale = '' } }) {
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);
  const brand = 'Pic Cleaner';
  const origin = getPublicSiteOriginNoSlash();
  const title = "Photo Cleanup Tool Online | AI Image Cleaner by Pic Cleaner";
  const description = "Remove unwanted objects and distractions from photos online in a few clicks. Upload, brush the area, and download clean results in JPG, PNG, or WebP.";
  const canonicalUrl = absoluteCanonicalUrl(origin, locale, "");
    return {
      title,
      description,
      keywords: [
        'ai image cleanup',
        'ai photo cleanup tool',
        'object remover for photos',
        'remove unwanted objects from photos',
        'online photo retouch tool',
        'image cleanup online',
        'inpainting tool online',
        'remove distractions from photos',
        'photo cleanup tool',
        'cleanup pictures'
      ],
      alternates: {
        canonical: canonicalUrl
      },
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
export default async function IndexPage({ params: { locale = '' }, searchParams }) {
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);
  const languageModule = await import('~/i18n/languageText');
  const removeShadowText = await languageModule.getRemoveShadowPageText();

  const pageText = {
    ...removeShadowText,
    h1: "Photo Cleanup Tool to Remove Distractions Instantly",
    description: "Clean up your photos in seconds. Remove distractions with a simple brush and get natural-looking results.",
    aboutTitle: "About the AI Image Cleanup Tool",
    aboutDesc: "This AI photo cleanup tool is your main workspace for photo cleanup. Upload an image, paint over what you want gone, and get a clean result that still looks natural.",
    featureTitle: "Why people like this tool",
    featureDesc: "This AI photo cleanup tool is easy to use, fast to run, and gives you clear before-and-after feedback so you can fine-tune results quickly.",
    useCasesTitle: "Use-cases",
    useCasesDesc: "• **Photographers**: remove tourists, wires, distractions.\n• **Creative Agencies**: clean assets for campaigns and social.\n• **Real Estate**: tidy room photos for better presentation.\n• **E-commerce**: remove defects, labels, or reflections.",
    sampleTitle: "Before / After Examples",
    sampleDesc: "Try real examples and see how the tool handles objects, people, emoji/text overlays, and shadows.",
    sample1Title: "Content Creators: Clean Text in Shots",
    sample1Desc: "Remove door numbers and unwanted text overlays so reels, shorts, and thumbnails look cleaner and more focused.",
    sample2Title: "Marketing Teams: Product Visual Cleanup",
    sample2Desc: "Erase price tags and distracting labels to deliver campaign-ready product images with a cleaner brand look.",
    sample3Title: "Real Estate Teams: Room Detail Cleanup",
    sample3Desc: "Remove small interior distractions like tissue boxes and clutter to keep listing photos neat and professional.",
    sample4Title: "Ecommerce Sellers: Remove Emoji/Sticker Marks",
    sample4Desc: "Clean sticker or emoji marks from product photos to keep catalog images consistent, clear, and conversion-friendly.",
    faq1Q: "What is an AI photo cleanup tool?",
    faq1A: "An AI photo cleanup tool removes unwanted distractions from photos. You can erase objects, people, text overlays, shadows, glare, and other visual clutter by painting over the area.",
    faq2Q: "Do I need Photoshop skills?",
    faq2A: "No. Just upload your photo, brush the part you want to remove, and click run.",
    faq3Q: "Can I edit high-resolution photos?",
    faq3A: "Yes. You can upload and edit large images. Export quality depends on your selected mode and plan.",
    faq4Q: "How do I get better cleanup results?",
    faq4A: "Brush a little beyond the unwanted area, including edges, to help the tool blend the result more naturally.",
    faq5Q: "Is this good for ecommerce and real estate?",
    faq5A: "Yes. Common uses include removing tourists, wires, logos, reflections, and small defects from listing and product photos.",
    faq6Q: "Are my images kept private?",
    faq6A: "Images are processed only for editing and are not published publicly by default.",
    faq7Q: "What formats can I export?",
    faq7A: "You can export cleaned images as PNG, JPG, or WebP.",
    removeWhatTitle: "What can you remove?",
    removeItems: [
      { label: "ai object cleanup", href: "object-remover-for-photos" },
      { label: "ai person removal", href: "remove-person-from-photo" },
      { label: "ai text cleanup", href: "remove-text-from-images" },
      { label: "ai shadow cleanup", href: "remove-shadow" },
      { label: "ai emoji cleanup", href: "remove-emoji-from-photo" }
    ]
  };
  const toolText = await languageModule.getToolPageText();
  const modeRaw = Array.isArray(searchParams?.mode) ? searchParams.mode[0] : searchParams?.mode;
  const initialMode = ['object', 'person', 'text', 'shadow', 'glare'].includes(String(modeRaw || '').toLowerCase())
    ? String(modeRaw).toLowerCase()
    : 'object';
  const sampleRaw = Array.isArray(searchParams?.sample) ? searchParams.sample[0] : searchParams?.sample;
  let initialLandingSampleUrl: string | null = null;
  if (typeof sampleRaw === 'string' && sampleRaw.trim()) {
    try {
      const candidate = decodeURIComponent(sampleRaw.trim());
      if (isHttpsUrlAllowedForSampleProxy(candidate)) initialLandingSampleUrl = candidate;
    } catch {
      /* ignore malformed sample param */
    }
  }
  const brand = 'Pic Cleaner';
  const origin = getPublicSiteOriginNoSlash();
  const pageUrl = absoluteCanonicalUrl(origin, locale, "");
  const faqData = [
    { q: pageText.faq1Q, a: pageText.faq1A },
    { q: pageText.faq2Q, a: pageText.faq2A },
    { q: pageText.faq3Q, a: pageText.faq3A },
    { q: pageText.faq4Q, a: pageText.faq4A },
    { q: pageText.faq5Q, a: pageText.faq5A },
    { q: pageText.faq6Q, a: pageText.faq6A },
    { q: pageText.faq7Q, a: pageText.faq7A }
  ].filter((item) => item.q && item.a);
  const homeSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": brand,
      "url": pageUrl,
      "inLanguage": locale
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI Photo Cleanup Tool",
      "description": pageText.description,
      "applicationCategory": "PhotographyApplication",
      "operatingSystem": "Web",
      "url": pageUrl,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "featureList": [
        "Object remover for photos",
        "Simple brush editing",
        "Before and after preview",
        "Export as JPG, PNG, WebP"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqData.map((faq) => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": { "@type": "Answer", "text": faq.a }
      }))
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }} />
      <RemoveShadowTool
        locale={locale}
        pageName=""
        pageText={pageText}
        toolText={toolText}
        initialMode={initialMode}
        initialLandingSampleUrl={initialLandingSampleUrl}
      />
    </>
  )
}
