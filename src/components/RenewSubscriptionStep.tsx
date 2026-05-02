import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { ApiSubscriptionPlan } from "../api/vendor/vendor.types";
import { getAvailablePlans } from "../api/vendor/vendor.api";

type BillingCycle = "Monthly" | "Quarterly" | "Yearly";

type Props = {
  selectedPlan: { name: string; price: number };
  billingCycle: BillingCycle;
  setBillingCycle: (cycle: BillingCycle) => void;
  onContinue: (plan: ApiSubscriptionPlan, cycle: BillingCycle) => void;
  onClose: () => void;
};

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const cycleLabel = (cycle: BillingCycle) =>
  cycle === "Monthly" ? "/ month" : cycle === "Quarterly" ? "/ quarter" : "/ year";

type IoniconName = keyof typeof Ionicons.glyphMap;

function planTone(plan: ApiSubscriptionPlan): {
  iconBg: string;
  iconColor: string;
  icon: IoniconName;
} {
  const name = plan.name.toLowerCase();
  if (plan.isPopular || name.includes("pro") || name.includes("premium")) {
    return { iconBg: "bg-blue-50", iconColor: "#2563eb", icon: "rocket" };
  }
  if (name.includes("enterprise")) {
    return { iconBg: "bg-violet-50", iconColor: "#7c3aed", icon: "diamond" };
  }
  if (name.includes("starter") || name.includes("basic") || name.includes("free")) {
    return { iconBg: "bg-emerald-50", iconColor: "#059669", icon: "leaf" };
  }
  return { iconBg: "bg-blue-50", iconColor: "#2563eb", icon: "shield-checkmark" };
}

