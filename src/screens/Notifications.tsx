import {
  View,
  Text,
  Pressable,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { RootStackParamList } from "../navigation/types";
import { AppNotification, NotificationType } from "../api/vendor/vendor.types";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/vendor/vendor.api";
import { formatRelativeTime } from "../lib/format";
import { ScreenHeader } from "../components/ScreenHeader";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface TypeStyle {
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  accent: string;
  label: string;
}

const TYPE_STYLES: Record<string, TypeStyle> = {
  order: {
    icon: "bag-handle",
    iconColor: "#0d9488",
    iconBg: "#ccfbf1",
    accent: "#14b8a6",
    label: "Order",
  },
  stock: {
    icon: "warning",
    iconColor: "#b45309",
    iconBg: "#fef3c7",
    accent: "#f59e0b",
    label: "Stock",
  },
  payout: {
    icon: "checkmark-circle",
    iconColor: "#047857",
    iconBg: "#d1fae5",
    accent: "#10b981",
    label: "Payout",
  },
  performance: {
    icon: "trending-up",
    iconColor: "#1d4ed8",
    iconBg: "#dbeafe",
    accent: "#3b82f6",
    label: "Insights",
  },
  subscription: {
    icon: "star",
    iconColor: "#7c3aed",
    iconBg: "#ede9fe",
    accent: "#a855f7",
    label: "Plan",
  },
};
const FALLBACK_STYLE: TypeStyle = {
  icon: "information-circle",
  iconColor: "#1d4ed8",
  iconBg: "#dbeafe",
  accent: "#3b82f6",
  label: "Update",
};
const styleFor = (type: NotificationType) =>
  TYPE_STYLES[type as string] ?? FALLBACK_STYLE;

const ROUTE_FALLBACK: Record<string, keyof RootStackParamList> = {
  order: "Orders",
  stock: "ProductsList",
  payout: "PayoutSettings",
  performance: "ReportsAnalytics",
  subscription: "SubscriptionBilling",
};

// Same date-group logic Orders uses, kept consistent across the app so
// the section headers feel familiar.
const getDateGroup = (iso: string) => {
  const today = new Date();
  const created = new Date(iso);
  const diffDays =
    (today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "Today";
  if (diffDays < 2) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return "Earlier";
};
const SECTION_ORDER = ["Today", "Yesterday", "This Week", "This Month", "Earlier"];

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function Notifications() {
  const toast = useToast();
  const navigation = useNavigation<ScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const result = await getNotifications({ pageIndex: 1, pageSize: 50 });
        setNotifications(result.data);
      } catch (err: any) {
        console.error("Failed to load notifications:", err);
        if (!silent) {
          toast.show(err?.message || "Couldn't load notifications", {
            type: "danger",
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchNotifications(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(
    () =>
      activeFilter === "unread"
        ? notifications.filter((n) => !n.isRead)
        : notifications,
    [notifications, activeFilter]
  );

  const sections = useMemo(() => {
    const grouped: Record<string, AppNotification[]> = {};
    filteredNotifications.forEach((n) => {
      const key = getDateGroup(n.createdAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(n);
    });
    return SECTION_ORDER.filter((g) => grouped[g]?.length).map((title) => ({
      title,
      data: grouped[title],
    }));
  }, [filteredNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const handleMarkAllRead = async () => {
    if (markingAllRead || unreadCount === 0) return;
    haptic();
    try {
      setMarkingAllRead(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.show("All caught up", { type: "success" });
    } catch (err: any) {
      toast.show(err?.message || "Couldn't mark all as read", {
        type: "danger",
      });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    haptic();
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
      markNotificationAsRead(notification.id).catch(() => {
        // Best-effort — local state already updated.
      });
    }

    const route =
      notification.route ||
      ROUTE_FALLBACK[notification.type as string] ||
      null;
    if (!route) return;

    let params: any = undefined;
    if (notification.routeParams) {
      try {
        params = JSON.parse(notification.routeParams);
      } catch {
        // Bad JSON — navigate without params.
      }
    }
    navigation.navigate(route as any, params);
  };

  const renderRow = (item: AppNotification) => {
    const style = styleFor(item.type);
    return (
      <Pressable
        key={item.id}
        onPress={() => handleNotificationPress(item)}
        className="bg-white rounded-2xl mb-2 overflow-hidden border border-gray-100 active:bg-gray-50"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View className="flex-row">
          {/* Type-tinted accent strip on the left — color-codes the row at
              a glance without taking the icon disk's job. */}
          <View
            style={{ backgroundColor: style.accent, width: 4 }}
          />
          <View className="flex-row flex-1 p-3.5">
            <View
              className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: style.iconBg }}
            >
              <Ionicons name={style.icon} size={20} color={style.iconColor} />
            </View>

            <View className="flex-1 mr-2">
              <View className="flex-row items-center justify-between mb-0.5">
                <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
                  <Text
                    className={`text-[10px] font-extrabold uppercase tracking-[1.2px]`}
                    style={{ color: style.accent }}
                  >
                    {style.label}
                  </Text>
                  {!item.isRead && (
                    <View className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}
                </View>
                <Text className="text-[11px] text-gray-400 font-medium">
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
              <Text
                className={`text-[14.5px] tracking-tight ${
                  item.isRead
                    ? "text-gray-900 font-semibold"
                    : "text-gray-900 font-extrabold"
                }`}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text
                className="text-[12.5px] text-gray-500 leading-[18px] mt-1"
                numberOfLines={3}
              >
                {item.message}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={14}
              color="#cbd5e1"
              style={{ alignSelf: "center" }}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  const HeroCard = (
    <View
      className="mx-5 mt-4 mb-4 rounded-3xl overflow-hidden px-5 py-5"
      style={{ backgroundColor: "#194eb8" }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-10 h-10 rounded-2xl bg-white/15 border border-white/15 items-center justify-center">
              <Ionicons name="notifications" size={18} color="white" />
            </View>
            <Text className="text-white/80 text-[10.5px] font-extrabold uppercase tracking-[1.4px]">
              Inbox
            </Text>
          </View>
          {unreadCount > 0 ? (
            <>
              <Text className="text-white text-[28px] font-extrabold tracking-tight leading-[32px]">
                {unreadCount} new{" "}
                <Text className="text-white/80">
                  update{unreadCount === 1 ? "" : "s"}
                </Text>
              </Text>
              <Text className="text-white/75 text-[12.5px] mt-1">
                Tap a card to open the relevant screen
              </Text>
            </>
          ) : (
            <>
              <Text className="text-white text-[24px] font-extrabold tracking-tight leading-[28px]">
                You're all caught up
              </Text>
              <Text className="text-white/75 text-[12.5px] mt-1">
                We'll let you know when something happens
              </Text>
            </>
          )}
        </View>
      </View>

      {unreadCount > 0 && (
        <Pressable
          onPress={handleMarkAllRead}
          disabled={markingAllRead}
          className="mt-4 self-start flex-row items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-3 h-8 active:bg-white/20"
        >
          {markingAllRead ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="checkmark-done" size={13} color="white" />
          )}
          <Text className="text-white text-[12px] font-extrabold">
            {markingAllRead ? "Marking…" : "Mark all read"}
          </Text>
        </Pressable>
      )}
    </View>
  );

  const FilterChips = (
    <View className="flex-row px-5 mb-3">
      {(
        [
          { key: "all", label: "All", count: notifications.length },
          { key: "unread", label: "Unread", count: unreadCount },
        ] as const
      ).map((filter) => {
        const isActive = activeFilter === filter.key;
        return (
          <Pressable
            key={filter.key}
            onPress={() => {
              haptic();
              setActiveFilter(filter.key);
            }}
            className={`flex-row items-center gap-2 px-4 h-9 rounded-full border mr-2 ${
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
            {filter.count > 0 && (
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
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const EmptyState = (
    <View className="items-center px-8 py-16">
      <View className="w-20 h-20 bg-blue-50 rounded-2xl items-center justify-center mb-5">
        <Ionicons
          name={
            activeFilter === "unread"
              ? "checkmark-done-circle"
              : "notifications-outline"
          }
          size={36}
          color="#2563eb"
        />
      </View>
      <Text className="text-gray-900 text-lg font-bold mb-1.5">
        {activeFilter === "unread" ? "No unread notifications" : "Nothing yet"}
      </Text>
      <Text className="text-gray-500 text-center text-sm leading-5 max-w-xs">
        {activeFilter === "unread"
          ? "You've read everything — nice."
          : "We'll notify you about orders, payouts, and other store activity."}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ScreenHeader title="Notifications" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenHeader title="Notifications" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {HeroCard}
        {FilterChips}

        <View className="px-5">
          {sections.length === 0 ? (
            EmptyState
          ) : (
            sections.map((section) => (
              <View key={section.title} className="mt-3">
                <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-2 px-1">
                  {section.title}
                </Text>
                {section.data.map(renderRow)}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
