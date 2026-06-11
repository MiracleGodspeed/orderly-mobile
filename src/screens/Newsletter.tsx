import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Linking,
  Platform,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { ScreenHeader } from "../components/ScreenHeader";
import { ListSearchBar } from "../components/ListSearchBar";
import { Pagination } from "../components/Pagination";
import { NewsletterOverview, NewsletterSubscriber } from "../api/vendor/vendor.types";
import {
  getNewsletterOverview,
  getNewsletterSubscribers,
  toggleNewsletter,
} from "../api/vendor/vendor.api";
import { formatRelativeTime } from "../lib/format";

const PAGE_SIZE = 20;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const AVATAR_PALETTE = [
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
const getAvatarColor = (seed: string): string => {
  if (!seed) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

function SubscriberRow({
  subscriber,
  onEmail,
}: {
  subscriber: NewsletterSubscriber;
  onEmail: (email: string) => void;
}) {
  const avatarColor = getAvatarColor(subscriber.email);
  const initial = (subscriber.email || "?").charAt(0).toUpperCase();

  return (
    <View
      className="bg-white rounded-2xl border border-gray-100 mb-2"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center p-3.5">
        <View
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: avatarColor }}
        >
          <Text className="text-white font-extrabold text-[14px]">
            {initial}
          </Text>
        </View>

        <View className="flex-1 ml-3 min-w-0">
          {/* Full email — wraps instead of truncating so the vendor can
              read the whole address. */}
          <Text className="text-[14px] font-extrabold text-gray-900 tracking-tight">
            {subscriber.email}
          </Text>
          <Text className="text-[11px] text-gray-400 mt-0.5">
            Joined {formatRelativeTime(subscriber.subscribedAt)}
          </Text>
        </View>

        <Pressable
          onPress={() => onEmail(subscriber.email)}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl active:bg-blue-50/40"
        >
          <Ionicons name="mail" size={14} color="#0080ff" />
          <Text className="text-[12px] font-extrabold text-[#0080ff]">Email</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Newsletter() {
  const toast = useToast();

  const [overview, setOverview] = useState<NewsletterOverview | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NewsletterSubscriber[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const hasFeature = overview?.hasFeature ?? false;

  const loadOverview = useCallback(async () => {
    try {
      const o = await getNewsletterOverview();
      setOverview(o);
      setEnabled(o.enabled);
    } catch {
      // Non-fatal — the list still loads; the toggle card shows its
      // default (off) state until the next refresh.
    }
  }, []);

  // Reset to page 1 whenever the search settles.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const result = await getNewsletterSubscribers({
          pageIndex: page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });
        setData(result.data);
        setTotalCount(result.totalCount);
      } catch (err: any) {
        if (!silent) {
          toast.show(err?.message || "Couldn't load subscribers", {
            type: "danger",
          });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, debouncedSearch, toast]
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    load();
  }, [load]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(true), loadOverview()]);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadOverview]);

  const onToggle = useCallback(
    async (next: boolean) => {
      if (toggling) return;
      haptic();
      setEnabled(next); // optimistic
      setToggling(true);
      try {
        await toggleNewsletter(next);
        toast.show(
          next ? "Newsletter prompt is now live on your storefront" : "Newsletter prompt turned off",
          { type: "success" }
        );
      } catch (err: any) {
        setEnabled(!next); // revert
        toast.show(err?.message || "Couldn't update the newsletter setting", {
          type: "danger",
        });
      } finally {
        setToggling(false);
      }
    },
    [toggling, toast]
  );

  const handleEmail = useCallback(
    (email: string) => {
      if (!email) return;
      haptic();
      Linking.openURL(`mailto:${email}`).catch(() => {
        toast.show("Couldn't open email app", { type: "warning" });
      });
    },
    [toast]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
    scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  }, []);

  const heroCount = overview?.totalSubscribers ?? totalCount;

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Newsletter" />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor="#0080ff"
          />
        }
      >
        {/* Branded hero */}
        <View
          className="mx-5 mt-4 mb-4 rounded-3xl overflow-hidden px-5 py-5"
          style={{ backgroundColor: "#0080ff" }}
        >
          <View
            style={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-white/15 border border-white/15 items-center justify-center">
              <Ionicons name="mail" size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white/75 text-[10.5px] font-extrabold uppercase tracking-[1.4px]">
                Your subscribers
              </Text>
              <Text className="text-white text-[24px] font-extrabold tracking-tight mt-0.5">
                {heroCount.toLocaleString()}{" "}
                <Text className="text-white/70 text-[14px] font-bold">
                  {heroCount === 1 ? "subscriber" : "subscribers"}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Enable/disable toggle card */}
        <View className="px-5 mb-4">
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-start gap-3 flex-1 mr-3">
                <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center">
                  <Ionicons name="megaphone-outline" size={20} color="#0080ff" />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-extrabold text-gray-900">
                    Storefront signup prompt
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5 leading-[17px]">
                    {hasFeature
                      ? "When on, visitors to your storefront see a classy popup inviting them to join your newsletter."
                      : "Collecting newsletter signups is part of a higher plan. Upgrade to turn this on."}
                  </Text>
                </View>
              </View>

              {hasFeature ? (
                <Switch
                  value={enabled}
                  onValueChange={onToggle}
                  disabled={toggling}
                  trackColor={{ false: "#d1d5db", true: "#0080ff" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d5db"
                />
              ) : (
                <View className="flex-row items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-full">
                  <Ionicons name="lock-closed" size={11} color="#6b7280" />
                  <Text className="text-[11px] font-bold text-gray-500">Locked</Text>
                </View>
              )}
            </View>

            {hasFeature && (
              <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-center gap-1.5">
                <View
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: enabled ? "#10b981" : "#d1d5db" }}
                />
                <Text
                  className="text-[12px] font-semibold"
                  style={{ color: enabled ? "#059669" : "#9ca3af" }}
                >
                  {enabled ? "Live on your storefront" : "Not showing"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Search */}
        <View className="px-5 mb-3">
          <ListSearchBar
            placeholder="Search subscribers by email..."
            onSearchChange={setDebouncedSearch}
          />
        </View>

        {/* List */}
        <View className="px-5">
          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="small" color="#0080ff" />
              <Text className="text-[12.5px] text-gray-500 mt-3 font-semibold">
                Loading subscribers…
              </Text>
            </View>
          ) : data.length === 0 ? (
            <View className="items-center px-8 py-16">
              <View className="w-20 h-20 bg-blue-50 rounded-2xl items-center justify-center mb-5">
                <Ionicons name="mail-outline" size={36} color="#0080ff" />
              </View>
              <Text className="text-gray-900 text-lg font-bold mb-1.5">
                {debouncedSearch ? "No matches" : "No subscribers yet"}
              </Text>
              <Text className="text-gray-500 text-center text-sm leading-5 max-w-xs">
                {debouncedSearch
                  ? "Try a different email."
                  : "Turn on the prompt above and your storefront visitors can start subscribing. They'll appear here."}
              </Text>
            </View>
          ) : (
            data.map((s) => (
              <SubscriberRow key={s.id} subscriber={s} onEmail={handleEmail} />
            ))
          )}
        </View>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          isFetching={loading}
          onPageChange={handlePageChange}
        />
      </ScrollView>
    </View>
  );
}
