'use client'
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { useCommonContext } from "~/context/common-context";
import { useState, useRef, useEffect, useCallback } from "react";
import NextImage from "next/image";
import Script from "next/script";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { HandRaisedIcon } from "@heroicons/react/24/solid";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

// Helper: Calculate color distance
const colorDistance = (r1, g1, b1, r2, g2, b2) => {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
};

const rgbToHsv = (r, g, b) => {
  let r1 = r / 255, g1 = g / 255, b1 = b / 255;
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
  let h = 0, s = 0, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (d !== 0) {
    switch (max) {
      case r1:
        h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0));
        break;
      case g1:
        h = ((b1 - r1) / d + 2);
        break;
      default:
        h = ((r1 - g1) / d + 4);
    }
    h = h / 6;
  }
  return { h: h * 360, s, v };
};

const hueDelta = (h1, h2) => {
  const d = Math.abs(h1 - h2);
  return d > 180 ? 360 - d : d;
};

const isNeutralSat = (s) => s <= 0.12;

const dilate = (src, w, h, r) => {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          if (src[yy * w + xx]) { val = 1; dy = r + 1; break; }
        }
      }
      dst[y * w + x] = val;
    }
  }
  return dst;
};

const erode = (src, w, h, r) => {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 1;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          if (!src[yy * w + xx]) { val = 0; dy = r + 1; break; }
        }
      }
      dst[y * w + x] = val;
    }
  }
  return dst;
};

const boxBlur = (src, w, h, r) => {
  const tmp = new Float32Array(w * h);
  const dst = new Float32Array(w * h);
  const k = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const xx = Math.min(w - 1, Math.max(0, i));
      sum += src[y * w + xx];
    }
    for (let x = 0; x < w; x++) {
      const left = x - r - 1;
      const right = x + r;
      const l = y * w + Math.min(w - 1, Math.max(0, left));
      const rdx = y * w + Math.min(w - 1, Math.max(0, right));
      sum += src[rdx] - src[l];
      tmp[y * w + x] = sum / k;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const yy = Math.min(h - 1, Math.max(0, i));
      sum += tmp[yy * w + x];
    }
    for (let y = 0; y < h; y++) {
      const top = y - r - 1;
      const bottom = y + r;
      const t = Math.min(h - 1, Math.max(0, top)) * w + x;
      const b = Math.min(h - 1, Math.max(0, bottom)) * w + x;
      sum += tmp[b] - tmp[t];
      dst[y * w + x] = sum / k;
    }
  }
  return dst;
};

