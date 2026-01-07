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

type ScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

type FilterType = "all" | "pending" | "paid" | "shipped";


type UIStatus =
  | "Paid"
  | "Pending"
  | "Shipped"
  | "Completed"
  | "Cancelled";

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
      return "text-blue-600";
    case "Pending":
      return "text-orange-600";
    case "Shipped":
      return "text-purple-600";
    case "Completed":
      return "text-green-600";
    case "Cancelled":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
};

const getDateGroup = (date: string) => {
  const today = new Date();
  const created = new Date(date);

  const diffDays =
    (today.getTime() - created.getTime()) /
    (1000 * 60 * 60 * 24);

  if (diffDays < 1) return "Today";
  if (diffDays < 2) return "Yesterday";
  return "Earlier";
};


export default function Orders() {
  const navigation = useNavigation<ScreenNavigationProp>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<FilterType>("all");


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
        order.buyerName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        order.orderNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

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


  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="flex-1">
        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center mb-4">
            <Pressable
              className="mr-3"
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color="#000"
              />
            </Pressable>
            <Text className="text-lg font-medium text-gray-900">
              Orders
            </Text>
          </View>

         <View className="flex-row items-center px-4 py-4 border-b border-gray-200 bg-white">
            <View className="flex-1 items-center border rounded p-2 border-[#2D6EEF]">
              <View className="flex-row items-center mb-1">
                <Text className="text-2xl font-bold text-gray-900 mr-2">
                  {totalOrders}
                </Text>
                <View className="bg-blue-100 p-1.5 rounded-full">
                  {/* <MaterialIcons name="inventory-2" size={16} color="#004496" /> */}
                <Ionicons name="cube-outline" size={16} color="#004496" />

                </View>
              </View>
              <Text className="text-xs text-gray-600">Total Orders</Text>
            </View>

            {/* <View className="w-px h-10 bg-gray-200" /> */}

            <View className="flex-1 items-center border rounded p-2 mx-4 border-[#057A55]">
              <View className="flex-row items-center mb-1">
                <Text className="text-2xl font-bold text-gray-900 mr-2">
                  {activeOrders}
                </Text>
                <View className="bg-green-100 p-1.5 rounded-full">
                <Ionicons name="cube-outline" size={16} color="#057A55" />

                </View>
              </View>
              <Text className="text-xs text-gray-600">Active Orders</Text>
            </View>

            {/* <View className="w-px h-10 bg-gray-200" /> */}

            <View className="flex-1 items-center border rounded p-2 border-[#E17100]">
              <View className="flex-row items-center mb-1">
                <Text className="text-2xl font-bold text-gray-900 mr-2">
                  {pendingOrders}
                </Text>
                <View className="bg-orange-100 p-1.5 rounded-full">
                <Ionicons name="cube-outline" size={16} color="#E17100" />

                </View>
              </View>
              <Text className="text-xs text-gray-600">Pending Orders</Text>
            </View>
         </View>


          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-3">
            <MaterialIcons
              name="search"
              size={20}
              color="#9ca3af"
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-base"
              placeholder="Search orders"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["all", "pending", "paid"].map((filter) => (
              <Pressable
                key={filter}
                onPress={() =>
                  setActiveFilter(filter as FilterType)
                }
                className={`px-4 py-2 rounded-full mr-2 ${
                  activeFilter === filter
                    ? "bg-blue-600"
                    : "bg-gray-100"
                }`}
              >
                <Text
                  className={`font-medium ${
                    activeFilter === filter
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView className="flex-1 px-4">
          {loading && (
            <ActivityIndicator
              size="large"
              className="mt-10"
            />
          )}

          {!loading &&
            Object.entries(groupedOrders).map(
              ([dateGroup, groupOrders]) => (
                <View key={dateGroup}>
                  <Text className="text-sm text-gray-500 font-medium mt-4 mb-3">
                    {dateGroup}
                  </Text>

                  {groupOrders.map((order) => {
                    const status = mapStatus(order.status);

                    return (
                      <Pressable
                        key={order.id}
                        onPress={() =>
                          navigation.navigate(
                            "OrderDetails",
                            { order }
                          )
                        }
                        className="bg-white rounded-xl p-4 mb-3 border border-gray-200"
                      >
                        <View className="flex-row justify-between">
                          <View>
                            <Text className="font-semibold text-gray-900">
                              {order.buyerName}
                            </Text>
                            <Text
                              className={`text-sm ${getStatusColor(
                                status
                              )}`}
                            >
                              {status}
                            </Text>
                          </View>

                          <View className="items-end">
                            <Text className="font-bold">
                             ₦{order.totalPrice.toFixed(2).toLocaleString()}
                            </Text>
                            <Text className="text-sm text-gray-500">
                              {order.orderNumber}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )
            )}

          {!loading && filteredOrders.length === 0 && (
            <View className="items-center py-12">
              <MaterialIcons
                name="receipt-long"
                size={64}
                color="#d1d5db"
              />
              <Text className="text-gray-500 mt-4">
                No orders found
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}