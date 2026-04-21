import { GoogleAuth } from "google-auth-library";
import sharp from "sharp";
import {
  getVisionModerationMaxBytes,
  getVisionModerationResizeJpegQuality,
  getVisionModerationResizeMaxSide,
  getVisionModerationMinLikelihood,
  likelihoodMeetsOrExceeds,
  resolveGoogleVisionCredentialsPath
} from "~/configs/googleVisionModerationConfig";

const VISION_ANNOTATE_URL = "https://vision.googleapis.com/v1/images:annotate";

export type ModerationGateResult =
  | { allowed: true; skipped?: true; warning?: string }
  | { allowed: false; flagged: boolean; message?: string };

/** Optional correlation for logs (no image data). */
export type ModerationLogMeta = {
  traceId?: string;
  stage?: string;
};

function moderationLogLine(event: string, meta: ModerationLogMeta | undefined, fields: Record<string, unknown>) {
  const base: Record<string, unknown> = { event, ...fields };
  if (meta?.traceId) base.trace_id = meta.traceId;
  if (meta?.stage) base.stage = meta.stage;
  return JSON.stringify(base);
}

function extractSafeSearchFromVisionJson(json: unknown): unknown {
  const responses = (json as { responses?: unknown[] })?.responses;
  const first = Array.isArray(responses) ? responses[0] : undefined;
  if (first && typeof first === "object" && "safeSearchAnnotation" in first) {
    return (first as { safeSearchAnnotation: unknown }).safeSearchAnnotation;
  }
  return null;
}

function moderationDisabled(): boolean {
  return String(process.env.IMAGE_MODERATION || "").trim() === "0";
}

function failOpenOnModerationError(): boolean {
  return String(process.env.IMAGE_MODERATION_FAIL_OPEN || "1").trim() !== "0";
}

function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return dataUrl.length * 0.75;
  const b64 = dataUrl.slice(comma + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

function dataUrlToBase64Content(dataUrl: string): string | null {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return null;
  return dataUrl.slice(comma + 1).replace(/\s/g, "");
}

function getDataUrlMime(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/i);
  return String(match?.[1] || "image/png").toLowerCase();
}

type PreparedModerationImage = {
  base64: string;
  estimatedBytes: number;
  transformed: boolean;
};

