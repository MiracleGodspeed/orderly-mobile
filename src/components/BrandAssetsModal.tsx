import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import ColorPicker, {
  Panel1,
  HueSlider,
  Preview,
} from "reanimated-color-picker";
import { runOnJS } from "react-native-reanimated";
import { useVendor } from "../../context/VendorContext";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialPrimary?: string | null;
  initialSecondary?: string | null;
  initialAccent?: string | null;
}

type SlotKey = "primary" | "secondary" | "accent";

const DEFAULTS: Record<SlotKey, string> = {
  primary: "#2563EB",
  secondary: "#0F172A",
  accent: "#F97316",
};

const SLOT_META: Record<
  SlotKey,
  { label: string; description: string }
> = {
  primary: {
    label: "Primary",
    description: "Buttons, links, key call-to-actions",
  },
  secondary: {
    label: "Secondary",
    description: "Headers, supporting elements",
  },
  accent: {
    label: "Accent",
    description: "Highlights, badges, emphasis",
  },
};

/**
 * Curated brand-friendly palette — the kind of restrained colors that
 * print well, sit on top of imagery, and look serious in marketing.
 */
const PRESET_COLORS = [
  "#0F172A", // ink
  "#1E40AF", // deep blue
  "#2563EB", // blue
  "#0EA5E9", // sky
  "#0D9488", // teal
  "#059669", // emerald
  "#166534", // forest
  "#CA8A04", // amber
  "#F97316", // coral
  "#DC2626", // red
  "#E11D48", // rose
  "#DB2777", // pink
  "#9333EA", // purple
  "#7C3AED", // violet
  "#475569", // slate
  "#FFFFFF", // white
];

const isLightColor = (hex: string): boolean => {
  // Quick luminance check so we know whether to draw white or dark glyphs on top.
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7;
};

function ColorSwatch({
  color,
  selected,
  onPress,
  size = 44,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
  size?: number;
}) {
  const light = isLightColor(color);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: light ? 1 : 0,
        borderColor: "#e5e7eb",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected && (
        <Ionicons
          name="checkmark"
          size={20}
          color={light ? "#0f172a" : "white"}
        />
      )}
    </Pressable>
  );
}

// "No color" tile — clears the active slot so a null is sent to the
// backend. Looks visually distinct from the curated swatches (dashed
// border + ban glyph) so vendors don't confuse it for an actual color.
function NoneSwatch({
  selected,
  onPress,
  size = 44,
}: {
  selected: boolean;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "white",
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? "#2563eb" : "#cbd5e1",
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={selected ? "checkmark" : "ban-outline"}
        size={selected ? 20 : 18}
        color={selected ? "#2563eb" : "#94a3b8"}
      />
    </Pressable>
  );
}

