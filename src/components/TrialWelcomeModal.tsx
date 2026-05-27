import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useVendor } from "../../context/VendorContext";
import { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Imperative handle for parents that want to re-open the modal after the
 *  one-time auto-show — e.g. tapping the trial banner. */
export interface TrialWelcomeModalHandle {
  open: () => void;
}

const SEEN_KEY = (storeId: string) => `trial_welcome_seen_${storeId}`;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const PERKS: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; body: string }[] = [
  {
    icon: "infinite",
    title: "Unlimited products",
    body: "No catalog cap during your trial — list as many items as you like.",
  },
  {
    icon: "layers",
    title: "Variants & categories",
    body: "Sizes, colors, and per-variant pricing are all switched on.",
  },
  {
    icon: "globe",
    title: "Custom domain & branding",
    body: "Try the premium storefront extras that paid plans gate.",
  },
  {
    icon: "stats-chart",
    title: "Full analytics & insights",
    body: "Visit tracking, revenue trends, and customer reports — yours to use.",
  },
];

/**
 * Welcome panel shown to vendors on their free trial. Sets expectations
 * up-front: "you have everything unlocked right now, some of this lives
 * behind a higher plan after the trial." Avoids the surprise of features
 * disappearing the day they subscribe to a starter plan.
 *
 * Auto-shows once per store (persisted via AsyncStorage) and can be
 * re-opened on demand by parents holding the ref — e.g. when the trial
 * banner is tapped.
 */
export const TrialWelcomeModal = forwardRef<TrialWelcomeModalHandle>(
  function TrialWelcomeModal(_props, ref) {
  const navigation = useNavigation<Nav>();
  const { storeData } = useVendor();
  const [visible, setVisible] = useState(false);

  const sub = storeData?.storeSubscription;
  const storeId = storeData?.storeId;
  const isTrial = !!sub?.isTrial;
  const days = Math.max(0, Number(sub?.daysRemaining) || 0);

  useImperativeHandle(
    ref,
    () => ({
      open: () => setVisible(true),
    }),
    []
  );

  useEffect(() => {
    if (!isTrial || !storeId) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(SEEN_KEY(storeId));
        if (!cancelled && !seen) {
          // Slight delay so the modal doesn't slam in over Home's first
          // paint — feels less abrupt and gives the splash time to fade.
          setTimeout(() => {
            if (!cancelled) setVisible(true);
          }, 600);
        }
      } catch {
        // If we can't read the flag, fail closed (don't show) so vendors
        // never see it twice on a flaky storage.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTrial, storeId]);

  const dismiss = async () => {
    haptic();
    setVisible(false);
    if (storeId) {
      try {
        await AsyncStorage.setItem(SEEN_KEY(storeId), "1");
      } catch {
        // Worst case it shows again next session — acceptable.
      }
    }
  };

  const seePlans = async () => {
    await dismiss();
    setTimeout(() => {
      if (Platform.OS === "ios") {
        // iOS routes to the status screen; the in-app purchase flow
        // (SubscriptionFlow) must not be reachable on iOS — Apple
        // guideline 3.1.3. Vendors get to plans via the neutral
        // "Manage subscription" web link on the billing screen.
        navigation.navigate("SubscriptionBilling" as any, {});
        return;
      }
      // Trial users haven't paid for the auto-assigned default plan, so
      // every plan should be selectable in the picker — including the
      // starter tier. Passing currentPlanActive=false bypasses the
      // downgrade/same-plan gates that exist to protect paying vendors
      // from proration issues.
      navigation.navigate("SubscriptionFlow", { currentPlanActive: false } as any);
    }, 280);
  };

  if (!isTrial) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View className="flex-1 bg-black/60 justify-center px-5">
        <View
          className="bg-white rounded-3xl overflow-hidden"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          {/* Hero */}
          <View
            className="px-6 pt-7 pb-6"
            style={{ backgroundColor: "#0f172a" }}
          >
            <View
              style={{
                position: "absolute",
                top: -50,
                right: -40,
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: "rgba(96, 165, 250, 0.18)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -60,
                left: -30,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: "rgba(34, 197, 94, 0.14)",
              }}
            />

            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-9 h-9 rounded-2xl bg-white/15 items-center justify-center border border-white/20">
                <Ionicons name="sparkles" size={18} color="#fde68a" />
              </View>
              <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.6px] text-blue-200">
                Free trial · {days} {days === 1 ? "day" : "days"} left
              </Text>
            </View>

            <Text
              className="text-white text-[24px] tracking-tight"
              style={{ fontFamily: "PlusJakartaSans_700Bold", lineHeight: 30 }}
            >
              Everything's unlocked while you explore.
            </Text>
            <Text className="text-blue-100/90 text-[13.5px] mt-2 leading-[19px]">
              You're on a 14-day trial with full access to every feature.
              When it ends, you'll pick a plan — some perks here may not be on
              the lower plans, so try them all now.
            </Text>
          </View>

          {/* Perks list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 260 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
          >
            {PERKS.map((perk, i) => (
              <View
                key={perk.title}
                className={`flex-row items-start ${i === 0 ? "" : "mt-3.5"}`}
              >
                <View className="w-9 h-9 rounded-2xl bg-blue-50 items-center justify-center mr-3 border border-blue-100">
                  <Ionicons name={perk.icon} size={16} color="#2563eb" />
                </View>
                <View className="flex-1 pt-0.5">
                  <Text className="text-[13.5px] font-extrabold text-gray-900 tracking-tight">
                    {perk.title}
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5 leading-[16px]">
                    {perk.body}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* CTAs */}
          <View className="px-5 pt-4 pb-5 bg-white">
            <Pressable
              onPress={seePlans}
              className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2 active:bg-blue-700"
              style={{
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <Ionicons name="rocket" size={15} color="white" />
              <Text className="text-white font-extrabold text-[14.5px]">
                {/* "See plans & pricing" on Android; iOS uses neutral
                    "Manage subscription" because Apple 3.1.3 treats
                    pricing CTAs for non-IAP purchases as in-app
                    purchase nudges. */}
                {Platform.OS === "ios"
                  ? "Manage subscription"
                  : "See plans & pricing"}
              </Text>
            </Pressable>

            <Pressable
              onPress={dismiss}
              className="h-11 rounded-2xl items-center justify-center mt-2"
            >
              <Text className="text-gray-700 font-bold text-[13.5px]">
                Got it, let me explore
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
});
