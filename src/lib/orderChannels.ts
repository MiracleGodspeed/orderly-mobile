import type { OrderChannel } from "../api/vendor/vendor.types";

export type IoniconName = React.ComponentProps<
  typeof import("@expo/vector-icons/Ionicons").default
>["name"];

export interface ChannelMeta {
  key: OrderChannel;
  label: string;
  /** Short label for tight badge contexts (e.g. order rows). */
  short: string;
  icon: IoniconName;
  /** Soft tinted background — used for badge/chip surfaces. */
  bg: string;
  /** Stronger accent for icons + bold text on the badge. */
  accent: string;
}

/**
 * Single source of truth for the channel picker, the row badges, and
 * the Order Details metadata strip. Keeping this in one place means
 * adding a new channel (TikTok, Snapchat, etc) is a one-line change
 * that propagates everywhere.
 */
export const CHANNELS: ChannelMeta[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    short: "WhatsApp",
    icon: "logo-whatsapp",
    bg: "#dcfce7",
    accent: "#16a34a",
  },
  {
    key: "instagram",
    label: "Instagram",
    short: "Instagram",
    icon: "logo-instagram",
    bg: "#fce7f3",
    accent: "#db2777",
  },
  {
    key: "facebook",
    label: "Facebook",
    short: "Facebook",
    icon: "logo-facebook",
    bg: "#dbeafe",
    accent: "#1d4ed8",
  },
  {
    key: "walkin",
    label: "Walk-in",
    short: "Walk-in",
    icon: "storefront-outline",
    bg: "#f1f5f9",
    accent: "#475569",
  },
  {
    key: "phone",
    label: "Phone call",
    short: "Phone",
    icon: "call-outline",
    bg: "#dbeafe",
    accent: "#2563eb",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    short: "Twitter",
    icon: "logo-twitter",
    bg: "#e0f2fe",
    accent: "#0ea5e9",
  },
  {
    key: "tiktok",
    label: "TikTok",
    short: "TikTok",
    icon: "musical-notes-outline",
    bg: "#fae8ff",
    accent: "#a21caf",
  },
  {
    key: "other",
    label: "Other",
    short: "Other",
    icon: "ellipsis-horizontal",
    bg: "#e2e8f0",
    accent: "#64748b",
  },
];

const CHANNEL_BY_KEY: Record<string, ChannelMeta> = CHANNELS.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  {} as Record<string, ChannelMeta>
);

/** Resolves a raw channel string from the API to its meta entry.
 *  Returns null when the order has no channel (organic storefront
 *  order) so callers can render nothing rather than a placeholder. */
export function resolveChannel(
  raw: string | null | undefined
): ChannelMeta | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  return CHANNEL_BY_KEY[key] ?? CHANNEL_BY_KEY.other;
}
