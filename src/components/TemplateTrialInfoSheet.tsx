import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { BottomSheet } from "./BottomSheet";
import type { ApiSubscriptionPlan } from "../api/vendor/vendor.types";

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const formatNgn = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

interface Props {
  visible: boolean;
  /** Display label of the template the vendor just tapped (e.g. "Grace"). */
  templateLabel: string;
  /** Plan that owns this template. Null when no plan grants it yet
   *  (data anomaly) — sheet still renders with a generic "premium
   *  plan" line so the vendor isn't left guessing. */
  plan: ApiSubscriptionPlan | null;
  /** Vendor confirmed — caller commits the template selection. */
  onConfirm: () => void;
  /** Vendor cancelled / closed — caller leaves the selection unchanged. */
  onClose: () => void;
}

/**
 * Informational sheet shown to TRIAL vendors when they tap a template
 * that isn't part of the base/free plan. Mirrors the web
 * `TemplateTrialInfoSheet`: frames the cost so vendors know what to
 * expect after their trial ends — and confirms they want to apply
 * the template knowing the storefront will fall back to Carte unless
 * they upgrade before their trial expires.
 *
 * Distinct from `<FeaturePaywallSheet />`:
 *   - Paywall = blocking; "you can't use this, upgrade to unlock"
 *   - Info sheet = informational; "you CAN use it, here's what it
 *     belongs to and what happens after trial"
 *
 * Non-trial vendors never see this — their picker raises the paywall
 * instead.
 */
export function TemplateTrialInfoSheet({
  visible,
  templateLabel,
  plan,
  onConfirm,
  onClose,
}: Props) {
  const planLabel = plan?.name ?? "a premium plan";
  const priceText = plan?.price
    ? `${formatNgn.format(plan.price)} / month`
    : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="On your trial"
      subtitle="You can apply this — here's the catch"
      height="62%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        {/* Hero — template label + plan name + price */}
        <View
          className="bg-white rounded-3xl border border-gray-100 px-5 py-6 items-center"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 18,
            elevation: 2,
          }}
        >
          <View className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 items-center justify-center mb-4">
            <Ionicons name="sparkles" size={26} color="#2563eb" />
          </View>
          <Text className="text-[18px] font-extrabold tracking-tight text-gray-900 text-center">
            {templateLabel} template
          </Text>
          <Text className="mt-2 max-w-[300px] text-[13.5px] leading-[19px] text-gray-600 text-center">
            This template is part of{" "}
            <Text className="font-extrabold text-gray-900">{planLabel}</Text>
            {priceText ? (
              <>
                {" "}at{" "}
                <Text className="font-extrabold text-gray-900">
                  {priceText}
                </Text>
              </>
            ) : null}
            .
          </Text>
          <View className="mt-5 flex-row items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1.5">
            <Ionicons name="checkmark" size={12} color="#047857" />
            <Text className="text-[11px] font-extrabold text-emerald-700">
              Free during your trial
            </Text>
          </View>
        </View>

        {/* What happens after trial */}
        <View className="mt-4 rounded-3xl border border-amber-100 bg-amber-50 px-5 py-4">
          <View className="flex-row items-start gap-3">
            <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center mt-0.5">
              <Ionicons name="warning" size={16} color="#b45309" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[10.5px] font-extrabold uppercase text-amber-800 mb-1"
                style={{ letterSpacing: 1.2 }}
              >
                After your trial
              </Text>
              <Text className="text-[13px] leading-[19px] text-amber-900">
                If you haven&apos;t upgraded to a plan that includes{" "}
                <Text className="font-extrabold">{templateLabel}</Text>, your
                storefront will display the{" "}
                <Text className="font-extrabold">Carte</Text> template to
                customers — your selection is kept, so it returns the moment
                you upgrade.
              </Text>
            </View>
          </View>
        </View>

        {/* CTAs */}
        <Pressable
          onPress={() => {
            haptic();
            onConfirm();
          }}
          className="mt-5 h-12 rounded-2xl bg-gray-900 items-center justify-center flex-row gap-2"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
            shadowRadius: 22,
            elevation: 4,
          }}
        >
          <Text className="text-white text-[14.5px] font-extrabold">
            Apply during my trial
          </Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </Pressable>
        <Pressable
          onPress={onClose}
          className="mt-2.5 h-11 rounded-2xl items-center justify-center"
        >
          <Text className="text-gray-700 text-[13.5px] font-bold">
            Pick another
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}
