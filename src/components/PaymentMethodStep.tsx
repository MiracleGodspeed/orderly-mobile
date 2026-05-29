import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useToast } from "react-native-toast-notifications";

import {
  createVendorSubscription,
  verifyPayment,
  verifyAppleReceipt,
} from "../api/vendor/vendor.api";
import { issueWebHandoffToken } from "../api/auth/auth.api";
import type { SubscriptionUpgradeQuote } from "../api/vendor/vendor.types";
import { useInvalidateFeatures } from "../hooks/useFeatures";
import { useInvalidateStorePerformance } from "../hooks/useStorePerformance";
import { useInvalidateSubscriptionUsage } from "../hooks/useSubscriptionUsage";
import { useInvalidateSubscriptionHistory } from "../hooks/useSubscriptionHistory";
import { useVendor } from "../../context/VendorContext";
import { resolveAppleProductId } from "../lib/appleIapConfig";
import {
  purchaseAppleSubscription,
  finishAppleTransaction,
  fetchAppleSubscriptions,
} from "../lib/appleIap";
import { WEB_CALLBACK_URL } from "src/api/client";

// In-App Purchase (StoreKit) is the ONLY payment method on iOS per
// Apple guideline 3.1.1. Card / bank transfer are Paystack-routed
// and shown only on Android. Internal value stays "apple_pay" so the
// callsites don't churn; user-facing copy never references "Apple
// Pay" because that's the physical-goods payment SDK, not IAP.
type PaymentOption = "card" | "bank_transfer" | "apple_pay";

