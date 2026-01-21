'use client'
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import {useCommonContext} from "~/context/common-context";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {getLinkHref} from "~/configs/buildLink";

export default function ToolPageComponent({
  locale,
  pageName,
  pageText,
  toolText
}) {
  const { setShowLoadingModal } = useCommonContext();
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setShowLoadingModal(false);
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setProcessedImage(null);
    }
  }

  const handleProcess = () => {
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setProcessedImage(image); // Just return original for now
      alert("Backend is currently disabled. In a real scenario, this would return the processed image.");
    }, 2000);
  }

  return (
    <>
      <Header locale={locale} page={pageName} />
      <main className="isolate bg-white">
        {/* Tool Section */}
        <div className="relative pt-32 pb-16">
           <div className="mx-auto max-w-7xl px-6 lg:px-8">
             <div className="mx-auto max-w-2xl text-center mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  {pageText.h1}
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  {pageText.description}
                </p>
             </div>

             {/* Workspace */}
             <div className="mx-auto max-w-4xl bg-gray-50 rounded-3xl border border-gray-200 p-8 min-h-[400px] flex flex-col items-center justify-center border-dashed border-2 border-gray-300">
                {!image ? (
                  <div className="text-center">
                    <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-white font-semibold text-[#0071e3] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#0071e3] focus-within:ring-offset-2 hover:text-[#0077ED]"
                      >
                        <span>{toolText.uploadTitle}</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleUpload} accept="image/*" />
                      </label>
                    </div>
                    <p className="text-xs leading-5 text-gray-600 mt-2">{toolText.uploadDesc}</p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                     <div className="relative w-full max-h-[600px] flex justify-center overflow-hidden rounded-lg bg-gray-200">
                        <img src={processedImage || image} alt="Preview" className="max-w-full h-auto object-contain" />
                     </div>
                     <div className="mt-8 flex gap-4">
                        {!processedImage ? (
                          <>
                            <button
                              onClick={() => {setImage(null); setProcessedImage(null);}}
                              className="rounded-full px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            >
                              Reset
                            </button>
                            <button
                              onClick={handleProcess}
                              disabled={isProcessing}
                              className="rounded-full bg-[#0071e3] px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ED] disabled:opacity-50"
                            >
                              {isProcessing ? 'Processing...' : toolText.processButton}
                            </button>
                          </>
                        ) : (
                           <>
                            <button
                              onClick={() => {setImage(null); setProcessedImage(null);}}
                              className="rounded-full px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            >
                              Upload New
                            </button>
                            <a
                              href={processedImage}
                              download="cleaned-image.png"
                              className="rounded-full bg-[#0071e3] px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ED]"
                            >
                              {toolText.download}
                            </a>
                           </>
                        )}
                     </div>
                  </div>
                )}
             </div>
           </div>
        </div>

        {/* Content Section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
            <div className="mx-auto max-w-2xl">
               <h2 className="text-2xl font-bold tracking-tight text-gray-900">{toolText.aboutTitle}</h2>
               <p className="mt-4 text-lg leading-8 text-gray-600">
                 {pageText.aboutDesc}
               </p>

               <h2 className="mt-12 text-2xl font-bold tracking-tight text-gray-900">{toolText.stepTitle}</h2>
               <ul className="mt-4 list-disc pl-5 space-y-2 text-gray-600">
                  <li>{toolText.step1}</li>
                  <li>{toolText.step2}</li>
                  <li>{toolText.step3}</li>
               </ul>

               <h2 className="mt-12 text-2xl font-bold tracking-tight text-gray-900">{toolText.faqTitle}</h2>
               <dl className="mt-4 space-y-6 divide-y divide-gray-900/10">
                 <div className="pt-6">
                    <dt className="text-base font-semibold leading-7 text-gray-900">{pageText.faq1Q}</dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">{pageText.faq1A}</dd>
                 </div>
               </dl>
            </div>
        </div>

      </main>
      <Footer locale={locale} page={pageName} />
    </>
  )
}
