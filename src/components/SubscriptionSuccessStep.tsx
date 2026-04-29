import { View, Text, Pressable, Platform } from "react-native";
import { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

type Props = {
  onDone: () => void;
  planName?: string;
  amount?: number;
  billingCycle?: string;
  paymentReference?: string;
};

export default function SubscriptionSuccessStep({
  onDone,
  planName = "Pro",
  amount = 0,
  billingCycle = "Monthly",
  paymentReference,
}: Props) {
  useEffect(() => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    }
  }, []);

  const reference =
    paymentReference ?? `TRX-${Date.now().toString().slice(-7)}`;

  const nextRenewal = (() => {
    const d = new Date();
    if (billingCycle === "Quarterly") d.setMonth(d.getMonth() + 3);
    else if (billingCycle === "Yearly") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  })();

  return (
    <View className="flex-1">
      <View className="flex-1 px-6 justify-center">
        {/* Success ring */}
        <View className="items-center mb-6">
          <View
            className="w-28 h-28 rounded-full items-center justify-center bg-emerald-50 border border-emerald-100"
          >
            <View
              className="w-20 h-20 rounded-full items-center justify-center bg-emerald-500"
              style={{
                shadowColor: "#10b981",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              <Ionicons name="checkmark" size={44} color="white" />
            </View>
          </View>
        </View>

        <Text className="text-[24px] font-extrabold text-center text-gray-900 mb-2 tracking-tight">
          You're all set!
        </Text>

        <Text className="text-center text-[14px] text-gray-600 mb-6 leading-[20px]">
          Your{" "}
          <Text className="font-extrabold text-gray-900">{planName}</Text>{" "}
          subscription is now active. We've sent a receipt to your email.
        </Text>

        {/* Receipt card */}
        <View
          className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-gray-500">
              Receipt
            </Text>
          </View>

          <View className="px-5 py-4 gap-3">
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-500">Plan</Text>
              <Text className="text-[12.5px] font-bold text-gray-900">
                {planName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-500">Billing</Text>
              <Text className="text-[12.5px] font-bold text-gray-900">
                {billingCycle}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-500">
                Transaction ID
              </Text>
              <Text className="text-[12.5px] font-mono font-bold text-gray-900">
                #{reference}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-500">Next renewal</Text>
              <Text className="text-[12.5px] font-bold text-gray-900">
                {nextRenewal}
              </Text>
            </View>
            <View className="h-px bg-gray-100 my-1" />
            <View className="flex-row justify-between items-baseline">
              <Text className="text-[13px] font-bold text-gray-900">
                Amount paid
              </Text>
              <Text className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                ₦{amount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-1.5 mt-4">
          <Ionicons name="mail-outline" size={13} color="#94a3b8" />
          <Text className="text-[11.5px] text-gray-500">
            Receipt sent to your registered email
          </Text>
        </View>
      </View>

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
          onPress={onDone}
          className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text className="text-white font-bold text-[15px]">
            Back to subscription
          </Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </Pressable>
      </View>
    </View>
  );
}
