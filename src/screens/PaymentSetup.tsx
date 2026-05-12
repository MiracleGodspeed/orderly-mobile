import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { setTransactionChargeBearer } from "../api/vendor/vendor.api";
import { AppToast, AppToastTone } from "../components/AppToast";

type Nav = NativeStackNavigationProp<RootStackParamList, "PaymentSetup">;

type PaymentMode = "online" | "direct";
type FeeBearer = "vendor" | "customer" | "included";

const haptic = (
  style: "light" | "medium" | "success" | "error" = "light"
) => {
  if (Platform.OS !== "ios") return;
  if (style === "success") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  } else if (style === "error") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {}
    );
  } else if (style === "medium") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } else {
    Haptics.selectionAsync().catch(() => {});
  }
};

interface ModeMeta {
  key: PaymentMode;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tint: string;
  iconColor: string;
  perks: string[];
  caveat?: string;
}

const MODES: ModeMeta[] = [
  {
    key: "online",
    title: "Online payment",
    subtitle: "Recommended — let your store run on autopilot",
    icon: "card",
    tint: "#dbeafe",
    iconColor: "#2563eb",
    perks: [
      "Sales close themselves — payments confirm automatically the moment they land, even while you sleep.",
      "No babysitting your bank app. No \"did you pay?\" back-and-forth with customers.",
      "Funds settle into your bank within 24 hours, with a clean receipt sent to the customer for you.",
      "Card, transfer, USSD — customers pick what works for them and Paystack handles the rest.",
    ],
  },
  {
    key: "direct",
    title: "Direct to your bank",
    subtitle: "Hands-on — you confirm each payment yourself",
    icon: "wallet",
    tint: "#fef3c7",
    iconColor: "#b45309",
    perks: [
      "Customer sees your bank details at checkout and transfers manually.",
      "We push you a Confirm / Reject prompt when they say they've paid.",
      "Skips the platform fee on each transaction.",
    ],
    caveat:
      "Every order needs you. If a payment lands at 11pm or while you're out, the customer is left waiting until you can check your bank app and confirm. Most vendors graduate to online payment within their first month.",
  },
];

interface FeeBearerMeta {
  key: FeeBearer;
  title: string;
  subtitle: string;
}

const FEE_OPTIONS: FeeBearerMeta[] = [
  {
    key: "customer",
    title: "Customer pays the fee",
    subtitle: "Added on top at checkout — your settled amount stays whole.",
  },
  {
    key: "vendor",
    title: "You absorb the fee",
    subtitle: "Deducted from settlement — customer sees the listed price.",
  },
  {
    key: "included",
    title: "Already in the listed price",
    subtitle: "You priced the fee in. No surcharge, no deduction.",
  },
];

/**
 * Vendor-facing payment-mode setup. Two questions, in order:
 *
 *   1. How do customers pay?  (Online vs Direct)
 *   2. Who absorbs the platform fee?  (only relevant for Online)
 *
 * The backend conflates these into a single `chargeBearer` field —
 * "direct" flips both `transferDirectlyToVendor=true` and disables
 * platform-fee handling, while `customer | vendor | included` keep
 * online auto-collection and just route the fee differently. We split
 * the questions in the UI for clarity but resolve to the right wire
 * value on save.
 */
