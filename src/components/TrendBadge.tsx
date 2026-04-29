import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type Trend = { percent: number; direction: "up" | "down" | "flat" };

interface Props {
  trend: Trend;
  label?: string;
  size?: "sm" | "md";
}

export function TrendBadge({ trend, label = "vs prev", size = "sm" }: Props) {
  const { direction, percent } = trend;
  const color =
    direction === "up"
      ? { bg: "bg-green-50", border: "border-green-100", text: "text-green-700", icon: "#15803d" }
      : direction === "down"
      ? { bg: "bg-red-50", border: "border-red-100", text: "text-red-700", icon: "#b91c1c" }
      : { bg: "bg-gray-100", border: "border-gray-200", text: "text-gray-600", icon: "#6b7280" };

  const arrow =
    direction === "up"
      ? "arrow-up"
      : direction === "down"
      ? "arrow-down"
      : "remove";

  const fontClass = size === "sm" ? "text-[10px]" : "text-[12px]";
  const padding = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";

  return (
    <View
      className={`flex-row items-center gap-1 rounded-full border ${color.bg} ${color.border} ${padding}`}
    >
      <Ionicons name={arrow as any} size={size === "sm" ? 10 : 12} color={color.icon} />
      <Text className={`${fontClass} font-bold ${color.text}`}>
        {percent.toFixed(1)}%
      </Text>
      <Text className={`${fontClass} ${color.text} opacity-70`}>{label}</Text>
    </View>
  );
}
