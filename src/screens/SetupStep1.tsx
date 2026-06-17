import {
  View,
  Text,
  StatusBar,
  Platform,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { useProgress } from "../../context/ProgressContext";
import { useAuth } from "../../context/AuthContext";
import { SetupHeader } from "../components/SetupHeader";
import { getStoreUrlSuggestions } from "../api/vendor/vendor.api";
import { StoreUrlSuggestion } from "../api/vendor/vendor.types";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NAME_MAX = 60;
const DESC_MAX = 200;

// Storefronts live at `{slug}.orderlystores.com` — used only for the link
// preview; the slug itself comes from the server so it can't drift.
const STORE_DOMAIN = "orderlystores.com";

export default function SetupStep1() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { setProgress } = useProgress();
  const {
    setBusinessInfo,
    setSelectedSlug: persistSlug,
    businessName: existingName,
    description: existingDesc,
    storeData,
  } = useVendor();
  const { logout } = useAuth();

  // Self-heal guard: a vendor who actually finished onboarding must
  // never be stranded in the wizard. If fresh store data shows a real
  // store name (e.g. boot routed them here on a stale
  // PendingOnboarding, or they completed setup on another device),
  // bounce straight to Home. Mirrors the web /setup completeness redirect.
  useEffect(() => {
    if (storeData?.storeName && storeData.storeName.trim().length > 0) {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    }
  }, [storeData?.storeName, navigation]);

  const handleBackToLogin = () => {
    Alert.alert(
      "Back to login?",
      "You'll be signed out. You can sign back in anytime to finish setting up your store.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Back to login",
          style: "destructive",
          onPress: () => {
            logout().catch(() => {});
          },
        },
      ]
    );
  };

  const [businessName, setBusinessName] = useState(existingName || "");
  const [description, setDescription] = useState(existingDesc || "");
  const [focusedField, setFocusedField] = useState<"name" | "desc" | null>(
    null
  );

  // Live store-URL suggestions. Debounced fetch as the vendor types; the
  // first available variant is pre-selected so it's zero-friction.
  const [slugSuggestions, setSlugSuggestions] = useState<StoreUrlSuggestion[]>(
    []
  );
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [slugLoading, setSlugLoading] = useState(false);
  const slugCacheRef = useRef<Map<string, StoreUrlSuggestion[]>>(new Map());
  const slugReqIdRef = useRef(0);

  const applySuggestions = useCallback((list: StoreUrlSuggestion[]) => {
    setSlugSuggestions(list);
    setSlugLoading(false);
    setSelectedSlug((prev) => {
      if (prev && list.some((s) => s.slug === prev && s.available)) return prev;
      return list.find((s) => s.available)?.slug ?? null;
    });
  }, []);

  useEffect(() => {
    const name = businessName.trim();
    if (!name) {
      setSlugSuggestions([]);
      setSelectedSlug(null);
      setSlugLoading(false);
      return;
    }

    const cached = slugCacheRef.current.get(name.toLowerCase());
    if (cached) {
      applySuggestions(cached);
      return;
    }

    const reqId = ++slugReqIdRef.current;
    setSlugLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await getStoreUrlSuggestions(name);
        slugCacheRef.current.set(name.toLowerCase(), list);
        if (reqId !== slugReqIdRef.current) return; // superseded by newer keystroke
        applySuggestions(list);
      } catch {
        // Fail soft — don't trap the vendor if the check is unreachable.
        // Submit re-derives + re-checks the slug authoritatively.
        if (reqId !== slugReqIdRef.current) return;
        setSlugSuggestions([]);
        setSelectedSlug(null);
        setSlugLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [businessName, applySuggestions]);

  const selectedSlugAvailable =
    selectedSlug != null &&
    slugSuggestions.some((s) => s.slug === selectedSlug && s.available);
  // Hold while checking; require an available pick once resolved; let them
  // through if the check is unreachable (empty + not loading).
  const slugStepOk =
    !slugLoading &&
    (slugSuggestions.length === 0 ? true : selectedSlugAvailable);
  const multipleSlugs = slugSuggestions.length > 1;

  const isValid =
    businessName.trim().length > 0 &&
    description.trim().length > 0 &&
    slugStepOk;

  const handleContinue = () => {
    if (!isValid) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setBusinessInfo(businessName.trim(), description.trim());
    persistSlug(selectedSlug);
    setProgress(0.33);
    navigation.navigate("SetupStep2");
  };

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
          <SetupHeader
            step={1}
            totalSteps={3}
            title="Tell us about your business"
            subtitle="A clear name and short description helps customers find you and trust what you sell."
            onBack={() => navigation.goBack()}
            onExit={handleBackToLogin}
          />

          {/* Form card */}
          <View className="px-6 mt-7">
            <View
              className="bg-white rounded-3xl border border-gray-100 p-5"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-4">
                Business basics
              </Text>

              {/* Business name */}
              <View className="flex-row items-end justify-between mb-2">
                <Text className="text-[13px] font-semibold text-gray-700">
                  Business name
                </Text>
                <Text className="text-[11px] text-gray-400 font-semibold">
                  {businessName.length}/{NAME_MAX}
                </Text>
              </View>
              <View
                className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 mb-5 ${
                  focusedField === "name"
                    ? "border-blue-600 bg-white"
                    : "border-gray-200"
                }`}
              >
                <Ionicons name="storefront-outline" size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 py-3 text-[15px] text-gray-900"
                  placeholder="e.g. Naija Spice Kitchen"
                  placeholderTextColor="#9CA3AF"
                  value={businessName}
                  onChangeText={(t) => setBusinessName(t.slice(0, NAME_MAX))}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Store-URL preview / picker — appears once a name is typed */}
              {businessName.trim().length > 0 && (
                <View className="-mt-2 mb-5">
                  <View className="flex-row items-center gap-1.5 mb-1.5">
                    <Ionicons name="globe-outline" size={13} color="#9ca3af" />
                    <Text className="text-[11px] font-semibold text-gray-500">
                      {multipleSlugs ? "Choose your store link" : "Your store link"}
                    </Text>
                  </View>

                  {slugLoading ? (
                    <View className="flex-row items-center gap-2 px-1 py-1.5">
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text className="text-[12px] text-gray-400">
                        Checking availability…
                      </Text>
                    </View>
                  ) : slugSuggestions.length === 0 ? (
                    <Text className="text-[12px] text-gray-400 px-1">
                      We'll set your store link automatically.
                    </Text>
                  ) : (
                    <View style={{ gap: 6 }}>
                      {slugSuggestions.map((s) => {
                        const active = selectedSlug === s.slug;
                        return (
                          <Pressable
                            key={s.slug}
                            disabled={!s.available}
                            onPress={() => {
                              if (!s.available) return;
                              if (Platform.OS === "ios") {
                                Haptics.selectionAsync().catch(() => {});
                              }
                              setSelectedSlug(s.slug);
                            }}
                            className={`flex-row items-center rounded-2xl border px-3 py-2.5 ${
                              !s.available
                                ? "border-gray-100 bg-gray-50"
                                : active
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            {/* Radio dot */}
                            <View
                              className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                                active && s.available
                                  ? "border-blue-600"
                                  : "border-gray-300"
                              }`}
                            >
                              {active && s.available && (
                                <View className="w-2 h-2 rounded-full bg-blue-600" />
                              )}
                            </View>

                            <Text
                              numberOfLines={1}
                              className={`flex-1 ml-2.5 text-[13px] font-semibold ${
                                !s.available
                                  ? "text-gray-400 line-through"
                                  : active
                                  ? "text-blue-700"
                                  : "text-gray-700"
                              }`}
                            >
                              {s.slug}
                              <Text className="text-gray-400">.{STORE_DOMAIN}</Text>
                            </Text>

                            {!s.available && (
                              <Text className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded-full">
                                Taken
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Description */}
              <View className="flex-row items-end justify-between mb-2">
                <Text className="text-[13px] font-semibold text-gray-700">
                  Short description
                </Text>
                <Text className="text-[11px] text-gray-400 font-semibold">
                  {description.length}/{DESC_MAX}
                </Text>
              </View>
              <View
                className={`rounded-2xl border bg-gray-50 px-4 py-3 ${
                  focusedField === "desc"
                    ? "border-blue-600 bg-white"
                    : "border-gray-200"
                }`}
                style={{ minHeight: 110 }}
              >
                <TextInput
                  className="text-[15px] text-gray-900"
                  placeholder="What you sell, what makes you different — a couple of sentences."
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={(t) => setDescription(t.slice(0, DESC_MAX))}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => setFocusedField("desc")}
                  onBlur={() => setFocusedField(null)}
                  style={{ minHeight: 80 }}
                />
              </View>

              {/* Tip */}
              <View className="flex-row items-start gap-2 mt-4">
                <Ionicons
                  name="bulb-outline"
                  size={14}
                  color="#7c3aed"
                  style={{ marginTop: 1 }}
                />
                <Text className="flex-1 text-[12px] text-gray-500 leading-[17px]">
                  Tip: customers love specifics — "freshly-baked artisan bread"
                  beats "we sell food."
                </Text>
              </View>

              {/* Continue */}
              <Pressable
                onPress={handleContinue}
                disabled={!isValid}
                className={`mt-5 h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                  isValid ? "bg-blue-600" : "bg-gray-200"
                }`}
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isValid ? 0.25 : 0,
                  shadowRadius: 8,
                  elevation: isValid ? 4 : 0,
                }}
              >
                <Text
                  className={`text-[15px] font-bold ${
                    isValid ? "text-white" : "text-gray-500"
                  }`}
                >
                  Continue
                </Text>
                {isValid && (
                  <Ionicons name="arrow-forward" size={16} color="white" />
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
