import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "react-native-toast-notifications";

import { ScreenHeader } from "./ScreenHeader";
import { useCustomerSegment } from "../hooks/useInsights";
import { dismissInsight } from "../api/insights/insights.api";
import type { SegmentCustomer } from "../api/insights/insights.types";
import { formatNaira } from "../lib/format";

// Which dashboard insight this segment maps to — confirming outreach
// dismisses that card from the carousel.
const SEGMENT_CARD: Record<string, string> = {
  lapsed_60d: "lapsed_customers",
  lapsed_90d: "lapsed_customers",
  vip: "vip_spotlight",
};

/**
 * Segment-filtered customers with a wa.me-assisted "broadcast" — the
 * vendor composes one message ({name} auto-fills), then taps WhatsApp on
 * each customer (each opens WhatsApp pre-filled). Mirrors the web view.
 * Per docs/growth-partner-vision.md §6 + §11 (wa.me assisted).
 */

const SUGGESTED: Record<string, string> = {
  lapsed_60d:
    "Hi {name}! We've missed you 💙 Here's a little something to welcome you back — use code WELCOME10 for 10% off your next order.",
  lapsed_90d:
    "Hi {name}! It's been a while 💙 We'd love to have you back — here's 10% off your next order with code WELCOME10.",
  vip: "Hi {name}! Thank you for being one of our very best customers 💙 We've set aside something special just for you.",
  best: "Hi {name}! Thank you for your loyalty 💙 As one of our top customers, here's an exclusive treat for you.",
  one_time:
    "Hi {name}! Thanks for your first order 💙 Here's 10% off your next one with code THANKYOU.",
  all: "Hi {name}! We've got something special for you 💙",
};

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

const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

const firstNameOf = (name: string) => (name || "there").split(/\s+/)[0];

