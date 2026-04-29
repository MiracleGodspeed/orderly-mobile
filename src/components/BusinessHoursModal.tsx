import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  ScrollView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { WorkingHours } from "../../context/VendorContext";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialHours?: WorkingHours[] | null;
  onSave: (hours: WorkingHours[]) => void;
}

const DEFAULT_HOURS: WorkingHours[] = [
  { day: "Monday", isOpen: true, openTime: "09:00 am", closeTime: "05:00 pm" },
  { day: "Tuesday", isOpen: true, openTime: "09:00 am", closeTime: "05:00 pm" },
  {
    day: "Wednesday",
    isOpen: true,
    openTime: "09:00 am",
    closeTime: "05:00 pm",
  },
  {
    day: "Thursday",
    isOpen: true,
    openTime: "09:00 am",
    closeTime: "05:00 pm",
  },
  { day: "Friday", isOpen: true, openTime: "09:00 am", closeTime: "05:00 pm" },
  {
    day: "Saturday",
    isOpen: true,
    openTime: "10:00 am",
    closeTime: "04:00 pm",
  },
  { day: "Sunday", isOpen: false, openTime: "10:00 am", closeTime: "04:00 pm" },
];

const WEEKDAYS = new Set([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
]);

const SHORT_DAY: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

const DAY_INDEX = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Parse "09:00 am" → Date with that time today. Tolerates "9:00 AM" too. */
function parseTime(timeStr: string): Date {
  const date = new Date();
  if (!timeStr) return date;

  const [time, period] = timeStr.trim().split(/\s+/);
  if (!time) return date;

  const parts = time.split(":").map(Number);
  let hh = parts[0] ?? 9;
  const mm = parts[1] ?? 0;

  const lower = (period ?? "").toLowerCase();
  if (lower === "pm" && hh !== 12) hh += 12;
  if (lower === "am" && hh === 12) hh = 0;

  date.setHours(hh, mm, 0, 0);
  return date;
}

/** Format Date → "09:00 am" — matches backend storage convention. */
function formatTime(date: Date): string {
  let hh = date.getHours();
  const mm = date.getMinutes();
  const ampm = hh >= 12 ? "pm" : "am";

  hh = hh % 12 || 12;
  const hStr = hh < 10 ? `0${hh}` : `${hh}`;
  const mStr = mm < 10 ? `0${mm}` : `${mm}`;
  return `${hStr}:${mStr} ${ampm}`;
}

/**
 * Normalize the local camelCase hours to the exact PascalCase shape the
 * backend's WorkingHoursModel DTO declares. ASP.NET Core's default JSON
 * binding is case-insensitive, but pinning the casing avoids any surprise
 * if that default ever changes.
 */
function serializeForApi(hours: WorkingHours[]): WorkingHours[] {
  return hours.map((h) => ({
    day: h.day,
    isOpen: !!h.isOpen,
    openTime: h.openTime || "09:00 am",
    closeTime: h.closeTime || "05:00 pm",
  }));
}

interface DayRowProps {
  item: WorkingHours;
  index: number;
  isToday: boolean;
  canCopy: boolean;
  onToggle: (index: number) => void;
  onPickTime: (index: number, field: "openTime" | "closeTime") => void;
  onCopyToAll: (index: number) => void;
}

