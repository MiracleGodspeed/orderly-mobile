import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";

export type AppToastTone = "success" | "error" | "info";

interface Props {
  visible: boolean;
  /** Headline shown bold on top, e.g. "Saved" or "Couldn't sign in". */
  title: string;
  /** Optional secondary line shown smaller — usually the value or
   *  detail message so the vendor can confirm at a glance. */
  subtitle?: string;
  /** Visual tone — drives the icon + accent colour. Default `success`. */
  tone?: AppToastTone;
  /** Called once the pill has fully faded out so the parent can flip
   *  its `visible` flag back to false without flickering. */
  onHide: () => void;
  /** Time the pill stays fully visible before fading out (ms). Default
   *  1500 for success, 2400 for error (errors need more reading time). */
  duration?: number;
}

const TONE_MAP: Record<
  AppToastTone,
  {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    iconBg: string;
    shadow: string;
  }
> = {
  success: {
    icon: "checkmark",
    iconBg: "#10b981",
    shadow: "#10b981",
  },
  error: {
    icon: "close",
    iconBg: "#e11d48",
    shadow: "#e11d48",
  },
  info: {
    icon: "information",
    iconBg: "#2563eb",
    shadow: "#2563eb",
  },
};

/**
 * Premium little notification pill — slides down from the safe-area top,
 * springs in, holds, then fades out. Designed to land cleanly on the
 * first call (we control the animation lifecycle directly instead of
 * relying on a toast-library queue, which sometimes swallowed the first
 * show on cold-start screens).
 *
 * Usage:
 *   const [toast, setToast] = useState<{
 *     title: string; subtitle?: string; tone?: AppToastTone
 *   } | null>(null);
 *   ...
 *   <AppToast
 *     visible={toast != null}
 *     title={toast?.title ?? ""}
 *     subtitle={toast?.subtitle}
 *     tone={toast?.tone}
 *     onHide={() => setToast(null)}
 *   />
 */
export function AppToast({
  visible,
  title,
  subtitle,
  tone = "success",
  onHide,
  duration,
}: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  const meta = TONE_MAP[tone];
  const holdMs = duration ?? (tone === "error" ? 2400 : 1500);

  useEffect(() => {
    if (visible) {
      // Cancel any in-flight animation so a second call re-plays cleanly
      // instead of stacking with the previous fade-out.
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      translateY.value = -60;
      opacity.value = 0;

      translateY.value = withSpring(0, { damping: 16, stiffness: 220 });
      opacity.value = withSequence(
        withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withDelay(
          holdMs,
          withTiming(
            0,
            { duration: 220, easing: Easing.in(Easing.cubic) },
            (finished) => {
              if (finished) runOnJS(onHide)();
            }
          )
        )
      );
      // Slide back up in tandem with the fade-out so the exit feels
      // intentional rather than a static fade.
      translateY.value = withSequence(
        withSpring(0, { damping: 16, stiffness: 220 }),
        withDelay(holdMs + 80, withTiming(-12, { duration: 220 }))
      );
    }
  }, [visible, holdMs, onHide, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        { paddingTop: insets.top + 8 },
        animatedStyle,
      ]}
    >
      <Pressable onPress={onHide} style={styles.pill}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: meta.iconBg, shadowColor: meta.shadow },
          ]}
        >
          <Ionicons name={meta.icon} size={14} color="#ffffff" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.06)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
    maxWidth: "92%",
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  textWrap: {
    flexShrink: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 1,
    fontWeight: "500",
  },
});
