'use client'
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { useCommonContext } from "~/context/common-context";
import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Menu, Transition } from "@headlessui/react";

const clamp = (v:number, min:number, max:number) => Math.min(max, Math.max(min, v));

export default function RemoveShadowTool({
  locale,
  pageName,
  pageText,
  toolText
}) {
  const { setShowLoadingModal } = useCommonContext();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [strength, setStrength] = useState<number>(90); // 0-100
  const [downloadFormat, setDownloadFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg'); // JPG 默认
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [aggressive, setAggressive] = useState<boolean>(true);
  const [bias, setBias] = useState<number>(60);
  const [extreme, setExtreme] = useState<boolean>(true);
  const [targetBright, setTargetBright] = useState<number>(92);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const processDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    setShowLoadingModal(false);
  }, [setShowLoadingModal]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Please upload an image up to 10MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(url);
      // draw once
      requestAnimationFrame(() => applyShadowReduction());
    };
    img.src = url;
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const applyShadowReduction = useCallback(() => {
    if (!originalImage || !canvasRef.current) return;
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const w = originalImage.naturalWidth;
    const h = originalImage.naturalHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(originalImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const s = clamp(strength, 0, 100) / 100;
    const lum = new Float32Array(w * h);
    for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
      lum[p] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }
    const radiusBase = Math.round(Math.max(10, Math.min(32, Math.max(w, h) / 480 * 14)));
    const blurFloat = (src: Float32Array, bw: number, bh: number, r: number) => {
      const tmp = new Float32Array(bw * bh);
      const dst = new Float32Array(bw * bh);
      const k = r * 2 + 1;
      for (let y = 0; y < bh; y++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) {
          const xx = Math.min(bw - 1, Math.max(0, i));
          sum += src[y * bw + xx];
        }
        for (let x = 0; x < bw; x++) {
          const left = x - r - 1;
          const right = x + r;
          const l = y * bw + Math.min(bw - 1, Math.max(0, left));
          const rdx = y * bw + Math.min(bw - 1, Math.max(0, right));
          sum += src[rdx] - src[l];
          tmp[y * bw + x] = sum / k;
        }
      }
      for (let x = 0; x < bw; x++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) {
          const yy = Math.min(bh - 1, Math.max(0, i));
          sum += tmp[yy * bw + x];
        }
        for (let y = 0; y < bh; y++) {
          const top = y - r - 1;
          const bottom = y + r;
          const t = Math.min(bh - 1, Math.max(0, top)) * bw + x;
          const b = Math.min(bh - 1, Math.max(0, bottom)) * bw + x;
          sum += tmp[b] - tmp[t];
          dst[y * bw + x] = sum / k;
        }
      }
      return dst;
    };
    const guidedFilter = (I: Float32Array, P: Float32Array, bw: number, bh: number, r: number, eps: number) => {
      const N = bw * bh;
      const meanI = blurFloat(I, bw, bh, r);
      const meanP = blurFloat(P, bw, bh, r);
      const Ip = new Float32Array(N);
      const II = new Float32Array(N);
      for (let k = 0; k < N; k++) {
        Ip[k] = I[k] * P[k];
        II[k] = I[k] * I[k];
      }
      const meanIp = blurFloat(Ip, bw, bh, r);
      const meanII = blurFloat(II, bw, bh, r);
      const covIp = new Float32Array(N);
      const varI = new Float32Array(N);
      for (let k = 0; k < N; k++) {
        covIp[k] = meanIp[k] - meanI[k] * meanP[k];
        varI[k] = Math.max(0, meanII[k] - meanI[k] * meanI[k]);
      }
      const a = new Float32Array(N);
      const b = new Float32Array(N);
      for (let k = 0; k < N; k++) {
        a[k] = covIp[k] / (varI[k] + eps);
        b[k] = meanP[k] - a[k] * meanI[k];
      }
      const meanA = blurFloat(a, bw, bh, r);
      const meanB = blurFloat(b, bw, bh, r);
      const q = new Float32Array(N);
      for (let k = 0; k < N; k++) {
        q[k] = meanA[k] * I[k] + meanB[k];
      }
      return q;
    };
    const lumGF = guidedFilter(lum, lum, w, h, radiusBase, 1e-3);
    const sat = new Float32Array(w * h);
    const lum2 = new Float32Array(w * h);
    const val = new Float32Array(w * h);
    for (let p = 0, i = 0; p < sat.length; p++, i += 4) {
      const r0 = data[i], g0 = data[i + 1], b0 = data[i + 2];
      const mx = Math.max(r0, g0, b0);
      const mn = Math.min(r0, g0, b0);
      sat[p] = mx > 0 ? (mx - mn) / mx : 0;
      lum2[p] = lum[p] * lum[p];
      val[p] = mx / 255;
    }
    const meanLum = blurFloat(lum, w, h, Math.max(radiusBase, 8));
    const meanLum2 = blurFloat(lum2, w, h, Math.max(radiusBase, 8));
    const varLum = new Float32Array(w * h);
    let varMax = 0;
    for (let k = 0; k < varLum.length; k++) {
      const v = Math.max(0, meanLum2[k] - meanLum[k] * meanLum[k]);
      varLum[k] = v;
      if (v > varMax) varMax = v;
    }
    const varLumN = new Float32Array(w * h);
    const invVarMax = 1 / Math.max(1e-6, varMax);
    for (let k = 0; k < varLumN.length; k++) varLumN[k] = varLum[k] * invVarMax;
    const grad = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const gx = lum[y * w + Math.min(w - 1, x + 1)] - lum[y * w + Math.max(0, x - 1)];
        const gy = lum[Math.min(h - 1, y + 1) * w + x] - lum[Math.max(0, y - 1) * w + x];
        grad[p] = Math.min(1, Math.hypot(gx, gy));
      }
    }
    const gradSm = blurFloat(grad, w, h, Math.max(2, Math.round(radiusBase / 2)));
    const rLarge = Math.max(12, Math.round(radiusBase * 2));
    const meanLumLarge = blurFloat(lum, w, h, rLarge);
    const bkgLik = new Float32Array(w * h);
    for (let k = 0; k < bkgLik.length; k++) {
      const darkness = 1 - val[k];
      const lowSat = 1 - sat[k];
      const bgScore = 0.5 * lowSat + 0.5 * darkness;
      const varFactor = 0.7 + 0.3 * (1 - varLumN[k]);
      bkgLik[k] = Math.max(0, Math.min(1, bgScore * varFactor));
    }
    const bkgSm = blurFloat(bkgLik, w, h, Math.max(2, Math.round(radiusBase / 2)));
    // Fallback cast-shadow detection: compare to a larger illumination baseline and
    // weight by background likelihood and low-edge regions to avoid subject brightening.
    const rShadow = Math.max(18, Math.round(radiusBase * 3));
    const illumHuge = blurFloat(lum, w, h, rShadow);
    const castRaw = new Float32Array(w * h);
    const epsCast = 1e-3;
    for (let k = 0; k < castRaw.length; k++) {
      const dl = Math.max(0, illumHuge[k] - lum[k]);
      const rel = dl / Math.max(epsCast, illumHuge[k]);
      const bgw = Math.max(0.15, Math.min(1, bkgLik[k]));
      const edgeAvoid = Math.max(0, 1 - gradSm[k]);
      castRaw[k] = Math.max(0, Math.min(1, rel * (0.5 * bgw + 0.5 * edgeAvoid)));
    }
    const castGF0 = guidedFilter(lum, castRaw, w, h, Math.max(2, Math.round(radiusBase / 2)), 1e-2);
    const castMask = blurFloat(castGF0, w, h, Math.max(2, Math.round(radiusBase / 2)));
    const mask0 = new Float32Array(w * h);
    for (let k = 0; k < mask0.length; k++) {
      const d = lumGF[k] - lum[k];
      mask0[k] = d > 0 ? d : 0;
    }
    const maskCast0 = new Float32Array(w * h);
    for (let k = 0; k < maskCast0.length; k++) {
      const e = Math.pow(Math.max(0, Math.min(1, gradSm[k])), 0.75);
      const b = Math.max(0, Math.min(1, bkgSm[k]));
      const wEdge = 0.25 + 0.75 * e;
      const wBkg = 0.25 + 0.75 * b;
      const darkBoost = Math.max(0, Math.min(1, (meanLum[k] - lum[k]) * (aggressive ? 2.2 : 1.4)));
      const base = Math.max(0, Math.min(1, mask0[k] * wEdge * wBkg));
      maskCast0[k] = Math.max(base, base * (0.5 + 0.5 * darkBoost));
    }
    const maskGF = guidedFilter(lum, maskCast0, w, h, Math.max(2, Math.round(radiusBase / 2)), 1e-2);
    const maskWide = blurFloat(maskGF, w, h, Math.max(2, Math.round(radiusBase / 2)));
    const r1 = Math.max(3, Math.round(radiusBase / 2));
    const r2 = Math.max(4, radiusBase);
    const r3 = Math.max(6, Math.round(radiusBase * 2));
    const blur1 = blurFloat(lum, w, h, r1);
    const blur2 = blurFloat(lum, w, h, r2);
    const blur3 = blurFloat(lum, w, h, r3);
    const retNeg = new Float32Array(w * h);
    const eLog = 1e-4;
    for (let k = 0; k < retNeg.length; k++) {
      const a = Math.max(0, Math.log(blur1[k] + eLog) - Math.log(lum[k] + eLog));
      const b = Math.max(0, Math.log(blur2[k] + eLog) - Math.log(lum[k] + eLog));
      const c = Math.max(0, Math.log(blur3[k] + eLog) - Math.log(lum[k] + eLog));
      const m = 0.4 * a + 0.35 * b + 0.25 * c;
      const varGain = 0.6 + 0.4 * (1 - varLumN[k]);
      const lowSat = 1 - sat[k];
      retNeg[k] = Math.max(0, Math.min(2.0, m * varGain * lowSat));
    }
    let sumLumAll = 0;
    for (let k = 0; k < lum.length; k++) sumLumAll += lum[k];
    const globalMeanLum = sumLumAll / lum.length;
    const retMax = 2.0;
    let sumNS = 0;
    let cntNS = 0;
    for (let k = 0; k < lum.length; k++) {
      const wS0 = Math.max(0, Math.min(1, 0.6 * maskGF[k] + 0.4 * (retNeg[k] / retMax)));
      if (wS0 < 0.15) {
        sumNS += lum[k];
        cntNS++;
      }
    }
    const refMean0 = cntNS > 0 ? (sumNS / cntNS) : globalMeanLum;
    const refMean = Math.min(0.95, Math.max(0.55, refMean0));
    const rf = new Float32Array(w * h);
    const gf = new Float32Array(w * h);
    const bf = new Float32Array(w * h);
    for (let p = 0, i = 0; p < rf.length; p++, i += 4) {
      rf[p] = data[i];
      gf[p] = data[i + 1];
      bf[p] = data[i + 2];
    }
    const rGF = guidedFilter(lum, rf, w, h, Math.max(2, Math.round(radiusBase / 2)), 16);
    const gGF = guidedFilter(lum, gf, w, h, Math.max(2, Math.round(radiusBase / 2)), 16);
    const bGF = guidedFilter(lum, bf, w, h, Math.max(2, Math.round(radiusBase / 2)), 16);
    const eps = 1e-3;
    const bParam = 0.25 + 0.75 * (bias / 100);
    for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
      const dr = Math.max(0, Math.min(1, meanLumLarge[p] - lum[p]));
      const varGain = 0.6 + 0.4 * (1 - varLumN[p]);
      const wDark = Math.max(0, Math.min(1, dr * varGain * (1 - sat[p]) * bParam * Math.max(0.25, bkgLik[p])));
      // subject likelihood and flat background weight
      const flatBg = Math.max(0, Math.min(1, (1 - varLumN[p]) * (1 - gradSm[p])));
      const subjectLik = Math.max(0, Math.min(1, 0.4 * varLumN[p] + 0.4 * gradSm[p] + 0.2 * sat[p]));
      const isCast = castMask[p] > 0.25 && lum[p] < meanLumLarge[p] * 0.97;
      const baseCast = isCast ? Math.max(0, Math.min(1, castMask[p] * (0.6 * bkgLik[p] + 0.4 * flatBg))) : 0;
      const baseSoft = Math.max(0, Math.min(1, maskWide[p] * (1 - subjectLik)));
      const wBase = Math.max(baseCast, baseSoft * 0.8);
      const wMask = Math.pow(Math.max(wBase, wDark), 0.9) * s;
      const wStrong = extreme ? Math.min(1, wMask * 1.8) : wMask;
      if (wMask <= 0) continue;
      const L = lum[p];
      const Lm = lumGF[p];
      const Ltgt = L + wMask * (Lm - L);
      const scale0 = Math.max(1, Math.min(1.7, Ltgt / Math.max(L, eps)));
      const gainR = Math.max(0, Math.min(1.2, retNeg[p] * 2.2 * s));
      const scale1 = Math.max(1, Math.min(2.4, 1 + gainR * wMask));
      const wS = Math.max(0, Math.min(1, 0.6 * wBase + 0.4 * (retNeg[p] / retMax)));
      const tRef = s * wS * (0.6 + 0.4 * (bias / 100));
      const scaleRef = Math.max(1, Math.min(aggressive ? 2.8 : 2.3, 1 + tRef * Math.max(0, (refMean / Math.max(L, eps) - 1))));
      const shade = Math.min(1, Math.max(eps, L / Math.max(eps, meanLumLarge[p])));
      const kShade = (0.35 + 0.65 * (bias / 100)) * (aggressive ? 1.3 : 1.0);
      const scaleShade = Math.max(1, Math.min(aggressive ? 3.0 : 2.5, Math.pow(1 / Math.max(eps, shade), kShade) * wMask + (1 - wMask)));
      const tb = Math.min(0.98, Math.max(0.6, targetBright / 100));
      const scaleTB = Math.max(1, Math.min(extreme ? 3.8 : 2.8, 1 + wStrong * Math.max(0, tb / Math.max(L, eps) - 1)));
      const wCast = Math.max(0, Math.min(1, castMask[p]));
      const scaleCast = Math.max(1, Math.min(extreme ? 4.2 : 3.2, 1 + wCast * Math.max(0, tb / Math.max(L, eps) - 1)));
      const scale = Math.max(scale0, Math.max(scale1, Math.max(scaleRef, Math.max(scaleShade, Math.max(scaleTB, scaleCast)))));
      const r0 = data[i], g0 = data[i + 1], b0 = data[i + 2];
      const r1 = Math.max(0, Math.min(255, Math.round(r0 * Math.pow(scale, extreme ? 0.72 : 0.78))));
      const g1 = Math.max(0, Math.min(255, Math.round(g0 * Math.pow(scale, extreme ? 0.72 : 0.78))));
      const b1 = Math.max(0, Math.min(255, Math.round(b0 * Math.pow(scale, extreme ? 0.72 : 0.78))));
      const cBlend = (aggressive ? 0.14 : 0.10) * wStrong;
      const r2 = Math.max(0, Math.min(255, Math.round(r1 * (1 - cBlend) + rGF[p] * cBlend)));
      const g2 = Math.max(0, Math.min(255, Math.round(g1 * (1 - cBlend) + gGF[p] * cBlend)));
      const b2 = Math.max(0, Math.min(255, Math.round(b1 * (1 - cBlend) + bGF[p] * cBlend)));
      data[i] = r2; data[i + 1] = g2; data[i + 2] = b2;
    }
    ctx.putImageData(imgData, 0, 0);
    setIsProcessing(false);
  }, [originalImage, strength]);

  useEffect(() => {
    if (!originalImage) return;
    if (processDebounceRef.current) {
      clearTimeout(processDebounceRef.current);
    }
    processDebounceRef.current = window.setTimeout(() => {
      requestAnimationFrame(() => applyShadowReduction());
    }, 120);
    return () => {
      if (processDebounceRef.current) {
        clearTimeout(processDebounceRef.current);
        processDebounceRef.current = null;
      }
    };
  }, [strength, originalImage, applyShadowReduction]);

  const handleReset = () => {
    setStrength(50);
    if (originalImage && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(originalImage, 0, 0);
    }
  };
  const handleNewImage = () => {
    setImageSrc(null);
    setOriginalImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mime = 'image/jpeg';
    if (downloadFormat === 'png') mime = 'image/png';
    if (downloadFormat === 'webp') mime = 'image/webp';
    let href = '';
    if (mime === 'image/jpeg') {
      // fill white background for jpg
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width;
      tmp.height = canvas.height;
      const tctx = tmp.getContext('2d')!;
      tctx.fillStyle = '#ffffff';
      tctx.fillRect(0, 0, tmp.width, tmp.height);
      tctx.drawImage(canvas, 0, 0);
      href = tmp.toDataURL(mime, 0.92);
    } else {
      href = canvas.toDataURL(mime);
    }
    const link = document.createElement('a');
    link.download = `shadow-fixed.${downloadFormat === 'jpeg' ? 'jpg' : downloadFormat}`;
    link.href = href;
    link.click();
  };

  const handleAiRefine = async () => {
    if (!originalImage || !canvasRef.current) return;
    try {
      setIsProcessing(true);
      const src = imageSrc ? imageSrc : canvasRef.current.toDataURL('image/png');
      const res = await fetch(`/${locale}/api/remove-shadow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: src })
      });
      const json = await res.json();
      if (json.output_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d')!;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          setIsProcessing(false);
        };
        img.src = json.output_url;
      } else if (json.output_base64) {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext('2d')!;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          setIsProcessing(false);
        };
        img.src = json.output_base64;
      } else {
        setIsProcessing(false);
        alert('AI refine failed.');
      }
    } catch (e) {
      setIsProcessing(false);
      alert('AI refine failed.');
    }
  };

  return (
    <>
      <Header locale={locale} page={pageName} />
      <main className="isolate bg-white">
        <Script id="remove-shadow-ld" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": pageText.h1,
            "description": pageText.description,
            "inLanguage": locale === "default" ? "en" : locale,
            "isPartOf": { "@type": "WebSite", "name": process.env.NEXT_PUBLIC_DOMAIN_NAME }
          })}
        </Script>
        <Script
          id="remove-shadow-faq-ld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify((() => {
              const faqs = [
                { q: pageText.faq1Q, a: pageText.faq1A },
                { q: pageText.faq2Q, a: pageText.faq2A },
                { q: pageText.faq3Q, a: pageText.faq3A },
                { q: pageText.faq4Q, a: pageText.faq4A },
              ].filter(f => f && f.q && f.a);
              if (!faqs.length) return null;
              return {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": faqs.map(f => ({
                  "@type": "Question",
                  "name": f.q,
                  "acceptedAnswer": { "@type": "Answer", "text": f.a }
                }))
              }
            })())
          }}
        />
        <Script
          id="remove-shadow-howto-ld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HowTo",
              "name": pageText.howTitle,
              "step": [
                pageText.how1 ? { "@type": "HowToStep", "name": pageText.how1 } : null,
                pageText.how2 ? { "@type": "HowToStep", "name": pageText.how2 } : null,
                pageText.how3 ? { "@type": "HowToStep", "name": pageText.how3 } : null
              ].filter(Boolean)
            })
          }}
        />
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
            <div
              className={`mx-auto max-w-[90rem] bg-gray-50 rounded-3xl border border-gray-200 p-4 lg:p-8 min-h-[420px] flex flex-col gap-6 ${!imageSrc ? 'border-dashed border-4 border-gray-300 cursor-pointer' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => { if (!imageSrc) fileInputRef.current?.click() }}
            >
              {!imageSrc ? (
                <div key="upload" className="w-full max-w-2xl mx-auto">
                  <div className="relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5-.5h3.5v-3.5a.5.5 0 0 1 1 0v3.5H9.5a.5.5 0 0 1 0 1H5.5v3.5a.5.5 0 0 1-1 0V10.9H1a.5.5 0 0 1-.5-.5"/>
                        <path d="M4.5 0A1.5 1.5 0 0 1 6 1.5V4h4a2 2 0 0 1 2 2v6.5A1.5 1.5 0 0 1 10.5 14h-7A1.5 1.5 0 0 1 2 12.5V1.5A1.5 1.5 0 0 1 3.5 0h1z"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">{toolText.uploadDesc}</p>
                    </div>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleUpload} accept="image/png, image/jpeg, image/webp" />
                  </div>
                </div>
              ) : (
                <div key="workspace">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl shadow-md border border-slate-200 sticky top-24 z-10 mb-6">
                    <div className="flex items-center gap-3 relative group">
                      <span className="text-sm font-medium text-gray-700">Shadow Reduction Strength: {strength}%</span>
                      <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 cursor-help" />
                      <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-20 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 px-3 py-2">
                        <span className="text-xs text-gray-700">{toolText.tolTip}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={strength}
                        onChange={(e) => setStrength(Number(e.target.value))}
                        className="w-44 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex items-center gap-2 border-l pl-3 border-slate-200">
                        <button
                          onClick={() => setAggressive(!aggressive)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${aggressive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}
                        >
                          Aggressive
                        </button>
                        <span className="ml-2 text-xs text-gray-600">Shadow Bias: {bias}</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={bias}
                          onChange={(e) => setBias(Number(e.target.value))}
                          className="w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <button
                          onClick={() => setExtreme(!extreme)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${extreme ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}
                        >
                          Extreme
                        </button>
                        <span className="ml-2 text-xs text-gray-600">Target Brightness: {targetBright}</span>
                        <input
                          type="range"
                          min={60}
                          max={98}
                          value={targetBright}
                          onChange={(e) => setTargetBright(Number(e.target.value))}
                          className="w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReset}
                        className="rounded-full px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleAiRefine}
                        className="rounded-full bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0077ED]"
                      >
                        Refine with AI
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">{toolText.original}</h3>
                        <div className="flex items-center">
                          <button
                            onClick={handleNewImage}
                            className="inline-flex items-center rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0077ED] mr-6 md:mr-10"
                          >
                            Upload New
                          </button>
                        </div>
                      </div>
                      <div className="relative w-full overflow-hidden rounded-lg bg-gray-200 border border-gray-300 shadow-sm">
                        {imageSrc && <img src={imageSrc} alt="Original" className="w-full h-auto" />}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Processed Result</h3>
                        <div className="flex items-center gap-2 mr-6 md:mr-10">
                          <button
                            onClick={handleDownload}
                            className="rounded-full bg-[#0071e3] px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0077ED]"
                          >
                            {toolText.download}
                          </button>
                          <Menu as="div" className="relative inline-block text-left">
                            <div>
                              <Menu.Button className="inline-flex items-center justify-center gap-x-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50">
                                {downloadFormat === 'png' ? 'PNG' : downloadFormat === 'jpeg' ? 'JPG' : 'WebP'}
                                <ChevronDownIcon className="h-3 w-3 text-gray-500" aria-hidden="true" />
                              </Menu.Button>
                            </div>
                            <Transition
                              enter="transition ease-out duration-100"
                              enterFrom="transform opacity-0 scale-95"
                              enterTo="transform opacity-100 scale-100"
                              leave="transition ease-in duration-75"
                              leaveFrom="transform opacity-100 scale-100"
                              leaveTo="transform opacity-0 scale-95"
                            >
                              <Menu.Items className="absolute right-0 z-30 mt-2 w-28 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button className={`${active ? 'bg-gray-50' : ''} text-gray-700 block w-full text-left px-4 py-2 text-sm`} onClick={() => setDownloadFormat('png')}>
                                        PNG
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button className={`${active ? 'bg-gray-50' : ''} text-gray-700 block w-full text-left px-4 py-2 text-sm`} onClick={() => setDownloadFormat('jpeg')}>
                                        JPG
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button className={`${active ? 'bg-gray-50' : ''} text-gray-700 block w-full text-left px-4 py-2 text-sm`} onClick={() => setDownloadFormat('webp')}>
                                        WebP
                                      </button>
                                    )}
                                  </Menu.Item>
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </div>
                      </div>
                      <div className="relative w-full overflow-hidden rounded-lg bg-gray-200 border border-gray-300 shadow-sm">
                        <canvas ref={canvasRef} className="w-full h-auto" />
                        {isProcessing ? <p className="text-xs text-gray-500 mt-2">Processing...</p> : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{toolText.aboutTitle}</h2>
            <p className="mt-2 text-sm text-gray-600">{pageText.aboutDesc}</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10">
            <section>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">{pageText.howTitle}</h3>
              <ul className="space-y-2 text-slate-700">
                {pageText.how1 ? <li>• {pageText.how1}</li> : null}
                {pageText.how2 ? <li>• {pageText.how2}</li> : null}
                {pageText.how3 ? <li>• {pageText.how3}</li> : null}
              </ul>
            </section>
            <section>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">{pageText.whatTitle}</h3>
              <ul className="space-y-2 text-slate-700">
                {pageText.what1 ? <li>• {pageText.what1}</li> : null}
                {pageText.what2 ? <li>• {pageText.what2}</li> : null}
                {pageText.what3 ? <li>• {pageText.what3}</li> : null}
                {pageText.what4 ? <li>• {pageText.what4}</li> : null}
              </ul>
            </section>
            <section>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">{pageText.useTitle}</h3>
              <ul className="space-y-2 text-slate-700">
                {pageText.use1 ? <li>• {pageText.use1}</li> : null}
                {pageText.use2 ? <li>• {pageText.use2}</li> : null}
                {pageText.use3 ? <li>• {pageText.use3}</li> : null}
                {pageText.use4 ? <li>• {pageText.use4}</li> : null}
              </ul>
            </section>
            <section>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">{pageText.formatsTitle}</h3>
              <ul className="space-y-2 text-slate-700">
                {pageText.format1 ? <li>• {pageText.format1}</li> : null}
                {pageText.format2 ? <li>• {pageText.format2}</li> : null}
                {pageText.format3 ? <li>• {pageText.format3}</li> : null}
              </ul>
            </section>
          </div>
          <div className="mt-16 mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{toolText.faqTitle}</h2>
            <div className="mt-6 space-y-6">
              {pageText.faq1Q && pageText.faq1A ? (
                <div>
                  <p className="font-semibold text-slate-900">{pageText.faq1Q}</p>
                  <p className="text-slate-700 mt-1">{pageText.faq1A}</p>
                </div>
              ) : null}
              {pageText.faq2Q && pageText.faq2A ? (
                <div>
                  <p className="font-semibold text-slate-900">{pageText.faq2Q}</p>
                  <p className="text-slate-700 mt-1">{pageText.faq2A}</p>
                </div>
              ) : null}
              {pageText.faq3Q && pageText.faq3A ? (
                <div>
                  <p className="font-semibold text-slate-900">{pageText.faq3Q}</p>
                  <p className="text-slate-700 mt-1">{pageText.faq3A}</p>
                </div>
              ) : null}
              {pageText.faq4Q && pageText.faq4A ? (
                <div>
                  <p className="font-semibold text-slate-900">{pageText.faq4Q}</p>
                  <p className="text-slate-700 mt-1">{pageText.faq4A}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} page={pageName} />
    </>
  )
}
