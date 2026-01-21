import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useEffect, useMemo, useState, useRef } from "react";
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

const PAGE_SIZE = 10;

export default function Orders() {
  const navigation = useNavigation<ScreenNavigationProp>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchOrders(1, "");
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const fetchOrders = async (pageIndex: number = 1, search: string = "", isSearching: boolean = false) => {
    try {
      if (isSearching) {
        setSearching(true);
      } else {
        setLoading(true);
      }

      const res = await getPaidOrders({
        pageIndex,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined,
      });

      setOrders(res.data);
      setTotalCount(res.totalCount);
      
      // Calculate totalPages fallback
      const calculatedPages = res.totalPages > 0 
        ? res.totalPages 
        : Math.ceil(res.totalCount / PAGE_SIZE);
      
      setTotalPages(calculatedPages);
      setCurrentPage(pageIndex);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchOrders(1, text, true);
    }, 500);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchOrders(page, searchQuery);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const uiStatus = mapStatus(order.status);

      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "paid"
          ? uiStatus === "Paid"
          : activeFilter === "pending"
          ? uiStatus === "Pending"
          : true;

      return matchesFilter;
    });
  }, [orders, activeFilter]);

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

      <View className="px-5 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between sticky top-0 z-10">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2 rounded-full active:bg-gray-100">
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Orders</Text>
        </View>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Stats Overview - Fixed Grid */}
        <View className="flex-row px-5 py-5 gap-3">
           <View className="flex-1 bg-blue-600 rounded-xl p-3 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                 <View className="bg-blue-500/30 p-1.5 rounded-lg">
                    <Ionicons name="receipt-outline" size={16} color="white" />
                 </View>
              </View>
              <Text className="text-2xl font-bold text-white mb-0.5" numberOfLines={1} adjustsFontSizeToFit>{totalOrders}</Text>
              <Text className="text-blue-100 text-xs font-medium" numberOfLines={1} adjustsFontSizeToFit>Total</Text>
           </View>

           <View className="flex-1 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                 <View className="bg-green-100 p-1.5 rounded-lg">
                    <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                 </View>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-0.5" numberOfLines={1} adjustsFontSizeToFit>{activeOrders}</Text>
              <Text className="text-gray-500 text-xs font-medium" numberOfLines={1} adjustsFontSizeToFit>Active</Text>
           </View>

           <View className="flex-1 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                 <View className="bg-orange-100 p-1.5 rounded-lg">
                    <Ionicons name="time-outline" size={16} color="#ea580c" />
                 </View>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-0.5" numberOfLines={1} adjustsFontSizeToFit>{pendingOrders}</Text>
              <Text className="text-gray-500 text-xs font-medium" numberOfLines={1} adjustsFontSizeToFit>Pending</Text>
           </View>
        </View>

        <View className="px-5">
            {/* Search Bar */}
            <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 h-12 shadow-sm mb-6">
                {searching ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                    <Ionicons name="search-outline" size={20} color="#9ca3af" />
                )}
                <TextInput
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    className="flex-1 ml-3 text-base text-gray-900 h-full"
                    placeholder="Search orders..."
                    placeholderTextColor="#9ca3af"
                />
            </View>

            {/* Filter Tabs */}
            <View className="mb-6">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                    { key: "all", label: "All" },
                    { key: "pending", label: "Pending" },
                    { key: "paid", label: "Paid" },
                ].map((filter) => {
                    const isActive = activeFilter === filter.key;
                    return (
                        <Pressable
                        key={filter.key}
                        onPress={() => setActiveFilter(filter.key as FilterType)}
                        className={`px-5 py-2 rounded-full border ${
                            isActive
                            ? "bg-gray-900 border-gray-900"
                            : "bg-white border-gray-200"
                        }`}
                        >
                        <Text
                            className={`font-semibold text-sm ${
                            isActive
                                ? "text-white"
                                : "text-gray-600"
                            }`}
                        >
                            {filter.label}
                        </Text>
                        </Pressable>
                    );
                })}
                </ScrollView>
            </View>

            {/* Orders List */}
            {loading ? (
                 <View className="items-center py-20">
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : filteredOrders.length === 0 ? (
                <View className="items-center py-20 px-6">
                    <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                        <Ionicons name="receipt-outline" size={40} color="#9ca3af" />
                    </View>
                    <Text className="text-gray-900 text-lg font-semibold mb-2">No orders found</Text>
                    <Text className="text-gray-500 text-center text-sm max-w-xs">
                        {searchQuery ? "Try adjusting your search terms" : "Orders will appear here once customers start buying"}
                    </Text>
                </View>
            ) : (
              <View className="pb-32">
                {Object.entries(groupedOrders).map(([dateGroup, groupOrders]) => (
                    <View key={dateGroup} className="mb-6">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">
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
                            className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 active:scale-[0.99] transition-transform"
                             style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.04,
                                shadowRadius: 8,
                                elevation: 2,
                            }}
                        >
                            <View className="flex-row justify-between mb-4">
                                <View className="flex-row items-center gap-3">
                                    <View
                                        className="w-10 h-10 rounded-full items-center justify-center shadow-inner"
                                        style={{ backgroundColor: avatarColor }}
                                    >
                                        <Text className="text-white font-bold text-sm">
                                        {initials}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text className="font-bold text-gray-900 text-base">
                                            {order.buyerName}
                                        </Text>
                                        <Text className="text-gray-400 text-xs font-medium">
                                            #{order.orderNumber}
                                        </Text>
                                    </View>
                                </View>
                                <View
                                    className={`px-3 py-1 rounded-full self-start ${getStatusColor(
                                        status
                                    )}`}
                                    >
                                    <Text
                                        className={`text-xs font-bold ${
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

                            <View className="border-t border-gray-50 pt-3 flex-row justify-between items-center">
                                <View className="flex-row items-center gap-1.5">
                                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                                    <Text className="text-gray-400 text-xs font-medium">
                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <Text className="font-extrabold text-gray-900 text-lg">
                                    ₦{order.totalPrice.toLocaleString()}
                                </Text>
                            </View>
                        </Pressable>
                        );
                    })}
                    </View>
                ))}

                {/* Pagination Component */}
                {totalPages > 1 && (
                    <View className="flex-row items-center justify-center py-6 gap-2">
                        <Pressable 
                            onPress={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`w-10 h-10 rounded-xl items-center justify-center border ${currentPage === 1 ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white shadow-sm'}`}
                        >
                            <MaterialIcons name="chevron-left" size={24} color={currentPage === 1 ? "#d1d5db" : "#374151"} />
                        </Pressable>
                        
                        <View className="flex-row items-center gap-2">
                            {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                const isSelected = pageNum === currentPage;
                                
                                if (totalPages > 5) {
                                    if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                                        if (Math.abs(pageNum - currentPage) === 2) {
                                            return <Text key={`dot-${pageNum}`} className="text-gray-400">...</Text>;
                                        }
                                        return null;
                                    }
                                }

                                return (
                                    <Pressable
                                        key={pageNum}
                                        onPress={() => handlePageChange(pageNum)}
                                        className={`w-10 h-10 rounded-xl items-center justify-center border ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-200 bg-white shadow-sm'}`}
                                    >
                                        <Text className={`font-bold ${isSelected ? 'text-white' : 'text-gray-700'}`}>{pageNum}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Pressable 
                            onPress={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`w-10 h-10 rounded-xl items-center justify-center border ${currentPage === totalPages ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white shadow-sm'}`}
                        >
                            <MaterialIcons name="chevron-right" size={24} color={currentPage === totalPages ? "#d1d5db" : "#374151"} />
                        </Pressable>
                    </View>
                )}
              </View>
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}