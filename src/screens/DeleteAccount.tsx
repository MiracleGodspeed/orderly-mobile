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
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { useVendor } from "../../context/VendorContext";
import { deleteAccount } from "../api/auth/auth.api";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CONFIRM_PHRASE = "DELETE";

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

export default function DeleteAccount() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const { logout } = useAuth();
  const { storeData } = useVendor();
  const email = storeData?.email ?? "";

  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const phraseMatches = confirmation.trim().toUpperCase() === CONFIRM_PHRASE;
  const canDelete = phraseMatches && !submitting;

  const handleDelete = async () => {
    if (!canDelete) return;
    haptic("medium");
    setSubmitting(true);
    try {
      await deleteAccount();
      haptic("success");
      // Tear down local auth + cached state, then reset to the start of
      // the navigation tree so back-swipes can't return to authenticated
      // screens with a stale token.
      await logout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Splash" as any }],
        })
      );
    } catch (e: any) {
      console.error("Delete account failed:", e);
      haptic("error");
      toast.show(e?.message ?? "Couldn't delete your account.", {
        type: "danger",
      });
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
          Delete account
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
          {/* Hero — danger toned. Different from the usual blue hero so
              vendors instantly read the gravity of this screen. */}
          <View
            className="mx-4 mt-4 rounded-3xl overflow-hidden p-5"
            style={{ backgroundColor: "#7f1d1d" }}
          >
            <View
              style={{
                position: "absolute",
                top: -45,
                right: -45,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: "rgba(248, 113, 113, 0.18)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -55,
                left: -30,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: "rgba(254, 202, 202, 0.10)",
              }}
            />
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center border border-white/20">
                <Ionicons name="warning" size={22} color="#fecaca" />
              </View>
              <View className="flex-1">
                <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.6px] text-rose-200">
                  Permanent action
                </Text>
                <Text
                  className="text-white text-[19px] tracking-tight mt-1"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Delete your account
                </Text>
              </View>
            </View>
          </View>

          {/* What happens next */}
          <View className="mx-4 mt-5">
            <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mb-2 px-1">
              What happens next
            </Text>
            <View
              className="bg-white rounded-2xl border border-gray-100 p-4"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {[
                {
                  icon: "globe-outline" as const,
                  text: "Your storefront goes offline immediately and customers can't place new orders.",
                },
                {
                  icon: "person-outline" as const,
                  text: "Your name, email, and phone number are removed from our systems.",
                },
                {
                  icon: "log-out-outline" as const,
                  text: "You'll be signed out on this device. You won't be able to sign back in.",
                },
                {
                  icon: "receipt-outline" as const,
                  text: "Past orders, payouts, and invoices are kept anonymized for accounting and legal records.",
                },
                {
                  icon: "card-outline" as const,
                  text: "Subscriptions don't auto-renew, so nothing extra to do. Any time left on your current paid period is not refunded.",
                },
              ].map((item, i, arr) => (
                <View
                  key={item.text}
                  className={`flex-row gap-3 ${
                    i === arr.length - 1
                      ? ""
                      : "pb-3 mb-3 border-b border-gray-100"
                  }`}
                >
                  <View className="w-8 h-8 rounded-xl bg-rose-50 items-center justify-center">
                    <Ionicons name={item.icon} size={15} color="#e11d48" />
                  </View>
                  <Text className="flex-1 text-[12.5px] text-gray-700 leading-[18px] pt-1">
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Confirmation field */}
          <View className="mx-4 mt-6">
            <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mb-2 px-1">
              Confirm
            </Text>
            {email ? (
              <View className="flex-row items-center gap-1.5 mb-2 px-1">
                <Ionicons name="mail-outline" size={12} color="#6b7280" />
                <Text className="text-[12px] text-gray-500" numberOfLines={1}>
                  Deleting{" "}
                  <Text
                    className="text-gray-900"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {email}
                  </Text>
                </Text>
              </View>
            ) : null}
            <Text className="text-[12.5px] text-gray-600 leading-[18px] mb-3 px-1">
              Type{" "}
              <Text
                className="text-rose-600"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {CONFIRM_PHRASE}
              </Text>{" "}
              below to confirm. This cannot be undone.
            </Text>
            <View
              className={`bg-white rounded-2xl border ${
                phraseMatches
                  ? "border-rose-300"
                  : confirmation.length > 0
                  ? "border-amber-200"
                  : "border-gray-100"
              }`}
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <TextInput
                value={confirmation}
                onChangeText={setConfirmation}
                placeholder={`Type ${CONFIRM_PHRASE}`}
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                autoCorrect={false}
                className="px-4 py-3.5 text-[16px] text-gray-900"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  letterSpacing: 1.5,
                }}
              />
            </View>
          </View>

          {/* Action buttons */}
          <View className="mx-4 mt-6 gap-3">
            <Pressable
              onPress={handleDelete}
              disabled={!canDelete}
              className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                canDelete ? "bg-rose-600 active:bg-rose-700" : "bg-rose-200"
              }`}
              style={{
                shadowColor: "#e11d48",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: canDelete ? 0.3 : 0,
                shadowRadius: 10,
                elevation: canDelete ? 4 : 0,
              }}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white font-extrabold text-[14.5px]">
                    Deleting…
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="trash" size={15} color="#fff" />
                  <Text className="text-white font-extrabold text-[14.5px]">
                    Permanently delete account
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              className="h-12 rounded-2xl items-center justify-center bg-white border border-gray-200 active:bg-gray-50"
            >
              <Text className="text-gray-900 font-bold text-[14px]">
                Cancel
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
