'use client'
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import {useCommonContext} from "~/context/common-context";
import Link from "next/link";
import {getLinkHref} from "~/configs/buildLink";
import {useEffect, useMemo, useState, useRef} from "react";
import Script from "next/script";
import { ArrowUpOnSquareIcon, SparklesIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

export default function PageComponent({
  locale,
  indexText,
  toolText
}) {
  const { setShowLoadingModal } = useCommonContext();

  useEffect(() => {
    setShowLoadingModal(false);
  }, []);

  const checkPageAndLoading = (toPage) => {
    setShowLoadingModal(true);
  }

  const Comparison = ({
    leftLabel,
    rightLabel
  }) => {
    const [pos, setPos] = useState(50);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const animRef = useRef<number | null>(null);
    const dirRef = useRef(1);
    const onDrag = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.type.includes('touch') ? (e.touches?.[0]?.clientX || 0) : e.clientX;
      const rel = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      setPos(Math.round(rel * 100));
    };
    const startDrag = (e) => {
      onDrag(e);
      stopAnim();
      window.addEventListener('mousemove', onDrag as any);
      window.addEventListener('touchmove', onDrag as any, { passive: false });
      const end = () => {
        window.removeEventListener('mousemove', onDrag as any);
        window.removeEventListener('touchmove', onDrag as any);
        window.removeEventListener('mouseup', end);
        window.removeEventListener('touchend', end);
      };
      window.addEventListener('mouseup', end);
      window.addEventListener('touchend', end);
    };
    const startAnim = () => {
      if (animRef.current) return;
      animRef.current = window.setInterval(() => {
        setPos((p) => {
          const next = p + dirRef.current * 2;
          if (next > 85) {
            dirRef.current = -1;
            return 85;
          }
          if (next < 15) {
            dirRef.current = 1;
            return 15;
          }
          return next;
        });
      }, 30);
    };
    const stopAnim = () => {
      if (animRef.current) {
        window.clearInterval(animRef.current);
        animRef.current = null;
      }
    };
    const styleLeft = useMemo(() => ({ width: `${pos}%` }), [pos]);
    const sliderStyle = useMemo(() => ({ left: `${pos}%` }), [pos]);
    return (
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-2xl shadow-md select-none"
        onMouseEnter={startAnim}
        onMouseLeave={stopAnim}
      >
        <div className="relative h-80 sm:h-96">
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <p className="text-slate-500 text-sm">{rightLabel}</p>
          </div>
          <div className="absolute inset-0 overflow-hidden" style={styleLeft}>
            <div className="h-full w-full bg-gray-100 flex items-center justify-center">
              <p className="text-slate-500 text-sm">{leftLabel}</p>
            </div>
          </div>
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-md cursor-col-resize"
            style={sliderStyle}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2/3 accent-[#0071e3]"
          />
        </div>
      </div>
    );
  };
  const Carousel = () => {
    const slides = useMemo(() => ([
      { key: 'color', title: indexText.toolColorTitle, left: 'Before: Colored background', right: 'After: Transparent (PNG/WebP)' },
      { key: 'shadow', title: indexText.toolShadowTitle, left: 'Before: Strong shadow', right: 'After: Shadow removed' },
      { key: 'emoji', title: indexText.toolEmojiTitle, left: 'Before: Sticker overlay', right: 'After: Sticker removed' },
    ]), [indexText]);
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const prev = () => setCurrent((v) => (v + slides.length - 1) % slides.length);
    const next = () => setCurrent((v) => (v + 1) % slides.length);
    useEffect(() => {
      const timer = window.setInterval(() => {
        if (!paused) {
          setCurrent((v) => (v + 1) % slides.length);
        }
      }, 3500);
      return () => window.clearInterval(timer);
    }, [paused, slides.length]);
    return (
      <div className="mt-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{slides[current].title}</h3>
        </div>
        <Comparison leftLabel={slides[current].left} rightLabel={slides[current].right} />
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={prev} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Prev</button>
          <button onClick={next} className="rounded-full bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ed]">Next</button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1">
          {slides.map((_, idx) => (
            <span key={idx} className={idx === current ? 'h-2 w-2 rounded-full bg-[#0071e3]' : 'h-2 w-2 rounded-full bg-slate-300'} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <Header locale={locale} page={''} />
      <Script
        id="homepage-ld-json"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify((() => {
            const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'CleanupPictures';
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const url = origin ? `${origin}/${locale}` : `/${locale}`;
            const desc = (indexText.description || '').replace(/%brand%/g, brand);
            return [
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": brand,
                "url": url,
                "inLanguage": locale
              },
              {
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": brand,
                "applicationCategory": "MultimediaApplication",
                "operatingSystem": "Web",
                "url": url,
                "description": desc,
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                }
              }
            ];
          })())
        }}
      />
      <Script
        id="homepage-faq-ld-json"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify((() => {
            const faqs = [
              { q: indexText.faq1Question, a: indexText.faq1Answer },
              { q: indexText.faq2Question, a: indexText.faq2Answer },
              { q: indexText.faq3Question, a: indexText.faq3Answer },
              { q: indexText.faq4Question, a: indexText.faq4Answer },
              { q: indexText.faq5Question, a: indexText.faq5Answer },
              { q: indexText.faq6Question, a: indexText.faq6Answer },
              { q: indexText.faq7Question, a: indexText.faq7Answer },
            ].filter(f => f.q && f.a);
            if (!faqs.length) return null;
            return {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map(f => ({
                "@type": "Question",
                "name": f.q,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": f.a
                }
              }))
            };
          })())
        }}
      />
      <main className="isolate bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="px-6 pt-40 pb-12 lg:px-8 lg:pt-48">
          <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="text-left">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                {indexText.h1Text}
              </h1>
              <p className="mt-4 text-base sm:text-lg leading-7 text-slate-600">
                {indexText.descriptionBelowH1Text}
              </p>
              <div className="mt-8 flex items-center gap-x-4">
                <Link
                  href="#tools"
                  className="rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#005fc2]"
                >
                  {indexText.startCleaning}
                </Link>
                <Link
                  href={getLinkHref(locale, 'remove-color')}
                  onClick={() => checkPageAndLoading('remove-color')}
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {indexText.toolColorTitle}
                </Link>
              </div>
            </div>
            <div className="relative w-full aspect-[16/10] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 shadow-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">Hero 图片占位</p>
                  <p className="text-xs text-slate-500 mt-1">建议尺寸：1600×1000（JPG/PNG/WebP，72dpi）</p>
                  <p className="text-xs text-slate-500">作用：展示工具效果（前后对比、透明背景）</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{indexText.removeWhatTitle}</h2>
            <p className="mt-2 text-sm text-gray-600">{indexText.removeWhatDesc}</p>
          </div>
          <Carousel />
        </div>

        <div id="tools" className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{indexText.toolsTitle}</h2>
          </div>
          <section className="mt-12 flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <h3 className="text-2xl font-bold text-slate-900 mb-3">{indexText.toolColorTitle}</h3>
              <p className="text-slate-600 mb-6">{indexText.toolColorDesc}</p>
              <ul className="mb-6 space-y-2">
                <li className="text-sm text-slate-600">• {toolText.tolTip}</li>
                <li className="text-sm text-slate-600">• {toolText.refineTip}</li>
                <li className="text-sm text-slate-600">• {toolText.autoRefineTip}</li>
              </ul>
              <Link href={getLinkHref(locale, 'remove-color')} onClick={() => checkPageAndLoading('remove-color')} className="rounded-full bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ed]">
                Try Now
              </Link>
            </div>
            <div className="lg:w-1/2 w-full">
              <Comparison leftLabel="Original Image (1280×800 PNG/JPG)" rightLabel="Processed Image (1280×800 Transparent PNG/WebP)" />
            </div>
          </section>
          <section className="mt-16 flex flex-col-reverse lg:flex-row items-center gap-12">
            <div className="lg:w-1/2 w-full">
              <Comparison leftLabel="Original Image (1280×800 PNG/JPG)" rightLabel="Processed Image (1280×800 Transparent PNG/WebP)" />
            </div>
            <div className="lg:w-1/2">
              <h3 className="text-2xl font-bold text-slate-900 mb-3">{indexText.toolShadowTitle}</h3>
              <p className="text-slate-600 mb-6">{indexText.toolShadowDesc}</p>
              <ul className="mb-6 space-y-2">
                <li className="text-sm text-slate-600">• {indexText.why3Title}</li>
                <li className="text-sm text-slate-600">• {indexText.why1Title}</li>
              </ul>
              <Link href={getLinkHref(locale, 'remove-shadow')} onClick={() => checkPageAndLoading('remove-shadow')} className="rounded-full bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ed]">
                Try Now
              </Link>
            </div>
          </section>
          <section className="mt-16 flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <h3 className="text-2xl font-bold text-slate-900 mb-3">{indexText.toolEmojiTitle}</h3>
              <p className="text-slate-600 mb-6">{indexText.toolEmojiDesc}</p>
              <ul className="mb-6 space-y-2">
                <li className="text-sm text-slate-600">• {indexText.why3Title}</li>
                <li className="text-sm text-slate-600">• {indexText.why2Title}</li>
              </ul>
              <Link href={getLinkHref(locale, 'remove-emoji')} onClick={() => checkPageAndLoading('remove-emoji')} className="rounded-full bg-[#0071e3] px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ed]">
                Try Now
              </Link>
            </div>
            <div className="lg:w-1/2 w-full">
              <Comparison leftLabel="Original Image (1280×800 PNG/JPG)" rightLabel="Processed Image (1280×800 Transparent PNG/WebP)" />
            </div>
          </section>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{indexText.howTitleHome}</h2>
              <ul className="mt-6 space-y-4">
                <li className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <ArrowUpOnSquareIcon className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-base leading-7 text-gray-900">{toolText.step1}</p>
                      <p className="text-sm leading-6 text-gray-600">{toolText.step1Sub}</p>
                    </div>
                  </div>
                </li>
                <li className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <SparklesIcon className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-base leading-7 text-gray-900">{toolText.step2}</p>
                      <p className="text-sm leading-6 text-gray-600">{toolText.step2Sub}</p>
                    </div>
                  </div>
                </li>
                <li className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <ArrowDownTrayIcon className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-base leading-7 text-gray-900">{toolText.step3}</p>
                      <p className="text-sm leading-6 text-gray-600">{toolText.step3Sub}</p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative w-full aspect-[16/10] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 shadow-lg overflow-hidden">
              <img src="/top_blurred.png" alt="How to Use" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <div className="bg-slate-50 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{indexText.usersTitle}</h2>
            </div>
            <div className="mx-auto mt-12 max-w-4xl grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[
                { name: 'Ecom', text: indexText.user1, initials: 'EC' },
                { name: 'Design', text: indexText.user2, initials: 'DM' },
                { name: 'Social', text: indexText.user3, initials: 'SC' },
                { name: 'Education', text: indexText.user4, initials: 'ED' },
                { name: 'Dev', text: indexText.user5, initials: 'DV', wide: true },
              ].map((u, i) => (
                <div key={i} className={`rounded-2xl bg-white p-6 border border-slate-200 shadow-sm ${u.wide ? 'sm:col-span-2' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                      {u.initials}
                    </div>
                    <p className="text-base leading-7 text-gray-700">“{u.text}”</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 py-16 sm:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{indexText.whyTitle}</h2>
              </div>
              <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                  <div className="flex flex-col items-center text-center">
                    <dt className="flex flex-col items-center text-xl font-semibold leading-7 text-gray-900">
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                             <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                             </svg>
                        </div>
                      {indexText.why1Title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                      <p className="flex-auto">{indexText.why1Desc}</p>
                    </dd>
                  </div>
                   <div className="flex flex-col items-center text-center">
                    <dt className="flex flex-col items-center text-xl font-semibold leading-7 text-gray-900">
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                      {indexText.why2Title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                      <p className="flex-auto">{indexText.why2Desc}</p>
                    </dd>
                  </div>
                   <div className="flex flex-col items-center text-center">
                    <dt className="flex flex-col items-center text-xl font-semibold leading-7 text-gray-900">
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
                            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                            </svg>
                        </div>
                      {indexText.why3Title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                      <p className="flex-auto">{indexText.why3Desc}</p>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
        </div>

         <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{indexText.faqTitle}</h2>
            <p className="mt-2 text-sm text-gray-600">{indexText.faqSubtitle}</p>
          </div>
           <div className="mx-auto mt-12 max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: indexText.faq1Question, a: indexText.faq1Answer },
              { q: indexText.faq2Question, a: indexText.faq2Answer },
              { q: indexText.faq3Question, a: indexText.faq3Answer },
              { q: indexText.faq4Question, a: indexText.faq4Answer },
              { q: indexText.faq5Question, a: indexText.faq5Answer },
              { q: indexText.faq6Question, a: indexText.faq6Answer },
              { q: indexText.faq7Question, a: indexText.faq7Answer },
            ].filter(f => f.q && f.a).map((faq, index) => (
              <div key={index} className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
                <dt className="text-lg font-semibold leading-7 text-gray-900">{faq.q}</dt>
                <dd className="mt-3">
                  <p className="text-base leading-7 text-gray-600">{faq.a}</p>
                </dd>
              </div>
            ))}
           </div>
        </div>

      </main>
      <Footer locale={locale} page={''} />
    </>
  )
}
