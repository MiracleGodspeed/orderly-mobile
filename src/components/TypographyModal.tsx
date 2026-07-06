import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVendor } from "../../context/VendorContext";
import { BottomSheet } from "./BottomSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Storefront typography picker. Mirrors the curated list in the web's
 * `storefront/store-fonts.ts` — keys MUST stay in sync (they're what
 * the storefront maps to actual font files). The storefront itself is
 * web, so this screen only records the choice in
 * `storeFrontJson.fontFamily`; the store then renders with it for
 * every customer, on every device.
 */
const STORE_FONTS: { key: string; label: string; vibe: string }[] = [
  { key: "poppins", label: "Poppins", vibe: "Rounded & warm" },
  { key: "quicksand", label: "Quicksand", vibe: "Soft & friendly" },
  { key: "space-grotesk", label: "Space Grotesk", vibe: "Modern & premium" },
  { key: "raleway", label: "Raleway", vibe: "Elegant & light" },
  { key: "jost", label: "Jost", vibe: "Fashion-forward" },
  { key: "barlow", label: "Barlow", vibe: "Bold & confident" },
  { key: "marhey", label: "Marhey", vibe: "Playful & fun" },
  { key: "playfair", label: "Playfair Display", vibe: "Editorial serif" },
  { key: "roboto-slab", label: "Roboto Slab", vibe: "Sturdy slab serif" },
  { key: "cormorant", label: "Cormorant Garamond", vibe: "Luxury boutique" },
];

export default function TypographyModal({ visible, onClose }: Props) {
  const { updateVendorSettings, storeData } = useVendor();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected((storeData as any)?.storeFrontJson?.fontFamily ?? null);
    }
  }, [visible, storeData]);

  const handleSave = async () => {
    if (!storeData) return;
    setSaving(true);
    try {
      // Shallow-merge so the other storefront sections survive the save
      // (same pattern as every other storeFrontJson editor modal).
      const merged = {
        ...((storeData as any)?.storeFrontJson ?? {}),
        fontFamily: selected,
      };
      await updateVendorSettings({ storeFrontJson: merged } as any);
      onClose();
    } catch (e) {
      console.error("Failed to save typography:", e);
    } finally {
      setSaving(false);
    }
  };

  const Option = ({
    active,
    title,
    subtitle,
    onPress,
  }: {
    active: boolean;
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 mb-2 ${
        active ? "border-blue-300 bg-blue-50/70" : "border-gray-200 bg-white"
      }`}
    >
      <View className="flex-1 pr-3">
        <Text className="text-[14.5px] font-bold text-gray-900">{title}</Text>
        <Text className="text-[12px] text-gray-500">{subtitle}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={20} color="#0080ff" />}
    </Pressable>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Typography"
      subtitle="The font your whole storefront uses"
      height="88%"
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[12.5px] leading-5 text-gray-500 mt-3 mb-4">
          Applies to headings, product names and buttons across your store, on
          every device your customers use.
        </Text>

        <Option
          active={selected == null}
          title="Template default"
          subtitle="Each template's own paired typography"
          onPress={() => setSelected(null)}
        />
        {STORE_FONTS.map((f) => (
          <Option
            key={f.key}
            active={selected === f.key}
            title={f.label}
            subtitle={f.vibe}
            onPress={() => setSelected(f.key)}
          />
        ))}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-[#0080ff] py-3.5"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
          <Text className="text-[14px] font-extrabold text-white">Save font</Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}
