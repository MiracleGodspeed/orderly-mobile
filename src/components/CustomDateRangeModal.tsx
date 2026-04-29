import React, { memo, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  initialFrom: Date;
  initialTo: Date;
  onApply: (from: Date, to: Date) => void;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

function CustomDateRangeModalImpl({
  visible,
  onClose,
  onBack,
  initialFrom,
  initialTo,
  onApply,
}: Props) {
  const [from, setFrom] = useState<Date>(initialFrom);
  const [to, setTo] = useState<Date>(initialTo);
  const [activePicker, setActivePicker] = useState<"from" | "to" | null>(null);

  // Re-seed when the parent passes a new range and the sheet reopens.
  useEffect(() => {
    if (visible) {
      setFrom(initialFrom);
      setTo(initialTo);
      setActivePicker(null);
    }
  }, [visible, initialFrom, initialTo]);

  const isValid = useMemo(() => from.getTime() <= to.getTime(), [from, to]);

  const handleApply = () => {
    if (!isValid) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onApply(from, to);
  };

  const openPicker = (which: "from" | "to") => {
    haptic();
    setActivePicker(which);
  };

  const closePicker = () => setActivePicker(null);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Custom range"
      subtitle="Pick a start and end date for your report"
      height="60%"
    >
      <View className="px-5 pt-4 flex-1">
        <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3">
          Date range
        </Text>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => openPicker("from")}
            className={`flex-1 rounded-2xl p-4 border ${
              activePicker === "from"
                ? "border-blue-500 bg-blue-50/40"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text className="text-[11px] font-extrabold text-gray-500 uppercase tracking-[1px]">
                From
              </Text>
            </View>
            <Text className="text-[15px] font-extrabold text-gray-900">
              {fmtDate(from)}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => openPicker("to")}
            className={`flex-1 rounded-2xl p-4 border ${
              activePicker === "to"
                ? "border-blue-500 bg-blue-50/40"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text className="text-[11px] font-extrabold text-gray-500 uppercase tracking-[1px]">
                To
              </Text>
            </View>
            <Text className="text-[15px] font-extrabold text-gray-900">
              {fmtDate(to)}
            </Text>
          </Pressable>
        </View>

        {!isValid && (
          <View className="flex-row items-center gap-1.5 mt-3">
            <Ionicons name="alert-circle" size={14} color="#dc2626" />
            <Text className="text-[12px] text-red-600 font-semibold">
              Start date must be before end date
            </Text>
          </View>
        )}

        {/* Inline iOS picker — same surface as the rest of the sheet, no popup-on-popup */}
        {Platform.OS === "ios" && activePicker && (
          <View className="mt-5 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
              <Text className="text-[12.5px] font-extrabold text-gray-700">
                {activePicker === "from" ? "Pick start date" : "Pick end date"}
              </Text>
              <Pressable onPress={closePicker} hitSlop={8}>
                <Text className="text-[13px] font-extrabold text-blue-600">
                  Done
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={activePicker === "from" ? from : to}
              mode="date"
              display="spinner"
              maximumDate={activePicker === "from" ? to : undefined}
              minimumDate={activePicker === "to" ? from : undefined}
              onChange={(_e, date) => {
                if (!date) return;
                if (activePicker === "from") setFrom(date);
                else setTo(date);
              }}
              textColor="#111827"
            />
          </View>
        )}

        {/* Android picker — fires native dialog, dismisses on selection */}
        {Platform.OS === "android" && activePicker && (
          <DateTimePicker
            value={activePicker === "from" ? from : to}
            mode="date"
            display="default"
            maximumDate={activePicker === "from" ? to : undefined}
            minimumDate={activePicker === "to" ? from : undefined}
            onChange={(_e, date) => {
              setActivePicker(null);
              if (date) {
                if (activePicker === "from") setFrom(date);
                else setTo(date);
              }
            }}
          />
        )}
      </View>

      <BottomSheetFooter
        onCancel={onBack}
        onSave={handleApply}
        cancelLabel="Back"
        saveLabel="Apply range"
        saveDisabled={!isValid}
      />
    </BottomSheet>
  );
}

export const CustomDateRangeModal = memo(CustomDateRangeModalImpl);
