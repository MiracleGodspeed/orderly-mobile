import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { clearPendingVerification } from "../../context/auth.storage";
import { verifyOtp, resendOtp } from "../api/auth/auth.api";
import { OtpVerificationRequest } from "../api/auth/auth.types";

type Props = NativeStackScreenProps<RootStackParamList, "OtpVerification">;

const RESEND_COOLDOWN_S = 30;
const OTP_LENGTH = 6;

/**
 * Isolated resend timer. Owns its own ticking state so its 1Hz update doesn't
 * re-render the OTP shell — the kind of churn that interrupts keyboard
 * transitions on iOS.
 *
 * `onResend` returns a promise — only on resolution does the cooldown
 * restart. If it rejects, the link stays tappable so the user can retry
 * without waiting out a fake 30s window.
 */
function ResendTimer({
  onResend,
}: {
  onResend: () => Promise<void>;
}) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (cooldown > 0) {
    return (
      <Text className="text-[13px] text-gray-500">
        Didn't get it? Resend in{" "}
        <Text className="font-bold text-gray-900">{cooldown}s</Text>
      </Text>
    );
  }

  return (
    <Pressable
      onPress={async () => {
        if (sending) return;
        if (Platform.OS === "ios") {
          Haptics.selectionAsync().catch(() => {});
        }
        setSending(true);
        try {
          await onResend();
          setCooldown(RESEND_COOLDOWN_S);
        } finally {
          setSending(false);
        }
      }}
      hitSlop={8}
      disabled={sending}
    >
      {sending ? (
        <View className="flex-row items-center gap-1.5">
          <ActivityIndicator size="small" color="#2563eb" />
          <Text className="text-[13px] text-blue-600 font-extrabold">
            Sending…
          </Text>
        </View>
      ) : (
        <Text className="text-[13px] text-blue-600 font-extrabold">
          Resend code
        </Text>
      )}
    </Pressable>
  );
}

