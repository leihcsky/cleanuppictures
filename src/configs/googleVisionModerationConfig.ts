import fs from "fs";
import path from "path";

/**
 * Path to the Google Cloud service account JSON key used for Vision API (Safe Search).
 * Relative paths are resolved from `process.cwd()` (project root when running Next.js).
 *
 * Example: secrets/google-vision-service-account.json
 */
export function getGoogleVisionServiceAccountJsonPath(): string {
  return String(process.env.GOOGLE_VISION_SERVICE_ACCOUNT_JSON_PATH || "").trim();
}

export function resolveGoogleVisionCredentialsPath(): string | null {
  const raw = getGoogleVisionServiceAccountJsonPath();
  if (!raw) return null;
  const resolved = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  try {
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  } catch {
    return null;
  }
  return resolved;
}

export type VisionLikelihoodName = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";

const LIKELIHOOD_RANK: Record<string, number> = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 1,
  UNLIKELY: 2,
  POSSIBLE: 3,
  LIKELY: 4,
  VERY_LIKELY: 5
};

/** Minimum bucket that triggers a block for `adult` or `racy` (inclusive). Default: LIKELY. */
export function getVisionModerationMinLikelihood(): VisionLikelihoodName {
  const raw = String(process.env.IMAGE_MODERATION_VISION_MIN_LIKELIHOOD || "LIKELY").trim().toUpperCase();
  if (raw === "VERY_LIKELY" || raw === "LIKELY" || raw === "POSSIBLE") {
    return raw as VisionLikelihoodName;
  }
  return "LIKELY";
}

export function likelihoodMeetsOrExceeds(value: string | undefined, min: VisionLikelihoodName): boolean {
  if (!value) return false;
  const v = LIKELIHOOD_RANK[value] ?? 0;
  const m = LIKELIHOOD_RANK[min] ?? LIKELIHOOD_RANK.LIKELY;
  return v >= m;
}
