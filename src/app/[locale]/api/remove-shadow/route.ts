import { getReplicateClient } from "~/libs/replicateClient";
import { getUserFacingAiErrorMessage, resolveAiErrorLocale } from "~/lib/aiErrorUserMessage";
import { getDb } from "~/libs/db";
import { getBusinessDateString } from "~/libs/date";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// KIE API Configuration
const KIE_UPLOAD_BASE_URL = "https://kieai.redpandaai.co";
const KIE_API_BASE_URL = "https://api.kie.ai";

interface KieUploadResponse {
  success: boolean;
  code: number;
  msg: string;
  data: {
    fileUrl: string;
    fileId: string;
  };
}

interface KieGenerateResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface KieTaskDetailsResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    successFlag: number; // 0: Generating, 1: Success, 2: Failed
    progress: string;
    response?: {
      result_urls: string[];
    };
    failReason?: string;
    errorMessage?: string;
    // Fallback fields based on observation/other docs
    resultUrl?: string;
    url?: string;
    results?: string[] | { url: string }[];
  };
}

const GUEST_COOKIE_KEY = "cp_guest_user_id";
const FREE_DAILY_LIMIT = Number(process.env.FREE_TIMES || 3);
const FREE_DAILY_IP_LIMIT = Math.max(FREE_DAILY_LIMIT, Number(process.env.FREE_TIMES_IP || 6));
const API_RATE_LIMIT_PER_MIN = Math.max(1, Number(process.env.API_RATE_LIMIT_PER_MIN || 12));
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateWindow = {
  windowStart: number;
  count: number;
};

const ipMinuteBuckets = new Map<string, RateWindow>();

type UserAccessContext = {
  userId: number;
  isGuest: boolean;
  isSubscribed: boolean;
  creditBalance: number;
  isFreeTier: boolean;
  todayUsedCount: number;
  guestCookieValue?: string;
};

function getClientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
}

function isIpRateLimited(ip: string) {
  if (!ip) return { limited: false, retryAfterSec: 0 };
  const now = Date.now();
  const prev = ipMinuteBuckets.get(ip);
  if (!prev || now - prev.windowStart >= RATE_LIMIT_WINDOW_MS) {
    ipMinuteBuckets.set(ip, { windowStart: now, count: 1 });
    return { limited: false, retryAfterSec: 0 };
  }
  prev.count += 1;
  ipMinuteBuckets.set(ip, prev);
  if (prev.count <= API_RATE_LIMIT_PER_MIN) {
    return { limited: false, retryAfterSec: 0 };
  }
  const retryAfterSec = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - prev.windowStart)) / 1000));
  return { limited: true, retryAfterSec };
}

function normalizeQuality(raw: any) {
  const text = String(raw || "").toLowerCase();
  if (text === "high" || text === "high_quality") {
    return "high_quality";
  }
  return "standard";
}

function normalizeEditMode(raw: any) {
  const text = String(raw || "").toLowerCase();
  if (text === "object" || text === "text" || text === "person" || text === "shadow" || text === "glare") {
    return text;
  }
  return "object";
}

/** Inpainting backbone: same as Standard. High Quality adds a SwinIR pass after this (see main POST). */
function resolveModelVariant(
  _quality: "standard" | "high_quality",
  mode: "object" | "text" | "person" | "shadow" | "glare"
) {
  // One-shot backend routing: text-like overlays are better with semantic inpaint.
  if (mode === "text") {
    return "sd_inpaint";
  }
  if (mode === "object" || mode === "person") {
    return "lama";
  }
  return "sd_inpaint";
}

function getCreditCost(quality: "standard" | "high_quality", isHd: boolean, isSubscribed: boolean) {
  if (quality === "high_quality") {
    return isSubscribed ? 1 : 2;
  }
  return 1 + (isHd ? (isSubscribed ? 0 : 1) : 0);
}

async function resolveOutputUrl(output: any): Promise<string> {
  const candidate = Array.isArray(output) ? output[0] : output;
  if (!candidate) return "";
  if (typeof candidate === "string") return candidate;
  if (typeof candidate?.url === "function") {
    const maybeUrl = await candidate.url();
    return typeof maybeUrl === "string" ? maybeUrl : "";
  }
  if (typeof candidate?.url === "string") return candidate.url;
  if (typeof candidate?.href === "string") return candidate.href;
  return String(candidate || "");
}