async function prepareVisionImageContent(dataUrl: string): Promise<PreparedModerationImage> {
  const maxBytes = getVisionModerationMaxBytes();
  const originalBase64 = dataUrlToBase64Content(dataUrl);
  if (!originalBase64) {
    throw new Error("Invalid image payload.");
  }

  const originalEstimatedBytes = estimateDataUrlBytes(dataUrl);
  if (originalEstimatedBytes <= maxBytes) {
    return { base64: originalBase64, estimatedBytes: originalEstimatedBytes, transformed: false };
  }

  const sourceMime = getDataUrlMime(dataUrl);
  const sourceBuffer = Buffer.from(originalBase64, "base64");
  const meta = await sharp(sourceBuffer).metadata();
  const srcW = Number(meta.width || 0);
  const srcH = Number(meta.height || 0);
  const srcLong = Math.max(srcW, srcH, 1);

  const baseLongSide = getVisionModerationResizeMaxSide();
  const qualityStart = getVisionModerationResizeJpegQuality();
  const qualityCandidates = [qualityStart, Math.max(70, qualityStart - 8), Math.max(62, qualityStart - 14), 56];

  for (const quality of qualityCandidates) {
    for (const scale of [1, 0.85, 0.72, 0.6]) {
      const longSide = Math.max(640, Math.floor(Math.min(baseLongSide, srcLong) * scale));
      const transformedBuffer = await sharp(sourceBuffer)
        .rotate()
        .resize({ width: longSide, height: longSide, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      const transformedBase64 = transformedBuffer.toString("base64");
      const estimatedBytes = transformedBuffer.byteLength;
      if (estimatedBytes <= maxBytes) {
        console.info(
          "[image-moderation] resized image for Vision:",
          JSON.stringify(
            {
              from: { mime: sourceMime, bytes: originalEstimatedBytes, width: srcW, height: srcH },
              to: { mime: "image/jpeg", bytes: estimatedBytes, longSide, quality },
              maxBytes
            },
            null,
            2
          )
        );
        return { base64: transformedBase64, estimatedBytes, transformed: true };
      }
    }
  }

  throw new Error(`Image is too large for safety screening after resize attempt (${originalEstimatedBytes} bytes).`);
}

let authCache: { resolvedPath: string; googleAuth: GoogleAuth } | null = null;

function getGoogleAuthForVision(resolvedPath: string): GoogleAuth {
  if (authCache?.resolvedPath === resolvedPath) {
    return authCache.googleAuth;
  }
  const googleAuth = new GoogleAuth({
    keyFile: resolvedPath,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
  });
  authCache = { resolvedPath, googleAuth };
  return googleAuth;
}

async function getVisionAccessToken(resolvedPath: string): Promise<string> {
  const auth = getGoogleAuthForVision(resolvedPath);
  const client = await auth.getClient();
  const res = await client.getAccessToken();
  const token = res?.token;
  if (!token) {
    throw new Error("Google Vision: empty access token.");
  }
  return token;
}

function safeSearchFlagsContent(minLikelihood: ReturnType<typeof getVisionModerationMinLikelihood>, ann: unknown): boolean {
  if (!ann || typeof ann !== "object") return false;
  const a = ann as { adult?: string; racy?: string };
  return (
    likelihoodMeetsOrExceeds(a.adult, minLikelihood) ||
    likelihoodMeetsOrExceeds(a.racy, minLikelihood)
  );
}

/**
 * NSFW / adult-content gate via Google Cloud Vision Safe Search Detection.
 * @see https://cloud.google.com/vision/docs/detecting-safe-search
 */
export function isImageModerationActive(): boolean {
  if (moderationDisabled()) return false;
  return Boolean(resolveGoogleVisionCredentialsPath());
}

export async function moderateImageDataUrl(
  imageDataUrl: string,
  logMeta?: ModerationLogMeta
): Promise<ModerationGateResult> {
  const approxInputBytes = estimateDataUrlBytes(imageDataUrl);
  const inputMime = getDataUrlMime(imageDataUrl);

  if (!imageDataUrl.startsWith("data:image/")) {
    console.warn("[image-moderation]", moderationLogLine("gate_invalid_payload", logMeta, { reason: "not_data_image" }));
    return { allowed: false, flagged: false, message: "Invalid image payload." };
  }
  if (moderationDisabled()) {
    console.info(
      "[image-moderation]",
      moderationLogLine("gate_skipped", logMeta, { reason: "IMAGE_MODERATION=0", approx_input_bytes: approxInputBytes })
    );
    return { allowed: true, skipped: true };
  }
  const credPath = resolveGoogleVisionCredentialsPath();
  if (!credPath) {
    console.info(
      "[image-moderation]",
      moderationLogLine("gate_skipped", logMeta, { reason: "no_vision_credentials", approx_input_bytes: approxInputBytes })
    );
    return { allowed: true, skipped: true };
  }
  let prepared: PreparedModerationImage;
  try {
    prepared = await prepareVisionImageContent(imageDataUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to prepare image for moderation.";
    console.warn(
      "[image-moderation]",
      moderationLogLine("gate_prepare_failed", logMeta, { message: msg, approx_input_bytes: approxInputBytes })
    );
    return { allowed: false, flagged: false, message: msg || "Image could not be prepared for safety screening." };
  }
  const b64 = prepared.base64;

  console.info(
    "[image-moderation]",
    moderationLogLine("gate_vision_start", logMeta, {
      input_mime: inputMime,
      approx_input_bytes: approxInputBytes,
      vision_payload_bytes: prepared.estimatedBytes,
      resized_for_vision: prepared.transformed
    })
  );

  const minLikelihood = getVisionModerationMinLikelihood();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  let res: Response;
  try {
    const token = await getVisionAccessToken(credPath);
    res = await fetch(VISION_ANNOTATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: b64 },
            features: [{ type: "SAFE_SEARCH_DETECTION", maxResults: 1 }]
          }
        ]
      }),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : "Vision request failed.";
    if (failOpenOnModerationError()) {
      console.error("[image-moderation]", moderationLogLine("vision_request_error_fail_open", logMeta, { message: msg }));
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    console.error("[image-moderation]", moderationLogLine("vision_request_error_fail_closed", logMeta, { message: msg }));
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  } finally {
    clearTimeout(timer);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    if (failOpenOnModerationError()) {
      console.error(
        "[image-moderation]",
        moderationLogLine("vision_invalid_json_fail_open", logMeta, { http_status: res.status })
      );
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    console.error(
      "[image-moderation]",
      moderationLogLine("vision_invalid_json_fail_closed", logMeta, { http_status: res.status })
    );
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  }

  const safeSearchSummary = extractSafeSearchFromVisionJson(json);
  console.info(
    "[image-moderation]",
    moderationLogLine("vision_http_response", logMeta, {
      http_status: res.status,
      vision_payload_bytes: prepared.estimatedBytes,
      resized_for_vision: prepared.transformed,
      safe_search: safeSearchSummary
    })
  );

  if (!res.ok) {
    const errMsg =
      typeof (json as { error?: { message?: string } })?.error?.message === "string"
        ? String((json as { error: { message: string } }).error.message)
        : `Vision API error (${res.status})`;
    if (failOpenOnModerationError()) {
      console.error(
        "[image-moderation]",
        moderationLogLine("vision_upstream_error_fail_open", logMeta, { http_status: res.status, message: errMsg })
      );
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    console.error(
      "[image-moderation]",
      moderationLogLine("vision_upstream_error_fail_closed", logMeta, { http_status: res.status, message: errMsg })
    );
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  }

  const responses = (json as { responses?: unknown[] })?.responses;
  const first = Array.isArray(responses) ? responses[0] : undefined;
  if (first && typeof first === "object" && "error" in first) {
    const msg =
      typeof (first as { error?: { message?: string } }).error?.message === "string"
        ? String((first as { error: { message: string } }).error.message)
        : "Vision response error.";
    if (failOpenOnModerationError()) {
      console.error("[image-moderation]", moderationLogLine("vision_per_image_error_fail_open", logMeta, { message: msg }));
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    console.error("[image-moderation]", moderationLogLine("vision_per_image_error_fail_closed", logMeta, { message: msg }));
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  }

  const ann = first && typeof first === "object" ? (first as { safeSearchAnnotation?: unknown }).safeSearchAnnotation : undefined;

  if (safeSearchFlagsContent(minLikelihood, ann)) {
    console.warn(
      "[image-moderation]",
      moderationLogLine("gate_blocked_flagged", logMeta, {
        min_likelihood: String(minLikelihood),
        safe_search: ann
      })
    );
    return { allowed: false, flagged: true, message: "This image did not pass content guidelines." };
  }
  console.info(
    "[image-moderation]",
    moderationLogLine("gate_pass", logMeta, { min_likelihood: String(minLikelihood), safe_search: ann })
  );
  return { allowed: true };
}
