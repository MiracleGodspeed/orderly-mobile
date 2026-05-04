import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

import { RootStackParamList } from "../navigation/types";
import { ScreenHeader } from "../components/ScreenHeader";
import { getSubscriptionHistory } from "../api/vendor/vendor.api";
import { SubscriptionHistory } from "../api/vendor/vendor.types";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type StatusKind = "trial" | "active" | "expiring" | "expired" | "none";

const statusStyles: Record<
  StatusKind,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  none: {
    label: "No plan",
    bg: "bg-gray-100",
    border: "border-gray-200",
    text: "text-gray-700",
    dot: "bg-gray-400",
  },
  trial: {
    label: "Trial",
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  active: {
    label: "Active",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  expiring: {
    label: "Expiring soon",
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  expired: {
    label: "Expired",
    bg: "bg-rose-50",
    border: "border-rose-100",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
};

const Skeleton = () => (
  <SkeletonPlaceholder
    borderRadius={16}
    backgroundColor="#e2e8f0"
    highlightColor="#f8fafc"
  >
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ height: 96, marginTop: 16, borderRadius: 24 }} />
      <View style={{ height: 240, marginTop: 16, borderRadius: 24 }} />
      <View style={{ height: 180, marginTop: 16, borderRadius: 24 }} />
      <View style={{ height: 200, marginTop: 16, borderRadius: 24 }} />
    </View>
  </SkeletonPlaceholder>
);

function planIconFor(name: string | undefined, isTrial: boolean) {
  if (isTrial) return "flash" as const;
  const lower = (name ?? "").toLowerCase();
  if (lower.includes("enterprise") || lower.includes("professional"))
    return "rocket" as const;
  if (lower.includes("premium") || lower.includes("plus"))
    return "star" as const;
  return "shield-checkmark" as const;
}

export default function SubscriptionBilling() {
  const toast = useToast();
  const navigation = useNavigation<ScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);

  // Sort history newest-first so currentSub is the most recent record.
  const orderedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [history]
  );

  const currentSub = orderedHistory[0] ?? null;

  const fetchSubscriptionData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const data = await getSubscriptionHistory({ pageIndex: 1, pageSize: 20 });
      setHistory(data ?? []);
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      toast.show(error?.message || "Failed to load subscription data", {
        type: "danger",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubscriptionData(true);
  }, []);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatShortDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Derived state from currentSub
  const hasSubscription = !!currentSub?.subscriptionPlan?.id;
  const isTrial = !!currentSub?.isTrialPeriod;
  const daysRemaining = currentSub?.daysRemaining ?? -1;
  const isExpired = hasSubscription && daysRemaining <= 0;
  const isExpiringSoon =
    hasSubscription && !isExpired && daysRemaining > 0 && daysRemaining <= 7;

  const statusKind: StatusKind = !hasSubscription
    ? "none"
    : isExpired
    ? "expired"
    : isTrial
    ? "trial"
    : isExpiringSoon
    ? "expiring"
    : "active";

  const status = statusStyles[statusKind];

  const planName = isTrial
    ? "Free Trial"
    : currentSub?.subscriptionPlan?.name || "No active plan";
  const planPrice = currentSub?.subscriptionPlan?.price ?? 0;

  // Progress bar — elapsed vs total period
  const { progressPct, totalDays } = useMemo(() => {
    const start = currentSub?.startDate;
    const end = currentSub?.expiryDate;
    if (!start || !end) return { progressPct: 0, totalDays: 0 };
    const total = Math.max(
      1,
      Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
      )
    );
    const elapsed = Math.max(0, total - Math.max(0, daysRemaining));
    return {
      progressPct: Math.min(100, (elapsed / total) * 100),
      totalDays: total,
    };
  }, [currentSub?.startDate, currentSub?.expiryDate, daysRemaining]);

  const progressBarBg = isExpired
    ? "bg-rose-500"
    : isExpiringSoon
    ? "bg-amber-500"
    : isTrial
    ? "bg-blue-500"
    : "bg-emerald-500";

  const primaryCta = useMemo(() => {
    if (statusKind === "expired" || statusKind === "none") {
      return { label: "Renew subscription", icon: "card-outline" as const };
    }
    if (isTrial) {
      return { label: "Subscribe now", icon: "card-outline" as const };
    }
    return { label: "Upgrade plan", icon: "trending-up-outline" as const };
  }, [statusKind, isTrial]);

  const handlePrimaryCta = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    navigation.navigate("SubscriptionFlow", {
      initialPlanName: currentSub?.subscriptionPlan?.name,
    } as any);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Subscription" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {loading ? (
          <Skeleton />
        ) : (
          <>
            {/* Brand-blue hero */}
            <View
              className="mx-5 mt-4 mb-4 rounded-3xl overflow-hidden px-5 py-5"
              style={{ backgroundColor: "#194eb8" }}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-2xl bg-white/15 border border-white/15 items-center justify-center">
                  <Ionicons
                    name="card-outline"
                    size={22}
                    color="white"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-[18px] font-extrabold tracking-tight">
                    Your subscription
                  </Text>
                  <Text className="text-white/75 text-[12.5px] mt-0.5">
                    Plan, billing, and renewals — all in one place.
                  </Text>
                </View>
              </View>
            </View>

            {/* Action banners — only when actionable */}
            {statusKind === "expired" && (
              <ActionBanner
                tone="rose"
                icon="alert-circle"
                title="Your subscription has expired"
                body="Renew now to keep your store running without interruption."
              />
            )}
            {statusKind === "expiring" && (
              <ActionBanner
                tone="amber"
                icon="time-outline"
                title={`${daysRemaining} day${
                  daysRemaining === 1 ? "" : "s"
                } left on your plan`}
                body="Renew early to avoid any disruption."
              />
            )}
            {statusKind === "trial" && (
              <ActionBanner
                tone="blue"
                icon="flash-outline"
                title="You're on a free trial"
                body={`${daysRemaining} day${
                  daysRemaining === 1 ? "" : "s"
                } left. Subscribe to keep all features after the trial.`}
              />
            )}

            {/* Hero plan card */}
            <View
              className="mx-5 mb-4 bg-white rounded-3xl border border-gray-100 overflow-hidden"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="px-5 pt-5 pb-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-row items-start gap-3 flex-1 min-w-0">
                    <View className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 items-center justify-center bg-blue-50">
                      <Ionicons
                        name={planIconFor(currentSub?.subscriptionPlan?.name, isTrial)}
                        size={20}
                        color="#2563eb"
                      />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-[10.5px] uppercase tracking-[1.2px] font-extrabold text-gray-500">
                        Current plan
                      </Text>
                      <Text
                        className="text-[22px] font-extrabold text-gray-900 mt-0.5 tracking-tight"
                        numberOfLines={1}
                      >
                        {planName}
                      </Text>
                      {!isTrial && hasSubscription && planPrice > 0 && (
                        <Text className="text-[13px] text-gray-600 mt-1">
                          <Text className="font-bold text-gray-900">
                            ₦{planPrice.toLocaleString()}
                          </Text>
                          <Text className="text-gray-500"> / month</Text>
                        </Text>
                      )}
                    </View>
                  </View>
                  <View
                    className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${status.bg} ${status.border}`}
                  >
                    <View className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    <Text className={`text-[10.5px] font-extrabold ${status.text}`}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                {/* Progress + dates */}
                {hasSubscription && totalDays > 0 && (
                  <View className="mt-5">
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className={`h-full rounded-full ${progressBarBg}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </View>
                    <View className="flex-row items-center justify-between mt-2">
                      <Text className="text-[11.5px] text-gray-600">
                        {isExpired
                          ? `Expired ${Math.abs(daysRemaining)} day${
                              Math.abs(daysRemaining) === 1 ? "" : "s"
                            } ago`
                          : `${daysRemaining} day${
                              daysRemaining === 1 ? "" : "s"
                            } remaining`}
                      </Text>
                      <Text className="text-[11.5px] text-gray-500">
                        {totalDays} day{totalDays === 1 ? "" : "s"} period
                      </Text>
                    </View>
                  </View>
                )}

                {/* Primary CTA */}
                <Pressable
                  onPress={handlePrimaryCta}
                  className="mt-5 h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2"
                  style={{
                    shadowColor: "#2563eb",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Ionicons
                    name={primaryCta.icon}
                    size={16}
                    color="white"
                  />
                  <Text className="text-white font-bold text-[15px]">
                    {primaryCta.label}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Billing details card — only with active subscription */}
            {hasSubscription && (
              <View
                className="mx-5 mb-4 bg-white rounded-3xl border border-gray-100 overflow-hidden"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <View className="px-5 py-4 border-b border-gray-100">
                  <Text className="text-[14px] font-extrabold text-gray-900">
                    Billing
                  </Text>
                </View>

                <BillingRow
                  icon="time-outline"
                  label="Started on"
                  value={formatDate(currentSub?.startDate)}
                />
                <BillingRow
                  icon="calendar-outline"
                  label={isExpired ? "Expired on" : "Ends on"}
                  value={formatDate(currentSub?.expiryDate)}
                  valueClassName={isExpired ? "text-rose-700" : undefined}
                />
                <View className="px-5 py-4 flex-row items-start gap-3">
                  <View className="w-7 h-7 items-center justify-center mt-0.5">
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color="#9ca3af"
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[14px] font-semibold text-gray-800">
                      No auto-renewal
                    </Text>
                    <Text className="text-[12px] text-gray-500 mt-0.5 leading-[18px]">
                      Plans don't renew automatically. When this period ends, your
                      storefront pauses until you start a new payment — you'll
                      never be billed without an explicit action.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* What's included */}
            {currentSub?.planFeatures && currentSub.planFeatures.length > 0 && (
              <View
                className="mx-5 mb-4 bg-white rounded-3xl border border-gray-100 overflow-hidden"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <View className="px-5 py-4 border-b border-gray-100">
                  <Text className="text-[14px] font-extrabold text-gray-900">
                    What's included
                  </Text>
                </View>
                <View className="px-5 py-3">
                  {currentSub.planFeatures.map((feature, i) => (
                    <View
                      key={`${feature}-${i}`}
                      className="flex-row items-start gap-2.5 py-1.5"
                    >
                      <View className="w-5 h-5 rounded-full bg-emerald-50 items-center justify-center mt-0.5">
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color="#059669"
                        />
                      </View>
                      <Text className="text-[13.5px] text-gray-700 leading-[20px] flex-1">
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Payment history */}
            <View
              className="mx-5 mb-6 bg-white rounded-3xl border border-gray-100 overflow-hidden"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="px-5 py-4 border-b border-gray-100">
                <Text className="text-[14px] font-extrabold text-gray-900">
                  Payment history
                </Text>
              </View>

              {orderedHistory.length === 0 ? (
                <View className="px-5 py-10 items-center">
                  <View className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center mb-2">
                    <Ionicons
                      name="receipt-outline"
                      size={20}
                      color="#9ca3af"
                    />
                  </View>
                  <Text className="text-[13px] text-gray-500">
                    No payments yet
                  </Text>
                </View>
              ) : (
                orderedHistory.map((item, i) => {
                  const s = (item.status || "").toLowerCase();
                  const pill =
                    s === "success" || s === "paid"
                      ? { bg: "bg-emerald-50", text: "text-emerald-700", label: "Paid" }
                      : s === "pending"
                      ? { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" }
                      : s === "failed"
                      ? { bg: "bg-rose-50", text: "text-rose-700", label: "Failed" }
                      : { bg: "bg-gray-100", text: "text-gray-700", label: item.status || "—" };

                  return (
                    <View
                      key={`${item.paymentReference ?? "trx"}-${i}`}
                      className={`flex-row items-center gap-3 px-5 py-3.5 ${
                        i !== orderedHistory.length - 1
                          ? "border-b border-gray-50"
                          : ""
                      }`}
                    >
                      <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                        <Ionicons
                          name="receipt-outline"
                          size={18}
                          color="#2563eb"
                        />
                      </View>

                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-center gap-2">
                          <Text
                            className="text-[13.5px] font-bold text-gray-900"
                            numberOfLines={1}
                          >
                            {item.subscriptionPlan?.name || "Subscription"}
                          </Text>
                          {item.isTrialPeriod && (
                            <View className="bg-blue-100 px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] font-extrabold text-blue-700 tracking-wide">
                                TRIAL
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[11.5px] text-gray-500 mt-0.5">
                          {formatShortDate(item.createdAt)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-[13.5px] font-extrabold text-gray-900">
                          ₦{(item.isTrialPeriod ? 0 : item.amountPaid).toLocaleString()}
                        </Text>
                        <View
                          className={`px-2 py-0.5 rounded-full mt-1 ${pill.bg}`}
                        >
                          <Text
                            className={`text-[10px] font-extrabold ${pill.text} tracking-wide`}
                          >
                            {pill.label.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ----- Sub-components -----

function ActionBanner({
  tone,
  icon,
  title,
  body,
}: {
  tone: "rose" | "amber" | "blue";
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const styles =
    tone === "rose"
      ? { bg: "bg-rose-50", border: "border-rose-100", iconBg: "bg-rose-100", iconColor: "#dc2626", title: "text-rose-900", body: "text-rose-700" }
      : tone === "amber"
      ? { bg: "bg-amber-50", border: "border-amber-100", iconBg: "bg-amber-100", iconColor: "#d97706", title: "text-amber-900", body: "text-amber-700" }
      : { bg: "bg-blue-50", border: "border-blue-100", iconBg: "bg-blue-100", iconColor: "#2563eb", title: "text-blue-900", body: "text-blue-700" };

  return (
    <View
      className={`mx-5 mb-3 rounded-2xl px-4 py-3 flex-row items-start gap-3 border ${styles.bg} ${styles.border}`}
    >
      <View
        className={`w-9 h-9 rounded-xl items-center justify-center ${styles.iconBg}`}
      >
        <Ionicons name={icon} size={18} color={styles.iconColor} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className={`text-[13px] font-extrabold ${styles.title}`}>
          {title}
        </Text>
        <Text className={`text-[12px] mt-0.5 leading-[18px] ${styles.body}`}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function BillingRow({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="px-5 py-4 flex-row items-center gap-3 border-b border-gray-50">
      <View className="w-7 h-7 items-center justify-center">
        <Ionicons name={icon} size={16} color="#9ca3af" />
      </View>
      <Text className="text-[14px] text-gray-700 flex-1">{label}</Text>
      <Text
        className={`text-[14px] font-bold ${valueClassName ?? "text-gray-900"}`}
      >
        {value}
      </Text>
    </View>
  );
}