const maskEmail = (email: string) => {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}•@${domain}`;
  return `${local[0]}${"•".repeat(Math.min(local.length - 2, 4))}${local.slice(
    -1
  )}@${domain}`;
};

/**
 * Blinking caret for the currently-active cell. Pure visual — has nothing to
 * do with focus state, just a blue bar that fades in/out.
 */
function Caret() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => !v), 530);
    return () => clearInterval(t);
  }, []);
  return (
    <View
      style={{
        width: 2,
        height: 24,
        backgroundColor: "#2563eb",
        borderRadius: 1,
        opacity: visible ? 1 : 0,
      }}
    />
  );
}

export default function OtpVerification({ route, navigation }: Props) {
  const toast = useToast();
  const { email, password } = route?.params;
  const { setAuthData } = useAuth();

  // ONE source of truth: a single string. The visible cells just render
  // slices of it. There is no per-cell focus state to coordinate.
  const [otp, setOtp] = useState("");
  const hiddenInputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Reliable initial focus: useFocusEffect waits for the navigator's settle
  // event, then we give the renderer a beat to mount the hidden input before
  // asking for the keyboard.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => hiddenInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }, [])
  );

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    if (errored) setErrored(false);
  };

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      toast.show("Enter the full 6-digit code", { type: "danger" });
      return;
    }

    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    setLoading(true);
    const payload: OtpVerificationRequest = {
      email,
      password,
      otp,
      skipVerificationForLater: false,
    };

    try {
      const response = await verifyOtp(payload);
      const {
        token,
        userId,
        fullName,
        storeId,
        email: userEmail,
        refreshToken,
        refreshTokenExpiresAt,
      } = response;

      if (!token) throw new Error("Token missing in response");
      if (!storeId) throw new Error("Store ID missing in response");

      setAuthData(
        token,
        {
          id: userId,
          email: userEmail,
          name: fullName ?? undefined,
          storeId,
        },
        refreshToken,
        refreshTokenExpiresAt
      );

      // Verified — drop the resume marker so a later cold boot doesn't
      // send them back to OTP.
      await clearPendingVerification();

      if (Platform.OS === "ios") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }

      navigation.navigate("OtpSuccess");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "That code didn't work. Try again.";
      toast.show(message, { type: "danger" });
      setErrored(true);
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        ).catch(() => {});
      }
      setOtp("");
      hiddenInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(email);
      setOtp("");
      setErrored(false);
      hiddenInputRef.current?.focus();
      toast.show("A fresh code is on its way.", { type: "success" });
    } catch (e: any) {
      console.error("Resend OTP failed:", e);
      const message =
        e?.response?.data?.message ||
        e?.message ||
        "Couldn't resend the code. Try again.";
      toast.show(message, { type: "danger" });
      // Re-throw so ResendTimer doesn't restart the cooldown — the user
      // should be able to tap again immediately on failure.
      throw e;
    }
  };

  // Back usually pops to the signup form. But when we RESUMED onto this
  // screen from a cold boot, it's the root of the stack — there's nothing
  // to pop to, so "back" means "start over": drop the resume marker and
  // send them to the entry screen.
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      clearPendingVerification();
      navigation.replace("Onboarding");
    }
  };

  const isOtpComplete = otp.length === OTP_LENGTH;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Top bar */}
          <View className="px-6 pt-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={handleBack}
                activeOpacity={0.7}
                className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
              >
                <Ionicons name="arrow-back" size={20} color="#111827" />
              </TouchableOpacity>
              <Text
                className="text-[15px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Verify your email
              </Text>
              <View className="w-10 h-10" />
            </View>
          </View>

          {/* Hero */}
          <View className="items-center px-6 mt-8">
            <View
              className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 items-center justify-center mb-5"
              style={{
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <Ionicons name="mail-open-outline" size={28} color="#2563eb" />
            </View>

            <Text
              className="text-gray-900 text-center"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 26,
                letterSpacing: -0.5,
                lineHeight: 32,
              }}
            >
              Check your email
            </Text>
            <Text className="text-gray-500 text-[14.5px] mt-2 text-center leading-[21px]">
              We sent a 6-digit code to{"\n"}
              <Text className="text-gray-900 font-bold">
                {maskEmail(email)}
              </Text>
            </Text>
          </View>

          {/* OTP cells — the cells are pure presentation. The actual input is
              a full-width transparent TextInput layered ON TOP of the row, so
              every tap on the cells lands directly on the input itself. No
              focus relay, no Pressable indirection. */}
          <View className="px-6 mt-8">
            <View style={{ position: "relative", height: 58 }}>
              {/* Visible cell row */}
              <View className="flex-row justify-between">
                {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                  const digit = otp[i] || "";
                  const isFilled = i < otp.length;
                  const isActive = isFocused && i === otp.length && !errored;
                  const borderClass = errored
                    ? "border-red-300 bg-red-50/40"
                    : isActive
                    ? "border-blue-600 bg-white"
                    : isFilled
                    ? "border-blue-200 bg-white"
                    : "border-gray-200 bg-white";

                  return (
                    <View
                      key={i}
                      className={`w-[48px] h-[58px] rounded-2xl border-[1.5px] items-center justify-center ${borderClass}`}
                      style={
                        isActive
                          ? {
                              shadowColor: "#2563eb",
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.18,
                              shadowRadius: 8,
                              elevation: 3,
                            }
                          : undefined
                      }
                    >
                      {digit ? (
                        <Text
                          style={{
                            fontFamily: "PlusJakartaSans_700Bold",
                            fontSize: 22,
                            letterSpacing: -0.3,
                            color: "#111827",
                          }}
                        >
                          {digit}
                        </Text>
                      ) : isActive ? (
                        <Caret />
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {/* Real-sized transparent TextInput overlaid on top. Receives all
                  taps (rendered after the cells, so it's on top in z-order),
                  text and caret are transparent so it looks like the cells
                  are the input. */}
              <TextInput
                ref={hiddenInputRef}
                value={otp}
                onChangeText={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                importantForAutofill="yes"
                editable={!loading}
                caretHidden
                selectionColor="transparent"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  color: "transparent",
                  backgroundColor: "transparent",
                  fontSize: 1,
                  textAlign: "center",
                }}
              />
            </View>

            {errored && (
              <View className="flex-row items-center justify-center gap-1.5 mt-3">
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text className="text-[12.5px] font-semibold text-red-600">
                  That code didn't work — try again
                </Text>
              </View>
            )}
          </View>

          {/* Resend — isolated component so its 1Hz tick doesn't re-render the OTP cells */}
          <View className="items-center mt-6">
            <ResendTimer onResend={handleResend} />
          </View>

          {/* CTA */}
          <View className="px-6 mt-8">
            <Pressable
              onPress={handleVerify}
              disabled={!isOtpComplete || loading}
              className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                isOtpComplete && !loading ? "bg-blue-600" : "bg-gray-200"
              }`}
              style={{
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isOtpComplete && !loading ? 0.25 : 0,
                shadowRadius: 8,
                elevation: isOtpComplete && !loading ? 4 : 0,
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-[15px] font-bold text-white">
                    Verifying…
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    className={`text-[15px] font-bold ${
                      isOtpComplete ? "text-white" : "text-gray-500"
                    }`}
                  >
                    Verify
                  </Text>
                  {isOtpComplete && (
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  )}
                </>
              )}
            </Pressable>

            {/* Trust line */}
            <View className="flex-row items-center justify-center gap-1.5 mt-4">
              <Ionicons
                name="shield-checkmark-outline"
                size={13}
                color="#94a3b8"
              />
              <Text className="text-[11.5px] text-gray-500">
                Codes expire after 10 minutes for your security
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
