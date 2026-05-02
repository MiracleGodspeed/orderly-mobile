import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { BottomSheet } from "./BottomSheet";
import { FEATURE_META, FeatureKey } from "../lib/features";
import { RootStackParamList } from "../navigation/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The gated feature the vendor tried to access. */
  feature: FeatureKey | null;
  /** Optional. Called when the user taps the upgrade CTA, before the sheet
   *  closes and navigation runs. Lets the parent dismiss its own
   *  modal/sheet so the vendor lands cleanly on the billing screen
   *  (instead of returning to a now-irrelevant form). */
  onUpgrade?: () => void;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

/**
 * Generic paywall sheet shown when a vendor taps a gated feature their
 * current plan doesn't include. Pulls labels/descriptions from
 * `FEATURE_META` so the sheet stays generic — to add a new gated feature,
 * register it in `features.ts` and this sheet handles it automatically.
 */
export function FeaturePaywallSheet({
  visible,
  onClose,
  feature,
  onUpgrade,
}: Props) {
  const navigation = useNavigation<Nav>();
  const meta = feature ? FEATURE_META[feature] : null;

  const handleUpgrade = () => {
    haptic();
    // The paywall is often nested inside another native Modal (e.g. the
    // pageSheet AddProductModal). Dismissing both modals + pushing a new
    // screen in the same frame causes UIKit to lose the snapshot and the
    // app freezes. Sequence the work so each animation finishes before
    // the next one starts:
    //   1) close this transparent sheet
    //   2) wait for it to slide out, then close the parent modal
    //   3) wait for the parent's pageSheet animation, then navigate
    onClose();
    setTimeout(() => {
      onUpgrade?.();
      setTimeout(() => {
        navigation.navigate("SubscriptionBilling" as any);
      }, 500);
    }, 280);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Upgrade required"
      subtitle="This feature is part of a higher plan"
      height={meta?.bullets || meta?.beforeAfter ? "85%" : "62%"}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
      >
        <View
          className="bg-white rounded-3xl border border-gray-100 px-5 py-6 items-center"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 3,
          }}
        >
          <View
            className="w-16 h-16 rounded-3xl items-center justify-center mb-4 border border-blue-100"
            style={{ backgroundColor: "#eff6ff" }}
          >
            <Ionicons name="sparkles" size={26} color="#2563eb" />
          </View>
          <Text className="text-[18px] font-extrabold text-gray-900 tracking-tight text-center">
            {meta?.label ?? "Premium feature"}
          </Text>
          <Text className="text-[13.5px] text-gray-600 mt-2 text-center leading-[19px] max-w-[320px]">
            {meta?.description ??
              "Upgrade your plan to unlock this feature for your store."}
          </Text>

          <View className="flex-row items-center gap-2 mt-5 px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-100">
            <Ionicons name="checkmark-circle" size={12} color="#059669" />
            <Text className="text-[11px] font-bold text-emerald-700">
              Cancel anytime · No hidden fees
            </Text>
          </View>
        </View>

        {/* Before/After contrast — used for features where vendors might
            not understand what the difference looks like (e.g. custom
            domain). Hidden when the feature meta doesn't define one. */}
        {meta?.beforeAfter ? (
          <View className="mt-4 bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <View className="px-5 py-3 border-b border-gray-100 flex-row items-center gap-1.5">
              <Ionicons name="eye-outline" size={13} color="#475569" />
              <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-gray-500">
                What it looks like
              </Text>
            </View>

            <View className="px-5 py-4">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-gray-400 mb-1.5">
                {meta.beforeAfter.beforeLabel}
              </Text>
              <View className="flex-row items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                <Ionicons name="globe-outline" size={14} color="#94a3b8" />
                <Text
                  className="text-[12.5px] text-gray-500 flex-1"
                  numberOfLines={1}
                >
                  {meta.beforeAfter.before}
                </Text>
              </View>

              <View className="items-center my-2">
                <Ionicons name="arrow-down" size={14} color="#94a3b8" />
              </View>

              <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-emerald-700 mb-1.5">
                {meta.beforeAfter.afterLabel}
              </Text>
              <View
                className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5"
                style={{
                  shadowColor: "#059669",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  elevation: 1,
                }}
              >
                <Ionicons name="globe" size={14} color="#059669" />
                <Text
                  className="text-[13px] font-extrabold text-emerald-800 flex-1 tracking-tight"
                  numberOfLines={1}
                >
                  {meta.beforeAfter.after}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Concrete value props — checklisted bullets so the vendor sees
            exactly what they unlock, not just an abstract benefit. */}
        {meta?.bullets && meta.bullets.length > 0 ? (
          <View className="mt-4 bg-white rounded-3xl border border-gray-100 px-5 py-4">
            <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-gray-500 mb-3">
              What you get
            </Text>
            {meta.bullets.map((bullet, i) => (
              <View
                key={i}
                className={`flex-row items-start gap-2.5 ${
                  i === 0 ? "" : "mt-2.5"
                }`}
              >
                <View className="w-5 h-5 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                  <Ionicons name="checkmark" size={12} color="#059669" />
                </View>
                <Text className="text-[13px] text-gray-800 leading-[18px] flex-1">
                  {bullet}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={handleUpgrade}
          className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2 mt-5 active:bg-blue-700"
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
            See plans & upgrade
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          className="h-11 rounded-2xl items-center justify-center mt-2.5"
        >
          <Text className="text-gray-700 font-bold text-[13.5px]">
            Maybe later
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}
