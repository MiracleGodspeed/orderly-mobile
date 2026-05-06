import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
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
  listOrderActivity,
} from "../api/vendor/vendor.api";
import { OrderActivity } from "../api/vendor/vendor.types";
import { useStaffPermissions } from "../hooks/useStaffPermissions";
import { STAFF_PERMISSIONS } from "../lib/staffPermissions";
import { formatRelativeTime, parseBackendDate } from "../lib/format";
import { useVendor } from "../../context/VendorContext";

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

// Renders an audit row's headline. Status changes carry the new status
// in their metadata blob; we surface that inline ("Marked as Shipped")
// so the timeline reads naturally rather than as opaque event keys.
const auditTitle = (a: OrderActivity): string => {
  if (a.action === "payment_confirmed") return "Payment confirmed";
  if (a.action === "payment_rejected") return "Payment rejected";
  if (a.action === "status_changed") {
    let nextStatus = "";
    if (a.metadata) {
      try {
        nextStatus = (JSON.parse(a.metadata)?.newStatus as string) ?? "";
      } catch {
        // Bad JSON — fall back to the plain title.
      }
    }
    if (nextStatus.toLowerCase() === "dispatched") return "Marked as shipped";
    if (nextStatus.toLowerCase() === "delivered") return "Marked as delivered";
    if (nextStatus) return `Status changed to ${nextStatus}`;
    return "Status updated";
  }
  return a.action;
};

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
  const perms = useStaffPermissions();
  const { storeData } = useVendor();

  const [status, setStatus] = useState<OrderStatus>(mapStatus(safeOrder));
  // Disables the action buttons while a status-change request is in
  // flight so a double-tap doesn't fire two API calls.
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Two-step flow for confirming a manual payment:
  //   1. confirmManualPaidOpen — "Are you sure?" popover before we hit
  //      the API. Mark-as-paid is consequential (the customer will get a
  //      WhatsApp confirmation right after), so we don't fire it on a
  //      stray tap.
  //   2. paymentConfirmedOpen — "Payment confirmed!" success modal with
  //      a one-tap shortcut to message the buyer on WhatsApp.
  // Online-paid orders skip both — they're already auto-confirmed.
  const [confirmManualPaidOpen, setConfirmManualPaidOpen] = useState(false);
  const [paymentConfirmedOpen, setPaymentConfirmedOpen] = useState(false);

  // Permission gates — vendors and admins always pass; staff only
  // surface actions they're entitled to perform. The forward action
  // (Mark as Paid / Mark as Shipped) maps to the corresponding write
  // permission; the backward action depends on which step we're undoing
  // (Paid → Pending = reject, Shipped → Paid = status update).
  const canConfirmPayment = perms.has(STAFF_PERMISSIONS.ORDERS_CONFIRM);
  const canRejectPayment = perms.has(STAFF_PERMISSIONS.ORDERS_REJECT);
  const canUpdateStatus = perms.has(STAFF_PERMISSIONS.ORDERS_UPDATE_STATUS);

  // Audit timeline for the order. Refetched after each successful
  // status change so the new entry appears immediately.
  const [activity, setActivity] = useState<OrderActivity[]>([]);
  const refreshActivity = React.useCallback(async () => {
    if (!safeOrder.id) return;
    try {
      const rows = await listOrderActivity(safeOrder.id);
      setActivity(rows);
    } catch {
      // Timeline is best-effort — failures don't block the screen.
    }
  }, [safeOrder.id]);
  React.useEffect(() => {
    refreshActivity();
  }, [refreshActivity]);

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

  // Returns true on success, false on failure. The optional `silent` flag
  // suppresses the success toast — used when the caller is going to show
  // a richer success UI (e.g. a "Payment confirmed!" modal) instead.
  // Errors still toast either way; we never want a silent failure.
  const advanceTo = async (
    next: OrderStatus,
    opts?: { silent?: boolean }
  ): Promise<boolean> => {
    if (statusUpdating) return false;
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
        if (!opts?.silent) {
          toast.show("Order marked as paid", { type: "success" });
        }
      } else if (next === "Shipped") {
        // Paid → Shipped: flip every OrderRequest line under this batch
        // to Dispatched. The mobile concept of "shipped" maps to the
        // backend's `Dispatched` enum value.
        await updateOrderStatusByBatch(safeOrder.id, "Dispatched");
        if (!opts?.silent) {
          toast.show("Order marked as shipped", { type: "success" });
        }
      }
      invalidateOrders();
      refreshActivity();
      return true;
    } catch (err: any) {
      setStatus(previous);
      toast.show(err?.message || "Couldn't update the order", { type: "danger" });
      return false;
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
      refreshActivity();
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

  // Opens WhatsApp to the buyer. Optional `prefill` is URL-encoded into the
  // `text` param so the message is queued in the chat composer for the
  // vendor to review and send. Using a single helper for both the generic
  // "open chat" and the post-confirmation "Let them know" flow keeps the
  // deep-link / web-fallback logic in one place.
  const openBuyerWhatsApp = async (prefill?: string) => {
    if (!order.buyerPhone) {
      toast.show("No phone number available", { type: "warning" });
      return;
    }
    const phone = normalizePhone(order.buyerPhone);
    if (!phone) {
      toast.show("Phone number looks invalid", { type: "warning" });
      return;
    }
    const textParam = prefill ? `&text=${encodeURIComponent(prefill)}` : "";
    // WhatsApp's deep-link spec requires international digits with NO
    // leading + and NO spaces — exactly what `normalizePhone` returns.
    // Try the app deep link first; fall back to wa.me which handles
    // both "open the app" and "show install prompt" gracefully when
    // WhatsApp isn't installed.
    const deepLink = `whatsapp://send?phone=${phone}${textParam}`;
    const webLink = `https://wa.me/${phone}${prefill ? `?text=${encodeURIComponent(prefill)}` : ""}`;
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

  const handleWhatsApp = () => openBuyerWhatsApp();

  // "Let them know" — opens the buyer's WhatsApp with a pre-drafted
  // payment-confirmed message. Only used after a manual payment confirm,
  // since online payments already auto-receipt the buyer.
  //
  // Emoji choice notes: we deliberately stick to a tiny set of basic
  // single-codepoint emojis (👋 ✅ 📦 🙏) — these have been part of the
  // Unicode emoji standard since v1.0/6.0, render reliably across every
  // WhatsApp client, and survive a URL-encode round-trip cleanly. Newer
  // composite/sequence emojis (e.g. ZWJ-joined ones) have shown up as
  // "?" on older Android devices in past integrations, so we avoid them.
  const handleWhatsAppNotify = () => {
    const firstName = (order.buyerName || "").trim().split(/\s+/)[0] || "there";
    const storeName = (storeData?.storeName || "").trim();
    const ref = order.orderNumber ? `#${order.orderNumber}` : "";
    const total = formatNgn(order.totalPrice);

    const greeting = storeName
      ? `Hi ${firstName}! 👋 This is ${storeName}.`
      : `Hi ${firstName}! 👋`;
    const orderLine = ref
      ? `Payment of ${total} received for order ${ref} - thank you!`
      : `Payment of ${total} received - thank you!`;
    const signoff = storeName
      ? `Thanks for choosing ${storeName}! 🙏`
      : `Thanks for choosing us! 🙏`;

    const message =
      `${greeting}\n\n` +
      `✅ ${orderLine}\n\n` +
      `📦 We're processing your order now and we'll keep you posted on next steps.\n\n` +
      signoff;

    openBuyerWhatsApp(message);
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
              <View className="flex-row items-center gap-1.5">
                {/* Auto-confirmed badge — explains why no "undo payment"
                    button is showing for online orders. We only display
                    when the order is paid AND originated from an online
                    flow (i.e. not a manual bank-transfer entry). */}
                {isPaid && !isManualPayment ? (
                  <View
                    className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200"
                  >
                    <Ionicons name="lock-closed" size={9} color="#475569" />
                    <Text className="text-[9.5px] font-extrabold tracking-wide text-gray-600 uppercase">
                      Auto-confirmed
                    </Text>
                  </View>
                ) : null}
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
        </View>

        {/* "Let them know" — only after a *manual* payment confirmation.
            Online payments already auto-receipt, so this CTA would be
            redundant there. Persistent (not just a one-shot post-confirm
            toast) so vendors can re-open it if they close the app or want
            to resend. */}
        {isPaid 
        //&& isManualPayment 
        && order.buyerPhone ? (
          <View className="mx-5 mt-4">
            <Pressable
              onPress={handleWhatsAppNotify}
              className="rounded-2xl overflow-hidden flex-row items-center px-4 py-4 active:opacity-90"
              style={{
                backgroundColor: "#ecfdf5",
                borderWidth: 1,
                borderColor: "#a7f3d0",
              }}
            >
              <View
                className="w-11 h-11 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "#25D366" }}
              >
                <Ionicons name="logo-whatsapp" size={22} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-extrabold tracking-tight text-emerald-900">
                  Let {((order.buyerName || "").trim().split(/\s+/)[0]) || "them"} know
                </Text>
                <Text className="text-[11.5px] text-emerald-800/80 mt-0.5">
                  Send a quick WhatsApp confirming payment received and that the order is being processed
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#047857" />
            </Pressable>
          </View>
        ) : null}

        {/* Audit timeline — who did what to this order. Hidden when no
            activity is recorded yet (e.g. brand-new order). */}
        {activity.length > 0 && (
          <View className="mx-5 mt-4">
            <Text
              className="text-[11px] text-gray-400 uppercase tracking-[1.2px] mb-2 px-1"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Activity
            </Text>
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {activity.slice(0, 5).map((a, i) => (
                <View
                  key={a.id}
                  className={`flex-row items-start px-4 py-3 ${
                    i !== Math.min(activity.length, 5) - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View
                    className="w-7 h-7 rounded-full items-center justify-center mr-3 mt-0.5"
                    style={{
                      backgroundColor:
                        a.action === "payment_confirmed"
                          ? "#ecfdf5"
                          : a.action === "payment_rejected"
                          ? "#fef2f2"
                          : "#eff6ff",
                    }}
                  >
                    <Ionicons
                      name={
                        a.action === "payment_confirmed"
                          ? "checkmark-circle-outline"
                          : a.action === "payment_rejected"
                          ? "close-circle-outline"
                          : "swap-horizontal-outline"
                      }
                      size={14}
                      color={
                        a.action === "payment_confirmed"
                          ? "#047857"
                          : a.action === "payment_rejected"
                          ? "#b91c1c"
                          : "#1d4ed8"
                      }
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-[13px] text-gray-900"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      numberOfLines={1}
                    >
                      {auditTitle(a)}
                    </Text>
                    <Text
                      className="text-[11.5px] text-gray-500 mt-0.5"
                      numberOfLines={1}
                    >
                      {a.actorName ? `${a.actorName} · ` : ""}
                      {formatRelativeTime(parseBackendDate(a.createdAt))}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* === FLOATING ACTION BAR ===
          Forward action advances the order one step. Backward action lets
          the vendor undo a mistake, gated behind a confirm so a stray tap
          on the bottom of the screen doesn't silently rewind status.
          Each action is gated by a permission claim — staff without the
          relevant permission don't see the button at all. */}
      {(() => {
        // Forward action: Pending→Paid needs orders.confirm,
        // Paid→Shipped needs orders.update_status. Anything else means
        // the action shouldn't render for this user.
        const forwardAllowed =
          action?.next === "Paid"
            ? canConfirmPayment
            : action?.next === "Shipped"
            ? canUpdateStatus
            : true;

        // Backward action: Paid→Pending uses the manual-reject endpoint
        // (orders.reject). Shipped→Paid uses status update.
        const backwardAllowed =
          prevAction?.prev === "Pending"
            ? canRejectPayment && isManualPayment
            : prevAction?.prev === "Paid"
            ? canUpdateStatus
            : false;

        const showForward = !!action && forwardAllowed;
        const showBackward = !!prevAction && backwardAllowed;
        if (!showForward && !showBackward) return null;

        return (
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
            {showBackward && prevAction ? (
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
                  showForward ? "" : "flex-1"
                } rounded-2xl py-4 px-4 flex-row items-center justify-center gap-1.5 border border-gray-200 bg-white active:bg-gray-50 ${
                  statusUpdating ? "opacity-50" : ""
                }`}
              >
                <Ionicons name="arrow-undo" size={15} color="#475569" />
                <Text className="text-gray-700 font-extrabold text-[13.5px]">
                  {showForward ? "Undo" : prevAction.label}
                </Text>
              </Pressable>
            ) : null}

            {showForward && action ? (
              <Pressable
                disabled={statusUpdating}
                onPress={() => {
                  // Manual mark-as-paid runs through the confirm popover
                  // → success modal flow so the vendor double-checks
                  // before the customer gets a WhatsApp confirmation.
                  // Mark-as-shipped (and any non-manual mark-as-paid,
                  // though that's currently impossible) goes through
                  // immediately.
                  if (action.next === "Paid" && isManualPayment) {
                    setConfirmManualPaidOpen(true);
                  } else {
                    advanceTo(action.next);
                  }
                }}
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
        );
      })()}

      {/* === CONFIRM MANUAL PAYMENT POPOVER ===
          Defensive step before flipping a manual order to Paid. Vendors
          should reach this only after eyeballing their bank app and
          confirming the transfer cleared. We use a custom Modal (not
          Alert.alert) so the visual is on-brand and consistent with the
          success modal that follows. */}
      <Modal
        visible={confirmManualPaidOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!statusUpdating) setConfirmManualPaidOpen(false);
        }}
      >
        <Pressable
          onPress={() => {
            if (!statusUpdating) setConfirmManualPaidOpen(false);
          }}
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: "rgba(15,23,42,0.55)" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-3xl p-6"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center self-center mb-4"
              style={{ backgroundColor: "#fef3c7" }}
            >
              <Ionicons name="cash-outline" size={22} color="#b45309" />
            </View>
            <Text className="text-center text-[18px] font-extrabold text-gray-900 tracking-tight">
              Confirm payment received?
            </Text>
            <Text className="text-center text-[13px] text-gray-600 mt-2 leading-[19px]">
              Make sure {formatNgn(order.totalPrice)} has cleared in your bank account before confirming. The customer will get a WhatsApp confirmation right after.
            </Text>

            <View className="flex-row gap-2 mt-5">
              <Pressable
                onPress={() => {
                  if (!statusUpdating) setConfirmManualPaidOpen(false);
                }}
                disabled={statusUpdating}
                className={`flex-1 h-12 rounded-2xl items-center justify-center border border-gray-200 bg-white active:bg-gray-50 ${
                  statusUpdating ? "opacity-50" : ""
                }`}
              >
                <Text className="text-gray-700 font-extrabold text-[14px]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const ok = await advanceTo("Paid", { silent: true });
                  setConfirmManualPaidOpen(false);
                  if (ok) setPaymentConfirmedOpen(true);
                }}
                disabled={statusUpdating}
                className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                  statusUpdating ? "opacity-60" : ""
                }`}
                style={{ backgroundColor: "#059669" }}
              >
                {statusUpdating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                    <Text className="text-white font-extrabold text-[14px]">
                      Confirm
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* === PAYMENT CONFIRMED SUCCESS MODAL ===
          Celebratory acknowledgement after a manual confirm + a one-tap
          shortcut to message the buyer on WhatsApp. The persistent
          in-page CTA ("Let them know") still hangs around afterwards in
          case the vendor wants to resend. */}
      <Modal
        visible={paymentConfirmedOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentConfirmedOpen(false)}
      >
        <Pressable
          onPress={() => setPaymentConfirmedOpen(false)}
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: "rgba(15,23,42,0.55)" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-3xl p-6"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <View
              className="w-14 h-14 rounded-full items-center justify-center self-center mb-4"
              style={{ backgroundColor: "#d1fae5" }}
            >
              <Ionicons name="checkmark-circle" size={32} color="#059669" />
            </View>
            <Text className="text-center text-[19px] font-extrabold text-gray-900 tracking-tight">
              Payment confirmed!
            </Text>
            <Text className="text-center text-[13px] text-gray-600 mt-2 leading-[19px]">
              {order.orderNumber ? `Order #${order.orderNumber} is now ` : "This order is now "}
              marked as paid and ready to be processed.
            </Text>

            {order.buyerPhone ? (
              <Pressable
                onPress={() => {
                  setPaymentConfirmedOpen(false);
                  handleWhatsAppNotify();
                }}
                className="mt-5 h-13 rounded-2xl flex-row items-center justify-center gap-2 px-4 py-4"
                style={{
                  backgroundColor: "#25D366",
                  shadowColor: "#25D366",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="white" />
                <Text className="text-white font-extrabold text-[14.5px] tracking-tight">
                  Let {((order.buyerName || "").trim().split(/\s+/)[0]) || "them"} know on WhatsApp
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => setPaymentConfirmedOpen(false)}
              className="mt-3 h-12 rounded-2xl items-center justify-center"
            >
              <Text className="text-gray-500 font-bold text-[13.5px]">
                Done
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
