import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import LinearGradient from "react-native-linear-gradient";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";

import { RootStackParamList } from "../navigation/types";
import { AppImage } from "../components/AppImage";

const { width: screenWidth } = Dimensions.get("window");

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LOGO = require("../../assets/blackLogo.png");

interface Slide {
  id: string;
  title: string;
  description: string;
  image: any;
  badges: string[];
  // Soft tinted bg gradient under the illustration — gives each slide a
  // distinct mood while staying on-brand.
  gradient: [string, string];
}

const slides: Slide[] = [
  {
    id: "1",
    title: "Build your storefront\nin minutes",
    description:
      "Pick a template, drop in your products, and you're live — no design skills, no developers.",
    image: require("../../assets/slide1.png"),
    badges: ["Drag & drop", "Instant publish", "Custom domain"],
    gradient: ["#dbeafe", "#eff6ff"],
  },
  {
    id: "2",
    title: "Manage inventory\neffortlessly",
    description:
      "Add products, organize categories, and watch stock levels update the moment a sale happens.",
    image: require("../../assets/slide2.png"),
    badges: ["Real-time sync", "Stock alerts", "Bulk actions"],
    gradient: ["#dcfce7", "#f0fdf4"],
  },
  {
    id: "3",
    title: "Stay on top\nof every sale",
    description:
      "Track orders, see what's selling, and let smart analytics tell you exactly where to grow next.",
    image: require("../../assets/slide3.png"),
    badges: ["Live orders", "Smart insights", "Push alerts"],
    gradient: ["#ede9fe", "#f5f3ff"],
  },
];

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const AUTO_SCROLL_INTERVAL_MS = 3500;
const FIRST_SCROLL_DELAY_MS = 2500;

export default function OnboardingScreen() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteractedRef = useRef(false);

  // Use scrollToOffset everywhere — it never fails the way scrollToIndex can
  // when virtualized cells aren't fully measured yet.
  const goToIndex = useCallback((index: number, animated = true) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);
    scrollRef.current?.scrollTo({
      x: screenWidth * index,
      y: 0,
      animated,
    });
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    // If the user has interacted, leave them alone.
    if (userInteractedRef.current) return;
    stopAutoScroll();
    autoScrollTimer.current = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % slides.length;
      goToIndex(nextIndex, true);
    }, AUTO_SCROLL_INTERVAL_MS);
  }, [goToIndex, stopAutoScroll]);

  // Kick off after a small delay so the FlatList has measured itself.
  useEffect(() => {
    const kickoff = setTimeout(startAutoScroll, FIRST_SCROLL_DELAY_MS);
    return () => {
      clearTimeout(kickoff);
      stopAutoScroll();
    };
  }, [startAutoScroll, stopAutoScroll]);

  const handleScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / screenWidth);
    if (index !== currentIndex) {
      currentIndexRef.current = index;
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    haptic();
    userInteractedRef.current = true;
    stopAutoScroll();
    if (currentIndex < slides.length - 1) {
      goToIndex(currentIndex + 1);
    } else {
      navigation.navigate("EmailSignUp");
    }
  };

  const handleSkip = () => {
    haptic();
    navigation.navigate("EmailSignUp");
  };

  const isLast = currentIndex === slides.length - 1;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={{ width: screenWidth }} className="px-6">
      {/* Branded illustration canvas — soft gradient backdrop replaces the
          old plain bg-blue-50 box. Each slide gets its own mood. */}
      <View
        className="rounded-[32px] overflow-hidden"
        style={{
          height: Math.min(320, Math.max(240, (screenWidth - 48) * 0.74)),
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          elevation: 6,
        }}
      >
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <AppImage
            source={item.image}
            contentFit="contain"
            style={{ width: "100%", height: "100%" }}
          />
        </LinearGradient>
      </View>

      {/* Title */}
      <Text
        className="text-center mt-7"
        style={{
          fontFamily: "PlusJakartaSans_800ExtraBold",
          fontSize: 28,
          fontWeight: "800",
          color: "#0f172a",
          letterSpacing: -0.6,
          lineHeight: 34,
        }}
      >
        {item.title}
      </Text>

      {/* Description */}
      <Text
        className="text-center mt-3"
        style={{
          fontSize: 14.5,
          lineHeight: 22,
          color: "#475569",
          paddingHorizontal: 8,
        }}
      >
        {item.description}
      </Text>

      {/* Feature chips */}
      <View className="flex-row flex-wrap justify-center gap-2 mt-5">
        {item.badges.map((badge) => (
          <View
            key={badge}
            className="flex-row items-center gap-1.5 px-3 h-7 rounded-full bg-white border border-gray-100"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <Ionicons name="checkmark-circle" size={11} color="#2563eb" />
            <Text className="text-[11px] font-bold text-gray-700">{badge}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-6 pt-2 mb-5 pb-1 flex-row items-center justify-between">
        <View className="w-16">
          <AppImage
            source={LOGO}
            contentFit="contain"
            style={{ width: 96, height: 32 }}
          />
        </View>
        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.8}
          className="px-3.5 h-8 rounded-full bg-gray-100 items-center justify-center"
          hitSlop={6}
        >
          <Text className="text-[12px] font-bold text-gray-700">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides — ScrollView with pagingEnabled is rock-solid for
          programmatic scrolling, where FlatList silently no-ops on iOS. */}
      <View className="flex-1 justify-center">
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            userInteractedRef.current = true;
            stopAutoScroll();
          }}
          decelerationRate="fast"
          bounces={false}
          contentContainerStyle={{ flexGrow: 0 }}
        >
          {slides.map((slide) => (
            <React.Fragment key={slide.id}>{renderSlide({ item: slide })}</React.Fragment>
          ))}
        </ScrollView>
      </View>

      {/* Tappable progress dots */}
      <View className="flex-row justify-center items-center mt-2 mb-6 gap-2">
        {slides.map((_, index) => {
          const isActive = index === currentIndex;
          return (
            <Pressable
              key={index}
              onPress={() => {
                haptic();
                userInteractedRef.current = true;
                stopAutoScroll();
                goToIndex(index);
              }}
              hitSlop={8}
            >
              <View
                className={`h-1.5 rounded-full ${
                  isActive ? "bg-blue-600" : "bg-gray-200"
                }`}
                style={{ width: isActive ? 28 : 6 }}
              />
            </Pressable>
          );
        })}
      </View>

      {/* CTAs — sticky bottom, no card frame */}
      <View className="px-6 pb-8">
        <Pressable
          onPress={handleNext}
          className="h-14 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text className="text-white text-[15px] font-bold tracking-tight">
            {isLast ? "Get started" : "Next"}
          </Text>
          <Ionicons
            name={isLast ? "arrow-forward" : "chevron-forward"}
            size={18}
            color="white"
          />
        </Pressable>

        <View className="flex-row items-center justify-center mt-4">
          <Text className="text-[13px] text-gray-500">
            Already have an account?{" "}
          </Text>
          <Pressable
            onPress={() => {
              haptic();
              navigation.navigate("Login");
            }}
            hitSlop={8}
          >
            <Text className="text-[13px] font-bold text-blue-600">Log in</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
