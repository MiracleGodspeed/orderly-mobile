import type { ApiSubscriptionPlan } from "../api/vendor/vendor.types";

/**
 * Minimum shape the resolver needs — just the three Apple product
 * ID fields. Callers can pass an `ApiSubscriptionPlan` or any
 * trimmed view that carries these three fields (e.g. the trimmed
 * `plan` object threaded into `PaymentMethodStep`).
 */
export interface PlanAppleIds {
  appleProductIdMonthly?: string | null;
  appleProductIdQuarterly?: string | null;
  appleProductIdYearly?: string | null;
}

/**
 * Resolves the Apple StoreKit product identifier for a given
 * (plan, cycle) pair by reading the fields the backend returns on
 * each plan record. Those fields are populated by an admin once the
 * matching Auto-Renewable Subscription products have been created
 * in App Store Connect under the "Orderly Plans" subscription group.
 *
 * Returns `null` when no product is configured — the iOS payment
 * picker hides the Apple Pay option in that case so the vendor
 * naturally falls back to the Paystack methods (Card / Bank). That
 * fallback is intentional: it lets new plans roll out without IAP
 * day-one and lets vendors paying with local rails (Verve, bank
 * transfer, mobile money) keep using Paystack.
 *
 * Prior to this refactor the mapping lived in a hardcoded
 * `APPLE_IAP_PRODUCTS` array in this file; that meant adding a plan
 * required an app rebuild. The plan record is now the single source
 * of truth — change product IDs in the DB / admin panel, no client
 * rebuild needed.
 */
export type BillingCycle = "Monthly" | "Quarterly" | "Yearly";

export function resolveAppleProductId(
  plan: PlanAppleIds | null | undefined,
  cycle: BillingCycle,
): string | null {
  if (!plan) return null;
  const raw =
    cycle === "Monthly"
      ? plan.appleProductIdMonthly
      : cycle === "Quarterly"
        ? plan.appleProductIdQuarterly
        : plan.appleProductIdYearly;
  // Treat empty string the same as missing — covers the case where
  // the DB column was written with "" instead of NULL.
  if (!raw || raw.trim().length === 0) return null;
  return raw;
}

/**
 * Convenience helper for the StoreKit `getSubscriptions({ skus })`
 * call: collects every Apple product ID surfaced across the fetched
 * plan list, deduplicated. iOS uses this at the top of the payment
 * step to pre-fetch localized prices from Apple so the Apple Pay
 * button can display the actual amount Apple will charge.
 */
export function collectAppleSkusFromPlans(
  plans: ApiSubscriptionPlan[] | null | undefined,
): string[] {
  if (!plans?.length) return [];
  const set = new Set<string>();
  for (const plan of plans) {
    for (const raw of [
      plan.appleProductIdMonthly,
      plan.appleProductIdQuarterly,
      plan.appleProductIdYearly,
    ]) {
      if (raw && raw.trim().length > 0) set.add(raw);
    }
  }
  return Array.from(set);
}
