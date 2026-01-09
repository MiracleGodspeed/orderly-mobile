import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/types";
import { getPaidOrders } from "../api/vendor/vendor.api";
import { Order } from "../api/vendor/vendor.types";
import Ionicons from "@expo/vector-icons/Ionicons";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = "all" | "pending" | "paid" | "shipped";

type UIStatus = "Paid" | "Pending" | "Shipped" | "Completed" | "Cancelled";

const mapStatus = (status: string): UIStatus => {
  switch (status.toLowerCase()) {
    case "success":
      return "Paid";
    case "pending":
      return "Pending";
    default:
      return "Pending";
  }
};

const getStatusColor = (status: UIStatus) => {
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

const getDateGroup = (date: string) => {
  const today = new Date();
  const created = new Date(date);

  const diffDays =
    (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 1) return "Today";
  if (diffDays < 2) return "Yesterday";
  return "Earlier";
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
    "#2563eb", 
    "#059669", 
    "#dc2626", 
    "#7c3aed", 
    "#ea580c", 
    "#db2777", 
    "#0d9488", 
    "#9333ea", 
    "#ca8a04", 
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export default function Orders() {
  const navigation = useNavigation<ScreenNavigationProp>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getPaidOrders({
        pageIndex: 1,
        pageSize: 20,
      });

      setOrders(res.data);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const uiStatus = mapStatus(order.status);

      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "paid"
          ? uiStatus === "Paid"
          : activeFilter === "pending"
          ? uiStatus === "Pending"
          : true;

      return matchesSearch && matchesFilter;
    });
  }, [orders, searchQuery, activeFilter]);

  const groupedOrders = useMemo(() => {
    return filteredOrders.reduce((groups, order) => {
      const group = getDateGroup(order.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(order);
      return groups;
    }, {} as Record<string, Order[]>);
  }, [filteredOrders]);

  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (o) => mapStatus(o.status) !== "Completed"
  ).length;
  const pendingOrders = orders.filter(
    (o) => mapStatus(o.status) === "Pending"
  ).length;

  if (loading) {
    return (
      <SafeAreaView className="bg-gray-50 flex-1" edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-600 mt-4">Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <ScrollView className="flex-1">
        <View className="bg-white px-4 py-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={28} color="#1f2937" />
            </Pressable>
            
            <View className="w-7" />
          </View>
        </View>

        <View className="px-4">
          <View className="bg-[#194eb8] rounded-2xl p-6 mb-6 shadow-lg">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-blue-500/30 rounded-2xl items-center justify-center mr-4">
                <Ionicons name="receipt-outline" size={32} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold mb-1">
                  Order Management
                </Text>
                <Text className="text-blue-100 text-sm">
                  Track and manage orders
                </Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
            <View className="flex-row justify-between">
              <View className="flex-1 items-center">
                <View className="w-14 h-14 bg-blue-100 rounded-xl items-center justify-center mb-3">
                  <Ionicons name="cube-outline" size={24} color="#2563eb" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  {totalOrders}
                </Text>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  Total
                </Text>
              </View>

              <View className="flex-1 items-center">
                <View className="w-14 h-14 bg-green-100 rounded-xl items-center justify-center mb-3">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color="#16a34a"
                  />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  {activeOrders}
                </Text>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  Active
                </Text>
              </View>

              <View className="flex-1 items-center">
                <View className="w-14 h-14 bg-orange-100 rounded-xl items-center justify-center mb-3">
                  <Ionicons name="time-outline" size={24} color="#ea580c" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-1">
                  {pendingOrders}
                </Text>
                <Text className="text-xs text-gray-500 uppercase tracking-wide">
                  Pending
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-sm">
              <MaterialIcons name="search" size={22} color="#9ca3af" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="search orders..."
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View className="mb-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "paid", label: "Paid" },
              ].map((filter) => (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key as FilterType)}
                  className={`px-5 py-2.5 rounded-xl mr-2 ${
                    activeFilter === filter.key
                      ? "bg-blue-600"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <Text
                    className={`font-semibold text-sm ${
                      activeFilter === filter.key
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView className="flex-1 px-4">
            {loading && <ActivityIndicator size="large" className="mt-10" />}

            {!loading &&
              Object.entries(groupedOrders).map(([dateGroup, groupOrders]) => (
                <View key={dateGroup} className="mb-6">
                  <Text className="text-sm text-gray-500 font-medium mt-4 mb-3">
                    {dateGroup}
                  </Text>

                  {groupOrders.map((order) => {
                    const status = mapStatus(order.status);
                    const initials = getInitials(order.buyerName);
                    const avatarColor = getAvatarColor(order.buyerName);

                    return (
                      <Pressable
                        key={order.id}
                        onPress={() =>
                          navigation.navigate("OrderDetails", { order })
                        }
                        className="bg-white rounded-xl p-4 mb-3 border border-gray-200"
                      >
                        <View className="flex-row items-center">
                          <View
                            className="w-12 h-12 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: avatarColor }}
                          >
                            <Text className="text-white font-bold text-base">
                              {initials}
                            </Text>
                          </View>

                          <View className="flex-1 flex-row justify-between items-center">
                            <View>
                              <Text className="font-semibold text-gray-900 text-base">
                                {order.buyerName}
                              </Text>
                              <View className="flex-row items-center mt-1">
                                <View
                                  className={`px-2 py-1 rounded-full ${getStatusColor(
                                    status
                                  )}`}
                                >
                                  <Text
                                    className={`text-xs font-medium ${
                                      getStatusColor(status).includes("text-")
                                        ? getStatusColor(status)
                                            .split(" ")
                                            .find((c) => c.startsWith("text-"))
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {status}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View className="items-end">
                              <Text className="font-bold text-gray-900 text-base">
                                ₦
                                {order.totalPrice
                                  .toFixed(2)
                                  .toLocaleString()}
                              </Text>
                              <Text className="text-sm text-gray-500 mt-1">
                                {order.orderNumber}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}

            {!loading && filteredOrders.length === 0 && (
              <View className="items-center py-12">
                <MaterialIcons name="receipt-long" size={64} color="#d1d5db" />
                <Text className="text-gray-500 mt-4">No orders found</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}