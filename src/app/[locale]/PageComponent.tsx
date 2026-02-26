'use client'
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import {useCommonContext} from "~/context/common-context";
import Link from "next/link";
import {getLinkHref} from "~/configs/buildLink";
import {useEffect, useMemo, useState, useRef} from "react";
import Script from "next/script";
import { ArrowUpOnSquareIcon, SparklesIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import ComparisonSlider from "~/components/ComparisonSlider";

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

  const Comparison = ComparisonSlider;

  const Carousel = () => {
    const slides = useMemo(() => ([
      { 
        key: 'color', 
        title: indexText.toolColorTitle, 
        beforeUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-original.jpg',
        afterUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-result.png'
      },
      { 
        key: 'shadow', 
        title: indexText.toolShadowTitle, 
        beforeUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/shadow-original.jpg',
        afterUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/shadow-result.png'
      },
      { 
        key: 'emoji', 
        title: indexText.toolEmojiTitle, 
        beforeUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeemoji/emoji-original.jpg',
        afterUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeemoji/emoji-result.png'
      },
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
      <div className="mt-8 relative z-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-slate-800">{slides[current].title}</h3>
        </div>
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-2 shadow-2xl ring-1 ring-slate-200/60">
            <Comparison beforeUrl={slides[current].beforeUrl} afterUrl={slides[current].afterUrl} />
        </div>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={prev} className="rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white hover:text-primary-600 transition-all shadow-sm">Prev</button>
          <button onClick={next} className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/30 hover:bg-primary-500 hover:shadow-primary-500/40 transition-all">Next</button>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => setCurrent(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${idx === current ? 'w-8 bg-primary-600' : 'w-2.5 bg-slate-300 hover:bg-primary-300'}`} 
              aria-label={`Go to slide ${idx + 1}`}
            />
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
      <main className="relative isolate bg-slate-50 overflow-hidden min-h-screen">
        {/* Background Gradients/Blobs for Glassmorphism */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-200/40 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-secondary-200/30 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="px-6 pt-32 pb-16 lg:px-8 lg:pt-40">
          <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-left relative z-10">
              <div className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-sm font-medium text-primary-600 mb-6 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-primary-600 mr-2"></span>
                New: AI Shadow Removal
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                {indexText.h1Text}
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600 max-w-lg">
                {indexText.descriptionBelowH1Text}
              </p>
              <div className="mt-10 flex items-center gap-x-4">
                <Link
                  href="#tools"
                  className="rounded-full bg-cta-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cta-500/30 hover:bg-cta-600 hover:shadow-cta-500/40 transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  {indexText.startCleaning}
                </Link>
                <Link
                  href={getLinkHref(locale, 'remove-color')}
                  onClick={() => checkPageAndLoading('remove-color')}
                  className="rounded-full bg-white/80 backdrop-blur-md border border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm hover:bg-white hover:text-primary-600 transition-all duration-300"
                >
                  {indexText.toolColorTitle}
                </Link>
              </div>
            </div>
            <div className="relative w-full aspect-[16/10] rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-2xl overflow-hidden group transition-all duration-500 hover:shadow-primary-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 z-0" />
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center p-8">
                  <div className="mx-auto w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                     <SparklesIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Hero Image Placeholder</p>
                  <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">Upload an image to see the magic. Supports JPG, PNG, WebP.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-12">
          {/* Decorative background for features */}
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary-100/40 rounded-full blur-[100px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary-100/40 rounded-full blur-[80px] -z-10 pointer-events-none" />

          <div className="mx-auto max-w-2xl text-center relative z-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{indexText.removeWhatTitle}</h2>
            <p className="mt-4 text-lg text-slate-600">{indexText.removeWhatDesc}</p>
          </div>
          <Carousel />
        </div>

        <div id="tools" className="relative mx-auto max-w-7xl px-6 lg:px-8 py-20 sm:py-32">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="text-primary-600 font-semibold tracking-wide uppercase text-sm">Powerful Features</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{indexText.toolsTitle}</h2>
          </div>
          
          <section className="group relative rounded-3xl bg-white/60 backdrop-blur-md border border-white/50 shadow-xl p-8 lg:p-12 mb-24 transition-all hover:shadow-2xl hover:bg-white/70">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <div className="inline-flex items-center rounded-lg bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700 mb-4">
                  Most Popular
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">{indexText.toolColorTitle}</h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">{indexText.toolColorDesc}</p>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-cta-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {toolText.tolTip}
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-cta-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {toolText.refineTip}
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-cta-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {toolText.autoRefineTip}
                  </li>
                </ul>
                <Link href={getLinkHref(locale, 'remove-color')} onClick={() => checkPageAndLoading('remove-color')} className="inline-flex items-center justify-center rounded-full bg-cta-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-cta-500/30 hover:bg-cta-600 hover:shadow-cta-500/40 transition-all duration-300 transform hover:-translate-y-0.5">
                  Try Now <span className="ml-2">→</span>
                </Link>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="rounded-2xl p-2 bg-white shadow-xl ring-1 ring-slate-100 transform transition-transform hover:scale-[1.01] duration-500">
                  <Comparison 
                    beforeUrl="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-original.jpg" 
                    afterUrl="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-result.png" 
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="group relative rounded-3xl bg-white/60 backdrop-blur-md border border-white/50 shadow-xl p-8 lg:p-12 mb-24 transition-all hover:shadow-2xl hover:bg-white/70">
             <div className="flex flex-col-reverse lg:flex-row items-center gap-12">
              <div className="lg:w-1/2 w-full">
                <div className="rounded-2xl p-2 bg-white shadow-xl ring-1 ring-slate-100 transform transition-transform hover:scale-[1.01] duration-500">
                  <Comparison 
                    beforeUrl="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/shadow-original.jpg" 
                    afterUrl="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/shadow-result.png" 
                  />
                </div>
              </div>
              <div className="lg:w-1/2">
                <h3 className="text-3xl font-bold text-slate-900 mb-4">{indexText.toolShadowTitle}</h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">{indexText.toolShadowDesc}</p>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-cta-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {indexText.why3Title}
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-cta-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {indexText.why1Title}
                  </li>
                </ul>
                <Link href={getLinkHref(locale, 'remove-shadow')} onClick={() => checkPageAndLoading('remove-shadow')} className="inline-flex items-center justify-center rounded-full bg-cta-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-cta-500/30 hover:bg-cta-600 hover:shadow-cta-500/40 transition-all duration-300 transform hover:-translate-y-0.5">
                  Try Now <span className="ml-2">→</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="group relative rounded-3xl bg-white/60 backdrop-blur-md border border-white/50 shadow-xl p-8 lg:p-12 transition-all hover:shadow-2xl hover:bg-white/70">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-1/2">
                <h3 className="text-3xl font-bold text-slate-900 mb-4">{indexText.toolEmojiTitle}</h3>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">{indexText.toolEmojiDesc}</p>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-cta-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {indexText.why3Title}
                  </li>
                  <li className="flex items-center text-slate-700">
                    <svg className="w-5 h-5 text-cta-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {indexText.why2Title}
                  </li>
                </ul>
                <Link href={getLinkHref(locale, 'remove-emoji')} onClick={() => checkPageAndLoading('remove-emoji')} className="inline-flex items-center justify-center rounded-full bg-cta-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-cta-500/30 hover:bg-cta-600 hover:shadow-cta-500/40 transition-all duration-300 transform hover:-translate-y-0.5">
                  Try Now <span className="ml-2">→</span>
                </Link>
              </div>
              <div className="lg:w-1/2 w-full">
                <div className="rounded-2xl p-2 bg-white shadow-xl ring-1 ring-slate-100 transform transition-transform hover:scale-[1.01] duration-500">
                  <Comparison 
                    beforeUrl="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeemoji/emoji-original.jpg" 
                    afterUrl="https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeemoji/emoji-result.png" 
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24 relative">
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary-100/30 rounded-full blur-[100px] -z-10 pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center rounded-lg bg-primary-50 px-3 py-1 text-sm font-medium text-primary-600 mb-6">
                Simple Workflow
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-8">{indexText.howTitleHome}</h2>
              <ul className="space-y-6">
                <li className="group relative rounded-2xl bg-white/60 backdrop-blur-md p-6 border border-white/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-300">
                      <ArrowUpOnSquareIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900 mb-1">{toolText.step1}</p>
                      <p className="text-sm leading-6 text-slate-600">{toolText.step1Sub}</p>
                    </div>
                  </div>
                </li>
                <li className="group relative rounded-2xl bg-white/60 backdrop-blur-md p-6 border border-white/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-300">
                      <SparklesIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900 mb-1">{toolText.step2}</p>
                      <p className="text-sm leading-6 text-slate-600">{toolText.step2Sub}</p>
                    </div>
                  </div>
                </li>
                <li className="group relative rounded-2xl bg-white/60 backdrop-blur-md p-6 border border-white/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-300">
                      <ArrowDownTrayIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900 mb-1">{toolText.step3}</p>
                      <p className="text-sm leading-6 text-slate-600">{toolText.step3Sub}</p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative w-full aspect-[16/10] rounded-2xl bg-white/30 backdrop-blur-xl border border-white/50 shadow-2xl overflow-hidden group hover:shadow-primary-500/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 mix-blend-overlay" />
              <img src="/top_blurred.png" alt="How to Use" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
            </div>
          </div>
        </div>

        <div className="py-16 sm:py-24 relative">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary-100/30 rounded-full blur-[100px] -z-10 pointer-events-none" />
          
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{indexText.usersTitle}</h2>
            </div>
            <div className="mx-auto mt-12 max-w-4xl grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[
                { name: 'Ecom', text: indexText.user1, initials: 'EC' },
                { name: 'Design', text: indexText.user2, initials: 'DM' },
                { name: 'Social', text: indexText.user3, initials: 'SC' },
                { name: 'Education', text: indexText.user4, initials: 'ED' },
                { name: 'Dev', text: indexText.user5, initials: 'DV', wide: true },
              ].map((u, i) => (
                <div key={i} className={`rounded-2xl bg-white/60 backdrop-blur-md p-8 border border-white/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${u.wide ? 'sm:col-span-2' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold shadow-md shadow-primary-500/20">
                      {u.initials}
                    </div>
                    <div>
                       <p className="text-lg leading-relaxed text-slate-700 italic">“{u.text}”</p>
                       <p className="mt-2 text-sm font-semibold text-primary-600">{u.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="py-16 sm:py-24 relative">
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-primary-50/50 rounded-full blur-[120px] -z-10 pointer-events-none" />
            
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{indexText.whyTitle}</h2>
              </div>
              <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                  <div className="flex flex-col items-center text-center group">
                    <dt className="flex flex-col items-center text-xl font-semibold leading-7 text-slate-900">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-primary-500/10 text-primary-600 group-hover:scale-110 transition-transform duration-300">
                             <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                             </svg>
                        </div>
                      {indexText.why1Title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                      <p className="flex-auto">{indexText.why1Desc}</p>
                    </dd>
                  </div>
                   <div className="flex flex-col items-center text-center group">
                    <dt className="flex flex-col items-center text-xl font-semibold leading-7 text-slate-900">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-primary-500/10 text-primary-600 group-hover:scale-110 transition-transform duration-300">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                      {indexText.why2Title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                      <p className="flex-auto">{indexText.why2Desc}</p>
                    </dd>
                  </div>
                   <div className="flex flex-col items-center text-center group">
                    <dt className="flex flex-col items-center text-xl font-semibold leading-7 text-slate-900">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-primary-500/10 text-primary-600 group-hover:scale-110 transition-transform duration-300">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                            </svg>
                        </div>
                      {indexText.why3Title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                      <p className="flex-auto">{indexText.why3Desc}</p>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
        </div>

         <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 sm:py-24 relative">
          {/* Decorative background for FAQ */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-secondary-100/20 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{indexText.faqTitle}</h2>
            <p className="mt-4 text-lg text-slate-600">{indexText.faqSubtitle}</p>
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
              <div key={index} className="group rounded-2xl bg-white/60 backdrop-blur-md p-8 border border-white/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <dt className="text-lg font-bold leading-7 text-slate-900 flex items-start">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-sm mr-3 mt-0.5">Q</span>
                  {faq.q}
                </dt>
                <dd className="mt-3 pl-9">
                  <p className="text-base leading-7 text-slate-600">{faq.a}</p>
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
