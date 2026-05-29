import { View, Text, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { useVendor } from "../../context/VendorContext";
import { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const IS_IOS = Platform.OS === "ios";

const haptic = () => {
  if (IS_IOS) {
    Haptics.selectionAsync().catch(() => {});
  }
};

interface PhaseTone {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  eyebrowColor: string;
  titleColor: string;
  metaColor: string;
  ctaBg: string;
  ctaText: string;
  ctaLabel: string;
  eyebrow: string;
}

// Three distinct phases with their own visual treatment so vendors
// instantly recognise severity:
//  - expiring (≤5 days):   amber, calendar, friendly heads-up
//  - grace (post-expiry):  rose, alert, warning that downtime is near
//  - expired (past grace): red, lock, urgent — service is impacted
const TONES: Record<"expiring" | "grace" | "expired", PhaseTone> = {
  expiring: {
    bg: "#fffbeb",
    border: "#fde68a",
    iconBg: "#fde68a",
    iconColor: "#b45309",
    icon: "calendar",
    eyebrowColor: "#92400e",
    titleColor: "#7c2d12",
    metaColor: "#92400e",
    ctaBg: "#d97706",
    ctaText: "#ffffff",
    ctaLabel: "Renew",
    eyebrow: "Subscription",
  },
  grace: {
    bg: "#fff1f2",
    border: "#fecdd3",
    iconBg: "#fecdd3",
    iconColor: "#be123c",
    icon: "alert-circle",
    eyebrowColor: "#9f1239",
    titleColor: "#881337",
    metaColor: "#be123c",
    ctaBg: "#e11d48",
    ctaText: "#ffffff",
    ctaLabel: "Renew now",
    eyebrow: "Grace period",
  },
  expired: {
    bg: "#fef2f2",
    border: "#fecaca",
    iconBg: "#fecaca",
    iconColor: "#991b1b",
    icon: "lock-closed",
    eyebrowColor: "#7f1d1d",
    titleColor: "#7f1d1d",
    metaColor: "#991b1b",
    ctaBg: "#dc2626",
    ctaText: "#ffffff",
    ctaLabel: "Pick a plan",
    eyebrow: "Subscription expired",
  },
};

const formatExpiringTitle = (days: number) =>
  days === 1 ? "Your plan renews tomorrow" : `Your plan renews in ${days} days`;

const formatGraceTitle = (graceDays: number) => {
  if (graceDays <= 0) return "Subscription expired";
  if (graceDays === 1) return "Last day of grace period";
  return `${graceDays} days left in grace period`;
};

/**
 * Status banner that fires on Home for vendors past the trial window.
 * Three mutually-exclusive phases (expiring / grace / expired); returns
 * null for a healthy active subscription. Pairs with `TrialBanner` —
 * one or the other can render at any time, never both.
 */
export function SubscriptionStatusBanner() {
  const navigation = useNavigation<Nav>();
  const { storeData } = useVendor();
  const sub = storeData?.storeSubscription;

  if (!sub) return null;
  // Trial banner handles its own phase — this banner is for paid /
  // post-trial lifecycle only.
  if (sub.isTrial) return null;

  const days = Math.max(0, Number(sub.daysRemaining) || 0);
  const grace = Math.max(0, Number(sub.gracePeriodInDays) || 0);

  // Phase derivation. The 5-day expiring window is a soft heads-up; the
  // grace and expired phases are non-negotiable — vendors must see them.
  let phase: "expiring" | "grace" | "expired";
  console.log(sub, "daays")
  if (days > 5) {
    return null; // healthy active sub — no banner needed
  } else if (days > 0) {
    phase = "expiring";
  } else if (grace > 0) {
    phase = "grace";
  } else {
    phase = "expired";
  }

  const tone = TONES[phase];

  // iOS-safe copy: no "renew now" / "pick a plan" / purchase prompts
  // anywhere visible to a vendor. Apple guideline 3.1.3 treats those
  // as in-app purchase nudges when the purchase doesn't go through
  // IAP. Android keeps the urgency-oriented framing because it pays
  // via Paystack in-app.
  let title: string;
  let meta: string;
  if (phase === "expiring") {
    title = formatExpiringTitle(days);
    meta = IS_IOS
      ? "Your current billing period is nearing its end."
      : "Renew now to avoid downtime — your storefront stays live without interruption.";
  } else if (phase === "grace") {
    title = formatGraceTitle(grace);
    meta = IS_IOS
      ? "Your billing period has ended; your storefront is still live during the grace window."
      : "Your subscription expired but your storefront is still live during grace. Renew before grace ends to keep selling.";
  } else {
    title = "Subscription expired";
    meta = IS_IOS
      ? "Storefront features are limited until the next billing period is started."
      : "Your storefront features are limited until you pick a plan. Renew to restore access.";
  }

  // Android routes to the in-app Paystack flow. iOS has no CTA at
  // all — the banner becomes purely informational and vendors must
  // navigate to More themselves, where "Manage account" (web,
  // Paystack via handoff) is psychologically prominent and "Billing"
  // (IAP) reads as admin chrome. This shape minimises IAP volume
  // without crossing Apple's 3.1.1 anti-steering line — the most
  // visible payment-urgency CTA on Home simply doesn't exist on iOS,
  // so there's no surface to read as "steering away from IAP".
  const onPress = IS_IOS
    ? undefined
    : () => {
        haptic();
        navigation.navigate("SubscriptionFlow", {});
      };

  // The banner uses Pressable on Android (tappable CTA) and a plain
  // View on iOS (informational only). We branch the wrapper rather
  // than passing onPress={undefined} to Pressable so iOS doesn't get
  // a pressed-state ripple on a non-interactive surface.
  const Wrapper: any = IS_IOS ? View : Pressable;
  const wrapperProps = IS_IOS ? {} : { onPress };

  return (
    <Wrapper
      {...wrapperProps}
      className="mx-4 mt-3 rounded-2xl overflow-hidden border"
      style={{
        backgroundColor: tone.bg,
        borderColor: tone.border,
        shadowColor: tone.ctaBg,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center px-4 py-3.5">
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
          style={{ backgroundColor: tone.iconBg }}
        >
          <Ionicons name={tone.icon} size={20} color={tone.iconColor} />
        </View>

        <View className="flex-1 min-w-0">
          <Text
            className="text-[10px] font-extrabold uppercase tracking-[1.4px]"
            style={{ color: tone.eyebrowColor }}
          >
            {tone.eyebrow}
          </Text>
          <Text
            className="text-[14.5px] font-extrabold tracking-tight mt-0.5"
            style={{ color: tone.titleColor }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            className="text-[11.5px] font-semibold leading-[15px] mt-0.5"
            style={{ color: tone.metaColor }}
            numberOfLines={2}
          >
            {meta}
          </Text>
        </View>

        {/* CTA pill is Android-only. On iOS the banner is purely
            informational — vendors navigate to More themselves,
            which puts "Manage account" (web) psychologically first. */}
        {!IS_IOS && (
          <View
            className="ml-2 flex-row items-center gap-1 rounded-full px-3 h-8"
            style={{
              backgroundColor: tone.ctaBg,
              shadowColor: tone.ctaBg,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text
              className="text-[11.5px] font-extrabold"
              style={{ color: tone.ctaText }}
            >
              {tone.ctaLabel}
            </Text>
            <Ionicons name="arrow-forward" size={12} color={tone.ctaText} />
          </View>
        )}
      </View>
    </Wrapper>
  );
}
