import React, { useEffect } from "react";
import { View, Text, StatusBar } from "react-native";
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

// Single solid brand deep-blue. Kept in sync with app.json's splash
// backgroundColor so the native splash and this React splash share
// the exact same canvas — no color flash on JS mount.
const SPLASH_BG = "#0a3d8f";

export default function SplashScreen({ navigation }: any) {
  const imageScale = useSharedValue(0.92);
  const imageOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslate = useSharedValue(6);
  const fadeOutOpacity = useSharedValue(1);

  const dot1 = useSharedValue(0.4);
  const dot2 = useSharedValue(0.4);
  const dot3 = useSharedValue(0.4);

  useEffect(() => {
    let cancelled = false;

    imageOpacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    imageScale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    taglineOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    taglineTranslate.value = withDelay(
      400,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );

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

    const minHold = new Promise((r) => setTimeout(r, MIN_DISPLAY_MS));
    const ready = IsLoggedIn();

    Promise.all([minHold, ready]).then(([, isLoggedIn]) => {
      if (cancelled) return;
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
    <Animated.View
      style={[{ flex: 1, backgroundColor: SPLASH_BG }, containerStyle]}
    >
      <StatusBar barStyle="light-content" backgroundColor={SPLASH_BG} />

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={imageStyle}>
          <AppImage
            source={LOGO}
            contentFit="contain"
            style={{ width: 180, height: 180 }}
          />
        </Animated.View>

        <Animated.View
          style={[
            taglineStyle,
            { marginTop: 24, alignItems: "center", paddingHorizontal: 32 },
          ]}
        >
          <Text
            style={{
              color: "white",
              fontSize: 30,
              letterSpacing: -0.8,
              lineHeight: 36,
              textAlign: "center",
              fontFamily: "PlusJakartaSans_800ExtraBold",
            }}
          >
            Built for sellers.
          </Text>
        </Animated.View>
      </View>

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
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: "rgba(255,255,255,0.85)",
              },
              s,
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}
