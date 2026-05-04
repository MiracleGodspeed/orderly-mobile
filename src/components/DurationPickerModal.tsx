import React, { memo } from "react";
import { View, Text, Pressable, Platform, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "./BottomSheet";
import { RangeKey } from "../lib/dateRanges";

type IoniconName = keyof typeof Ionicons.glyphMap;
type PresetKey = Exclude<RangeKey, "custom">;

interface Preset {
  key: PresetKey;
  label: string;
  hint: string;
  icon: IoniconName;
  tint: string;
  iconColor: string;
}

const PRESETS: Preset[] = [
  {
    key: "today",
    label: "Today",
    hint: "Sales since midnight",
    icon: "today-outline",
    tint: "#fef3c7",
    iconColor: "#d97706",
  },
  {
    key: "yesterday",
    label: "Yesterday",
    hint: "Full calendar day before today",
    icon: "moon-outline",
    tint: "#fee2e2",
    iconColor: "#e11d48",
  },
  {
    key: "thismonth",
    label: "This month",
    hint: "1st of this month through today",
    icon: "calendar-number-outline",
    tint: "#cffafe",
    iconColor: "#0891b2",
  },
  {
    key: "lastweek",
    label: "Last week",
    hint: "Monday through Sunday last week",
    icon: "calendar-outline",
    tint: "#dbeafe",
    iconColor: "#2563eb",
  },
  {
    key: "lastmonth",
    label: "Last month",
    hint: "Full calendar month before this one",
    icon: "calendar-clear-outline",
    tint: "#ede9fe",
    iconColor: "#7c3aed",
  },
  {
    key: "lastyear",
    label: "Last year",
    hint: "Year-over-year context",
    icon: "trending-up-outline",
    tint: "#dcfce7",
    iconColor: "#059669",
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The preset currently in effect, or `"custom"` when a custom range
   *  is active. Used purely for the radio-style highlight. */
  selectedKey: RangeKey | undefined;
  onSelect: (key: PresetKey, label: string) => void;
  onSelectCustom: () => void;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

function DurationPickerModalImpl({
  visible,
  onClose,
  selectedKey,
  onSelect,
  onSelectCustom,
}: Props) {
  const isCustomSelected = selectedKey === "custom";

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Select duration"
      subtitle="Pick a window for your sales report"
      height="78%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
      >
        <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mt-4 mb-3">
          Presets
        </Text>

        {PRESETS.map((preset) => {
          const isSelected = selectedKey === preset.key;
          return (
            <Pressable
              key={preset.key}
              onPress={() => {
                haptic();
                onSelect(preset.key, preset.label);
              }}
              className={`flex-row items-center rounded-2xl border p-4 mb-2.5 active:bg-gray-50 ${
                isSelected
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-gray-100 bg-white"
              }`}
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isSelected ? 0 : 0.03,
                shadowRadius: 4,
                elevation: isSelected ? 0 : 1,
              }}
            >
              <View
                className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                style={{
                  backgroundColor: isSelected ? "#dbeafe" : preset.tint,
                }}
              >
                <Ionicons
                  name={preset.icon}
                  size={20}
                  color={isSelected ? "#2563eb" : preset.iconColor}
                />
              </View>

              <View className="flex-1 pr-2">
                <Text
                  className={`text-[14.5px] font-extrabold mb-0.5 ${
                    isSelected ? "text-blue-700" : "text-gray-900"
                  }`}
                >
                  {preset.label}
                </Text>
                <Text className="text-[12px] text-gray-500" numberOfLines={1}>
                  {preset.hint}
                </Text>
              </View>

              {isSelected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#2563eb"
                />
              ) : (
                <View className="w-5 h-5 rounded-full border-2 border-gray-200" />
              )}
            </Pressable>
          );
        })}

        {/* Divider */}
        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-gray-100" />
          <Text className="mx-3 text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.5px]">
            Or
          </Text>
          <View className="flex-1 h-px bg-gray-100" />
        </View>

        {/* Custom range */}
        <Pressable
          onPress={() => {
            haptic();
            onSelectCustom();
          }}
          className={`flex-row items-center rounded-2xl border p-4 active:bg-gray-50 ${
            isCustomSelected
              ? "border-blue-500 bg-blue-50/50"
              : "border-gray-100 bg-white"
          }`}
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isCustomSelected ? 0 : 0.03,
            shadowRadius: 4,
            elevation: isCustomSelected ? 0 : 1,
          }}
        >
          <View
            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: isCustomSelected ? "#dbeafe" : "#f1f5f9" }}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={isCustomSelected ? "#2563eb" : "#475569"}
            />
          </View>
          <View className="flex-1 pr-2">
            <Text
              className={`text-[14.5px] font-extrabold mb-0.5 ${
                isCustomSelected ? "text-blue-700" : "text-gray-900"
              }`}
            >
              Custom range
            </Text>
            <Text className="text-[12px] text-gray-500" numberOfLines={1}>
              Pick exact start and end dates
            </Text>
          </View>
          <View className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center">
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </View>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}

export const DurationPickerModal = memo(DurationPickerModalImpl);
