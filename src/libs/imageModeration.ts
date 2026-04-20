import { GoogleAuth } from "google-auth-library";
import {
  getVisionModerationMinLikelihood,
  likelihoodMeetsOrExceeds,
  resolveGoogleVisionCredentialsPath
} from "~/configs/googleVisionModerationConfig";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const VISION_ANNOTATE_URL = "https://vision.googleapis.com/v1/images:annotate";

export type ModerationGateResult =
  | { allowed: true; skipped?: true; warning?: string }
  | { allowed: false; flagged: boolean; message?: string };

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

export async function moderateImageDataUrl(imageDataUrl: string): Promise<ModerationGateResult> {
  if (!imageDataUrl.startsWith("data:image/")) {
    return { allowed: false, flagged: false, message: "Invalid image payload." };
  }
  if (moderationDisabled()) {
    return { allowed: true, skipped: true };
  }
  const credPath = resolveGoogleVisionCredentialsPath();
  if (!credPath) {
    return { allowed: true, skipped: true };
  }
  if (estimateDataUrlBytes(imageDataUrl) > MAX_IMAGE_BYTES) {
    return { allowed: false, flagged: false, message: "Image is too large for safety screening." };
  }

  const b64 = dataUrlToBase64Content(imageDataUrl);
  if (!b64) {
    return { allowed: false, flagged: false, message: "Invalid image payload." };
  }

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
      console.error("[image-moderation] Vision request error (fail-open):", msg);
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  } finally {
    clearTimeout(timer);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    if (failOpenOnModerationError()) {
      console.error("[image-moderation] invalid JSON (fail-open), status", res.status);
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  }

  console.info(
    "[image-moderation] Vision API response:",
    JSON.stringify({ httpStatus: res.status, body: json }, null, 2)
  );

  if (!res.ok) {
    const errMsg =
      typeof (json as { error?: { message?: string } })?.error?.message === "string"
        ? String((json as { error: { message: string } }).error.message)
        : `Vision API error (${res.status})`;
    if (failOpenOnModerationError()) {
      console.error("[image-moderation] Vision upstream error (fail-open):", res.status, errMsg);
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
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
      console.error("[image-moderation] Vision per-image error (fail-open):", msg);
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  }

  const ann = first && typeof first === "object" ? (first as { safeSearchAnnotation?: unknown }).safeSearchAnnotation : undefined;

  if (safeSearchFlagsContent(minLikelihood, ann)) {
    return { allowed: false, flagged: true, message: "This image did not pass content guidelines." };
  }
  return { allowed: true };
}