export default function PaymentSetup() {
  const navigation = useNavigation<Nav>();
  const { storeData, fetchVendorData } = useVendor();

  // Resolve the current setting into our split state. The backend
  // stores one of: "vendor" | "customer" | "included" | "direct".
  // "direct" → mode=direct (the fee question doesn't apply).
  // Anything else, including null/undefined for brand-new vendors,
  // → mode=online (default, with that fee-bearer when present).
  const initialMode: PaymentMode = storeData?.feeBearer === ("direct" as any)
    ? "direct"
    : "online";
  const initialFee: FeeBearer = (
    storeData?.feeBearer === ("direct" as any)
      ? "customer"
      : (storeData?.feeBearer as FeeBearer | undefined) ?? "customer"
  );

  const [mode, setMode] = useState<PaymentMode>(initialMode);
  const [feeBearer, setFeeBearer] = useState<FeeBearer>(initialFee);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  // Re-sync local state if the vendor context refreshes while this
  // screen is open (e.g. focused after Bank settings update).
  useEffect(() => {
    setMode(initialMode);
    setFeeBearer(initialFee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeData?.feeBearer]);

  const isDirty = useMemo(() => {
    if (mode === "direct") return storeData?.feeBearer !== ("direct" as any);
    return storeData?.feeBearer !== feeBearer;
  }, [mode, feeBearer, storeData?.feeBearer]);

  const handleSave = async () => {
    if (submitting || !isDirty) return;
    haptic("medium");
    setSubmitting(true);
    try {
      const wireValue = mode === "direct" ? "direct" : feeBearer;
      await setTransactionChargeBearer(wireValue);
      await fetchVendorData();
      haptic("success");
      setToast({
        title: "Payment setup saved",
        subtitle:
          mode === "direct"
            ? "You'll confirm each payment yourself from now on."
            : "Online payments are on — your store can now sell on autopilot.",
        tone: "success",
      });
    } catch (e: any) {
      console.error("PaymentSetup save failed:", e);
      haptic("error");
      setToast({
        title: "Couldn't save payment setup",
        subtitle: e?.message ?? "Try again in a moment.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <AppToast
        visible={toast != null}
        title={toast?.title ?? ""}
        subtitle={toast?.subtitle}
        tone={toast?.tone}
        onHide={() => setToast(null)}
      />

      {/* Header */}
      <View className="bg-white px-5 py-3 border-b border-gray-100 flex-row items-center">
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          className="w-10 h-10 rounded-full items-center justify-center bg-gray-50 mr-3 active:bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text
          className="text-[16px] text-gray-900"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Payment setup
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View
          className="mx-4 mt-4 rounded-3xl overflow-hidden p-5"
          style={{ backgroundColor: "#194eb8" }}
        >
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "rgba(96, 165, 250, 0.18)",
            }}
          />
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-blue-500/20 items-center justify-center border border-blue-400/30">
              <Ionicons name="cash" size={22} color="#bfdbfe" />
            </View>
            <View className="flex-1">
              <Text
                className="text-white text-[17px] tracking-tight"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                How do customers pay you?
              </Text>
              <Text className="text-blue-100/85 text-[12.5px] mt-0.5 leading-[17px]">
                Online payment lets your store run on its own — switch to manual
                if you'd rather confirm each one yourself. Easy to change later.
              </Text>
            </View>
          </View>
        </View>

        {/* Mode picker */}
        <View className="flex-row items-center gap-2 mx-5 mt-6 mb-3">
          <View
            style={{
              width: 3,
              height: 12,
              borderRadius: 2,
              backgroundColor: "#2563eb",
            }}
          />
          <Text className="text-[10.5px] font-extrabold text-gray-500 uppercase tracking-[1.4px]">
            Customer payment mode
          </Text>
        </View>

        <View className="px-4 gap-3">
          {MODES.map((m) => {
            const isActive = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => {
                  haptic();
                  setMode(m.key);
                }}
                className={`rounded-2xl border overflow-hidden active:bg-gray-50 ${
                  isActive
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-gray-100 bg-white"
                }`}
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0 : 0.04,
                  shadowRadius: 6,
                  elevation: isActive ? 0 : 1,
                }}
              >
                <View className="flex-row items-start p-4">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                    style={{ backgroundColor: m.tint }}
                  >
                    <Ionicons name={m.icon} size={22} color={m.iconColor} />
                  </View>
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-2">
                      <Text
                        className={`text-[14.5px] tracking-tight ${
                          isActive ? "text-blue-700" : "text-gray-900"
                        }`}
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        {m.title}
                      </Text>
                    </View>
                    <Text className="text-[12px] text-gray-500 mt-0.5 leading-[16px]">
                      {m.subtitle}
                    </Text>
                  </View>
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                      isActive ? "border-blue-600" : "border-gray-200"
                    }`}
                  >
                    {isActive && (
                      <View className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </View>
                </View>

                {/* Perks list — only shown for the selected mode so the
                    card stays compact for the alternative. */}
                {isActive && (
                  <View className="px-4 pb-4 gap-2">
                    <View className="h-px bg-blue-100 mb-1" />
                    {m.perks.map((perk, i) => (
                      <View key={i} className="flex-row items-start gap-2">
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#059669"
                          style={{ marginTop: 1.5 }}
                        />
                        <Text className="text-[12.5px] text-gray-700 flex-1 leading-[17px]">
                          {perk}
                        </Text>
                      </View>
                    ))}
                    {m.caveat && (
                      <View
                        className="mt-2 flex-row items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100"
                      >
                        <Ionicons
                          name="warning"
                          size={14}
                          color="#b45309"
                          style={{ marginTop: 1 }}
                        />
                        <Text className="text-[12px] text-amber-800 flex-1 leading-[16px]">
                          {m.caveat}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Fee-bearer — only relevant when Online is selected. Direct mode
            sidesteps platform fees entirely so the question is moot. */}
        {mode === "online" && (
          <>
            <View className="flex-row items-center gap-2 mx-5 mt-7 mb-3">
              <View
                style={{
                  width: 3,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: "#7c3aed",
                }}
              />
              <Text className="text-[10.5px] font-extrabold text-gray-500 uppercase tracking-[1.4px]">
                Platform fee
              </Text>
            </View>

            <View className="px-4 gap-2">
              {FEE_OPTIONS.map((opt) => {
                const isActive = feeBearer === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      haptic();
                      setFeeBearer(opt.key);
                    }}
                    className={`flex-row items-start rounded-2xl border p-4 active:bg-gray-50 ${
                      isActive
                        ? "bg-violet-50/40 border-violet-300"
                        : "bg-white border-gray-100"
                    }`}
                    style={{
                      shadowColor: "#0f172a",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isActive ? 0 : 0.03,
                      shadowRadius: 4,
                      elevation: isActive ? 0 : 1,
                    }}
                  >
                    <View className="flex-1 pr-2">
                      <Text
                        className={`text-[13.5px] tracking-tight ${
                          isActive ? "text-violet-800" : "text-gray-900"
                        }`}
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        {opt.title}
                      </Text>
                      <Text className="text-[12px] text-gray-500 mt-0.5 leading-[16px]">
                        {opt.subtitle}
                      </Text>
                    </View>
                    <View
                      className={`w-5 h-5 rounded-full border-2 items-center justify-center mt-1 ${
                        isActive ? "border-violet-600" : "border-gray-200"
                      }`}
                    >
                      {isActive && (
                        <View className="w-2 h-2 rounded-full bg-violet-600" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Trust line — quietly reassures the vendor that this is reversible */}
        <View className="flex-row items-center justify-center gap-1.5 mt-7 px-6">
          <Ionicons
            name="shield-checkmark-outline"
            size={13}
            color="#94a3b8"
          />
          <Text className="text-[11.5px] text-gray-500 text-center">
            Switch modes any time. Existing orders aren't affected.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky footer with Save */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-3 pb-7"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Pressable
          onPress={handleSave}
          disabled={!isDirty || submitting}
          className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
            !isDirty || submitting
              ? "bg-gray-200"
              : "bg-blue-600 active:bg-blue-700"
          }`}
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: !isDirty || submitting ? 0 : 0.25,
            shadowRadius: 10,
            elevation: !isDirty || submitting ? 0 : 4,
          }}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text
                className="text-white text-[14.5px]"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Saving…
              </Text>
            </>
          ) : (
            <Text
              className={`text-[14.5px] ${
                !isDirty ? "text-gray-500" : "text-white"
              }`}
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {isDirty ? "Save changes" : "Saved"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
