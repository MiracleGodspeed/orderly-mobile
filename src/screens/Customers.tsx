import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";
import { useRoute, type RouteProp } from "@react-navigation/native";

import { ScreenHeader } from "../components/ScreenHeader";
import SegmentCustomersView from "../components/SegmentCustomersView";
import type { RootStackParamList } from "../navigation/types";
import { ListSearchBar } from "../components/ListSearchBar";
import { Pagination } from "../components/Pagination";
import { VendorCustomer } from "../api/vendor/vendor.types";
import { getVendorCustomers } from "../api/vendor/vendor.api";
import { formatRelativeTime } from "../lib/format";

const PAGE_SIZE = 20;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

// Same E.164 normalisation used on OrderDetails — kept inline because
// the helper isn't exported as a shared util yet, and it's only a few
// lines. Keeps Call / WhatsApp working regardless of how the customer
// originally typed their number.
const normalizePhone = (raw: string, defaultDialCode = "234"): string => {
  if (!raw) return "";
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("00")) return cleaned.slice(2);
  if (cleaned.startsWith("0")) return defaultDialCode + cleaned.slice(1);
  if (cleaned.length >= 11) return cleaned;
  return defaultDialCode + cleaned;
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
const getAvatarColor = (name: string): string => {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

interface CustomerRowProps {
  customer: VendorCustomer;
  onCall: (c: VendorCustomer) => void;
  onWhatsApp: (c: VendorCustomer) => void;
  onEmail: (c: VendorCustomer) => void;
}

function CustomerRow({
  customer,
  onCall,
  onWhatsApp,
  onEmail,
}: CustomerRowProps) {
  const initials = getInitials(customer.name);
  const avatarColor = getAvatarColor(customer.name);

  return (
    <View
      className="bg-white rounded-2xl border border-gray-100 mb-2 overflow-hidden"
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
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{
            backgroundColor: avatarColor,
            shadowColor: avatarColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text className="text-white font-extrabold text-[14px]">
            {initials}
          </Text>
        </View>

        <View className="flex-1 ml-3 min-w-0">
          <Text
            className="text-[14.5px] font-extrabold text-gray-900 tracking-tight"
            numberOfLines={1}
          >
            {customer.name || "Unnamed customer"}
          </Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <Ionicons name="mail-outline" size={11} color="#94a3b8" />
            <Text
              className="text-[11.5px] text-gray-500 flex-1"
              numberOfLines={1}
            >
              {customer.email || "no email"}
            </Text>
          </View>
          {customer.lastSeen ? (
            <Text className="text-[11px] text-gray-400 mt-0.5">
              Last seen {formatRelativeTime(customer.lastSeen)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Quick contact actions */}
      <View className="flex-row border-t border-gray-50">
        <Pressable
          onPress={() => onCall(customer)}
          disabled={!customer.phoneNumber}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 ${
            customer.phoneNumber ? "active:bg-gray-50" : "opacity-40"
          }`}
        >
          <Ionicons name="call" size={13} color="#374151" />
          <Text className="text-[12px] font-extrabold text-gray-700">Call</Text>
        </Pressable>
        <View className="w-px bg-gray-100" />
        <Pressable
          onPress={() => onWhatsApp(customer)}
          disabled={!customer.phoneNumber}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 ${
            customer.phoneNumber ? "active:bg-emerald-50/40" : "opacity-40"
          }`}
        >
          <Ionicons name="logo-whatsapp" size={13} color="#059669" />
          <Text className="text-[12px] font-extrabold text-emerald-700">
            WhatsApp
          </Text>
        </Pressable>
        <View className="w-px bg-gray-100" />
        <Pressable
          onPress={() => onEmail(customer)}
          disabled={!customer.email}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 ${
            customer.email ? "active:bg-blue-50/40" : "opacity-40"
          }`}
        >
          <Ionicons name="mail" size={13} color="#2563eb" />
          <Text className="text-[12px] font-extrabold text-blue-700">Email</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Customers() {
  const route = useRoute<RouteProp<RootStackParamList, "Customers">>();
  const segment = route.params?.segment;

  // Growth Partner deep-link: render the segment-filtered view with the
  // wa.me broadcast instead of the full customer list.
  if (segment) {
    return <SegmentCustomersView segment={segment} />;
  }

  return <CustomersList />;
}

function CustomersList() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VendorCustomer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  // Reset to page 1 whenever the search settles — otherwise the vendor
  // could land on an out-of-range page after narrowing results.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const result = await getVendorCustomers({
          pageIndex: page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });
        setData(result.data);
        setTotalCount(result.totalCount);
      } catch (err: any) {
        if (!silent) {
          toast.show(err?.message || "Couldn't load customers", {
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
    load();
  }, [load]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleCall = useCallback(
    (c: VendorCustomer) => {
      const phone = normalizePhone(c.phoneNumber);
      if (!phone) {
        toast.show("Phone number looks invalid", { type: "warning" });
        return;
      }
      haptic();
      Linking.openURL(`tel:+${phone}`).catch(() => {
        toast.show("Couldn't open phone app", { type: "warning" });
      });
    },
    [toast]
  );

  const handleWhatsApp = useCallback(
    async (c: VendorCustomer) => {
      const phone = normalizePhone(c.phoneNumber);
      if (!phone) {
        toast.show("Phone number looks invalid", { type: "warning" });
        return;
      }
      haptic();
      const deepLink = `whatsapp://send?phone=${phone}`;
      const webLink = `https://wa.me/${phone}`;
      try {
        const canOpen = await Linking.canOpenURL(deepLink);
        if (canOpen) {
          await Linking.openURL(deepLink);
          return;
        }
      } catch {
        // fall through to web link
      }
      try {
        await Linking.openURL(webLink);
      } catch {
        toast.show("Couldn't open WhatsApp", { type: "warning" });
      }
    },
    [toast]
  );

  const handleEmail = useCallback(
    (c: VendorCustomer) => {
      if (!c.email) return;
      haptic();
      Linking.openURL(`mailto:${c.email}`).catch(() => {
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
    const scrollUp = () =>
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    scrollUp();
    setTimeout(scrollUp, 0);
    setTimeout(scrollUp, 120);
  }, []);

  // Quick stats derived from the loaded page — purely informational,
  // not a substitute for a server-side aggregate.
  const stats = useMemo(() => {
    const withPhone = data.filter((c) => !!c.phoneNumber).length;
    const withEmail = data.filter((c) => !!c.email).length;
    return { withPhone, withEmail };
  }, [data]);

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Customers" />

      <ScrollView
        ref={scrollRef}
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
        {/* Branded hero */}
        <View
          className="mx-5 mt-4 mb-4 rounded-3xl overflow-hidden px-5 py-5"
          style={{ backgroundColor: "#194eb8" }}
        >
          {/* Decorative soft circle for depth */}
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
              <Ionicons name="people" size={22} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white/75 text-[10.5px] font-extrabold uppercase tracking-[1.4px]">
                Your customers
              </Text>
              <Text className="text-white text-[24px] font-extrabold tracking-tight mt-0.5">
                {totalCount.toLocaleString()}{" "}
                <Text className="text-white/70 text-[14px] font-bold">
                  {totalCount === 1 ? "shopper" : "shoppers"}
                </Text>
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2 mt-4">
            <View className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5">
              <Text className="text-white/70 text-[10px] font-extrabold uppercase tracking-[1.2px]">
                With phone
              </Text>
              <Text className="text-white text-[18px] font-extrabold mt-0.5">
                {stats.withPhone}
              </Text>
            </View>
            <View className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5">
              <Text className="text-white/70 text-[10px] font-extrabold uppercase tracking-[1.2px]">
                With email
              </Text>
              <Text className="text-white text-[18px] font-extrabold mt-0.5">
                {stats.withEmail}
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View className="px-5 mb-3">
          <ListSearchBar
            placeholder="Search by name, email, phone..."
            onSearchChange={setDebouncedSearch}
          />
        </View>

        {/* List */}
        <View className="px-5">
          {loading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-[12.5px] text-gray-500 mt-3 font-semibold">
                Loading customers…
              </Text>
            </View>
          ) : data.length === 0 ? (
            <View className="items-center px-8 py-16">
              <View className="w-20 h-20 bg-blue-50 rounded-2xl items-center justify-center mb-5">
                <Ionicons name="people-outline" size={36} color="#2563eb" />
              </View>
              <Text className="text-gray-900 text-lg font-bold mb-1.5">
                {debouncedSearch ? "No matches" : "No customers yet"}
              </Text>
              <Text className="text-gray-500 text-center text-sm leading-5 max-w-xs">
                {debouncedSearch
                  ? "Try a different name, email, or phone number."
                  : "Once shoppers buy from your storefront, they'll appear here for easy follow-up."}
              </Text>
            </View>
          ) : (
            data.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
                onEmail={handleEmail}
              />
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
