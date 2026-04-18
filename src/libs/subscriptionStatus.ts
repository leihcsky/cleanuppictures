/** Matches eligibility used in billing and remove-shadow API. */
export function isActiveSubscriptionStatus(status: unknown): boolean {
  const s = String(status || "").toLowerCase();
  return s === "active" || s === "trialing";
}
