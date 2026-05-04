import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { useToast } from 'react-native-toast-notifications';
import Ionicons from "@expo/vector-icons/Ionicons";

import { useQueryClient } from "@tanstack/react-query";

import { RootStackParamList } from "../navigation/types";
import { Order } from "../api/vendor/vendor.types";
import { AppImage } from "../components/AppImage";
import { ScreenHeader } from "../components/ScreenHeader";
import { resolveChannel } from "../lib/orderChannels";
import {
  confirmManualPayment,
  rejectManualPayment,
  updateOrderStatusByBatch,
} from "../api/vendor/vendor.api";

type ScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "OrderDetails"
>;
type Props = NativeStackScreenProps<RootStackParamList, "OrderDetails">;
type OrderDetailsRouteProp = Props['route'];

// Returns true when a hex color is light enough that it'd disappear on
// the white card background — used to decide whether the swatch needs
// a thin border. Standard luminance approximation; covers white/cream/
// pastel cases without going overboard.
const isLightHex = (hex: string): boolean => {
  const value = (hex || "").replace("#", "");
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return false;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 200;
};

// Normalises a phone number to E.164 digits (no plus, no spaces) so
// `tel:` and WhatsApp links resolve consistently regardless of how the
// customer typed it. Default dial code is Nigeria (234) since that's
// where Orderly's vendors operate; pass another code if needed.
//
// Handles every common input shape:
//   "+2348061234567"      → "2348061234567"
//   "002348061234567"     → "2348061234567"
//   "0806 123 4567"       → "2348061234567"
//   "08061234567"         → "2348061234567"
//   "8061234567"          → "2348061234567"
//   "2348061234567"       → "2348061234567"  (already E.164)
const normalizePhone = (raw: string, defaultDialCode = "234"): string => {
  if (!raw) return "";
  // Keep only digits + a leading + (any other characters — spaces, dashes,
  // parentheses, the literal word "ext" — are stripped).
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("00")) return cleaned.slice(2);
  if (cleaned.startsWith("0")) return defaultDialCode + cleaned.slice(1);
  // No prefix at all. If it already looks like an international number
  // (>= 11 digits), trust it — otherwise prepend the default country code.
  if (cleaned.length >= 11) return cleaned;
  return defaultDialCode + cleaned;
};

export type OrderStatus = "Pending" | "Paid" | "Shipped";

// Resolves to the UI status from both backend fields. Order-line status
// takes precedence for shipped states (Dispatched / Delivered) — that's
// driven by the vendor's own actions on the order. Otherwise we fall
// back to payment status (success → Paid, anything else → Pending).
const mapStatus = (order: Pick<Order, "status" | "orderStatus">): OrderStatus => {
  const lineStatus = (order.orderStatus || "").toLowerCase();
  if (lineStatus === "dispatched" || lineStatus === "delivered") return "Shipped";

  switch ((order.status || "").toLowerCase()) {
    case "success":
    case "paid":
      return "Paid";
    case "pending":
    case "pending_vendor_manual_confirmation":
    default:
      return "Pending";
  }
};

// Status visual tones — keeps color decisions in one place instead of
// inline className gymnastics, and makes the chip / dot / action pill
// all share the same accent per status.
const STATUS_TONE: Record<
  OrderStatus,
  { dot: string; bg: string; border: string; text: string; accent: string }
> = {
  Paid: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-700",
    accent: "#059669",
  },
  Pending: {
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
    accent: "#d97706",
  },
  Shipped: {
    dot: "bg-violet-500",
    bg: "bg-violet-50",
    border: "border-violet-100",
    text: "text-violet-700",
    accent: "#262826",
  },
};

// Forward action — the next status the vendor would advance to.
const getNextAction = (status: OrderStatus) => {
  switch (status) {
    case "Pending":
      return {
        label: "Mark as Paid",
        next: "Paid" as OrderStatus,
        icon: "checkmark-circle-outline" as const,
      };
    case "Paid":
      return {
        label: "Mark as Shipped",
        next: "Shipped" as OrderStatus,
        icon: "bicycle-outline" as const,
      };
    default:
      return null; // Shipped is the final state — no forward action.
  }
};

