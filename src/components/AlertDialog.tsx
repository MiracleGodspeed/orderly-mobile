import { useEffect } from "react";
import { Modal, View, Text, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

type Severity = "error" | "warning" | "info" | "success";

interface ActionConfig {
  label: string;
  onPress: () => void;
  /** When true the action button takes the primary, tinted style. Only
   *  one action should be primary; the other is rendered as a subtle
   *  secondary. */
  primary?: boolean;
  /** Optional leading icon. */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}

interface Props {
  visible: boolean;
  /** Tap-to-dismiss handler — also fired on backdrop press. */
  onClose: () => void;
  /** Bold headline above the message. */
  title: string;
  /** Body copy. */
  message: string;
  /** Defaults to "error" — drives icon + accent color. */
  severity?: Severity;
  /** Primary CTA. Always rendered if provided. */
  primaryAction?: ActionConfig;
  /** Optional secondary action (rendered next to primary). */
  secondaryAction?: ActionConfig;
}

const TONE: Record<
  Severity,
  {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    iconColor: string;
    accent: string; // ribbon, primary action, eyebrow
    halo: string; // outer halo color (accent at 0.08–0.12 opacity)
    haloMid: string; // middle halo (accent at 0.16 opacity)
    iconBg: string; // inner disk
    title: string;
    eyebrow: string;
  }
> = {
  error: {
    icon: "alert-circle",
    iconColor: "#e11d48",
    accent: "#e11d48",
    halo: "rgba(225, 29, 72, 0.10)",
    haloMid: "rgba(225, 29, 72, 0.18)",
    iconBg: "#fee2e2",
    title: "#0f172a",
    eyebrow: "#9f1239",
  },
  warning: {
    icon: "warning",
    iconColor: "#d97706",
    accent: "#d97706",
    halo: "rgba(217, 119, 6, 0.10)",
    haloMid: "rgba(217, 119, 6, 0.18)",
    iconBg: "#fef3c7",
    title: "#0f172a",
    eyebrow: "#92400e",
  },
  info: {
    icon: "information-circle",
    iconColor: "#2563eb",
    accent: "#2563eb",
    halo: "rgba(37, 99, 235, 0.10)",
    haloMid: "rgba(37, 99, 235, 0.18)",
    iconBg: "#dbeafe",
    title: "#0f172a",
    eyebrow: "#1e3a8a",
  },
  success: {
    icon: "checkmark-circle",
    iconColor: "#059669",
    accent: "#059669",
    halo: "rgba(5, 150, 105, 0.10)",
    haloMid: "rgba(5, 150, 105, 0.18)",
    iconBg: "#d1fae5",
    title: "#0f172a",
    eyebrow: "#065f46",
  },
};

const EYEBROW: Record<Severity, string> = {
  error: "Something went wrong",
  warning: "Heads up",
  info: "FYI",
  success: "Done",
};

const haptic = (severity: Severity) => {
  if (Platform.OS !== "ios") return;
  const map: Record<Severity, Haptics.NotificationFeedbackType> = {
    error: Haptics.NotificationFeedbackType.Error,
    warning: Haptics.NotificationFeedbackType.Warning,
    info: Haptics.NotificationFeedbackType.Success,
    success: Haptics.NotificationFeedbackType.Success,
  };
  Haptics.notificationAsync(map[severity]).catch(() => {});
};

/**
 * Premium centered alert dialog. Renders ABOVE other modals (RN supports
 * nested Modals), so this is safe inside page-sheet flows where toasts
 * get covered.
 *
 * Visual design:
 *  - Thin accent ribbon along the top edge of the card.
 *  - Halo'd icon (3 concentric circles in the accent color) for depth.
 *  - Tiered typography: eyebrow → title → body.
 *  - Snappy scale-in with slight overshoot.
 */
export function AlertDialog({
  visible,
  onClose,
  title,
  message,
  severity = "error",
  primaryAction,
  secondaryAction,
}: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  // Halo ring scales up from the icon and fades — runs once each time
  // the dialog opens for a subtle confirmation pulse.
  const haloScale = useSharedValue(0.6);
  const haloOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
      // Snappy scale-in with a tiny overshoot — settles at 1 cleanly.
      scale.value = withSequence(
        withTiming(1.02, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
        })
      );
      // Halo ping — fades in as it grows, then fades out. Fires shortly
      // after the card lands so the eye catches it.
      haloOpacity.value = withDelay(
        180,
        withSequence(
          withTiming(1, { duration: 240 }),
          withTiming(0, { duration: 540 })
        )
      );
      haloScale.value = withDelay(
        180,
        withTiming(1.4, { duration: 780, easing: Easing.out(Easing.cubic) })
      );
      haptic(severity);
    } else {
      opacity.value = withTiming(0, { duration: 130 });
      scale.value = withTiming(0.94, { duration: 130 });
      haloOpacity.value = 0;
      haloScale.value = 0.6;
    }
  }, [visible, severity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value * 0.4,
    transform: [{ scale: haloScale.value }],
  }));

  const tone = TONE[severity];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: "rgba(8, 11, 22, 0.62)",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          },
          backdropStyle,
        ]}
      >
        {/* Backdrop press = dismiss. */}
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <Animated.View
          style={[
            cardStyle,
            {
              width: "100%",
              maxWidth: 420,
              backgroundColor: "white",
              borderRadius: 32,
              overflow: "hidden",
              shadowColor: tone.accent,
              shadowOffset: { width: 0, height: 24 },
              shadowOpacity: 0.22,
              shadowRadius: 40,
              elevation: 16,
            },
          ]}
        >
          {/* Severity-tinted ribbon along the top edge — quiet but
              instantly readable from across the screen. */}
          <View
            style={{
              height: 4,
              backgroundColor: tone.accent,
            }}
          />

          <View style={{ paddingHorizontal: 28, paddingTop: 28, paddingBottom: 4 }}>
            {/* Halo'd icon. Three concentric circles for depth — the
                outermost has a one-shot ping animation on open. */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 20,
                position: "relative",
              }}
            >
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: tone.accent,
                    top: 0,
                  },
                  haloStyle,
                ]}
                pointerEvents="none"
              />
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: tone.halo,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 39,
                    backgroundColor: tone.haloMid,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: tone.iconBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={tone.icon}
                      size={30}
                      color={tone.iconColor}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Eyebrow — small, tracked, severity-tinted. */}
            <Text
              style={{
                color: tone.eyebrow,
                fontSize: 10.5,
                fontWeight: "800",
                letterSpacing: 1.6,
                textTransform: "uppercase",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {EYEBROW[severity]}
            </Text>

            {/* Title */}
            <Text
              style={{
                color: tone.title,
                fontSize: 20,
                fontWeight: "800",
                letterSpacing: -0.4,
                lineHeight: 25,
                textAlign: "center",
              }}
            >
              {title}
            </Text>

            {/* Message */}
            <Text
              style={{
                color: "#475569",
                fontSize: 13.5,
                lineHeight: 20,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {message}
            </Text>
          </View>

          {(primaryAction || secondaryAction) && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 18,
                borderTopWidth: 1,
                borderTopColor: "#f1f5f9",
                marginTop: 22,
                flexDirection: "row",
                gap: 8,
              }}
            >
              {secondaryAction ? (
                <Pressable
                  onPress={secondaryAction.onPress}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    backgroundColor: "white",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                  }}
                >
                  {secondaryAction.icon ? (
                    <Ionicons
                      name={secondaryAction.icon}
                      size={14}
                      color="#374151"
                    />
                  ) : null}
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: "#374151",
                    }}
                  >
                    {secondaryAction.label}
                  </Text>
                </Pressable>
              ) : null}
              {primaryAction ? (
                <Pressable
                  onPress={primaryAction.onPress}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: tone.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                    shadowColor: tone.accent,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.32,
                    shadowRadius: 12,
                    elevation: 4,
                  }}
                >
                  {primaryAction.icon ? (
                    <Ionicons
                      name={primaryAction.icon}
                      size={14}
                      color="white"
                    />
                  ) : null}
                  <Text
                    style={{ fontSize: 14, fontWeight: "800", color: "white" }}
                  >
                    {primaryAction.label}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
