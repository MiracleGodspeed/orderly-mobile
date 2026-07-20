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
  Linking,
  Clipboard,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
// RouteProp from @react-navigation/native fails to resolve under this
// repo's TS setup (see ProductsList/Customers) — derive the route type
// from the native-stack package, which resolves cleanly.
type StoreLiveRoute = NativeStackScreenProps<RootStackParamList, "StoreLive">["route"];

const ROOT_DOMAIN = "orderlystores.com";

/**
 * Post-onboarding celebration — the moment the vendor's website goes
 * live. SetupStep3 resets the stack to [Home, StoreLive] so this sits
 * on top of the dashboard; dismissing it (back gesture or "Later")
 * lands on Home. The single primary CTA drives the one action that
 * turns a signup into an active store: adding the first product.
 */
export default function StoreLive() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const route = useRoute<StoreLiveRoute>();
  const { width } = Dimensions.get("window");

  const storeName = route.params?.storeName ?? null;
  const slug = route.params?.slug ?? null;
  const display = slug ? `${slug}.${ROOT_DOMAIN}` : null;
  const url = slug ? `https://${slug}.${ROOT_DOMAIN}` : null;

  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(12)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;

  const [bursts, setBursts] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (!url) return;
    Clipboard.setString(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleViewStore = () => {
    if (!url) return;
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    Linking.openURL(url).catch(() => {});
  };

  const handleAddProduct = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    navigation.replace("ProductsList", { openAddProduct: true });
  };

  const handleLater = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View className="flex-1 px-6 pt-12 items-center">
        {/* Animated rocket badge */}
        <Animated.View
          style={{
            transform: [{ scale: badgeScale }],
            opacity: badgeOpacity,
          }}
        >
          <View
            className="w-24 h-24 rounded-full bg-blue-50 items-center justify-center border-2 border-blue-100 mb-6"
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <View className="w-16 h-16 rounded-full bg-blue-600 items-center justify-center">
              <Ionicons name="rocket" size={32} color="white" />
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
            {storeName ? `${storeName} is live!` : "Your website is live!"}
          </Text>
          <Text className="text-gray-500 text-[15px] mt-2 text-center leading-[22px] px-3">
            You just launched a real online store. Anyone can visit it right
            now.
          </Text>
        </Animated.View>

        {/* Store URL pill — tap to copy */}
        {display && (
          <View className="flex-row items-center mt-6" style={{ gap: 6 }}>
            <Pressable
              onPress={handleCopy}
              className="flex-row items-center bg-blue-50 border border-blue-100 rounded-full px-4 py-2 active:opacity-70"
              style={{ gap: 6 }}
            >
              <Ionicons name="globe-outline" size={14} color="#3b82f6" />
              <Text
                className="text-blue-700 text-[13.5px]"
                style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                numberOfLines={1}
              >
                {display}
              </Text>
              <Ionicons name="copy-outline" size={13} color="#93c5fd" />
            </Pressable>
            {copied && (
              <View className="bg-emerald-50 rounded-full px-2 py-1">
                <Text className="text-emerald-700 text-[10px] font-extrabold uppercase tracking-wide">
                  Copied
                </Text>
              </View>
            )}
          </View>
        )}

        {/* CTAs pinned to bottom */}
        <View className="w-full mt-auto pb-6" style={{ gap: 10 }}>
          <Pressable
            onPress={handleAddProduct}
            className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row"
            style={{
              gap: 8,
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-white font-bold text-[15px]">
              Add your first product
            </Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </Pressable>

          {url && (
            <Pressable
              onPress={handleViewStore}
              className="h-12 rounded-2xl bg-white border border-gray-200 items-center justify-center flex-row"
              style={{ gap: 8 }}
            >
              <Ionicons name="open-outline" size={16} color="#6b7280" />
              <Text className="text-gray-700 font-bold text-[14px]">
                View your store
              </Text>
            </Pressable>
          )}

          <Pressable onPress={handleLater} className="items-center py-2">
            <Text
              className="text-gray-400 text-[13px]"
              style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
            >
              Later — take me to my dashboard
            </Text>
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
