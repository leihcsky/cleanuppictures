import { createCreem } from "creem_io";

/** Same rules as createCreem: sandbox in non-production unless explicitly forced. */
export function getCreemTestMode(): boolean {
  const raw = String(process.env.CREEM_TEST_MODE || "").trim().toLowerCase();
  // Explicit override has highest priority:
  // - "1"/"true" => test
  // - "0"/"false" => production
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  // Backward-compatible default: dev uses test unless explicitly overridden.
  return process.env.NODE_ENV !== "production";
}

/**
 * Base URL for raw REST calls only.
 * Important: `createCreem` / `getCreemClient()` does **not** read `CREEM_API_BASE` — it always uses
 * test-api vs api from `getCreemTestMode()` only. Prefer `getCreemClient()` for Creem API so cancel/checkout match.
 */
export function getCreemApiBaseUrl(): string {
  const fromEnv = (process.env.CREEM_API_BASE || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return getCreemTestMode() ? "https://test-api.creem.io" : "https://api.creem.io";
}

export function getCreemClient() {
  const apiKey = String(process.env.CREEM_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Missing CREEM_API_KEY");
  }
  return createCreem({
    apiKey,
    testMode: getCreemTestMode()
  });
}