function buildResponse(payload: any, status: number, guestCookieValue?: string) {
  const response = NextResponse.json(payload, { status });
  if (guestCookieValue) {
    response.cookies.set({
      name: GUEST_COOKIE_KEY,
      value: guestCookieValue,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365
    });
  }
  return response;
}

async function resolveUserContext(req: NextRequest) {
  const db = getDb();
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const tokenUserId = Number(token?.user_id || 0);

  if (tokenUserId > 0) {
    const userRowRes = await db.query("select * from users where id=$1 limit 1", [tokenUserId]);
    if (userRowRes.rows.length > 0) {
      return {
        userId: tokenUserId,
        isGuest: false,
        guestCookieValue: undefined
      };
    }
  }

  const cookieUserId = Number(req.cookies.get(GUEST_COOKIE_KEY)?.value || 0);
  if (cookieUserId > 0) {
    const guestRes = await db.query("select * from users where id=$1 limit 1", [cookieUserId]);
    if (guestRes.rows.length > 0) {
      return {
        userId: cookieUserId,
        isGuest: true,
        guestCookieValue: String(cookieUserId)
      };
    }
  }

  const ip = getClientIp(req);
  const guestName = `Guest_${Date.now()}`;
  const insertRes = await db.query(
    "insert into users(email,password_hash,user_name,user_image,is_guest,last_login_ip) values($1,$2,$3,$4,$5,$6)",
    [null, null, guestName, null, true, ip]
  );
  let guestId = Number(insertRes.insertId || 0);
  if (!guestId) {
    const latestRes = await db.query("select id from users where is_guest=$1 order by id desc limit 1", [true]);
    guestId = Number(latestRes.rows?.[0]?.id || 0);
  }
  return {
    userId: guestId,
    isGuest: true,
    guestCookieValue: String(guestId)
  };
}

async function ensureCreditsRow(userId: number) {
  const db = getDb();
  const rowRes = await db.query("select * from credits where user_id=$1 limit 1", [userId]);
  if (rowRes.rows.length <= 0) {
    await db.query("insert into credits(user_id,balance) values($1,$2)", [userId, 0]);
    return 0;
  }
  return Number(rowRes.rows[0].balance || 0);
}

async function getTodayUsage(userId: number) {
  const db = getDb();
  const today = getBusinessDateString();
  const rowRes = await db.query("select * from daily_usage where user_id=$1 and date=$2 limit 1", [userId, today]);
  return {
    today,
    usedCount: rowRes.rows.length > 0 ? Number(rowRes.rows[0].used_count || 0) : 0,
    rowId: rowRes.rows.length > 0 ? Number(rowRes.rows[0].id || 0) : 0
  };
}

async function getTodayGuestUsageByIp(ip: string) {
  if (!ip) return 0;
  const db = getDb();
  const today = getBusinessDateString();
  const rowRes = await db.query(
    `select coalesce(sum(d.used_count), 0) as used
     from daily_usage d
     join users u on u.id=d.user_id
     where d.date=$1 and u.is_guest=$2 and u.last_login_ip=$3`,
    [today, true, ip]
  );
  return Number(rowRes.rows?.[0]?.used || 0);
}

async function increaseTodayUsage(userId: number) {
  const db = getDb();
  const usage = await getTodayUsage(userId);
  if (usage.rowId > 0) {
    await db.query("update daily_usage set used_count=$1 where id=$2", [usage.usedCount + 1, usage.rowId]);
  } else {
    await db.query("insert into daily_usage(user_id,date,used_count) values($1,$2,$3)", [userId, usage.today, 1]);
  }
}

async function uploadToKie(base64Data: string, apiKey: string): Promise<string> {
  // Use the Base64 upload endpoint
  const url = `${KIE_UPLOAD_BASE_URL}/api/file-base64-upload`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data,
      uploadPath: "cleanuppictures/uploads",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KIE Upload failed: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as KieUploadResponse;
  console.log("KIE Upload Result:", JSON.stringify(result));

  if (result.code !== 200) {
    throw new Error(`KIE Upload error: ${result.msg || "Unknown error"}`);
  }

  // Check for various possible URL fields
  // Some KIE APIs return fileUrl, some return url, some return downloadUrl
  const fileUrl = result.data?.fileUrl || (result.data as any)?.url || (result.data as any)?.downloadUrl;

  if (!fileUrl) {
    throw new Error(`KIE Upload error: URL not found in response. Data: ${JSON.stringify(result.data)}`);
  }

  return fileUrl;
}

