import {
  View,
  Text,
  Pressable,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
  Modal,
} from "react-native";
import { useCallback, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { RootStackParamList } from "../navigation/types";
import { AppNotification, NotificationType } from "../api/vendor/vendor.types";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/vendor/vendor.api";
import {
  useNotifications,
  useInvalidateNotifications,
} from "../hooks/useNotifications";
import { formatRelativeTime, parseBackendDate } from "../lib/format";
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

// Muted, mature palette — same hue families as before but desaturated
// + darker so the row reads as "professional dashboard" rather than
// "kid-colourful". Each type still gets a distinct identity, but the
// page no longer looks like five different brands stacked.
const TYPE_STYLES: Record<string, TypeStyle> = {
  order: {
    icon: "bag-handle",
    iconColor: "#0f766e",
    iconBg: "#f0fdfa",
    accent: "#0d9488",
    label: "Order",
  },
  stock: {
    icon: "warning",
    iconColor: "#a16207",
    iconBg: "#fefce8",
    accent: "#ca8a04",
    label: "Stock",
  },
  payout: {
    icon: "checkmark-circle",
    iconColor: "#15803d",
    iconBg: "#f0fdf4",
    accent: "#16a34a",
    label: "Payout",
  },
  performance: {
    icon: "trending-up",
    iconColor: "#1e40af",
    iconBg: "#eff6ff",
    accent: "#2563eb",
    label: "Insights",
  },
  subscription: {
    icon: "star",
    iconColor: "#6d28d9",
    iconBg: "#f5f3ff",
    accent: "#7c3aed",
    label: "Plan",
  },
};
const FALLBACK_STYLE: TypeStyle = {
  icon: "information-circle",
  iconColor: "#475569",
  iconBg: "#f8fafc",
  accent: "#64748b",
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
  const created = parseBackendDate(iso);
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

  // React Query handles caching, background refresh, and observer-based
  // gcTime — reopening this screen feels instant when the cache is warm
  // (within staleTime). The first paint also blocks for far less time
  // because we ask for 20 rows instead of 50.
  const { data, isPending, refetch } = useNotifications(20);
  const invalidateNotifications = useInvalidateNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Local optimistic overrides — applied on top of the server list so
  // tapping a row to mark-as-read updates instantly without waiting for
  // refetch. Keyed by notification id; value is the new isRead bit.
  const [readOverrides, setReadOverrides] = useState<Record<string, true>>({});

  // Detail-view modal — opened when the vendor taps a notification
  // that has no actionable `route` (e.g. broadcast announcements). The
  // tap UI on the row trims long messages to 3 lines; the modal lets
  // them read the full body without an intermediate screen.
  const [detail, setDetail] = useState<AppNotification | null>(null);

  const notifications: AppNotification[] = useMemo(() => {
    const rows = data?.data ?? [];
    if (Object.keys(readOverrides).length === 0) return rows;
    return rows.map((n) =>
      readOverrides[n.id] ? { ...n, isRead: true } : n
    );
  }, [data?.data, readOverrides]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

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
      // Optimistic local update — flip every loaded row to read
      // immediately. Then invalidate so the next fetch reflects the
      // server truth (also clears the badge cache).
      const allIds = notifications.reduce<Record<string, true>>((acc, n) => {
        acc[n.id] = true;
        return acc;
      }, {});
      setReadOverrides((prev) => ({ ...prev, ...allIds }));
      invalidateNotifications();
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
      setReadOverrides((prev) => ({ ...prev, [notification.id]: true }));
      markNotificationAsRead(notification.id, notification.kind ?? "notification")
        .then(() => invalidateNotifications())
        .catch(() => {
          // Best-effort — local override already in place; the next
          // refetch will reconcile.
        });
    }

    const route =
      notification.route ||
      ROUTE_FALLBACK[notification.type as string] ||
      null;

    // No actionable destination (typical for broadcasts and general
    // announcements) — open the detail modal so the vendor can read
    // the full message instead of being stuck with the truncated row.
    if (!route) {
      setDetail(notification);
      return;
    }

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
    const isUnread = !item.isRead;

    // Row design notes:
    //   • Type colour is carried by the icon disk only — the previous
    //     coloured vertical strip on the left was redundant noise.
    //   • State (unread/read) is carried by a single thin brand-blue
    //     rail on the left edge AND a slight title weight bump.
    //     This kills the old "type-label + unread dot" two-line
    //     header above the title.
    //   • Background tone shifts very slightly for unread so the
    //     stack is scannable from the corner of the eye.
    return (
      <Pressable
        key={item.id}
        onPress={() => handleNotificationPress(item)}
        className={`mb-2 overflow-hidden rounded-2xl border active:opacity-90 ${
          isUnread
            ? "bg-white border-blue-100"
            : "bg-white border-gray-100"
        }`}
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isUnread ? 0.05 : 0.03,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View className="flex-row">
          {/* Unread rail — only renders for unread, single brand-blue
              line, narrower than the old coloured strip. */}
          {isUnread && (
            <View style={{ width: 3, backgroundColor: "#0080ff" }} />
          )}

          <View className="flex-row flex-1 p-4">
            <View
              className="w-11 h-11 rounded-2xl items-center justify-center mr-3.5"
              style={{ backgroundColor: style.iconBg }}
            >
              <Ionicons name={style.icon} size={20} color={style.iconColor} />
            </View>

            <View className="flex-1 mr-2 min-w-0">
              <View className="flex-row items-baseline justify-between gap-2 mb-1">
                <Text
                  className={`text-[15px] tracking-tight text-gray-900 flex-1 ${
                    isUnread ? "font-extrabold" : "font-bold"
                  }`}
                  numberOfLines={2}
                  style={{ lineHeight: 20 }}
                >
                  {item.title}
                </Text>
                <Text
                  className={`text-[11px] flex-shrink-0 ${
                    isUnread ? "text-gray-700 font-bold" : "text-gray-400 font-medium"
                  }`}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
              <Text
                className="text-[12.5px] text-gray-500 leading-[18px]"
                numberOfLines={2}
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

  // Brand-blue (#0080ff) hero. Layout: small "Inbox" eyebrow tucked
  // top-left, hero numeral + meta filling the body, mark-all CTA
  // anchored on its own row so it never crowds the headline. The
  // earlier card stacked everything left-aligned and the CTA hung
  // off the bottom-left without breathing room.
  const HeroCard = (
    <View
      className="mx-5 mt-4 mb-5 rounded-3xl overflow-hidden px-5 pt-5 pb-5"
      style={{
        backgroundColor: "#0080ff",
        shadowColor: "#0080ff",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 6,
      }}
    >
      {/* Eyebrow */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full bg-white/15 items-center justify-center">
            <Ionicons name="notifications" size={14} color="white" />
          </View>
          <Text
            className="text-white/85 text-[10.5px] font-extrabold uppercase"
            style={{ letterSpacing: 1.5 }}
          >
            Inbox
          </Text>
        </View>
        {unreadCount > 0 && (
          <View className="bg-white/15 px-2.5 h-6 rounded-full items-center justify-center">
            <Text
              className="text-white text-[11px] font-extrabold"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {unreadCount} unread
            </Text>
          </View>
        )}
      </View>

      {/* Headline */}
      {unreadCount > 0 ? (
        <>
          <View className="flex-row items-baseline gap-2">
            <Text
              className="text-white font-extrabold tracking-tight"
              style={{ fontSize: 44, lineHeight: 46, fontVariant: ["tabular-nums"] }}
            >
              {unreadCount}
            </Text>
            <Text className="text-white/80 text-[18px] font-bold tracking-tight">
              new update{unreadCount === 1 ? "" : "s"}
            </Text>
          </View>
          <Text className="text-white/75 text-[12.5px] mt-1.5 leading-[18px]">
            Tap a card to open the screen it belongs to.
          </Text>
        </>
      ) : (
        <>
          <Text className="text-white text-[26px] font-extrabold tracking-tight leading-[30px]">
            You&apos;re all caught up
          </Text>
          <Text className="text-white/75 text-[12.5px] mt-1.5 leading-[18px]">
            We&apos;ll let you know the moment something needs you.
          </Text>
        </>
      )}

      {/* Mark all read — refined pill on its own row */}
      {unreadCount > 0 && (
        <Pressable
          onPress={handleMarkAllRead}
          disabled={markingAllRead}
          className="mt-5 self-start flex-row items-center gap-1.5 bg-white rounded-full px-3.5 h-9 active:bg-white/90"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          {markingAllRead ? (
            <ActivityIndicator size="small" color="#0080ff" />
          ) : (
            <Ionicons name="checkmark-done" size={14} color="#0080ff" />
          )}
          <Text
            className="text-[12.5px] font-extrabold"
            style={{ color: "#0080ff" }}
          >
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
    <View className="items-center px-8 py-20">
      <View
        className="w-16 h-16 rounded-3xl items-center justify-center mb-5"
        style={{ backgroundColor: "#eff6ff" }}
      >
        <Ionicons
          name={
            activeFilter === "unread"
              ? "checkmark-done-circle"
              : "notifications-outline"
          }
          size={28}
          color="#0080ff"
        />
      </View>
      <Text className="text-gray-900 text-[17px] font-extrabold tracking-tight mb-1.5">
        {activeFilter === "unread" ? "Inbox zero" : "Nothing yet"}
      </Text>
      <Text className="text-gray-500 text-center text-[13px] leading-[19px] max-w-xs">
        {activeFilter === "unread"
          ? "Every notification has been read. Nice work."
          : "We'll let you know about orders, payouts, and anything else that needs your attention."}
      </Text>
    </View>
  );

  // Only show the full-screen spinner on the very first load — once the
  // cache has anything, we render the list (possibly stale) and let
  // background refetch update in place. Massively faster perceived
  // load on subsequent visits.
  if (isPending && !data) {
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
            sections.map((section, sectionIdx) => (
              <View key={section.title} className={sectionIdx === 0 ? "" : "mt-5"}>
                {/* Section header: tiny caps label + hairline rule.
                    Gives the inbox a documentary feel, scannable
                    without competing with the row titles. */}
                <View className="flex-row items-center gap-3 mb-3 mt-1">
                  <Text
                    className="text-[10.5px] font-extrabold text-gray-500 uppercase"
                    style={{ letterSpacing: 1.5 }}
                  >
                    {section.title}
                  </Text>
                  <View className="flex-1 h-px bg-gray-200/70" />
                  <Text
                    className="text-[10.5px] font-bold text-gray-400 tabular-nums"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {section.data.length}
                  </Text>
                </View>
                {section.data.map(renderRow)}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Detail modal — opens for non-routed notifications (e.g.
          broadcasts) so the vendor can read the entire message body
          without truncation. Routed notifications still navigate
          straight to their destination as before. */}
      <Modal
        visible={detail != null}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setDetail(null)}
      >
        <View className="flex-1 bg-black/60 justify-center px-5">
          {detail ? (
            (() => {
              const s = styleFor(detail.type);
              return (
                <View
                  className="bg-white rounded-3xl overflow-hidden"
                  style={{
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.25,
                    shadowRadius: 24,
                    elevation: 12,
                  }}
                >
                  {/* Tinted header strip — matches the row's accent so
                      the modal feels like a continuation of the tap, not
                      a new context. */}
                  <View
                    style={{
                      height: 4,
                      backgroundColor: s.accent,
                    }}
                  />

                  <View className="px-5 pt-5 pb-4">
                    <View className="flex-row items-start gap-3">
                      <View
                        className="w-12 h-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: s.iconBg }}
                      >
                        <Ionicons name={s.icon} size={22} color={s.iconColor} />
                      </View>
                      <View className="flex-1 pr-1 pt-0.5">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text
                            className="text-[10px] font-extrabold uppercase tracking-[1.2px]"
                            style={{ color: s.accent }}
                          >
                            {s.label}
                          </Text>
                          <Text className="text-[10.5px] text-gray-400 font-medium">
                            · {formatRelativeTime(detail.createdAt)}
                          </Text>
                        </View>
                        <Text
                          className="text-[18px] text-gray-900 tracking-tight"
                          style={{
                            fontFamily: "PlusJakartaSans_700Bold",
                            lineHeight: 24,
                          }}
                        >
                          {detail.title}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setDetail(null)}
                        hitSlop={8}
                        className="w-9 h-9 rounded-full items-center justify-center bg-gray-100 active:bg-gray-200"
                      >
                        <Ionicons name="close" size={18} color="#374151" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Body — scrollable for very long broadcasts so the
                      modal never overflows the device. */}
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: 360 }}
                    contentContainerStyle={{
                      paddingHorizontal: 20,
                      paddingBottom: 16,
                    }}
                  >
                    <Text className="text-[14px] text-gray-700 leading-[21px]">
                      {detail.message}
                    </Text>
                  </ScrollView>

                  <View className="px-5 pt-3 pb-5 border-t border-gray-100 bg-white">
                    <Pressable
                      onPress={() => setDetail(null)}
                      className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2 active:bg-blue-700"
                      style={{
                        shadowColor: "#2563eb",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 10,
                        elevation: 4,
                      }}
                    >
                      <Ionicons name="checkmark" size={15} color="white" />
                      <Text
                        className="text-white text-[14.5px]"
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        Got it
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })()
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
