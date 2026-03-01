'use client'
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { useCommonContext } from "~/context/common-context";
import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { QuestionMarkCircleIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon, ArrowRightIcon, SparklesIcon, PaintBrushIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { HandRaisedIcon } from "@heroicons/react/24/solid";
import { Menu, Transition } from "@headlessui/react";
import ComparisonSlider from "./ComparisonSlider";

const clamp = (v:number, min:number, max:number) => Math.min(max, Math.max(min, v));

export default function RemoveShadowTool({
  locale,
  pageName,
  pageText,
  toolText
}) {
  const { setShowLoadingModal } = useCommonContext();
  
  // State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [strength, setStrength] = useState<number>(90); // 0-100
  const [downloadFormat, setDownloadFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sceneType, setSceneType] = useState<'general' | 'building' | 'portrait' | 'object'>('general');
  const [aggressive, setAggressive] = useState<boolean>(true);
  const [bias, setBias] = useState<number>(60);
  const [extreme, setExtreme] = useState<boolean>(true);
  const [targetBright, setTargetBright] = useState<number>(92);
  
  // Zoom/Pan State
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);

  // Mask Painting State
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [maskCanvasData, setMaskCanvasData] = useState<ImageData | null>(null);
  
  // Undo/Redo State
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

  // Debounce
  const [debouncedStrength, setDebouncedStrength] = useState(strength);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedStrength(strength), 100);
    return () => clearTimeout(handler);
  }, [strength]);

  // Initialize canvas with original image when loaded to prevent layout shift
  useEffect(() => {
    if (originalImage && canvasRef.current) {
        canvasRef.current.width = originalImage.naturalWidth;
        canvasRef.current.height = originalImage.naturalHeight;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.drawImage(originalImage, 0, 0);
    }
  }, [originalImage]);





  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const samplesRef = useRef<HTMLElement | null>(null);
  const howToUseRef = useRef<HTMLDivElement | null>(null);
  const controlsBarRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  
  const [controlsAffixed, setControlsAffixed] = useState(false);
  const [controlsAffixPos, setControlsAffixPos] = useState({ top: 0, left: 0 });

  // Tooltips
  const [tooltipState, setTooltipState] = useState<{visible: boolean; x: number; y: number; text: string}>({visible: false, x: 0, y: 0, text: ''});
  const showTip = useCallback((e: any, text: string) => {
    const rect = (e?.currentTarget as HTMLElement)?.getBoundingClientRect?.();
    if (!rect) return;
    const padding = 8;
    const maxWidth = 280;
    let left = Math.min(rect.left, window.innerWidth - maxWidth - 12);
    if (left < 8) left = 8;
    const top = Math.min(rect.bottom + padding, window.innerHeight - 48);
    setTooltipState({visible: true, x: left, y: top, text});
  }, []);
  const hideTip = useCallback(() => {
    setTooltipState(prev => ({...prev, visible: false}));
  }, []);

  // SAMPLES
  const SAMPLES = [
    {
      id: 'building',
      title: pageText.sample1Title || 'Building Shadow',
      desc: pageText.sample1Desc || 'Reduce harsh shadows on building facades.',
      beforeUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/building-original.jpg', 
      afterUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/building-result.png',
      url: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/building-original.jpg',
      settings: { strength: 80, aggressive: true }
    },
    {
      id: 'portrait',
      title: pageText.sample2Title || 'Portrait Lighting',
      desc: pageText.sample2Desc || 'Balance uneven lighting on faces.',
      beforeUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-original.jpg',
      afterUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-result.png',
      url: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-original.jpg',
      settings: { strength: 60, aggressive: false }
    }
  ];

  const loadSample = (sample) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(sample.url);
      
      // Initialize Canvas with original image immediately to prevent layout shift
      // Handled by useEffect now


      if (sample.settings) {
        setStrength(sample.settings.strength ?? 90);
        setAggressive(sample.settings.aggressive ?? true);
      }
      // Reset mask
      if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      }
      setMaskCanvasData(null);

      // setIsProcessing(false); // Let applyShadowReduction handle this
      setTimeout(() => {
        if (workspaceRef.current) {
            const yOffset = -80;
            const element = workspaceRef.current;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
      }, 100);
    };
    img.onerror = () => {
        setIsProcessing(false);
        alert("Failed to load sample image.");
    };
    img.src = sample.url + (sample.url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
  };

  useEffect(() => {
    setShowLoadingModal(false);
  }, [setShowLoadingModal]);

  const processFile = useCallback((file) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(url);
      setStrength(90); // Reset strength
      
      // Initialize Canvas with original image immediately to prevent layout shift
      // Handled by useEffect now


      // Reset mask
      if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      }
      setMaskCanvasData(null);
      // setIsProcessing(false); // Let applyShadowReduction handle this
      setTimeout(() => {
        if (workspaceRef.current) {
            const yOffset = -80;
            const element = workspaceRef.current;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
      }, 100);
    };
    img.src = url;
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) processFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  // Zoom/Pan
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
    setZoom(1); setPanX(0); setPanY(0);
  };

  // Painting Logic
  const handleDrawStart = (e) => {
    if (panMode) {
        handlePanStart(e);
        return;
    }
    if (!maskCanvasRef.current || !originalImage) return;
    setIsDrawing(true);
    const rect = maskCanvasRef.current.getBoundingClientRect();
    const scaleX = maskCanvasRef.current.width / rect.width;
    const scaleY = maskCanvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Calculate adaptive brush size based on image dimensions
    // Base scale on larger dimension to ensure visibility on high-res images
    const maxDim = Math.max(originalImage.naturalWidth, originalImage.naturalHeight);
    const adaptiveScale = Math.max(1, maxDim / 1000); 
    const effectiveBrushSize = brushSize * adaptiveScale;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = effectiveBrushSize;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.globalCompositeOperation = 'source-over'; // Additive
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y); // Start drawing a dot
    ctx.stroke();

    const onDrawMove = (ev) => {
        // Use cached rect and scale values from closure to avoid getBoundingClientRect reflows
        const nx = (ev.clientX - rect.left) * scaleX;
        const ny = (ev.clientY - rect.top) * scaleY;
        
        ctx.lineTo(nx, ny);
        ctx.stroke();
        
        // Update cursor position during drawing
        if (cursorRef.current) {
             cursorRef.current.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -50%)`;
             // Ensure it's visible
             if (!panMode) cursorRef.current.style.opacity = '1';
        }
    };
    const onDrawEnd = () => {
        setIsDrawing(false);
        const newData = ctx.getImageData(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
        setMaskCanvasData(newData);
        
        // Add to history
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newData);
        if (newHistory.length > 20) newHistory.shift(); // Limit history size
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
        
        window.removeEventListener('mousemove', onDrawMove);
        window.removeEventListener('mouseup', onDrawEnd);
    };
    window.addEventListener('mousemove', onDrawMove);
    window.addEventListener('mouseup', onDrawEnd);
  };

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.code === 'Space') {
        const tgt = ev.target as HTMLElement;
        const tag = tgt && tgt.tagName;
        if (tag && (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA')) return;
        ev.preventDefault();
        setPanMode((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Hide custom cursor when in pan mode
  useEffect(() => {
    if (panMode && cursorRef.current) {
      cursorRef.current.style.opacity = '0';
    }
  }, [panMode]);

  // Shadow Reduction Logic
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
    const s = clamp(debouncedStrength, 0, 100) / 100;

    // Get Mask Data if exists
    let userMask = null;
    if (maskCanvasRef.current && maskCanvasData) {
        // If we have mask data, create a mask array
        // We assume mask canvas is same size as original image
        const mData = maskCanvasData.data;
        userMask = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            // Check alpha or red channel
            userMask[i] = mData[i * 4 + 3] > 0 ? 1.0 : 0.0;
        }
    }
    
    // Core Algorithm (Condensed for brevity but preserving logic)
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
      let base = Math.max(0, Math.min(1, mask0[k] * wEdge * wBkg));
      
      // Override with user mask if present
      if (userMask && userMask[k] > 0.5) {
        base = 1.0; // Force high probability for shadow if user painted it
      }
      
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
      const flatBg = Math.max(0, Math.min(1, (1 - varLumN[p]) * (1 - gradSm[p])));
      const subjectLik = Math.max(0, Math.min(1, 0.4 * varLumN[p] + 0.4 * gradSm[p] + 0.2 * sat[p]));
      const isCast = castMask[p] > 0.25 && lum[p] < meanLumLarge[p] * 0.97;
      const baseCast = isCast ? Math.max(0, Math.min(1, castMask[p] * (0.6 * bkgLik[p] + 0.4 * flatBg))) : 0;
      const baseSoft = Math.max(0, Math.min(1, maskWide[p] * (1 - subjectLik)));
      let wBase = Math.max(baseCast, baseSoft * 0.8);
      
      // Override with user mask if present
      if (userMask && userMask[p] > 0.5) {
        wBase = 1.0;
      }
      
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
  }, [originalImage, debouncedStrength, aggressive, bias, extreme, targetBright, maskCanvasData]);

  // Initialize canvas with original image when loaded to prevent layout shift
  useEffect(() => {
    if (originalImage && canvasRef.current) {
        canvasRef.current.width = originalImage.naturalWidth;
        canvasRef.current.height = originalImage.naturalHeight;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.drawImage(originalImage, 0, 0);
    }
  }, [originalImage]);

  // Remove auto-processing useEffect
  // useEffect(() => {
  //   if (!originalImage) return;
  //   setIsProcessing(true);
  //   const timer = setTimeout(() => {
  //       applyShadowReduction();
  //   }, 100);
  //   return () => clearTimeout(timer);
  // }, [debouncedStrength, aggressive, originalImage, applyShadowReduction]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mime = 'image/jpeg';
    if (downloadFormat === 'png') mime = 'image/png';
    if (downloadFormat === 'webp') mime = 'image/webp';
    let href = '';
    if (mime === 'image/jpeg') {
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

  const handleGenerate = async () => {
    if (!originalImage || !canvasRef.current) return;
    // Always use backend AI, even without mask (user requirement)
    await handleAiRefine();
  };

  const handleAiRefine = async () => {
    if (!originalImage || !canvasRef.current) return;
    
    // Get mask if exists
    let maskDataUrl = null;
    let currentMaskData = maskCanvasData;
    
    if (!currentMaskData && maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
          currentMaskData = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        }
    }

    if (maskCanvasRef.current && currentMaskData) {
         // Check if mask has any pixels
         let hasPixels = false;
         const data = currentMaskData.data;
         for (let i = 0; i < data.length; i += 4) {
             if (data[i + 3] > 0) {
                 hasPixels = true;
                 break;
             }
         }

         if (hasPixels) {
              // Create a binary mask (white for mask, black for background)
              const mCanvas = document.createElement('canvas');
              mCanvas.width = originalImage.naturalWidth;
              mCanvas.height = originalImage.naturalHeight;
              const mCtx = mCanvas.getContext('2d');
              if (mCtx) {
                  mCtx.fillStyle = 'black';
                  mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
                  
                  const srcData = currentMaskData.data;
                  const binData = mCtx.createImageData(mCanvas.width, mCanvas.height);
                  const dst = binData.data;
                  
                  for (let i = 0; i < srcData.length; i += 4) {
                      const alpha = srcData[i + 3];
                      if (alpha > 0) {
                          dst[i] = 255;     // R
                          dst[i + 1] = 255; // G
                          dst[i + 2] = 255; // B
                          dst[i + 3] = 255; // A
                      } else {
                          dst[i + 3] = 255; // A (opaque black)
                      }
                  }
                  mCtx.putImageData(binData, 0, 0);
                  maskDataUrl = mCanvas.toDataURL('image/png');
              }
         }
    }

    try {
      setIsProcessing(true);
      
      // Use the current canvas content as source (allows iterative editing)
      const src = canvasRef.current.toDataURL('image/jpeg', 0.95);

      const res = await fetch(`/${locale}/api/remove-shadow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: src,
          maskDataUrl,
          scene: sceneType
        })
      });
      
      const json = await res.json();
      if (res.ok && json.output_url) {
        // Load result into canvas
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                // Clear mask after successful refine
                handleClearMask();
            }
            setIsProcessing(false);
          }
        };
        img.onerror = () => {
           setIsProcessing(false);
           alert('Failed to load result image.');
        };
        img.src = json.output_url;
      } else {
        setIsProcessing(false);
        alert('AI refine failed: ' + (json.msg || 'Unknown error'));
      }
    } catch (e) {
      setIsProcessing(false);
      alert('AI refine failed.');
    }
  };

  const handleNewImage = () => {
    setImageSrc(null); setOriginalImage(null);
    setMaskCanvasData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Reset mask canvas
    if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
  };
  
  const handleClearMask = () => {
    if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            const emptyData = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            setMaskCanvasData(emptyData);
            
            // Add to history
            const newHistory = history.slice(0, historyStep + 1);
            newHistory.push(emptyData);
            if (newHistory.length > 20) newHistory.shift();
            setHistory(newHistory);
            setHistoryStep(newHistory.length - 1);
        }
    }
  };
  
  // Undo/Redo Handlers
  const handleUndo = () => {
    if (historyStep < 0) return; // Nothing to undo
    
    const prevStep = historyStep - 1;
    if (prevStep < 0) {
        // Undo to initial empty state
        if (maskCanvasRef.current) {
            const ctx = maskCanvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        }
        setMaskCanvasData(null);
        setHistoryStep(-1);
        return;
    }
    
    const prevData = history[prevStep];
    if (maskCanvasRef.current && prevData) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) ctx.putImageData(prevData, 0, 0);
        setMaskCanvasData(prevData);
        setHistoryStep(prevStep);
    }
  };

  const handleRedo = () => {
    if (historyStep >= history.length - 1) return; // Nothing to redo
    
    const nextStep = historyStep + 1;
    const nextData = history[nextStep];
    
    if (maskCanvasRef.current && nextData) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) ctx.putImageData(nextData, 0, 0);
        setMaskCanvasData(nextData);
        setHistoryStep(nextStep);
    }
  };

  return (
    <>
      {/* Custom Cursor */}
      <div 
        ref={cursorRef}
        className="fixed pointer-events-none rounded-full border-2 border-sky-400 z-[100] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 opacity-0"
        style={{ width: 20, height: 20, left: 0, top: 0 }}
      />
      <Header locale={locale} page={pageName} />
      <main className="isolate bg-slate-50">
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
        
        {/* Tool Section */}
        <div className="relative pt-32 pb-16">
           <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
             <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}} />
           </div>
           <div className="mx-auto max-w-7xl px-6 lg:px-8">
             <div className="mx-auto max-w-5xl text-center mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:whitespace-nowrap">{pageText.h1}</h1>
                <p className="mt-6 text-lg leading-8 text-slate-600">{pageText.description}</p>
                <div className="mt-8 flex items-center justify-center gap-x-6">
                  <button onClick={() => samplesRef.current?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 transition-all duration-300">
                    {pageText.seeSamplesBtn || 'See Samples'}
                  </button>
                  <button onClick={() => howToUseRef.current?.scrollIntoView({ behavior: 'smooth' })} className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all duration-300">
                    {pageText.howToUseBtn || 'Learn How to Use'}
                  </button>
                </div>
             </div>

             {/* Workspace */}
             <div ref={workspaceRef} className={`mx-auto flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${!imageSrc ? 'max-w-3xl bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl p-8 cursor-pointer hover:shadow-2xl' : 'max-w-[90rem] bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl p-4 lg:p-8 min-h-[420px]'}`} onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => { if (!imageSrc) fileInputRef.current?.click() }}>
                {!imageSrc ? (
                  <div className="w-full max-w-2xl mx-auto">
                    <div className="relative flex flex-col items-center justify-center gap-8 p-12 md:p-20 rounded-3xl border-2 border-dashed border-slate-300 hover:border-primary-400 hover:bg-white/50 transition-all duration-300 group overflow-hidden bg-white/30">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                      <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-white text-primary-600 shadow-md ring-1 ring-slate-900/5 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                          </svg>
                        </div>
                        <div className="text-center space-y-3">
                          <h2 className="text-2xl font-bold text-slate-900">{toolText.uploadTitle}</h2>
                          <p className="text-lg text-slate-600 max-w-lg mx-auto">{toolText.uploadDesc}</p>
                          <p className="text-sm text-slate-400">{toolText.uploadSubDesc}</p>
                        </div>
                      </div>
                      <div className="relative z-10 flex flex-col items-center gap-3">
                         <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/80 px-4 py-1.5 rounded-full border border-slate-200/60 backdrop-blur-sm shadow-sm">
                            <kbd className="font-sans font-semibold text-slate-500">Ctrl</kbd> <span className="text-slate-300">+</span> <kbd className="font-sans font-semibold text-slate-500">V</kbd> <span>to paste</span>
                         </div>
                      </div>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleUpload} accept="image/png, image/jpeg, image/webp" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-6">
                     {/* Toolbar */}
                     <div className="flex items-center gap-6 bg-white/80 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-white/20 sticky top-24 z-[60] flex-nowrap overflow-x-hidden overflow-y-visible whitespace-nowrap min-h-[56px]">
                        <div className="flex items-center gap-6 flex-nowrap">
                            {/* Brush Tool */}
                            <div className="flex items-center gap-6 relative whitespace-nowrap shrink-0">
                                <div className="flex items-center gap-4">
                                    <PaintBrushIcon className="w-5 h-5 text-slate-500" />
                                    <input type="range" min="1" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-32 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500 shrink-0 focus:outline-none" title="Brush Size" />
                                    
                                    {/* Undo/Redo Controls */}
                                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                                        <button 
                                            onClick={handleUndo} 
                                            disabled={historyStep < 0}
                                            className={`p-1.5 rounded-md transition-colors ${historyStep < 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                                            title="Undo"
                                        >
                                            <ArrowUturnLeftIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={handleRedo} 
                                            disabled={historyStep >= history.length - 1}
                                            className={`p-1.5 rounded-md transition-colors ${historyStep >= history.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                                            title="Redo"
                                        >
                                            <ArrowUturnRightIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <button onClick={handleClearMask} className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 bg-red-50 rounded-md ml-2">Clear Mask</button>
                                </div>
                            </div>

                            {/* Scene Selector */}
                            <div className="flex items-center gap-4 border-l pl-6 border-slate-200/60 relative whitespace-nowrap shrink-0">
                                <Menu as="div" className="relative inline-block text-left">
                                  <Menu.Button className="inline-flex items-center justify-center gap-x-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200">
                                    {sceneType === 'general' ? 'General' : sceneType === 'building' ? 'Building' : sceneType === 'portrait' ? 'Portrait' : 'Object'}
                                    <ChevronDownIcon className="h-3 w-3 text-slate-500" aria-hidden="true" />
                                  </Menu.Button>
                                  <Transition enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                                    <Menu.Items className="absolute left-0 z-30 mt-2 w-32 origin-top-left divide-y divide-slate-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                      <div className="py-1">
                                        {['general', 'building', 'portrait', 'object'].map(type => (
                                          <Menu.Item key={type}>
                                            {({ active }) => (
                                              <button className={`${active ? 'bg-slate-50' : ''} text-slate-700 block w-full text-left px-4 py-2 text-sm capitalize`} onClick={() => setSceneType(type as any)}>
                                                {type}
                                              </button>
                                            )}
                                          </Menu.Item>
                                        ))}
                                      </div>
                                    </Menu.Items>
                                  </Transition>
                                </Menu>
                            </div>
                            
                            <div className="flex items-center gap-2 border-l pl-3 border-slate-200/60 relative whitespace-nowrap shrink-0 ml-auto">
                                <button onClick={() => handleGenerate()} className="inline-flex items-center gap-1.5 rounded-full px-6 py-2 text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-md">
                                  <SparklesIcon className="w-4 h-4" />
                                  Remove Shadow
                                </button>
                            </div>
                        </div>
                     </div>
                     {tooltipState.visible && (
                      <div className="fixed z-[200] pointer-events-none rounded-md bg-white shadow-lg ring-1 ring-slate-900/10 px-3 py-2 text-xs text-slate-700 max-w-[280px] whitespace-normal break-words" style={{ top: tooltipState.y, left: tooltipState.x }}>
                        {tooltipState.text}
                      </div>
                     )}

                     {/* Split View Area */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                        {/* Original Image (Reference) */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-900">Original (Reference)</h3>
                              <div className="flex items-center">
                                <button onClick={handleNewImage} className="inline-flex items-center rounded-full bg-cta-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cta-600 mr-6 md:mr-10 transition-colors">
                                  Upload New
                                </button>
                              </div>
                            </div>
                            <div className="relative w-full overflow-hidden rounded-lg checkerboard border border-slate-300 shadow-sm group">
                                <div className="relative w-full h-full">
                                    <img ref={originalImageRef} src={imageSrc!} alt="Original" className="w-full h-auto cursor-default select-none pointer-events-none" onLoad={(e) => {
                                        // Sync mask canvas size (handled in useEffect now, but kept for safety)
                                        if (maskCanvasRef.current) {
                                            maskCanvasRef.current.width = (e.target as HTMLImageElement).naturalWidth;
                                            maskCanvasRef.current.height = (e.target as HTMLImageElement).naturalHeight;
                                        }
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Processed Result (Interactive) */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-900">Processed Result (Paint here)</h3>
                              <div className="flex items-center gap-2 mr-6 md:mr-10">
                                <button onClick={handleDownload} className="rounded-full bg-cta-500 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cta-600 transition-colors">
                                  {toolText.download}
                                </button>
                                <Menu as="div" className="relative inline-block text-left">
                                  <div>
                                    <Menu.Button className="inline-flex items-center justify-center gap-x-1.5 border border-slate-300 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors">
                                      {downloadFormat === 'png' ? 'PNG' : downloadFormat === 'jpeg' ? 'JPG' : 'WebP'}
                                      <ChevronDownIcon className="h-3 w-3 text-slate-500" aria-hidden="true" />
                                    </Menu.Button>
                                  </div>
                                  <Transition enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                                    <Menu.Items className="absolute right-0 z-30 mt-2 w-28 origin-top-right divide-y divide-slate-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                      <div className="py-1">
                                        {['png', 'jpeg', 'webp'].map(fmt => (
                                          <Menu.Item key={fmt}>
                                            {({ active }) => (
                                              <button className={`${active ? 'bg-slate-50' : ''} text-slate-700 block w-full text-left px-4 py-2 text-sm`} onClick={() => setDownloadFormat(fmt as any)}>
                                                {fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase()}
                                              </button>
                                            )}
                                          </Menu.Item>
                                        ))}
                                      </div>
                                    </Menu.Items>
                                  </Transition>
                                </Menu>
                              </div>
                            </div>
                            <div className="relative w-full overflow-hidden rounded-lg checkerboard border border-slate-300 shadow-sm group" style={{ overscrollBehavior: 'contain' }}>
                                <div ref={controlsBarRef} className="z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-full px-2 py-1 border border-white/20 shadow-lg absolute top-2 left-2">
                                  <button className="rounded-full p-2 text-slate-900 hover:bg-slate-100 transition-colors" onClick={(e) => handleZoom(1.1, e)} title="Zoom In"><MagnifyingGlassPlusIcon className="w-4 h-4" /></button>
                                  <button className="rounded-full p-2 text-slate-900 hover:bg-slate-100 transition-colors" onClick={(e) => handleZoom(0.9, e)} title="Zoom Out"><MagnifyingGlassMinusIcon className="w-4 h-4" /></button>
                                  <button className={`rounded-full p-2 transition-colors ${panMode ? 'bg-slate-200' : 'hover:bg-slate-100'} text-slate-900`} onClick={() => setPanMode(!panMode)} title="Pan Mode (Space)"><HandRaisedIcon className="w-4 h-4" /></button>
                                  <span className="text-xs text-slate-600 w-12 text-center select-none">{Math.round(zoom*100)}%</span>
                                  <button className="rounded-full p-2 text-slate-900 hover:bg-slate-100 transition-colors" onClick={resetView} title="Reset View"><ArrowPathIcon className="w-4 h-4" /></button>
                                </div>
                                
                                <div className="relative w-full h-full origin-top-left transition-transform duration-75" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}>
                                    <canvas ref={canvasRef} className="w-full h-auto cursor-crosshair" onMouseDown={handlePanStart} />
                                    <canvas 
                                        ref={maskCanvasRef}
                                        className={`absolute inset-0 w-full h-full ${panMode ? 'cursor-grab' : 'cursor-none'} opacity-80`}
                                        onMouseDown={handleDrawStart}
                                        onMouseMove={(e) => {
                                            if (isDrawing) return; // Handled by window listener
                                            // Update cursor position
                                            if (cursorRef.current) {
                                                cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
                                                
                                                // Update cursor size
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            // Scale calculation to match drawing logic
                                            const maxDim = Math.max(e.currentTarget.width, e.currentTarget.height);
                                            const adaptiveScale = Math.max(1, maxDim / 1000); 
                                            const effectiveBrushSize = brushSize * adaptiveScale;
                                            
                                            // Convert canvas pixels to CSS pixels for cursor
                                            const scaleX = rect.width / e.currentTarget.width;
                                            const size = effectiveBrushSize * scaleX;
                                            
                                            cursorRef.current.style.width = `${size}px`;
                                            cursorRef.current.style.height = `${size}px`;
                                                
                                                // Restore visibility if not in pan mode
                                                if (!panMode) cursorRef.current.style.opacity = '1';
                                            }
                                        }}
                                        onMouseEnter={() => {
                                            if (cursorRef.current && !panMode) cursorRef.current.style.opacity = '1';
                                        }}
                                        onMouseLeave={() => {
                                            if (cursorRef.current) cursorRef.current.style.opacity = '0';
                                        }}
                                    />
                                </div>

                                {isProcessing && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 space-y-16">
            {/* Sample Gallery */}
            <section ref={samplesRef} className="text-center scroll-mt-24">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-4">{pageText.sampleTitle || 'Try with Samples'}</h2>
                <p className="text-lg text-slate-600 mb-16 max-w-2xl mx-auto">{pageText.sampleDesc || 'Click any sample below to load it into the editor.'}</p>
                <div className="space-y-24">
                    {SAMPLES.map((sample, index) => (
                        <div key={sample.id} className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                            <div className="flex-1 text-left space-y-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary-600 transition-colors">{sample.title}</h3>
                                    <p className="text-lg text-slate-600 leading-relaxed">{sample.desc}</p>
                                </div>
                                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100/60 backdrop-blur-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>{pageText.sampleSettingsLabel || 'Settings used'}</div>
                                    <div className="flex flex-wrap gap-3">
                                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">Strength: {sample.settings.strength}%</span>
                                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">Mode: {sample.settings.aggressive ? 'Aggressive' : 'Normal'}</span>
                                    </div>
                                </div>
                                <button onClick={() => loadSample(sample)} className="group inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-500 transition-colors">
                                    {pageText.trySampleBtn || 'Try this sample'} 
                                    <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                            <div className="flex-1 relative group cursor-pointer" onClick={() => loadSample(sample)}>
                                <div className="absolute -inset-4 bg-gradient-to-r from-primary-100 to-purple-100 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"></div>
                                <ComparisonSlider 
                                    beforeUrl={sample.beforeUrl}
                                    afterUrl={sample.afterUrl}
                                    className="aspect-[3/2] rounded-2xl shadow-2xl border-4 border-white transform transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section ref={howToUseRef} className="scroll-mt-24">
                <div className="relative overflow-hidden bg-slate-900 rounded-3xl px-6 py-16 sm:px-16 sm:py-24 lg:py-32 shadow-2xl isolate">
                    <div className="absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                    <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 blur-3xl opacity-30 w-96 h-96 bg-primary-500 rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 blur-3xl opacity-30 w-96 h-96 bg-purple-500 rounded-full pointer-events-none"></div>
                    
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">{pageText.howToUseTitle || 'How to Remove Shadows'}</h2>
                        <p className="text-lg leading-8 text-slate-300 mb-12">{pageText.howToUseDesc || 'Follow these simple steps to clean up your images.'}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-6xl mx-auto">
                        {[
                            { step: '01', title: pageText.step1Title, desc: pageText.step1Desc },
                            { step: '02', title: pageText.step2Title, desc: pageText.step2Desc },
                            { step: '03', title: pageText.step3Title, desc: pageText.step3Desc },
                        ].map((item, i) => (
                            <div key={i} className="relative pl-16 md:pl-0 md:pt-16 md:text-center group">
                                <div className="absolute left-0 top-0 md:left-1/2 md:-translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-xl font-bold text-white shadow-lg backdrop-blur-sm group-hover:bg-primary-500 group-hover:border-primary-400 transition-all duration-300">
                                    {item.step}
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>

        <Footer locale={locale} page={pageName} />
      </main>
    </>
  );
}