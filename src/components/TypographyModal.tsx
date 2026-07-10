import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { useState, useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Font from "expo-font";
import { useVendor } from "../../context/VendorContext";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";

// Preview typefaces — one display weight per family, loaded lazily the first
// time the sheet opens (see effect below) so the vendor sees each font's real
// shapes. Subpath imports pull only the single 600 weight, not every weight.
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Quicksand_600SemiBold } from "@expo-google-fonts/quicksand/600SemiBold";
import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk/600SemiBold";
import { Raleway_600SemiBold } from "@expo-google-fonts/raleway/600SemiBold";
import { Jost_600SemiBold } from "@expo-google-fonts/jost/600SemiBold";
import { Barlow_600SemiBold } from "@expo-google-fonts/barlow/600SemiBold";
import { Marhey_600SemiBold } from "@expo-google-fonts/marhey/600SemiBold";
import { PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display/600SemiBold";
import { RobotoSlab_600SemiBold } from "@expo-google-fonts/roboto-slab/600SemiBold";
import { CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond/600SemiBold";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Storefront typography picker. Mirrors the curated list in the web's
 * `storefront/store-fonts.ts` — `key`s MUST stay in sync (they're what
 * the storefront maps to actual font files). The storefront itself is
 * web, so this screen only records the choice in
 * `storeFrontJson.fontFamily`; the store then renders with it for
 * every customer, on every device.
 *
 * Each option is a live specimen: the name and a sample line render in
 * the font's own typeface so the vendor can judge the look before saving.
 */

// The KEY of each entry doubles as the fontFamily name once loaded — the
// value is the .ttf module handed to Font.loadAsync.
const PREVIEW_MODULES: Record<string, number> = {
  Poppins_600SemiBold,
  Quicksand_600SemiBold,
  SpaceGrotesk_600SemiBold,
  Raleway_600SemiBold,
  Jost_600SemiBold,
  Barlow_600SemiBold,
  Marhey_600SemiBold,
  PlayfairDisplay_600SemiBold,
  RobotoSlab_600SemiBold,
  CormorantGaramond_600SemiBold,
};

interface StoreFont {
  key: string;
  label: string;
  vibe: string;
  /** fontFamily name registered via Font.loadAsync (matches PREVIEW_MODULES). */
  font: string;
  serif: boolean;
}

const STORE_FONTS: StoreFont[] = [
  { key: "poppins", label: "Poppins", vibe: "Rounded & warm", font: "Poppins_600SemiBold", serif: false },
  { key: "quicksand", label: "Quicksand", vibe: "Soft & friendly", font: "Quicksand_600SemiBold", serif: false },
  { key: "raleway", label: "Raleway", vibe: "Elegant & light", font: "Raleway_600SemiBold", serif: false },
  { key: "jost", label: "Jost", vibe: "Fashion-forward", font: "Jost_600SemiBold", serif: false },
   { key: "cormorant", label: "Cormorant Garamond", vibe: "Luxury boutique", font: "CormorantGaramond_600SemiBold", serif: true },
  { key: "barlow", label: "Barlow", vibe: "Bold & confident", font: "Barlow_600SemiBold", serif: false },
  { key: "playfair", label: "Playfair Display", vibe: "Editorial serif", font: "PlayfairDisplay_600SemiBold", serif: true },
  { key: "roboto-slab", label: "Roboto Slab", vibe: "Sturdy slab serif", font: "RobotoSlab_600SemiBold", serif: true },
    { key: "marhey", label: "Marhey", vibe: "Playful & fun", font: "Marhey_600SemiBold", serif: false },
      { key: "space-grotesk", label: "Space Grotesk", vibe: "Modern & premium", font: "SpaceGrotesk_600SemiBold", serif: false },
 
];

const SAMPLE_LINE = "Handcrafted with love · 2026";

export default function TypographyModal({ visible, onClose }: Props) {
  const { updateVendorSettings, storeData } = useVendor();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  // Shown after a successful save to explain the propagation delay before the
  // vendor navigates to their storefront and worries it "didn't apply".
  const [showApplyNotice, setShowApplyNotice] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected((storeData as any)?.storeFrontJson?.fontFamily ?? null);
    }
  }, [visible, storeData]);

  // Reset the notice ONLY on an open/close transition — not when `storeData`
  // changes. (Saving updates storeData, so keying this on it would wipe the
  // notice the instant the save lands.)
  useEffect(() => {
    if (visible) setShowApplyNotice(false);
  }, [visible]);

  // Load the preview typefaces the first time the sheet is opened. Cheap and
  // idempotent — Font.loadAsync no-ops on already-registered families.
  useEffect(() => {
    if (!visible || fontsReady) return;
    let cancelled = false;
    Font.loadAsync(PREVIEW_MODULES)
      .then(() => {
        if (!cancelled) setFontsReady(true);
      })
      .catch((e) => console.warn("Failed to load preview fonts:", e));
    return () => {
      cancelled = true;
    };
  }, [visible, fontsReady]);

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
      // Close the sheet and raise the centered notice as its own top-level
      // modal, so only one modal is on screen (no nested/stacked modals).
      onClose();
      setShowApplyNotice(true);
    } catch (e) {
      console.error("Failed to save typography:", e);
    } finally {
      setSaving(false);
    }
  };

  const dismissNotice = () => setShowApplyNotice(false);

  const CheckDot = ({ active }: { active: boolean }) =>
    active ? (
      <Ionicons name="checkmark-circle" size={24} color="#0080ff" />
    ) : (
      <View className="w-6 h-6 rounded-full border-2 border-gray-200" />
    );

  const CategoryChip = ({ label }: { label: string }) => (
    <View className="rounded-full bg-gray-100 px-2.5 py-1">
      <Text className="text-[10px] font-bold tracking-[0.06em] text-gray-500 uppercase">
        {label}
      </Text>
    </View>
  );

  return (
    <>
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Typography"
      subtitle="The font your whole storefront uses"
      height="90%"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[12.5px] leading-5 text-gray-500 mb-4">
          Applies to headings, product names and buttons across your store, on
          every device your customers use. Tap a specimen to preview it.
        </Text>

        {/* Template default — no specific font */}
        <Pressable
          onPress={() => setSelected(null)}
          className={`flex-row items-center rounded-2xl border px-4 py-4 mb-3 ${
            selected == null ? "border-[#0080ff] bg-blue-50/60" : "border-gray-200 bg-white"
          }`}
        >
          <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mr-3.5">
            <Text className="text-[20px] font-extrabold text-gray-400">Aa</Text>
          </View>
          <View className="flex-1 pr-3">
            <Text className="text-[16px] font-bold text-gray-900">Template default</Text>
            <Text className="text-[12.5px] text-gray-500 mt-0.5">
              Each template's own paired typography
            </Text>
          </View>
          <CheckDot active={selected == null} />
        </Pressable>

        <View className="flex-row items-center gap-3 my-1.5">
          <View className="flex-1 h-px bg-gray-100" />
          <Text className="text-[10.5px] font-bold tracking-[0.12em] text-gray-400 uppercase">
            Font library
          </Text>
          <View className="flex-1 h-px bg-gray-100" />
        </View>

        {STORE_FONTS.map((f) => {
          const active = selected === f.key;
          const previewFont = fontsReady ? f.font : undefined;
          return (
            <Pressable
              key={f.key}
              onPress={() => setSelected(f.key)}
              className={`rounded-2xl border px-4 py-4 mt-3 ${
                active ? "border-[#0080ff] bg-blue-50/60" : "border-gray-200 bg-white"
              }`}
            >
              <View className="flex-row items-start justify-between">
                {/* Name rendered in its own typeface — the live preview. */}
                <Text
                  className="flex-1 pr-3 text-gray-900"
                  style={{ fontFamily: previewFont, fontSize: 23, lineHeight: 30 }}
                >
                  {f.label}
                </Text>
                <CheckDot active={active} />
              </View>

              {/* Sample line, also in the font, to show numerals & lowercase. */}
              <Text
                className="text-gray-500 mt-1.5"
                style={{ fontFamily: previewFont, fontSize: 15, lineHeight: 22 }}
              >
                {SAMPLE_LINE}
              </Text>

              <View className="flex-row items-center gap-2 mt-3">
                <CategoryChip label={f.serif ? "Serif" : "Sans" } />
                <Text className="text-[12px] text-gray-400">{f.vibe}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <BottomSheetFooter
        onCancel={onClose}
        onSave={handleSave}
        loading={saving}
        saveLabel="Save font"
      />
    </BottomSheet>

      {/* Post-save notice — centered, top-level, on its own dark backdrop so
          it reads as a clean confirmation rather than part of the sheet. */}
      <Modal
        visible={showApplyNotice}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismissNotice}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-8">
          <View className="w-full max-w-[360px] bg-white rounded-3xl px-6 pt-7 pb-6 items-center">
            <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#0080ff" />
            </View>
            <Text className="text-[19px] font-extrabold text-gray-900 text-center">
              Font saved
            </Text>
            <Text className="text-[13.5px] leading-[21px] text-gray-500 text-center mt-2">
              Your new typography is applying now. It can take{" "}
              <Text className="font-bold text-gray-700">5–10 seconds</Text> to
              show across your storefront. If you don't see it right away, give
              it a moment and refresh the page — it's on its way.
            </Text>
            <Pressable
              onPress={dismissNotice}
              className="mt-6 w-full h-12 rounded-2xl bg-[#0080ff] items-center justify-center active:opacity-90"
            >
              <Text className="text-white font-bold text-[15px]">Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
