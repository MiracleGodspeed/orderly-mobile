import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { changePassword } from "../api/auth/auth.api";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = (style: "light" | "medium" | "success" | "error" = "light") => {
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

interface StrengthMeta {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  bg: string;
}

// Lightweight strength heuristic — five buckets driven by the four common
// rules (length, mixed case, number, symbol). Avoids pulling in a full
// password-strength library for what's effectively a vibe meter.
function scorePassword(pw: string): StrengthMeta {
  if (!pw) return { score: 0, label: "", color: "#94a3b8", bg: "#e2e8f0" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score = Math.min(4, score + 1);

  if (score <= 1)
    return { score: 1, label: "Weak", color: "#dc2626", bg: "#fee2e2" };
  if (score === 2)
    return { score: 2, label: "Fair", color: "#d97706", bg: "#fef3c7" };
  if (score === 3)
    return { score: 3, label: "Good", color: "#059669", bg: "#d1fae5" };
  return { score: 4, label: "Strong", color: "#16a34a", bg: "#bbf7d0" };
}

interface RuleProps {
  passed: boolean;
  label: string;
}

function Rule({ passed, label }: RuleProps) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className={`w-4 h-4 rounded-full items-center justify-center ${
          passed ? "bg-emerald-100" : "bg-gray-100"
        }`}
      >
        <Ionicons
          name={passed ? "checkmark" : "ellipse-outline"}
          size={10}
          color={passed ? "#059669" : "#94a3b8"}
        />
      </View>
      <Text
        className={`text-[12px] ${
          passed ? "text-emerald-700 font-semibold" : "text-gray-500"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  placeholder: string;
  autoFocus?: boolean;
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
  innerRef?: React.RefObject<TextInput | null>;
}

function PasswordField({
  label,
  value,
  onChangeText,
  visible,
  onToggleVisible,
  placeholder,
  autoFocus,
  returnKeyType = "next",
  onSubmitEditing,
  innerRef,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px] mb-2">
        {label}
      </Text>
      <View
        className={`flex-row items-center bg-white rounded-2xl border ${
          focused ? "border-blue-300" : "border-gray-100"
        }`}
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: focused ? 0.08 : 0.04,
          shadowRadius: focused ? 12 : 8,
          elevation: focused ? 3 : 2,
        }}
      >
        <TextInput
          ref={innerRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          className="flex-1 px-4 py-3.5 text-[15px] text-gray-900"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        />
        <Pressable
          onPress={() => {
            haptic();
            onToggleVisible();
          }}
          hitSlop={8}
          className="px-3"
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="#6b7280"
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function ChangePassword() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const { storeData } = useVendor();
  const email = storeData?.email ?? "";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const strength = useMemo(() => scorePassword(next), [next]);
  const rules = useMemo(
    () => ({
      length: next.length >= 8,
      mixedCase: /[A-Z]/.test(next) && /[a-z]/.test(next),
      number: /[0-9]/.test(next),
      symbol: /[^A-Za-z0-9]/.test(next),
    }),
    [next]
  );
  const allRulesPass =
    rules.length && rules.mixedCase && rules.number && rules.symbol;
  const matches = next.length > 0 && next === confirm;
  const newDifferent = next.length > 0 && next !== current;

  const canSubmit =
    !submitting &&
    current.length > 0 &&
    next.length >= 8 &&
    matches &&
    newDifferent;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!email) {
      toast.show("Couldn't find your account email — try again from Profile.", {
        type: "danger",
      });
      return;
    }
    haptic("medium");
    setSubmitting(true);
    try {
      await changePassword({
        email,
        currentPassword: current,
        newPassword: next,
      });
      haptic("success");
      toast.show("Password updated", { type: "success" });
      navigation.goBack();
    } catch (e: any) {
      console.error("Change password failed:", e);
      haptic("error");
      toast.show(e?.message ?? "Couldn't update password.", { type: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

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
          Change password
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View
            className="mx-4 mt-4 rounded-3xl overflow-hidden p-5"
            style={{ backgroundColor: "#0f172a" }}
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
                <Ionicons name="shield-checkmark" size={22} color="#bfdbfe" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-white text-[17px] tracking-tight"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Secure your account
                </Text>
                <Text className="text-blue-100/80 text-[12.5px] mt-0.5 leading-[17px]">
                  Use a strong password — at least 8 characters with a mix of
                  letters, numbers, and a symbol.
                </Text>
              </View>
            </View>
          </View>

          {/* Form */}
          <View className="mx-4 mt-5">
            <View className="gap-4">
              <PasswordField
                label="Current password"
                value={current}
                onChangeText={setCurrent}
                visible={showCurrent}
                onToggleVisible={() => setShowCurrent((v) => !v)}
                placeholder="Enter your current password"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => nextRef.current?.focus()}
              />

              <PasswordField
                label="New password"
                value={next}
                onChangeText={setNext}
                visible={showNext}
                onToggleVisible={() => setShowNext((v) => !v)}
                placeholder="Choose a new password"
                returnKeyType="next"
                innerRef={nextRef}
                onSubmitEditing={() => confirmRef.current?.focus()}
              />

              {/* Strength meter */}
              {next.length > 0 && (
                <View>
                  <View className="flex-row gap-1.5 mb-1.5">
                    {[1, 2, 3, 4].map((i) => {
                      const active = strength.score >= i;
                      return (
                        <View
                          key={i}
                          className="flex-1 h-1.5 rounded-full"
                          style={{
                            backgroundColor: active ? strength.color : "#e5e7eb",
                          }}
                        />
                      );
                    })}
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-[11.5px] font-extrabold uppercase tracking-[1px]"
                      style={{ color: strength.color }}
                    >
                      {strength.label || "—"}
                    </Text>
                    {!newDifferent && current.length > 0 && (
                      <Text className="text-[11.5px] font-bold text-rose-600">
                        Choose a different password
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <PasswordField
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                visible={showConfirm}
                onToggleVisible={() => setShowConfirm((v) => !v)}
                placeholder="Re-enter your new password"
                returnKeyType="done"
                innerRef={confirmRef}
                onSubmitEditing={handleSubmit}
              />

              {confirm.length > 0 && !matches && (
                <View className="flex-row items-center gap-1.5 -mt-2">
                  <Ionicons name="alert-circle" size={13} color="#dc2626" />
                  <Text className="text-[12px] font-semibold text-rose-600">
                    Passwords don't match
                  </Text>
                </View>
              )}
            </View>

            {/* Rules card */}
            <View
              className="mt-5 bg-white rounded-2xl border border-gray-100 p-4"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mb-3">
                Requirements
              </Text>
              <View className="gap-2">
                <Rule passed={rules.length} label="At least 8 characters" />
                <Rule
                  passed={rules.mixedCase}
                  label="Upper and lower case letters"
                />
                <Rule passed={rules.number} label="At least one number" />
                <Rule
                  passed={rules.symbol}
                  label="At least one symbol (!@#$…)"
                />
              </View>
              {allRulesPass && (
                <View className="flex-row items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <Ionicons name="sparkles" size={12} color="#059669" />
                  <Text className="text-[11.5px] font-extrabold text-emerald-700">
                    Looks great
                  </Text>
                </View>
              )}
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 mt-6 ${
                canSubmit ? "bg-blue-600 active:bg-blue-700" : "bg-gray-200"
              }`}
              style={{
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: canSubmit ? 0.25 : 0,
                shadowRadius: 10,
                elevation: canSubmit ? 4 : 0,
              }}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white font-extrabold text-[14.5px]">
                    Updating…
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="lock-closed"
                    size={15}
                    color={canSubmit ? "#fff" : "#9ca3af"}
                  />
                  <Text
                    className={`font-extrabold text-[14.5px] ${
                      canSubmit ? "text-white" : "text-gray-500"
                    }`}
                  >
                    Update password
                  </Text>
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
                You'll stay signed in on this device
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
