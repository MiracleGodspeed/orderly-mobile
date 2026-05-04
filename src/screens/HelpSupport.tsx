import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { AppToast, AppToastTone } from "../components/AppToast";

type Notify = (t: { title: string; subtitle?: string; tone?: AppToastTone }) => void;
import { useVendor } from "../../context/VendorContext";
import { useSupportConfig } from "../hooks/useSupportConfig";
import {
  submitSupportMessage,
  type SupportConfig,
} from "../api/support/support.api";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const MAX_MESSAGE_LEN = 1000;

const haptic = (style: "light" | "success" | "error" = "light") => {
  if (Platform.OS !== "ios") return;
  if (style === "success") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
  } else if (style === "error") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {}
    );
  } else {
    Haptics.selectionAsync().catch(() => {});
  }
};

interface ChannelRow {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  onPress: () => void;
}

interface ContactChannelsProps {
  config: SupportConfig;
  onOpenLink: (url: string, label: string) => void;
}

function ContactChannels({ config, onOpenLink }: ContactChannelsProps) {
  const rows: ChannelRow[] = [];

  if (config.phone) {
    rows.push({
      icon: "call",
      iconColor: "#2563eb",
      iconBg: "#eff6ff",
      label: "Call us",
      value: config.phone,
      onPress: () => onOpenLink(`tel:${config.phone?.replace(/\s+/g, "")}`, "phone"),
    });
  }
  if (config.whatsApp) {
    const digits = config.whatsApp.replace(/[^0-9]/g, "");
    rows.push({
      icon: "logo-whatsapp",
      iconColor: "#16a34a",
      iconBg: "#dcfce7",
      label: "WhatsApp",
      value: config.whatsApp,
      onPress: () => onOpenLink(`https://wa.me/${digits}`, "WhatsApp"),
    });
  }
  if (config.email) {
    rows.push({
      icon: "mail",
      iconColor: "#7c3aed",
      iconBg: "#ede9fe",
      label: "Email us",
      value: config.email,
      onPress: () => onOpenLink(`mailto:${config.email}`, "email"),
    });
  }

  if (rows.length === 0) return null;

  return (
    <View
      className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 overflow-hidden"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {rows.map((row, i) => (
        <Pressable
          key={row.label}
          onPress={() => {
            haptic();
            row.onPress();
          }}
          className={`flex-row items-center px-4 py-4 active:bg-gray-50 ${
            i !== rows.length - 1 ? "border-b border-gray-100" : ""
          }`}
        >
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
            style={{ backgroundColor: row.iconBg }}
          >
            <Ionicons name={row.icon} size={19} color={row.iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px]">
              {row.label}
            </Text>
            <Text
              className="text-[14.5px] text-gray-900 mt-0.5"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              numberOfLines={1}
            >
              {row.value}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color="#9ca3af" />
        </Pressable>
      ))}
    </View>
  );
}

interface ContactFormProps {
  email: string;
  onSubmitted: () => void;
  notify: Notify;
}

