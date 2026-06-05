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
  STORE_LOGO: "store.logo",
  STORE_ADVANCED_SETUP: "store.advanced_setup",
  STAFF_ACCOUNTS: "staff.accounts",
  /** Orderly AI product-description generation in the catalog form.
   *  Boolean gate — vendors on plans without this key see the AI
   *  suggestion locked behind the paywall sheet. Per-day quota is
   *  separately surfaced via `useFeatures().aiDescriptionCreditsPerDay`
   *  (mirrors the `staffLimit` shape). Mirrors backend
   *  `Features.AI_DESCRIPTIONS`. */
  AI_DESCRIPTIONS: "ai.descriptions",

  // Storefront templates — one key per template. Plans declare the
  // templates they support by listing these keys in their FeatureKeys
  // JSON column. Trial vendors resolve as Unlimited so every template
  // is selectable during trial; the backend storefront resolver falls
  // public renders back to Carte after trial for any template the
  // active plan doesn't grant.
  TEMPLATE_GALACTIC: "template.galactic",
  TEMPLATE_ATELIER: "template.atelier",
  TEMPLATE_BRIO: "template.brio",
  TEMPLATE_CARTE: "template.carte",
  TEMPLATE_RANGER: "template.ranger",
  TEMPLATE_JEWL: "template.jewl",
  TEMPLATE_SPEEDPRO: "template.speedpro",
  TEMPLATE_DA1: "template.da1",
  TEMPLATE_MG1: "template.mg1",
  TEMPLATE_GRACE: "template.grace",
  TEMPLATE_PRISM: "template.prism",
  TEMPLATE_ONYX: "template.onyx",
  TEMPLATE_LUME: "template.lume",
} as const;

/**
 * Template id → feature key. Mirrors the web `TEMPLATE_FEATURE_KEY_BY_ID`
 * and the C# `Features.TemplateFeatureKeyById`.
 */
export const TEMPLATE_FEATURE_KEY_BY_ID: Record<string, FeatureKey> = {
  galactic: "template.galactic",
  atelier: "template.atelier",
  brio: "template.brio",
  carte: "template.carte",
  ranger: "template.ranger",
  jewl: "template.jewl",
  speedpro: "template.speedpro",
  da1: "template.da1",
  mg1: "template.mg1",
  grace: "template.grace",
  prism: "template.prism",
  onyx: "template.onyx",
  lume: "template.lume",
};

/** Fallback template id rendered when a non-trial vendor's chosen
 *  template isn't allowed by their plan. Mirrors backend
 *  `Features.FALLBACK_TEMPLATE_ID`. */
export const FALLBACK_TEMPLATE_ID = "carte";

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

/**
 * Friendly metadata for paywall/upgrade UI. The hook returns the key; the
 * gate component can look up a label/description here without hardcoding
 * copy at every call site.
 *
 * `bullets` and `beforeAfter` are optional richer surfaces for features
 * where vendors might not understand what they're missing — concrete
 * value props + a visual contrast (e.g. ugly URL → clean URL). Left
 * undefined the paywall falls back to the plain description.
 */
export interface FeatureMeta {
  label: string;
  description: string;
  bullets?: string[];
  beforeAfter?: { beforeLabel: string; before: string; afterLabel: string; after: string };
}

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
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
    label: "Your own web address",
    description:
      "Stop using the long Orderly link and run your shop on a clean, professional address customers can actually remember — like yourbusiness.com.",
    bullets: [
      "Look professional next to a yourbusiness.com address",
      "Easier for customers to type, share, and remember",
      "Stronger brand on flyers, business cards, and Instagram bio"
      // "Build trust — looks like an established, legit shop",
    ],
    beforeAfter: {
      beforeLabel: "Before",
      before: "yourstore.orderlystores.com",
      afterLabel: "After",
      after: "www.yourbusiness.com",
    },
  },
  [FEATURES.STORE_LOGO]: {
    label: "Custom store logo",
    description:
      "Upload your own brand mark so customers see your logo across your storefront, receipts, and order updates — instead of a generic placeholder.",
    bullets: [
      "Build instant brand recognition on every page of your store",
      "Look established next to a polished header logo",
      "Show up on order confirmations, invoices, and receipts",
      "Replace the default placeholder customers currently see",
    ],
  },
  [FEATURES.STORE_ADVANCED_SETUP]: {
    label: "Advanced storefront setup",
    description:
      "Take full control of your storefront's premium surfaces — featured products, customer reviews, popular categories, promo bars, and social links that turn browsers into buyers.",
    bullets: [
      "Spotlight your best sellers with a curated Featured Products rail",
      "Show off real customer reviews to build instant trust",
      "Pin the categories shoppers reach for first",
      "Promo bar to announce sales, free delivery, or new arrivals",
      "Link your Instagram, WhatsApp, and other socials right on the storefront",
    ],
  },
  [FEATURES.STAFF_ACCOUNTS]: {
    label: "Staff accounts",
    description:
      "Bring your team into the app. Invite cashiers, stockkeepers, and managers with their own logins and granular permissions — no more sharing one password.",
    bullets: [
      "Each staff member gets their own login — no shared passwords",
      "Pick what they can see and do — orders, catalog, customers",
      "Suspend or remove access in one tap when someone leaves",
      "See who confirmed which order in your audit trail",
    ],
  },
  [FEATURES.AI_DESCRIPTIONS]: {
    label: "Orderly AI descriptions",
    description:
      "Skip the writer's block. Tap once and Orderly AI drafts a clean, customer-ready description for any product from just its name — saving you minutes on every catalog add.",
    bullets: [
      "Turn a product name into a polished description in seconds",
      "Sounds natural, not robotic — written for shoppers, not search engines",
      "Edit before saving, or save as-is when you're in a hurry",
      "Daily credits refresh every morning so it's there when you need it",
    ],
  },

  // Template paywall entries. Generic across templates because the
  // *distinguishing detail* (which plan + price) comes from the
  // plan-list fetch surfaced via the trial info sheet.
  [FEATURES.TEMPLATE_GALACTIC]: templatePaywallMeta("Galactic"),
  [FEATURES.TEMPLATE_ATELIER]: templatePaywallMeta("Atelier"),
  [FEATURES.TEMPLATE_BRIO]: templatePaywallMeta("Brio"),
  [FEATURES.TEMPLATE_CARTE]: templatePaywallMeta("Carte"),
  [FEATURES.TEMPLATE_RANGER]: templatePaywallMeta("Shop Ranger"),
  [FEATURES.TEMPLATE_JEWL]: templatePaywallMeta("Jeweler-Esque"),
  [FEATURES.TEMPLATE_SPEEDPRO]: templatePaywallMeta("Speed-Pro"),
  [FEATURES.TEMPLATE_DA1]: templatePaywallMeta("Fresh Cart"),
  [FEATURES.TEMPLATE_MG1]: templatePaywallMeta("Orderly Core"),
  [FEATURES.TEMPLATE_GRACE]: templatePaywallMeta("Grace"),
  [FEATURES.TEMPLATE_PRISM]: templatePaywallMeta("Prism"),
  [FEATURES.TEMPLATE_ONYX]: templatePaywallMeta("Onyx"),
  [FEATURES.TEMPLATE_LUME]: templatePaywallMeta("Lume"),
};

function templatePaywallMeta(name: string): FeatureMeta {
  return {
    label: `${name} storefront template`,
    description:
      "This storefront template is part of a higher plan. Upgrade to apply it to your storefront.",
  };
}
