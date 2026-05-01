/**
 * Canonical list of feature flag keys recognised by the platform.
 * Mirror of `orderly-api/orderly.domain/Helpers/FeatureKeys.cs` —
 * keep both in sync.
 *
 * Add a new feature here AND in the C# constants, then append the key to
 * the `FeatureKeys` JSON array on whichever subscription plan(s) should
 * grant it. No schema migrations required.
 */
export const FEATURES = {
  PRODUCTS_LOW_STOCK: "products.low_stock",
  PRODUCTS_SECONDARY_IMAGE: "products.secondary_image",
  PRODUCTS_VARIANTS: "products.variants",
  PRODUCTS_CATEGORIES: "products.categories",
  ANALYTICS_VISITS: "analytics.visits",
  CUSTOMERS_TAGS: "customers.tags",
  STORE_CUSTOM_DOMAIN: "store.custom_domain",
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

/**
 * Friendly metadata for paywall/upgrade UI. The hook returns the key; the
 * gate component can look up a label/description here without hardcoding
 * copy at every call site.
 */
export const FEATURE_META: Record<
  FeatureKey,
  { label: string; description: string }
> = {
  [FEATURES.PRODUCTS_LOW_STOCK]: {
    label: "Low-stock filter",
    description:
      "See every product running low on inventory across your whole catalog in one tap.",
  },
  [FEATURES.PRODUCTS_SECONDARY_IMAGE]: {
    label: "Multiple product photos",
    description:
      "Show shoppers more than one photo per product — different angles, details, and use cases drive higher conversion.",
  },
  [FEATURES.PRODUCTS_VARIANTS]: {
    label: "Product variants",
    description:
      "Offer your products in multiple sizes and colors with unique pricing per combination — perfect for clothing, accessories, and tiered offerings.",
  },
  [FEATURES.PRODUCTS_CATEGORIES]: {
    label: "Custom categories",
    description:
      "Organize your catalog with your own categories so shoppers can find exactly what they're looking for.",
  },
  [FEATURES.ANALYTICS_VISITS]: {
    label: "Visitor analytics",
    description: "Track how many shoppers visit your storefront each day.",
  },
  [FEATURES.CUSTOMERS_TAGS]: {
    label: "Customer tags",
    description:
      "Segment your customers with tags for targeted campaigns and retention.",
  },
  [FEATURES.STORE_CUSTOM_DOMAIN]: {
    label: "Custom domain",
    description: "Run your storefront on your own branded domain name.",
  },
};
