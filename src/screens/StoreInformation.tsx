import {
  View,
  Text,
  Pressable,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Clipboard,
} from "react-native";
import { useState, useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { AppToast, AppToastTone } from "../components/AppToast";

import { useVendor } from "../../context/VendorContext";
import { ScreenHeader } from "../components/ScreenHeader";
import KeyboardScreen from "../components/KeyboardScreen";

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function StoreInformation() {
  const { storeData } = useVendor();
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  const [storeName, setStoreName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!storeData) return;
    setStoreName(storeData.storeName || "");
    setBusinessAddress(storeData.address || "");
  }, [storeData?.storeName, storeData?.address]);

  const storeUrl = storeData?.slugUrl
    ? `https://${storeData.slugUrl}.orderlystores.com`
    : "";
  const businessCategory = storeData?.isServiceBased
    ? "Service-based"
    : "Product-based";
  const isPublished = !!storeData?.isPublished;
  const isVerified = !!storeData?.isVerified;

  const initialName = storeData?.storeName ?? "";
  const initialAddress = storeData?.address ?? "";
  const isDirty =
    storeName.trim() !== initialName.trim() ||
    businessAddress.trim() !== initialAddress.trim();

  const handleCopyLink = () => {
    if (!storeUrl) return;
    haptic();
    try {
      Clipboard.setString(storeUrl);
      setToast({
        title: "Store link copied",
        subtitle: storeUrl.replace(/^https?:\/\//, ""),
        tone: "success",
      });
    } catch {
      setToast({ title: "Couldn't copy link", tone: "error" });
    }
  };

  const handleOpenLink = async () => {
    if (!storeUrl) return;
    haptic();
    try {
      await Linking.openURL(storeUrl);
    } catch {
      setToast({ title: "Couldn't open link", tone: "error" });
    }
  };

  const handleRequestChange = () => {
    if (!isDirty) return;
    Alert.alert(
      "Request change?",
      "Store name and address changes go through admin review before they go live. We'll email you once they're approved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit request",
          onPress: async () => {
            try {
              setIsSaving(true);
              // Placeholder — admin-review endpoint hasn't shipped yet.
              // Once it does, swap this for the real request.
              await new Promise((resolve) => setTimeout(resolve, 1000));
              setToast({
                title: "Change request submitted",
                subtitle: "Pending admin approval — we'll email you once it's reviewed.",
                tone: "success",
              });
            } catch {
              setToast({
                title: "Couldn't submit request",
                subtitle: "Try again in a moment.",
                tone: "error",
              });
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppToast
        visible={toast != null}
        title={toast?.title ?? ""}
        subtitle={toast?.subtitle}
        tone={toast?.tone}
        onHide={() => setToast(null)}
      />
      <ScreenHeader title="Store information" />

      <KeyboardScreen bottomPadding={140}>
          {/* Branded hero with store identity */}
          <View
            className="mx-5 mt-4 mb-4 rounded-3xl overflow-hidden px-5 pt-5 pb-6"
            style={{ backgroundColor: "#194eb8" }}
          >
            <View
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            />
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 items-center justify-center">
                <Ionicons name="storefront" size={22} color="white" />
              </View>
              <View className="flex-1 min-w-0">
                <Text className="text-white/70 text-[10.5px] font-extrabold uppercase tracking-[1.4px]">
                  Store
                </Text>
                <Text
                  className="text-white text-[20px] font-extrabold tracking-tight mt-0.5"
                  numberOfLines={1}
                >
                  {storeName || "Your store"}
                </Text>
              </View>
            </View>

            {/* Status pills */}
            <View className="flex-row flex-wrap gap-2">
              <View
                className={`flex-row items-center gap-1.5 px-2.5 h-7 rounded-full border ${
                  isPublished
                    ? "bg-emerald-400/20 border-emerald-300/30"
                    : "bg-white/10 border-white/20"
                }`}
              >
                <View
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPublished ? "bg-emerald-300" : "bg-white/50"
                  }`}
                />
                <Text className="text-white text-[10.5px] font-extrabold tracking-wide uppercase">
                  {isPublished ? "Live" : "Draft"}
                </Text>
              </View>
              {isVerified ? (
                <View className="flex-row items-center gap-1 px-2.5 h-7 rounded-full bg-blue-400/20 border border-blue-300/30">
                  <Ionicons name="checkmark-circle" size={12} color="white" />
                  <Text className="text-white text-[10.5px] font-extrabold tracking-wide uppercase">
                    Verified
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-center gap-1 px-2.5 h-7 rounded-full bg-white/10 border border-white/15">
                <Ionicons
                  name={
                    storeData?.isServiceBased ? "construct" : "cube"
                  }
                  size={11}
                  color="white"
                />
                <Text className="text-white text-[10.5px] font-extrabold tracking-wide uppercase">
                  {businessCategory}
                </Text>
              </View>
            </View>
          </View>

          {/* Store URL — primary surface */}
          <View className="px-5 mb-4">
            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-2 pl-1">
              Storefront link
            </Text>
            <View
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View className="px-4 py-3.5 flex-row items-center">
                <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
                  <Ionicons name="link" size={15} color="#2563eb" />
                </View>
                <View className="flex-1 ml-3 min-w-0">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-[1px]">
                    Public URL
                  </Text>
                  <Text
                    className="text-[13px] font-semibold text-gray-900 mt-0.5"
                    numberOfLines={1}
                  >
                    {storeUrl || "Not yet set"}
                  </Text>
                </View>
              </View>

              {storeUrl ? (
                <View className="flex-row border-t border-gray-50">
                  <Pressable
                    onPress={handleCopyLink}
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 active:bg-gray-50"
                  >
                    <Ionicons name="copy-outline" size={13} color="#374151" />
                    <Text className="text-[12px] font-extrabold text-gray-700">
                      Copy
                    </Text>
                  </Pressable>
                  <View className="w-px bg-gray-100" />
                  <Pressable
                    onPress={handleOpenLink}
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 active:bg-blue-50/40"
                  >
                    <Ionicons name="open-outline" size={13} color="#2563eb" />
                    <Text className="text-[12px] font-extrabold text-blue-700">
                      Open
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>

          {/* Editable details */}
          <View className="px-5">
            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-2 pl-1">
              Business details
            </Text>

            <View
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              {/* Store name */}
              <View className="px-4 py-3.5 border-b border-gray-50">
                <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px] mb-1">
                  Store name
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="storefront-outline" size={15} color="#94a3b8" />
                  <TextInput
                    value={storeName}
                    onChangeText={setStoreName}
                    placeholder="What customers see"
                    placeholderTextColor="#cbd5e1"
                    className="flex-1 ml-2.5 text-[15px] font-semibold text-gray-900"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Address */}
              <View className="px-4 py-3.5 border-b border-gray-50">
                <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px] mb-1">
                  Business address
                </Text>
                <View className="flex-row items-start">
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color="#94a3b8"
                    style={{ marginTop: 2 }}
                  />
                  <TextInput
                    value={businessAddress}
                    onChangeText={setBusinessAddress}
                    placeholder="Where you're based"
                    placeholderTextColor="#cbd5e1"
                    className="flex-1 ml-2.5 text-[15px] font-semibold text-gray-900"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Category — read-only, set during onboarding */}
              <View className="px-4 py-3.5 border-b border-gray-50 bg-gray-50/50">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px]">
                    Business category
                  </Text>
                  <View className="flex-row items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                    <Ionicons name="lock-closed" size={9} color="#6b7280" />
                    <Text className="text-[9px] font-extrabold text-gray-500 tracking-wide uppercase">
                      Locked
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <Ionicons
                    name={
                      storeData?.isServiceBased ? "construct" : "cube-outline"
                    }
                    size={15}
                    color="#94a3b8"
                  />
                  <Text className="flex-1 ml-2.5 text-[15px] font-semibold text-gray-500">
                    {businessCategory}
                  </Text>
                </View>
              </View>

              {/* Email — read-only */}
              <View className="px-4 py-3.5 bg-gray-50/50">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px]">
                    Contact email
                  </Text>
                  <View className="flex-row items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                    <Ionicons name="lock-closed" size={9} color="#6b7280" />
                    <Text className="text-[9px] font-extrabold text-gray-500 tracking-wide uppercase">
                      Locked
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="mail-outline" size={15} color="#94a3b8" />
                  <Text
                    className="flex-1 ml-2.5 text-[15px] font-semibold text-gray-500"
                    numberOfLines={1}
                  >
                    {storeData?.email || "—"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Help note */}
            <View className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 flex-row items-start gap-2 mt-4">
              <Ionicons
                name="information-circle"
                size={14}
                color="#2563eb"
                style={{ marginTop: 1 }}
              />
              <Text className="flex-1 text-[12px] text-blue-800 leading-[16px]">
                Store name and address changes go through admin review before
                they go live — usually within 24 hours. You'll be emailed when
                they're approved.
              </Text>
            </View>
          </View>
        </KeyboardScreen>

        {/* Sticky save bar */}
        <View
          className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-7 bg-white border-t border-gray-100"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <Pressable
            onPress={handleRequestChange}
            disabled={!isDirty || isSaving}
            className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
              isDirty && !isSaving ? "" : "opacity-50"
            }`}
            style={{
              backgroundColor: "#194eb8",
              shadowColor: "#194eb8",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDirty && !isSaving ? 0.3 : 0,
              shadowRadius: 16,
              elevation: isDirty && !isSaving ? 6 : 0,
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="paper-plane" size={16} color="white" />
            )}
            <Text className="text-white font-extrabold text-[15px] tracking-tight">
              {isSaving
                ? "Submitting…"
                : isDirty
                ? "Request change"
                : "No changes"}
            </Text>
          </Pressable>
        </View>
    </View>
  );
}
