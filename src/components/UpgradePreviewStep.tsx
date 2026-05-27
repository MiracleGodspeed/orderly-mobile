import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { getUpgradeQuote } from "../api/vendor/vendor.api";
import type { SubscriptionUpgradeQuote } from "../api/vendor/vendor.types";

type BillingCycle = "Monthly" | "Quarterly" | "Yearly";

type Props = {
  plan: {
    id: number | null;
    name: string;
    /** Pre-credit cycle price (after the yearly discount, if any).
     *  Used as fallback in the rare case the quote call fails. */
    price: number;
  };
  billingCycle: BillingCycle;
  onBack: () => void;
  /** Fired with the resolved quote when the vendor confirms. Passing
   *  the full quote (not just the amountDue) so PaymentMethodStep can
   *  show the credit breakdown too — keeps the math visible the whole
   *  way through, mirroring the web modal. */
  onContinue: (quote: SubscriptionUpgradeQuote) => void;
};

const cycleToDuration = (cycle: BillingCycle) =>
  cycle === "Yearly" ? 12 : cycle === "Quarterly" ? 3 : 1;

const cycleSuffix = (cycle: BillingCycle) =>
  cycle === "Monthly" ? "month" : cycle === "Quarterly" ? "quarter" : "year";

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function UpgradePreviewStep({
  plan,
  billingCycle,
  onBack,
  onContinue,
}: Props) {
  const [quote, setQuote] = useState<SubscriptionUpgradeQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plan.id) {
      setLoading(false);
      setError("Pick a plan first.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getUpgradeQuote({
          subscriptionPlanId: plan.id!,
          subscriptionDuration: cycleToDuration(billingCycle),
          durationUnit: "months",
        });
        if (cancelled) return;
        setQuote(data);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "Couldn't load your upgrade quote.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.id, billingCycle]);

  const handleContinue = () => {
    if (!quote || !quote.canProceed) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onContinue(quote);
  };

  // Apple-paid users can't be upgraded server-side without double-
  // billing once Apple's next renewal hits. Deeplink them straight
  // into the Apple Subscriptions sheet (Settings → Apple ID → Subs)
  // — the only legitimate place to switch plans for their existing
  // billing arrangement.
  const handleManageApple = async () => {
    try {
      await Linking.openURL("itms-apps://apps.apple.com/account/subscriptions");
    } catch {
      // Fallback to the long-form URL if the IT MS scheme isn't
      // registered (very old iOS builds).
      Linking.openURL("https://apps.apple.com/account/subscriptions").catch(
        () => {}
      );
    }
  };

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-start gap-2">
          <Pressable
            onPress={onBack}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 mr-1"
            hitSlop={6}
          >
            <Ionicons name="arrow-back" size={18} color="#374151" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-blue-600">
              Step 2 of 3
            </Text>
            <Text className="text-[20px] font-extrabold text-gray-900 tracking-tight mt-0.5">
              Review your upgrade
            </Text>
            <Text className="text-[12.5px] text-gray-500 mt-0.5">
              We&apos;ve credited the unused time on your current plan.
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-3 text-[13px] text-gray-500">
            Building your upgrade quote…
          </Text>
        </View>
      ) : error || !quote ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-12 h-12 rounded-2xl bg-rose-50 items-center justify-center mb-3">
            <Ionicons name="close" size={22} color="#dc2626" />
          </View>
          <Text className="text-[14px] font-extrabold text-gray-900 mb-2 text-center">
            Couldn&apos;t load your upgrade quote
          </Text>
          <Text className="text-[12.5px] text-gray-500 text-center leading-[18px]">
            {error ?? "Please go back and try again."}
          </Text>
        </View>
      ) : !quote.canProceed ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        >
          <View className="rounded-3xl border-2 border-amber-200 bg-amber-50/60 p-5">
            <View className="flex-row items-start gap-3">
              <View className="w-11 h-11 rounded-2xl bg-amber-100 items-center justify-center">
                <Ionicons
                  name={
                    quote.isAppleSubscription
                      ? "logo-apple"
                      : quote.isSamePlan
                        ? "checkmark-circle"
                        : "lock-closed"
                  }
                  size={20}
                  color="#b45309"
                />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[14.5px] font-extrabold text-gray-900">
                  {quote.isAppleSubscription
                    ? "Managed by Apple"
                    : quote.isSamePlan
                      ? "You're already on this plan"
                      : "Available at renewal"}
                </Text>
                <Text className="text-[12.5px] text-gray-700 mt-1 leading-[18px]">
                  {quote.reason ?? "We can't process this change right now."}
                </Text>
                {quote.isAppleSubscription && (
                  <Text className="text-[11.5px] text-gray-600 mt-2 leading-[17px]">
                    Open Subscriptions in your Apple ID to switch or cancel
                    your Orderly plan. Cancelling there stops Apple from
                    billing you on the next renewal.
                  </Text>
                )}
              </View>
            </View>
            {quote.isAppleSubscription && (
              <Pressable
                onPress={handleManageApple}
                className="mt-4 h-11 rounded-2xl bg-gray-900 items-center justify-center flex-row gap-2"
              >
                <Ionicons name="logo-apple" size={16} color="white" />
                <Text className="text-white font-bold text-[14px]">
                  Open Apple Subscriptions
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
          >
            {/* Switching plan card */}
            <View
              className="rounded-3xl bg-white border border-gray-100 overflow-hidden mb-4"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="px-5 py-3.5 border-b border-gray-100 flex-row items-center justify-between">
                <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-gray-500">
                  Switching plan
                </Text>
                <View className="flex-row items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  <Ionicons name="sparkles" size={10} color="#059669" />
                  <Text className="text-[10px] font-extrabold text-emerald-700">
                    CREDIT APPLIED
                  </Text>
                </View>
              </View>

              <View className="px-5 py-4 flex-row items-center gap-3">
                <View className="flex-1 min-w-0">
                  <Text className="text-[10.5px] font-extrabold uppercase tracking-wide text-gray-500">
                    Current
                  </Text>
                  <Text
                    className="text-[14px] font-extrabold text-gray-900 mt-0.5"
                    numberOfLines={1}
                  >
                    {quote.currentPlanName ?? "—"}
                  </Text>
                  <Text className="text-[11.5px] text-gray-500 mt-0.5">
                    ₦{Math.round(quote.currentPlanPrice).toLocaleString()} / mo
                  </Text>
                </View>

                <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center">
                  <Ionicons name="trending-up" size={16} color="#2563eb" />
                </View>

                <View className="flex-1 min-w-0 items-end">
                  <Text className="text-[10.5px] font-extrabold uppercase tracking-wide text-blue-600">
                    New
                  </Text>
                  <Text
                    className="text-[14px] font-extrabold text-gray-900 mt-0.5"
                    numberOfLines={1}
                  >
                    {quote.newPlanName}
                  </Text>
                  <Text className="text-[11.5px] text-gray-500 mt-0.5">
                    / {cycleSuffix(billingCycle)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Math card */}
            <View
              className="rounded-3xl bg-white border border-gray-100 overflow-hidden"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="px-5 py-3.5 border-b border-gray-100">
                <Text className="text-[13px] font-extrabold text-gray-900">
                  {quote.newPlanName} — billed {billingCycle.toLowerCase()}
                </Text>
                <Text className="text-[11px] text-gray-500 mt-0.5">
                  {quote.unusedDays > 0
                    ? `${quote.unusedDays} day${
                        quote.unusedDays === 1 ? "" : "s"
                      } unused on ${quote.currentPlanName ?? "your current plan"}`
                    : "Fresh new period from today"}
                </Text>
              </View>

              <View className="px-5 py-3.5 bg-gray-50/60 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-[12.5px] text-gray-600">
                    {quote.newPlanName} ({quote.newDuration}{" "}
                    {quote.newDurationUnit})
                  </Text>
                  <Text className="text-[12.5px] font-bold text-gray-900">
                    ₦{quote.newCyclePrice.toLocaleString()}
                  </Text>
                </View>

                {quote.rawCreditAvailable > 0 && (
                  <View className="flex-row justify-between">
                    <Text className="text-[12.5px] font-bold text-emerald-700">
                      Credit from {quote.currentPlanName ?? "current plan"}
                    </Text>
                    <Text className="text-[12.5px] font-extrabold text-emerald-700">
                      − ₦{quote.rawCreditAvailable.toLocaleString()}
                    </Text>
                  </View>
                )}

                {quote.forfeitedCredit > 0 && (
                  <View>
                    <View className="flex-row justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons
                          name="alert-circle"
                          size={13}
                          color="#b45309"
                        />
                        <Text className="text-[12.5px] font-bold text-amber-700">
                          Forfeited
                        </Text>
                      </View>
                      <Text className="text-[12.5px] font-extrabold text-amber-700">
                        + ₦{quote.forfeitedCredit.toLocaleString()}
                      </Text>
                    </View>
                    <Text className="text-[11px] text-amber-700/90 leading-[16px] mt-1 pl-[18px]">
                      Your unused {quote.currentPlanName ?? "current plan"} time
                      is worth more than this{" "}
                      {quote.newDuration === 12
                        ? "yearly"
                        : quote.newDuration === 3
                          ? "quarterly"
                          : "monthly"}{" "}
                      cycle, so ₦{quote.forfeitedCredit.toLocaleString()} of it
                      won't carry over.
                      {quote.newDuration < 3
                        ? " Switch to Quarterly or Yearly to use it all."
                        : quote.newDuration < 12
                          ? " Switch to Yearly to use it all."
                          : ""}
                    </Text>
                  </View>
                )}

                <View className="h-px bg-gray-200 my-1" />

                <View className="flex-row justify-between items-baseline">
                  <Text className="text-[13px] font-bold text-gray-900">
                    Total today
                  </Text>
                  <Text className="text-[22px] font-extrabold text-gray-900 tracking-tight">
                    ₦{quote.amountDue.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-[11.5px] text-gray-500">
                    New period ends
                  </Text>
                  <Text className="text-[11.5px] font-semibold text-gray-700">
                    {new Date(quote.newExpiryDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            </View>

            <Text className="text-[11.5px] text-gray-500 leading-[17px] mt-4 px-1">
              Your {quote.currentPlanName ?? "current"} plan ends today. The
              new period starts fresh — your full {quote.newDuration}-month
              run begins right after payment.
            </Text>
          </ScrollView>

          {/* Sticky CTA */}
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
              onPress={handleContinue}
              className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2"
              style={{
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPressIn={haptic}
            >
              <Text className="text-white font-bold text-[15px]">
                Continue · ₦{quote.amountDue.toLocaleString()}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