const refineAlphaMask = (data, w, h, strength) => {
  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    mask[p] = data[i + 3] === 0 ? 1 : 0;
  }
  const rm = Math.max(0, Math.min(3, Math.round(strength / 33)));
  const rb = Math.max(0, Math.min(6, Math.round(strength / 16)));
  let m = mask;
  if (rm > 0) {
    m = dilate(m, w, h, rm);
    m = erode(m, w, h, rm);
    m = erode(m, w, h, 1);
    m = dilate(m, w, h, 1);
  }
  const srcf = new Float32Array(w * h);
  for (let i = 0; i < srcf.length; i++) srcf[i] = m[i];
  const bf = rb > 0 ? boxBlur(srcf, w, h, rb) : srcf;
  for (let p = 0, i = 0; p < bf.length; p++, i += 4) {
    const a = Math.max(0, Math.min(1, bf[p]));
    const na = Math.round(255 * (1 - a));
    data[i + 3] = na;
  }
};
export default function RemoveColorTool({
  locale,
  pageName,
  pageText,
  toolText
}) {
  const { setShowLoadingModal } = useCommonContext();
  
  // State
  const [imageSrc, setImageSrc] = useState(null);
  const [originalImage, setOriginalImage] = useState(null); // HTMLImageElement
  const [tolerance, setTolerance] = useState(50); // 0-442 (Max distance is sqrt(255^2*3) ≈ 441.6)
  const [targetColors, setTargetColors] = useState([]); // Array of {r, g, b}
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('png');
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [autoRefine, setAutoRefine] = useState(true);
  const [refineStrength, setRefineStrength] = useState(40);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  // Ref for original image click handling
  const originalImageRef = useRef(null);
  const resultContainerRef = useRef(null);
  const controlsBarRef = useRef(null);
  const workspaceToolbarRef = useRef(null);
  const [controlsAffixed, setControlsAffixed] = useState(false);
  const [controlsAffixPos, setControlsAffixPos] = useState({ top: 0, left: 0 });
  const loadSample = (url) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(url);
      setTargetColors([]);
    };
    img.src = url;
  };

  // Reset loading modal on mount
  useEffect(() => {
    setShowLoadingModal(false);
  }, [setShowLoadingModal]);

  // Handle File Upload
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(url);
      setTargetColors([]);
      // Initialize canvas (will be drawn by effect)
    };
    img.src = url;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // The Core Removal Function
  const processRemoval = useCallback(() => {
    if (!originalImage || !canvasRef.current) return;

    if (targetColors.length === 0) {
        const canvas = canvasRef.current;
        canvas.width = originalImage.naturalWidth;
        canvas.height = originalImage.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);
        return;
    }

    setIsProcessing(true);
    
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (canvas.width !== originalImage.naturalWidth || canvas.height !== originalImage.naturalHeight) {
          canvas.width = originalImage.naturalWidth;
          canvas.height = originalImage.naturalHeight;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImage, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const src = new Uint8ClampedArray(data);
      const w = canvas.width;
      const h = canvas.height;
      
      const targets = targetColors;
      const globals = targets.filter(t => t.mode === 'global');
      const locals = targets.filter(t => t.mode !== 'global');
      const minSat = 0.08;

      if (globals.length > 0) {
        for (let i = 0; i < data.length; i += 4) {
          const r = src[i], g = src[i + 1], b = src[i + 2];
          const pv = rgbToHsv(r, g, b);
          let hit = false;
          for (let j = 0; j < globals.length; j++) {
            const tg = globals[j];
            const tUse = typeof tg.tTol === 'number' ? tg.tTol : tolerance;
            if (isNeutralSat(tg.s)) {
              const sLimit = Math.min(0.25, tg.s + (tUse / 150) * 0.20);
              const vTol = (tUse / 150) * 0.25 + 0.04;
              if (pv.s <= sLimit && Math.abs(pv.v - tg.v) <= vTol) {
                hit = true;
                break;
              }
            } else {
              if (pv.s < minSat) continue;
              const hueTol = Math.max(4, Math.round((tUse / 150) * 40));
              const sTol = (tUse / 150) * 0.35;
              const vTol = (tUse / 150) * 0.35;
              const dh = hueDelta(pv.h, tg.h);
              if (dh <= hueTol && Math.abs(pv.s - tg.s) <= sTol && Math.abs(pv.v - tg.v) <= vTol) {
                hit = true;
                break;
              }
            }
          }
          if (hit) data[i + 3] = 0;
        }
      }
      
      if (locals.length > 0) {
        for (let k = 0; k < locals.length; k++) {
          const seed = locals[k];
          const tUse = typeof seed.tTol === 'number' ? seed.tTol : tolerance;
          const hueTol = Math.max(4, Math.round((tUse / 150) * 40));
          const sTol = (tUse / 150) * 0.35;
          const vTol = (tUse / 150) * 0.35;
          const visited = new Uint8Array(w * h);
          const q = new Int32Array(w * h * 2);
          let qi = 0, qj = 0;
          const sx = Math.min(w - 1, Math.max(0, Math.floor(seed.x || 0)));
          const sy = Math.min(h - 1, Math.max(0, Math.floor(seed.y || 0)));
          q[qj++] = sx; q[qj++] = sy;
          while (qi < qj) {
            const x = q[qi++], y = q[qi++];
            const idx = y * w + x;
            if (visited[idx]) continue;
            visited[idx] = 1;
            const off = idx * 4;
            const r = src[off], g = src[off + 1], b = src[off + 2];
            const pv = rgbToHsv(r, g, b);
            let matched = false;
            if (isNeutralSat(seed.s)) {
              const sLimit = Math.min(0.25, seed.s + (tUse / 150) * 0.20);
              const vTolN = (tUse / 150) * 0.25 + 0.04;
              if (pv.s <= sLimit && Math.abs(pv.v - seed.v) <= vTolN) {
                matched = true;
              }
            } else {
              if (pv.s >= minSat) {
                const dh = hueDelta(pv.h, seed.h);
                if (dh <= hueTol && Math.abs(pv.s - seed.s) <= sTol && Math.abs(pv.v - seed.v) <= vTol) {
                  matched = true;
                }
              }
            }
            if (matched) {
              data[off + 3] = 0;
              if (x > 0) { q[qj++] = x - 1; q[qj++] = y; }
              if (x < w - 1) { q[qj++] = x + 1; q[qj++] = y; }
              if (y > 0) { q[qj++] = x; q[qj++] = y - 1; }
              if (y < h - 1) { q[qj++] = x; q[qj++] = y + 1; }
            }
          }
        }
      }
      
      if (autoRefine && refineStrength > 0) {
        refineAlphaMask(data, w, h, refineStrength);
      }
      ctx.putImageData(imageData, 0, 0);
      setIsProcessing(false);
    });
  }, [originalImage, targetColors, tolerance, autoRefine, refineStrength]);

  // Trigger processing when tolerance or target colors change
  useEffect(() => {
    if (originalImage) {
      processRemoval();
    }
  }, [targetColors, tolerance, processRemoval, originalImage]);


  // Handle Click on Original Image (Pick Color)
  const handleOriginalClick = (e) => {
    if (!originalImage || !originalImageRef.current) return;
    
    const imgEl = originalImageRef.current;
    const rect = imgEl.getBoundingClientRect();
    
    // Calculate scale
    const scaleX = originalImage.naturalWidth / rect.width;
    const scaleY = originalImage.naturalHeight / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Create temp canvas to pick color safely
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, -Math.floor(x), -Math.floor(y));
    const p0 = tempCtx.getImageData(0, 0, 1, 1).data;
    const r = p0[0], g = p0[1], b = p0[2];
    
    const { h, s, v } = rgbToHsv(r, g, b);
    setTargetColors(prev => [...prev, { r, g, b, x: Math.floor(x), y: Math.floor(y), h, s, v, mode: 'local', tTol: tolerance }]);
  };

  // Undo Last Action
  const handleUndo = () => {
    setTargetColors(prev => prev.slice(0, -1));
  };

  // Auto Remove Background (Improved Algorithm)
  const handleAutoRemove = () => {
    if (!originalImage) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.naturalWidth;
    canvas.height = originalImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Sample more pixels from edges (Top, Bottom, Left, Right)
    // Map color string "r,g,b" to count
    const colorCounts = {};
    const samplePixel = (idx) => {
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];
        // Quantize slightly to group similar colors (step of 5)
        const key = `${Math.round(r/5)*5},${Math.round(g/5)*5},${Math.round(b/5)*5}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
    };

    // Top & Bottom rows
    for (let x = 0; x < width; x+=5) { // Step 5 for performance
        samplePixel(x * 4); // Top
        samplePixel(((height - 1) * width + x) * 4); // Bottom
    }
    // Left & Right cols
    for (let y = 0; y < height; y+=5) {
        samplePixel((y * width) * 4); // Left
        samplePixel((y * width + width - 1) * 4); // Right
    }

    // Find most frequent color
    let maxCount = 0;
    let dominantColorKey = null;
    for (const key in colorCounts) {
        if (colorCounts[key] > maxCount) {
            maxCount = colorCounts[key];
            dominantColorKey = key;
        }
    }

    if (dominantColorKey) {
        const [r, g, b] = dominantColorKey.split(',').map(Number);
        const { h, s, v } = rgbToHsv(r, g, b);
        setTargetColors(prev => [...prev, { r, g, b, h, s, v, mode: 'global', tTol: tolerance }]);
    }
  };

  const handleResetEdits = () => {
    setTargetColors([]);
  };

  const handleNewImage = () => {
    setImageSrc(null);
    setOriginalImage(null);
    setTargetColors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Click on Result Canvas (Remove Artifacts)
  const handleResultClick = (e) => {
    if (!originalImage || !canvasRef.current) return;
    if (panMode || isPanning) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Pick color from original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, -Math.floor(x), -Math.floor(y));
    const p1 = tempCtx.getImageData(0, 0, 1, 1).data;
    const r = p1[0], g = p1[1], b = p1[2];
    
    const { h, s, v } = rgbToHsv(r, g, b);
    setTargetColors(prev => [...prev, { r, g, b, x: Math.floor(x), y: Math.floor(y), h, s, v, mode: 'local', tTol: tolerance }]);
  };

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const handleZoom = (factor, anchorEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const prev = zoom;
    const next = clamp(prev * factor, 1, 8);
    if (anchorEvent) {
      const inBounds = anchorEvent.clientX >= rect.left && anchorEvent.clientX <= rect.right && anchorEvent.clientY >= rect.top && anchorEvent.clientY <= rect.bottom;
      const ax = inBounds ? (anchorEvent.clientX - rect.left) / prev : (rect.width / 2) / prev;
      const ay = inBounds ? (anchorEvent.clientY - rect.top) / prev : (rect.height / 2) / prev;
      setPanX(panX - ax * (next - prev));
      setPanY(panY - ay * (next - prev));
    }
    setZoom(next);
  };
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY;
    const factor = delta > 0 ? 0.9 : 1.1;
    handleZoom(factor, e);
  };
  useEffect(() => {
    const el = resultContainerRef.current;
    if (!el) return;
    const listener = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      handleWheel(ev);
    };
    el.addEventListener('wheel', listener, { passive: false });
    return () => {
      el.removeEventListener('wheel', listener);
    };
  }, [handleWheel]);
  useEffect(() => {
    const onScroll = () => {
      const toolbarEl = workspaceToolbarRef.current;
      const containerEl = resultContainerRef.current;
      const barEl = controlsBarRef.current;
      if (!toolbarEl || !containerEl || !barEl) return;
      const toolbarRect = toolbarEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      const barRect = barEl.getBoundingClientRect();
      const desiredTop = Math.max(toolbarRect.bottom + 8, 0);
      const withinVertical =
        containerRect.top <= desiredTop &&
        containerRect.bottom >= desiredTop + barRect.height + 8;
      if (withinVertical) {
        setControlsAffixed(true);
        const left = containerRect.left + 8;
        setControlsAffixPos({ top: desiredTop, left });
      } else {
        setControlsAffixed(false);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.code === 'Space') {
        const tgt = ev.target;
        const tag = tgt && tgt.tagName;
        if (tag && (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')) return;
        ev.preventDefault();
        setPanMode((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);
  const handlePanStart = (e) => {
    if (!panMode) return;
    setIsPanning(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = panX;
    const initY = panY;
    const onMove = (ev) => {
      setPanX(initX + (ev.clientX - startX));
      setPanY(initY + (ev.clientY - startY));
    };
    const onUp = () => {
      setIsPanning(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const resetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        let mime = 'image/png';
        if (downloadFormat === 'jpeg') mime = 'image/jpeg';
        if (downloadFormat === 'webp') mime = 'image/webp';
        let href = '';
        if (mime === 'image/jpeg') {
          const tmp = document.createElement('canvas');
          tmp.width = canvas.width;
          tmp.height = canvas.height;
          const tctx = tmp.getContext('2d');
          tctx.fillStyle = '#ffffff';
          tctx.fillRect(0, 0, tmp.width, tmp.height);
          tctx.drawImage(canvas, 0, 0);
          href = tmp.toDataURL(mime, 0.92);
        } else {
          href = canvas.toDataURL(mime);
        }
        const link = document.createElement('a');
        link.download = `cleaned-image.${downloadFormat === 'jpeg' ? 'jpg' : downloadFormat}`;
        link.href = href;
        link.click();
    }
  };

  return (
    <>
      <Header locale={locale} page={pageName} />
      <main className="isolate bg-white">
        <Script id="remove-color-ld" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": pageText.h1,
            "description": pageText.description,
            "inLanguage": locale === "default" ? "en" : locale,
            "isPartOf": {
              "@type": "WebSite",
              "name": process.env.NEXT_PUBLIC_DOMAIN_NAME
            }
          })}
        </Script>
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
             <div 
                className={`mx-auto max-w-[90rem] bg-gray-50 rounded-3xl border border-gray-200 p-4 lg:p-8 min-h-[420px] flex flex-col items-center justify-center ${!imageSrc ? 'border-dashed border-4 border-gray-300 cursor-pointer' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => { if (!imageSrc) fileInputRef.current?.click() }}
             >
                {!imageSrc ? (
                  <div className="w-full max-w-2xl mx-auto">
                    <div
                      className="relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                    >
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
                    <div className="mt-6">
                      <p className="text-sm font-medium text-gray-700 mb-2">Try sample images</p>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          className="group relative rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400"
                          onClick={() => loadSample('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_rocks.jpg/800px-Fronalpstock_rocks.jpg')}
                        >
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fronalpstock_rocks.jpg/320px-Fronalpstock_rocks.jpg" alt="Sample 1" className="w-full h-auto group-hover:opacity-90" />
                        </button>
                        <button
                          className="group relative rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400"
                          onClick={() => loadSample('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Golden_gate2.jpg/800px-Golden_gate2.jpg')}
                        >
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Golden_gate2.jpg/320px-Golden_gate2.jpg" alt="Sample 2" className="w-full h-auto group-hover:opacity-90" />
                        </button>
                        <button
                          className="group relative rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400"
                          onClick={() => loadSample('https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Eucalyptus_deglupta_bark.jpg/640px-Eucalyptus_deglupta_bark.jpg')}
                        >
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Eucalyptus_deglupta_bark.jpg/320px-Eucalyptus_deglupta_bark.jpg" alt="Sample 3" className="w-full h-auto group-hover:opacity-90" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-6">
                     {/* Toolbar */}
                     <div ref={workspaceToolbarRef} className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl shadow-md border border-slate-200 sticky top-24 z-10">
                        <div className="flex flex-wrap items-center gap-4">
                            <button
                                onClick={handleAutoRemove}
                                className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
                                </svg>
                                Auto Remove BG
                            </button>
                            
                            <div className="flex items-center gap-2 border-l pl-4 border-slate-200 relative group">
                                <span className="text-sm font-medium text-gray-700">Tolerance: {Math.round((tolerance / 442) * 100)}%</span>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 cursor-help" />
                                <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-20 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 px-3 py-2">
                                  <span className="text-xs text-gray-700">{toolText.tolTip}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="150" 
                                    value={tolerance} 
                                    onChange={(e) => setTolerance(Number(e.target.value))}
                                    className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                            <div className="flex items-center gap-2 border-l pl-4 border-slate-200 relative group">
                                <span className="text-sm font-medium text-gray-700">Refine: {refineStrength}%</span>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 cursor-help" />
                                <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-20 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 px-3 py-2">
                                  <span className="text-xs text-gray-700">{toolText.refineTip}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={refineStrength}
                                    onChange={(e) => setRefineStrength(Number(e.target.value))}
                                    className="w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <button
                                  onClick={() => setAutoRefine(!autoRefine)}
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${autoRefine ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}
                                >
                                  {autoRefine ? 'Auto Refine On' : 'Auto Refine Off'}
                                </button>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 cursor-help" />
                                <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-20 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 px-3 py-2">
                                  <span className="text-xs text-gray-700">{toolText.autoRefineTip}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleUndo}
                                disabled={targetColors.length === 0}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                                    <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
                                </svg>
                                Undo
                            </button>
                            <button
                              onClick={handleResetEdits}
                              disabled={targetColors.length === 0}
                              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                              Reset Edits
                            </button>
                        </div>

                        <div className="flex items-center gap-2"></div>
                     </div>

                     {/* Split View Area */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                        {/* Original Image (Clickable) */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-gray-900">Original (Click to remove color)</h3>
                              <div className="flex items-center">
                                <button
                                  onClick={handleNewImage}
                                  className="inline-flex items-center rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0077ED] mr-6 md:mr-10"
                                >
                                  Upload New
                                </button>
                              </div>
                            </div>
                            <div className="relative w-full overflow-hidden rounded-lg bg-gray-200 border border-gray-300 shadow-sm group">
                                <img 
                                    ref={originalImageRef}
                                    src={imageSrc} 
                                    alt="Original" 
                                    className="w-full h-auto cursor-crosshair"
                                    onClick={handleOriginalClick}
                                />
                                <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/5 transition-colors" />
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Click to pick color
                                </div>
                            </div>
                        </div>

                        {/* Processed Result */}
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
                                            <button
                                              className={`${active ? 'bg-gray-50' : ''} text-gray-700 block w-full text-left px-4 py-2 text-sm`}
                                              onClick={() => setDownloadFormat('png')}
                                            >
                                              PNG
                                            </button>
                                          )}
                                        </Menu.Item>
                                        <Menu.Item>
                                          {({ active }) => (
                                            <button
                                              className={`${active ? 'bg-gray-50' : ''} text-gray-700 block w-full text-left px-4 py-2 text-sm`}
                                              onClick={() => setDownloadFormat('jpeg')}
                                            >
                                              JPG
                                            </button>
                                          )}
                                        </Menu.Item>
                                        <Menu.Item>
                                          {({ active }) => (
                                            <button
                                              className={`${active ? 'bg-gray-50' : ''} text-gray-700 block w-full text-left px-4 py-2 text-sm`}
                                              onClick={() => setDownloadFormat('webp')}
                                            >
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
                            <div
                              className="relative w-full overflow-hidden rounded-lg bg-[url('/transparent-bg.png')] bg-repeat border border-gray-300 shadow-sm group"
                              style={{backgroundImage: 'conic-gradient(#eee 25%, white 0 25%, white 50%, #eee 0 50%, #eee 75%, white 0 75%, white)', backgroundSize: '20px 20px', overscrollBehavior: 'contain'}}
                              ref={resultContainerRef}
                            >
                                <div
                                  ref={controlsBarRef}
                                  className="z-20 flex items-center gap-2 bg-slate-100/90 backdrop-blur rounded-full px-2 py-1 border border-slate-300 shadow-md"
                                  style={controlsAffixed ? { position: 'fixed', top: controlsAffixPos.top, left: controlsAffixPos.left } : { position: 'absolute', top: '0.5rem', left: '0.5rem' }}
                                >
                                  <button
                                    className="rounded-full px-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                                    onClick={(e) => handleZoom(1.1, e)}
                                  >+</button>
                                  <button
                                    className="rounded-full px-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                                    onClick={(e) => handleZoom(0.9, e)}
                                  >−</button>
                                  <button
                                    className={`rounded-full px-2 text-sm font-semibold ${panMode ? 'bg-gray-200' : 'hover:bg-gray-100'} text-gray-900`}
                                    onClick={() => setPanMode(!panMode)}
                                    aria-label="Pan"
                                  >
                                    <HandRaisedIcon className="w-4 h-4 text-gray-900" />
                                  </button>
                                  <span className="text-xs text-gray-600">Zoom: {Math.round(zoom*100)}%</span>
                                  <button
                                    className="rounded-full px-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                                    onClick={resetView}
                                  >Reset View</button>
                                </div>
                                <canvas 
                                    ref={canvasRef}
                                    className={`w-full h-auto ${panMode ? 'cursor-grab' : 'cursor-crosshair'}`}
                                    onClick={handleResultClick}
                                    onMouseDown={handlePanStart}
                                    style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})`, transformOrigin: 'top left' }}
                                />
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                    Click artifact to remove
                                </div>
                                {isProcessing && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </div>
                                )}
                            </div>
                        </div>
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

               <h2 className="mt-12 text-2xl font-bold tracking-tight text-gray-900">{pageText.howTitle ?? toolText.stepTitle}</h2>
               <ul className="mt-4 list-disc pl-5 space-y-2 text-gray-600">
                  {(pageText.how1 || toolText.step1) && <li>{pageText.how1 ?? toolText.step1}</li>}
                  {(pageText.how2 || toolText.step2) && <li>{pageText.how2 ?? toolText.step2}</li>}
                  {(pageText.how3 || toolText.step3) && <li>{pageText.how3 ?? toolText.step3}</li>}
                  {pageText.how4 && <li>{pageText.how4}</li>}
                  {pageText.how5 && <li>{pageText.how5}</li>}
                  {pageText.how6 && <li>{pageText.how6}</li>}
               </ul>

               <h2 className="mt-12 text-2xl font-bold tracking-tight text-gray-900">{toolText.faqTitle}</h2>
               <dl className="mt-4 space-y-6 divide-y divide-gray-900/10">
                 {pageText.faq1Q && (
                     <div className="pt-6">
                        <dt className="text-base font-semibold leading-7 text-gray-900">{pageText.faq1Q}</dt>
                        <dd className="mt-2 text-base leading-7 text-gray-600 whitespace-pre-line">{pageText.faq1A}</dd>
                     </div>
                 )}
                 {pageText.faq2Q && (
                     <div className="pt-6">
                        <dt className="text-base font-semibold leading-7 text-gray-900">{pageText.faq2Q}</dt>
                        <dd className="mt-2 text-base leading-7 text-gray-600 whitespace-pre-line">{pageText.faq2A}</dd>
                     </div>
                 )}
                 {pageText.faq3Q && (
                     <div className="pt-6">
                        <dt className="text-base font-semibold leading-7 text-gray-900">{pageText.faq3Q}</dt>
                        <dd className="mt-2 text-base leading-7 text-gray-600 whitespace-pre-line">{pageText.faq3A}</dd>
                     </div>
                 )}
                 {pageText.faq4Q && (
                     <div className="pt-6">
                        <dt className="text-base font-semibold leading-7 text-gray-900">{pageText.faq4Q}</dt>
                        <dd className="mt-2 text-base leading-7 text-gray-600 whitespace-pre-line">{pageText.faq4A}</dd>
                     </div>
                 )}
               </dl>
            </div>
        </div>

      </main>
      <Footer locale={locale} page={pageName} />
    </>
  )
}