async function generate4oImage(
  apiKey: string,
  imageUrl: string,
  maskUrl: string,
  prompt: string,
  scene: string
): Promise<string> {
  const url = `${KIE_API_BASE_URL}/api/v1/gpt4o-image/generate`;
  
  // Default to 1:1 as we don't have aspect ratio logic yet. 
  // Ideally should match image ratio (1:1, 3:2, 2:3).
  const size = "1:1"; 

  const body = {
    filesUrl: [imageUrl], // Must be an array
    maskUrl: maskUrl || undefined, // Optional
    prompt: prompt,
    size: size,
    nVariants: 1,
    isEnhance: false, 
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KIE Generate failed: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as KieGenerateResponse;
  if (result.code !== 200 || !result.data?.taskId) {
    throw new Error(`KIE Generate error: ${result.msg || "No taskId returned"}`);
  }

  return await pollKieTask(apiKey, result.data.taskId);
}

async function pollKieTask(apiKey: string, taskId: string): Promise<string> {
  const url = `${KIE_API_BASE_URL}/api/v1/gpt4o-image/record-info?taskId=${taskId}`;
  const maxAttempts = 30; // 60s timeout
  const interval = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.warn(`KIE Poll failed: ${response.status}`);
      continue;
    }

    const result = (await response.json()) as KieTaskDetailsResponse;
    const data = result.data;
    
    if (!data) continue;

    // Check successFlag: 0=Generating, 1=Success, 2=Failed
    if (data.successFlag === 1) {
       console.log("KIE Success Data Dump:", JSON.stringify(data, null, 2));

       // Standard structure according to docs: data.response.result_urls
       let resultUrls: string[] | undefined;
       
       if (data.response) {
         if (typeof data.response === 'string') {
            try {
               const parsedResponse = JSON.parse(data.response);
               resultUrls = parsedResponse.result_urls || parsedResponse.resultUrls;
            } catch (e) {
               console.warn("Failed to parse data.response string", e);
            }
         } else {
            resultUrls = data.response.result_urls || (data.response as any).resultUrls;
         }
       }
       
       if (resultUrls && resultUrls.length > 0) {
         return resultUrls[0];
       }

       // Fallback for different model types (just in case)
       if (data.resultUrl) return data.resultUrl;
       if (data.url) return data.url;
       
       throw new Error(`KIE Task succeeded but image URL not found. Response keys: ${Object.keys(data.response || {}).join(',')}`);
    } else if (data.successFlag === 2) {
       // Failed
       throw new Error(`KIE Task failed: ${data.failReason || data.errorMessage || "Unknown reason"}`);
    }
    // If 0, continue polling
  }

  throw new Error("KIE Task timed out");
}

