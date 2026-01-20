import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Image,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { useToast } from 'react-native-toast-notifications';
import Ionicons from "@expo/vector-icons/Ionicons";

import { RootStackParamList } from "../navigation/types";
import { Order } from "../api/vendor/vendor.types";

type ScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "OrderDetails"
>;
type Props = NativeStackScreenProps<RootStackParamList, "OrderDetails">;
type OrderDetailsRouteProp = Props['route'];

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
      return { label: "Mark as Paid", next: "Paid" as OrderStatus, icon: "checkmark-circle-outline" };
    case "Paid":
      return { label: "Mark as Shipped", next: "Shipped" as OrderStatus, icon: "bicycle-outline" };
    case "Shipped":
      return { label: "Mark as Completed", next: "Completed" as OrderStatus, icon: "flag-outline" };
    default:
      return null;
  }
};

const getInitials = (name: string): string => {
  if (!name) return "??";
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return nameParts[0].slice(0, 2).toUpperCase();
  }
  return (
    nameParts[0].charAt(0).toUpperCase() +
    nameParts[nameParts.length - 1].charAt(0).toUpperCase()
  );
};

const getAvatarColor = (name: string): string => {
  if (!name) return "#2563eb"; 
  const colors = [
    "#2563eb", "#059669", "#dc2626", "#7c3aed", "#ea580c", 
    "#db2777", "#0d9488", "#9333ea", "#ca8a04", 
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function OrderDetailsScreen() {
   const toast = useToast();

  const navigation = useNavigation<ScreenNavigationProp>();
  const route = useRoute<OrderDetailsRouteProp>();
  const { order } = route.params;

  const [status, setStatus] = useState<OrderStatus>(mapStatus(order.status));

  const action = getNextAction(status);

  const handleCall = () => {
    if (order.buyerPhone) {
        Linking.openURL(`tel:${order.buyerPhone}`);
    } else {
        toast.show("No phone number available", { type: "warning" });
    }
  };

  const handleWhatsApp = () => {
      if (order.buyerPhone) {
          // Remove '+' or special chars for whatsapp link if needed, but usually tel link handles it differently.
          // For whatsapp specifically:
          const phone = order.buyerPhone.replace(/[^\d]/g, '');
          const url = `whatsapp://send?phone=${phone}`;
          Linking.openURL(url).catch(() => {
              toast.show("WhatsApp not installed", { type: "warning" });
          });
      } else {
          toast.show("No phone number available", { type: "warning" });
      }
  };

  const avatarColor = getAvatarColor(order.buyerName);
  const initials = getInitials(order.buyerName);

  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Header */}
      <View className="px-5 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between sticky top-0 z-10">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2 rounded-full active:bg-gray-100">
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Order Details</Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
       {/* Order Summary Card */}
       <View className="px-5 py-6 bg-white mb-2 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View>
                    <Text className="text-sm font-medium text-gray-500 mb-1">Order Number</Text>
                    <Text className="text-2xl font-bold text-gray-900">#{order.orderNumber}</Text>
                </View>
                <View
                    className={`px-3 py-1.5 rounded-full ${getStatusColor(status)}`}
                >
                    <Text className={`text-xs font-bold ${
                        getStatusColor(status).includes("text-")
                            ? getStatusColor(status).split(" ").find((c) => c.startsWith("text-"))
                            : "text-gray-700"
                    }`}>
                        {status.toUpperCase()}
                    </Text>
                </View>
            </View>
            
            <View className="flex-row items-center gap-2">
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text className="text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })}
                </Text>
            </View>
       </View>

       {/* Customer Section */}
       <View className="px-5 py-4">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">
                Customer Details
            </Text>

            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <View className="flex-row items-center mb-5">
                    <View 
                        className="w-12 h-12 rounded-full items-center justify-center mr-4 shadow-inner"
                        style={{ backgroundColor: avatarColor }}
                    >
                        <Text className="text-white font-bold text-lg">
                            {initials}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900 mb-0.5">
                            {order.buyerName}
                        </Text>
                        <Text className="text-sm text-gray-500">
                            {order.fulfillmentType === 'delivery' ? 'Delivery Order' : 'Pickup Order'}
                        </Text>
                    </View>
                </View>

                {order.fulfillmentType === 'delivery' && (
                    <View className="flex-row items-start mb-4 bg-gray-50 p-3 rounded-xl">
                        <Ionicons name="location-outline" size={20} color="#4b5563" style={{ marginTop: 2 }} />
                        <View className="ml-3 flex-1">
                            <Text className="text-xs text-gray-500 mb-0.5 font-medium uppercase">Delivery Address</Text>
                            <Text className="text-sm text-gray-900 leading-5">
                                {order.deliveryAddress}
                            </Text>
                            {(order.lga || order.state) && (
                                <Text className="text-sm text-gray-600 mt-0.5">
                                    {order.lga ? `${order.lga}, ` : ''}{order.state}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                <View className="flex-row gap-3">
                    <Pressable 
                        onPress={handleCall}
                        className="flex-1 flex-row items-center justify-center py-3 px-3 bg-white border border-gray-200 rounded-xl active:bg-gray-50 transition-colors"
                    >
                        <Ionicons name="call-outline" size={18} color="#374151" />
                        <Text className="text-sm text-gray-700 ml-2 font-semibold">
                            Call
                        </Text>
                    </Pressable>

                    <Pressable 
                        onPress={handleWhatsApp}
                        className="flex-1 flex-row items-center justify-center py-3 px-3 bg-green-50 border border-green-200 rounded-xl active:bg-green-100 transition-colors"
                    >
                        <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
                        <Text className="text-sm text-green-700 ml-2 font-semibold">
                            WhatsApp
                        </Text>
                    </Pressable>
                </View>
                
                <View className="mt-4 pt-4 border-t border-gray-100 flex-row items-center">
                    <Ionicons name="mail-outline" size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600 ml-2 flex-1" numberOfLines={1}>
                        {order.buyerEmail}
                    </Text>
                </View>
            </View>
       </View>

       {/* Items Section */}
       <View className="px-5 py-2">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">
                Order Items ({order.catalogItems.length})
            </Text>

            <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                {order.catalogItems.map((item: any, index: number) => (
                    <View key={item.id || index} className={`p-4 flex-row ${index !== order.catalogItems.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <View className="w-16 h-16 bg-gray-100 rounded-lg mr-4 overflow-hidden border border-gray-200">
                            <Image
                                source={{ uri: item.image }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        </View>

                        <View className="flex-1 justify-center">
                            <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={2}>
                                {item.name}
                            </Text>
                            <View className="flex-row items-center gap-3">
                                <View className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                    <Text className="text-xs text-gray-600">Qty: {item.quantity}</Text>
                                </View>
                                {(item.size || item.color) && (
                                     <Text className="text-xs text-gray-400">
                                        {[item.size, item.color].filter(Boolean).join(' • ')}
                                     </Text>
                                )}
                            </View>
                        </View>

                        <View className="justify-center items-end pl-2">
                            <Text className="text-base font-bold text-gray-900">
                                ₦{Number(item.price * item.quantity).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </Text>
                            {item.quantity > 1 && (
                                <Text className="text-xs text-gray-400 mt-0.5">
                                    ₦{Number(item.price).toLocaleString()} ea
                                </Text>
                            )}
                        </View>
                    </View>
                ))}
            </View>
       </View>

       {/* Payment Section */}
        <View className="px-5 py-4 mb-24">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">
                Payment Summary
            </Text>
            
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm text-gray-600">Subtotal</Text>
                    <Text className="text-sm font-medium text-gray-900">
                    ₦{Number(order.totalPrice - (order.deliveryCharge || 0)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                    </Text>
                </View>
                
                {order.deliveryCharge > 0 && (
                     <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-sm text-gray-600">Delivery Fee</Text>
                        <Text className="text-sm font-medium text-gray-900">
                        ₦{Number(order.deliveryCharge).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                        </Text>
                    </View>
                )}

                <View className="flex-row items-center justify-between mt-2 pt-4 border-t border-dashed border-gray-200">
                    <Text className="text-base font-bold text-gray-900">Total Amount</Text>
                    <Text className="text-xl font-extrabold text-blue-600">
                    ₦{Number(order.totalPrice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                    </Text>
                </View>
                
                <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <View className="flex-row items-center gap-2">
                        <Ionicons name={status === 'Paid' || status === 'Shipped' || status === 'Completed' ? "card" : "cash-outline"} size={18} color="#6b7280" />
                        <Text className="text-sm text-gray-600">Payment Status</Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded ${status === 'Paid' || status === 'Shipped' || status === 'Completed' ? 'bg-green-100' : 'bg-orange-100'}`}>
                         <Text className={`text-xs font-bold ${status === 'Paid' || status === 'Shipped' || status === 'Completed' ? 'text-green-700' : 'text-orange-700'}`}>
                            {status === 'Paid' || status === 'Shipped' || status === 'Completed' ? 'PAID' : 'PENDING'}
                         </Text>
                    </View>
                </View>
            </View>
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      {action && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Pressable
            onPress={() => setStatus(action.next)}
            className="bg-gray-900 rounded-2xl py-4 flex-row items-center justify-center active:scale-[0.98] transition-transform shadow-lg shadow-gray-900/20"
          >
             {action.icon && <Ionicons name={action.icon as any} size={20} color="white" style={{ marginRight: 8 }} />}
            <Text className="text-white font-bold text-lg">
              {action.label}
            </Text>
          </Pressable>
        </View>
      )}

      {(status === "Completed" || status === "Cancelled") && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-100">
          <View className="bg-gray-100 rounded-2xl py-4 flex-row items-center justify-center border border-gray-200">
             <Ionicons name={status === "Completed" ? "checkmark-done-circle" : "close-circle"} size={20} color={status === "Completed" ? "#059669" : "#dc2626"} style={{ marginRight: 8 }} />
            <Text className={`font-bold text-lg ${status === "Completed" ? "text-green-700" : "text-red-700"}`}>
              {status === "Completed" ? "Order Completed" : "Order Cancelled"}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
