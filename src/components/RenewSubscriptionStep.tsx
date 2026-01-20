import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useState, useEffect, useMemo } from "react"; // Added useMemo
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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

export default function RenewSubscriptionStep({
  selectedPlan: initialPlan,
  billingCycle,
  setBillingCycle,
  onContinue,
  onClose,
}: Props) {
  const [plans, setPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Keep state simple
  const [selectedApiPlan, setSelectedApiPlan] = useState<ApiSubscriptionPlan | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const data = await getAvailablePlans();
        if (isMounted && data) {
          setPlans(data);
          // Find the initial plan OR default to the first one available
          const current = data.find((p) => p.name === initialPlan.name) || data[0];
          setSelectedApiPlan(current || null);
        }
      } catch (error) {
        if (isMounted) console.error("Plan Fetch Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPlans();
    return () => { isMounted = false; };
  }, []); // Only fetch on mount

  /**
   * 2. Calculation outside of JSX to prevent re-render jumps
   */
  const calculatedPrices = useMemo(() => {
    return plans.reduce((acc, plan) => {
      let price = plan.price;
      let label = "per month";

      if (billingCycle === "Quarterly") {
        price = plan.price * 3;
        label = "per 3 months";
      } else if (billingCycle === "Yearly") {
        price = (plan.price * 12) * 0.9;
        label = "per year (10% off)";
      }

      acc[plan.id] = { price, label };
      return acc;
    }, {} as Record<string, { price: number; label: string }>);
  }, [plans, billingCycle]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading plans...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-3">
        <Text className="text-lg font-semibold text-gray-900">Renew Subscription</Text>
        <Pressable onPress={onClose} hitSlop={15}>
          <MaterialIcons name="close" size={24} color="#111827" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Billing Cycle Tabs - Refactored to explicit buttons */}
        <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
          <Pressable
            onPress={() => setBillingCycle("Monthly")}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center ${billingCycle === "Monthly" ? "bg-white shadow-sm" : ""
              }`}
          >
            <Text className={`text-center text-sm font-medium ${billingCycle === "Monthly" ? "text-gray-900" : "text-gray-500"
              }`}>
              Monthly
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setBillingCycle("Quarterly")}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center ${billingCycle === "Quarterly" ? "bg-white shadow-sm" : ""
              }`}
          >
            <Text className={`text-center text-sm font-medium ${billingCycle === "Quarterly" ? "text-gray-900" : "text-gray-500"
              }`}>
              Quarterly
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setBillingCycle("Yearly")}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center flex-row ${billingCycle === "Yearly" ? "bg-white shadow-sm" : ""
              }`}
          >
            <Text className={`text-center text-sm font-medium ${billingCycle === "Yearly" ? "text-gray-900" : "text-gray-500"
              }`}>
              Yearly
            </Text>
            <View className="ml-1 bg-green-100 px-1.5 py-0.5 rounded">
              <Text className="text-[8px] font-bold text-green-700">-10%</Text>
            </View>
          </Pressable>
        </View>

        {/* Plan Cards */}
        {plans.map((plan) => {
          const isSelected = selectedApiPlan?.id === plan.id;
          const { price, label } = calculatedPrices[plan.id] || { price: plan.price, label: "per month" };

          return (
            <Pressable
              key={plan.id}
              onPress={() => {
                setSelectedApiPlan(plan);
                onContinue(plan, billingCycle);
              }}
              className={`rounded-2xl p-5 mb-5 ${isSelected ? "border-2 border-blue-600 shadow-sm" : "border border-gray-200"
                }`}
              style={{ backgroundColor: isSelected ? "#eff6ff" : "#ffffff" }}
            >
              {plan.isPopular && (
                <View className="absolute -top-2.5 left-5 bg-blue-600 px-3 py-1 rounded-full">
                  <Text className="text-[10px] text-white font-bold uppercase tracking-wider">Most Popular</Text>
                </View>
              )}

              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 mb-1">{plan.name}</Text>
                  <Text className="text-xs text-gray-500 pr-4 leading-4">{plan.description}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-bold text-gray-900">₦{price.toLocaleString()}</Text>
                  <Text className="text-[10px] text-gray-400 font-medium">{label}</Text>
                  {isSelected && (
                    <View className="mt-2">
                      <MaterialIcons name="check-circle" size={24} color="#2563eb" />
                    </View>
                  )}
                </View>
              </View>

              {/* Features */}
              <View className="mt-2 border-t border-gray-100 pt-4">
                {plan.features?.map((feature, index) => (
                  <View key={index} className="flex-row items-start mb-2.5">
                    <MaterialIcons name="check" size={18} color="#10b981" style={{ marginRight: 8, marginTop: 1 }} />
                    <Text className="text-sm text-gray-700 flex-1">{feature}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View className="px-5 py-4 border-t border-gray-100 bg-white">
        <Pressable
          disabled={!selectedApiPlan}
          onPress={() => selectedApiPlan && onContinue(selectedApiPlan, billingCycle)}
          className={`rounded-xl py-4 items-center ${!selectedApiPlan ? 'bg-gray-300' : 'bg-blue-600'}`}
        >
          <Text className="text-white font-semibold text-base">
            {selectedApiPlan
              ? `Continue (₦${(calculatedPrices[selectedApiPlan.id]?.price || 0).toLocaleString()})`
              : "Select a Plan"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}