import { View, Text, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type Props = {
  plan: {
    name: string;
    price: number;
  };
  billingCycle: string;
  onBack: () => void;
  onPay: () => void;
};

export default function PaymentMethodStep({
  plan,
  billingCycle,
  onBack,
  onPay,
}: Props) {
  return (
    <View className="px-5 pt-4 pb-8 flex-1">
      <View className="flex-row items-center mb-6">
        <Pressable onPress={onBack} className="mr-3">
          <MaterialIcons name="arrow-back" size={24} />
        </Pressable>
        <Text className="text-lg font-semibold">Payment Method</Text>
      </View>

      <View className="bg-gray-50 rounded-2xl p-5 mb-6">
        <Text className="font-semibold mb-1">
          {plan.name} Plan
        </Text>
        <Text className="text-gray-500 mb-3">
          {billingCycle} billing
        </Text>

        <View className="flex-row justify-between">
          <Text className="text-gray-600">Total</Text>
          <Text className="text-lg font-bold">
            ₦{plan.price.toLocaleString()}
          </Text>
        </View>
      </View>

      <Text className="font-semibold mb-3">Select payment method</Text>

      <Pressable className="border border-gray-200 rounded-xl p-4 flex-row justify-between items-center mb-4">
        <Text className="font-medium">Debit / Credit Card</Text>
        <MaterialIcons name="chevron-right" size={22} />
      </Pressable>

      <Pressable className="border border-gray-200 rounded-xl p-4 flex-row justify-between items-center mb-8">
        <Text className="font-medium">Bank Transfer</Text>
        <MaterialIcons name="chevron-right" size={22} />
      </Pressable>

      <Pressable
        onPress={onPay}
        className="bg-blue-600 rounded-xl py-4 items-center mt-auto"
      >
        <Text className="text-white font-semibold text-base">
          Pay ₦{plan.price.toLocaleString()}
        </Text>
      </Pressable>
    </View>
  );
}