export async function POST(req: NextRequest) {
  const db = getDb();
  let jobId = 0;
  let guestCookieValue: string | undefined;
  let localeHint: unknown;
  const clientIp = getClientIp(req);
  const rateLimit = isIpRateLimited(clientIp);
  if (rateLimit.limited) {
    return buildResponse(
      {
        msg: "Request limit reached. Please wait a moment and try again.",
        status: 429,
        retry_after: rateLimit.retryAfterSec
      },
      429
    );
  }
  try {
    const json = await req.json();
    localeHint = json?.locale;
    const action = String(json?.action || "remove");
    const upscaleOnly = action === "upscale_hd";
    const { imageDataUrl, maskDataUrl, kieMaskDataUrl, scene, resizedForLama } = json;
    const imageWidth = Number(json?.imageWidth || 0);
    const imageHeight = Number(json?.imageHeight || 0);
    const quality = normalizeQuality(json?.quality);
    const mode = normalizeEditMode(json?.mode);
    const isHd = Boolean(json?.hd);
    let creditCost = upscaleOnly ? 1 : getCreditCost(quality, isHd, false);

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return buildResponse({ msg: "Invalid image input.", status: 400 }, 400);
    }
    if (!upscaleOnly && !maskDataUrl && !kieMaskDataUrl) {
      return buildResponse({ msg: "Mask is required for this model. Please paint over the area to remove.", status: 400 }, 400);
    }

    const userContextBase = await resolveUserContext(req);
    guestCookieValue = userContextBase.guestCookieValue;
    const subscriptionRes = await db.query("select * from subscriptions where user_id=$1 order by id desc limit 1", [userContextBase.userId]);
    const subStatus = String(subscriptionRes.rows?.[0]?.status || "");
    const isSubscribed = subStatus === "active";
    const creditBalance = await ensureCreditsRow(userContextBase.userId);
    const usage = await getTodayUsage(userContextBase.userId);
    const isFreeTier = !isSubscribed && creditBalance <= 0;

    const userContext: UserAccessContext = {
      userId: userContextBase.userId,
      isGuest: userContextBase.isGuest,
      isSubscribed,
      creditBalance,
      isFreeTier,
      todayUsedCount: usage.usedCount,
      guestCookieValue
    };
    creditCost = upscaleOnly ? (userContext.isSubscribed ? 0 : 1) : getCreditCost(quality, isHd, userContext.isSubscribed);

    if (userContext.isFreeTier) {
      if (upscaleOnly || quality !== "standard" || isHd) {
        return buildResponse({ msg: "Free users support Standard mode only.", status: 602 }, 200, guestCookieValue);
      }
      if (userContext.isGuest) {
        const ipUsedCount = await getTodayGuestUsageByIp(clientIp);
        if (ipUsedCount >= FREE_DAILY_IP_LIMIT) {
          return buildResponse(
            { msg: "You’ve reached your free limit. Upgrade to continue.", status: 602 },
            200,
            guestCookieValue
          );
        }
      }
      if (userContext.todayUsedCount >= FREE_DAILY_LIMIT) {
        return buildResponse({ msg: "You’ve reached your free limit. Upgrade to continue.", status: 602 }, 200, guestCookieValue);
      }
    } else if (userContext.creditBalance < creditCost) {
      return buildResponse({ msg: "Not enough credits. Buy more to continue.", status: 602 }, 200, guestCookieValue);
    }

    const kieApiKey = process.env.KIE_API_KEY;
    const basePrompt = "clean background, natural lighting, seamless background continuation";
    const prompt = basePrompt;
    const negative_prompt = "shadow, dark patch, uneven lighting, artifact, blur, distortion";
    const sdPrompt = basePrompt;
    const sdNegativePrompt = "shadow, dark patch, uneven lighting, artifact, blur, distortion";

    if (false && kieApiKey) {
      const imageUrl = await uploadToKie(imageDataUrl, kieApiKey);
      const maskToUse = kieMaskDataUrl || maskDataUrl;
      let maskUrl = "";
      if (maskToUse) {
        maskUrl = await uploadToKie(maskToUse, kieApiKey);
      }
      const outputUrl = await generate4oImage(kieApiKey, imageUrl, maskUrl, prompt, scene);
      return buildResponse({ output_url: outputUrl }, 200, guestCookieValue);
    }

    const model = process.env.REPLICATE_SHADOW_MODEL_RUN || "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3";
    const replicate = getReplicateClient();
    const selectedVariant = resolveModelVariant(quality, mode);
    const allowLamaOomFallback = (process.env.REPLICATE_SHADOW_FALLBACK_ON_OOM || "1") !== "0";
    const lamaMaxSideDefault = Math.max(512, Number(process.env.REPLICATE_SHADOW_LAMA_MAX_SIDE || "1600") || 1600);
    const lamaMaxSideText = Math.max(512, Number(process.env.REPLICATE_SHADOW_LAMA_MAX_SIDE_TEXT || "2048") || 2048);
    const lamaMaxSide = mode === "text" ? lamaMaxSideText : lamaMaxSideDefault;
    const maskInput = maskDataUrl || kieMaskDataUrl;
    let modelToRun = model;
    let input: Record<string, any>;
    const sdSteps = Math.max(1, Math.min(80, Number(process.env.REPLICATE_SHADOW_SD_STEPS || "30") || 30));
    const sdGuidance = Math.max(0, Math.min(20, Number(process.env.REPLICATE_SHADOW_SD_GUIDANCE_SCALE || "7.5") || 7.5));
    const sdStrength = Math.max(0.01, Math.min(1, Number(process.env.REPLICATE_SHADOW_SD_STRENGTH || "0.78") || 0.78));
    const sdTwoPass = (process.env.REPLICATE_SHADOW_SD_TWO_PASS || "1") !== "0";
    const sdPass1Steps = Math.max(1, Math.min(80, Number(process.env.REPLICATE_SHADOW_SD_PASS1_STEPS || "24") || 24));
    const sdPass1Guidance = Math.max(0, Math.min(20, Number(process.env.REPLICATE_SHADOW_SD_PASS1_GUIDANCE_SCALE || "4.8") || 4.8));
    const sdPass1Strength = Math.max(0.01, Math.min(1, Number(process.env.REPLICATE_SHADOW_SD_PASS1_STRENGTH || "0.72") || 0.72));
    const swinirModel = process.env.REPLICATE_HD_MODEL_RUN_SWINIR || "jingyunliang/swinir:660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a";
    const swinirJpeg = Number.parseInt(String(process.env.REPLICATE_HD_SWINIR_JPEG ?? "40"), 10);
    const swinirNoise = Number.parseInt(String(process.env.REPLICATE_HD_SWINIR_NOISE ?? "15"), 10);
    const swinirJpegInput = Number.isFinite(swinirJpeg) ? swinirJpeg : 40;
    const swinirNoiseInput = Number.isFinite(swinirNoise) ? swinirNoise : 15;
    const swinirTaskType = process.env.REPLICATE_HD_SWINIR_TASK_TYPE || "Real-World Image Super-Resolution-Large";
    const isTextSd = mode === "text" && selectedVariant === "sd_inpaint";
    /** SD 1.x inpaint on Replicate often fails (Prediction interrupted / PA) on multi‑MP inputs; cap long edge like LaMa. */
    const sdMaxSide = Math.max(512, Number(process.env.REPLICATE_SHADOW_SD_MAX_SIDE || "1024") || 1024);
    /** Text mode: two SD runs double timeout/OOM risk; default single pass unless env enables. */
    const sdTextTwoPass = (process.env.REPLICATE_SHADOW_SD_TEXT_TWO_PASS || "0") === "1";
    const sdInput = {
      prompt: sdPrompt,
      negative_prompt: sdNegativePrompt,
      image: imageDataUrl,
      mask: maskInput,
      num_inference_steps: isTextSd
        ? Math.max(1, Math.min(80, Number(process.env.REPLICATE_SHADOW_SD_TEXT_STEPS || "34") || 34))
        : sdSteps,
      guidance_scale: isTextSd
        ? Math.max(0, Math.min(20, Number(process.env.REPLICATE_SHADOW_SD_TEXT_GUIDANCE_SCALE || "6.8") || 6.8))
        : sdGuidance,
      strength: isTextSd
        ? Math.max(0.01, Math.min(1, Number(process.env.REPLICATE_SHADOW_SD_TEXT_STRENGTH || "0.84") || 0.84))
        : sdStrength
    };

    if (selectedVariant === "lama") {
      if (!resizedForLama) {
        return buildResponse({
          need_client_resize: true,
          maxSide: lamaMaxSide,
          status: 200
        }, 200, guestCookieValue);
      }
      modelToRun = process.env.REPLICATE_SHADOW_MODEL_RUN_LAMA || "allenhooo/lama";
      input = { image: imageDataUrl, mask: maskInput };
    } else {
      if (!upscaleOnly && !resizedForLama && imageWidth > 0 && imageHeight > 0) {
        const longSide = Math.max(imageWidth, imageHeight);
        if (longSide > sdMaxSide) {
          return buildResponse(
            { need_client_resize: true, maxSide: sdMaxSide, status: 200 },
            200,
            guestCookieValue
          );
        }
      }
      input = sdInput;
    }

    if (selectedVariant !== "sd_inpaint" && !modelToRun.includes(":")) {
      const token = process.env.REPLICATE_API_TOKEN;
      if (!token) {
        return buildResponse({ msg: "Missing REPLICATE_API_TOKEN.", status: 500 }, 500, guestCookieValue);
      }
      try {
        const modelInfoRes = await fetch(`https://api.replicate.com/v1/models/${modelToRun}`, {
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (modelInfoRes.ok) {
          const modelInfo = await modelInfoRes.json();
          const latestVersionId = modelInfo?.latest_version?.id;
          if (latestVersionId) {
            modelToRun = `${modelToRun}:${latestVersionId}`;
          }
        }
      } catch (resolveErr) {
        console.warn("Failed to resolve LaMa model version, fallback to configured slug.", resolveErr);
      }
    }

    const imageUrlToStore = imageDataUrl.length > 60000 ? imageDataUrl.slice(0, 60000) : imageDataUrl;
    const imageInsertRes = await db.query("insert into images(user_id,url,width,height) values($1,$2,$3,$4)", [
      userContext.userId,
      imageUrlToStore,
      imageWidth,
      imageHeight
    ]);
    let imageId = Number(imageInsertRes.insertId || 0);
    if (!imageId) {
      const imageRow = await db.query("select id from images where user_id=$1 order by id desc limit 1", [userContext.userId]);
      imageId = Number(imageRow.rows?.[0]?.id || 0);
    }

    const jobInsertRes = await db.query(
      "insert into jobs(user_id,image_id,mode,status,credit_cost,is_hd) values($1,$2,$3,$4,$5,$6)",
      [userContext.userId, imageId, upscaleOnly ? "standard" : quality, "pending", creditCost, upscaleOnly ? true : isHd]
    );
    jobId = Number(jobInsertRes.insertId || 0);
    if (!jobId) {
      const jobRow = await db.query("select id from jobs where user_id=$1 order by id desc limit 1", [userContext.userId]);
      jobId = Number(jobRow.rows?.[0]?.id || 0);
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const isRateLimitError = (errText: string) => {
      return errText.includes("status 429") || errText.includes('"status":429') || errText.includes("Too Many Requests") || errText.includes("throttled");
    };
    const parseRetryAfterMs = (errText: string) => {
      const retrySec = Number(errText.match(/"retry_after"\s*:\s*(\d+)/)?.[1] || "1");
      return Math.max(1000, retrySec * 1000);
    };
    const runReplicateWithRetry = async (runInput: Record<string, any>, maxAttempts = 3, runModel = modelToRun) => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          return await replicate.run(runModel as any, { input: runInput });
        } catch (err) {
          const errText = String(err || "");
          if (!isRateLimitError(errText) || attempt === maxAttempts - 1) {
            throw err;
          }
          const waitMs = parseRetryAfterMs(errText) + attempt * 600;
          await sleep(waitMs);
        }
      }
      throw new Error("Replicate retry failed.");
    };

    if (upscaleOnly) {
      const hdOutput = await runReplicateWithRetry({
        image: imageDataUrl,
        jpeg: swinirJpegInput,
        noise: swinirNoiseInput,
        task_type: swinirTaskType
      }, 3, swinirModel);
      const hdOutputUrl = await resolveOutputUrl(hdOutput);
      if (!hdOutputUrl) {
        throw new Error("HD upscale returned empty output.");
      }
      await db.query("insert into results(job_id,image_url,resolution) values($1,$2,$3)", [
        jobId,
        hdOutputUrl,
        "hd"
      ]);
      await db.query("update jobs set status=$1,updated_at=now() where id=$2", ["success", jobId]);
      if (creditCost > 0) {
        await db.query("update credits set balance=balance-$1,updated_at=now() where user_id=$2", [creditCost, userContext.userId]);
      }
      await db.query("insert into credit_transactions(user_id,amount,type,reference_id) values($1,$2,$3,$4)", [
        userContext.userId,
        -creditCost,
        creditCost > 0 ? "consume_hd" : "consume_hd_pro",
        jobId
      ]);
      const creditsAfterRes = await db.query("select balance from credits where user_id=$1 limit 1", [userContext.userId]);
      const creditsAfter = Number(creditsAfterRes.rows?.[0]?.balance || 0);
      return buildResponse({
        output_url: hdOutputUrl,
        credits_remaining: creditsAfter,
        free_remaining: 0
      }, 200, guestCookieValue);
    }

    let output;
    try {
      if (selectedVariant === "sd_inpaint" && sdTwoPass && (!isTextSd || sdTextTwoPass)) {
        const pass1Input = {
          ...sdInput,
          num_inference_steps: sdPass1Steps,
          guidance_scale: sdPass1Guidance,
          strength: sdPass1Strength
        };
        const pass1Output = await runReplicateWithRetry(pass1Input);
        const pass1Url = Array.isArray(pass1Output) ? pass1Output[0] : pass1Output;
        if (!pass1Url) {
          throw new Error("Pass1 returned empty output.");
        }
        const pass2Input = {
          ...sdInput,
          image: pass1Url,
          num_inference_steps: sdSteps,
          guidance_scale: sdGuidance,
          strength: sdStrength
        };
        try {
          output = await runReplicateWithRetry(pass2Input);
        } catch (pass2Err) {
          const pass2Text = String(pass2Err || "");
          if (isRateLimitError(pass2Text)) {
            output = pass1Output;
          } else {
            throw pass2Err;
          }
        }
      } else {
        output = await runReplicateWithRetry(input);
      }
    } catch (runErr) {
      const errText = String(runErr || "");
      const isLamaOom = selectedVariant === "lama" && (errText.includes("CUDA out of memory") || errText.includes("out of memory"));
      if (selectedVariant === "lama" && String(runErr).includes("could not be found") && !modelToRun.includes(":")) {
        return buildResponse({
          msg: "LaMa model slug not found. Set REPLICATE_SHADOW_MODEL_RUN_LAMA to a versioned id like owner/model:version.",
          error: String(runErr),
          status: 500
        }, 500, guestCookieValue);
      }
      if (isLamaOom && allowLamaOomFallback) {
        output = await runReplicateWithRetry(sdInput);
      } else {
        throw runErr;
      }
    }

    const outputUrl = await resolveOutputUrl(output);
    if (!outputUrl) {
      throw new Error("Model returned empty output.");
    }
    let finalOutputUrl = outputUrl;
    if (quality === "high_quality") {
      const swinirOut = await runReplicateWithRetry(
        {
          image: outputUrl,
          jpeg: swinirJpegInput,
          noise: swinirNoiseInput,
          task_type: swinirTaskType
        },
        3,
        swinirModel
      );
      const enhancedUrl = await resolveOutputUrl(swinirOut);
      if (!enhancedUrl) {
        throw new Error("High quality enhance (SwinIR) returned empty output.");
      }
      finalOutputUrl = enhancedUrl;
    }

    await db.query("insert into results(job_id,image_url,resolution) values($1,$2,$3)", [
      jobId,
      finalOutputUrl,
      isHd || quality === "high_quality" ? "hd" : "standard"
    ]);
    await db.query("update jobs set status=$1,updated_at=now() where id=$2", ["success", jobId]);

    if (userContext.isFreeTier) {
      await increaseTodayUsage(userContext.userId);
      await db.query("insert into credit_transactions(user_id,amount,type,reference_id) values($1,$2,$3,$4)", [
        userContext.userId,
        0,
        "free_daily",
        jobId
      ]);
      const usageAfter = await getTodayUsage(userContext.userId);
      return buildResponse({
        output_url: finalOutputUrl,
        credits_remaining: 0,
        free_remaining: Math.max(0, FREE_DAILY_LIMIT - usageAfter.usedCount)
      }, 200, guestCookieValue);
    }

    await db.query("update credits set balance=balance-$1,updated_at=now() where user_id=$2", [creditCost, userContext.userId]);
    if (quality === "high_quality") {
      await db.query("insert into credit_transactions(user_id,amount,type,reference_id) values($1,$2,$3,$4)", [
        userContext.userId,
        -creditCost,
        "consume_pro",
        jobId
      ]);
    } else {
      await db.query("insert into credit_transactions(user_id,amount,type,reference_id) values($1,$2,$3,$4)", [
        userContext.userId,
        -1,
        "consume_standard",
        jobId
      ]);
      if (isHd) {
        await db.query("insert into credit_transactions(user_id,amount,type,reference_id) values($1,$2,$3,$4)", [
          userContext.userId,
          -1,
          "consume_hd",
          jobId
        ]);
      }
    }

    const creditsAfterRes = await db.query("select balance from credits where user_id=$1 limit 1", [userContext.userId]);
    const creditsAfter = Number(creditsAfterRes.rows?.[0]?.balance || 0);
    return buildResponse({
      output_url: finalOutputUrl,
      credits_remaining: creditsAfter,
      free_remaining: 0
    }, 200, guestCookieValue);
  } catch (err) {
    if (jobId > 0) {
      try {
        await db.query("update jobs set status=$1,updated_at=now() where id=$2", ["failed", jobId]);
      } catch (updateErr) {
        console.error("Failed to update job status:", updateErr);
      }
    }
    console.error("AI refine failed:", err);
    const loc = resolveAiErrorLocale(localeHint);
    const userMsg = getUserFacingAiErrorMessage(String(err), loc);
    return buildResponse({ msg: userMsg, status: 500 }, 500, guestCookieValue);
  }
}
