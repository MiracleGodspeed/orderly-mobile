import {
  View,
  Text,
  StatusBar,
  Platform,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { useProgress } from "../../context/ProgressContext";
import { SetupHeader } from "../components/SetupHeader";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NAME_MAX = 60;
const DESC_MAX = 200;

export default function SetupStep1() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { setProgress } = useProgress();
  const { setBusinessInfo, businessName: existingName, description: existingDesc } =
    useVendor();

  const [businessName, setBusinessName] = useState(existingName || "");
  const [description, setDescription] = useState(existingDesc || "");
  const [focusedField, setFocusedField] = useState<"name" | "desc" | null>(
    null
  );

  const isValid =
    businessName.trim().length > 0 && description.trim().length > 0;

  const handleContinue = () => {
    if (!isValid) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setBusinessInfo(businessName.trim(), description.trim());
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
