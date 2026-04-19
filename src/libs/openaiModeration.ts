import { getModerationApiBaseUrl, getModerationApiKey, moderationModel } from "~/configs/openaiConfig";

const MAX_IMAGE_BYTES = 32 * 1024 * 1024;

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

export function isImageModerationActive(): boolean {
  if (moderationDisabled()) return false;
  return Boolean(getModerationApiKey());
}

/**
 * Calls OpenAI /v1/moderations with omni-moderation-latest (or OPENAI_MODERATION_MODEL).
 * Uses OPENAI_MODERATION_API_BASE_URL when set, otherwise https://api.openai.com/v1 (not the chat proxy URL).
 */
export async function moderateImageDataUrl(imageDataUrl: string): Promise<ModerationGateResult> {
  if (!imageDataUrl.startsWith("data:image/")) {
    return { allowed: false, flagged: false, message: "Invalid image payload." };
  }
  if (!isImageModerationActive()) {
    return { allowed: true, skipped: true };
  }
  if (estimateDataUrlBytes(imageDataUrl) > MAX_IMAGE_BYTES) {
    return { allowed: false, flagged: false, message: "Image is too large for safety screening." };
  }

  const key = getModerationApiKey();
  const base = getModerationApiBaseUrl();
  const url = `${base}/moderations`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: moderationModel,
        input: [
          {
            type: "image_url",
            image_url: { url: imageDataUrl }
          }
        ]
      }),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : "Moderation request failed.";
    if (failOpenOnModerationError()) {
      console.error("[moderation] request error (fail-open):", msg);
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
      console.error("[moderation] invalid JSON (fail-open), status", res.status);
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  }

  if (!res.ok) {
    const errMsg =
      typeof (json as { error?: { message?: string } })?.error?.message === "string"
        ? String((json as { error: { message: string } }).error.message)
        : `Moderation API error (${res.status})`;
    if (failOpenOnModerationError()) {
      console.error("[moderation] upstream error (fail-open):", res.status, errMsg);
      return { allowed: true, skipped: true, warning: "moderation_unavailable" };
    }
    return { allowed: false, flagged: false, message: "Content safety check is temporarily unavailable. Please try again." };
  }

  const results = (json as { results?: { flagged?: boolean; categories?: Record<string, boolean> }[] })?.results;
  const first = Array.isArray(results) ? results[0] : undefined;
  const flagged = Boolean(first?.flagged);
  if (flagged) {
    return { allowed: false, flagged: true, message: "This image did not pass content guidelines." };
  }
  return { allowed: true };
}