type Props = {
  plan: {
    id: number | null;
    name: string;
    price: number;
    // Apple StoreKit product IDs per cycle, threaded down from
    // RenewSubscriptionStep so the IAP flow knows which SKU to
    // charge. Null/undefined means no Apple subscription is
    // configured for that (plan, cycle); on iOS we surface an
    // unavailable-message in that case (we never fall back to
    // Paystack on iOS).
    appleProductIdMonthly?: string | null;
    appleProductIdQuarterly?: string | null;
    appleProductIdYearly?: string | null;
    /** Feature bullets — shown above the order summary so the user
     *  sees "what's included" at the moment of purchase. Required
     *  by 3.1.2 item #3. */
    features?: string[];
  };
  billingCycle: "Monthly" | "Quarterly" | "Yearly";
  /** When present, this is a prorated upgrade: amount charged is
   *  quote.amountDue (not plan.price), the create-subscription call
   *  sets applyProrationCredit=true so the server re-computes and
   *  deducts the credit, and the summary shows the credit line. Null
   *  for first-time subs, renewals, and trial conversions. */
  upgradeQuote?: SubscriptionUpgradeQuote | null;
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

/** Lowercase, period-of-renewal phrasing used inside the inline iOS
 *  auto-renew disclosure ("renews every <noun>"). Separate from
 *  `cycleLabel` because we don't want "billed" prefix there. */
const cycleNoun = (cycle: string) =>
  cycle === "Monthly"
    ? "month"
    : cycle === "Quarterly"
      ? "3 months"
      : cycle === "Yearly"
        ? "year"
        : cycle.toLowerCase();

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
// const WEB_CALLBACK_URL = "https://orderlystores.com/app-callback";
// // const WEB_CALLBACK_URL = "http://localhost:3000/app-callback";

const APP_DEEPLINK_PREFIX = "orderly://billing/callback";

// Vendor account settings on the web. Same destination as MoreHub /
// SubscriptionBilling — kept identical so the iOS-only "Manage account
// on the web" fallback inside the IAP screen lands in the same neutral
// account hub. Surfaces only after an IAP attempt has been cancelled
// or has failed; copy stays strictly neutral (no pricing, no
// alternative-payment language).
const WEB_ACCOUNT_URL = "https://orderlystores.com/vendor/settings";

type Phase = "idle" | "starting" | "paying" | "verifying";

export default function PaymentMethodStep({
  plan,
  billingCycle,
  upgradeQuote,
  onBack,
  onPaymentVerified,
}: Props) {
  const toast = useToast();
  // On iOS, IAP is the only choice (guideline 3.1.1) — default
  // selection is always "apple_pay" and the card/bank options are
  // not rendered. On Android, Paystack-routed card is the default
  // and "apple_pay" is never selectable.
  const [selected, setSelected] = useState<PaymentOption>(
    Platform.OS === "ios" ? "apple_pay" : "card"
  );
  const [phase, setPhase] = useState<Phase>("idle");
  // iOS-only: once an IAP attempt has been cancelled or has failed,
  // we surface a neutral "you can also manage your account on the
  // web" notice so vendors without an Apple-linked card aren't left
  // staring at an unresponsive Subscribe button. Persists for the
  // rest of the screen session — we never auto-hide it because
  // re-tapping Subscribe is still possible.
  const [showWebFallback, setShowWebFallback] = useState(false);

  // IAP pre-flight state. Apple's reviewer rejected build 28 under
  // 2.1(b) with "no action took when we tried to purchase" — which
  // we suspect was them tapping a Pay button that was silently
  // disabled (`!plan.id`) or whose StoreKit pre-conditions weren't
  // met (Paid Apps agreement pending, sandbox account session
  // expired, product missing from App Store Connect, etc.). The fix
  // is to verify on screen mount that StoreKit actually returns the
  // expected SKU, and render an EXPLICIT inline banner if not — so
  // a silent-disable becomes a visible diagnostic the reviewer can
  // act on instead of a dead-feeling button.
  //
  //   "checking"    → pre-flight in flight; Pay button stays in
  //                   "Checking Apple…" state, not a silent
  //                   blue-but-disabled.
  //   "ready"       → StoreKit confirmed the SKU; buy path is live.
  //   "unavailable" → StoreKit doesn't see the SKU OR pre-flight
  //                   itself threw. Inline banner explains what to
  //                   do (sign into sandbox, check connection, etc).
  type ApplePayReadyState =
    | { status: "checking" }
    | { status: "ready" }
    | { status: "unavailable"; reason: string };
  const [applePayReady, setApplePayReady] = useState<ApplePayReadyState>(
    () =>
      Platform.OS === "ios" ? { status: "checking" } : { status: "ready" },
  );

  const productIdForCycle = resolveAppleProductId(plan, billingCycle);

  useEffect(() => {
    // Skip on Android — the Pay button routes through Paystack there
    // and the pre-flight is meaningless.
    if (Platform.OS !== "ios") {
      setApplePayReady({ status: "ready" });
      return;
    }
    // No plan loaded yet (still arriving from RenewSubscriptionStep)
    // or no Apple SKU configured for this (plan, cycle). Keep state
    // as "checking" so the Pay button shows the loading affordance
    // — the parent will re-render with a populated plan shortly,
    // and the unavailable banner will appear if the SKU truly isn't
    // configured (which is a real config gap worth surfacing).
    if (!productIdForCycle) {
      if (!plan.id) {
        setApplePayReady({ status: "checking" });
      } else {
        setApplePayReady({
          status: "unavailable",
          reason:
            "This plan isn't available on Apple yet. Pick a different plan or contact support.",
        });
      }
      return;
    }
    let cancelled = false;
    setApplePayReady({ status: "checking" });
    fetchAppleSubscriptions([productIdForCycle])
      .then((products) => {
        if (cancelled) return;
        const found = products.find((p) => p.id === productIdForCycle);
        if (found) {
          setApplePayReady({ status: "ready" });
        } else {
          // StoreKit responded but didn't return our SKU. Most
          // common cause: the subscription isn't approved / attached
          // to this build in App Store Connect yet, or the sandbox
          // tester account is in a region the product isn't sold in.
          setApplePayReady({
            status: "unavailable",
            reason:
              "Apple couldn't find this subscription. Make sure you're signed into your Sandbox tester account in iPhone Settings → App Store, then try again.",
          });
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // initConnection / fetchProducts threw. Almost always one
        // of: (a) Paid Applications agreement isn't Active, (b)
        // no network, (c) StoreKit framework error.
        setApplePayReady({
          status: "unavailable",
          reason:
            (e instanceof Error && e.message) ||
            "Couldn't reach the App Store. Check your connection and try again.",
        });
      });
    return () => {
      cancelled = true;
    };
    // Re-run when the plan or cycle changes — both feed into
    // productIdForCycle.
  }, [productIdForCycle, plan.id]);

  // Effective charge for the entire flow. Prorated when an upgrade
  // quote is in hand, full cycle price otherwise. Kept in one place
  // so the order summary, CTA label, and outbound payload can't drift.
  const chargeAmount = upgradeQuote?.canProceed
    ? upgradeQuote.amountDue
    : plan.price;
  const showCredit =
    !!upgradeQuote?.canProceed && upgradeQuote.prorationCredit > 0;
  // Refresh all the surfaces that read off the active subscription the
  // moment payment verifies, so the rest of the app immediately
  // reflects the new plan without a manual pull-to-refresh:
  //   - features cache → unlocks gated UI (paywalls, Staff & permissions, etc.)
  //   - subscription usage → up-to-date catalog/staff caps
  //   - store performance → trial-banner state changes
  //   - vendor context → daysRemaining / subscription status on home + more
  const invalidateFeatures = useInvalidateFeatures();
  const invalidateStorePerf = useInvalidateStorePerformance();
  const invalidateUsage = useInvalidateSubscriptionUsage();
  const invalidateHistory = useInvalidateSubscriptionHistory();
  const { fetchVendorData } = useVendor();

  const isBusy = phase !== "idle";

  // iOS fallback: open the vendor's account hub on the web with a
  // short-lived handoff JWT so they don't have to re-enter their
  // password. Falls back to the bare URL if the handoff mint fails —
  // the web will prompt for login normally. Copy that triggers this
  // path stays neutral ("Manage account on the web") so we don't run
  // afoul of Apple's anti-steering language in 3.1.1.
  const openWebAccountWithHandoff = async () => {
    Haptics.selectionAsync().catch(() => {});
    try {
      const token = await issueWebHandoffToken();
      await WebBrowser.openBrowserAsync(
        `${WEB_ACCOUNT_URL}?handoff=${encodeURIComponent(token)}`,
      );
    } catch {
      await WebBrowser.openBrowserAsync(WEB_ACCOUNT_URL).catch(() => {});
    }
  };

  const refreshAfterPlanChange = async () => {
    try {
      invalidateFeatures();
      invalidateStorePerf();
      invalidateUsage();
      // Wipe the cached subscription history so the next visit to
      // SubscriptionBilling renders the new "Active" plan row instead
      // of the now-stale snapshot from before this payment.
      invalidateHistory();
      await fetchVendorData();
    } catch (e) {
      // Best-effort — the success step still renders even if a refetch
      // fails; the user can pull-to-refresh as a last resort.
      console.warn("Post-payment cache refresh failed", e);
    }
  };

  const handleApplePay = async () => {
    if (!plan.id) {
      toast.show("Pick a plan first", { type: "danger" });
      return;
    }
    const productId = resolveAppleProductId(plan, billingCycle);
    if (!productId) {
      // Shouldn't reach here — the UI shows an unavailable-message
      // when the Apple product isn't configured — but defend anyway
      // so a stale selection doesn't crash the flow.
      toast.show("This subscription isn't available right now.", {
        type: "danger",
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      setPhase("paying");
      const purchase = await purchaseAppleSubscription(productId);
      if (!purchase) {
        // Vendor cancelled out of the Apple sheet — stay on the
        // payment screen, no toast (cancellation isn't an error).
        // Surface the neutral web account fallback so vendors who
        // dismissed because their Apple account had no payment
        // method aren't stuck in a loop of failed Subscribe taps.
        setShowWebFallback(true);
        setPhase("idle");
        return;
      }

      const receipt = purchase.transactionReceipt;
      const transactionId = purchase.transactionId;
      if (!receipt || !transactionId) {
        throw new Error(
          "Apple didn't return a receipt — please try again or contact support."
        );
      }

      // Backend validates the receipt against Apple's servers and
      // creates the SubscriptionHistory row. Only after success do
      // we finishTransaction — otherwise a verification blip would
      // leave the vendor charged without a record on our side.
      setPhase("verifying");
      const verify = await verifyAppleReceipt({
        receipt,
        jws: purchase.jws,
        appleProductId: productId,
        subscriptionPlanId: plan.id,
        subscriptionDuration: cycleToDuration(billingCycle),
        transactionId,
      });

      await finishAppleTransaction(purchase);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      await refreshAfterPlanChange();
      onPaymentVerified(verify.reference);
    } catch (err: any) {
      console.error("Subscription flow error:", err);
      // Show the neutral web account fallback whenever the IAP path
      // errors — covers receipt-fetch failures, backend verification
      // rejects, and any unexpected StoreKit error. Vendors without
      // an Apple-linked payment method otherwise have no recourse
      // from this screen.
      setShowWebFallback(true);
      toast.show(
        err?.message ??
          "Couldn't complete your subscription purchase. Please try again.",
        { type: "danger" }
      );
    } finally {
      setPhase((p) => (p === "verifying" || p === "paying" ? "idle" : p));
    }
  };

  const handlePay = async () => {
    if (selected === "apple_pay") {
      await handleApplePay();
      return;
    }

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
        // `selected` is narrowed away from "apple_pay" by the guard at
        // the top of handlePay, so this cast is safe.
        paymentMethod: selected as "card" | "bank_transfer",
        hasCustomDomain: false,
        callbackUrl: WEB_CALLBACK_URL,
        amount: chargeAmount,
        isTrialPeriod: false,
        applyProrationCredit: !!upgradeQuote?.canProceed,
      });

      // Saved-card direct charge — backend already debited, no browser needed.
      if (res.authorizationUrl === "is-charge-authorization") {
        setPhase("verifying");
        if (res.reference) {
          await verifyPayment(res.reference);
        }
        await refreshAfterPlanChange();
        toast.show("Payment confirmed", { type: "success" });
        onPaymentVerified(res.reference ?? "");
        setPhase("idle");
        return;
      }

      // Open Paystack inside an in-app browser session. The session
      // resolves the moment the in-app browser navigates to a URL
      // starting with the orderly://billing/callback prefix (our
      // /app-callback bridge page does that for us after Paystack's
      // redirect lands).
      //
      // Logs are intentional — they let us see in Metro which of
      // these states the flow actually hits when something goes
      // wrong: dismiss/cancel means iOS didn't intercept the URL
      // (usually because the bridge page never loaded — most often
      // because a dev device couldn't reach `localhost:3000`).
      setPhase("paying");
      console.log("[subscription] opening Paystack:", res.authorizationUrl);

      const result = await WebBrowser.openAuthSessionAsync(
        res.authorizationUrl,
        APP_DEEPLINK_PREFIX
      );
      console.log(
        "[subscription] auth session resolved:",
        result.type,
        (result as { url?: string }).url ?? ""
      );

      if (result.type !== "success" || !result.url) {
        // User dismissed the sheet without paying — OR iOS dismissed
        // the session for another reason (URL not intercepted, bridge
        // page unreachable). Stay on the screen so the vendor can
        // retry without losing their plan selection.
        setPhase("idle");
        return;
      }

      const reference = getRefFromUrl(result.url);
      if (!reference) {
        console.log("[subscription] no reference in url:", result.url);
        toast.show("Couldn't read the payment reference. Try again.", {
          type: "danger",
        });
        setPhase("idle");
        return;
      }
      console.log("[subscription] verifying reference:", reference);

      // Re-confirm with the backend even though the webhook is the real
      // source of truth — this gives the user immediate UI feedback.
      setPhase("verifying");
      const verify = await verifyPayment(reference);
      console.log("[subscription] verify result:", verify);

      if (verify.status === "success") {
        if (Platform.OS === "ios") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
        }
        await refreshAfterPlanChange();
        console.log("[subscription] advancing to success step with ref:", reference);
        onPaymentVerified(reference);
      } else {
        toast.show(
          "Payment didn't go through. If you were charged, it'll resolve automatically.",
          { type: "danger" }
        );
      }
    } catch (err: any) {
      console.error("[subscription] payment flow error:", err);
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

            {/* What's included — guideline 3.1.2 item #3 requires
                "Content/services provided per period" to be visible
                at the moment of purchase. Cap at four bullets so the
                disclosure stays above-fold on the smallest device
                (iPhone SE). Show the full list only if it's short. */}
            {plan.features && plan.features.length > 0 && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.2px] text-gray-500 mb-2">
                  What&apos;s included
                </Text>
                {plan.features.slice(0, 4).map((feature) => (
                  <View
                    key={feature}
                    className="flex-row items-start gap-2 mb-1.5"
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color="#059669"
                      style={{ marginTop: 1.5 }}
                    />
                    <Text className="text-[12px] text-gray-700 leading-[17px] flex-1">
                      {feature}
                    </Text>
                  </View>
                ))}
                {plan.features.length > 4 && (
                  <Text className="text-[11px] text-gray-500 mt-1 ml-5">
                    + {plan.features.length - 4} more included
                  </Text>
                )}
              </View>
            )}

            {/* Inline auto-renew disclosure — iOS-only, sits inside
                the order summary so it's visible BEFORE the user taps
                Pay (not buried below the fold like the previous
                footer-only version, which Apple cited as 3.1.2). */}
            {Platform.OS === "ios" && (
              <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-start gap-2">
                <Ionicons
                  name="repeat"
                  size={13}
                  color="#6b7280"
                  style={{ marginTop: 1.5 }}
                />
                <Text className="text-[11.5px] text-gray-600 leading-[16px] flex-1">
                  <Text className="font-extrabold text-gray-700">
                    Auto-renews
                  </Text>{" "}
                  every {cycleNoun(billingCycle)} for{" "}
                  <Text className="font-extrabold text-gray-700">
                    ₦{chargeAmount.toLocaleString()}
                  </Text>
                  . Cancel any time at least 24h before renewal from iPhone
                  Settings → Apple ID → Subscriptions.
                </Text>
              </View>
            )}
          </View>

          <View className="px-5 py-3 bg-gray-50 border-t border-gray-100 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[12.5px] text-gray-600">Plan price</Text>
              <Text className="text-[12.5px] font-bold text-gray-900">
                ₦{plan.price.toLocaleString()}
              </Text>
            </View>
            {showCredit && (
              <>
                <View className="flex-row justify-between">
                  <Text className="text-[12.5px] font-bold text-emerald-700">
                    Credit from {upgradeQuote!.currentPlanName ?? "current plan"}
                  </Text>
                  <Text className="text-[12.5px] font-extrabold text-emerald-700">
                    − ₦{upgradeQuote!.rawCreditAvailable.toLocaleString()}
                  </Text>
                </View>
                {upgradeQuote!.forfeitedCredit > 0 && (
                  <View>
                    <View className="flex-row justify-between">
                      <View className="flex-row items-center gap-1">
                        <Ionicons
                          name="alert-circle"
                          size={12}
                          color="#b45309"
                        />
                        <Text className="text-[12px] font-bold text-amber-700">
                          Forfeited
                        </Text>
                      </View>
                      <Text className="text-[12px] font-bold text-amber-700">
                        + ₦{upgradeQuote!.forfeitedCredit.toLocaleString()}
                      </Text>
                    </View>
                    <Text className="text-[10.5px] text-amber-700/90 leading-[14px] mt-0.5 pl-[16px]">
                      Unused {upgradeQuote!.currentPlanName ?? "plan"} time that
                      won't carry over because this cycle is shorter.
                    </Text>
                  </View>
                )}
              </>
            )}
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
                ₦{chargeAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment options.

            iOS: IAP via StoreKit is the only allowed path (guideline
            3.1.1). Card / bank-transfer options are hidden entirely;
            even on the prorated-upgrade path we stay on IAP and let
            Apple's StoreKit handle the in-group upgrade with its own
            native proration (our `upgradeQuote` math is Paystack-only).

            Android: Paystack-routed Card + Bank Transfer. */}
        <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-gray-500 mb-3 px-1">
          {Platform.OS === "ios" ? "Subscription" : "Pay with"}
        </Text>

        {Platform.OS === "ios" ? (
          resolveAppleProductId(plan, billingCycle) != null ? (
            <>
              <PaymentOptionCard
                icon="checkmark-circle-outline"
                title="Subscribe"
                description="Confirm with Face ID, Touch ID, or your device passcode"
                selected={selected === "apple_pay"}
                disabled={isBusy}
                onPress={() => {
                  haptic();
                  setSelected("apple_pay");
                }}
                tone="slate"
              />

              {/* IAP pre-flight feedback — converts a silently-
                  disabled Pay button into a VISIBLE diagnostic.
                  Apple's 2.1(b) "no action took" rejection on
                  build 28 was almost certainly the reviewer tapping
                  a Pay button whose pre-conditions weren't met
                  (sandbox session, agreement pending, product not
                  attached to this build). Surfacing the reason
                  here means the next reviewer either fixes their
                  setup or writes a clear bug report — no more
                  silent dead-end. */}
              {applePayReady.status === "checking" && (
                <View className="mt-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex-row items-center gap-2.5">
                  <ActivityIndicator size="small" color="#475569" />
                  <Text className="text-[12px] text-gray-600 flex-1 leading-[18px]">
                    Checking with the App Store…
                  </Text>
                </View>
              )}
              {applePayReady.status === "unavailable" && (
                <View className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
                  <View className="flex-row items-start gap-2.5">
                    <Ionicons
                      name="alert-circle"
                      size={16}
                      color="#b45309"
                      style={{ marginTop: 1 }}
                    />
                    <View className="flex-1 min-w-0">
                      <Text className="text-[12.5px] font-extrabold text-amber-900">
                        Apple subscription unavailable
                      </Text>
                      <Text className="text-[12px] text-amber-800 mt-1 leading-[18px]">
                        {applePayReady.reason}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      // Force a re-run of the pre-flight effect by
                      // toggling the state object — the effect
                      // depends on productIdForCycle which doesn't
                      // change on retry, so we re-trigger here
                      // explicitly by entering the "checking" state
                      // and letting the catch path of the next
                      // fetch decide.
                      setApplePayReady({ status: "checking" });
                      if (productIdForCycle) {
                        fetchAppleSubscriptions([productIdForCycle])
                          .then((products) => {
                            const found = products.find(
                              (p) => p.id === productIdForCycle,
                            );
                            if (found) {
                              setApplePayReady({ status: "ready" });
                            } else {
                              setApplePayReady({
                                status: "unavailable",
                                reason:
                                  "Apple still can't find this subscription. Try again in a few minutes.",
                              });
                            }
                          })
                          .catch((e: unknown) => {
                            setApplePayReady({
                              status: "unavailable",
                              reason:
                                (e instanceof Error && e.message) ||
                                "Still couldn't reach the App Store.",
                            });
                          });
                      }
                    }}
                    className="mt-3 h-10 rounded-xl bg-white border border-amber-200 items-center justify-center flex-row gap-2"
                  >
                    <Ionicons name="refresh" size={14} color="#b45309" />
                    <Text className="text-amber-800 font-bold text-[13px]">
                      Try again
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          ) : (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex-row items-start gap-2.5">
              <Ionicons name="alert-circle-outline" size={16} color="#b45309" />
              <Text className="text-[12px] text-amber-800 flex-1 leading-[18px]">
                This subscription isn't available right now. Please try a
                different plan or contact support.
              </Text>
            </View>
          )
        ) : (
          <>
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
                Your payment is processed by Paystack. We never see or store
                your card details.
              </Text>
            </View>
          </>
        )}

        {/* iOS-only web account fallback. Renders only AFTER an IAP
            attempt has been cancelled or has failed (showWebFallback
            is set in those branches of handleApplePay). Copy stays
            strictly neutral — no pricing, no "alternative payment"
            language — so the reviewer reads it as account-management
            (Multiplatform Services 3.1.3(b)), not as steering away
            from IAP (which would violate 3.1.1). */}
        {Platform.OS === "ios" && showWebFallback && (
          <View className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5">
            <View className="flex-row items-start gap-2.5">
              <View className="w-7 h-7 rounded-xl bg-blue-100 items-center justify-center flex-shrink-0 mt-0.5">
                <Ionicons name="globe-outline" size={15} color="#2563eb" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-[13px] font-extrabold text-blue-900">
                  Need help with your subscription?
                </Text>
                <Text className="text-[12px] text-blue-800/90 mt-0.5 leading-[18px]">
                  You can also manage your account on the web.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={openWebAccountWithHandoff}
              className="mt-3 h-10 rounded-xl bg-white border border-blue-200 items-center justify-center flex-row gap-2"
            >
              <Ionicons name="open-outline" size={14} color="#1d4ed8" />
              <Text className="text-blue-700 font-bold text-[13px]">
                Manage account on the web
              </Text>
            </Pressable>
          </View>
        )}

        {/* Subscription legal footer — required by guideline 3.1.2(c).
            Renders on both platforms so vendors always have one tap
            access to the Terms of Use (EULA) and Privacy Policy from
            inside the purchase flow. Each link opens in an in-app
            browser via expo-web-browser. */}
        <View className="mt-4 pt-3 border-t border-gray-100">
          <Text className="text-[11px] text-gray-500 leading-[16px]">
            Subscriptions auto-renew at the end of each billing cycle and can
            be cancelled at any time. By subscribing you agree to our{" "}
            <Text
              className="text-blue-600 underline"
              onPress={() => {
                WebBrowser.openBrowserAsync(
                  "https://orderlystores.com/terms",
                ).catch(() => {});
              }}
            >
              Terms of Use
            </Text>
            {" and "}
            <Text
              className="text-blue-600 underline"
              onPress={() => {
                WebBrowser.openBrowserAsync(
                  "https://orderlystores.com/privacy",
                ).catch(() => {});
              }}
            >
              Privacy Policy
            </Text>
            .
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
        {/* iOS Pay button states:
             - applePayReady.status === "checking" → show "Checking
               with Apple…" so the screen never reads as a dead blue
               button while the pre-flight is in flight.
             - applePayReady.status === "unavailable" → button is
               disabled with explanatory copy; the inline banner
               above already explains WHY, so a reviewer who taps
               here gets a consistent story instead of a silent
               no-op.
             - applePayReady.status === "ready" → standard buy path.
            On Android the button is always "ready" so this branches
            identically to the original behaviour. */}
        {(() => {
          const applePayChecking =
            Platform.OS === "ios" && applePayReady.status === "checking";
          const applePayUnavailable =
            Platform.OS === "ios" && applePayReady.status === "unavailable";
          const disabled =
            isBusy || !plan.id || applePayChecking || applePayUnavailable;
          return (
            <Pressable
              onPress={handlePay}
              disabled={disabled}
              className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                disabled ? "bg-blue-400" : "bg-blue-600"
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
                    Initiating Payment…
                  </Text>
                </>
              ) : phase === "verifying" ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-bold text-[15px]">
                    Confirming your payment…
                  </Text>
                </>
              ) : applePayChecking ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-bold text-[15px]">
                    Checking with Apple…
                  </Text>
                </>
              ) : applePayUnavailable ? (
                // Never use "Apple Pay" in the CTA — that's the
                // physical-goods SDK, not StoreKit. Apple rejected
                // a previous build under 1.1.6 for that exact
                // confusion. See [[ios-apple-compliance-architecture]].
                <>
                  <Ionicons name="alert-circle" size={14} color="white" />
                  <Text className="text-white font-bold text-[15px]">
                    Subscription unavailable
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="lock-closed" size={14} color="white" />
                  <Text className="text-white font-bold text-[15px]">
                    Pay ₦{chargeAmount.toLocaleString()}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })()}
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
  tone: "blue" | "emerald" | "slate";
}) {
  // Apple Pay uses the dark slate variant so the row visually pops as
  // "Apple-branded" without breaking the existing card/bank colour
  // language we use for the Paystack options.
  const toneStyle =
    tone === "blue"
      ? { iconBg: "bg-blue-50", iconColor: "#2563eb" }
      : tone === "emerald"
      ? { iconBg: "bg-emerald-50", iconColor: "#059669" }
      : { iconBg: "bg-gray-900", iconColor: "#ffffff" };

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
