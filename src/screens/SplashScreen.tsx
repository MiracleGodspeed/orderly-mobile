import React, { useEffect } from "react";
import { View, Text, StatusBar } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { IsLoggedIn } from "../../context/auth.storage";
import { AppImage } from "../components/AppImage";

const LOGO = require("../../assets/orderlySplash.png");

// Minimum time the splash stays on screen, even if everything resolves sooner.
// If readiness checks (auth, prefetch, etc.) take longer than this, the splash
// holds until they're done — there's no upper bound.
const MIN_DISPLAY_MS = 2500;
const FADE_OUT_MS = 450;

export default function SplashScreen({ navigation }: any) {
  const imageScale = useSharedValue(0.85);
  const imageOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslate = useSharedValue(8);
  const fadeOutOpacity = useSharedValue(1);

  // Pulse loader values
  const dot1 = useSharedValue(0.4);
  const dot2 = useSharedValue(0.4);
  const dot3 = useSharedValue(0.4);

  useEffect(() => {
    let cancelled = false;

    // Logo entrance — single, smooth, no bounce
    imageOpacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    imageScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    // Tagline reveal slightly after the logo
    taglineOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    taglineTranslate.value = withDelay(
      400,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );

    // Pulsing dot loader, staggered
    const pulse = (sv: typeof dot1, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
            withTiming(0.35, { duration: 500, easing: Easing.in(Easing.cubic) })
          ),
          -1,
          false
        )
      );
    };
    pulse(dot1, 600);
    pulse(dot2, 800);
    pulse(dot3, 1000);

    // Wait for both: the entrance animation to play out, and the auth check to resolve.
    // This way we never flash past the splash, and we never strand the user on it either.
    const minHold = new Promise((r) => setTimeout(r, MIN_DISPLAY_MS));
    const ready = IsLoggedIn();

    Promise.all([minHold, ready]).then(([, isLoggedIn]) => {
      if (cancelled) return;
      // Trigger fade out, then navigate after the fade completes
      fadeOutOpacity.value = withTiming(0, { duration: FADE_OUT_MS });
      setTimeout(() => {
        if (cancelled) return;
        if (isLoggedIn) navigation.replace("Home");
        else navigation.replace("Onboarding");
      }, FADE_OUT_MS);
    });

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeOutOpacity.value,
  }));
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
    opacity: imageOpacity.value,
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslate.value }],
  }));
  const dot1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <Animated.View style={[{ flex: 1 }, containerStyle]}>
      <StatusBar barStyle="light-content" backgroundColor="#0d2a6e" />

      {/* Brand gradient — deep indigo into Orderly blue */}
      <LinearGradient
        colors={["#0d2a6e", "#194eb8", "#2c6cd1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Decorative soft circles for depth — same language as the web hero */}
        <View
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: "35%",
            left: -40,
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        />

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Animated.View
            style={[
              imageStyle,
              {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 18 },
                shadowOpacity: 0.3,
                shadowRadius: 28,
                elevation: 14,
              },
            ]}
          >
            <AppImage
              source={LOGO}
              contentFit="contain"
              style={{ width: 210, height: 210 }}
            />
          </Animated.View>

          <Animated.View style={[taglineStyle, { marginTop: 24, alignItems: "center" }]}>
            {/* <Text
              style={{
                color: "white",
                fontSize: 28,
                fontWeight: "800",
                letterSpacing: -0.5,
                fontFamily: "PlusJakartaSans_800ExtraBold",
              }}
            >
              Orderly
            </Text> */}
            <Text
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 14,
                fontWeight: "500",
                marginTop: 6,
                letterSpacing: 0.2,
              }}
            >
              Sell anything, beautifully.
            </Text>
          </Animated.View>
        </View>

        {/* Pulsing dot loader at the bottom */}
        <View
          style={{
            position: "absolute",
            bottom: 70,
            left: 0,
            right: 0,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {[dot1Style, dot2Style, dot3Style].map((s, i) => (
            <Animated.View
              key={i}
              style={[
                {
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "white",
                },
                s,
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
