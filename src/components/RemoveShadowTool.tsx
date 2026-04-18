'use client'
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import LoginModal from "~/components/LoginModal";
import { useCommonContext } from "~/context/common-context";
import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import Script from "next/script";
import Link from "next/link";
import { QuestionMarkCircleIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon, ArrowRightIcon, SparklesIcon, PaintBrushIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, ChevronLeftIcon, Squares2X2Icon, ArrowUpIcon, ExclamationTriangleIcon, CreditCardIcon, ShoppingBagIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { HandRaisedIcon } from "@heroicons/react/24/solid";
import { Dialog, Menu, Transition } from "@headlessui/react";
import ComparisonSlider from "./ComparisonSlider";
import { getLinkHref, getImageProxyHref } from "~/configs/buildLink";
import { getCreditPackOffers, getMonthlySubscriptionOffer } from "~/configs/billingPolicy";
import { getStripe } from "~/libs/stripeClient";
import { publicCdnUrl } from "~/libs/cdnPublic";

const clamp = (v:number, min:number, max:number) => Math.min(max, Math.max(min, v));
const UPLOAD_DB_NAME = 'cleanup_upload_bridge';
const UPLOAD_STORE_NAME = 'pending_uploads';

const openUploadDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(UPLOAD_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(UPLOAD_STORE_NAME)) {
        db.createObjectStore(UPLOAD_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const readUploadBlob = async (key: string): Promise<Blob | null> => {
  const db = await openUploadDb();
  const value = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readonly');
    const req = tx.objectStore(UPLOAD_STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as Blob) || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
};

const deleteUploadBlob = async (key: string) => {
  const db = await openUploadDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(UPLOAD_STORE_NAME, 'readwrite');
    tx.objectStore(UPLOAD_STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
};

type BillingSegment = "visitor" | "free" | "credits" | "pro";

function resolveBillingSegment(loggedIn: boolean, subscriptionStatus: string, creditsBalance: number): BillingSegment {
  if (!loggedIn) return "visitor";
  if (subscriptionStatus === "active") return "pro";
  if (creditsBalance > 0) return "credits";
  return "free";
}

/** Mirrors remove-shadow API getCreditCost */
function creditsForRun(quality: "standard" | "high_quality", hd: boolean, isPro: boolean): number {
  if (quality === "high_quality") return isPro ? 1 : 2;
  return 1 + (hd ? (isPro ? 0 : 1) : 0);
}

function isStandardWithoutHd(quality: "standard" | "high_quality", hd: boolean): boolean {
  return quality === "standard" && !hd;
}

/** Landing-page redirect → home: absorb stray pointer activation before first paint (see useLayoutEffect below). */
const REDIRECT_EXIT_GUARD_MS = 2500;

export default function RemoveShadowTool({
  locale,
  pageName,
  pageText,
  toolText,
  apiPath = "remove-shadow",
  initialMode = "object",
  initialLandingSampleUrl = null
}) {
  const { setShowLoadingModal, setShowLoginModal, userData, commonText, authText } = useCommonContext();
  const isHomeTool = !pageName;
  const pageResult = getLinkHref(locale, pageName || '');
  const normalizeMode = (value: string | null | undefined) => {
    const v = String(value || '').toLowerCase();
    if (v === 'shadow' || v === 'glare' || v === 'person' || v === 'text' || v === 'object') return v as 'shadow' | 'glare' | 'person' | 'text' | 'object';
    return 'object';
  };
  const defaultModeFromPage = pageName === 'remove-shadow' ? 'shadow' : pageName === 'remove-glare' ? 'glare' : initialMode;
  
  // State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [strength, setStrength] = useState<number>(90); // 0-100
  const [downloadFormat, setDownloadFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sceneType, setSceneType] = useState<'general' | 'person' | 'building' | 'portrait' | 'object'>('general');
  const [qualityMode, setQualityMode] = useState<'standard' | 'high_quality'>('standard');
  const [hdEnabled, setHdEnabled] = useState(false);
  const [editorMode, setEditorMode] = useState<'shadow' | 'glare' | 'person' | 'text' | 'object'>(normalizeMode(defaultModeFromPage));
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
  const [showReference, setShowReference] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState('');
  const [showUpgradeChoiceModal, setShowUpgradeChoiceModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [checkoutLoadingId, setCheckoutLoadingId] = useState('');
  const [processingLabelOverride, setProcessingLabelOverride] = useState('');
  const [billingOverview, setBillingOverview] = useState<Record<string, unknown> | null>(null);
  const [billingOverviewLoading, setBillingOverviewLoading] = useState(false);
  const [blockExitClick, setBlockExitClick] = useState(false);
  const exitBlockedUntilRef = useRef(0);

  // Debounce
  const [debouncedStrength, setDebouncedStrength] = useState(strength);
  useEffect(() => {
    const mode = normalizeMode(defaultModeFromPage);
    setEditorMode(mode);
  }, [defaultModeFromPage]);
  useEffect(() => {
    if (qualityMode === 'high_quality' && hdEnabled) {
      setHdEnabled(false);
    }
  }, [qualityMode, hdEnabled]);
  useEffect(() => {
    if (isHomeTool) setHdEnabled(false);
  }, [isHomeTool]);
  useEffect(() => {
    if (editorMode === 'shadow') {
      setAggressive(true);
      setExtreme(true);
      setBias(60);
      setTargetBright(92);
      setSceneType((prev) => prev === 'general' ? 'building' : prev);
      return;
    }
    if (editorMode === 'glare') {
      setAggressive(true);
      setExtreme(false);
      setBias(52);
      setTargetBright(88);
      setSceneType('general');
      return;
    }
    setAggressive(false);
    setExtreme(false);
    setBias(45);
    setTargetBright(82);
    if (editorMode === 'person') {
      setSceneType('person');
    } else if (editorMode === 'text') {
      setSceneType('object');
    } else {
      setSceneType('general');
    }
  }, [editorMode]);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedStrength(strength), 100);
    return () => clearTimeout(handler);
  }, [strength]);

  useEffect(() => {
    if (!userData?.user_id) {
      setBillingOverview(null);
      setBillingOverviewLoading(false);
      return;
    }
    setBillingOverviewLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/${locale}/api/user/getSubscriptionOverview`);
        const json = (await res.json()) as Record<string, unknown>;
        if (!cancelled) {
          setBillingOverview(json || {});
          setBillingOverviewLoading(false);
        }
      } catch {
        if (!cancelled) {
          setBillingOverview({});
          setBillingOverviewLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userData?.user_id, locale]);

  const loggedIn = Boolean(userData?.user_id);
  const subStatus = String(billingOverview?.subscription_status ?? "");
  const isProBilling = subStatus === "active";
  const creditsBal = Number(billingOverview?.credits_balance ?? 0);
  const freeRemaining = Number(billingOverview?.free_remaining ?? 0);
  const billingSegment = resolveBillingSegment(loggedIn, subStatus, creditsBal);
  /** Home tool: no HD option; dedicated tool pages keep HD. */
  const hdApplies = !isHomeTool && hdEnabled;
  const standardFreeRun = isStandardWithoutHd(qualityMode, hdApplies);
  const needsPaidMode = qualityMode === "high_quality" || hdApplies;
  const runCreditTotal = creditsForRun(qualityMode, hdApplies, isProBilling);

  const creditEstimateLine = useMemo(() => {
    if (loggedIn && billingOverviewLoading) {
      return locale === "zh" ? "正在同步账户计费信息…" : "Syncing billing info…";
    }
    if ((billingSegment === "visitor" || billingSegment === "free") && standardFreeRun) {
      if (billingSegment === "free" && freeRemaining <= 0) {
        return locale === "zh"
          ? "今日免费次数已用完；请升级或明日再试。"
          : "Daily free quota is used up. Upgrade or try again tomorrow.";
      }
      if (billingSegment === "free") {
        return locale === "zh"
          ? `本次不扣积分（Standard，今日还可免费 ${freeRemaining} 次）`
          : `No credits for this run (Standard, ${freeRemaining} free left today)`;
      }
      return locale === "zh"
        ? "本次不扣积分：Standard 在每日免费次数内无需积分。"
        : "No credits for Standard while you are within the daily free limit.";
    }
    if ((billingSegment === "visitor" || billingSegment === "free") && needsPaidMode) {
      return locale === "zh"
        ? "当前选项需登录并拥有订阅或积分。"
        : "Sign in with a subscription or credits to use this option.";
    }
    if (qualityMode === "high_quality") {
      return locale === "zh"
        ? `本次 High Quality 预计 ${runCreditTotal} 积分（${billingSegment === "pro" ? "Pro 价" : billingSegment === "visitor" || billingSegment === "free" ? "需登录并有额度" : "按量价"}）`
        : `High Quality: ${runCreditTotal} credits (${billingSegment === "pro" ? "Pro rate" : billingSegment === "visitor" || billingSegment === "free" ? "sign in + balance" : "pay-as-you-go"})`;
    }
    if (hdApplies) {
      return locale === "zh"
        ? `本次合计 ${runCreditTotal} 积分：Standard 1${isProBilling ? "，HD 已含" : " + HD 1"}`
        : `${runCreditTotal} credits total: 1 Standard${isProBilling ? ", HD included" : " + 1 HD"}`;
    }
    return locale === "zh"
      ? `本次 Standard 预计 ${runCreditTotal} 积分`
      : `Standard: ${runCreditTotal} credit(s)`;
  }, [
    loggedIn,
    billingOverviewLoading,
    billingSegment,
    standardFreeRun,
    needsPaidMode,
    qualityMode,
    hdApplies,
    freeRemaining,
    runCreditTotal,
    isProBilling,
    locale
  ]);

  const creditGuideLine = useMemo(() => {
    const pricingHref = getLinkHref(locale, "pricing");
    if (loggedIn && billingOverviewLoading) {
      return {
        body: locale === "zh" ? "加载完成后将显示与你账户匹配的说明。" : "Details will match your account once loaded.",
        pricingHref
      };
    }
    let body: string;
    if (billingSegment === "visitor") {
      body =
        locale === "zh"
          ? isHomeTool
            ? "游客：仅 Standard 可用每日免费次数；High Quality 需登录并具备订阅或额度。"
            : "游客：仅 Standard 可用每日免费次数；更多能力请登录后订阅或购积分。"
          : isHomeTool
            ? "Guests: Standard uses the daily free quota; High Quality needs sign-in with a subscription or balance."
            : "Guests: Standard only uses the daily free quota; sign in to subscribe or buy credits.";
    } else if (billingSegment === "free") {
      body =
        locale === "zh"
          ? isHomeTool
            ? "免费账户：Standard 享每日免费次数；High Quality 需订阅或额度。"
            : "免费账户：Standard 享每日免费次数；High Quality 与 HD 需订阅或积分。"
          : isHomeTool
            ? "Free account: daily Standard quota; High Quality needs a subscription or balance."
            : "Free account: daily Standard quota; High Quality and HD need a subscription or credits.";
    } else if (billingSegment === "credits") {
      body =
        locale === "zh"
          ? "按量账户：费用从积分余额扣除（见上方预计）。"
          : "Pay-as-you-go: charges deduct from your credit balance (see estimate above).";
    } else {
      body =
        locale === "zh"
          ? isHomeTool
            ? "Pro：High Quality 1 积分/次（见上方预计）。"
            : "Pro：High Quality 1 积分/次；Standard + HD 时 HD 不另扣。"
          : isHomeTool
            ? "Pro: High Quality is 1 credit per run (see estimate above)."
            : "Pro: High Quality is 1 credit per run; with Standard + HD, HD has no extra charge.";
    }
    return { body, pricingHref };
  }, [billingSegment, locale, loggedIn, billingOverviewLoading, isHomeTool]);

  const drawImageToCanvases = useCallback((img: HTMLImageElement) => {
    if (!canvasRef.current || !maskCanvasRef.current) return false;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return false;
    const canvas = canvasRef.current;
    const mask = maskCanvasRef.current;
    canvas.width = w;
    canvas.height = h;
    mask.width = w;
    mask.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return true;
  }, []);

  useEffect(() => {
    if (!originalImage) return;
    if (drawImageToCanvases(originalImage)) return;
    const timer = window.setTimeout(() => {
      drawImageToCanvases(originalImage);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [originalImage, imageSrc, drawImageToCanvases]);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);





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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  
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

  const buildSampleProxyUrl = useCallback(
    (remoteUrl: string) => getImageProxyHref(locale, remoteUrl),
    [locale]
  );

  // SAMPLES
  const SAMPLES = [
    {
      id: 'content-creators',
      title: pageText.sample1Title || 'Portrait Face Shadow',
      desc: pageText.sample1Desc || 'Remove harsh shadows from faces caused by sunlight or hats.',
      beforeUrl: buildSampleProxyUrl(publicCdnUrl("remove-text/sample2-remove-text-before.jpg")),
      afterUrl: buildSampleProxyUrl(publicCdnUrl("remove-text/sample2-remove-text-after.jpg")),
      settings: { strength: 88, aggressive: false },
      imagePosition: 'center 40%'
    },
    {
      id: 'marketing-teams',
      title: pageText.sample2Title || 'Product Photography',
      desc: pageText.sample2Desc || 'Clean up distracting cast shadows to make products look professional.',
      beforeUrl: buildSampleProxyUrl(publicCdnUrl("remove-object/sample4-remove-object-before.jpg")),
      afterUrl: buildSampleProxyUrl(publicCdnUrl("remove-object/sample4-remove-object-after.jpg")),
      settings: { strength: 92, aggressive: true },
      imagePosition: 'center 55%'
    },
    {
      id: 'real-estate-teams',
      title: pageText.sample3Title || 'Document Scan',
      desc: pageText.sample3Desc || 'Remove phone shadows from photos of documents and paper.',
      beforeUrl: buildSampleProxyUrl(publicCdnUrl("remove-object/sample3-remove-object-before.jpg")),
      afterUrl: buildSampleProxyUrl(publicCdnUrl("remove-object/sample3-remove-object-after.jpg")),
      settings: { strength: 86, aggressive: false },
      imagePosition: 'center 58%'
    },
    {
      id: 'ecommerce-sellers',
      title: pageText.sample4Title || 'General Object Shadow',
      desc: pageText.sample4Desc || 'Clean cast shadows around everyday objects for a clearer and more balanced photo.',
      beforeUrl: buildSampleProxyUrl(publicCdnUrl("remove-emoji/sample3-remove-emoji-before.jpg")),
      afterUrl: buildSampleProxyUrl(publicCdnUrl("remove-emoji/sample3-remove-emoji-after.jpg")),
      settings: { strength: 88, aggressive: false },
      imagePosition: 'center 52%'
    }
  ];
  const HOME_UPLOAD_THUMBNAILS = [
    {
      id: 'home-upload-object',
      title: 'Remove object sample',
      beforeUrl: buildSampleProxyUrl(publicCdnUrl("remove-object/sample1-remove-object-before.jpg"))
    },
    {
      id: 'home-upload-person',
      title: 'Remove person sample',
      beforeUrl: buildSampleProxyUrl(publicCdnUrl("remove-people/sample2-remove-people-before.jpg"))
    },
    {
      id: 'home-upload-text',
      title: 'Remove text sample',
      beforeUrl: buildSampleProxyUrl(publicCdnUrl("remove-text/sample1-remove-text-before.jpg"))
    },
    {
      id: 'home-upload-emoji',
      title: 'Remove emoji sample',
      beforeUrl: buildSampleProxyUrl(publicCdnUrl("remove-emoji/sample1-remove-emoji-before.jpg"))
    }
  ];
  const HOME_USE_CASES = [
    { key: 'photographers', label: 'Content Creators', sampleId: 'content-creators' },
    { key: 'agencies', label: 'Marketing Teams', sampleId: 'marketing-teams' },
    { key: 'realestate', label: 'Real Estate Teams', sampleId: 'real-estate-teams' },
    { key: 'ecommerce', label: 'Ecommerce Sellers', sampleId: 'ecommerce-sellers' }
  ];
  const [activeHomeUseCase, setActiveHomeUseCase] = useState(HOME_USE_CASES[0].key);

  const loadSample = (sample) => {
    setIsProcessing(true);
    setShowReference(false);
    const sampleSource = sample.beforeUrl;
    const sampleSourceWithTs = sampleSource + (sampleSource.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(sampleSourceWithTs);
      drawImageToCanvases(img);
      setHistory([]);
      setHistoryStep(-1);
      
      // Initialize Canvas with original image immediately to prevent layout shift
      // Handled by useEffect now


      if (sample.settings) {
        setStrength(sample.settings.strength ?? 90);
        if (editorMode === 'shadow' || editorMode === 'glare') {
          setAggressive(sample.settings.aggressive ?? true);
        }
      }
      // Reset mask
      if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      }
      setMaskCanvasData(null);
      setIsProcessing(false);
    };
    img.onerror = () => {
        setIsProcessing(false);
        alert("Failed to load sample image.");
    };
    img.src = sampleSourceWithTs;
  };

  useEffect(() => {
    setShowLoadingModal(false);
  }, [setShowLoadingModal]);

  const processFile = useCallback((file) => {
    if (!file.type.startsWith('image/')) return;
    sessionStorage.removeItem('cleanup_pending_upload');
    setShowReference(false);
    setHistory([]);
    setHistoryStep(-1);
    setMaskCanvasData(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setOriginalImage(img);
      setImageSrc(url);
      setStrength(90);
      if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      }
      setMaskCanvasData(null);
    };
    img.src = url;
  }, []);
  const loadImageFromSource = useCallback(
    (
      source: string,
      opts?: { onSettled?: () => void; alertOnError?: boolean; alertOnlyIfMounted?: () => boolean }
    ) => {
      setHistory([]);
      setHistoryStep(-1);
      setMaskCanvasData(null);
      setShowReference(false);
      const img = new Image();
      if (/^https?:\/\//i.test(source)) {
        img.crossOrigin = 'anonymous';
      }
      const settled = () => {
        opts?.onSettled?.();
      };
      const shouldAlert = () => opts?.alertOnlyIfMounted?.() ?? true;
      img.onload = () => {
        setOriginalImage(img);
        setImageSrc(source);
        setStrength(90);
        if (maskCanvasRef.current) {
          const ctx = maskCanvasRef.current.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        }
        setMaskCanvasData(null);
        settled();
      };
      img.onerror = () => {
        // Fallback: when proxy is temporarily unavailable, retry once with raw remote URL.
        if (source.includes('/api/image-proxy?')) {
          try {
            const parsed = new URL(source, window.location.origin);
            const raw = parsed.searchParams.get('url');
            if (raw && raw !== source) {
              loadImageFromSource(raw, opts);
              return;
            }
          } catch {
            // ignore and continue to normal error flow
          }
        }
        settled();
        if (opts?.alertOnError && shouldAlert()) {
          alert('Failed to load the image. Please retry in a moment.');
        }
      };
      img.src = source;
    },
    []
  );
  useEffect(() => {
    let alive = true;
    const clearPending = () => {
      try {
        sessionStorage.removeItem('cleanup_pending_upload');
      } catch {
        /* ignore */
      }
    };
    const loadPendingUpload = async () => {
      try {
        if (initialLandingSampleUrl) return;
        const raw = sessionStorage.getItem('cleanup_pending_upload');
        if (!raw) return;
        let payload: { type?: string; value?: string; name?: string; mime?: string };
        try {
          payload = JSON.parse(raw);
        } catch {
          clearPending();
          return;
        }
        const finishPendingIfStillMounted = () => {
          if (alive) clearPending();
        };
        if (payload?.type === 'data' && typeof payload.value === 'string') {
          loadImageFromSource(payload.value, {
            onSettled: finishPendingIfStillMounted,
            alertOnError: true,
            alertOnlyIfMounted: () => alive
          });
          return;
        }
        if (payload?.type === 'url' && typeof payload.value === 'string') {
          loadImageFromSource(payload.value, {
            onSettled: finishPendingIfStillMounted,
            alertOnError: true,
            alertOnlyIfMounted: () => alive
          });
          return;
        }
        if (payload?.type === 'idb' && typeof payload.value === 'string') {
          const token = payload.value;
          const blob = await readUploadBlob(token);
          // Strict Mode: first effect run's component unmounts before await finishes; do not delete
          // session/IDB or call setState on that instance. The remounted instance will read again.
          if (!alive) return;
          await deleteUploadBlob(token);
          clearPending();
          if (!blob) return;
          const file = new File([blob], String(payload?.name || 'upload'), {
            type: String(payload?.mime || blob.type || 'image/png')
          });
          processFile(file);
          return;
        }
        clearPending();
      } catch {
        if (alive) clearPending();
      }
    };
    void loadPendingUpload();
    return () => {
      alive = false;
    };
  }, [loadImageFromSource, processFile, initialLandingSampleUrl]);

  // Landing-page sample: same proxy URL as the landing thumbnail <img> (no ?t=) so the browser can reuse cache after client nav.
  useLayoutEffect(() => {
    if (!isHomeTool || !initialLandingSampleUrl) return;
    const proxied = getImageProxyHref(locale, initialLandingSampleUrl);
    loadImageFromSource(proxied);
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('sample')) return;
      url.searchParams.delete('sample');
      const qs = url.searchParams.toString();
      window.history.replaceState(null, '', `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`);
    } catch {
      /* ignore */
    }
  }, [isHomeTool, initialLandingSampleUrl, locale, loadImageFromSource]);

  // Prevent stray pointer events from exiting right after landing-page redirect.
  // useEffect runs after paint — a cached pending image can show the editor first; useLayoutEffect runs before paint.
  // Do not remove cleanup_redirect_ts until the guard ends (Strict Mode remount must still see the flag).
  useLayoutEffect(() => {
    try {
      const tsRaw = sessionStorage.getItem('cleanup_redirect_ts');
      if (!tsRaw) return;
      const ts = Number(tsRaw || 0);
      if (!Number.isFinite(ts) || ts <= 0) {
        sessionStorage.removeItem('cleanup_redirect_ts');
        return;
      }
      const age = Date.now() - ts;
      if (age >= REDIRECT_EXIT_GUARD_MS) {
        sessionStorage.removeItem('cleanup_redirect_ts');
        return;
      }
      const remain = REDIRECT_EXIT_GUARD_MS - Math.max(0, age);
      exitBlockedUntilRef.current = Date.now() + remain;
      setBlockExitClick(true);
      const t = window.setTimeout(() => {
        exitBlockedUntilRef.current = 0;
        setBlockExitClick(false);
        try {
          sessionStorage.removeItem('cleanup_redirect_ts');
        } catch {
          /* ignore */
        }
      }, remain);
      return () => window.clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, []);

  const openFilePicker = useCallback(() => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  }, []);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
    const next = clamp(prev * factor, 0.2, 8);
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
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleWheelZoom = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    handleZoom(factor, { clientX: e.clientX, clientY: e.clientY });
  };

  const getEffectiveBrushSize = useCallback((baseSize: number, scaleX: number, scaleY: number) => {
    const scale = (scaleX + scaleY) / 2;
    return baseSize * scale;
  }, []);

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
    
    const effectiveBrushSize = getEffectiveBrushSize(brushSize, scaleX, scaleY);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = effectiveBrushSize;
    ctx.strokeStyle = 'rgba(56, 189, 248, 1)';
    ctx.globalCompositeOperation = 'source-over'; // Additive
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y); // Start drawing a dot
    ctx.stroke();
    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      if (!panMode) cursorRef.current.style.opacity = '1';
    }

    let lastX = x;
    let lastY = y;
    const minDist2 = 0.01;

    const onDrawMove = (ev) => {
        const nx = (ev.clientX - rect.left) * scaleX;
        const ny = (ev.clientY - rect.top) * scaleY;
        const dx = nx - lastX;
        const dy = ny - lastY;
        if ((dx * dx + dy * dy) < minDist2) return;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        lastX = nx;
        lastY = ny;
        
        if (cursorRef.current) {
             cursorRef.current.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -50%)`;
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
  }, [originalImage, debouncedStrength, aggressive, bias, extreme, targetBright, maskCanvasData, editorMode]);

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

  const requestRemoveShadow = async (payload: any) => {
    const response = await fetch(`/${locale}/api/${apiPath}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    return { response, json };
  };

  const handleGenerate = async () => {
    if (!originalImage || !canvasRef.current) return;
    // Always use backend AI, even without mask (user requirement)
    await handleAiRefine();
  };

  const handleDownloadHd = async () => {
    if (!canvasRef.current) return;
    try {
      setIsProcessing(true);
      setProcessingLabelOverride(locale === 'zh' ? '正在生成HD...' : 'Generating HD...');
      const payload = {
        action: 'upscale_hd',
        imageDataUrl: canvasRef.current.toDataURL('image/png'),
        imageWidth: canvasRef.current.width,
        imageHeight: canvasRef.current.height,
        locale
      };
      const { response: res, json } = await requestRemoveShadow(payload);
      if (!(res.ok && json?.output_url)) {
        setIsProcessing(false);
        setProcessingLabelOverride('');
        if (Number(json?.status) === 601) {
          setShowLoginModal(true);
          return;
        }
        if (Number(json?.status) === 602) {
          const tip = json?.msg || (locale === 'zh' ? '积分不足，请购买后继续。' : 'Not enough credits. Please upgrade to continue.');
          setQuotaMessage(tip);
          setShowQuotaModal(true);
          return;
        }
        setInfoMessage(json?.msg || (locale === 'zh' ? 'HD 生成失败，请稍后重试。' : 'HD generation failed. Please try again.'));
        setShowInfoModal(true);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
        setIsProcessing(false);
        setProcessingLabelOverride('');
        handleDownload();
      };
      img.onerror = () => {
        setIsProcessing(false);
        setProcessingLabelOverride('');
        setInfoMessage(locale === 'zh' ? 'HD 图片加载失败。' : 'Failed to load HD image.');
        setShowInfoModal(true);
      };
      img.src = json.output_url;
    } catch (e) {
      setIsProcessing(false);
      setProcessingLabelOverride('');
      setInfoMessage(locale === 'zh' ? 'HD 生成失败，请稍后重试。' : 'HD generation failed. Please try again.');
      setShowInfoModal(true);
    }
  };

  const handleAiRefine = async () => {
    if (!originalImage || !canvasRef.current) return;
    
    // Get mask if exists
    let kieMaskDataUrl = null;
    let standardMaskDataUrl = null;
    let dilatedMaskFlags: Uint8Array | null = null;
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
              const w = originalImage.naturalWidth;
              const h = originalImage.naturalHeight;
              
              // Emoji/text overlays usually need a wider context ring than generic objects.
              const dilationPadding = editorMode === 'shadow' ? 16 : editorMode === 'glare' ? 10 : editorMode === 'text' ? 12 : 4;
              const srcData = currentMaskData.data;
              const maskFlags = new Uint8Array(w * h);
              for (let p = 0, i = 0; p < maskFlags.length; p++, i += 4) {
                const on = srcData[i + 3] > 0;
                maskFlags[p] = on ? 1 : 0;
              }
              const binaryCanvas = document.createElement('canvas');
              binaryCanvas.width = w;
              binaryCanvas.height = h;
              const binaryCtx = binaryCanvas.getContext('2d');
              if (binaryCtx) {
                const binaryData = binaryCtx.createImageData(w, h);
                const binaryDst = binaryData.data;
                for (let p = 0, i = 0; p < maskFlags.length; p++, i += 4) {
                  const v = maskFlags[p] ? 255 : 0;
                  binaryDst[i] = v;
                  binaryDst[i + 1] = v;
                  binaryDst[i + 2] = v;
                  binaryDst[i + 3] = 255;
                }
                binaryCtx.putImageData(binaryData, 0, 0);
                const blurCanvas = document.createElement('canvas');
                blurCanvas.width = w;
                blurCanvas.height = h;
                const blurCtx = blurCanvas.getContext('2d');
                if (blurCtx) {
                  blurCtx.filter = `blur(${dilationPadding}px)`;
                  blurCtx.drawImage(binaryCanvas, 0, 0);
                  const blurData = blurCtx.getImageData(0, 0, w, h).data;
                  for (let p = 0, i = 0; p < maskFlags.length; p++, i += 4) {
                    maskFlags[p] = blurData[i] > 6 ? 1 : 0;
                  }
                }
              }
              dilatedMaskFlags = maskFlags;

              // 1. Create KIE Mask (White=Preserve, Black=Modify)
              const kieCanvas = document.createElement('canvas');
              kieCanvas.width = w;
              kieCanvas.height = h;
              const kieCtx = kieCanvas.getContext('2d');
              
              // 2. Create Standard Mask (Black=Preserve, White=Modify)
              const stdCanvas = document.createElement('canvas');
              stdCanvas.width = w;
              stdCanvas.height = h;
              const stdCtx = stdCanvas.getContext('2d');

              if (kieCtx && stdCtx) {
                  // Initialize backgrounds
                  kieCtx.fillStyle = 'white'; // KIE Preserve
                  kieCtx.fillRect(0, 0, w, h);
                  
                  stdCtx.fillStyle = 'black'; // Standard Preserve
                  stdCtx.fillRect(0, 0, w, h);
                  
                  // Create ImageData for pixel manipulation
                  const kieImgData = kieCtx.createImageData(w, h);
                  const stdImgData = stdCtx.createImageData(w, h);
                  const kieDst = kieImgData.data;
                  const stdDst = stdImgData.data;
                  
                  for (let p = 0, i = 0; p < maskFlags.length; p++, i += 4) {
                      if (maskFlags[p]) {
                          // Painted Area (Modify)
                          
                          // KIE: Black
                          kieDst[i] = 0;     // R
                          kieDst[i + 1] = 0; // G
                          kieDst[i + 2] = 0; // B
                          kieDst[i + 3] = 255; // A
                          
                          // Standard: White
                          stdDst[i] = 255;   // R
                          stdDst[i + 1] = 255; // G
                          stdDst[i + 2] = 255; // B
                          stdDst[i + 3] = 255; // A
                      } else {
                          // Unpainted Area (Preserve)
                          
                          // KIE: White
                          kieDst[i] = 255;
                          kieDst[i + 1] = 255;
                          kieDst[i + 2] = 255;
                          kieDst[i + 3] = 255;
                          
                          // Standard: Black
                          stdDst[i] = 0;
                          stdDst[i + 1] = 0;
                          stdDst[i + 2] = 0;
                          stdDst[i + 3] = 255;
                      }
                  }
                  
                  kieCtx.putImageData(kieImgData, 0, 0);
                  stdCtx.putImageData(stdImgData, 0, 0);
                  
                  kieMaskDataUrl = kieCanvas.toDataURL('image/png');
                  standardMaskDataUrl = stdCanvas.toDataURL('image/png');
              }
         }
    }

    const resizeDataUrl = (dataUrl: string, targetWidth: number, targetHeight: number, mime: string, quality?: number, smoothing = true) => {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          ctx.imageSmoothingEnabled = smoothing;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          resolve(canvas.toDataURL(mime, quality));
        };
        img.onerror = () => reject(new Error('Failed to resize image'));
        img.src = dataUrl;
      });
    };

    const createLamaResizedPayload = async (payload: any, maxSide: number) => {
      if (!canvasRef.current) return { ...payload, resizedForLama: true };
      const baseWidth = canvasRef.current.width;
      const baseHeight = canvasRef.current.height;
      const longest = Math.max(baseWidth, baseHeight);
      if (!Number.isFinite(maxSide) || maxSide <= 0 || longest <= maxSide) {
        return { ...payload, resizedForLama: true };
      }
      const ratio = maxSide / longest;
      const targetWidth = Math.max(1, Math.round(baseWidth * ratio));
      const targetHeight = Math.max(1, Math.round(baseHeight * ratio));
      const resizedImage = await resizeDataUrl(payload.imageDataUrl, targetWidth, targetHeight, 'image/jpeg', 0.92, true);
      const resizedMask = payload.maskDataUrl
        ? await resizeDataUrl(payload.maskDataUrl, targetWidth, targetHeight, 'image/png', undefined, false)
        : null;
      const resizedKieMask = payload.kieMaskDataUrl
        ? await resizeDataUrl(payload.kieMaskDataUrl, targetWidth, targetHeight, 'image/png', undefined, false)
        : null;
      return {
        ...payload,
        imageDataUrl: resizedImage,
        maskDataUrl: resizedMask,
        kieMaskDataUrl: resizedKieMask,
        imageWidth: targetWidth,
        imageHeight: targetHeight,
        resizedForLama: true
      };
    };

    try {
      setIsProcessing(true);
      setProcessingLabelOverride(
        qualityMode === 'high_quality'
          ? (locale === 'zh' ? '正在生成高质量结果...' : 'Generating high quality result...')
          : modeProcessingLabel
      );
      
      // Use the current canvas content as source (allows iterative editing)
      let src = canvasRef.current.toDataURL('image/png');
      if (dilatedMaskFlags && canvasRef.current && (editorMode === 'shadow' || editorMode === 'glare')) {
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        const boost = editorMode === 'shadow' ? 1.2 : 1.12;
        const prefillCanvas = document.createElement('canvas');
        prefillCanvas.width = w;
        prefillCanvas.height = h;
        const prefillCtx = prefillCanvas.getContext('2d');
        if (prefillCtx) {
          prefillCtx.drawImage(canvasRef.current, 0, 0, w, h);
          const imgData = prefillCtx.getImageData(0, 0, w, h);
          const data = imgData.data;
          for (let p = 0, i = 0; p < dilatedMaskFlags.length; p++, i += 4) {
            if (!dilatedMaskFlags[p]) continue;
            data[i] = Math.min(255, Math.round(data[i] * boost));
            data[i + 1] = Math.min(255, Math.round(data[i + 1] * boost));
            data[i + 2] = Math.min(255, Math.round(data[i + 2] * boost));
          }
          prefillCtx.putImageData(imgData, 0, 0);
          src = prefillCanvas.toDataURL('image/png');
        }
      }
      let payload = {
        imageDataUrl: src,
        maskDataUrl: standardMaskDataUrl,
        kieMaskDataUrl,
        scene: sceneType,
        mode: editorMode,
        imageWidth: canvasRef.current?.width || 0,
        imageHeight: canvasRef.current?.height || 0,
        quality: qualityMode,
        hd: false,
        locale
      };
      let { response: res, json } = await requestRemoveShadow(payload);
      if (res.ok && json?.need_client_resize) {
        const maxSide = Number(json.maxSide || 1600);
        payload = await createLamaResizedPayload(payload, maxSide);
        const retry = await requestRemoveShadow(payload);
        res = retry.response;
        json = retry.json;
      }
      if (res.ok && json.output_url) {
        // Load result into canvas
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                const w = canvasRef.current.width;
                const h = canvasRef.current.height;

                // 1. Get Base Image Data (Current Canvas State)
                const baseImageData = ctx.getImageData(0, 0, w, h);
                
                // 2. Get AI Result Data
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const tempCtx = tempCanvas.getContext('2d');
                
                if (tempCtx) {
                    tempCtx.drawImage(img, 0, 0, w, h);
                    const aiImageData = tempCtx.getImageData(0, 0, w, h);
                    
                    // 3. Composite by mask for ALL modes.
                    // This ensures we ONLY update the masked area, preserving original pixels elsewhere.
                    if (currentMaskData && currentMaskData.width === w && currentMaskData.height === h) {
                         const outputData = ctx.createImageData(w, h);
                         const baseData = baseImageData.data;
                         const aiData = aiImageData.data;
                         
                         // Enhanced Mask Processing for Seamless Blending
                         // 1. Dilation: Expand the mask to cover potential edge artifacts
                         // 2. Feathering: Soften the edge for smooth transition
                         
                         const strictLocalMode = editorMode === 'text' || editorMode === 'object' || editorMode === 'person';
                         const composeCoreMask = (strictLocalMode && dilatedMaskFlags && dilatedMaskFlags.length === w * h)
                           ? dilatedMaskFlags
                           : null;
                         const maskCanvas = document.createElement('canvas');
                         maskCanvas.width = w;
                         maskCanvas.height = h;
                         const maskCtx = maskCanvas.getContext('2d');
                         let maskData = currentMaskData.data;

                         if (maskCtx) {
                            // --- Step 1: Create Solid Core Mask ---
                            const solidMaskImg = maskCtx.createImageData(w, h);
                            const solidData = solidMaskImg.data;
                            const srcData = currentMaskData.data;
                            
                            for (let i = 0, p = 0; i < srcData.length; i += 4, p++) {
                                // For text/object/person use the same expanded mask used for backend inference.
                                const coreOn = composeCoreMask ? composeCoreMask[p] > 0 : srcData[i + 3] > 0;
                                if (coreOn) {
                                    solidData[i] = 255;     
                                    solidData[i + 1] = 255; 
                                    solidData[i + 2] = 255; 
                                    solidData[i + 3] = 255; 
                                } else {
                                    solidData[i + 3] = 0;
                                }
                            }
                            maskCtx.putImageData(solidMaskImg, 0, 0);
                            
                            // --- Step 2: Apply Feathering (Blur) ONLY ---
                            // NO Dilation/Expansion. We strictly respect the user's brush area.
                            // We only soften the edges to blend smoothly.
                            
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = w;
                            tempCanvas.height = h;
                            const tempCtx = tempCanvas.getContext('2d');
                            
                            if (tempCtx) {
                                // Calculate blur radius based on image size
                                // Moderate blur for smooth edge without excessive bleeding
                                const maxDim = Math.max(w, h);
                                const blurRadius = Math.max(2, Math.min(10, Math.round(maxDim * 0.005))); 
                                
                                tempCtx.filter = `blur(${blurRadius}px)`;
                                tempCtx.drawImage(maskCanvas, 0, 0);
                                
                                // Get the feathered mask data
                                maskData = tempCtx.getImageData(0, 0, w, h).data;
                            }
                         }
                         
                         const outData = outputData.data;

                         // --- Step 3: Global Color Correction (Histogram Matching) ---
                         // Calculate the average color shift between AI result and Original Image in UNMASKED areas.
                         // This fixes global VAE color shifts (e.g. slight brightness/tint differences) that cause the patch to stand out.
                         
                         let diffR = 0, diffG = 0, diffB = 0;
                         let pixelCount = 0;
                         const stride = 4; // Sample every 4th pixel for performance
                         
                         for (let i = 0; i < baseData.length; i += 4 * stride) {
                             // Check if this pixel is definitely UNMASKED in the user's original mask
                             // We use the original srcData to be safe.
                             // We want to sample pixels that are far from the mask to get true background color.
                             
                             const p = Math.floor(i / 4);
                             const coreOn = composeCoreMask ? composeCoreMask[p] > 0 : currentMaskData.data[i + 3] > 0;
                             if (!coreOn) {
                                 diffR += (baseData[i] - aiData[i]);
                                 diffG += (baseData[i + 1] - aiData[i + 1]);
                                 diffB += (baseData[i + 2] - aiData[i + 2]);
                                 pixelCount++;
                             }
                         }
                         
                        if (pixelCount > 0) {
                             diffR /= pixelCount;
                             diffG /= pixelCount;
                             diffB /= pixelCount;
                         }

                        for (let i = 0; i < baseData.length; i += 4) {
                           const p = Math.floor(i / 4);
                           const coreAlpha = (composeCoreMask ? composeCoreMask[p] > 0 : currentMaskData.data[i + 3] > 0) ? 1 : 0;
                            const featherAlpha = maskData[i + 3] / 255.0;
                           const edgeStrength = (editorMode === 'text' || editorMode === 'object' || editorMode === 'person') ? 0.12 : 0.25;
                           const edgeAlpha = Math.max(0, featherAlpha - coreAlpha) * edgeStrength;
                            const alpha = Math.min(1, coreAlpha + edgeAlpha);
                             
                             // Apply Color Correction to AI pixel
                             // AI_Corrected = AI + Diff (where Diff = Base - AI) -> AI_Corrected approaches Base
                           const correctionFactor = strictLocalMode ? 0 : (coreAlpha > 0 ? 0.22 : 1);
                            const diffCoreR = coreAlpha > 0 ? Math.max(0, diffR) : diffR;
                            const diffCoreG = coreAlpha > 0 ? Math.max(0, diffG) : diffG;
                            const diffCoreB = coreAlpha > 0 ? Math.max(0, diffB) : diffB;
                            let aiR = Math.min(255, Math.max(0, aiData[i] + diffCoreR * correctionFactor));
                            let aiG = Math.min(255, Math.max(0, aiData[i + 1] + diffCoreG * correctionFactor));
                            let aiB = Math.min(255, Math.max(0, aiData[i + 2] + diffCoreB * correctionFactor));
                           if (!strictLocalMode && coreAlpha > 0) {
                              const baseLum = 0.2126 * baseData[i] + 0.7152 * baseData[i + 1] + 0.0722 * baseData[i + 2];
                              const aiLum = 0.2126 * aiR + 0.7152 * aiG + 0.0722 * aiB;
                              if (aiLum < baseLum) {
                                const lift = baseLum / Math.max(1e-6, aiLum);
                                aiR = Math.min(255, aiR * lift);
                                aiG = Math.min(255, aiG * lift);
                                aiB = Math.min(255, aiB * lift);
                              }
                            }
                             
                             outData[i] = baseData[i] * (1 - alpha) + aiR * alpha;
                             outData[i + 1] = baseData[i + 1] * (1 - alpha) + aiG * alpha;
                             outData[i + 2] = baseData[i + 2] * (1 - alpha) + aiB * alpha;
                             outData[i + 3] = 255; 
                         }
                         
                         // 4. Put Result
                         ctx.putImageData(outputData, 0, 0);
                    } else {
                         // No mask or size mismatch, just draw AI result
                         ctx.clearRect(0, 0, w, h);
                         ctx.drawImage(img, 0, 0, w, h);
                    }
                } else {
                    // Fallback
                     ctx.clearRect(0, 0, w, h);
                     ctx.drawImage(img, 0, 0, w, h);
                }
                
                // Clear mask after successful refine
                clearMask(false);
            }
            setIsProcessing(false);
            setProcessingLabelOverride('');
          }
        };
        img.onerror = () => {
           setIsProcessing(false);
           setProcessingLabelOverride('');
           setInfoMessage(toolText?.processFailed || 'Processing failed.');
           setShowInfoModal(true);
        };
        img.src = json.output_url;
      } else {
        setIsProcessing(false);
        setProcessingLabelOverride('');
        if (Number(json?.status) === 601) {
          setShowLoginModal(true);
          return;
        }
        if (Number(json?.status) === 602) {
          const tip = json?.msg || (locale === 'zh' ? '免费次数已用完，请购买积分或订阅后继续。' : 'Free quota reached. Please buy credits or subscribe to continue.');
          setQuotaMessage(tip);
          setShowQuotaModal(true);
          return;
        }
        console.error('AI refine failed:', json.msg);
        setInfoMessage(json?.msg || toolText?.processFailed || 'Processing failed.');
        setShowInfoModal(true);
      }
    } catch (e) {
      setIsProcessing(false);
      setProcessingLabelOverride('');
      console.error('AI refine exception:', e);
      setInfoMessage(toolText?.processFailed || 'Processing failed.');
      setShowInfoModal(true);
    }
  };

  useEffect(() => {
    if (!originalImage || !wrapperRef.current) return;
    const fitToViewport = () => {
      if (!wrapperRef.current) return false;
      const { naturalWidth: w, naturalHeight: h } = originalImage;
      const wrapper = wrapperRef.current;
      const availableWidth = Math.max(0, wrapper.clientWidth - 24);
      const availableHeight = Math.max(0, wrapper.clientHeight - 24);
      if (!availableWidth || !availableHeight || !w || !h) return false;
      const scaleX = availableWidth / w;
      const scaleY = availableHeight / h;
      const fitScale = Math.min(scaleX, scaleY, 1);
      const minComfortZoom = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 0.34 : 0.24;
      const initialZoom = Math.min(1, Math.max(minComfortZoom, fitScale));
      setZoom(initialZoom);
      setPanX(0);
      setPanY(0);
      return true;
    };
    if (fitToViewport()) return;
    const timer = window.setTimeout(() => {
      fitToViewport();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [originalImage, showReference]);

  const handleNewImage = () => {
    if (Date.now() < exitBlockedUntilRef.current) return;
    sessionStorage.removeItem('cleanup_pending_upload');
    if (isHomeTool) {
      setEditorMode('object');
      if (typeof window !== 'undefined') {
        const nextUrl = `${window.location.pathname}${window.location.hash || ''}`;
        window.history.replaceState(null, '', nextUrl);
      }
    }
    setImageSrc(null); setOriginalImage(null);
    setHdEnabled(false);
    setMaskCanvasData(null);
    setZoom(1); setPanX(0); setPanY(0); setPanMode(false);
    setShowReference(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Reset mask canvas
    if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
  };
  
  const clearMask = (addToHistory = true) => {
    if (maskCanvasRef.current) {
        const ctx = maskCanvasRef.current.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
            if (addToHistory) {
                const emptyData = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
                setMaskCanvasData(emptyData);
                const newHistory = history.slice(0, historyStep + 1);
                newHistory.push(emptyData);
                if (newHistory.length > 20) newHistory.shift();
                setHistory(newHistory);
                setHistoryStep(newHistory.length - 1);
            } else {
                setMaskCanvasData(null);
                setHistory([]);
                setHistoryStep(-1);
            }
        }
    }
  };
  const handleClearMask = () => clearMask(true);
  
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
  const modeOptions = [
    { value: 'object', label: 'Remove Object' },
    { value: 'person', label: 'Remove Person' },
    { value: 'text', label: 'Remove Text' },
    { value: 'shadow', label: 'Remove Shadow' }
  ] as const;
  const modeLabel = modeOptions.find((item) => item.value === editorMode)?.label || 'Remove Object';
  const modeProcessingLabel = editorMode === 'shadow'
    ? 'Removing shadow...'
    : editorMode === 'glare'
      ? 'Removing glare...'
      : editorMode === 'person'
        ? 'Removing person...'
        : editorMode === 'text'
          ? 'Removing text...'
          : 'Removing objects...';
  const modeMaskHint = editorMode === 'shadow'
    ? 'Select shadow area'
    : editorMode === 'glare'
      ? 'Select glare area (beta)'
      : 'Select object / person / text area';
  const modeHelperText = editorMode === 'shadow'
    ? 'Best for dark cast shadows. Brush the shadow area, then click Remove.'
    : editorMode === 'glare'
      ? 'Beta mode for shiny highlights and reflections.'
      : editorMode === 'text'
        ? 'Erase text, logos, and watermarks by brushing over letters.'
        : editorMode === 'person'
          ? 'Remove people and crowds from backgrounds.'
          : 'General mode for objects and small distractions.';
  const monthlySubscription = getMonthlySubscriptionOffer(locale);
  const creditPackOffers = getCreditPackOffers(locale);
  const checkoutFromUpgrade = async (priceId: string, checkoutType: 'recurring' | 'one_time') => {
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    const sessionUserId = Number((session?.user as any)?.user_id || 0);
    if (!sessionUserId) {
      setShowUpgradeChoiceModal(false);
      setTimeout(() => setShowLoginModal(true), 0);
      return;
    }
    setShowUpgradeChoiceModal(false);
    setCheckoutLoadingId(priceId);
    try {
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        credentials: 'same-origin',
        body: JSON.stringify({
          price: { id: priceId, type: checkoutType },
          redirectUrl: typeof window !== 'undefined' ? window.location.pathname : getLinkHref(locale, pageName || ''),
          user_id: sessionUserId
        })
      });
      const res = await response.json();
      if (res?.error) {
        setInfoMessage(res?.error?.message || res?.message || (locale === 'zh' ? '支付会话创建失败，请稍后重试。' : 'Failed to create checkout session. Please try again.'));
        setShowInfoModal(true);
        return;
      }
      if (res?.provider === 'stripe' && res?.sessionId) {
        const stripe = await getStripe();
        await stripe?.redirectToCheckout({ sessionId: res.sessionId });
        return;
      }
      if (res?.provider === 'creem' && res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setInfoMessage(locale === 'zh' ? '支付会话创建失败，请稍后重试。' : 'Failed to create checkout session. Please try again.');
      setShowInfoModal(true);
    } catch (e) {
      setInfoMessage(locale === 'zh' ? '支付会话创建失败，请稍后重试。' : 'Failed to create checkout session. Please try again.');
      setShowInfoModal(true);
    } finally {
      setCheckoutLoadingId('');
    }
  };

  return (
    <>
      {imageSrc && (
        <LoginModal
          loadingText={commonText?.loadingText || 'Loading...'}
          redirectPath={pageResult}
          loginModalDesc={authText?.loginModalDesc || 'Please login to continue.'}
          loginModalButtonText={authText?.loginModalButtonText || 'Continue with Google'}
        />
      )}
      {showQuotaModal && (
        <Dialog as="div" className="relative z-[90]" open={showQuotaModal} onClose={setShowQuotaModal}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-amber-100 p-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                      {locale === 'zh' ? '免费额度已用完' : 'Free quota reached'}
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-slate-600">{quotaMessage || (locale === 'zh' ? '今日免费次数已达上限，请升级后继续。' : 'You have reached the daily free limit. Upgrade to continue.')}</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowQuotaModal(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {locale === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      setShowQuotaModal(false);
                      setShowUpgradeChoiceModal(true);
                    }}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    {locale === 'zh' ? '升级套餐' : 'Upgrade plan'}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      )}
      {showUpgradeChoiceModal && (
        <Dialog as="div" className="relative z-[95]" open={showUpgradeChoiceModal} onClose={setShowUpgradeChoiceModal}>
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[1px]" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '升级与购买' : 'Upgrade Options'}
                </Dialog.Title>
                <p className="mt-2 text-sm text-slate-600">
                  {locale === 'zh' ? '选择一个订阅计划或积分包，继续使用去除功能。' : 'Pick a subscription plan or a credit pack to continue editing.'}
                </p>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => {
                      checkoutFromUpgrade(monthlySubscription.priceId, monthlySubscription.checkoutType);
                    }}
                    disabled={Boolean(checkoutLoadingId)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-800 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="h-5 w-5 text-primary-600" />
                      <div>
                        <p className="text-sm font-semibold">{monthlySubscription.title}</p>
                        <p className="text-xs text-slate-500">{monthlySubscription.summary}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-primary-600">{checkoutLoadingId === monthlySubscription.priceId ? (locale === 'zh' ? '跳转中...' : 'Redirecting...') : (locale === 'zh' ? '订阅' : 'Subscribe')}</span>
                  </button>
                  {creditPackOffers.map((offer) => (
                    <button
                      key={offer.priceId}
                      onClick={() => {
                        checkoutFromUpgrade(offer.priceId, offer.checkoutType);
                      }}
                      disabled={Boolean(checkoutLoadingId)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-800 hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingBagIcon className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="text-sm font-semibold">{offer.title}</p>
                          <p className="text-xs text-slate-500">{offer.summary}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-primary-600">{checkoutLoadingId === offer.priceId ? (locale === 'zh' ? '跳转中...' : 'Redirecting...') : (locale === 'zh' ? '购买' : 'Buy')}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {locale === 'zh' ? '说明：订阅适合长期使用；积分包适合一次性或按需使用。' : 'Note: Subscription is best for frequent use; credit packs are best for one-time or occasional use.'}
                </p>
                <div className="mt-4">
                  <Link
                    href={getLinkHref(locale, 'pricing')}
                    onClick={() => {
                      setShowUpgradeChoiceModal(false);
                      setShowLoadingModal(true);
                    }}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {locale === 'zh' ? '查看完整定价页 →' : 'View full pricing page →'}
                  </Link>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowUpgradeChoiceModal(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {locale === 'zh' ? '关闭' : 'Close'}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      )}
      {showInfoModal && (
        <Dialog as="div" className="relative z-[90]" open={showInfoModal} onClose={setShowInfoModal}>
          <div className="fixed inset-0 bg-slate-900/35" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  {locale === 'zh' ? '处理提示' : 'Notice'}
                </Dialog.Title>
                <p className="mt-3 text-sm text-slate-600">{infoMessage}</p>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowInfoModal(false)}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    {locale === 'zh' ? '我知道了' : 'OK'}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      )}
      {/* Custom Cursor */}
      <div 
        ref={cursorRef}
        className="fixed pointer-events-none rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.95)] z-[10000] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-75 opacity-0"
        style={{ width: Math.max(12, brushSize), height: Math.max(12, brushSize), left: 0, top: 0, mixBlendMode: 'difference', backgroundColor: 'rgba(255,255,255,0.2)' }}
      />
      <input id="file-upload" name="file-upload" type="file" className="hidden" ref={fileInputRef} onChange={handleUpload} accept="image/png, image/jpeg, image/webp" />
      {!imageSrc && <Header locale={locale} page={pageName} />}
      <main className="isolate bg-slate-50">
        <Script id={`${pageName || 'home'}-ld`} type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": pageText.h1,
            "description": pageText.description,
            "inLanguage": locale === "default" ? "en" : locale,
            "isPartOf": { "@type": "WebSite", "name": isHomeTool ? "Pic Cleaner" : (process.env.NEXT_PUBLIC_WEBSITE_NAME || "Pic Cleaner") }
          })}
        </Script>
        
        {/* Tool Section */}
        <div className={`relative transition-all duration-500 ${imageSrc ? 'pt-0 pb-0' : 'pt-32 pb-16'}`}>
           <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
             <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'}} />
           </div>
           <div className="mx-auto max-w-7xl px-6 lg:px-8">
             <div className={`mx-auto max-w-5xl text-center mb-10 transition-all duration-500 ${imageSrc ? 'opacity-0 h-0 overflow-hidden mb-0 scale-95' : 'opacity-100 scale-100'}`}>
                <h1 className={`text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl ${isHomeTool ? 'max-w-4xl mx-auto leading-tight' : 'lg:whitespace-nowrap'}`}>
                  {isHomeTool ? (
                    <>
                      <span className="block">Remove Objects, Text, People</span>
                      <span className="block">from Images Instantly</span>
                    </>
                  ) : pageText.h1}
                </h1>
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

             <div
               ref={workspaceRef}
              className={`mx-auto transition-all duration-700 ease-in-out ${
                !imageSrc
                  ? (isHomeTool ? 'w-full max-w-3xl' : 'w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center')
                  : 'w-full'
              }`}
               onDrop={handleDrop}
               onDragOver={handleDragOver}
             >
               {!imageSrc ? (
                 <>
                   {!isHomeTool && <div className="hidden lg:flex w-full aspect-video rounded-3xl bg-slate-900/5 border border-slate-200/60 shadow-inner items-center justify-center overflow-hidden relative group backdrop-blur-sm">
                     <div className="absolute inset-0 bg-gradient-to-tr from-slate-100/50 to-white/30 opacity-50"></div>
                     <div className="relative z-10 flex flex-col items-center gap-4 transition-transform duration-300 group-hover:scale-105">
                       <div className="w-20 h-20 rounded-full bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-primary-500 ring-1 ring-slate-100">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 ml-1">
                           <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                         </svg>
                       </div>
                       <p className="text-slate-500 font-medium bg-white/80 px-4 py-1.5 rounded-full shadow-sm text-sm backdrop-blur-md">Watch Demo</p>
                     </div>
                   </div>}
                   <div className="w-full max-w-xl mx-auto">
                     <div
                       className="relative flex flex-col items-center justify-center gap-6 p-10 rounded-3xl border-2 border-dashed border-slate-300 bg-white/40 backdrop-blur-md hover:border-primary-400 hover:bg-white/60 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer group"
                      onClick={openFilePicker}
                     >
                       <div className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-3xl" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                       <div className="relative z-10 flex flex-col items-center gap-5">
                         <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white text-primary-500 shadow-md ring-1 ring-slate-900/5 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                             <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                           </svg>
                         </div>
                         <div className="text-center space-y-2">
                          {isHomeTool ? (
                            <p className="text-xl font-bold text-slate-900">{toolText.uploadTitle}</p>
                          ) : (
                            <h2 className="text-xl font-bold text-slate-900">{toolText.uploadTitle}</h2>
                          )}
                         {isHomeTool ? (
                           <p className="text-sm text-slate-600 max-w-sm sm:max-w-max mx-auto leading-relaxed sm:whitespace-nowrap">Drop your photo here, or click to upload and start editing.</p>
                         ) : (
                           <p className="text-sm text-slate-600 max-w-sm sm:max-w-max mx-auto leading-relaxed sm:whitespace-nowrap">{toolText.uploadDesc}</p>
                         )}
                          {isHomeTool ? (
                            <p className="text-xs text-slate-400">Supports JPG, PNG, and WebP. You can also paste an image with Ctrl+V.</p>
                          ) : (
                            <p className="text-xs text-slate-400">{toolText.uploadSubDesc}</p>
                          )}
                         </div>
                       </div>
                       <div className="relative z-10 flex flex-col items-center gap-3">
                         <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/80 px-3 py-1.5 rounded-full border border-slate-200/60 backdrop-blur-sm shadow-sm">
                           <kbd className="font-sans font-semibold text-slate-500">Ctrl</kbd> <span className="text-slate-300">+</span> <kbd className="font-sans font-semibold text-slate-500">V</kbd> <span>to paste</span>
                         </div>
                       </div>
                     </div>
                     {isHomeTool && (
                       <div className="mt-5">
                         <p className="text-center text-sm text-slate-500 mb-3">No image? Try one of these</p>
                         <div className="flex items-center justify-center gap-3 flex-wrap">
                          {HOME_UPLOAD_THUMBNAILS.map((sample) => (
                             <button key={sample.id} onClick={() => loadSample(sample)} className="group rounded-xl border border-slate-200 bg-white p-1.5 hover:border-primary-300 hover:shadow-md transition-all">
                               <img src={sample.beforeUrl} alt={sample.title} className="w-24 h-16 object-cover rounded-lg" />
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 </>
               ) : (
                <div className="fixed inset-0 z-[99999] bg-white flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-300">
                 <div className="w-full max-w-[1820px] h-[min(920px,calc(100vh-96px))] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col pointer-events-auto">
                 <div className="min-h-16 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3 px-3 lg:px-6 py-2 shrink-0 z-[2000] shadow-md overflow-visible">
                    <div className="flex items-center gap-4 flex-wrap">
                       <button
                         onClick={handleNewImage}
                        disabled={blockExitClick}
                        className={`inline-flex items-center gap-2 font-medium px-3 py-2 rounded-lg transition-colors ${
                          blockExitClick
                            ? 'text-slate-400 cursor-not-allowed pointer-events-none'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                       >
                         <ChevronLeftIcon className="w-5 h-5" />
                        <span>Exit Editor</span>
                       </button>
                       <button
                        onClick={openFilePicker}
                         className="inline-flex items-center text-slate-700 hover:text-slate-900 font-medium px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                       >
                         Upload New
                       </button>
                       <div className="h-6 w-px bg-slate-200 hidden lg:block"></div>
                       <button
                         onClick={() => setShowReference(!showReference)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${showReference ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}
                       >
                         <Squares2X2Icon className="w-4 h-4" />
                         <span>Reference</span>
                       </button>
                     </div>
                   <div className="flex items-center gap-3 lg:gap-5 ml-auto flex-wrap">
                        <div className="lg:hidden flex items-center gap-2 border-l pl-3 border-slate-200">
                          <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button className="inline-flex items-center justify-center gap-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                              {modeLabel}
                              <ChevronDownIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            </Menu.Button>
                            <Transition enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                              <Menu.Items className="absolute right-0 z-[3000] mt-2 w-48 origin-top-right divide-y divide-slate-100 rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                <div className="py-1">
                                  {modeOptions.map((mode) => (
                                    <Menu.Item key={mode.value}>
                                      {({ active }) => (
                                        <button className={`${active ? 'bg-slate-50' : ''} text-slate-700 block w-full text-left px-4 py-2 text-sm`} onClick={() => setEditorMode(mode.value)}>
                                          {mode.label}
                                        </button>
                                      )}
                                    </Menu.Item>
                                  ))}
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </div>
                         <PaintBrushIcon className="w-5 h-5 text-slate-400" />
                         <div className="flex flex-col gap-1 w-24 lg:w-32">
                           <input
                             type="range"
                             min="1"
                             max="100"
                             value={brushSize}
                             onChange={(e) => setBrushSize(Number(e.target.value))}
                             className="h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary-500 hover:accent-primary-600 focus:outline-none"
                             title={`Brush Size: ${brushSize}`}
                           />
                         </div>
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                         <button
                           onClick={handleUndo}
                           disabled={historyStep < 0}
                           className={`p-1.5 rounded-md transition-colors ${historyStep < 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                           title="Undo (Ctrl+Z)"
                         >
                           <ArrowUturnLeftIcon className="w-4 h-4" />
                         </button>
                         <button
                           onClick={handleRedo}
                           disabled={historyStep >= history.length - 1}
                           className={`p-1.5 rounded-md transition-colors ${historyStep >= history.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                           title="Redo (Ctrl+Y)"
                         >
                           <ArrowUturnRightIcon className="w-4 h-4" />
                         </button>
                       </div>
                       <button onClick={handleClearMask} className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-md transition-colors whitespace-nowrap">
                         Clear
                       </button>
                     </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleGenerate()}
                        className="lg:hidden inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-md"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                        <span className="sm:hidden">Run</span>
                      </button>
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Download
                      </button>
                      {!isHomeTool && hdEnabled && (
                        <button
                          onClick={handleDownloadHd}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          HD
                        </button>
                      )}
                       <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="inline-flex items-center justify-center gap-x-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                           {downloadFormat === 'png' ? 'PNG' : downloadFormat === 'jpeg' ? 'JPG' : 'WebP'}
                           <ChevronDownIcon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                         </Menu.Button>
                         <Transition enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                          <Menu.Items className="absolute right-0 z-[3000] mt-2 w-28 origin-top-right divide-y divide-slate-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                  <div className="flex-1 relative flex overflow-hidden bg-slate-100" ref={wrapperRef}>
                    <aside className="hidden lg:flex lg:w-72 xl:w-80 min-h-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Mode</h3>
                        <p className="mt-1 text-xs text-slate-500">{modeMaskHint}</p>
                      </div>
                      <div className="space-y-2">
                        {modeOptions.map((mode) => (
                          <button
                            key={mode.value}
                            onClick={() => setEditorMode(mode.value)}
                            className={`w-full text-left rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${editorMode === mode.value ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{locale === 'zh' ? '质量模式' : 'Quality mode'}</p>
                          <p className="mt-1 text-xs text-slate-500">{locale === 'zh' ? 'Standard 每次 1 积分；High Quality 每次 2 积分（Pro 为 1）。下方按你的账户显示本次预计。' : 'Standard: 1 credit per run. High Quality: 2 credits (1 for Pro). Your estimate below reflects your account.'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setQualityMode('standard')}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${qualityMode === 'standard' ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                          >
                            Standard
                          </button>
                          <button
                            onClick={() => setQualityMode('high_quality')}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${qualityMode === 'high_quality' ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                          >
                            High Quality
                          </button>
                        </div>
                      </div>
                      {!isHomeTool && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{locale === 'zh' ? '高清输出（HD）' : 'HD Output'}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {qualityMode === 'high_quality'
                                  ? (locale === 'zh' ? 'High Quality 模式下已包含高清输出。' : 'HD is included when High Quality mode is selected.')
                                  : (locale === 'zh' ? '先生成标准结果；点击 Download HD 时再 +1 积分生成高清。' : 'Generate standard result first; HD is generated on Download HD with +1 credit.')}
                              </p>
                            </div>
                            <label className="inline-flex cursor-pointer items-center">
                              <input
                                type="checkbox"
                                checked={hdEnabled}
                                onChange={(e) => setHdEnabled(e.target.checked)}
                                disabled={qualityMode === 'high_quality'}
                                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                              />
                            </label>
                          </div>
                          <button
                            onClick={() => setShowUpgradeChoiceModal(true)}
                            className="w-full inline-flex items-center justify-center rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                          >
                            {locale === 'zh' ? '订阅 / 购买积分' : 'Upgrade for Credits'}
                          </button>
                        </div>
                      )}
                      {isHomeTool && (
                        <button
                          onClick={() => setShowUpgradeChoiceModal(true)}
                          className="w-full inline-flex items-center justify-center rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                        >
                          {locale === 'zh' ? '订阅 / 购买积分' : 'Upgrade for Credits'}
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerate()}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        Remove
                      </button>
                      <p className="text-xs text-slate-500">{creditEstimateLine}</p>
                      {isHomeTool ? (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {creditGuideLine.body}{' '}
                          <Link href={creditGuideLine.pricingHref} className="font-medium text-primary-600 hover:text-primary-700 hover:underline whitespace-nowrap">
                            {locale === 'zh' ? '定价说明' : 'Pricing'}
                          </Link>
                        </p>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-slate-800">{locale === 'zh' ? '积分说明' : 'Credit Guide'}</p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {creditGuideLine.body}{' '}
                            <Link href={creditGuideLine.pricingHref} className="font-medium text-primary-600 hover:text-primary-700 hover:underline whitespace-nowrap">
                              {locale === 'zh' ? '定价与完整规则' : 'Pricing & full rules'}
                            </Link>
                          </p>
                        </div>
                      )}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="break-words text-xs leading-relaxed text-slate-600">{modeHelperText}</p>
                      </div>
                    </aside>
                   <div
                     onWheel={showReference ? undefined : handleWheelZoom}
                     className={`flex-1 relative flex items-center justify-center p-4 lg:p-8 overflow-hidden bg-slate-50 ${showReference ? 'cursor-default' : (panMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair')}`}
                   >
                      <div
                        className="relative inline-block shadow-2xl rounded-lg overflow-hidden ring-1 ring-slate-900/5 transition-transform duration-75 ease-linear origin-center will-change-transform"
                        style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
                        onMouseDown={showReference ? undefined : handlePanStart}
                      >
                         <img
                           ref={originalImageRef}
                           src={imageSrc!}
                           alt="Original"
                           className="hidden"
                          onLoad={(e) => {
                            drawImageToCanvases(e.target as HTMLImageElement);
                          }}
                         />
                        <canvas ref={canvasRef} className="block w-auto h-auto max-w-full max-h-full" />
                        <canvas
                          ref={maskCanvasRef}
                          className={`absolute inset-0 w-full h-full ${panMode || showReference ? 'pointer-events-none' : 'cursor-none'} opacity-100`}
                          onMouseDown={handleDrawStart}
                          onMouseMove={(e) => {
                            if (isDrawing || showReference) return;
                            if (cursorRef.current) {
                              const x = e.clientX;
                              const y = e.clientY;
                              cursorRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
                              const visualSize = brushSize;
                              cursorRef.current.style.width = `${visualSize}px`;
                              cursorRef.current.style.height = `${visualSize}px`;
                              if (!panMode) cursorRef.current.style.opacity = '1';
                            }
                          }}
                          onMouseEnter={() => { if (cursorRef.current && !panMode && !showReference) cursorRef.current.style.opacity = '1'; }}
                          onMouseLeave={() => { if (cursorRef.current) cursorRef.current.style.opacity = '0'; }}
                        />
                        {showReference && <img src={imageSrc!} alt="Reference" className="absolute inset-0 block w-full h-full object-contain bg-slate-200" />}
                       </div>
                      {isProcessing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm z-50">
                          <div className="bg-white/90 p-4 rounded-2xl shadow-xl flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            <p className="text-sm font-medium text-slate-700">{processingLabelOverride || (isHomeTool ? modeProcessingLabel : (pageText.processingLabel || modeProcessingLabel))}</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1040] flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full px-3 py-2 shadow-xl border border-white/50 ring-1 ring-black/5">
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors" onClick={(e) => handleZoom(0.9, e)} title="Zoom Out"><MagnifyingGlassMinusIcon className="w-5 h-5" /></button>
                        <span className="text-xs font-semibold text-slate-600 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors" onClick={(e) => handleZoom(1.1, e)} title="Zoom In"><MagnifyingGlassPlusIcon className="w-5 h-5" /></button>
                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                        <button className={`p-2 rounded-full transition-colors ${panMode ? 'bg-primary-100 text-primary-600' : 'hover:bg-slate-100 text-slate-600'}`} onClick={() => setPanMode(!panMode)} title="Pan Mode (Hold Space)">
                          <HandRaisedIcon className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors" onClick={resetView} title="Reset View"><ArrowPathIcon className="w-5 h-5" /></button>
                      </div>
                      {!isHomeTool && (
                        <div className="absolute bottom-24 right-6 md:hidden z-[1040] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-700">HD</span>
                            <button
                              onClick={() => setHdEnabled(!hdEnabled)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${hdEnabled ? 'bg-primary-600' : 'bg-slate-300'}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hdEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                            </button>
                            <button
                              onClick={() => setShowUpgradeChoiceModal(true)}
                              className="text-xs font-semibold text-primary-600"
                            >
                              {locale === 'zh' ? '升级' : 'Upgrade'}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-6 right-6 md:hidden z-[1040]">
                        <button onClick={() => handleGenerate()} className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-all active:scale-95">
                          <SparklesIcon className="w-6 h-6" />
                        </button>
                      </div>
                     </div>
                   </div>
                 </div>
                </div>
               )}
             </div>
           </div>
        </div>

        {!imageSrc && (
        <>
        {/* Content Section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 space-y-20">
            {Array.isArray(pageText.removeItems) && pageText.removeItems.length > 0 && (
              <section className="scroll-mt-24">
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">{pageText.removeWhatTitle || 'What can you remove?'}</h2>
                </div>
                <div className="flex flex-wrap items-stretch gap-3 md:gap-4 justify-center">
                  {pageText.removeItems.map((item: any, idx: number) => (
                    <Link
                      key={`${item.href}-${idx}`}
                      href={getLinkHref(locale, item.href)}
                      className={`group inline-flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-slate-800 font-medium hover:border-primary-300 hover:text-primary-700 transition-colors ${idx % 3 === 0 ? 'min-w-[280px]' : idx % 3 === 1 ? 'min-w-[320px]' : 'min-w-[300px]'}`}
                    >
                      <span className="leading-relaxed">{item.label}</span>
                      <span className="text-slate-400 group-hover:text-primary-600 transition-colors">{'>'}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {/* Sample Gallery */}
            <section ref={samplesRef} className="scroll-mt-24">
                <div className="text-center mb-16">
                    <span className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary-700 mb-4">BEFORE & AFTER</span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">{pageText.sampleTitle || 'Try with Samples'}</h2>
                    <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">{pageText.sampleDesc || 'Click any sample below to load it into the editor.'}</p>
                </div>
                {isHomeTool ? (
                  <div className="space-y-8">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {HOME_USE_CASES.map((useCase) => (
                        <button
                          key={useCase.key}
                          onClick={() => setActiveHomeUseCase(useCase.key)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeHomeUseCase === useCase.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:border-primary-300 hover:text-primary-700'}`}
                        >
                          {useCase.label}
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const useCase = HOME_USE_CASES.find((item) => item.key === activeHomeUseCase) || HOME_USE_CASES[0];
                      const sample = SAMPLES.find((item) => item.id === useCase.sampleId) || SAMPLES[0];
                      return (
                        <article key={sample.id} className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-sm p-6 lg:p-8">
                          <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 pointer-events-none"></div>
                          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                            <div className="text-left space-y-6">
                              <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">{useCase.label}</div>
                              <div>
                                <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">{sample.title}</h3>
                                <p className="text-base lg:text-lg text-slate-600 leading-relaxed">{sample.desc}</p>
                              </div>
                              <button onClick={() => loadSample(sample)} className="group/btn inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-primary-600 text-white font-semibold px-6 py-3 shadow-lg shadow-slate-900/20 hover:shadow-primary-500/30 transition-all duration-300">
                                {pageText.trySampleBtn || 'Try this sample'}
                                <ArrowRightIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                              </button>
                            </div>
                            <div className="w-full cursor-pointer" onClick={() => loadSample(sample)}>
                              <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/40">
                                <ComparisonSlider 
                                  beforeUrl={sample.beforeUrl}
                                  afterUrl={sample.afterUrl}
                                  imageFit="cover"
                                  imagePosition={sample.imagePosition || 'center center'}
                                  className="aspect-[16/10] rounded-xl overflow-hidden"
                                />
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })()}
                  </div>
                ) : (
                <div className="space-y-24">
                    {SAMPLES.map((sample, index) => (
                        <article key={sample.id} className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-sm p-6 lg:p-8 ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 pointer-events-none"></div>
                            <div className={`relative z-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-14 ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                                <div className="flex-1 text-left space-y-7">
                                    <div className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">{sample.id}</div>
                                    <div>
                                        <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3 transition-colors group-hover:text-primary-700">{sample.title}</h3>
                                        <p className="text-base lg:text-lg text-slate-600 leading-relaxed">{sample.desc}</p>
                                    </div>
                                    <button onClick={() => loadSample(sample)} className="group/btn inline-flex items-center gap-2 rounded-full bg-slate-900 hover:bg-primary-600 text-white font-semibold px-6 py-3 shadow-lg shadow-slate-900/20 hover:shadow-primary-500/30 transition-all duration-300">
                                        {pageText.trySampleBtn || 'Try this sample'}
                                        <ArrowRightIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                    </button>
                                </div>
                                <div className="flex-1 w-full max-w-xl lg:max-w-2xl relative cursor-pointer" onClick={() => loadSample(sample)}>
                                    <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary-200/40 to-indigo-200/40 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/40">
                                        <ComparisonSlider 
                                            beforeUrl={sample.beforeUrl}
                                            afterUrl={sample.afterUrl}
                                            imageFit="cover"
                                            imagePosition={sample.imagePosition || 'center center'}
                                            className="aspect-[16/10] rounded-xl overflow-hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
                )}
            </section>

            <section className="relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-8 lg:p-12 transition-all hover:shadow-2xl hover:bg-white/70">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">{pageText.aboutTitle || toolText.aboutTitle}</h2>
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

            {isHomeTool ? (
              <section ref={howToUseRef} className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-8 lg:p-12 scroll-mt-24">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">How to Remove Objects from Photos — Step by Step</h2>
                <p className="text-slate-600 mb-8">Remove unwanted objects from your images in just a few seconds.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Upload Image", desc: "Upload your photo from your device or computer." },
                    { title: "Highlight the Area to Erase", desc: "Brush over the object, person, or text you want to remove." },
                    { title: "AI Auto-Magic Removal", desc: "The editor instantly removes the selected area and fills the background naturally." },
                    { title: "Download Your Clean Photo", desc: "Save your edited image in high quality with no watermark." }
                  ].map((step, i) => (
                    <article key={step.title} className="rounded-2xl bg-white border border-slate-200 p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="flex-none flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-600 font-bold text-xs">{i + 1}</span>
                        <h3 className="font-semibold text-slate-900">{step.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section ref={howToUseRef} className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-8 lg:p-12 h-full transition-all hover:shadow-2xl hover:bg-white/70 scroll-mt-24">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">{pageText.howTitle || pageText.howToUseTitle || toolText.stepTitle}</h2>
                    <ul className="space-y-4">
                        {[pageText.how1 || pageText.step1Desc, pageText.how2 || pageText.step2Desc, pageText.how3 || pageText.step3Desc, pageText.how4, pageText.how5, pageText.how6].filter(Boolean).map((step, i) => (
                            <li key={i} className="flex gap-4">
                                <span className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600 font-bold text-sm shadow-sm">{i + 1}</span>
                                <span className="text-slate-700 leading-relaxed pt-1">{step}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-xl p-8 lg:p-12 h-full transition-all hover:shadow-2xl hover:bg-white/70">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">{pageText.formatsTitle || 'Supported Image Formats'}</h2>
                    <div className="space-y-3">
                        {[pageText.format1, pageText.format2, pageText.format3].filter(Boolean).map((fmt, idx) => (
                            <div key={idx} className="flex items-center gap-3 rounded-xl bg-white/70 border border-slate-200 px-4 py-3">
                                <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                                <span className="text-slate-700 font-medium">{fmt}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>}

            <section className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl px-8 py-10 lg:px-12 lg:py-14">
                <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-primary-500/20 blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>
                <h2 className="relative text-3xl font-bold tracking-tight text-white mb-3">{toolText.faqTitle}</h2>
                <p className="relative text-slate-300 mb-10 max-w-3xl">{isHomeTool ? "Everything you need to know before cleaning up your first photo." : "Everything you need to know before editing your first shadow-heavy photo."}</p>
                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                        { q: pageText.faq1Q, a: pageText.faq1A },
                        { q: pageText.faq2Q, a: pageText.faq2A },
                        { q: pageText.faq3Q, a: pageText.faq3A },
                        { q: pageText.faq4Q, a: pageText.faq4A },
                        { q: pageText.faq5Q, a: pageText.faq5A },
                        { q: pageText.faq6Q, a: pageText.faq6A },
                        { q: pageText.faq7Q, a: pageText.faq7A }
                    ].filter((item) => item.q).map((faq, idx) => (
                        <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] p-6 transition-colors">
                            <div className="flex items-start gap-3">
                                <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/20 text-primary-300 text-xs font-bold">{idx + 1}</span>
                                <h3 className="text-base font-semibold leading-7 text-white">{faq.q}</h3>
                            </div>
                            <p className="mt-3 pl-9 text-sm leading-6 text-slate-300 whitespace-pre-line">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>

        <Footer locale={locale} page={pageName} />
        </>
        )}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-[1200] inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 hover:bg-primary-600 text-white shadow-lg shadow-slate-900/30 transition-colors backdrop-blur-sm"
            title="Back to top"
          >
            <ArrowUpIcon className="w-5 h-5" />
          </button>
        )}
      </main>
    </>
  );
}
