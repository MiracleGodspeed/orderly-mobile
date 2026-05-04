import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useToast } from "react-native-toast-notifications";

import {
  createVendorSubscription,
  verifyPayment,
} from "../api/vendor/vendor.api";

type PaymentOption = "card" | "bank_transfer";

type Props = {
  plan: {
    id: number | null;
    name: string;
    price: number;
  };
  billingCycle: "Monthly" | "Quarterly" | "Yearly";
  onBack: () => void;
  /** Fires after the user has paid AND we've verified the reference with the
      backend. The reference is what the backend / Paystack assigned. */
  onPaymentVerified: (reference: string) => void;
};

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const cycleLabel = (cycle: string) =>
  cycle === "Monthly"
    ? "Billed monthly"
    : cycle === "Quarterly"
    ? "Billed every 3 months"
    : cycle === "Yearly"
    ? "Billed yearly"
    : `Billed ${cycle.toLowerCase()}`;

const cycleToDuration = (cycle: Props["billingCycle"]) =>
  cycle === "Yearly" ? 12 : cycle === "Quarterly" ? 3 : 1;

const nextRenewalDate = (cycle: string) => {
  const d = new Date();
  if (cycle === "Quarterly") d.setMonth(d.getMonth() + 3);
  else if (cycle === "Yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Tiny URL-search-param parser since RN doesn't expose URL on iOS reliably.
function getRefFromUrl(url: string): string | null {
  const q = url.split("?")[1];
  if (!q) return null;
  for (const pair of q.split("&")) {
    const [k, v] = pair.split("=");
    if (k === "reference" || k === "trxref") {
      return decodeURIComponent(v ?? "");
    }
  }
  return null;
}

// Public web bounce that flips Paystack's HTTPS redirect into our `orderly://`
// scheme. Lives at /app-callback (NOT a protected vendor route — paying users
// aren't logged in on the web, so an auth guard would intercept them).
const WEB_CALLBACK_URL = "https://orderlystores.com/app-callback";
//const WEB_CALLBACK_URL = "http://localhost:3000/app-callback";

const APP_DEEPLINK_PREFIX = "orderly://billing/callback";

type Phase = "idle" | "starting" | "paying" | "verifying";

export default function PaymentMethodStep({
  plan,
  billingCycle,
  onBack,
  onPaymentVerified,
}: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<PaymentOption>("card");
  const [phase, setPhase] = useState<Phase>("idle");

  const isBusy = phase !== "idle";

  const handlePay = async () => {
    if (!plan.id) {
      toast.show("Pick a plan first", { type: "danger" });
      return;
    }
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    try {
      setPhase("starting");
      const res = await createVendorSubscription({
        subscriptionPlanId: plan.id,
        subscriptionDuration: cycleToDuration(billingCycle),
        durationUnit: "months",
        paymentMethod: selected,
        hasCustomDomain: false,
        callbackUrl: WEB_CALLBACK_URL,
        amount: plan.price,
        isTrialPeriod: false,
      });

      // Saved-card direct charge — backend already debited, no browser needed.
      if (res.authorizationUrl === "is-charge-authorization") {
        setPhase("verifying");
        if (res.reference) {
          await verifyPayment(res.reference);
        }
        toast.show("Payment confirmed", { type: "success" });
        onPaymentVerified(res.reference ?? "");
        setPhase("idle");
        return;
      }

      // Open Paystack inside an in-app browser session. The session resolves
      // the moment the browser is redirected to a URL starting with our
      // custom scheme (the web callback page bounces to it for us).
      setPhase("paying");
      const result = await WebBrowser.openAuthSessionAsync(
        res.authorizationUrl,
        APP_DEEPLINK_PREFIX
      );

      if (result.type !== "success" || !result.url) {
        // User dismissed the sheet without paying. Stay on the screen.
        setPhase("idle");
        return;
      }

      const reference = getRefFromUrl(result.url);
      if (!reference) {
        toast.show("Couldn't read the payment reference. Try again.", {
          type: "danger",
        });
        setPhase("idle");
        return;
      }

      // Re-confirm with the backend even though the webhook is the real
      // source of truth — this gives the user immediate UI feedback.
      setPhase("verifying");
      const verify = await verifyPayment(reference);

      if (verify.status === "success") {
        if (Platform.OS === "ios") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
        }
        onPaymentVerified(reference);
      } else {
        toast.show(
          "Payment didn't go through. If you were charged, it'll resolve automatically.",
          { type: "danger" }
        );
      }
    } catch (err: any) {
      console.error("Payment flow error:", err);
      toast.show(err?.message || "Something went wrong starting your payment.", {
        type: "danger",
      });
    } finally {
      setPhase((p) => (p === "verifying" || p === "paying" ? "idle" : p));
    }
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3 flex-row items-start gap-2">
            <Pressable
              onPress={onBack}
              disabled={isBusy}
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 mr-1"
              hitSlop={6}
            >
              <Ionicons name="arrow-back" size={18} color="#374151" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-blue-600">
                Step 2 of 2
              </Text>
              <Text className="text-[20px] font-extrabold text-gray-900 tracking-tight mt-0.5">
                Payment method
              </Text>
              <Text className="text-[12.5px] text-gray-500 mt-0.5">
                Choose how you'd like to pay.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
      >
        {/* Order summary card */}
        <View
          className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-5"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between">
            <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-gray-500">
              Order summary
            </Text>
            <View className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              <Ionicons name="lock-closed" size={10} color="#2563eb" />
              <Text className="text-[10px] font-extrabold text-blue-700">
                SECURE
              </Text>
            </View>
          </View>

          <View className="px-5 py-4">
            <View className="flex-row items-start gap-3">
              <View className="w-11 h-11 rounded-xl bg-blue-50 items-center justify-center">
                <Ionicons name="rocket" size={20} color="#2563eb" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[15px] font-extrabold text-gray-900">
                  {plan.name}
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5">
                  {cycleLabel(billingCycle)}
                </Text>
              </View>
            </View>
          </View>

          <View className="px-5 py-3 bg-gray-50 border-t border-gray-100 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-600">Plan price</Text>
              <Text className="text-[12.5px] font-bold text-gray-900">
                ₦{plan.price.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-600">Next renewal</Text>
              <Text className="text-[12.5px] font-bold text-gray-900">
                {nextRenewalDate(billingCycle)}
              </Text>
            </View>
            <View className="h-px bg-gray-200 my-1" />
            <View className="flex-row justify-between items-baseline">
              <Text className="text-[13px] font-bold text-gray-900">
                Total today
              </Text>
              <Text className="text-[20px] font-extrabold text-gray-900 tracking-tight">
                ₦{plan.price.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment options */}
        <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-gray-500 mb-3 px-1">
          Pay with
        </Text>

        <PaymentOptionCard
          icon="card-outline"
          title="Card payment"
          description="Visa, Mastercard, Verve — paid securely via Paystack"
          selected={selected === "card"}
          disabled={isBusy}
          onPress={() => {
            haptic();
            setSelected("card");
          }}
          tone="blue"
        />

        <PaymentOptionCard
          icon="business-outline"
          title="Bank transfer"
          description="Transfer directly from your bank — no card needed"
          selected={selected === "bank_transfer"}
          disabled={isBusy}
          onPress={() => {
            haptic();
            setSelected("bank_transfer");
          }}
          tone="emerald"
        />

        <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex-row items-start gap-2.5 mt-3">
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color="#475569"
          />
          <Text className="text-[12px] text-gray-600 flex-1 leading-[18px]">
            Your payment is processed by Paystack. We never see or store your
            card details.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky pay */}
      <View
        className="px-5 pt-3 pb-7 border-t border-gray-100 bg-white"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Pressable
          onPress={handlePay}
          disabled={isBusy || !plan.id}
          className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
            isBusy || !plan.id ? "bg-blue-400" : "bg-blue-600"
          }`}
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isBusy ? 0 : 0.25,
            shadowRadius: 8,
            elevation: isBusy ? 0 : 4,
          }}
        >
          {phase === "starting" ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-bold text-[15px]">
                Starting payment…
              </Text>
            </>
          ) : phase === "paying" ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-bold text-[15px]">
                Waiting for Paystack…
              </Text>
            </>
          ) : phase === "verifying" ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-bold text-[15px]">
                Confirming your payment…
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="lock-closed" size={14} color="white" />
              <Text className="text-white font-bold text-[15px]">
                Pay ₦{plan.price.toLocaleString()}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function PaymentOptionCard({
  icon,
  title,
  description,
  selected,
  disabled,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  tone: "blue" | "emerald";
}) {
  const toneStyle =
    tone === "blue"
      ? { iconBg: "bg-blue-50", iconColor: "#2563eb" }
      : { iconBg: "bg-emerald-50", iconColor: "#059669" };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center gap-3 px-4 py-3.5 mb-2.5 rounded-2xl border-2 ${
        selected
          ? "border-blue-600 bg-blue-50/40"
          : "border-gray-100 bg-white"
      } ${disabled ? "opacity-60" : ""}`}
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: selected ? 0.06 : 0.03,
        shadowRadius: 6,
        elevation: selected ? 2 : 1,
      }}
    >
      <View
        className={`w-11 h-11 rounded-xl items-center justify-center ${toneStyle.iconBg}`}
      >
        <Ionicons name={icon} size={20} color={toneStyle.iconColor} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[14px] font-extrabold text-gray-900">{title}</Text>
        <Text className="text-[11.5px] text-gray-500 mt-0.5 leading-[16px]">
          {description}
        </Text>
      </View>
      <View
        className={`w-5 h-5 rounded-full ml-2 items-center justify-center ${
          selected ? "bg-blue-600" : "border-2 border-gray-200 bg-white"
        }`}
      >
        {selected && <Ionicons name="checkmark" size={12} color="white" />}
      </View>
    </Pressable>
  );
}
