/**
 * Mobile mirror of the web's `whyChooseUsIcons` registry. Same set
 * of `name` keys — different glyph source (Ionicons via @expo/vector-icons
 * instead of lucide-react). A vendor who picks "shield" in the web
 * editor sees an Ionicons shield-checkmark glyph in the mobile
 * preview, and vice versa.
 *
 * Keep this list in lock-step with the web registry at
 *   orderly-v2-nextjs/src/lib/whyChooseUsIcons.tsx
 *
 * Names are persisted on storefront records via
 * `WhyChoosePillar.iconName`; renaming or removing entries here
 * would break already-saved pillars on both platforms.
 */

import type { ComponentProps } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

export interface WhyChooseUsIconOption {
  /** Persisted identifier. Kebab-case. Must match the web entry. */
  name: string;
  /** Human-readable label shown in the mobile picker. */
  label: string;
  /** Ionicons glyph name. */
  ionicon: IoniconsName;
}

export const WHY_CHOOSE_US_ICONS: WhyChooseUsIconOption[] = [
  { name: "check", label: "Check", ionicon: "checkmark-outline" },
  { name: "shield", label: "Shield", ionicon: "shield-checkmark-outline" },
  { name: "truck", label: "Shipping", ionicon: "car-outline" },
  { name: "sparkles", label: "Quality", ionicon: "sparkles-outline" },
  { name: "star", label: "Star", ionicon: "star-outline" },
  { name: "heart", label: "Care", ionicon: "heart-outline" },
  { name: "award", label: "Award", ionicon: "ribbon-outline" },
  { name: "clock", label: "Fast", ionicon: "time-outline" },
  { name: "leaf", label: "Natural", ionicon: "leaf-outline" },
  { name: "package", label: "Package", ionicon: "cube-outline" },
  { name: "credit-card", label: "Payment", ionicon: "card-outline" },
  { name: "rotate", label: "Returns", ionicon: "refresh-outline" },
  { name: "headphones", label: "Support", ionicon: "headset-outline" },
  { name: "globe", label: "Worldwide", ionicon: "earth-outline" },
  { name: "gem", label: "Premium", ionicon: "diamond-outline" },
  { name: "zap", label: "Fast", ionicon: "flash-outline" },
  { name: "lock", label: "Secure", ionicon: "lock-closed-outline" },
  { name: "gift", label: "Special", ionicon: "gift-outline" },
];

const DEFAULT_ICON: IoniconsName = "checkmark-outline";

/**
 * Resolves an icon name (or null/unknown) to the Ionicons glyph
 * name. Always returns SOMETHING — falls back to `checkmark-outline`
 * so the card never renders an empty icon slot.
 */
export function resolveWhyChooseUsIcon(name: string | null | undefined): IoniconsName {
  if (!name) return DEFAULT_ICON;
  const match = WHY_CHOOSE_US_ICONS.find((o) => o.name === name);
  return (match ?? { ionicon: DEFAULT_ICON }).ionicon;
}
