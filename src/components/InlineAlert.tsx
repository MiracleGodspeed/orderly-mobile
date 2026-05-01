import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";

type Severity = "error" | "warning" | "info" | "success";

interface Props {
  visible: boolean;
  message: string;
  /** Optional bold headline above the message. */
  title?: string;
  /** Defaults to "error" — controls icon, tint, and accent colors. */
  severity?: Severity;
  /** When provided, renders a "✕" dismiss control. */
  onDismiss?: () => void;
  /** When provided, renders a primary CTA button inline with the alert. */
  action?: { label: string; onPress: () => void };
}

const TONE: Record<
  Severity,
  {
    bg: string;
    border: string;
    titleColor: string;
    bodyColor: string;
    iconBg: string;
    iconColor: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    accent: string;
    actionBg: string;
    actionText: string;
  }
> = {
  error: {
    bg: "#fff1f2",
    border: "#fecdd3",
    titleColor: "#9f1239",
    bodyColor: "#be123c",
    iconBg: "#fee2e2",
    iconColor: "#e11d48",
    icon: "alert-circle",
    accent: "#e11d48",
    actionBg: "#e11d48",
    actionText: "#ffffff",
  },
  warning: {
    bg: "#fffbeb",
    border: "#fde68a",
    titleColor: "#92400e",
    bodyColor: "#b45309",
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    icon: "warning",
    accent: "#d97706",
    actionBg: "#d97706",
    actionText: "#ffffff",
  },
  info: {
    bg: "#eff6ff",
    border: "#bfdbfe",
    titleColor: "#1e3a8a",
    bodyColor: "#1d4ed8",
    iconBg: "#dbeafe",
    iconColor: "#2563eb",
    icon: "information-circle",
    accent: "#2563eb",
    actionBg: "#2563eb",
    actionText: "#ffffff",
  },
  success: {
    bg: "#ecfdf5",
    border: "#a7f3d0",
    titleColor: "#065f46",
    bodyColor: "#047857",
    iconBg: "#d1fae5",
    iconColor: "#059669",
    icon: "checkmark-circle",
    accent: "#059669",
    actionBg: "#059669",
    actionText: "#ffffff",
  },
};

/**
 * Quality-grade inline alert for surfacing errors and notices INSIDE a
 * sheet / modal where the global toast can't be seen (RN Modal is a
 * separate native window). Designed to look at home in any of the
 * Orderly cards: tinted background, subtle border, icon disk, optional
 * dismiss + CTA. Animates in with a soft fade + slide.
 */
export function InlineAlert({
  visible,
  message,
  title,
  severity = "error",
  onDismiss,
  action,
}: Props) {
  const opacity = useSharedValue(0);
  const translate = useSharedValue(-6);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 220 : 140,
      easing: Easing.out(Easing.cubic),
    });
    translate.value = withTiming(visible ? 0 : -6, {
      duration: visible ? 240 : 140,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  if (!visible) return null;

  const tone = TONE[severity];

  return (
    <Animated.View
      style={[
        animStyle,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadowColor: tone.accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        },
      ]}
    >
      <View className="flex-row items-start">
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: tone.iconBg }}
        >
          <Ionicons name={tone.icon} size={18} color={tone.iconColor} />
        </View>
        <View className="flex-1 ml-3 mr-2">
          {title ? (
            <Text
              className="text-[14px] font-extrabold tracking-tight mb-0.5"
              style={{ color: tone.titleColor }}
            >
              {title}
            </Text>
          ) : null}
          <Text
            className="text-[12.5px] leading-[18px] font-semibold"
            style={{ color: tone.bodyColor }}
          >
            {message}
          </Text>

          {action ? (
            <View className="flex-row items-center mt-2.5">
              <Pressable
                onPress={action.onPress}
                className="h-9 px-3.5 rounded-xl items-center justify-center flex-row gap-1.5"
                style={{ backgroundColor: tone.actionBg }}
              >
                <Ionicons
                  name="arrow-forward-circle"
                  size={14}
                  color={tone.actionText}
                />
                <Text
                  className="text-[12.5px] font-extrabold"
                  style={{ color: tone.actionText }}
                >
                  {action.label}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            hitSlop={6}
            className="w-7 h-7 rounded-full items-center justify-center"
            style={{ backgroundColor: tone.iconBg }}
          >
            <Ionicons name="close" size={12} color={tone.iconColor} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
