import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/types";

type ScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "OrderDetails"
>;
type OrderDetailsRouteProp = RouteProp<RootStackParamList, "OrderDetails">;

export type OrderStatus =
  | "Paid"
  | "Pending"
  | "Shipped"
  | "Completed"
  | "Cancelled";

const mapStatus = (status: string): OrderStatus => {
  switch (status.toLowerCase()) {
    case "success":
      return "Paid";
    case "pending":
      return "Pending";
    default:
      return "Pending";
  }
};

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case "Paid":
      return "bg-green-100 text-green-700";
    case "Pending":
      return "bg-orange-100 text-orange-700";
    case "Shipped":
      return "bg-purple-100 text-purple-700";
    case "Completed":
      return "bg-blue-100 text-blue-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getNextAction = (status: OrderStatus) => {
  switch (status) {
    case "Pending":
      return { label: "Mark as Paid", next: "Paid" as OrderStatus };
    case "Paid":
      return { label: "Mark as Shipped", next: "Shipped" as OrderStatus };
    case "Shipped":
      return { label: "Mark as Completed", next: "Completed" as OrderStatus };
    default:
      return null;
  }
};

export default function OrderDetailsScreen() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const route = useRoute<OrderDetailsRouteProp>();
  const { order } = route.params;

  const [status, setStatus] = useState<OrderStatus>(mapStatus(order.status));

  const action = getNextAction(status);

  return (
    <SafeAreaView className="bg-white flex-1" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="px-4 py-3">
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-1">
            {order.orderNumber}
          </Text>
          <Text className="text-sm text-gray-500 mb-3">
            {new Date(order.createdAt).toLocaleString()}
          </Text>

          <View
            className={`self-start px-3 py-1 rounded-md ${getStatusColor(status)}`}
          >
            <Text className="text-sm font-medium">{status}</Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm text-gray-600 mb-3">Customer</Text>
          <Text className="text-base font-semibold text-gray-900 mb-3">
            {order.buyerName}
          </Text>

          <View className="flex-row items-center mb-2">
            <MaterialIcons name="email" size={18} color="#6b7280" />
            <Text className="text-sm text-gray-700 ml-2">{order.buyerEmail}</Text>
          </View>

          <View className="flex-row items-center">
            <MaterialIcons name="phone" size={18} color="#6b7280" />
            <Text className="text-sm text-gray-700 ml-2">{order.buyerPhone}</Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm text-gray-600 mb-3">Items</Text>

          {order.catalogItems.map((item: any) => (
            <View key={item.id} className="flex-row items-center mb-4">
              <View className="w-12 h-12 bg-gray-100 rounded-lg mr-3 overflow-hidden">
                <Image
                  source={{ uri: item.image }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>

              <View className="flex-1">
                <Text className="text-base text-gray-900 mb-1">{item.name}</Text>
                <Text className="text-sm text-gray-500">Qty: {item.quantity}</Text>
              </View>

              <Text className="text-base font-semibold text-gray-900">
                ₦{Number(item.price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          ))}
        </View>

        <View className="mb-6">
          <Text className="text-sm text-gray-600 mb-3">Payment</Text>

          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-700">Subtotal</Text>
            <Text className="text-sm text-gray-900">
              ₦{Number(order.totalPrice).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          <View className="flex-row items-center justify-between mb-4 pt-3 border-t border-gray-200">
            <Text className="text-base font-semibold text-gray-900">Total Paid</Text>
            <Text className="text-lg font-bold text-gray-900">
              ₦{Number(order.amountPaid).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-700">Payment Status</Text>
            <Text className="text-sm font-semibold text-green-600">{status}</Text>
          </View>
        </View>
      </ScrollView>

      {action && (
        <View className="px-4 py-4 border-t border-gray-200 mb-6">
          <Pressable
            onPress={() => setStatus(action.next)}
            className="bg-blue-600 rounded-xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              {action.label}
            </Text>
          </Pressable>
        </View>
      )}

      {(status === "Completed" || status === "Cancelled") && (
        <View className="px-4 py-4 border-t border-gray-200 mb-6">
          <View className="bg-gray-400 rounded-xl py-4 items-center opacity-50">
            <Text className="text-white font-semibold text-base">
              {status === "Completed" ? "Order Completed" : "Order Cancelled"}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
