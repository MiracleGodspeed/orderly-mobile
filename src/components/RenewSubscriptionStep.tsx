import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ApiSubscriptionPlan } from "../api/vendor/vendor.types";
import { getAvailablePlans } from "../api/vendor/vendor.api";

type BillingCycle = "Monthly" | "Quarterly" | "Yearly";

type Props = {
  selectedPlan: {
    name: string;
    price: number;
  };
  billingCycle: BillingCycle;
  onContinue: (plan: ApiSubscriptionPlan, cycle: BillingCycle) => void;
  onClose: () => void;
};

export default function RenewSubscriptionStep({
  selectedPlan: initialPlan,
  billingCycle: initialCycle,
  onContinue,
  onClose,
}: Props) {
  const [plans, setPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialCycle);
  const [selectedPlan, setSelectedPlan] = useState<ApiSubscriptionPlan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await getAvailablePlans();
      setPlans(data);
      
      // Try to find the plan that matches the current user's plan, otherwise pick the first
      const current = data.find((p) => p.name === initialPlan.name) || data[0];
      setSelectedPlan(current);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate price based on cycle
  const getDisplayPrice = (basePrice: number) => {
    if (billingCycle === "Quarterly") return basePrice * 3;
    if (billingCycle === "Yearly") return basePrice * 12;
    return basePrice;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-10">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-2 text-gray-500">Loading plans...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-3">
        <Text className="text-lg font-semibold text-gray-900">
          Renew Subscription
        </Text>
        <Pressable onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#111827" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5">
        {/* Billing Cycle Tabs */}

        {/* <View className="flex-row bg-gray-100 rounded-xl p-1 mb-5">
          {(["Monthly", "Quarterly", "Yearly"] as BillingCycle[]).map((cycle) => (
            <Pressable
              key={cycle}
              onPress={() => setBillingCycle(cycle)}
              className={`flex-1 py-2.5 rounded-lg ${
                billingCycle === cycle ? "bg-white shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  billingCycle === cycle ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {cycle}
              </Text>
            </Pressable>
          ))}
        </View> */}

        {plans.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
          const displayPrice = getDisplayPrice(plan.price);

          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlan(plan)}
              className={`rounded-2xl p-4 mb-5 ${
                isSelected ? "border-2 border-blue-600" : "border border-gray-200"
              }`}
              style={{
                backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
              }}
            >
              {plan.isPopular && (
                <View
                  className="absolute -top-2.5 left-4 bg-blue-600 px-3 py-1 rounded-full"
                  style={{ zIndex: 10 }}
                >
                  <Text className="text-xs text-white font-bold uppercase tracking-wide">
                    Most Popular
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 mb-1">
                    {plan.name}
                  </Text>
                  <Text className="text-xs text-gray-500 pr-2">
                    {plan.description}
                  </Text>
                </View>

                <View className="items-end">
                  <View className="flex-row items-start">
                    <Text className="text-2xl font-bold text-gray-900">
                      ₦{displayPrice.toLocaleString()}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    per {billingCycle.replace('ly', '').toLowerCase()}
                  </Text>
                  
                  {isSelected && (
                    <View className="mt-2">
                      <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                        <MaterialIcons name="check" size={16} color="#ffffff" />
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View className="mt-2 border-t border-gray-100 pt-3">
                {plan.features.map((feature, index) => (
                  <View key={index} className="flex-row items-start mb-2">
                    <MaterialIcons
                      name="check"
                      size={18}
                      color="#10b981"
                      style={{ marginRight: 8, marginTop: 2 }}
                    />
                    <Text className="text-sm text-gray-700 flex-1">
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="px-5 py-4 border-t border-gray-100 bg-white mb-5">
        <Pressable
          disabled={!selectedPlan}
          onPress={() => selectedPlan && onContinue(selectedPlan, billingCycle)}
          className={`rounded-xl py-4 items-center ${!selectedPlan ? 'bg-gray-300' : 'bg-blue-600'}`}
        >
          <Text className="text-white font-semibold text-base">
            {selectedPlan 
              ? `Continue (₦${getDisplayPrice(selectedPlan.price).toLocaleString()})`
              : "Select a Plan"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}