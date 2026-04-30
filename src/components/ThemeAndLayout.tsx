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

/**
 * Storefront templates available to vendors. IDs match the values the
 * backend stores in `storeData.templateId`, and the screenshot files were
 * lifted from `orderly-by-goodspeed/src/assets/images/Templates/` so the
 * mobile preview matches the web one byte-for-byte.
 */
const THEMES = [
  {
    id: "mg1",
    label: "Orderly Core",
    tagline: "Clean, balanced, and versatile.",
    screenshot: require("../../assets/templates/t1.png"),
    accent: "#6366F1",
  },
  {
    id: "speedpro",
    label: "Speed-Pro",
    tagline: "Bold, polished, and business-ready.",
    screenshot: require("../../assets/templates/speed1.png"),
    accent: "#791A4D",
  },
  {
    id: "ranger",
    label: "Shop Ranger",
    tagline: "Strong, flexible, and sales-driven.",
    screenshot: require("../../assets/templates/ranger.png"),
    accent: "#791A4D",
  },
  {
    id: "jewl",
    label: "Jeweler-Esque",
    tagline: "Elegant, refined, and premium.",
    screenshot: require("../../assets/templates/straight.png"),
    accent: "#791A4D",
  },
  {
    id: "da1",
    label: "Fresh Cart",
    tagline: "Fresh, modern, and conversion-focused.",
    screenshot: require("../../assets/templates/fresh.png"),
    accent: "#059669",
  },
  {
    id: "galactic",
    label: "Galactic",
    tagline: "Premium catalog with luxury leather aesthetics.",
    screenshot: require("../../assets/templates/squint.png"),
    accent: "#2f3237",
  },
  {
    id: "atelier",
    label: "Atelier",
    tagline: "Editorial, minimal, and quietly premium.",
    screenshot: require("../../assets/templates/atlier.png"),
    accent: "#0a0a0a",
  },
  {
    id: "brio",
    label: "Brio",
    tagline: "Crisp, product-first storefront with bright hero.",
    screenshot: require("../../assets/templates/brio.png"),
    accent: "#0a0a0a",
  },
  {
    id: "carte",
    label: "Carte",
    tagline: "No hero — opens straight into the product grid.",
    screenshot: require("../../assets/templates/carte.png"),
    accent: "#0a0a0a",
  },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export default function ThemeLayoutModal({
  visible,
  onClose,
  initialTemplateId,
}: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  // We seed with the first id but the effect below replaces it whenever the
  // sheet opens, so initial mount never shows the wrong selection.
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(THEMES[0].id);

  useEffect(() => {
    if (!visible) return;
    const matched = THEMES.find((t) => t.id === initialTemplateId);
    setSelectedTheme(matched ? matched.id : THEMES[0].id);
  }, [visible, initialTemplateId]);

  const handleSelect = (id: ThemeId) => {
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
      height="92%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      >
        <View className="flex-row items-center justify-between mt-3 mb-3">
          <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px]">
            Available themes
          </Text>
          <Text className="text-[11px] font-bold text-gray-500">
            {THEMES.length} options
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between">
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
                    shadowOpacity: isSelected ? 0.14 : 0.06,
                    shadowRadius: 12,
                    elevation: isSelected ? 4 : 2,
                  }}
                >
                  <View className="aspect-[9/16] bg-gray-100">
                    <AppImage
                      source={theme.screenshot}
                      contentFit="cover"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>

                  {isSelected && (
                    <View
                      className="absolute inset-0"
                      pointerEvents="none"
                      style={{ backgroundColor: "rgba(37,99,235,0.06)" }}
                    />
                  )}

                  {isSelected ? (
                    <View className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-blue-600 items-center justify-center">
                      <Ionicons name="checkmark" size={16} color="white" />
                    </View>
                  ) : (
                    <View className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 items-center justify-center">
                      <Ionicons
                        name="ellipse-outline"
                        size={14}
                        color="#94a3b8"
                      />
                    </View>
                  )}

                  {/* Currently-applied indicator — distinct from "selected
                      in this picker" so the vendor can see what's live. */}
                  {storeData?.templateId === theme.id && (
                    <View className="absolute top-2.5 left-2.5 bg-gray-900/85 px-2 py-0.5 rounded-full">
                      <Text className="text-white text-[9px] font-extrabold tracking-wider uppercase">
                        Active
                      </Text>
                    </View>
                  )}
                </View>

                <View className="mt-3 px-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <Text
                      className="text-[14px] font-extrabold text-gray-900 tracking-tight flex-1"
                      numberOfLines={1}
                    >
                      {theme.label}
                    </Text>
                  </View>
                  <Text
                    className="text-[11.5px] text-gray-500 leading-[16px]"
                    numberOfLines={2}
                  >
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
