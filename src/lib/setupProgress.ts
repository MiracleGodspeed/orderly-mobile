import type { ChecklistItem } from "../../context/VendorContext";

/**
 * Computes the vendor onboarding progress percentage shown in the home card
 * AND the setup modal hero. They must agree, so this lives in one place.
 *
 * Rule (per product):
 *   - Just signing up = 25% baseline (the user has done something, give them credit)
 *   - The 3 checklist steps each contribute 25% = 75% total
 *   - All steps complete = 100%
 *
 * Anything that wants to show or compute setup progress should call this,
 * not roll its own arithmetic.
 */
export function setupProgressPct(items: ChecklistItem[]): number {
  const total = Math.max(items.length, 1);
  const completed = items.filter((i) => i.completed).length;
  const stepsContribution = (completed / total) * 75;
  return Math.round(25 + stepsContribution);
}

/** Convenience for the modal: how many of the steps are actually done. */
export function setupCompletedCount(items: ChecklistItem[]): number {
  return items.filter((i) => i.completed).length;
}
