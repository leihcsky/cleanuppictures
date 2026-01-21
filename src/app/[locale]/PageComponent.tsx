'use client'
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import {useCommonContext} from "~/context/common-context";
import Link from "next/link";
import {getLinkHref} from "~/configs/buildLink";
import {useEffect} from "react";

export default function PageComponent({
  locale,
  indexText
}) {
  const { setShowLoadingModal } = useCommonContext();

  useEffect(() => {
    setShowLoadingModal(false);
  }, []);

  const checkPageAndLoading = (toPage) => {
    setShowLoadingModal(true);
  }

  return (
    <>
      <Header locale={locale} page={''} />
      <main className="isolate bg-white">
        {/* Hero Section */}
        <div className="relative isolate px-6 pt-32 lg:px-8">
            <div
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
                aria-hidden="true"
            >
                <div
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                />
            </div>
          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                {indexText.h1Text}
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                {indexText.descriptionBelowH1Text}
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="#tools"
                  className="rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  {indexText.startCleaning}
                </Link>
              </div>
            </div>
          </div>
            <div
                className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
                aria-hidden="true"
            >
                <div
                    className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                />
            </div>
        </div>

        {/* Tools Section */}
        <div id="tools" className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{indexText.toolsTitle}</h2>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {/* Tool 1: Remove Color */}
             <article className="flex flex-col items-start justify-between p-8 bg-white rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="group relative w-full">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50">
                      <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                      </svg>
                  </div>
                <h3 className="text-xl font-bold leading-6 text-gray-900 group-hover:text-indigo-600">
                  <Link href={getLinkHref(locale, 'remove-color')} onClick={() => checkPageAndLoading('remove-color')}>
                    <span className="absolute inset-0" />
                    {indexText.toolColorTitle}
                  </Link>
                </h3>
                <p className="mt-4 text-base leading-6 text-gray-600">{indexText.toolColorDesc}</p>
              </div>
            </article>
            {/* Tool 2: Remove Shadow */}
            <article className="flex flex-col items-start justify-between p-8 bg-white rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="group relative w-full">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50">
                    <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold leading-6 text-gray-900 group-hover:text-indigo-600">
                  <Link href={getLinkHref(locale, 'remove-shadow')} onClick={() => checkPageAndLoading('remove-shadow')}>
                    <span className="absolute inset-0" />
                    {indexText.toolShadowTitle}
                  </Link>
                </h3>
                <p className="mt-4 text-base leading-6 text-gray-600">{indexText.toolShadowDesc}</p>
              </div>
            </article>
            {/* Tool 3: Remove Emoji */}
             <article className="flex flex-col items-start justify-between p-8 bg-white rounded-3xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="group relative w-full">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50">
                      <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                      </svg>
                  </div>
                <h3 className="text-xl font-bold leading-6 text-gray-900 group-hover:text-indigo-600">
                  <Link href={getLinkHref(locale, 'remove-emoji')} onClick={() => checkPageAndLoading('remove-emoji')}>
                    <span className="absolute inset-0" />
                    {indexText.toolEmojiTitle}
                  </Link>
                </h3>
                <p className="mt-4 text-base leading-6 text-gray-600">{indexText.toolEmojiDesc}</p>
              </div>
            </article>
          </div>
        </div>

        {/* Why Section */}
        <div className="bg-gray-50 py-24 sm:py-32">
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

        {/* FAQ Section */}
         <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{indexText.faqTitle}</h2>
          </div>
           <div className="mx-auto mt-16 max-w-3xl divide-y divide-gray-900/10">
             {[
               { q: indexText.faq1Question, a: indexText.faq1Answer },
               { q: indexText.faq2Question, a: indexText.faq2Answer },
               { q: indexText.faq3Question, a: indexText.faq3Answer },
             ].map((faq, index) => (
                <div key={index} className="py-8">
                  <dt className="text-xl font-semibold leading-7 text-gray-900">{faq.q}</dt>
                  <dd className="mt-4">
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
