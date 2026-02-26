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
import { QuestionMarkCircleIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import ComparisonSlider from "./ComparisonSlider";




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
    // Dynamic expansion based on blur radius to remove halos
    const extra = Math.max(2, Math.floor(rb * 0.8));
    m = dilate(m, w, h, extra);
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

  const SAMPLES = [
    {
      id: 'bird',
      title: pageText.sample1Title || 'Bird Background Removal',
      desc: pageText.sample1Desc || 'Automatically remove the blue sky background to isolate the bird.',
      beforeUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-original.jpg',
      afterUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-result.png',
      url: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/bird-original.jpg',
      settings: {
        tolerance: 11,
        refineStrength: 40,
        autoRefine: true,
        targetColors: [] // Empty means auto remove
      }
    },
    {
      id: 'building',
      title: pageText.sample2Title || 'Building Sky Replacement',
      desc: pageText.sample2Desc || 'Clear the blue sky behind the building for easy sky replacement.',
      beforeUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/building-original.jpg',
      afterUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/building-result.png',
      url: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/building-original.jpg',
      settings: {
        tolerance: 11,
        refineStrength: 40,
        autoRefine: true,
        targetColors: [] // Empty means auto remove
      }
    },
    {
      id: 'rainbow',
      title: pageText.sample3Title || 'Specific Color Eraser',
      desc: pageText.sample3Desc || 'Selectively remove only the green color from the rainbow ring.',
      beforeUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/rainbow-original.jpg',
      afterUrl: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/rainbow-result.png',
      url: 'https://pub-08705f8dc4354c6ca3fbd77c36fcec23.r2.dev/removecolor/rainbow-original.jpg',
      settings: {
        tolerance: 30,
        refineStrength: 40,
        autoRefine: true,
        targetColors: [{ r: 0, g: 255, b: 0, mode: 'global', tTol: 20 }] // Placeholder for green, actual color will be picked by user or auto logic if improved
      }
    }
  ];
  
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
  const [autoRemoving, setAutoRemoving] = useState(false);
  const [lastAutoColor, setLastAutoColor] = useState<{r:number; g:number; b:number; hex:string} | null>(null);
  
  // Debounced values for processing
  const [debouncedTolerance, setDebouncedTolerance] = useState(tolerance);
  const [debouncedRefineStrength, setDebouncedRefineStrength] = useState(refineStrength);

  // Debounce effect for tolerance and refineStrength
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTolerance(tolerance);
      setDebouncedRefineStrength(refineStrength);
    }, 150); // 150ms delay to improve slider performance
    return () => clearTimeout(handler);
  }, [tolerance, refineStrength]);

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
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  // Ref for original image click handling
  const originalImageRef = useRef(null);
  const workspaceRef = useRef(null);
  const controlsBarRef = useRef(null);
  const workspaceToolbarRef = useRef(null);
  const howToUseRef = useRef(null);
  const samplesRef = useRef(null);
  const [controlsAffixed, setControlsAffixed] = useState(false);
  const [controlsAffixPos, setControlsAffixPos] = useState({ top: 0, left: 0 });
  const loadSample = (sample) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(sample.url);
      
      if (sample.settings) {
        setTolerance(sample.settings.tolerance ?? 50);
        setRefineStrength(sample.settings.refineStrength ?? 40);
        setAutoRefine(sample.settings.autoRefine ?? true);
        
        const targets = (sample.settings.targetColors || []).map(t => {
            const { h, s, v } = rgbToHsv(t.r, t.g, t.b);
            return { ...t, h, s, v };
        });
        setTargetColors(targets);
      } else {
        setTargetColors([]);
      }
      
      setIsProcessing(false);
      
      // Scroll to workspace with better positioning
      setTimeout(() => {
        if (workspaceRef.current) {
            const yOffset = -80; // Offset for fixed header
            const element = workspaceRef.current;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }
      }, 100);
    };
    
    img.onerror = (e) => {
        console.error("Failed to load sample image", e);
        setIsProcessing(false);
        alert("Failed to load sample image. Please check your network or try again.");
    };
    
    // Add timestamp to bypass browser cache and force CORS check
    img.src = sample.url + (sample.url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
  };

  // Reset loading modal on mount
  useEffect(() => {
    setShowLoadingModal(false);
  }, [setShowLoadingModal]);

  const processFile = useCallback((file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(url);
      setTargetColors([]);
      // Initialize canvas (will be drawn by effect)
    };
    img.src = url;
  }, []);

  // Handle File Upload
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
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

  // Handle Paste from Clipboard
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
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [processFile]);

  // The Core Removal Function
  const processRemoval = useCallback(() => {
    if (!originalImage || !canvasRef.current) return;

    // Use debounced values for calculation
    const calcTolerance = debouncedTolerance;
    const calcRefineStrength = debouncedRefineStrength;

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
            const tUse = typeof tg.tTol === 'number' ? tg.tTol : calcTolerance;
            if (isNeutralSat(tg.s)) {
              const sLimit = Math.min(0.25, tg.s + (tUse / 150) * 0.20);
              const vTol = (tUse / 150) * 0.25 + 0.04;
              if (pv.s <= sLimit && Math.abs(pv.v - tg.v) <= vTol) {
                hit = true;
                break;
              }
            } else {
              const hueTol = Math.max(4, Math.round((tUse / 150) * 40));
              const sTol = (tUse / 150) * 0.35;
              const vTol = (tUse / 150) * 0.35;
              if (pv.s >= minSat) {
                const dh = hueDelta(pv.h, tg.h);
                if (dh <= hueTol && Math.abs(pv.s - tg.s) <= sTol && Math.abs(pv.v - tg.v) <= vTol) {
                  hit = true;
                  break;
                }
              } else {
                // 低饱和“边沿混合像素”回退：用 RGB 距离 + 亮度接近判断
                const dr = r - (tg.r ?? 0);
                const dg = g - (tg.g ?? 0);
                const db = b - (tg.b ?? 0);
                const dist = Math.sqrt(dr*dr + dg*dg + db*db);
                const rgbTol = 18 + (tUse / 150) * 28; // ≈18→46
                if (dist <= rgbTol && Math.abs(pv.v - tg.v) <= (vTol + 0.08)) {
                  hit = true;
                  break;
                }
              }
            }
          }
          if (hit) data[i + 3] = 0;
        }
      }
      
      // Auto 模式：局部种子中包含 auto=true，使用“全局匹配图 + 边缘连通”一次性去除
      const autoLocals = locals.filter(l => (l as any)?.auto === true);
      const manualLocals = locals.filter(l => !(l as any)?.auto);
      let simpleAutoApplied = false;
      if (autoLocals.length > 0) {
        const autoGroups: Record<string, any> = {};
        for (let k = 0; k < autoLocals.length; k++) {
          const s: any = autoLocals[k];
          const key = `${Math.round(s.tTol||calcTolerance)}|${s.r}|${s.g}|${s.b}`;
          if (!autoGroups[key]) autoGroups[key] = s;
        }
        const keys = Object.keys(autoGroups);
        for (let gi = 0; gi < keys.length; gi++) {
          const seed: any = autoGroups[keys[gi]];
          const tUse = typeof seed.tTol === 'number' ? seed.tTol : calcTolerance;
          const hueTol = seed.hTol ?? Math.max(12, Math.round((tUse / 150) * 30));
          const sTol = (tUse / 150) * 0.45;
          const vTol = (tUse / 150) * 0.50;
          const isN = isNeutralSat(seed.s);
          const match = new Uint8Array(w * h);
          for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            const r = src[i], g = src[i+1], b = src[i+2];
            const pv = rgbToHsv(r,g,b);
            let ok = false;
            if (seed.sMin !== undefined && seed.sMax !== undefined && seed.vMin !== undefined && seed.vMax !== undefined) {
              if (pv.s >= minSat) {
                const dh = hueDelta(pv.h, seed.h);
                const sMin = Math.max(0, seed.sMin - 0.02), sMax = Math.min(1, seed.sMax + 0.02);
                const vMin = Math.max(0, seed.vMin - 0.02), vMax = Math.min(1, seed.vMax + 0.02);
                if (dh <= hueTol && pv.s >= sMin && pv.s <= sMax && pv.v >= vMin && pv.v <= vMax) ok = true;
              } else {
                const dr = r - seed.r, dg = g - seed.g, db = b - seed.b;
                const dist = Math.sqrt(dr*dr + dg*dg + db*db);
                if (dist <= 60) ok = true;
              }
            } else if (isN) {
              const sLimit = Math.min(0.25, seed.s + (tUse / 150) * 0.20);
              const vTolN = (tUse / 150) * 0.25 + 0.05;
              if (pv.s <= sLimit && Math.abs(pv.v - seed.v) <= vTolN) ok = true;
            } else {
              if (pv.s >= minSat) {
                const dh = hueDelta(pv.h, seed.h);
                if (dh <= hueTol && Math.abs(pv.s - seed.s) <= sTol && Math.abs(pv.v - seed.v) <= vTol) ok = true;
              } else {
                const dr = r - seed.r, dg = g - seed.g, db = b - seed.b;
                const dist = Math.sqrt(dr*dr + dg*dg + db*db);
                const rgbTol = 18 + (tUse / 150) * 28;
                if (dist <= rgbTol && Math.abs(pv.v - seed.v) <= (vTol + 0.08)) ok = true;
              }
            }
            if (ok) match[p] = 1;
          }
          if (seed.dominant) {
            for (let p = 0, i = 0; p < match.length; p++, i += 4) {
              if (match[p]) data[i + 3] = 0;
            }
            simpleAutoApplied = true;
          } else {
            const visited = new Uint8Array(w * h);
            const q = new Int32Array(w * h * 2);
            let qi = 0, qj = 0;
            const push = (tx: number, ty: number) => {
               const ti = ty * w + tx;
               if (!visited[ti] && match[ti]) {
                 visited[ti] = 1;
                 q[qj++] = tx;
                 q[qj++] = ty;
               }
            };
            for (let x = 0; x < w; x++) {
              push(x, 0);
              push(x, h - 1);
            }
            for (let y = 1; y < h - 1; y++) {
              push(0, y);
              push(w - 1, y);
            }
            while (qi < qj) {
              const x = q[qi++], y = q[qi++];
              const idx = y * w + x;
              const off = idx * 4;
              data[off + 3] = 0;
              if (x > 0) push(x - 1, y);
              if (x < w - 1) push(x + 1, y);
              if (y > 0) push(x, y - 1);
              if (y < h - 1) push(x, y + 1);
            }
          }
        }
      }
      let simpleManualApplied = false;
      if (manualLocals.length > 0) {
        const groups: Record<string, {seed:any, points: Array<{x:number;y:number}>}> = {};
        for (let k = 0; k < manualLocals.length; k++) {
          const s = manualLocals[k];
          const key = `${Math.round(s.tTol||calcTolerance)}|${s.r}|${s.g}|${s.b}`;
          if (!groups[key]) groups[key] = { seed: s, points: [] };
          groups[key].points.push({ x: Math.min(w - 1, Math.max(0, Math.floor(s.x || 0))), y: Math.min(h - 1, Math.max(0, Math.floor(s.y || 0))) });
        }
        const keys = Object.keys(groups);
        for (let gi = 0; gi < keys.length; gi++) {
          const { seed, points } = groups[keys[gi]];
          const tUse = typeof seed.tTol === 'number' ? seed.tTol : calcTolerance;
          
          // Check if this group qualifies for Global Clear
          // Based on seed estimation: hits in grid sampling
          const hueTolCheck = Math.max(20, Math.round((tUse / 150) * 36));
          let gHits = 0, gAll = 0;
          const step = Math.max(8, Math.floor(Math.min(w, h) / 80));
          for (let yy = 0; yy < h; yy += step) {
            for (let xx = 0; xx < w; xx += step) {
              const off = (yy * w + xx) * 4;
              const a0 = src[off+3] ?? data[off+3];
              if (a0 <= 8) continue;
              const r0 = src[off], g0 = src[off+1], b0 = src[off+2];
              const pv0 = rgbToHsv(r0,g0,b0);
              const dh0 = hueDelta(pv0.h, seed.h);
              if (dh0 <= hueTolCheck && pv0.s >= 0.05) gHits++;
              gAll++;
            }
          }
          const ratio = gAll ? gHits / gAll : 0;
          
          if (ratio >= 0.10) {
            // Simple Background: Global Clear
            // Use tighter tolerance for execution to avoid over-clearing similar colors (e.g. orange vs yellow)
            const hueTolExec = Math.max(4, Math.round((tUse / 150) * 40));
            const sTolExec = (tUse / 150) * 0.35 + 0.05;
            const vTolExec = (tUse / 150) * 0.35 + 0.05;
            
            const sMin = Math.max(0, seed.s - sTolExec), sMax = Math.min(1, seed.s + sTolExec);
            const vMin = Math.max(0, seed.v - vTolExec), vMax = Math.min(1, seed.v + vTolExec);
            
            for (let i = 0, p = 0; i < data.length; i += 4, p++) {
              const r = src[i], g = src[i+1], b = src[i+2];
              const pv = rgbToHsv(r,g,b);
              let ok = false;
              if (pv.s >= minSat) {
                const dh = hueDelta(pv.h, seed.h);
                if (dh <= hueTolExec && pv.s >= sMin && pv.s <= sMax && pv.v >= vMin && pv.v <= vMax) ok = true;
              } else {
                const dr = r - seed.r, dg = g - seed.g, db = b - seed.b;
                const dist = Math.sqrt(dr*dr + dg*dg + db*db);
                if (dist <= 60) ok = true;
              }
              if (ok) data[i + 3] = 0;
            }
            simpleManualApplied = true;
          } else {
            // Complex Background: BFS
            const hueTol = Math.max(4, Math.round((tUse / 150) * 40));
            const sTol = (tUse / 150) * 0.35;
            const vTol = (tUse / 150) * 0.35;
            const visited = new Uint8Array(w * h);
            const q = new Int32Array(w * h * 2);
            let qi = 0, qj = 0;
            const push = (tx: number, ty: number) => {
              const idx = ty * w + tx;
              if (!visited[idx]) {
                visited[idx] = 1;
                q[qj++] = tx;
                q[qj++] = ty;
              }
            };
            for (let p = 0; p < points.length; p++) {
              push(points[p].x, points[p].y);
            }
            while (qi < qj) {
              const x = q[qi++], y = q[qi++];
              const idx = y * w + x;
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
                } else {
                  const dr = r - (seed.r ?? 0);
                  const dg = g - (seed.g ?? 0);
                  const db = b - (seed.b ?? 0);
                  const dist = Math.sqrt(dr*dr + dg*dg + db*db);
                  const rgbTol = 18 + (tUse / 150) * 28;
                  if (dist <= rgbTol && Math.abs(pv.v - seed.v) <= (vTol + 0.08)) {
                    matched = true;
                  }
                }
              }
              if (matched) {
                data[off + 3] = 0;
                if (x > 0) push(x - 1, y);
                if (x < w - 1) push(x + 1, y);
                if (y > 0) push(x, y - 1);
                if (y < h - 1) push(x, y + 1);
              }
            }
          }
        }
      }
      
      if (globals.length > 0) {
        const anyColor = globals.find(gm => !isNeutralSat(gm.s));
        if (anyColor) {
          const leftBand = Math.max(2, Math.floor(w * 0.03));
          const rightBand = Math.max(2, Math.floor(w * 0.03));
          const topBand = Math.max(2, Math.floor(h * 0.03));
          const botBand = Math.max(2, Math.floor(h * 0.03));
          const vHi = 0.85;
          const sLo = 0.12;
          const clearIf = (off: number) => {
            const rr = src[off], gg = src[off + 1], bb = src[off + 2];
            const pa = data[off + 3];
            if (pa <= 8) return false;
            const hv = rgbToHsv(rr, gg, bb);
            if (hv.s <= sLo && hv.v >= vHi) { data[off + 3] = 0; return true; }
            return false;
          };
          for (let y = 0; y < h; y++) {
            let stop = 0;
            for (let x = 0; x < leftBand; x++) {
              const off = (y * w + x) * 4;
              if (!clearIf(off)) { if (++stop > 6) break; } else { stop = 0; }
            }
            stop = 0;
            for (let x = w - 1; x >= w - rightBand; x--) {
              const off = (y * w + x) * 4;
              if (!clearIf(off)) { if (++stop > 6) break; } else { stop = 0; }
            }
          }
          for (let x = 0; x < w; x++) {
            let stop = 0;
            for (let y = 0; y < topBand; y++) {
              const off = (y * w + x) * 4;
              if (!clearIf(off)) { if (++stop > 6) break; } else { stop = 0; }
            }
            stop = 0;
            for (let y = h - 1; y >= h - botBand; y--) {
              const off = (y * w + x) * 4;
              if (!clearIf(off)) { if (++stop > 6) break; } else { stop = 0; }
            }
          }
        }
        const nMask = new Uint8Array(w * h);
        const rgbTolBase = 22 + (calcTolerance / 150) * 28;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const off = idx * 4;
            if (data[off + 3] === 0) continue;
            let z = 0;
            if (data[((y)*w + (x-1))*4 + 3] === 0) z++;
            if (data[((y)*w + (x+1))*4 + 3] === 0) z++;
            if (data[((y-1)*w + x)*4 + 3] === 0) z++;
            if (data[((y+1)*w + x)*4 + 3] === 0) z++;
            if (z < 2) continue;
            const r = src[off], g = src[off + 1], b = src[off + 2];
            const pv = rgbToHsv(r, g, b);
            let ok = false;
            for (let j = 0; j < globals.length; j++) {
              const tg = globals[j];
              const tUse = typeof tg.tTol === 'number' ? tg.tTol : calcTolerance;
              const hueTol = Math.max(4, Math.round((tUse / 150) * 40));
              const sTol = (tUse / 150) * 0.35;
              const vTol = (tUse / 150) * 0.35;
              if (isNeutralSat(tg.s) || pv.s < 0.10) {
                const dr = r - (tg.r || 0);
                const dg = g - (tg.g || 0);
                const db = b - (tg.b || 0);
                const dist = Math.sqrt(dr*dr + dg*dg + db*db);
                if (dist <= rgbTolBase && Math.abs(pv.v - tg.v) <= (vTol + 0.10)) { ok = true; break; }
              } else {
                if (pv.s >= 0.06) {
                  const dh = hueDelta(pv.h, tg.h);
                  if (dh <= hueTol && Math.abs(pv.s - tg.s) <= (sTol + 0.08) && Math.abs(pv.v - tg.v) <= (vTol + 0.08)) { ok = true; break; }
                }
              }
            }
            if (ok) nMask[idx] = 1;
          }
        }
        for (let i = 0; i < w*h; i++) {
          if (nMask[i]) data[i*4 + 3] = 0;
        }
      }
      
      const minEdgeStrength = 40;
      if (autoRefine && !simpleAutoApplied && !simpleManualApplied) {
        const eff = Math.max(calcRefineStrength, minEdgeStrength);
        refineAlphaMask(data, w, h, eff);
      } else if (globals.length > 0 && !simpleAutoApplied && !simpleManualApplied) {
        refineAlphaMask(data, w, h, minEdgeStrength);
      }
      ctx.putImageData(imageData, 0, 0);
      setIsProcessing(false);
    });
  }, [originalImage, targetColors, debouncedTolerance, autoRefine, debouncedRefineStrength]);

  // Trigger processing when tolerance or target colors change
  useEffect(() => {
    if (originalImage) {
      processRemoval();
    }
  }, [targetColors, debouncedTolerance, debouncedRefineStrength, processRemoval, originalImage]);


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

  const handleAutoRemove = () => {
    if (!originalImage) return;
    setAutoRemoving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = originalImage.naturalWidth;
      canvas.height = originalImage.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(originalImage, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const width = canvas.width;
      const height = canvas.height;

      const qStep = 6;
      const makeKey = (r: number, g: number, b: number) => `${Math.round(r/qStep)*qStep},${Math.round(g/qStep)*qStep},${Math.round(b/qStep)*qStep}`;
      const countsAll: Record<string, number> = {};
      const countsFiltered: Record<string, number> = {};
      const addPixel = (idx: number) => {
        const r = imageData[idx], g = imageData[idx+1], b = imageData[idx+2], a = imageData[idx+3];
        if (a <= 8) return; // 忽略几乎透明像素
        const key = makeKey(r,g,b);
        countsAll[key] = (countsAll[key] || 0) + 1;
        const { s, v } = rgbToHsv(r,g,b);
        const nearWhite = (s <= 0.10 && v >= 0.92);
        const nearBlack = (v <= 0.08);
        if (!nearWhite && !nearBlack) {
          countsFiltered[key] = (countsFiltered[key] || 0) + 1;
        }
      };
      // 采样四边各 3% 宽/高的条带
      const bw = Math.max(2, Math.floor(width * 0.03));
      const bh = Math.max(2, Math.floor(height * 0.03));
      for (let x = 0; x < width; x += 3) {
        for (let y = 0; y < bh; y += 2) addPixel((y*width + x) * 4); // top strip
        for (let y = height - bh; y < height; y += 2) addPixel((y*width + x) * 4); // bottom strip
      }
      for (let y = 0; y < height; y += 3) {
        for (let x = 0; x < bw; x += 2) addPixel((y*width + x) * 4); // left strip
        for (let x = width - bw; x < width; x += 2) addPixel((y*width + x) * 4); // right strip
      }
      // 再采样内缩 5% 的内圈条带（避免图片白边）
      const ix = Math.max(2, Math.floor(width * 0.05));
      const iy = Math.max(2, Math.floor(height * 0.05));
      for (let x = ix; x < width - ix; x += 4) {
        addPixel((iy*width + x) * 4);
        addPixel(((height - 1 - iy)*width + x) * 4);
      }
      for (let y = iy; y < height - iy; y += 4) {
        addPixel((y*width + ix) * 4);
        addPixel((y*width + (width - 1 - ix)) * 4);
      }

      const pickFrom = (store: Record<string, number>) => {
        let maxKey: string | null = null, maxVal = 0;
        for (const k in store) { if (store[k] > maxVal) { maxVal = store[k]; maxKey = k; } }
        return maxKey;
      };
      // 首选“过滤后的”统计，回退到“全部”的统计
      let key = pickFrom(countsFiltered);
      if (!key) key = pickFrom(countsAll);
      if (key) {
        const [r, g, b] = key.split(',').map(Number);
        const { h, s, v } = rgbToHsv(r, g, b);
        
        // AUTO MODE OPTIMIZATION
        // Previous Logic: Aggressive tolerance (60 or 45) + complex range expansion + "dominant" mode
        // New Logic: Mimic MANUAL mode behavior as requested by user.
        // 1. Use standard manual tolerance (approx 20% ~ 30/150) as base
        // 2. Disable "dominant" mode by default to prevent over-clearing foreground (birds, etc.)
        // 3. Use standard point-seed logic instead of range-based clearing
        
        // Create a standard point-seed entry, similar to a manual click
        // Note: tTol is NOT set, so it binds to the global 'tolerance' slider
        setTargetColors([{ 
          r, g, b, h, s, v, 
          mode: 'local', 
          auto: true,
          // Explicitly disable aggressive "dominant" range clearing
          dominant: false, 
          sMin: undefined, sMax: undefined, 
          vMin: undefined, vMax: undefined
        } as any]);
        
        setLastAutoColor(null);
      }
    } finally {
      setAutoRemoving(false);
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
    if (showGuide) setShowGuide(false);
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
    const el = workspaceRef.current;
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
      const containerEl = workspaceRef.current;
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

  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    if (!imageSrc) {
      setShowGuide(false);
      return;
    }
    if (targetColors.length === 0) {
      setShowGuide(true);
      const id = setTimeout(() => setShowGuide(false), 3000);
      return () => clearTimeout(id);
    } else {
      setShowGuide(false);
    }
  }, [imageSrc, targetColors.length]);

  return (
    <>
      <Header locale={locale} page={pageName} />
      <main className="isolate bg-slate-50">
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
           <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
             <div
               className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
               style={{
                 clipPath:
                   'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
               }}
             />
           </div>
           <div className="mx-auto max-w-7xl px-6 lg:px-8">
             <div className="mx-auto max-w-5xl text-center mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:whitespace-nowrap">
                  {pageText.h1}
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                  {pageText.description}
                </p>
                
                {/* Action Buttons */}
                <div className="mt-8 flex items-center justify-center gap-x-6">
                  <button
                    onClick={() => samplesRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-all duration-300"
                  >
                    {pageText.seeSamplesBtn || 'See Samples'}
                  </button>
                  <button
                    onClick={() => howToUseRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all duration-300"
                  >
                    {pageText.howToUseBtn || 'Learn How to Use'}
                  </button>
                </div>
             </div>

             {/* Workspace */}
             <div 
                ref={workspaceRef}
                className={`mx-auto flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${
                    !imageSrc 
                        ? 'max-w-3xl bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl p-8 cursor-pointer hover:shadow-2xl' 
                        : 'max-w-[90rem] bg-white/60 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl p-4 lg:p-8 min-h-[420px]'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => { if (!imageSrc) fileInputRef.current?.click() }}
             >
                {!imageSrc ? (
                  <div className="w-full max-w-2xl mx-auto">
                    <div
                      className="relative flex flex-col items-center justify-center gap-8 p-12 md:p-20 rounded-3xl border-2 border-dashed border-slate-300 hover:border-primary-400 hover:bg-white/50 transition-all duration-300 group overflow-hidden bg-white/30"
                    >
                      {/* Decorative Background Pattern */}
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                           style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                      </div>

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

                      {/* Shortcuts & Info */}
                      <div className="relative z-10 flex flex-col items-center gap-3">
                         <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/80 px-4 py-1.5 rounded-full border border-slate-200/60 backdrop-blur-sm shadow-sm">
                            <kbd className="font-sans font-semibold text-slate-500">Ctrl</kbd> <span className="text-slate-300">+</span> <kbd className="font-sans font-semibold text-slate-500">V</kbd> <span>to paste from clipboard</span>
                         </div>
                      </div>

                      <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleUpload} accept="image/png, image/jpeg, image/webp" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-6">
                     {/* Toolbar */}
                     <div ref={workspaceToolbarRef} className="flex items-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/20 sticky top-24 z-[60] flex-nowrap overflow-x-hidden overflow-y-visible whitespace-nowrap min-h-[56px]">
                        <div className="flex items-center gap-3 flex-nowrap">
                            <button
                                onClick={handleAutoRemove}
                                disabled={!originalImage || autoRemoving}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold shrink-0 transition-colors ${autoRemoving ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600 hover:bg-primary-100 disabled:opacity-60'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
                                </svg>
                                {autoRemoving ? 'Auto Removing…' : 'Auto Remove BG'}
                            </button>
                            {/* 检测到的背景色徽标已关闭以保证工具条稳定布局 */}
                            
                            <div className="flex items-center gap-2 border-l pl-3 border-slate-200/60 relative whitespace-nowrap shrink-0">
                                <span className="text-sm font-medium text-slate-700 whitespace-nowrap min-w-[96px] sm:min-w-[110px] md:min-w-[120px]" style={{fontVariantNumeric:'tabular-nums'}}>Tolerance: {Math.round((tolerance / 442) * 100)}%</span>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-slate-500 cursor-help" onMouseEnter={(e) => showTip(e, toolText.tolTip)} onMouseLeave={hideTip} />
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="442" 
                                    value={tolerance} 
                                    onChange={(e) => setTolerance(Number(e.target.value))}
                                    onMouseEnter={(e) => showTip(e, toolText.tolTip)}
                                    onMouseLeave={hideTip}
                                    className="w-24 sm:w-28 md:w-32 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 shrink-0 focus:outline-none focus-visible:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2 border-l pl-3 border-slate-200/60 relative whitespace-nowrap shrink-0">
                                <span className="text-sm font-medium text-slate-700 whitespace-nowrap min-w-[88px] sm:min-w-[100px]" style={{fontVariantNumeric:'tabular-nums'}}>Refine: {refineStrength}%</span>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-slate-500 cursor-help" onMouseEnter={(e) => showTip(e, toolText.refineTip)} onMouseLeave={hideTip} />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={refineStrength}
                                    onChange={(e) => setRefineStrength(Number(e.target.value))}
                                    onMouseEnter={(e) => showTip(e, toolText.refineTip)}
                                    onMouseLeave={hideTip}
                                    className="w-20 sm:w-24 md:w-28 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 shrink-0 focus:outline-none focus-visible:outline-none"
                                />
                                <button
                                  onClick={() => setAutoRefine(!autoRefine)}
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors ${autoRefine ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} shrink-0`}
                                >
                                  Auto Refine
                                </button>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-slate-500 cursor-help" onMouseEnter={(e) => showTip(e, toolText.autoRefineTip)} onMouseLeave={hideTip} />
                            </div>

                            <button
                                onClick={handleUndo}
                                disabled={targetColors.length === 0}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
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
                              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 shrink-0 transition-colors"
                            >
                              Reset Edits
                            </button>
                        </div>

                        
                     </div>
                     {tooltipState.visible && (
                      <div
                        className="fixed z-[200] pointer-events-none rounded-md bg-white shadow-lg ring-1 ring-slate-900/10 px-3 py-2 text-xs text-slate-700 max-w-[280px] whitespace-normal break-words"
                        style={{ top: tooltipState.y, left: tooltipState.x }}
                      >
                        {tooltipState.text}
                      </div>
                     )}

                     {/* Split View Area */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                        {/* Original Image (Clickable) */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-900">Original (Compare only)</h3>
                              <div className="flex items-center">
                                <button
                                  onClick={handleNewImage}
                                  className="inline-flex items-center rounded-full bg-cta-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cta-600 mr-6 md:mr-10 transition-colors"
                                >
                                  Upload New
                                </button>
                              </div>
                            </div>
                            <div className="relative w-full overflow-hidden rounded-lg checkerboard border border-slate-300 shadow-sm group">
                                <img 
                                    ref={originalImageRef}
                                    src={imageSrc} 
                                    alt="Original" 
                                    className="w-full h-auto cursor-default select-none"
                                />
                                <div className="absolute top-2 right-2 bg-slate-800/80 text-white text-[10px] px-2 py-1 rounded pointer-events-none">Compare only</div>
                            </div>
                        </div>

                        {/* Processed Result */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-900">Processed Result</h3>
                              <div className="flex items-center gap-2 mr-6 md:mr-10">
                                <button
                                  onClick={handleDownload}
                                  className="rounded-full bg-cta-500 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cta-600 transition-colors"
                                >
                                  {toolText.download}
                                </button>
                                <Menu as="div" className="relative inline-block text-left">
                                  <div>
                                    <Menu.Button className="inline-flex items-center justify-center gap-x-1.5 border border-slate-300 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors">
                                      {downloadFormat === 'png' ? 'PNG' : downloadFormat === 'jpeg' ? 'JPG' : 'WebP'}
                                      <ChevronDownIcon className="h-3 w-3 text-slate-500" aria-hidden="true" />
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
                                    <Menu.Items className="absolute right-0 z-30 mt-2 w-28 origin-top-right divide-y divide-slate-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                      <div className="py-1">
                                        <Menu.Item>
                                          {({ active }) => (
                                            <button
                                              className={`${active ? 'bg-slate-50' : ''} text-slate-700 block w-full text-left px-4 py-2 text-sm`}
                                              onClick={() => setDownloadFormat('png')}
                                            >
                                              PNG
                                            </button>
                                          )}
                                        </Menu.Item>
                                        <Menu.Item>
                                          {({ active }) => (
                                            <button
                                              className={`${active ? 'bg-slate-50' : ''} text-slate-700 block w-full text-left px-4 py-2 text-sm`}
                                              onClick={() => setDownloadFormat('jpeg')}
                                            >
                                              JPG
                                            </button>
                                          )}
                                        </Menu.Item>
                                        <Menu.Item>
                                          {({ active }) => (
                                            <button
                                              className={`${active ? 'bg-slate-50' : ''} text-slate-700 block w-full text-left px-4 py-2 text-sm`}
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
                              className="relative w-full overflow-hidden rounded-lg checkerboard border border-slate-300 shadow-sm group"
                              style={{ overscrollBehavior: 'contain' }}
                            >
                                {showGuide && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="rounded-full bg-cta-500 text-white text-xs px-3 py-2 shadow-md animate-bounce">
                                      Click background to remove
                                    </div>
                                  </div>
                                )}
                                <div
                                  ref={controlsBarRef}
                                  className="z-20 flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-full px-2 py-1 border border-white/20 shadow-lg"
                                  style={controlsAffixed ? { position: 'fixed', top: controlsAffixPos.top, left: controlsAffixPos.left } : { position: 'absolute', top: '0.5rem', left: '0.5rem' }}
                                >
                                  <button
                                    className="rounded-full p-2 text-slate-900 hover:bg-slate-100 transition-colors"
                                    onClick={(e) => handleZoom(1.1, e)}
                                    title="Zoom In"
                                  >
                                    <MagnifyingGlassPlusIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="rounded-full p-2 text-slate-900 hover:bg-slate-100 transition-colors"
                                    onClick={(e) => handleZoom(0.9, e)}
                                    title="Zoom Out"
                                  >
                                    <MagnifyingGlassMinusIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    className={`rounded-full p-2 transition-colors ${panMode ? 'bg-slate-200' : 'hover:bg-slate-100'} text-slate-900`}
                                    onClick={() => setPanMode(!panMode)}
                                    title="Pan Mode (Space)"
                                  >
                                    <HandRaisedIcon className="w-4 h-4" />
                                  </button>
                                  <span className="text-xs text-slate-600 w-12 text-center select-none">{Math.round(zoom*100)}%</span>
                                  <button
                                    className="rounded-full p-2 text-slate-900 hover:bg-slate-100 transition-colors"
                                    onClick={resetView}
                                    title="Reset View"
                                  >
                                    <ArrowPathIcon className="w-4 h-4" />
                                  </button>
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
                <p className="text-lg text-slate-600 mb-16 max-w-2xl mx-auto">{pageText.sampleDesc || 'Click any sample below to load it into the editor and see the background removal result instantly.'}</p>
                
                <div className="space-y-24">
                    {SAMPLES.map((sample, index) => (
                        <div 
                            key={sample.id} 
                            className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
                        >
                            {/* Text Content */}
                            <div className="flex-1 text-left space-y-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary-600 transition-colors">
                                        {sample.title}
                                    </h3>
                                    <p className="text-lg text-slate-600 leading-relaxed">{sample.desc}</p>
                                </div>
                                
                                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100/60 backdrop-blur-sm">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                        {pageText.sampleSettingsLabel || 'Settings used'}
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white shadow-sm border border-slate-100 text-sm font-medium text-slate-600">
                                            Tolerance: {sample.settings.tolerance}%
                                        </span>
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white shadow-sm border border-slate-100 text-sm font-medium text-slate-600">
                                            Refine: {sample.settings.refineStrength}
                                        </span>
                                         {sample.settings.targetColors && sample.settings.targetColors.length > 0 && (
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white shadow-sm border border-slate-100 text-sm font-medium text-slate-600">
                                                <span 
                                                    className="w-3 h-3 rounded-full mr-2 shadow-sm ring-1 ring-slate-200" 
                                                    style={{ backgroundColor: `rgb(${sample.settings.targetColors[0].r}, ${sample.settings.targetColors[0].g}, ${sample.settings.targetColors[0].b})` }}
                                                ></span>
                                                Target Color
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="pt-2">
                                    <button 
                                        onClick={() => loadSample(sample)}
                                        className="group/btn inline-flex items-center gap-2 bg-slate-900 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-full shadow-lg shadow-slate-900/10 hover:shadow-primary-600/20 transition-all duration-300 transform hover:-translate-y-0.5"
                                    >
                                        {pageText.sampleTryButton || 'Try this sample'}
                                        <ArrowRightIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                    </button>
                                </div>
                            </div>

                            {/* Interactive Slider */}
                            <div className="flex-1 w-full max-w-2xl">
                                <div className="relative rounded-2xl p-2 bg-white shadow-2xl shadow-slate-200/50 ring-1 ring-slate-100 transform transition-transform hover:scale-[1.01] duration-500">
                                    <ComparisonSlider 
                                        beforeUrl={sample.beforeUrl} 
                                        afterUrl={sample.afterUrl} 
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* About & Features */}
            <section className="relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-8 lg:p-12 transition-all hover:shadow-2xl hover:bg-white/70">
               <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
               <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">{toolText.aboutTitle}</h2>
               <div className="prose prose-lg prose-slate max-w-none">
                 <p className="text-slate-600 leading-relaxed">{pageText.aboutDesc}</p>
                 {pageText.featureTitle && (
                   <>
                     <h3 className="text-2xl font-bold text-slate-900 mt-8 mb-4">{pageText.featureTitle}</h3>
                     <p className="text-slate-600">{pageText.featureDesc}</p>
                   </>
                 )}
                 {pageText.useCasesTitle && (
                   <>
                     <h3 className="text-2xl font-bold text-slate-900 mt-8 mb-4">{pageText.useCasesTitle}</h3>
                     <div className="text-slate-600 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: (pageText.useCasesDesc || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                   </>
                 )}
               </div>
            </section>

            {/* How to Use & Tool Guide */}
            <div ref={howToUseRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8 scroll-mt-24">
               {/* Tool Settings & Controls */}
               <section className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-8 lg:p-12 h-full transition-all hover:shadow-2xl hover:bg-white/70">
                   <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">{pageText.settingsTitle || 'Tool Settings & Controls'}</h2>
                   <div className="space-y-6">
                       {[
                           { title: pageText.settingToleranceTitle, desc: pageText.settingToleranceDesc },
                           { title: pageText.settingRefineTitle, desc: pageText.settingRefineDesc },
                           { title: pageText.settingAutoTitle, desc: pageText.settingAutoDesc },
                           { title: pageText.settingAutoRefineTitle, desc: pageText.settingAutoRefineDesc }
                       ].filter(item => item.title).map((item, idx) => (
                           <div key={idx} className="group">
                               <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2 group-hover:text-primary-600 transition-colors">
                                   <span className="w-2 h-2 rounded-full bg-cta-500"></span>
                                   {item.title}
                               </h3>
                               <div className="text-sm text-slate-600 pl-4 border-l-2 border-slate-200 group-hover:border-primary-300 transition-colors whitespace-pre-line" dangerouslySetInnerHTML={{ __html: (item.desc || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                           </div>
                       ))}
                   </div>
               </section>

               {/* How to Use */}
               <section className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-8 lg:p-12 h-full transition-all hover:shadow-2xl hover:bg-white/70">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">{pageText.howTitle ?? toolText.stepTitle}</h2>
                  <ul className="space-y-4">
                     {[pageText.how1 ?? toolText.step1, pageText.how2 ?? toolText.step2, pageText.how3 ?? toolText.step3, pageText.how4, pageText.how5, pageText.how6].filter(Boolean).map((step, i) => (
                        <li key={i} className="flex gap-4">
                            <span className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold text-sm shadow-sm">{i+1}</span>
                            <span className="text-slate-700 leading-relaxed pt-1">{step}</span>
                        </li>
                     ))}
                  </ul>
               </section>
            </div>

            {/* FAQ */}
            <section className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-8 lg:p-12 transition-all hover:shadow-2xl hover:bg-white/70">
               <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">{toolText.faqTitle}</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                 {[
                    { q: pageText.faq1Q, a: pageText.faq1A },
                    { q: pageText.faq2Q, a: pageText.faq2A },
                    { q: pageText.faq3Q, a: pageText.faq3A },
                    { q: pageText.faq4Q, a: pageText.faq4A },
                    { q: pageText.faq5Q, a: pageText.faq5A },
                    { q: pageText.faq6Q, a: pageText.faq6A },
                    { q: pageText.faq7Q, a: pageText.faq7A }
                 ].filter(item => item.q).map((faq, idx) => (
                    <div key={idx} className="bg-white/40 rounded-2xl p-6 shadow-sm border border-white/50 hover:bg-white/60 transition-colors">
                       <h3 className="text-base font-semibold leading-7 text-slate-900 mb-2">{faq.q}</h3>
                       <p className="text-sm leading-6 text-slate-600 whitespace-pre-line">{faq.a}</p>
                    </div>
                ))}
               </div>
            </section>
         </div>

      </main>
      <Footer locale={locale} page={pageName} />
    </>
  )
}