function DayRow({
  item,
  index,
  isToday,
  canCopy,
  onToggle,
  onPickTime,
  onCopyToAll,
}: DayRowProps) {
  return (
    <View
      className={`bg-white rounded-2xl px-4 py-3.5 mb-2.5 border ${
        item.isOpen
          ? isToday
            ? "border-blue-400"
            : "border-gray-100"
          : "border-gray-100"
      }`}
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              item.isOpen ? "bg-blue-50" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-[11px] font-extrabold tracking-wider ${
                item.isOpen ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {SHORT_DAY[item.day] ?? item.day.slice(0, 3)}
            </Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`text-[14px] font-bold ${
                  item.isOpen ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {item.day}
              </Text>
              {isToday && (
                <View className="bg-blue-100 px-1.5 py-0.5 rounded-full">
                  <Text className="text-[9px] font-extrabold text-blue-700 tracking-wide">
                    TODAY
                  </Text>
                </View>
              )}
            </View>
            {!item.isOpen ? (
              <Text className="text-[11px] text-gray-400 mt-0.5">Closed</Text>
            ) : (
              <Text className="text-[11px] text-gray-500 mt-0.5">
                {item.openTime} – {item.closeTime}
              </Text>
            )}
          </View>
        </View>

        <Switch
          value={item.isOpen}
          onValueChange={() => onToggle(index)}
          trackColor={{ false: "#e5e7eb", true: "#2563eb" }}
          thumbColor="#ffffff"
          ios_backgroundColor="#e5e7eb"
        />
      </View>

      {item.isOpen && (
        <View className="mt-3">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => onPickTime(index, "openTime")}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 active:bg-gray-100"
            >
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-[1px] mb-0.5">
                Open
              </Text>
              <Text className="text-[14px] font-bold text-gray-900">
                {item.openTime}
              </Text>
            </Pressable>

            <View className="w-3 h-px bg-gray-200" />

            <Pressable
              onPress={() => onPickTime(index, "closeTime")}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 active:bg-gray-100"
            >
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-[1px] mb-0.5">
                Close
              </Text>
              <Text className="text-[14px] font-bold text-gray-900">
                {item.closeTime}
              </Text>
            </Pressable>
          </View>

          {canCopy && (
            <Pressable
              onPress={() => onCopyToAll(index)}
              className="self-start flex-row items-center gap-1.5 mt-2.5 px-2 py-1 rounded-full active:bg-gray-100"
              hitSlop={4}
            >
              <Ionicons name="copy-outline" size={12} color="#6b7280" />
              <Text className="text-[11px] font-semibold text-gray-600">
                Copy to all open days
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function BusinessHoursModal({
  visible,
  onClose,
  initialHours,
  onSave,
}: Props) {
  const [hours, setHours] = useState<WorkingHours[]>(DEFAULT_HOURS);

  const [showPicker, setShowPicker] = useState(false);
  const [currentEdit, setCurrentEdit] = useState<{
    index: number;
    field: "openTime" | "closeTime";
  } | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  useEffect(() => {
    if (visible) {
      if (initialHours && initialHours.length > 0) {
        const merged = DEFAULT_HOURS.map((d) => {
          const found = initialHours.find((h) => h.day === d.day);
          return found ? { ...d, ...found } : d;
        });
        setHours(merged);
      } else {
        setHours(DEFAULT_HOURS);
      }
    }
  }, [visible, initialHours]);

  const haptic = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const todayName = useMemo(() => DAY_INDEX[new Date().getDay()], []);
  const todayHours = useMemo(
    () => hours.find((h) => h.day === todayName),
    [hours, todayName]
  );
  const openDays = useMemo(() => hours.filter((h) => h.isOpen), [hours]);
  const openCount = openDays.length;

  const toggleDay = (index: number) => {
    haptic();
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, isOpen: !h.isOpen } : h))
    );
  };

  const openPicker = (index: number, field: "openTime" | "closeTime") => {
    haptic();
    setTempDate(parseTime(hours[index][field]));
    setCurrentEdit({ index, field });
    setShowPicker(true);
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (selectedDate && currentEdit) {
      const formatted = formatTime(selectedDate);
      setHours((prev) =>
        prev.map((h, i) =>
          i === currentEdit.index ? { ...h, [currentEdit.field]: formatted } : h
        )
      );
      if (Platform.OS === "ios") setTempDate(selectedDate);
      else setCurrentEdit(null);
    } else if (Platform.OS === "android") {
      setCurrentEdit(null);
    }
  };

  const copyToAll = (index: number) => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    }
    const source = hours[index];
    setHours((prev) =>
      prev.map((h) =>
        h.isOpen
          ? { ...h, openTime: source.openTime, closeTime: source.closeTime }
          : h
      )
    );
  };

  // Quick presets ----------------------------------------------------------

  const applyWeekdaysNineToFive = () => {
    haptic();
    setHours((prev) =>
      prev.map((h) => ({
        ...h,
        isOpen: WEEKDAYS.has(h.day),
        openTime: WEEKDAYS.has(h.day) ? "09:00 am" : h.openTime,
        closeTime: WEEKDAYS.has(h.day) ? "05:00 pm" : h.closeTime,
      }))
    );
  };

  const applyAllDaysSame = () => {
    haptic();
    const template =
      hours.find((h) => h.isOpen) ?? {
        openTime: "09:00 am",
        closeTime: "05:00 pm",
      };
    setHours((prev) =>
      prev.map((h) => ({
        ...h,
        isOpen: true,
        openTime: template.openTime,
        closeTime: template.closeTime,
      }))
    );
  };

  const closeAll = () => {
    haptic();
    setHours((prev) => prev.map((h) => ({ ...h, isOpen: false })));
  };

  const handleSave = () => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    }
    const payload = serializeForApi(hours);
    if (__DEV__) {
      console.log("[BusinessHoursModal] saving workingDaysHours:", payload);
    }
    onSave(payload);
    onClose();
  };

  // Build a one-line human summary for the hero ("Mon–Fri · 9 AM – 5 PM")
  const summary = useMemo(() => {
    if (openCount === 0) return "Closed all week";
    const allSameTimes = openDays.every(
      (d) =>
        d.openTime === openDays[0].openTime &&
        d.closeTime === openDays[0].closeTime
    );
    if (allSameTimes && openCount === 7) {
      return `Every day · ${openDays[0].openTime} – ${openDays[0].closeTime}`;
    }
    if (allSameTimes) {
      return `${openCount} days · ${openDays[0].openTime} – ${openDays[0].closeTime}`;
    }
    return `${openCount} day${openCount === 1 ? "" : "s"} open · varied hours`;
  }, [openCount, openDays]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Business Hours"
      subtitle="What customers see on your storefront"
      height="92%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        {/* Today hero */}
        <View
          className="mt-4 mb-4 bg-white rounded-3xl px-5 py-4 border border-gray-100"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className={`w-12 h-12 rounded-2xl items-center justify-center ${
                todayHours?.isOpen ? "bg-emerald-50" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name={todayHours?.isOpen ? "sunny-outline" : "moon-outline"}
                size={22}
                color={todayHours?.isOpen ? "#059669" : "#6b7280"}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px]">
                {todayName} · Today
              </Text>
              <Text className="text-[15px] font-extrabold text-gray-900 mt-0.5">
                {todayHours?.isOpen
                  ? `Open ${todayHours.openTime} – ${todayHours.closeTime}`
                  : "Closed today"}
              </Text>
            </View>
          </View>

          <View className="h-px bg-gray-100 my-3" />

          <Text className="text-[12px] text-gray-500">{summary}</Text>
        </View>

        {/* Quick presets */}
        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2">
          Quick Setup
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          <Pressable
            onPress={applyWeekdaysNineToFive}
            className="flex-row items-center gap-2 bg-blue-50 border border-blue-100 px-3.5 h-10 rounded-full active:bg-blue-100"
          >
            <Ionicons name="briefcase-outline" size={14} color="#2563eb" />
            <Text className="text-[12.5px] font-bold text-blue-700">
              Mon–Fri · 9 to 5
            </Text>
          </Pressable>
          <Pressable
            onPress={applyAllDaysSame}
            className="flex-row items-center gap-2 bg-emerald-50 border border-emerald-100 px-3.5 h-10 rounded-full active:bg-emerald-100"
          >
            <Ionicons name="copy-outline" size={14} color="#059669" />
            <Text className="text-[12.5px] font-bold text-emerald-700">
              Same all week
            </Text>
          </Pressable>
          <Pressable
            onPress={closeAll}
            className="flex-row items-center gap-2 bg-gray-100 border border-gray-200 px-3.5 h-10 rounded-full active:bg-gray-200"
          >
            <Ionicons name="moon-outline" size={14} color="#475569" />
            <Text className="text-[12.5px] font-bold text-gray-700">
              Close all
            </Text>
          </Pressable>
        </View>

        {/* Day rows */}
        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2">
          Per-day Hours
        </Text>
        {hours.map((item, index) => (
          <DayRow
            key={item.day}
            item={item}
            index={index}
            isToday={item.day === todayName}
            canCopy={openCount > 1 && item.isOpen}
            onToggle={toggleDay}
            onPickTime={openPicker}
            onCopyToAll={copyToAll}
          />
        ))}

        <View className="bg-amber-50/60 border border-amber-100 rounded-2xl px-4 py-3 flex-row items-start gap-3 mt-2">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#d97706"
          />
          <Text className="text-[12px] text-amber-800 leading-[18px] flex-1">
            Tap a time to edit. Customers will see exactly these hours on your
            storefront.
          </Text>
        </View>
      </ScrollView>

      <BottomSheetFooter
        onCancel={onClose}
        onSave={handleSave}
        saveLabel="Save Hours"
      />

      {/* iOS time picker overlay */}
      {showPicker && Platform.OS === "ios" && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-8 rounded-t-3xl z-50"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
          }}
        >
          <View className="items-center pt-2">
            <View className="w-10 h-[5px] bg-gray-200 rounded-full" />
          </View>
          <View className="flex-row justify-between items-center px-5 pt-3 pb-2">
            <View>
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-[1.2px]">
                {currentEdit !== null && hours[currentEdit.index]?.day}
              </Text>
              <Text className="text-[15px] font-extrabold text-gray-900 mt-0.5">
                {currentEdit?.field === "openTime"
                  ? "Opens at"
                  : "Closes at"}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowPicker(false)}
              className="px-4 h-9 rounded-full bg-blue-600 items-center justify-center"
            >
              <Text className="text-white font-bold text-[13px]">Done</Text>
            </Pressable>
          </View>
          <View className="items-center justify-center py-2">
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="spinner"
              onChange={onTimeChange}
              textColor="black"
              minuteInterval={15}
            />
          </View>
        </View>
      )}

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={onTimeChange}
          minuteInterval={15}
        />
      )}
    </BottomSheet>
  );
}
