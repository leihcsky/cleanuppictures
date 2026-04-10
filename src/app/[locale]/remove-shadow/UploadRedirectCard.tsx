'use client'

import { useRef, type ChangeEvent } from "react";
import { ArrowUpOnSquareIcon } from "@heroicons/react/24/outline";
import { getLinkHref, hrefWithSearchParams, getImageProxyHref } from "~/configs/buildLink";
import { saveUploadBlob } from "~/lib/uploadRedirectBridge";
import { useToolLandingNavigation } from "~/lib/useToolLandingNavigation";

export default function UploadRedirectCard({ locale }) {
  const pushToolHome = useToolLandingNavigation(locale);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sampleUrls = [
    'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-portrait-before.jpg',
    'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-product-before.jpg',
    'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removeshadow/sample-traffic-signs-before.jpg'
  ];

  const gotoHome = () => {
    pushToolHome(hrefWithSearchParams(getLinkHref(locale, ''), { mode: 'shadow' }));
  };

  const handleUploadClick = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const token = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await saveUploadBlob(token, file);
      sessionStorage.setItem('cleanup_pending_upload', JSON.stringify({
        type: 'idb',
        value: token,
        name: file.name || 'upload',
        mime: file.type || 'image/png'
      }));
      gotoHome();
    } catch (e) {
      console.error('Failed to persist upload before redirect:', e);
      alert('Upload is too large for temporary storage. Please use the tool page directly to upload this image.');
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void handleFile(file);
  };

  const loadSample = (remoteUrl: string) => {
    pushToolHome(hrefWithSearchParams(getLinkHref(locale, ''), { mode: 'shadow', sample: remoteUrl }));
  };

  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 p-8 md:p-10 text-center shadow-sm">
      <input ref={fileInputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={onInputChange} />
      <button onClick={handleUploadClick} className="inline-flex items-center rounded-full bg-primary-600 px-8 py-3 text-white font-semibold hover:bg-primary-700 transition-colors">
        <ArrowUpOnSquareIcon className="w-5 h-5 mr-2" />
        Upload Image
      </button>
      <p className="mt-4 text-sm text-slate-500">No image? Try one of these</p>
      <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
        {sampleUrls.map((url, idx) => (
          <button key={idx} onClick={() => loadSample(url)} className="rounded-xl border border-slate-200 bg-white p-1.5 hover:border-primary-300 hover:shadow-md transition-all">
            <img src={getImageProxyHref(locale, url)} alt={`Sample ${idx + 1}`} className="w-24 h-16 object-contain object-center bg-slate-100 rounded-lg" />
          </button>
        ))}
      </div>
    </div>
  );
}
