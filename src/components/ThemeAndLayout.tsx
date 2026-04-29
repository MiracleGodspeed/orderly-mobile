import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useVendor } from "../../context/VendorContext";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";
import { AppImage } from "./AppImage";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTemplateId?: string;
}

const THEMES = [
  {
    id: "orderly-core",
    label: "Orderly Core",
    tagline: "Clean, modern, versatile",
    accent: "#2563eb",
  },
  {
    id: "speed-pro",
    label: "Speed Pro",
    tagline: "Bold typography, fast checkout",
    accent: "#0f172a",
  },
  {
    id: "fresh-cart",
    label: "Fresh Cart",
    tagline: "Bright, friendly, food-ready",
    accent: "#059669",
  },
  {
    id: "business-exec",
    label: "Business Exec",
    tagline: "Polished, premium, refined",
    accent: "#7c3aed",
  },
] as const;

type ThemeOption = (typeof THEMES)[number]["id"];

const THEME_THUMB = require("../../assets/themeImg.png");

export default function ThemeLayoutModal({
  visible,
  onClose,
  initialTemplateId,
}: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [selectedTheme, setSelectedTheme] =
    useState<ThemeOption>("orderly-core");

  useEffect(() => {
    if (visible && initialTemplateId) {
      const theme = THEMES.find((t) => t.id === initialTemplateId);
      if (theme) setSelectedTheme(theme.id);
    }
  }, [visible, initialTemplateId]);

  const handleSelect = (id: ThemeOption) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setSelectedTheme(id);
  };

  const handleSave = async () => {
    if (!storeData) return;
    try {
      await updateVendorSettings({ templateId: selectedTheme });
      onClose();
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Theme & Layout"
      subtitle="Pick the look and feel of your storefront"
      height="90%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        <View className="flex-row flex-wrap justify-between mt-3">
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <Pressable
                key={theme.id}
                onPress={() => handleSelect(theme.id)}
                className="w-[48%] mb-5"
              >
                <View
                  className={`rounded-3xl overflow-hidden bg-gray-50 border-2 ${
                    isSelected ? "border-blue-600" : "border-transparent"
                  }`}
                  style={{
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isSelected ? 0.12 : 0.06,
                    shadowRadius: 12,
                    elevation: isSelected ? 4 : 2,
                  }}
                >
                  <View className="aspect-[9/16] bg-gray-100">
                    <AppImage
                      source={THEME_THUMB}
                      contentFit="cover"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>

                  {isSelected && (
                    <View className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-blue-600 items-center justify-center">
                      <Ionicons name="checkmark" size={16} color="white" />
                    </View>
                  )}
                </View>

                <View className="mt-3 px-1">
                  <View className="flex-row items-center gap-2 mb-0.5">
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <Text className="text-[14px] font-bold text-gray-900">
                      {theme.label}
                    </Text>
                  </View>
                  <Text className="text-[11.5px] text-gray-500 leading-[16px]">
                    {theme.tagline}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 flex-row items-start gap-3 mt-2">
          <Ionicons name="bulb-outline" size={18} color="#2563eb" />
          <Text className="text-[12.5px] text-blue-800 leading-[18px] flex-1">
            You can switch themes anytime — your products, customers, and
            settings stay exactly where they are.
          </Text>
        </View>
      </ScrollView>

      <BottomSheetFooter
        onCancel={onClose}
        onSave={handleSave}
        loading={loading}
      />
    </BottomSheet>
  );
}
