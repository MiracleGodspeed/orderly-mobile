import { View, Text, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type Props = {
  onDone: () => void;
};

export default function SubscriptionSuccessStep({ onDone }: Props) {
  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center px-5 pt-4 pb-3">
        <Text className="text-lg font-semibold text-gray-900">
          Confirmation
        </Text>
        <Pressable onPress={onDone}>
          <MaterialIcons name="close" size={24} color="#111827" />
        </Pressable>
      </View>

      <View className="flex-1 px-5 justify-center">
        <View className="items-center mb-8">
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "#d1fae5",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="check" size={60} color="#10b981" />
          </View>
        </View>

        <Text className="text-2xl font-bold text-center text-gray-900 mb-3">
          Subscription Renewed!
        </Text>

        <Text className="text-center text-gray-600 mb-8 px-4" style={{ lineHeight: 22 }}>
          You have successfully renewed your{" "}
          <Text className="font-semibold text-gray-900">Pro</Text> plan. A
          confirmation email has been sent to you.
        </Text>

        <View className="bg-white border border-gray-200 rounded-xl p-4 mb-8">
          <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100">
            <Text className="text-sm text-gray-600">Transaction ID</Text>
            <Text className="text-sm font-semibold text-gray-900">#TRX-88392</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-600">Amount Paid</Text>
            <Text className="text-base font-bold text-gray-900">₦29,000</Text>
          </View>
        </View>
      </View>

      <View className="px-5 py-4 border-t border-gray-100 mb-6">
        <Pressable
          onPress={onDone}
          className="bg-blue-600 rounded-xl py-4 items-center"
        >
          <Text className="text-white font-semibold text-base">Done</Text>
        </Pressable>
      </View>
    </View>
  );
}