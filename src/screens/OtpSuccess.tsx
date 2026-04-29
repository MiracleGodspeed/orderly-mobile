import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type IoniconName = keyof typeof Ionicons.glyphMap;

const NEXT_STEPS: Array<{
  icon: IoniconName;
  tint: string;
  iconColor: string;
  title: string;
  desc: string;
}> = [
  {
    icon: "storefront-outline",
    tint: "#dbeafe",
    iconColor: "#2563eb",
    title: "Tell us about your business",
    desc: "Name, what you sell, and a quick description.",
  },
  {
    icon: "pricetags-outline",
    tint: "#ede9fe",
    iconColor: "#7c3aed",
    title: "Pick your categories",
    desc: "Help customers discover what you offer.",
  },
  {
    icon: "rocket-outline",
    tint: "#d1fae5",
    iconColor: "#059669",
    title: "Go live in minutes",
    desc: "Your storefront will be ready to share right away.",
  },
];

export default function OtpSuccess() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { width } = Dimensions.get("window");

  // Spring-in for the badge
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(12)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const [bursts, setBursts] = useState<number[]>([]);

  useEffect(() => {
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
    }

    Animated.parallel([
      Animated.spring(badgeScale, {
        toValue: 1,
        damping: 10,
        stiffness: 120,
        useNativeDriver: true,
      }),
      Animated.timing(badgeOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: 500,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    let count = 0;
    const maxBursts = 3;
    const interval = setInterval(() => {
      setBursts((p) => [...p, Date.now() + Math.random()]);
      count += 1;
      if (count >= maxBursts) clearInterval(interval);
    }, 700);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View className="flex-1 px-6 pt-10 items-center">
        {/* Animated check badge */}
        <Animated.View
          style={{
            transform: [{ scale: badgeScale }],
            opacity: badgeOpacity,
          }}
        >
          <View
            className="w-24 h-24 rounded-full bg-emerald-50 items-center justify-center border-2 border-emerald-100 mb-6"
            style={{
              shadowColor: "#059669",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <View className="w-16 h-16 rounded-full bg-emerald-500 items-center justify-center">
              <Ionicons name="checkmark" size={36} color="white" />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ translateY: titleY }],
            opacity: titleOpacity,
            alignItems: "center",
          }}
        >
          <Text
            className="text-gray-900 text-center"
            style={{
              fontFamily: "PlusJakartaSans_700Bold",
              fontSize: 28,
              letterSpacing: -0.6,
              lineHeight: 34,
            }}
          >
            You're verified
          </Text>
          <Text className="text-gray-500 text-[15px] mt-2 text-center leading-[22px] px-3">
            Welcome to Orderly. Let's get your store ready in 3 quick steps.
          </Text>
        </Animated.View>

        {/* Next-step preview */}
        <View className="w-full mt-8">
          {NEXT_STEPS.map((s, idx) => (
            <View
              key={s.title}
              className="flex-row items-center bg-white border border-gray-100 rounded-2xl p-3.5 mb-2.5"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View
                className="w-11 h-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: s.tint }}
              >
                <Ionicons name={s.icon} size={20} color={s.iconColor} />
              </View>
              <View className="flex-1 ml-3 pr-2">
                <View className="flex-row items-center gap-2 mb-0.5">
                  <Text
                    className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[1px]"
                  >
                    Step {idx + 1}
                  </Text>
                </View>
                <Text
                  className="text-gray-900 text-[14px]"
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    letterSpacing: -0.2,
                  }}
                >
                  {s.title}
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5">
                  {s.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA pinned to bottom */}
        <View className="w-full mt-auto pb-6">
          <Pressable
            onPress={() => {
              if (Platform.OS === "ios") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                  () => {}
                );
              }
              navigation.navigate("SetupStep1");
            }}
            className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2"
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-white font-bold text-[15px]">
              Set up my store
            </Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </Pressable>
        </View>

        {bursts.map((bKey) => (
          <ConfettiCannon
            key={String(bKey)}
            count={40}
            origin={{ x: width / 2, y: 0 }}
            fadeOut
            autoStart
            fallSpeed={3000}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