export default function SegmentCustomersView({ segment }: { segment: string }) {
  const toast = useToast();
  const navigation = useNavigation<any>();
  const { data, isLoading } = useCustomerSegment(segment);

  const [message, setMessage] = useState(SUGGESTED[segment] ?? SUGGESTED.all);
  const [reached, setReached] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const cardId = SEGMENT_CARD[segment];

  const confirmReached = () => {
    if (!cardId) return;
    void dismissInsight(cardId);
    setDone(true);
    toast.show("Marked as done — it'll drop off your dashboard", { type: "success" });
  };

  const customers = data?.customers ?? [];
  const label = data?.label ?? "Customers";
  const totalCount = data?.totalCount ?? 0;

  const reachable = useMemo(
    () => customers.filter((c) => normalizePhone(c.phoneNumber)),
    [customers],
  );
  const reachedCount = Object.values(reached).filter(Boolean).length;

  const personalise = (c: SegmentCustomer) =>
    message.replace(/\{name\}/g, firstNameOf(c.name));

  const sendWhatsApp = async (c: SegmentCustomer) => {
    const phone = normalizePhone(c.phoneNumber);
    if (!phone) {
      toast.show("No valid WhatsApp number", { type: "warning" });
      return;
    }
    haptic();
    const text = encodeURIComponent(personalise(c));
    const deepLink = `whatsapp://send?phone=${phone}&text=${text}`;
    const webLink = `https://wa.me/${phone}?text=${text}`;
    try {
      if (await Linking.canOpenURL(deepLink)) {
        await Linking.openURL(deepLink);
      } else {
        await Linking.openURL(webLink);
      }
      setReached((r) => ({ ...r, [c.email]: true }));
    } catch {
      toast.show("Couldn't open WhatsApp", { type: "warning" });
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title={label} />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Segment summary hero */}
        <View
          className="mx-5 mt-4 mb-3 rounded-3xl overflow-hidden px-5 py-5"
          style={{ backgroundColor: "#194eb8" }}
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
          <Text className="text-white/75 text-[10.5px] font-extrabold uppercase tracking-[1.4px]">
            {label}
          </Text>
          <Text className="text-white text-[24px] font-extrabold tracking-tight mt-0.5">
            {totalCount.toLocaleString()}{" "}
            <Text className="text-white/70 text-[14px] font-bold">
              {totalCount === 1 ? "customer" : "customers"}
            </Text>
          </Text>
          {reachable.length < customers.length ? (
            <Text className="text-white/60 text-[11px] mt-1">
              {reachable.length} reachable on WhatsApp
            </Text>
          ) : null}
        </View>

        {/* Compose-once broadcast bar */}
        <View className="mx-5 mb-4 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-9 h-9 rounded-2xl bg-emerald-100 items-center justify-center">
              <Ionicons name="logo-whatsapp" size={18} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-extrabold text-gray-900">
                Send a WhatsApp broadcast
              </Text>
              <Text className="text-[10.5px] text-gray-500">
                Write it once — tap each customer to send. {"{name}"} fills in.
              </Text>
            </View>
          </View>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            className="rounded-2xl border border-emerald-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-800"
            style={{ minHeight: 72, textAlignVertical: "top" }}
          />
          <Text className="text-[11px] font-extrabold text-emerald-700 mt-2">
            {reachedCount} of {reachable.length} reached
          </Text>
        </View>

        {/* "Mark as done" — appears once they've reached out; confirming
            tells the dashboard this advice is handled so it leaves. */}
        {cardId && (reachedCount > 0 || done) ? (
          done ? (
            <View className="mx-5 mb-4 flex-row items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text className="flex-1 text-[12.5px] font-semibold text-emerald-700">
                Marked as done — this will drop off your dashboard.
              </Text>
            </View>
          ) : (
            <View className="mx-5 mb-4 bg-white border border-gray-100 rounded-2xl p-4">
              <Text className="text-[12.5px] text-gray-700 mb-3">
                Finished reaching out? Mark it done so it leaves your dashboard.
              </Text>
              <Pressable
                onPress={confirmReached}
                className="flex-row items-center justify-center gap-1.5 bg-[#0080ff] rounded-xl py-2.5"
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text className="text-white text-[13px] font-extrabold">
                  I've reached out
                </Text>
              </Pressable>
            </View>
          )
        ) : null}

        {/* List */}
        <View className="px-5">
          {isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-[12.5px] text-gray-500 mt-3 font-semibold">
                Loading…
              </Text>
            </View>
          ) : customers.length === 0 ? (
            <View className="items-center px-8 py-16">
              <View className="w-20 h-20 bg-blue-50 rounded-2xl items-center justify-center mb-5">
                <Ionicons name="people-outline" size={36} color="#2563eb" />
              </View>
              <Text className="text-gray-900 text-lg font-bold mb-1.5">
                No customers in this group
              </Text>
              <Text className="text-gray-500 text-center text-sm leading-5 max-w-xs">
                As your customers' activity changes, this group updates
                automatically.
              </Text>
            </View>
          ) : (
            customers.map((c) => {
              const isReached = !!reached[c.email];
              const phone = normalizePhone(c.phoneNumber);
              return (
                <View
                  key={c.email}
                  className="bg-white rounded-2xl border border-gray-100 mb-2 p-3.5"
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-[14.5px] font-extrabold text-gray-900 flex-1"
                      numberOfLines={1}
                    >
                      {c.name || c.email || "Customer"}
                    </Text>
                    <Text className="text-[12.5px] font-extrabold text-gray-700">
                      {formatNaira(c.totalSpent)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3 mt-1">
                    <Text className="text-[11.5px] text-gray-500">
                      {c.totalOrders} {c.totalOrders === 1 ? "order" : "orders"}
                    </Text>
                    {c.daysSinceLastPurchase != null ? (
                      <Text className="text-[11.5px] text-gray-400">
                        last bought {c.daysSinceLastPurchase}d ago
                      </Text>
                    ) : null}
                  </View>

                  <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-50">
                    <Pressable
                      onPress={() => sendWhatsApp(c)}
                      disabled={!phone}
                      className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl ${
                        !phone
                          ? "opacity-40"
                          : isReached
                            ? "bg-gray-100"
                            : "bg-emerald-50"
                      }`}
                    >
                      <Ionicons
                        name={isReached ? "checkmark" : "logo-whatsapp"}
                        size={14}
                        color={isReached ? "#6b7280" : "#059669"}
                      />
                      <Text
                        className={`text-[12px] font-extrabold ${
                          isReached ? "text-gray-500" : "text-emerald-700"
                        }`}
                      >
                        {isReached ? "Sent" : "WhatsApp"}
                      </Text>
                    </Pressable>
                    {c.email ? (
                      <Pressable
                        onPress={() =>
                          Linking.openURL(
                            `mailto:${c.email}?body=${encodeURIComponent(personalise(c))}`,
                          ).catch(() => {})
                        }
                        className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-50"
                      >
                        <Ionicons name="mail" size={14} color="#2563eb" />
                        <Text className="text-[12px] font-extrabold text-blue-700">
                          Email
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
