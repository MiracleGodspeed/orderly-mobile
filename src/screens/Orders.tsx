import {
  View,
  Text,
  Pressable,
  RefreshControl,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { Order } from "../api/vendor/vendor.types";
import { useInfiniteOrders } from "../hooks/useInfiniteOrders";
import { OrdersListSkeleton } from "../components/OrderRowSkeleton";
import { prefetchImage } from "../components/AppImage";
import { ScreenHeader } from "../components/ScreenHeader";
import { EndOfList } from "../components/EndOfList";
import { ListSearchBar } from "../components/ListSearchBar";
import { formatRelativeTime } from "../lib/format";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = "all" | "pending" | "paid";

type UIStatus = "Paid" | "Pending" | "Shipped" | "Completed" | "Cancelled";

const mapStatus = (status: string): UIStatus => {
  switch (status?.toLowerCase()) {
    case "success":
      return "Paid";
    case "pending":
      return "Pending";
    default:
      return "Pending";
  }
};

const STATUS_STYLES: Record<
  UIStatus,
  { dot: string; text: string; bg: string; border: string }
> = {
  Paid: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  Pending: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  Shipped: {
    dot: "bg-violet-500",
    text: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  Completed: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  Cancelled: {
    dot: "bg-rose-500",
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-100",
  },
};

const getDateGroup = (date: string) => {
  const today = new Date();
  const created = new Date(date);
  const diffDays =
    (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "Today";
  if (diffDays < 2) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return "Earlier";
};

const getInitials = (name: string): string => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
};

const AVATAR_COLORS = [
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

const getAvatarColor = (name: string): string => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

interface OrderRowProps {
  order: Order;
  onPress: () => void;
}

function OrderRow({ order, onPress }: OrderRowProps) {
  const status = mapStatus(order.status);
  const statusStyle = STATUS_STYLES[status];
  const initials = getInitials(order.buyerName);
  const avatarColor = getAvatarColor(order.buyerName);
  const itemsCount = order.catalogItems?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl px-4 py-3.5 mb-2 border border-gray-100 active:bg-gray-50"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center">
        <View
          className="w-11 h-11 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: avatarColor }}
        >
          <Text className="text-white font-bold text-[13px]">{initials}</Text>
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text
              className="font-bold text-gray-900 text-[15px] flex-1 mr-2"
              numberOfLines={1}
            >
              {order.buyerName || "Customer"}
            </Text>
            <Text className="font-bold text-gray-900 text-[15px]">
              ₦{order.totalPrice.toLocaleString()}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 min-w-0">
              <Text className="text-[12px] text-gray-500 font-medium">
                #{order.orderNumber}
              </Text>
              <Text className="text-[12px] text-gray-300 mx-1.5">·</Text>
              <Text className="text-[12px] text-gray-500" numberOfLines={1}>
                {formatRelativeTime(order.createdAt)}
              </Text>
              {itemsCount > 0 && (
                <>
                  <Text className="text-[12px] text-gray-300 mx-1.5">·</Text>
                  <Text className="text-[12px] text-gray-500">
                    {itemsCount} {itemsCount === 1 ? "item" : "items"}
                  </Text>
                </>
              )}
            </View>

            <View
              className={`flex-row items-center gap-1.5 px-2 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.border} ml-2`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
              />
              <Text
                className={`text-[10px] font-bold ${statusStyle.text}`}
              >
                {status}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function Orders() {
  const navigation = useNavigation<ScreenNavigationProp>();

  // ListSearchBar owns the visible text + debounce; the parent only sees the
  // settled value, so it doesn't re-render on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteOrders({ search: debouncedSearch });

  const allOrders: Order[] = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  );
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Preload order-item thumbnails so OrderDetails opens instantly.
  useEffect(() => {
    allOrders.forEach((order) => {
      order.catalogItems?.forEach((item: any) => prefetchImage(item.image));
    });
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return allOrders;
    return allOrders.filter((order) => {
      const uiStatus = mapStatus(order.status);
      if (activeFilter === "paid") return uiStatus === "Paid";
      if (activeFilter === "pending") return uiStatus === "Pending";
      return true;
    });
  }, [allOrders, activeFilter]);

  const sections = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    filteredOrders.forEach((order) => {
      const key = getDateGroup(order.createdAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(order);
    });
    // Stable display order regardless of map iteration.
    const order = ["Today", "Yesterday", "This Week", "This Month", "Earlier"];
    return order
      .filter((g) => grouped[g]?.length)
      .map((title) => ({ title, data: grouped[title] }));
  }, [filteredOrders]);

  const paidCount = useMemo(
    () => allOrders.filter((o) => mapStatus(o.status) === "Paid").length,
    [allOrders]
  );
  const pendingCount = useMemo(
    () => allOrders.filter((o) => mapStatus(o.status) === "Pending").length,
    [allOrders]
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleOrderTap = useCallback(
    (order: Order) => {
      if (Platform.OS === "ios") {
        Haptics.selectionAsync().catch(() => {});
      }
      navigation.navigate("OrderDetails", { order });
    },
    [navigation]
  );

  const handleFilterTap = (next: FilterType) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setActiveFilter(next);
  };

  // ScrollView-based infinite scroll: trigger the next page when the user
  // gets within 400px of the bottom.
  const fetchingRef = useRef(false);
  fetchingRef.current = isFetchingNextPage;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < 400 && hasNextPage && !fetchingRef.current) {
        fetchNextPage();
      }
    },
    [hasNextPage, fetchNextPage]
  );

  const showInitialSkeleton = isPending && !data;

  // Hero metric scrolls away with the list — purely informational.
  const HeroCard = (
    <View
      className="mx-5 mt-4 mb-4 bg-white rounded-3xl px-5 py-6 border border-gray-100"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-[12px] font-semibold text-gray-500 uppercase tracking-[1.2px]">
          Total Orders
        </Text>
        <View className="bg-blue-50 w-9 h-9 rounded-full items-center justify-center">
          <Ionicons name="receipt-outline" size={18} color="#2563eb" />
        </View>
      </View>

      <Text className="text-[44px] leading-[52px] font-extrabold text-gray-900 tracking-tight">
        {totalCount}
      </Text>
      <Text className="text-[13px] text-gray-500 mt-1">across all time</Text>

      <View className="h-px bg-gray-100 my-4" />

      <View className="flex-row items-center gap-5">
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-emerald-500" />
          <Text className="text-[14px] font-bold text-gray-900">
            {paidCount}
          </Text>
          <Text className="text-[13px] text-gray-500">Paid</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-amber-500" />
          <Text className="text-[14px] font-bold text-gray-900">
            {pendingCount}
          </Text>
          <Text className="text-[13px] text-gray-500">Pending</Text>
        </View>
      </View>
    </View>
  );

  // Search input + filter chips render inside the scrolling list header
  // (where the user wants them visually). The keyboard-dismiss problem is
  // solved by ListSearchBar holding its own text state — the parent only
  // re-renders when the *debounced* value settles, not on every keystroke,
  // and ListSearchBar is React.memo'd so it never re-mounts.
  const SearchAndFilter = (
    <View>
      <View className="px-5 mb-3">
        <ListSearchBar
          placeholder="Search by name, order #..."
          onSearchChange={setDebouncedSearch}
        />
      </View>

      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          keyboardShouldPersistTaps="always"
        >
          {(
            [
              { key: "all", label: "All", count: allOrders.length },
              { key: "pending", label: "Pending", count: pendingCount },
              { key: "paid", label: "Paid", count: paidCount },
            ] as const
          ).map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => handleFilterTap(filter.key)}
                className={`flex-row items-center gap-2 px-4 h-9 rounded-full border ${
                  isActive
                    ? "bg-gray-900 border-gray-900"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    isActive ? "text-white" : "text-gray-700"
                  }`}
                >
                  {filter.label}
                </Text>
                <View
                  className={`px-1.5 rounded-full ${
                    isActive ? "bg-white/20" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      isActive ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {filter.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const EmptyState = (
    <View className="items-center px-8 py-16">
      <View className="w-20 h-20 bg-blue-50 rounded-2xl items-center justify-center mb-5">
        <Ionicons name="receipt-outline" size={36} color="#2563eb" />
      </View>
      <Text className="text-gray-900 text-lg font-bold mb-1.5">
        {debouncedSearch ? "No matches" : "No orders yet"}
      </Text>
      <Text className="text-gray-500 text-center text-sm leading-5 max-w-xs">
        {debouncedSearch
          ? "Try a different name or order number."
          : "Your incoming orders from customers will show up here in real-time."}
      </Text>
    </View>
  );

  return (
    <View className="bg-gray-50 flex-1">
      <ScreenHeader title="Orders" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {HeroCard}
        {SearchAndFilter}

        <View className="px-5">
          {showInitialSkeleton ? (
            <OrdersListSkeleton count={5} />
          ) : sections.length === 0 ? (
            EmptyState
          ) : (
            sections.map((section) => (
              <View key={section.title} className="mt-3">
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2 px-1">
                  {section.title}
                </Text>
                {section.data.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onPress={() => handleOrderTap(order)}
                  />
                ))}
              </View>
            ))
          )}

          <EndOfList
            isFetchingMore={isFetchingNextPage}
            hasNextPage={!!hasNextPage}
            itemCount={filteredOrders.length}
          />
        </View>
      </ScrollView>
    </View>
  );
}
