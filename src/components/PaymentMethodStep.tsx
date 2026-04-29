import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

type PaymentOption = "card" | "bank_transfer";

type Props = {
  plan: {
    name: string;
    price: number;
  };
  billingCycle: string;
  onBack: () => void;
  onPay: (paymentOption: PaymentOption) => void;
};

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const cycleLabel = (cycle: string) =>
  cycle === "Monthly"
    ? "Billed monthly"
    : cycle === "Quarterly"
    ? "Billed every 3 months"
    : cycle === "Yearly"
    ? "Billed yearly"
    : `Billed ${cycle.toLowerCase()}`;

const nextRenewalDate = (cycle: string) => {
  const d = new Date();
  if (cycle === "Quarterly") d.setMonth(d.getMonth() + 3);
  else if (cycle === "Yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function PaymentMethodStep({
  plan,
  billingCycle,
  onBack,
  onPay,
}: Props) {
  const [selected, setSelected] = useState<PaymentOption>("card");

  const handlePay = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPay(selected);
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3 flex-row items-start gap-2">
            <Pressable
              onPress={onBack}
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 mr-1"
              hitSlop={6}
            >
              <Ionicons name="arrow-back" size={18} color="#374151" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-blue-600">
                Step 2 of 2
              </Text>
              <Text className="text-[20px] font-extrabold text-gray-900 tracking-tight mt-0.5">
                Payment method
              </Text>
              <Text className="text-[12.5px] text-gray-500 mt-0.5">
                Choose how you'd like to pay.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
      >
        {/* Order summary card */}
        <View
          className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-5"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
            <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-gray-500">
              Order summary
            </Text>
            <View className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              <Ionicons name="lock-closed" size={10} color="#2563eb" />
              <Text className="text-[10px] font-extrabold text-blue-700">
                SECURE
              </Text>
            </View>
          </View>

          <View className="px-5 py-4">
            <View className="flex-row items-start gap-3">
              <View className="w-11 h-11 rounded-xl bg-blue-50 items-center justify-center">
                <Ionicons name="rocket" size={20} color="#2563eb" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[15px] font-extrabold text-gray-900">
                  {plan.name}
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5">
                  {cycleLabel(billingCycle)}
                </Text>
              </View>
            </View>
          </View>

          <View className="px-5 py-3 bg-gray-50 border-t border-gray-100 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-600">Plan price</Text>
              <Text className="text-[12.5px] font-bold text-gray-900">
                ₦{plan.price.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-600">Next renewal</Text>
              <Text className="text-[12.5px] font-bold text-gray-900">
                {nextRenewalDate(billingCycle)}
              </Text>
            </View>
            <View className="h-px bg-gray-200 my-1" />
            <View className="flex-row justify-between items-baseline">
              <Text className="text-[13px] font-bold text-gray-900">
                Total today
              </Text>
              <Text className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                ₦{plan.price.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment options */}
        <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-gray-500 mb-3 px-1">
          Pay with
        </Text>

        <PaymentOptionCard
          icon="card-outline"
          title="Card payment"
          description="Visa, Mastercard, Verve — paid securely via Paystack"
          selected={selected === "card"}
          onPress={() => {
            haptic();
            setSelected("card");
          }}
          tone="blue"
        />

        <PaymentOptionCard
          icon="business-outline"
          title="Bank transfer"
          description="Transfer directly from your bank — no card needed"
          selected={selected === "bank_transfer"}
          onPress={() => {
            haptic();
            setSelected("bank_transfer");
          }}
          tone="emerald"
        />

        <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex-row items-start gap-2.5 mt-3">
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color="#475569"
          />
          <Text className="text-[12px] text-gray-600 flex-1 leading-[18px]">
            Your payment is processed by Paystack. We never see or store your
            card details.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky pay */}
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
          onPress={handlePay}
          className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Ionicons name="lock-closed" size={14} color="white" />
          <Text className="text-white font-bold text-[15px]">
            Pay ₦{plan.price.toLocaleString()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PaymentOptionCard({
  icon,
  title,
  description,
  selected,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  tone: "blue" | "emerald";
}) {
  const toneStyle =
    tone === "blue"
      ? { iconBg: "bg-blue-50", iconColor: "#2563eb" }
      : { iconBg: "bg-emerald-50", iconColor: "#059669" };

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3.5 mb-2.5 rounded-2xl border-2 ${
        selected
          ? "border-blue-600 bg-blue-50/40"
          : "border-gray-100 bg-white"
      }`}
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: selected ? 0.06 : 0.03,
        shadowRadius: 6,
        elevation: selected ? 2 : 1,
      }}
    >
      <View
        className={`w-11 h-11 rounded-xl items-center justify-center ${toneStyle.iconBg}`}
      >
        <Ionicons name={icon} size={20} color={toneStyle.iconColor} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[14px] font-extrabold text-gray-900">{title}</Text>
        <Text className="text-[11.5px] text-gray-500 mt-0.5 leading-[16px]">
          {description}
        </Text>
      </View>
      <View
        className={`w-5 h-5 rounded-full ml-2 items-center justify-center ${
          selected ? "bg-blue-600" : "border-2 border-gray-200 bg-white"
        }`}
      >
        {selected && <Ionicons name="checkmark" size={12} color="white" />}
      </View>
    </Pressable>
  );
}
