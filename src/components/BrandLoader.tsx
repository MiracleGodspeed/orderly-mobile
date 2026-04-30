import React, { useEffect } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import { AppImage } from "./AppImage";

const LOGO = require("../../assets/orderly-logo-main.png");

interface Props {
  /** When true, fades in the overlay and starts the logo pulse. */
  visible: boolean;
  /** Optional caption shown under the logo. Defaults to "Loading". */
  label?: string;
}

/**
 * Brand-aware loading overlay. Renders a soft translucent backdrop over the
 * current screen with the Orderly mark in a card, gently breathing. Use it
 * for short-lived background refreshes (period toggles, silent revalidation
 * of cached data) where a skeleton would feel heavier than necessary.
 *
 * Always-mounted with opacity 0 when hidden — the overlay fades in/out
 * smoothly without remounting children, and `pointerEvents="none"` while
 * hidden means it never steals taps.
 */
export function BrandLoader({ visible, label = "Loading" }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 700,
            easing: Easing.inOut(Easing.cubic),
          }),
          withTiming(1, {
            duration: 700,
            easing: Easing.inOut(Easing.cubic),
          })
        ),
        -1,
        false
      );
    } else {
      opacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.in(Easing.cubic),
      });
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [visible, opacity, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[StyleSheet.absoluteFill, styles.backdrop, containerStyle]}
    >
      <Animated.View style={[styles.card, logoStyle]}>
        <AppImage
          source={LOGO}
          contentFit="contain"
          style={{ width: 58, height: 58 }}
        />
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(248, 250, 252, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  card: {
    width: 86,
    height: 86,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 12,
  },
  label: {
    marginTop: 16,
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
