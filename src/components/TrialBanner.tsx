import { View, Text, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { useVendor } from "../../context/VendorContext";
import { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

interface UrgencyTone {
  bgFrom: string;
  bgTo: string;
  border: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  eyebrowColor: string;
  titleColor: string;
  metaColor: string;
  ctaBg: string;
  ctaText: string;
}

// Three urgency bands. Days are inclusive at the lower bound — i.e. "≤ 2"
// means a vendor with 2 days left already sees the critical treatment.
const TONES: { calm: UrgencyTone; warm: UrgencyTone; urgent: UrgencyTone } = {
  calm: {
    bgFrom: "#fffbeb",
    bgTo: "#fef3c7",
    border: "#fde68a",
    iconBg: "#fde68a",
    iconColor: "#b45309",
    icon: "sparkles",
    eyebrowColor: "#92400e",
    titleColor: "#7c2d12",
    metaColor: "#92400e",
    ctaBg: "#d97706",
    ctaText: "#ffffff",
  },
  warm: {
    bgFrom: "#fff7ed",
    bgTo: "#ffedd5",
    border: "#fed7aa",
    iconBg: "#fed7aa",
    iconColor: "#c2410c",
    icon: "time",
    eyebrowColor: "#9a3412",
    titleColor: "#7c2d12",
    metaColor: "#c2410c",
    ctaBg: "#ea580c",
    ctaText: "#ffffff",
  },
  urgent: {
    bgFrom: "#fff1f2",
    bgTo: "#ffe4e6",
    border: "#fecdd3",
    iconBg: "#fecdd3",
    iconColor: "#be123c",
    icon: "alarm",
    eyebrowColor: "#9f1239",
    titleColor: "#881337",
    metaColor: "#be123c",
    ctaBg: "#e11d48",
    ctaText: "#ffffff",
  },
};

const pickTone = (days: number): UrgencyTone => {
  if (days <= 2) return TONES.urgent;
  if (days <= 7) return TONES.warm;
  return TONES.calm;
};

const formatTitle = (days: number) => {
  if (days <= 0) return "Your trial has ended";
  if (days === 1) return "Trial ends tomorrow";
  return `${days} days left on your trial`;
};

const formatMeta = (days: number) => {
  if (days <= 0)
    return "Upgrade now to keep your storefront live and avoid downtime.";
  if (days <= 2)
    return "Pick a plan now so customers don't lose access to your storefront.";
  if (days <= 7)
    return "Lock in your plan early — your trial wraps up soon.";
  return "Enjoy full access. Upgrade anytime to skip the wait at the end.";
};

/**
 * Subtle, friendly banner shown on Home when the vendor is in their
 * free-trial window. Reads `storeData.storeSubscription` from
 * VendorContext so it lights up automatically — no prop wiring needed.
 *
 * The visual urgency ramps up as the trial gets close to expiring:
 *  - calm   (>7d remaining):  amber/sparkles
 *  - warm   (≤7d remaining):  orange/clock
 *  - urgent (≤2d remaining):  rose/alarm
 *
 * Returns null when the vendor isn't on a trial — safe to drop in
 * anywhere without a guard.
 */
export function TrialBanner() {
  const navigation = useNavigation<Nav>();
  const { storeData } = useVendor();
  const sub = storeData?.storeSubscription;

  if (!sub?.isTrial) return null;

  const days = Math.max(0, Number(sub.daysRemaining) || 0);
  const tone = pickTone(days);

  const onPress = () => {
    haptic();
    navigation.navigate("SubscriptionFlow", {});
  };

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mt-3 rounded-2xl overflow-hidden border"
      style={{
        backgroundColor: tone.bgFrom,
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
            Free trial
          </Text>
          <Text
            className="text-[14.5px] font-extrabold tracking-tight mt-0.5"
            style={{ color: tone.titleColor }}
            numberOfLines={1}
          >
            {formatTitle(days)}
          </Text>
          <Text
            className="text-[11.5px] font-semibold leading-[15px] mt-0.5"
            style={{ color: tone.metaColor }}
            numberOfLines={2}
          >
            {formatMeta(days)}
          </Text>
        </View>

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
            Upgrade
          </Text>
          <Ionicons name="arrow-forward" size={12} color={tone.ctaText} />
        </View>
      </View>
    </Pressable>
  );
}
