/**
 * Subscription states that still receive Pro-style entitlements (billing, credits policy, etc.).
 * Includes Creem "Cancel at period end" (`scheduled_cancel`) until the period actually ends.
 */
export function isActiveSubscriptionStatus(status: unknown): boolean {
  const s = String(status || "").toLowerCase();
  return s === "active" || s === "trialing" || s === "scheduled_cancel";
}
