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
          const key = `${Math.round(s.tTol||tolerance)}|${s.r}|${s.g}|${s.b}`;
          if (!autoGroups[key]) autoGroups[key] = s;
        }
        const keys = Object.keys(autoGroups);
        for (let gi = 0; gi < keys.length; gi++) {
          const seed: any = autoGroups[keys[gi]];
          const tUse = typeof seed.tTol === 'number' ? seed.tTol : tolerance;
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
          const key = `${Math.round(s.tTol||tolerance)}|${s.r}|${s.g}|${s.b}`;
          if (!groups[key]) groups[key] = { seed: s, points: [] };
          groups[key].points.push({ x: Math.min(w - 1, Math.max(0, Math.floor(s.x || 0))), y: Math.min(h - 1, Math.max(0, Math.floor(s.y || 0))) });
        }
        const keys = Object.keys(groups);
        for (let gi = 0; gi < keys.length; gi++) {
          const { seed, points } = groups[keys[gi]];
          const tUse = typeof seed.tTol === 'number' ? seed.tTol : tolerance;
          
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
        const rgbTolBase = 22 + (tolerance / 150) * 28;
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
              const tUse = typeof tg.tTol === 'number' ? tg.tTol : tolerance;
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
        const eff = Math.max(refineStrength, minEdgeStrength);
        refineAlphaMask(data, w, h, eff);
      } else if (globals.length > 0 && !simpleAutoApplied && !simpleManualApplied) {
        refineAlphaMask(data, w, h, minEdgeStrength);
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
        // Default tolerance was too aggressive (90/110 approx 20-25%). 
        // Lowered to 45/60 (approx 10-14%) to match manual mode precision.
        const autoTol = Math.max(tolerance, s <= 0.12 ? 60 : 45);
        // 统计边缘样本的 S/V 范围与背景占比，判定是否为“简单背景”
        const takeRange = (hBase: number) => {
          let sMin = 1, sMax = 0, vMin = 1, vMax = 0;
          let hits = 0, total = 0;
          const hueTolR = 26;
          const sample = (idx: number) => {
            const a = imageData[idx+3];
            if (a <= 8) return;
            total++;
            const r0 = imageData[idx], g0 = imageData[idx+1], b0 = imageData[idx+2];
            const pv0 = rgbToHsv(r0,g0,b0);
            const dh = hueDelta(pv0.h, hBase);
            if (dh <= hueTolR) {
              hits++;
              sMin = Math.min(sMin, pv0.s);
              sMax = Math.max(sMax, pv0.s);
              vMin = Math.min(vMin, pv0.v);
              vMax = Math.max(vMax, pv0.v);
            }
          };
          const bw = Math.max(2, Math.floor(width * 0.03));
          const bh = Math.max(2, Math.floor(height * 0.03));
          for (let x = 0; x < width; x += 3) {
            for (let y = 0; y < bh; y += 2) sample((y*width + x) * 4);
            for (let y = height - bh; y < height; y += 2) sample((y*width + x) * 4);
          }
          for (let y = 0; y < height; y += 3) {
            for (let x = 0; x < bw; x += 2) sample((y*width + x) * 4);
            for (let x = width - bw; x < width; x += 2) sample((y*width + x) * 4);
          }
          return { sMin, sMax, vMin, vMax, ratio: total ? hits/total : 0 };
        };
        const rStat = takeRange(h);
        // 近似全图覆盖率（网格抽样）
        let gHits = 0, gAll = 0;
        const step = Math.max(8, Math.floor(Math.min(width, height) / 80));
        const hueTolR2 = 26;
        for (let yy = 0; yy < height; yy += step) {
          for (let xx = 0; xx < width; xx += step) {
            const off = (yy * width + xx) * 4;
            const a0 = imageData[off+3];
            if (a0 <= 8) continue;
            const r0 = imageData[off], g0 = imageData[off+1], b0 = imageData[off+2];
            const pv0 = rgbToHsv(r0,g0,b0);
            gAll++;
            const dh0 = hueDelta(pv0.h, h);
            if (dh0 <= hueTolR2 && pv0.s >= 0.05) gHits++;
          }
        }
        const globalRatio = gAll ? gHits / gAll : 0;
        // 放宽范围以覆盖天空渐变
        const sRangeMin = Math.max(0, Math.min(rStat.sMin, s) - 0.12);
        const sRangeMax = Math.min(1, Math.max(rStat.sMax, s) + 0.15);
        const vRangeMin = Math.max(0, Math.min(rStat.vMin, v) - 0.20);
        const vRangeMax = Math.min(1, Math.max(rStat.vMax, v) + 0.20);
          // Auto 模式：对极简背景才用“全局清除”，否则回退到“边缘连通保护”
          const dominant = (rStat.ratio >= 0.8 && globalRatio >= 0.6);
          
          // 如果是简单背景，容差也不应过大，防止误伤前景细节（如蓝天下的蓝鸟）。
          // 之前的逻辑强制加了 26 度色相和 0.15 的亮度宽容度，这太过激进。
          // 现在改为更保守的动态计算，信赖 rStat 统计值。
          const hTolFinal = dominant ? Math.max(12, Math.round((autoTol / 150) * 25)) : 12;
          const sExpand = dominant ? 0.04 : 0.02;
          const vExpand = dominant ? 0.06 : 0.04;

          const sRangeMinFinal = Math.max(0, Math.min(rStat.sMin, s) - sExpand);
          const sRangeMaxFinal = Math.min(1, Math.max(rStat.sMax, s) + sExpand);
          const vRangeMinFinal = Math.max(0, Math.min(rStat.vMin, v) - vExpand);
          const vRangeMaxFinal = Math.min(1, Math.max(rStat.vMax, v) + vExpand);
          
          setTargetColors([{ 
            r, g, b, h, s, v, 
            mode: 'local', 
            tTol: autoTol, 
            auto: true, 
            sMin: sRangeMinFinal, sMax: sRangeMaxFinal, 
            vMin: vRangeMinFinal, vMax: vRangeMaxFinal, 
            dominant, // 仅在非常确信是简单背景时才为 true
            hTol: hTolFinal 
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
                     <div ref={workspaceToolbarRef} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl shadow-md border border-slate-200 sticky top-24 z-[60] flex-nowrap overflow-x-hidden overflow-y-visible whitespace-nowrap min-h-[56px]">
                        <div className="flex items-center gap-3 flex-nowrap">
                            <button
                                onClick={handleAutoRemove}
                                disabled={!originalImage || autoRemoving}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold shrink-0 ${autoRemoving ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-60'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"/>
                                </svg>
                                {autoRemoving ? 'Auto Removing…' : 'Auto Remove BG'}
                            </button>
                            {/* 检测到的背景色徽标已关闭以保证工具条稳定布局 */}
                            
                            <div className="flex items-center gap-2 border-l pl-3 border-slate-200 relative whitespace-nowrap shrink-0">
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[96px] sm:min-w-[110px] md:min-w-[120px]" style={{fontVariantNumeric:'tabular-nums'}}>Tolerance: {Math.round((tolerance / 442) * 100)}%</span>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 cursor-help" onMouseEnter={(e) => showTip(e, toolText.tolTip)} onMouseLeave={hideTip} />
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="442" 
                                    value={tolerance} 
                                    onChange={(e) => setTolerance(Number(e.target.value))}
                                    onMouseEnter={(e) => showTip(e, toolText.tolTip)}
                                    onMouseLeave={hideTip}
                                    className="w-24 sm:w-28 md:w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shrink-0 focus:outline-none focus-visible:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2 border-l pl-3 border-slate-200 relative whitespace-nowrap shrink-0">
                                <span className="text-sm font-medium text-gray-700 whitespace-nowrap min-w-[88px] sm:min-w-[100px]" style={{fontVariantNumeric:'tabular-nums'}}>Refine: {refineStrength}%</span>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 cursor-help" onMouseEnter={(e) => showTip(e, toolText.refineTip)} onMouseLeave={hideTip} />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={refineStrength}
                                    onChange={(e) => setRefineStrength(Number(e.target.value))}
                                    onMouseEnter={(e) => showTip(e, toolText.refineTip)}
                                    onMouseLeave={hideTip}
                                    className="w-20 sm:w-24 md:w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shrink-0 focus:outline-none focus-visible:outline-none"
                                />
                                <button
                                  onClick={() => setAutoRefine(!autoRefine)}
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${autoRefine ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'} shrink-0`}
                                >
                                  Auto Refine
                                </button>
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-500 cursor-help" onMouseEnter={(e) => showTip(e, toolText.autoRefineTip)} onMouseLeave={hideTip} />
                            </div>

                            <button
                                onClick={handleUndo}
                                disabled={targetColors.length === 0}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
                              className="rounded-full px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 shrink-0"
                            >
                              Reset Edits
                            </button>
                        </div>

                        
                     </div>
                     {tooltipState.visible && (
                      <div
                        className="fixed z-[200] pointer-events-none rounded-md bg-white shadow-lg ring-1 ring-black/10 px-3 py-2 text-xs text-gray-700 max-w-[280px] whitespace-normal break-words"
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
                              <h3 className="text-sm font-semibold text-gray-900">Original (Compare only)</h3>
                              <div className="flex items-center">
                                <button
                                  onClick={handleNewImage}
                                  className="inline-flex items-center rounded-full bg-[#0071e3] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0077ED] mr-6 md:mr-10"
                                >
                                  Upload New
                                </button>
                              </div>
                            </div>
                            <div className="relative w-full overflow-hidden rounded-lg checkerboard border border-gray-300 shadow-sm group">
                                <img 
                                    ref={originalImageRef}
                                    src={imageSrc} 
                                    alt="Original" 
                                    className="w-full h-auto cursor-default select-none"
                                />
                                <div className="absolute top-2 right-2 bg-gray-800/80 text-white text-[10px] px-2 py-1 rounded pointer-events-none">Compare only</div>
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
                              className="relative w-full overflow-hidden rounded-lg checkerboard border border-gray-300 shadow-sm group"
                              style={{ overscrollBehavior: 'contain' }}
                              ref={resultContainerRef}
                            >
                                {showGuide && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="rounded-full bg-[#0071e3] text-white text-xs px-3 py-2 shadow-md">
                                      Click background to remove
                                    </div>
                                  </div>
                                )}
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
