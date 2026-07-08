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
import {
  getAuthFromStorage,
  getPendingVerification,
} from "../../context/auth.storage";
import { isRole, isUserStatus } from "../lib/authStatus";
import { AppImage } from "../components/AppImage";

const ROLE_STAFF = 6;
const STATUS_PENDING_ONBOARDING = 2;

type BootDestination = {
  route: "Home" | "SetupStep1" | "Onboarding" | "OtpVerification";
  params?: Record<string, unknown>;
};

/**
 * Decide where a returning user lands on cold boot. Mirrors the Login
 * screen's routeAfterLogin + the web AdminShell gate: a vendor whose
 * onboarding never finished (UserStatus still PendingOnboarding) must
 * resume setup, NOT land on a placeholder dashboard. Staff never own a
 * store, so they always go Home.
 *
 * Special case: someone who signed up but never verified their email has
 * NO token yet. Rather than dropping them at Onboarding (losing the
 * signup), we resume the OTP screen — this is what survives the app
 * being killed mid-verification. Email is restored from storage; the
 * password isn't needed to verify or resend a code.
 */
async function resolveBootRoute(): Promise<BootDestination> {
  const { token, user } = await getAuthFromStorage();
  if (!token || !user?.id) {
    const pendingEmail = await getPendingVerification();
    if (pendingEmail) {
      return {
        route: "OtpVerification",
        params: { email: pendingEmail, password: "" },
      };
    }
    return { route: "Onboarding" };
  }
  if (isRole(user.role, ROLE_STAFF)) return { route: "Home" };
  if (isUserStatus(user.userStatus, STATUS_PENDING_ONBOARDING)) {
    return { route: "SetupStep1" };
  }
  return { route: "Home" };
}

const LOGO = require("../../assets/orderlySplash.png");

// The native splash (configured in app.json) already shows the same
// logo on the same background. This React splash is just a brief
// continuation while we resolve auth state, so it MUST mount at the
// exact same visual state — no entrance animation, no logo growing
// in, no tagline sliding up. Anything else reads as a "remount" to
// the user even though the JS layer is just taking over from native.
//
// The only animation we keep is the fade-out to the destination
// screen, since that's a real transition the user expects.
//
// MIN_DISPLAY_MS guarantees a minimum on-screen time. Without this
// the splash can flash past in <100ms on a warm JS bundle (hot
// reload, background→foreground), which feels jarring even though
// it's technically fast.
const MIN_DISPLAY_MS = 2000;
const FADE_OUT_MS = 350;

const SPLASH_BG = "#0a3d8f";

export default function SplashScreen({ navigation }: any) {
  const fadeOutOpacity = useSharedValue(1);

  const dot1 = useSharedValue(0.4);
  const dot2 = useSharedValue(0.4);
  const dot3 = useSharedValue(0.4);

  useEffect(() => {
    let cancelled = false;

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
    pulse(dot1, 0);
    pulse(dot2, 150);
    pulse(dot3, 300);

    // Wait for both: the minimum display time AND the auth check.
    // Whichever finishes last determines when we transition off.
    const minHold = new Promise<void>((r) => setTimeout(r, MIN_DISPLAY_MS));
    const ready = resolveBootRoute();
    Promise.all([minHold, ready]).then(([, dest]) => {
      if (cancelled) return;
      fadeOutOpacity.value = withTiming(0, { duration: FADE_OUT_MS });
      setTimeout(() => {
        if (cancelled) return;
        navigation.replace(dest.route, dest.params);
      }, FADE_OUT_MS);
    });

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeOutOpacity.value,
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
        <AppImage
          source={LOGO}
          contentFit="contain"
          style={{ width: 180, height: 180 }}
        />

        {/* <View
          style={{
            marginTop: 24,
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
         
          <Text
            style={{
              color: "white",
              fontSize: 20,
              letterSpacing: -0.8,
              lineHeight: 36,
              textAlign: "center",
              fontFamily: "PlusJakartaSans_800ExtraBold",
            }}
          >
            Business, made orderly
          </Text>
        </View> */}
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
