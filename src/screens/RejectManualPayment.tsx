import {
  View,
  Text,
  Pressable,
  TextInput,
  StatusBar,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { rejectManualPayment } from "../api/vendor/vendor.api";
import { AppToast, AppToastTone } from "../components/AppToast";
import { formatNaira } from "../lib/format";

type Nav = NativeStackNavigationProp<RootStackParamList, "RejectManualPayment">;
type Rt = NativeStackScreenProps<RootStackParamList, "RejectManualPayment">["route"];

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

const REASON_PRESETS = [
  "Payment not received",
  "Wrong amount transferred",
  "Item out of stock",
  "Customer requested cancellation",
];

/**
 * Vendor-facing surface for rejecting a manual bank-transfer payment.
 * Reached either from the Reject action button on an actionable push
 * (where the customer claims they paid but the vendor didn't get the
 * money) or manually from order details. The reason is optional but
 * recommended — it surfaces in the inbox row so the vendor can recall
 * later why they declined.
 */
export default function RejectManualPayment() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { reference, customerName, orderTotal } = route.params;

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  const reason = selectedPreset === "Other"
    ? customReason.trim()
    : selectedPreset ?? "";

  const canSubmit = !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    haptic("medium");
    setSubmitting(true);
    try {
      await rejectManualPayment(reference, reason || undefined);
      haptic("success");
      setToast({
        title: "Payment rejected",
        subtitle: "The customer's order has been declined.",
        tone: "success",
      });
      setTimeout(() => navigation.goBack(), 900);
    } catch (e: any) {
      console.error("Reject manual payment failed:", e);
      haptic("error");
      setToast({
        title: "Couldn't reject the payment",
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
          <Ionicons name="close" size={20} color="#111827" />
        </Pressable>
        <Text
          className="text-[16px] text-gray-900"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Reject payment
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — explicit framing so the vendor knows what happens
              when they reject. */}
          <View
            className="mx-4 mt-4 rounded-3xl overflow-hidden p-5"
            style={{ backgroundColor: "#9f1239" }}
          >
            <View
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: "rgba(254, 205, 211, 0.15)",
              }}
            />
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center border border-white/20">
                <Ionicons name="close-circle" size={22} color="#fecdd3" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-white text-[17px] tracking-tight"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Reject this payment?
                </Text>
                <Text className="text-rose-100/85 text-[12.5px] mt-0.5 leading-[17px]">
                  The order will be cancelled and the customer notified.
                  This can't be undone.
                </Text>
              </View>
            </View>

            {(customerName || orderTotal) && (
              <View className="mt-4 flex-row items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-3 py-2.5">
                <Ionicons name="person" size={14} color="#fecdd3" />
                <Text
                  className="text-rose-100 text-[12.5px] flex-1"
                  numberOfLines={1}
                >
                  {customerName || "Customer"}
                  {typeof orderTotal === "number"
                    ? ` · ${formatNaira(orderTotal)}`
                    : ""}
                </Text>
              </View>
            )}
          </View>

          {/* Reason chips */}
          <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px] mt-6 mx-5 mb-3">
            Reason (optional)
          </Text>

          <View className="px-4 gap-2">
            {[...REASON_PRESETS, "Other"].map((preset) => {
              const isActive = selectedPreset === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => {
                    haptic();
                    setSelectedPreset(isActive ? null : preset);
                  }}
                  className={`flex-row items-center justify-between rounded-2xl border p-4 active:bg-gray-50 ${
                    isActive
                      ? "bg-rose-50 border-rose-200"
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
                  <Text
                    className={`text-[13.5px] flex-1 pr-2 ${
                      isActive
                        ? "text-rose-800"
                        : "text-gray-900"
                    }`}
                    style={{
                      fontFamily: isActive
                        ? "PlusJakartaSans_700Bold"
                        : "PlusJakartaSans_500Medium",
                    }}
                  >
                    {preset}
                  </Text>
                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#e11d48"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          {selectedPreset === "Other" && (
            <View className="mx-4 mt-3">
              <TextInput
                value={customReason}
                onChangeText={setCustomReason}
                placeholder="Tell the customer what happened…"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                maxLength={200}
                className="bg-white rounded-2xl border border-gray-100 px-4 py-3 text-[14px] text-gray-900"
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  minHeight: 90,
                  textAlignVertical: "top",
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              />
              <Text className="text-[10.5px] text-gray-400 text-right mt-1.5">
                {customReason.length}/200
              </Text>
            </View>
          )}

          {/* CTA */}
          <View className="px-4 mt-6">
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                canSubmit
                  ? "bg-rose-600 active:bg-rose-700"
                  : "bg-rose-200"
              }`}
              style={{
                shadowColor: "#e11d48",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: canSubmit ? 0.25 : 0,
                shadowRadius: 10,
                elevation: canSubmit ? 4 : 0,
              }}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text
                    className="text-white text-[14.5px]"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Rejecting…
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="close" size={15} color="white" />
                  <Text
                    className="text-white text-[14.5px]"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Reject payment
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              className="h-11 rounded-2xl items-center justify-center mt-2"
            >
              <Text className="text-gray-700 font-bold text-[13.5px]">
                Cancel
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