export default function RenewSubscriptionStep({
  selectedPlan: initialPlan,
  billingCycle,
  setBillingCycle,
  onContinue,
  onClose,
}: Props) {
  const [plans, setPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApiPlan, setSelectedApiPlan] =
    useState<ApiSubscriptionPlan | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getAvailablePlans();
        if (!isMounted || !data) return;
        setPlans(data);
        const current = data.find((p) => p.name === initialPlan.name) ?? data[0];
        setSelectedApiPlan(current ?? null);
      } catch (err) {
        if (isMounted) console.error("Plan Fetch Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const calculatedPrices = useMemo(() => {
    return plans.reduce((acc, plan) => {
      let price = plan.price;
      if (billingCycle === "Quarterly") price = plan.price * 3;
      else if (billingCycle === "Yearly") price = plan.price * 12 * 0.9;
      acc[plan.id] = { price: Math.round(price) };
      return acc;
    }, {} as Record<string, { price: number }>);
  }, [plans, billingCycle]);

  const handlePickPlan = (plan: ApiSubscriptionPlan) => {
    haptic();
    setSelectedApiPlan(plan);
  };

  const handleContinue = () => {
    if (!selectedApiPlan) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onContinue(selectedApiPlan, billingCycle);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-3 text-[13px] text-gray-500">Loading plans…</Text>
      </View>
    );
  }

  const continuePrice = selectedApiPlan
    ? calculatedPrices[selectedApiPlan.id]?.price ?? selectedApiPlan.price
    : 0;

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-blue-600">
              Step 1 of 2
            </Text>
            <Text className="text-[20px] font-extrabold text-gray-900 tracking-tight mt-0.5">
              Choose your plan
            </Text>
            <Text className="text-[12.5px] text-gray-500 mt-0.5">
              Pick what fits — switch anytime later.
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            hitSlop={6}
          >
            <Ionicons name="close" size={18} color="#374151" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
      >
        {/* Billing cycle pills */}
        <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-5">
          {(
            [
              { key: "Monthly", label: "Monthly", badge: null },
              { key: "Quarterly", label: "Quarterly", badge: null },
              { key: "Yearly", label: "Yearly", badge: "Save 10%" },
            ] as { key: BillingCycle; label: string; badge: string | null }[]
          ).map((tab) => {
            const isActive = billingCycle === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  haptic();
                  setBillingCycle(tab.key);
                }}
                className={`flex-1 h-10 rounded-xl items-center justify-center flex-row gap-1.5 ${
                  isActive ? "bg-white" : ""
                }`}
                style={
                  isActive
                    ? {
                        shadowColor: "#0f172a",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.06,
                        shadowRadius: 3,
                        elevation: 1,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-[13px] font-bold ${
                    isActive ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </Text>
                {tab.badge && (
                  <View className="bg-emerald-100 px-1.5 py-0.5 rounded">
                    <Text className="text-[9px] font-extrabold text-emerald-700 tracking-wide">
                      {tab.badge}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Plan cards */}
        {plans.map((plan) => {
          const isSelected = selectedApiPlan?.id === plan.id;
          const priceInfo = calculatedPrices[plan.id] || { price: plan.price };
          const tone = planTone(plan);

          return (
            <Pressable
              key={plan.id}
              onPress={() => handlePickPlan(plan)}
              className={`relative rounded-3xl p-5 mb-7 border-2 ${
                isSelected
                  ? "border-blue-600 bg-blue-50/40"
                  : "border-gray-100 bg-white"
              }`}
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.08 : 0.03,
                shadowRadius: 12,
                elevation: isSelected ? 3 : 1,
              }}
            >
              {plan.isPopular && (
                <View className="absolute -top-2.5 left-5 bg-gray-900 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                  <Ionicons name="star" size={10} color="#fbbf24" />
                  <Text className="text-[9px] font-extrabold text-white tracking-wide uppercase">
                    Most popular
                  </Text>
                </View>
              )}

              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-row items-start gap-3 flex-1 min-w-0">
                  {/* Icon disk + selection badge anchored to it. Keeping
                      the indicator on the left side frees the price column
                      on the right from any overlap regardless of price
                      length. */}
                  <View className="relative">
                    <View
                      className={`w-11 h-11 rounded-xl items-center justify-center ${tone.iconBg}`}
                    >
                      <Ionicons
                        name={tone.icon}
                        size={20}
                        color={tone.iconColor}
                      />
                    </View>
                    {isSelected && (
                      <View
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 items-center justify-center border-2 border-white"
                        style={{
                          shadowColor: "#2563eb",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Ionicons name="checkmark" size={11} color="white" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[16px] font-extrabold text-gray-900 mb-0.5">
                      {plan.name}
                    </Text>
                    {plan.description ? (
                      <Text className="text-[12px] text-gray-500 leading-[18px]">
                        {plan.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                    ₦{priceInfo.price.toLocaleString()}
                  </Text>
                  <Text className="text-[10.5px] text-gray-500 mt-0.5">
                    {cycleLabel(billingCycle)}
                  </Text>
                  {/* Yearly savings reinforcement — vendors think in
                      money, not percentages, so we show the absolute
                      naira amount they save vs. paying monthly × 12. */}
                  {billingCycle === "Yearly" && plan.price > 0 && (
                    <View className="mt-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100">
                      <Text className="text-[10px] font-extrabold text-emerald-700 tracking-wide">
                        Save ₦{Math.round(plan.price * 1.2).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {plan.features && plan.features.length > 0 && (
                <View className="border-t border-gray-100 mt-4 pt-3">
                  {plan.features.map((feature, i) => (
                    <View
                      key={`${plan.id}-feature-${i}`}
                      className="flex-row items-start gap-2 py-1"
                    >
                      <View className="w-4 h-4 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                        <Ionicons
                          name="checkmark"
                          size={10}
                          color="#059669"
                        />
                      </View>
                      <Text
                        className="text-[12.5px] text-gray-700 leading-[18px] flex-1"
                        numberOfLines={2}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}

        <View className="flex-row items-start gap-2 mt-2 px-2">
          <Ionicons name="lock-closed-outline" size={14} color="#94a3b8" />
          <Text className="text-[11.5px] text-gray-500 flex-1 leading-[18px]">
            Cancel or switch anytime. We won't surprise-bill you.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View
        className="px-5 pt-3 pb-7 border-t border-gray-100 bg-white"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!selectedApiPlan}
          className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
            !selectedApiPlan ? "bg-gray-200" : "bg-blue-600"
          }`}
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: !selectedApiPlan ? 0 : 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text
            className={`font-bold text-[15px] ${
              !selectedApiPlan ? "text-gray-400" : "text-white"
            }`}
          >
            {selectedApiPlan
              ? `Continue · ₦${continuePrice.toLocaleString()}`
              : "Select a plan"}
          </Text>
          {selectedApiPlan && (
            <Ionicons name="arrow-forward" size={16} color="white" />
          )}
        </Pressable>
      </View>
    </View>
  );
}
