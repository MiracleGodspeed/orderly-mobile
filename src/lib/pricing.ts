export type FeeBearer = "vendor" | "customer" | "included";

/**
 * Returns `price * (1 - discountPercent/100)` clamped sensibly.
 * Mirrors the web's `applyDiscount` helper one-for-one.
 */
export function applyDiscount(price: number, discountPercent: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return price;
  if (discountPercent >= 100) return 0;
  const discountAmount = (discountPercent / 100) * price;
  return Math.round((price - discountAmount) * 100) / 100;
}

/**
 * Platform fee for a product priced `productPrice`. Mirrors the web's
 * `calculatePlatformCharge` exactly so the price a vendor sees on mobile
 * matches what the customer pays via the storefront.
 *
 * Composition:
 *   - Orderly take: 1% (capped at ₦2,000)
 *   - Paystack: 1.5% + ₦100 flat for orders ≥ ₦2,500 (capped at ₦2,000)
 */
export function calculatePlatformCharge(productPrice: number): number {
  if (!Number.isFinite(productPrice) || productPrice <= 0) return 0;

  const orderlyPercent = 0.01;
  const paystackPercent = 0.015;
  const PAYSTACK_FLAT = 100;
  const feeCap = 2000;
  const orderlyCap = 2000;

  let orderlyShare = productPrice * orderlyPercent;
  if (orderlyShare > orderlyCap) orderlyShare = orderlyCap;

  const flatFee = productPrice >= 2500 ? PAYSTACK_FLAT : 0;

  let guessTotal = productPrice + orderlyShare + flatFee;
  let paystackAmount = 0;

  for (let i = 0; i < 20; i++) {
    const percentFee = guessTotal * paystackPercent;
    const fee = Math.min(percentFee + flatFee, feeCap);
    const nextTotal = productPrice + orderlyShare + fee;

    if (Math.abs(nextTotal - guessTotal) < 0.01) {
      paystackAmount = fee;
      break;
    }
    guessTotal = nextTotal;
  }

  if (paystackAmount === 0) {
    paystackAmount = Math.min(guessTotal * paystackPercent + flatFee, feeCap);
  }

  return Math.ceil(orderlyShare + paystackAmount);
}

/**
 * Single source of truth for what to *display* on a product card. Combines
 * the store-wide discount and the fee-bearer setting:
 *
 *   - discount > 0 → the listed price is reduced
 *   - feeBearer === "included" → the platform fee is added on top of the
 *     resulting price (because the listed price has to absorb it)
 *
 * Returns both `original` (for strikethrough) and `final` (the headline).
 */
export function getDisplayPrice(opts: {
  price: number;
  discountPercent: number | string | null | undefined;
  feeBearer: FeeBearer | null | undefined;
}): {
  final: number;
  original: number;
  hasDiscount: boolean;
  discountPercent: number;
} {
  const base = Number(opts.price) || 0;
  const discount =
    Number(opts.discountPercent ?? 0) > 0
      ? Math.min(Number(opts.discountPercent), 99)
      : 0;
  const hasDiscount = discount > 0;
  const includesFee = opts.feeBearer === "included";

  const discountedBase = hasDiscount ? applyDiscount(base, discount) : base;

  const original = includesFee
    ? Math.ceil(base + calculatePlatformCharge(base))
    : base;
  const final = includesFee
    ? Math.ceil(discountedBase + calculatePlatformCharge(discountedBase))
    : Math.round(discountedBase);

  return { final, original, hasDiscount, discountPercent: discount };
}