// Backward action — lets the vendor undo a mistaken status change.
// Pending has no previous step; the rest revert one step on the journey.
const getPrevAction = (status: OrderStatus) => {
  switch (status) {
    case "Paid":
      return { label: "Move back to Pending", prev: "Pending" as OrderStatus };
    case "Shipped":
      return { label: "Move back to Paid", prev: "Paid" as OrderStatus };
    default:
      return null;
  }
};

// Linear progression a healthy order moves through.
const STATUS_JOURNEY: OrderStatus[] = ["Pending", "Paid", "Shipped"];

const formatNgn = (amount: number) =>
  `₦${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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
  // Guard against the screen being navigated to without an order — this
  // happens when an in-app notification with route="OrderDetails" lands
  // here but didn't ship the full order object (e.g. only an order
  // reference). Hooks below MUST still run unconditionally, so we keep
  // a possibly-empty `order` and fall back to a placeholder UI; the
  // effect bounces the user back to Orders so they pick from the list.
  const order = route.params?.order;
  const safeOrder = order ?? ({} as Order);
  const qc = useQueryClient();

  const [status, setStatus] = useState<OrderStatus>(mapStatus(safeOrder));
  // Disables the action buttons while a status-change request is in
  // flight so a double-tap doesn't fire two API calls.
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Whether this order originated from the manual bank-transfer flow.
  // The backwards "Move back to Pending" action only makes sense for
  // manual orders (rejecting a Paystack-confirmed payment isn't a thing
  // the vendor can do client-side), so we use this to gate the alert.
  const isManualPayment =
    (safeOrder.status || "").toLowerCase() === "pending_vendor_manual_confirmation" ||
    safeOrder.isManualEntry === true;

  // Invalidates the orders list so the next open of the Orders screen
  // pulls fresh data. We invalidate by prefix instead of an exact key
  // so paid + unpaid + every page get refetched together.
  const invalidateOrders = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const advanceTo = async (next: OrderStatus) => {
    if (statusUpdating) return;
    setStatusUpdating(true);
    const previous = status;
    // Optimistic flip — reverted on error so the UI doesn't lie.
    setStatus(next);

    try {
      if (next === "Paid") {
        // Pending → Paid: only valid for manual bank-transfer orders.
        // Confirms the payment server-side which flips Payment.Status to
        // success and moves the order into the paid bucket.
        if (!safeOrder.orderNumber) {
          throw new Error("Missing payment reference for this order.");
        }
        await confirmManualPayment(safeOrder.orderNumber);
        toast.show("Order marked as paid", { type: "success" });
      } else if (next === "Shipped") {
        // Paid → Shipped: flip every OrderRequest line under this batch
        // to Dispatched. The mobile concept of "shipped" maps to the
        // backend's `Dispatched` enum value.
        await updateOrderStatusByBatch(safeOrder.id, "Dispatched");
        toast.show("Order marked as shipped", { type: "success" });
      }
      invalidateOrders();
    } catch (err: any) {
      setStatus(previous);
      toast.show(err?.message || "Couldn't update the order", { type: "danger" });
    } finally {
      setStatusUpdating(false);
    }
  };

  const revertTo = async (prev: OrderStatus) => {
    if (statusUpdating) return;
    setStatusUpdating(true);
    const previous = status;
    setStatus(prev);

    try {
      if (prev === "Pending") {
        // Paid → Pending: only meaningful for manual orders. We treat
        // this as a vendor reject — the customer's bank transfer didn't
        // actually come through, so the order is voided.
        if (!isManualPayment) {
          throw new Error("Paid online orders can't be moved back to pending.");
        }
        if (!safeOrder.orderNumber) {
          throw new Error("Missing payment reference for this order.");
        }
        await rejectManualPayment(safeOrder.orderNumber, "Reverted from Paid");
        toast.show("Order moved back to pending", { type: "success" });
      } else if (prev === "Paid") {
        // Shipped → Paid: order request returns to Confirmed (the state
        // a paid-but-not-yet-dispatched order sits in).
        await updateOrderStatusByBatch(safeOrder.id, "Confirmed");
        toast.show("Order moved back to paid", { type: "success" });
      }
      invalidateOrders();
    } catch (err: any) {
      setStatus(previous);
      toast.show(err?.message || "Couldn't update the order", { type: "danger" });
    } finally {
      setStatusUpdating(false);
    }
  };

  useEffect(() => {
    if (!order) {
      toast.show("Open the order from the Orders list", { type: "warning" });
      // Replace the bad route so the back stack stays clean.
      navigation.replace("Orders" as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  const action = getNextAction(status);
  const prevAction = getPrevAction(status);

  const handleCall = () => {
    if (!order.buyerPhone) {
      toast.show("No phone number available", { type: "warning" });
      return;
    }
    const phone = normalizePhone(order.buyerPhone);
    if (!phone) {
      toast.show("Phone number looks invalid", { type: "warning" });
      return;
    }
    // Prepending the + makes the dialler treat it as an international
    // number on iOS regardless of the SIM region — important for
    // diaspora vendors calling Nigerian customers (or vice versa).
    Linking.openURL(`tel:+${phone}`).catch(() => {
      toast.show("Couldn't open phone app", { type: "warning" });
    });
  };

  const handleWhatsApp = async () => {
    if (!order.buyerPhone) {
      toast.show("No phone number available", { type: "warning" });
      return;
    }
    const phone = normalizePhone(order.buyerPhone);
    if (!phone) {
      toast.show("Phone number looks invalid", { type: "warning" });
      return;
    }
    // WhatsApp's deep-link spec requires international digits with NO
    // leading + and NO spaces — exactly what `normalizePhone` returns.
    // Try the app deep link first; fall back to wa.me which handles
    // both "open the app" and "show install prompt" gracefully when
    // WhatsApp isn't installed.
    const deepLink = `whatsapp://send?phone=${phone}`;
    const webLink = `https://wa.me/${phone}`;
    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
        return;
      }
    } catch {
      // canOpenURL rejected — fall through to web fallback.
    }
    try {
      await Linking.openURL(webLink);
    } catch {
      toast.show("Couldn't open WhatsApp", { type: "warning" });
    }
  };

  const avatarColor = getAvatarColor(order.buyerName);
  const initials = getInitials(order.buyerName);
  const tone = STATUS_TONE[status];
  const isPaid = status === "Paid" || status === "Shipped";
  const journeyIndex = STATUS_JOURNEY.indexOf(status);
  const subtotal = order.totalPrice - (order.deliveryCharge || 0);

  const formattedDate = new Date(order.createdAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Sales-channel meta — present only when the vendor logged the order
  // offline (WhatsApp, walk-in, etc). Storefront orders return null and
  // the badge in the hero falls back to nothing rendered.
  const orderChannelMeta = resolveChannel(order.channel);

  return (
    <View className="bg-gray-50 flex-1">
      <ScreenHeader title="Order Details" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* === BRANDED HERO === */}
        <View
          className="mx-5 mt-4 mb-4 rounded-3xl overflow-hidden px-5 pt-5 pb-6"
          style={{ backgroundColor: "#194eb8" }}
        >
          {/* Decorative soft circle — same language as Home/LocationManagement. */}
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />

          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 pr-3">
              <Text className="text-white/70 text-[10.5px] font-extrabold uppercase tracking-[1.4px]">
                Order
              </Text>
              <Text className="text-white text-[18px] font-extrabold tracking-tight mt-0.5">
                #{order.orderNumber}
              </Text>
            </View>

            <View
              className="flex-row items-center gap-1.5 bg-white/15 border border-white/20 rounded-full px-2.5 py-1"
            >
              <View className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
              <Text className="text-white text-[10.5px] font-extrabold tracking-wide uppercase">
                {status}
              </Text>
            </View>
          </View>

          <Text className="text-white/85 text-[28px] font-extrabold tracking-tight mt-3">
            {formatNgn(order.totalPrice)}
          </Text>
          <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text className="text-white/70 text-[12px]">{formattedDate}</Text>
            {/* Channel meta — only renders when the order was logged
                offline. Reads from the same shared meta as the badge
                so labels/colours stay consistent everywhere. */}
            {orderChannelMeta && (
              <>
                <Text className="text-white/40 text-[12px]">·</Text>
                <View
                  className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.20)',
                  }}
                >
                  <Ionicons
                    name={orderChannelMeta.icon}
                    size={10}
                    color="#ffffff"
                  />
                  <Text className="text-white text-[10.5px] font-extrabold tracking-wide">
                    Logged via {orderChannelMeta.short}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* === STATUS JOURNEY STEPPER === */}
        {journeyIndex >= 0 && (
          <View className="px-5 mb-4">
            <View
              className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center justify-between">
                {STATUS_JOURNEY.map((step, idx) => {
                  const isDone = idx < journeyIndex;
                  const isCurrent = idx === journeyIndex;
                  const stepTone = STATUS_TONE[step];
                  return (
                    <React.Fragment key={step}>
                      <View className="items-center" style={{ width: 56 }}>
                        <View
                          className={`w-7 h-7 rounded-full items-center justify-center ${
                            isCurrent
                              ? stepTone.bg
                              : isDone
                              ? "bg-emerald-100"
                              : "bg-gray-100"
                          }`}
                          style={
                            isCurrent
                              ? {
                                  borderWidth: 2,
                                  borderColor: stepTone.accent,
                                }
                              : undefined
                          }
                        >
                          {isDone ? (
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="#059669"
                            />
                          ) : isCurrent ? (
                            <View
                              className={`w-2 h-2 rounded-full ${stepTone.dot}`}
                            />
                          ) : (
                            <Text className="text-[10px] font-extrabold text-gray-400">
                              {idx + 1}
                            </Text>
                          )}
                        </View>
                        <Text
                          className={`text-[12px] font-bold mt-1.5 tracking-wide ${
                            isCurrent
                              ? stepTone.text
                              : isDone
                              ? "text-emerald-700"
                              : "text-gray-400"
                          }`}
                        >
                          {step}
                        </Text>
                      </View>
                      {idx < STATUS_JOURNEY.length - 1 && (
                        <View
                          className={`flex-1 h-px mx-1 ${
                            idx < journeyIndex ? "bg-emerald-200" : "bg-gray-200"
                          }`}
                          style={{ marginTop: -16 }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* === CUSTOMER === */}
        <View className="px-5 mb-4">
          <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-2 pl-1">
            Customer
          </Text>

          <View
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View className="px-4 py-4 flex-row items-center">
              <View className="relative">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: avatarColor,
                    shadowColor: avatarColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <Text className="text-white font-extrabold text-[15px]">
                    {initials}
                  </Text>
                </View>
              </View>
              <View className="flex-1 ml-3 min-w-0">
                <Text
                  className="text-[16px] font-extrabold text-gray-900 tracking-tight"
                  numberOfLines={1}
                >
                  {order.buyerName}
                </Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Ionicons
                    name={
                      order.fulfillmentType === "delivery"
                        ? "bicycle"
                        : "storefront-outline"
                    }
                    size={12}
                    color="#64748b"
                  />
                  <Text className="text-[12px] text-gray-500 font-semibold">
                    {order.fulfillmentType === "delivery"
                      ? "Delivery order"
                      : "Pickup order"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick actions — three icon pills, each with its own tint. */}
            <View className="px-4 pb-4 flex-row gap-2">
              <Pressable
                onPress={handleCall}
                className="flex-1 flex-row items-center justify-center gap-1.5 h-11 rounded-2xl bg-gray-50 border border-gray-100 active:bg-gray-100"
              >
                <Ionicons name="call" size={15} color="#374151" />
                <Text className="text-[13px] font-extrabold text-gray-800">
                  Call
                </Text>
              </Pressable>
              <Pressable
                onPress={handleWhatsApp}
                className="flex-1 flex-row items-center justify-center gap-1.5 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 active:bg-emerald-100"
              >
                <Ionicons name="logo-whatsapp" size={15} color="#059669" />
                <Text className="text-[13px] font-extrabold text-emerald-700">
                  WhatsApp
                </Text>
              </Pressable>
              {order.buyerEmail ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(`mailto:${order.buyerEmail}`).catch(() => {
                      toast.show("Couldn't open email app", { type: "warning" });
                    })
                  }
                  className="w-11 h-11 rounded-2xl items-center justify-center bg-blue-50 border border-blue-100 active:bg-blue-100"
                >
                  <Ionicons name="mail" size={15} color="#2563eb" />
                </Pressable>
              ) : null}
            </View>

            {/* Email row */}
            {order.buyerEmail ? (
              <View className="px-4 py-3 border-t border-gray-100 flex-row items-center gap-2">
                <Ionicons name="mail-outline" size={13} color="#94a3b8" />
                <Text
                  className="text-[12.5px] text-gray-600 flex-1"
                  numberOfLines={1}
                >
                  {order.buyerEmail}
                </Text>
              </View>
            ) : null}

            {/* Delivery address */}
            {order.fulfillmentType === "delivery" ? (
              <View className="px-4 py-3 border-t border-gray-100 bg-blue-50/30">
                <View className="flex-row items-start gap-2">
                  <View className="w-7 h-7 rounded-lg bg-blue-100 items-center justify-center mt-0.5">
                    <Ionicons name="location" size={13} color="#2563eb" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[10px] font-extrabold text-blue-700 uppercase tracking-[1px] mb-0.5">
                      Delivery address
                    </Text>
                    <Text className="text-[13px] text-gray-900 leading-[18px]">
                      {order.deliveryAddress}
                    </Text>
                    {(order.lga || order.state) && (
                      <Text className="text-[12px] text-gray-500 mt-0.5">
                        {order.lga ? `${order.lga}, ` : ""}
                        {order.state}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* === ITEMS === */}
        <View className="px-5 mb-4">
          <View className="flex-row items-center justify-between mb-2 pl-1">
            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px]">
              Items
            </Text>
            <View className="bg-gray-100 rounded-full px-2 py-0.5">
              <Text className="text-[10.5px] font-extrabold text-gray-600">
                {order.catalogItems.length}
              </Text>
            </View>
          </View>

          <View
            className="bg-white rounded-2xl overflow-hidden border border-gray-100"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            {order.catalogItems.map((item: any, index: number) => (
              <View
                key={item.id || index}
                className={`px-4 py-3.5 flex-row ${
                  index !== order.catalogItems.length - 1
                    ? "border-b border-gray-50"
                    : ""
                }`}
              >
                <View className="w-16 h-16 bg-gray-50 rounded-xl mr-3 overflow-hidden border border-gray-100">
                  <AppImage
                    uri={item.image}
                    style={{ width: "100%", height: "100%" }}
                  />
                </View>

                <View className="flex-1 justify-center min-w-0">
                  <Text
                    className="text-[14.5px] font-extrabold text-gray-900 tracking-tight mb-1"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <View className="bg-gray-100 px-2 py-0.5 rounded-md">
                      <Text className="text-[11px] font-extrabold text-gray-600">
                        ×{item.quantity}
                      </Text>
                    </View>
                    {item.size ? (
                      <View className="bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md">
                        <Text className="text-[11px] font-extrabold text-violet-700">
                          {item.size}
                        </Text>
                      </View>
                    ) : null}
                    {item.color ? (
                      <View className="flex-row items-center gap-1 bg-gray-50 border border-gray-100 pl-1 pr-2 py-0.5 rounded-md">
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: item.color,
                            borderWidth: isLightHex(item.color) ? 1 : 0,
                            borderColor: "#e5e7eb",
                          }}
                        />
                        <Text className="text-[11px] font-semibold text-gray-600">
                          Color
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View className="justify-center items-end pl-2">
                  <Text className="text-[14.5px] font-extrabold text-gray-900 tracking-tight">
                    {formatNgn(item.price * item.quantity)}
                  </Text>
                  {item.quantity > 1 && (
                    <Text className="text-[10.5px] text-gray-400 mt-0.5 font-semibold">
                      {formatNgn(item.price)} ea
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* === PAYMENT SUMMARY === */}
        <View className="px-5 mb-4">
          <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-2 pl-1">
            Payment summary
          </Text>

          <View
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View className="px-5 pt-4 pb-3">
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-[13px] text-gray-500">Subtotal</Text>
                <Text className="text-[13.5px] font-bold text-gray-900">
                  {formatNgn(subtotal)}
                </Text>
              </View>
              {order.deliveryCharge > 0 && (
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[13px] text-gray-500">Delivery</Text>
                  </View>
                  <Text className="text-[13.5px] font-bold text-gray-900">
                    {formatNgn(order.deliveryCharge)}
                  </Text>
                </View>
              )}
            </View>

            <View
              className="px-5 py-4 flex-row items-end justify-between"
              style={{ backgroundColor: "#f8fafc" }}
            >
              <View>
                <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px]">
                  Total
                </Text>
                <Text className="text-[13px] text-gray-500 mt-0.5">
                  Customer paid
                </Text>
              </View>
              <Text className="text-[24px] font-extrabold text-gray-900 tracking-tight">
                {formatNgn(order.totalPrice)}
              </Text>
            </View>

            <View className="px-5 py-3 border-t border-gray-100 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={isPaid ? "card" : "cash-outline"}
                  size={14}
                  color="#64748b"
                />
                <Text className="text-[12.5px] text-gray-600 font-semibold">
                  Payment status
                </Text>
              </View>
              <View
                className={`flex-row items-center gap-1 px-2 py-0.5 rounded-md ${
                  isPaid ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100"
                }`}
              >
                <View
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPaid ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <Text
                  className={`text-[10.5px] font-extrabold tracking-wide ${
                    isPaid ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isPaid ? "PAID" : "PENDING"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* === FLOATING ACTION BAR ===
          Forward action advances the order one step. Backward action lets
          the vendor undo a mistake, gated behind a confirm so a stray tap
          on the bottom of the screen doesn't silently rewind status. */}
      {(action || prevAction) && (
        <View
          className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-7 bg-white border-t border-gray-100"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <View className="flex-row gap-2">
            {prevAction ? (
              <Pressable
                disabled={statusUpdating}
                onPress={() => {
                  Alert.alert(
                    "Move order back?",
                    `This will set the order status back to ${prevAction.prev}. Use this if you marked the order ${status} by mistake.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Move back",
                        style: "destructive",
                        onPress: () => revertTo(prevAction.prev),
                      },
                    ]
                  );
                }}
                className={`${
                  action ? "" : "flex-1"
                } rounded-2xl py-4 px-4 flex-row items-center justify-center gap-1.5 border border-gray-200 bg-white active:bg-gray-50 ${
                  statusUpdating ? "opacity-50" : ""
                }`}
              >
                <Ionicons name="arrow-undo" size={15} color="#475569" />
                <Text className="text-gray-700 font-extrabold text-[13.5px]">
                  {action ? "Undo" : prevAction.label}
                </Text>
              </Pressable>
            ) : null}

            {action ? (
              <Pressable
                disabled={statusUpdating}
                onPress={() => advanceTo(action.next)}
                className={`flex-1 rounded-2xl py-4 flex-row items-center justify-center gap-2 active:opacity-90 ${
                  statusUpdating ? "opacity-60" : ""
                }`}
                style={{
                  backgroundColor: STATUS_TONE[action.next].accent,
                  shadowColor: STATUS_TONE[action.next].accent,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 6,
                }}
              >
                {statusUpdating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    {action.icon ? (
                      <Ionicons name={action.icon} size={18} color="white" />
                    ) : null}
                    <Text className="text-white font-extrabold text-[15px] tracking-tight">
                      {action.label}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}
