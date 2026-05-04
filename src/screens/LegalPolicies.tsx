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
import * as WebBrowser from "expo-web-browser";
import { useToast } from "react-native-toast-notifications";
import Constants from "expo-constants";

import { RootStackParamList } from "../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const WEB_BASE = "https://orderlystores.com";

interface LinkRow {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  url: string;
}

const POLICY_LINKS: LinkRow[] = [
  {
    id: "privacy",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your data.",
    icon: "lock-closed-outline",
    iconColor: "#2563eb",
    iconBg: "#eff6ff",
    url: `${WEB_BASE}/privacy`,
  },
  {
    id: "terms",
    title: "Terms of Service",
    description:
      "The rules for using Orderly — covers subscriptions, billing, and auto-renewal.",
    icon: "document-text-outline",
    iconColor: "#7c3aed",
    iconBg: "#f5f3ff",
    url: `${WEB_BASE}/terms`,
  },
  {
    id: "refund",
    title: "Refund Policy",
    description: "When refunds apply and how to request one.",
    icon: "cash-outline",
    iconColor: "#059669",
    iconBg: "#ecfdf5",
    url: `${WEB_BASE}/refund-policy`,
  },
];

export default function LegalPolicies() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();

  const appVersion =
    (Constants.expoConfig?.version as string | undefined) ?? "1.0.0";

  const openLink = async (row: LinkRow) => {
    haptic();
    try {
      // expo-web-browser opens an in-app SFSafariViewController/Custom Tab
      // session — keeps the vendor inside Orderly chrome (no app-switch),
      // works offline-friendly, and Apple explicitly accepts this for
      // serving policy documents.
      await WebBrowser.openBrowserAsync(row.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: "#2563eb",
      });
    } catch (e) {
      console.error("Couldn't open legal doc:", e);
      toast.show(`Couldn't open ${row.title}`, { type: "danger" });
    }
  };

  const handleDeleteAccount = () => {
    haptic();
    navigation.navigate("DeleteAccount");
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
          Legal & Policies
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
              width: 150,
              height: 150,
              borderRadius: 75,
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
              backgroundColor: "rgba(168, 85, 247, 0.14)",
            }}
          />
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center border border-white/20">
              <Ionicons name="shield-outline" size={22} color="#bfdbfe" />
            </View>
            <View className="flex-1">
              <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.6px] text-blue-200">
                Legal & policies
              </Text>
              <Text
                className="text-white text-[19px] tracking-tight mt-1"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Everything you should know
              </Text>
            </View>
          </View>
          <Text className="text-blue-100/80 text-[12.5px] mt-3 leading-[18px]">
            Documents are served from the web so they're always current. Tap
            any item to read it inside the app.
          </Text>
        </View>

        {/* Policies section */}
        <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mx-5 mt-6 mb-2">
          Policies
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
          {POLICY_LINKS.map((row, i, arr) => (
            <Pressable
              key={row.id}
              onPress={() => openLink(row)}
              className={`flex-row items-center px-4 py-4 active:bg-gray-50 ${
                i === arr.length - 1 ? "" : "border-b border-gray-100"
              }`}
            >
              <View
                className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
                style={{ backgroundColor: row.iconBg }}
              >
                <Ionicons name={row.icon} size={19} color={row.iconColor} />
              </View>
              <View className="flex-1 pr-2">
                <Text
                  className="text-[14px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  {row.title}
                </Text>
                <Text
                  className="text-[12px] text-gray-500 mt-0.5 leading-[16px]"
                  numberOfLines={2}
                >
                  {row.description}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#9ca3af" />
            </Pressable>
          ))}
        </View>

        {/* Subscription disclosure — surfaces the key billing facts so
            vendors aren't surprised. Mirrors Section 5 of the Terms. */}
        <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mx-5 mt-6 mb-2">
          Subscription & billing
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
          <View className="flex-row items-start gap-3">
            <View className="w-11 h-11 rounded-2xl bg-emerald-50 items-center justify-center border border-emerald-100">
              <Ionicons name="card-outline" size={19} color="#059669" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[14px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                No auto-renewal · No surprise charges
              </Text>
              <Text className="text-[12.5px] text-gray-600 mt-1 leading-[18px]">
                Paid plans don't renew automatically. You only pay when you
                start or extend a plan inside Orderly. When your period ends,
                your storefront pauses until you renew — your data is preserved
                and you'll never be billed without an explicit action.
              </Text>
              <Pressable
                onPress={() =>
                  openLink({
                    id: "terms",
                    title: "Terms of Service",
                    description: "",
                    icon: "document-text-outline",
                    iconColor: "#059669",
                    iconBg: "#ecfdf5",
                    url: `${WEB_BASE}/terms`,
                  })
                }
                className="flex-row items-center gap-1.5 mt-3 self-start"
                hitSlop={6}
              >
                <Text className="text-[12px] text-blue-600 font-extrabold">
                  Read full terms
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#2563eb" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Account section — Apple guideline 5.1.1(v) requires in-app
            account deletion. Lives on the Legal screen so vendors can find
            it alongside the policies it relates to. */}
        <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mx-5 mt-6 mb-2">
          Account
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
            onPress={handleDeleteAccount}
            className="flex-row items-center px-4 py-4 active:bg-rose-50/40"
          >
            <View className="w-11 h-11 rounded-2xl bg-rose-50 items-center justify-center mr-3 border border-rose-100">
              <Ionicons name="trash-outline" size={19} color="#e11d48" />
            </View>
            <View className="flex-1 pr-2">
              <Text
                className="text-[14px] text-rose-600"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Delete account
              </Text>
              <Text
                className="text-[12px] text-gray-500 mt-0.5 leading-[16px]"
                numberOfLines={2}
              >
                Permanently remove your account, take your storefront offline,
                and anonymize your personal data.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Footer */}
        <View className="items-center mt-8 px-6">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="shield-checkmark-outline" size={12} color="#94a3b8" />
            <Text className="text-[11.5px] text-gray-500">
              Orderly Stores · v{appVersion}
            </Text>
          </View>
          <Text className="text-[11px] text-gray-400 mt-1.5 text-center">
            © {new Date().getFullYear()} Orderly Store Inc. All rights
            reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
