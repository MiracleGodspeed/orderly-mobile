import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function Security() {
  const navigation = useNavigation<Nav>();
  const { storeData } = useVendor();
  const email = storeData?.email ?? "";

  const handleChangePassword = () => {
    haptic();
    navigation.navigate("ChangePassword");
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
          Security
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
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
          <View
            style={{
              position: "absolute",
              bottom: -50,
              left: -30,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: "rgba(34, 197, 94, 0.14)",
            }}
          />

          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-blue-500/20 items-center justify-center border border-blue-400/30">
              <Ionicons name="shield-checkmark" size={22} color="#bfdbfe" />
            </View>
            <View className="flex-1">
              <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.6px] text-blue-200">
                Account security
              </Text>
              <Text
                className="text-white text-[19px] tracking-tight mt-1"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Keep your store safe
              </Text>
            </View>
          </View>

          {email ? (
            <View className="flex-row items-center gap-2 mt-4 bg-white/10 border border-white/15 rounded-xl px-3 py-2.5">
              <Ionicons name="mail-outline" size={14} color="#bfdbfe" />
              <Text
                className="text-blue-100 text-[12.5px] flex-1"
                numberOfLines={1}
              >
                Signed in as{" "}
                <Text
                  className="text-white"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  {email}
                </Text>
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section: Authentication */}
        <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mx-5 mt-6 mb-2">
          Authentication
        </Text>

        <View
          className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          <Pressable
            onPress={handleChangePassword}
            className="flex-row items-center px-4 py-4 active:bg-gray-50"
          >
            <View className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center mr-3 border border-blue-100">
              <Ionicons name="key-outline" size={19} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[14.5px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Change password
              </Text>
              <Text className="text-[12.5px] text-gray-500 mt-0.5 leading-[16px]">
                Pick a new password — at least 8 characters, mix of letters,
                numbers, and a symbol.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Section: Best practices — replaces the fake 2FA / sessions
            controls. Educational content beats non-functional toggles. */}
        <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mx-5 mt-6 mb-2">
          Best practices
        </Text>

        <View
          className="mx-4 bg-white rounded-2xl border border-gray-100 p-4"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          {[
            {
              icon: "lock-closed-outline" as const,
              title: "Use a unique password",
              body: "Don't reuse the password from another account. If that one leaks, attackers will try it here.",
              tint: "#eef2ff",
              iconColor: "#4f46e5",
            },
            {
              icon: "phone-portrait-outline" as const,
              title: "Sign out on shared devices",
              body: "If you log in on a friend's phone or a public computer, sign out before you leave.",
              tint: "#ecfdf5",
              iconColor: "#059669",
            },
            {
              icon: "alert-circle-outline" as const,
              title: "Watch for suspicious emails",
              body: "Orderly will never ask for your password by email. Always confirm the sender before clicking links.",
              tint: "#fff1f2",
              iconColor: "#e11d48",
            },
          ].map((tip, i, arr) => (
            <View
              key={tip.title}
              className={`flex-row ${
                i === arr.length - 1 ? "" : "pb-3 mb-3 border-b border-gray-100"
              }`}
            >
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                style={{ backgroundColor: tip.tint }}
              >
                <Ionicons name={tip.icon} size={18} color={tip.iconColor} />
              </View>
              <View className="flex-1 pt-0.5">
                <Text
                  className="text-[13.5px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  {tip.title}
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5 leading-[16px]">
                  {tip.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Trust line */}
        <View className="flex-row items-center justify-center gap-1.5 mt-5 px-6">
          <Ionicons
            name="shield-checkmark-outline"
            size={13}
            color="#94a3b8"
          />
          <Text className="text-[11.5px] text-gray-500 text-center">
            Your password is encrypted and never stored in plain text.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