function ContactForm({ email, onSubmitted, notify }: ContactFormProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const trimmed = message.trim();
  const remaining = MAX_MESSAGE_LEN - message.length;
  const canSubmit = !submitting && trimmed.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitSupportMessage(trimmed);
      haptic("success");
      notify({
        title: "Message sent",
        subtitle: "We'll be in touch soon.",
        tone: "success",
      });
      setMessage("");
      onSubmitted();
    } catch (e: any) {
      console.error("Support submission failed:", e);
      haptic("error");
      notify({
        title: "Couldn't send your message",
        subtitle: e?.message ?? "Try again in a moment.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="mx-4 mt-3">
      <View className="gap-4">
        {/* Email field — locked */}
        <View>
          <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px] mb-2">
            Your email
          </Text>
          <View
            className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 px-4 py-3.5"
          >
            <Ionicons name="mail-outline" size={16} color="#6b7280" />
            <Text
              className="flex-1 text-[14.5px] text-gray-700 ml-2.5"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              numberOfLines={1}
            >
              {email || "—"}
            </Text>
            <View className="flex-row items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
              <Ionicons name="lock-closed" size={10} color="#6b7280" />
              <Text className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wide">
                Locked
              </Text>
            </View>
          </View>
        </View>

        {/* Message */}
        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px]">
              How can we help?
            </Text>
            <Text
              className={`text-[11px] font-bold ${
                remaining < 0
                  ? "text-rose-600"
                  : remaining < 100
                  ? "text-amber-600"
                  : "text-gray-400"
              }`}
            >
              {remaining}
            </Text>
          </View>
          <View
            className={`bg-white rounded-2xl border ${
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
              value={message}
              onChangeText={(t) =>
                // Hard cap at the limit so the counter never goes negative
                // mid-paste — mirrors the backend's 1000-char ceiling.
                setMessage(t.length > MAX_MESSAGE_LEN ? t.slice(0, MAX_MESSAGE_LEN) : t)
              }
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Tell us what's going on. The more details, the faster we can help."
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              maxLength={MAX_MESSAGE_LEN}
              editable={!submitting}
              className="px-4 py-3.5 text-[14.5px] text-gray-900"
              style={{
                fontFamily: "PlusJakartaSans_400Regular",
                minHeight: 180,
              }}
            />
          </View>
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
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
                Sending…
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="send"
                size={14}
                color={canSubmit ? "#fff" : "#9ca3af"}
              />
              <Text
                className={`font-extrabold text-[14.5px] ${
                  canSubmit ? "text-white" : "text-gray-500"
                }`}
              >
                Send message
              </Text>
            </>
          )}
        </Pressable>

        <Text className="text-[11.5px] text-gray-500 text-center">
          We typically reply within one business day.
        </Text>
      </View>
    </View>
  );
}

export default function HelpSupport() {
  const navigation = useNavigation<Nav>();
  const { storeData } = useVendor();
  const email = storeData?.email ?? "";
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);
  const notify: Notify = (t) => setToast(t);

  const { data: config, isLoading, isError, refetch } = useSupportConfig();

  const openLink = async (url: string, label: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else
        notify({
          title: `Couldn't open ${label}`,
          tone: "error",
        });
    } catch {
      notify({ title: `Couldn't open ${label}`, tone: "error" });
    }
  };

  const handleHelpCenter = () => {
    haptic();
    const url = config?.helpCenterUrl || "https://help.orderlystores.com";
    openLink(url, "the help center");
  };

  const showChannels = config?.showContactDetails === true;

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
          Help &amp; Support
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
                <Ionicons name="headset" size={22} color="#bfdbfe" />
              </View>
              <View className="flex-1">
                <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.6px] text-blue-200">
                  We've got your back
                </Text>
                <Text
                  className="text-white text-[19px] tracking-tight mt-1"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  How can we help?
                </Text>
              </View>
            </View>
            <Text className="text-blue-100/80 text-[12.5px] mt-3 leading-[18px]">
              {showChannels
                ? "Reach our team directly via the channels below — we usually reply within one business day."
                : "Drop us a message and we'll get back to you within one business day."}
            </Text>
          </View>

          {/* Help center quick link — always visible */}
          <Pressable
            onPress={handleHelpCenter}
            className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 overflow-hidden flex-row items-center px-4 py-4 active:bg-gray-50"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View className="w-11 h-11 rounded-2xl bg-amber-50 items-center justify-center mr-3 border border-amber-100">
              <Ionicons name="library-outline" size={19} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[14.5px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Browse the Help Center
              </Text>
              <Text
                className="text-[12.5px] text-gray-500 mt-0.5 leading-[16px]"
                numberOfLines={2}
              >
                Step-by-step guides and answers to common questions.
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color="#9ca3af" />
          </Pressable>

          {/* Section label */}
          <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-gray-400 mx-5 mt-6 mb-2">
            {showChannels ? "Talk to us" : "Send a message"}
          </Text>

          {/* Loading / error / content */}
          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-[12.5px] text-gray-500 mt-2">
                Loading support details…
              </Text>
            </View>
          ) : isError || !config ? (
            <View className="mx-4 bg-white rounded-2xl border border-gray-100 p-6 items-center">
              <Ionicons name="cloud-offline-outline" size={28} color="#94a3b8" />
              <Text className="text-[13.5px] text-gray-700 mt-2 text-center font-bold">
                Couldn't load support details
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1 text-center">
                Check your connection and try again.
              </Text>
              <Pressable
                onPress={() => refetch()}
                className="mt-4 px-4 h-9 rounded-full bg-blue-600 items-center justify-center"
              >
                <Text className="text-white text-[12.5px] font-extrabold">
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : showChannels ? (
            <ContactChannels config={config} onOpenLink={openLink} />
          ) : (
            <ContactForm email={email} onSubmitted={() => {}} notify={notify} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
