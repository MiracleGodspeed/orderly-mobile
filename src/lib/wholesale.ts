/**
 * Wholesale policy shape + validation for the vendor app. Mirrors the
 * server contract in `orderly.domain/Services/Helpers/WholesaleEngine.cs`
 * and the web's `storefront/utils/wholesale.ts`. The mobile app is the
 * vendor-management surface (no customer cart), so this only needs the
 * types + a validation/normalization pass for the editor — the server
 * evaluates the discount authoritatively at checkout.
 */

export const MAX_WHOLESALE_PERCENT = 90;

export type WholesaleConditionType =
  | "minCartAmount"
  | "minTotalQty"
  | "minProductQty";

export interface WholesaleCondition {
  type: WholesaleConditionType;
  value: number;
  /** Only set for `minProductQty`. */
  productId?: string | null;
}

export interface WholesaleRule {
  id: string;
  name: string;
  enabled: boolean;
  discountType: "percent" | "flat";
  discountValue: number;
  conditions: WholesaleCondition[];
}

export function newRuleId(): string {
  // No crypto.randomUUID guarantee across RN engines — cheap unique id.
  return `wr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function blankRule(): WholesaleRule {
  return {
    id: newRuleId(),
    name: "",
    enabled: true,
    discountType: "percent",
    discountValue: 10,
    conditions: [{ type: "minCartAmount", value: 30000 }],
  };
}

/** Returns a human error string, or null when the rules are all valid. */
export function validateRules(rules: WholesaleRule[]): string | null {
  for (const rule of rules) {
    if (!rule.name?.trim()) return "Every policy needs a name.";
    if (!rule.conditions?.length)
      return `"${rule.name}" needs at least one condition.`;
    if (!(rule.discountValue > 0)) return `Set a discount for "${rule.name}".`;
    if (
      rule.discountType === "percent" &&
      rule.discountValue > MAX_WHOLESALE_PERCENT
    )
      return `Percentage for "${rule.name}" can't exceed ${MAX_WHOLESALE_PERCENT}%.`;
    for (const c of rule.conditions) {
      if (!(c.value > 0))
        return `Condition values in "${rule.name}" must be greater than zero.`;
      if (c.type === "minProductQty" && !c.productId)
        return `Pick a product for the per-product condition in "${rule.name}".`;
    }
  }
  return null;
}

export const CONDITION_LABEL: Record<WholesaleConditionType, string> = {
  minCartAmount: "Minimum cart total",
  minTotalQty: "Minimum total quantity",
  minProductQty: "Minimum quantity of a product",
};

export function formatNaira(amount: number): string {
  return `₦${Math.round(amount || 0).toLocaleString("en-NG")}`;
}

export function conditionSummary(
  c: WholesaleCondition,
  productName?: string,
): string {
  if (c.type === "minCartAmount") return `Cart ≥ ${formatNaira(c.value)}`;
  if (c.type === "minTotalQty") return `${c.value}+ items total`;
  return `${c.value}+ of ${productName ?? "a product"}`;
}