export default function BrandAssetsModal({
  visible,
  onClose,
  initialPrimary,
  initialSecondary,
  initialAccent,
}: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();

  // null === "vendor cleared this slot" — the backend stores it as NULL
  // and the storefront falls back to its template default. Hex string ===
  // explicitly chosen (preset or custom).
  const [colors, setColors] = useState<Record<SlotKey, string | null>>({
    primary: null,
    secondary: null,
    accent: null,
  });
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>("primary");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDraft, setCustomDraft] = useState<string>(DEFAULTS.primary);
  // Tracks whether the ColorPicker has laid out so we can swap a brief
  // loader out for the live controls (no "blank screen" anxiety on slow
  // devices).
  const [pickerReady, setPickerReady] = useState(false);
  const pickerReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mount the picker shortly after the parent sheet opens so its rainbow
  // gradient + Reanimated worklets initialize *before* the user taps Custom.
  // Result: tapping Custom is just an opacity flip — instant on next open.
  const [pickerMounted, setPickerMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      // Empty/missing strings hydrate as null (cleared) so the UI shows
      // the "Not set" state instead of a default-blue swatch that looks
      // chosen but isn't actually saved.
      setColors({
        primary: initialPrimary || null,
        secondary: initialSecondary || null,
        accent: initialAccent || null,
      });
      setSelectedSlot("primary");
    }
  }, [visible, initialPrimary, initialSecondary, initialAccent]);

  // Pre-mount the picker overlay 250ms after the sheet opens so the
  // heavy gradient + worklet setup happens during a quiet moment instead
  // of when the user is waiting on a tap. Unmount when sheet closes so
  // we free the resources.
  useEffect(() => {
    if (!visible) {
      setPickerMounted(false);
      setShowCustomPicker(false);
      setPickerReady(false);
      return;
    }
    const t = setTimeout(() => setPickerMounted(true), 250);
    return () => clearTimeout(t);
  }, [visible]);

  const activeColor = colors[selectedSlot]; // string | null
  // Visual fallback for the live preview / slot swatches. Vendors who
  // clear a slot still need *something* to look at; the storefront
  // applies the same default when the backing column is null.
  const activeColorDisplay = activeColor ?? DEFAULTS[selectedSlot];

  const isPresetSelected = useMemo(
    () =>
      activeColor != null &&
      PRESET_COLORS.some((c) => c.toLowerCase() === activeColor.toLowerCase()),
    [activeColor]
  );

  const handlePickPreset = (color: string) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setColors((prev) => ({ ...prev, [selectedSlot]: color.toUpperCase() }));
  };

  const handleClearActiveSlot = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setColors((prev) => ({ ...prev, [selectedSlot]: null }));
  };

  const handleSelectSlot = (slot: SlotKey) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setSelectedSlot(slot);
  };

  const openCustomPicker = () => {
    // Custom picker always starts from a real hex; if the slot is
    // currently cleared, seed the picker with the slot's default.
    setCustomDraft(activeColorDisplay);
    // If the picker has already laid out (it usually has by now thanks to the
    // 250ms pre-mount), reveal immediately. Otherwise show the loader and
    // let `handlePickerLaidOut` flip readiness when layout completes.
    if (!pickerReady) {
      if (pickerReadyTimerRef.current) clearTimeout(pickerReadyTimerRef.current);
      pickerReadyTimerRef.current = setTimeout(() => setPickerReady(true), 1200);
    }
    setShowCustomPicker(true);
  };

  useEffect(() => {
    return () => {
      if (pickerReadyTimerRef.current) clearTimeout(pickerReadyTimerRef.current);
    };
  }, []);

  const handlePickerLaidOut = () => {
    if (pickerReadyTimerRef.current) {
      clearTimeout(pickerReadyTimerRef.current);
      pickerReadyTimerRef.current = null;
    }
    // One frame after layout to give children a tick to paint, then reveal.
    requestAnimationFrame(() => setPickerReady(true));
  };

  // Plain JS handler invoked from the worklet via `runOnJS`.
  const applyDraft = (hex: string) => {
    setCustomDraft(hex.toUpperCase());
  };

  // The lib calls this on the UI thread (worklet context). We must declare
  // it as a worklet and bridge to JS explicitly with runOnJS, otherwise
  // Reanimated throws "tried to synchronously call a non-worklet function".
  const handleCustomChange = (color: { hex: string }) => {
    "worklet";
    runOnJS(applyDraft)(color.hex);
  };

  const handleCustomConfirm = () => {
    setColors((prev) => ({ ...prev, [selectedSlot]: customDraft.toUpperCase() }));
    setShowCustomPicker(false);
  };

  const handleSave = async () => {
    if (!storeData) return;
    try {
      await updateVendorSettings({
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
        accentColor: colors.accent,
      });
      onClose();
    } catch (e) {
      console.error("Failed to save brand assets:", e);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Brand Assets"
      subtitle="Pick the colors that define your store's identity"
      height="88%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Live preview — always renders with a fallback when a slot is
            cleared, so the vendor sees what the storefront will look
            like (template defaults kick in on the storefront side too). */}
        {(() => {
          const displayPrimary = colors.primary ?? DEFAULTS.primary;
          const displaySecondary = colors.secondary ?? DEFAULTS.secondary;
          const displayAccent = colors.accent ?? DEFAULTS.accent;
          return (
            <View className="mx-5 mt-4 mb-5 rounded-3xl overflow-hidden border border-gray-100">
              <View
                className="px-5 pt-6 pb-8"
                style={{ backgroundColor: displayPrimary }}
              >
                <Text
                  className="text-[10px] font-bold tracking-[2px] mb-2"
                  style={{ color: isLightColor(displayPrimary) ? "#475569" : "rgba(255,255,255,0.75)" }}
                >
                  PREVIEW
                </Text>
                <Text
                  className="text-[22px] font-extrabold tracking-tight"
                  style={{ color: isLightColor(displayPrimary) ? "#0f172a" : "white" }}
                >
                  Your storefront vibe
                </Text>
                <View className="flex-row items-center gap-2 mt-4">
                  <View
                    className="px-3.5 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: displayAccent }}
                  >
                    <Text
                      className="text-[12px] font-bold"
                      style={{ color: isLightColor(displayAccent) ? "#0f172a" : "white" }}
                    >
                      Shop now
                    </Text>
                  </View>
                  <View
                    className="px-3.5 h-9 rounded-full items-center justify-center border"
                    style={{
                      borderColor: isLightColor(displayPrimary) ? "#0f172a" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    <Text
                      className="text-[12px] font-bold"
                      style={{ color: isLightColor(displayPrimary) ? "#0f172a" : "white" }}
                    >
                      Learn more
                    </Text>
                  </View>
                </View>
              </View>
              <View
                className="flex-row items-center px-5 py-3"
                style={{ backgroundColor: displaySecondary }}
              >
                <View
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: displayAccent }}
                />
                <Text
                  className="text-[11px] font-semibold"
                  style={{ color: isLightColor(displaySecondary) ? "#0f172a" : "white" }}
                >
                  Secondary surface — headers, footers
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Slot selector */}
        <View className="px-5 mb-4">
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-3">
            Color Roles
          </Text>
          <View className="gap-2">
            {(Object.keys(SLOT_META) as SlotKey[]).map((slot) => {
              const isActive = selectedSlot === slot;
              const slotColor = colors[slot]; // string | null
              const isCleared = slotColor == null;
              return (
                <Pressable
                  key={slot}
                  onPress={() => handleSelectSlot(slot)}
                  className={`flex-row items-center px-3.5 py-3 rounded-2xl border ${
                    isActive
                      ? "border-blue-500 bg-blue-50/40"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  {/* Show a real swatch when set; an empty dashed tile
                      with a "ban" glyph when cleared. */}
                  {isCleared ? (
                    <View
                      className="w-10 h-10 rounded-xl mr-3 items-center justify-center bg-white"
                      style={{
                        borderWidth: 1.5,
                        borderColor: "#cbd5e1",
                        borderStyle: "dashed",
                      }}
                    >
                      <Ionicons name="ban-outline" size={16} color="#94a3b8" />
                    </View>
                  ) : (
                    <View
                      className="w-10 h-10 rounded-xl mr-3 border border-gray-100"
                      style={{ backgroundColor: slotColor as string }}
                    />
                  )}
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-gray-900">
                      {SLOT_META[slot].label}
                    </Text>
                    <Text className="text-[11.5px] text-gray-500 leading-[16px]">
                      {SLOT_META[slot].description}
                    </Text>
                  </View>
                  <Text
                    className={`text-[11px] ml-2 ${
                      isCleared
                        ? "italic text-gray-400"
                        : "font-mono text-gray-500"
                    }`}
                  >
                    {isCleared ? "Not set" : (slotColor as string).toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Curated palette */}
        <View className="px-5 mb-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px]">
              Curated palette
            </Text>
            <Text className="text-[11px] text-gray-400">
              Editing {SLOT_META[selectedSlot].label}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {/* "No color" tile — clears the slot. Sits first so vendors
                discover it before scanning the curated colors. */}
            <NoneSwatch
              selected={activeColor == null}
              onPress={handleClearActiveSlot}
            />

            {PRESET_COLORS.map((c) => (
              <ColorSwatch
                key={c}
                color={c}
                selected={
                  activeColor != null &&
                  c.toLowerCase() === activeColor.toLowerCase()
                }
                onPress={() => handlePickPreset(c)}
              />
            ))}

            {/* Custom tile */}
            <Pressable
              onPress={openCustomPicker}
              className="w-11 h-11 rounded-full items-center justify-center border-2 border-dashed border-gray-300 bg-white active:bg-gray-50"
            >
              <Ionicons name="color-palette-outline" size={18} color="#6b7280" />
            </Pressable>
          </View>

          {/* "Custom · #HEX" pill — only when the active slot has a hex
              that's NOT in the curated palette. Hidden when cleared. */}
          {activeColor != null && !isPresetSelected && (
            <Pressable
              onPress={openCustomPicker}
              className="flex-row items-center gap-2 mt-4 self-start bg-gray-100 px-3 py-2 rounded-full"
            >
              <View
                className="w-3.5 h-3.5 rounded-full border border-gray-300"
                style={{ backgroundColor: activeColor }}
              />
              <Text className="text-[12px] font-semibold text-gray-700">
                Custom · {activeColor.toUpperCase()}
              </Text>
              <Ionicons name="create-outline" size={14} color="#374151" />
            </Pressable>
          )}

          {/* Confirmation hint when the slot is cleared, so vendors
              know what's actually saved. */}
          {activeColor == null && (
            <View className="flex-row items-center gap-2 mt-4 self-start bg-gray-50 border border-gray-100 px-3 py-2 rounded-full">
              <Ionicons name="information-circle-outline" size={13} color="#94a3b8" />
              <Text className="text-[11.5px] text-gray-500">
                {SLOT_META[selectedSlot].label} cleared — your storefront will use the template default
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheetFooter
        onCancel={onClose}
        onSave={handleSave}
        loading={loading}
      />

      {/* Custom color picker overlay — pre-mounted (warmed up) and always
          rendered while the sheet is open. We toggle visibility via opacity
          + pointerEvents so opening it is just a visibility flip, not a
          fresh mount. HueSlider's onLayout has already fired by the time
          the user taps Custom, so the rainbow gradient is ready. */}
      {pickerMounted && (
        <View
          className="absolute inset-0"
          pointerEvents={showCustomPicker ? "auto" : "none"}
          style={{
            zIndex: 100,
            elevation: 100,
            opacity: showCustomPicker ? 1 : 0,
          }}
        >
          <Pressable
            className="absolute inset-0 bg-black/60"
            onPress={() => setShowCustomPicker(false)}
          />
          <View className="flex-1 justify-center px-6 pointer-events-box-none">
            <View
              className="bg-white rounded-3xl overflow-hidden"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.25,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-[16px] font-extrabold text-gray-900">
                    Pick a custom color
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5">
                    Editing {SLOT_META[selectedSlot].label}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowCustomPicker(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                  hitSlop={6}
                >
                  <Ionicons name="close" size={18} color="#374151" />
                </Pressable>
              </View>

              <View className="px-5 pb-4">
                {/* Wrap the picker so we can dim it + show a loader until
                    its onLayout has fired (HueSlider needs a width measurement
                    to paint its rainbow gradient). */}
                <View
                  onLayout={handlePickerLaidOut}
                  style={{ minHeight: 280, opacity: pickerReady ? 1 : 0 }}
                >
                  <ColorPicker
                    value={customDraft}
                    onChange={handleCustomChange}
                    onComplete={handleCustomChange}
                    style={{ gap: 16 }}
                  >
                    <Preview
                      hideInitialColor
                      hideText
                      style={{ height: 44, borderRadius: 12 }}
                    />
                    <Panel1 style={{ borderRadius: 16 }} />
                    <HueSlider style={{ borderRadius: 999 }} />
                  </ColorPicker>
                </View>

                {!pickerReady && (
                  <View
                    className="absolute inset-0 items-center justify-center"
                    pointerEvents="none"
                  >
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text className="text-[12px] text-gray-500 mt-2">
                      Preparing color picker…
                    </Text>
                  </View>
                )}

                <View className="flex-row items-center justify-between mt-5 mb-2">
                  <Text className="text-[12px] text-gray-500">Selected</Text>
                  <View className="flex-row items-center gap-2">
                    <View
                      className="w-7 h-7 rounded-full border border-gray-200"
                      style={{ backgroundColor: customDraft }}
                    />
                    <Text className="text-[13px] font-mono font-semibold text-gray-900">
                      {customDraft.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center px-5 pb-5 pt-2 gap-3">
                <Pressable
                  onPress={() => setShowCustomPicker(false)}
                  className="flex-1 h-12 rounded-2xl border border-gray-200 items-center justify-center"
                >
                  <Text className="text-gray-900 font-semibold text-[15px]">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCustomConfirm}
                  className="flex-1 h-12 rounded-2xl bg-blue-600 items-center justify-center"
                >
                  <Text className="text-white font-bold text-[15px]">
                    Use this color
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}
