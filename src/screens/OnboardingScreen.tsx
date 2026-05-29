import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Pressable,
} from "react-native";
import PagerView, {
  type PagerViewOnPageSelectedEvent,
  type PageScrollStateChangedNativeEvent,
} from "react-native-pager-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import LinearGradient from "react-native-linear-gradient";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";

import { RootStackParamList } from "../navigation/types";
import { AppImage } from "../components/AppImage";

// Upper bound for slide content width. On phones the slide naturally
// occupies the full screen; on iPad portrait (~820pt) or landscape
// (~1180pt) the slide gets centred inside its page-width container
// and the inner content stays at a phone-readable size instead of
// stretching across a 1000pt-wide canvas. Apple flagged the previous
// full-width layout as failing Guideline 4 on iPad Air 11" — the
// title + description + badges read as lost specks of content in a
// huge empty page. Cap at 480pt: comfortable on iPhone Plus, doesn't
// over-stretch on iPad.
const SLIDE_CONTENT_MAX_WIDTH = 480;

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
      "Pick a template, add your products, and you're live — no design skills, no developers.",
    image: require("../../assets/slide1.png"),
    badges: ["Ready templates", "Instant publish", "Custom domain"],
    gradient: ["#dbeafe", "#eff6ff"],
  },
  {
    id: "2",
    title: "Manage inventory\neffortlessly",
    description:
      "Add products, organize categories, and watch stock levels update the moment a sale happens.",
    image: require("../../assets/slide2.png"),
    badges: ["Real-time stock", "Low-stock filter", "Variants & categories"],
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
  const pagerRef = useRef<PagerView>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteractedRef = useRef(false);
  // Still tracked so the inner slide content can size against the
  // current viewport width on rotation / split view, but no longer
  // used to drive paging — PagerView handles that natively against
  // its own measured frame.
  const { width: screenWidth } = useWindowDimensions();

  // Imperative jump to a specific page. Delegates to PagerView's
  // native `setPage` (UIPageViewController on iOS, ViewPager2 on
  // Android) — the actual page change happens in native code, so
  // there's no JS-side animation race that can swallow the request
  // (the failure mode of the previous ScrollView.scrollTo approach).
  const goToIndex = useCallback(
    (index: number, animated = true) => {
      currentIndexRef.current = index;
      setCurrentIndex(index);
      if (animated) {
        pagerRef.current?.setPage(index);
      } else {
        pagerRef.current?.setPageWithoutAnimation(index);
      }
    },
    [],
  );

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
    navigation.navigate("Login");
    // navigation.navigate("Splash");
  };

  const isLast = currentIndex === slides.length - 1;

  const renderSlide = ({ item }: { item: Slide }) => {
    // The illustration canvas is a near-square block. On iPad we let
    // it size against the *content* container (max 480pt) rather than
    // the full page width — otherwise it became a 700pt-wide × 320pt-
    // tall slab, which was the core visual of the Apple Guideline 4
    // rejection.
    const contentWidth = Math.min(SLIDE_CONTENT_MAX_WIDTH, screenWidth - 48);
    const canvasHeight = Math.min(360, Math.max(240, contentWidth * 0.74));

    return (
      // PagerView gives each page its own native frame matching the
      // PagerView's measured width — no explicit `width: screenWidth`
      // needed (and it'd actually fight the native sizing). We
      // centre + cap the inner content so iPad doesn't stretch
      // horizontally, AND `justifyContent: "center"` so the slide
      // content sits in the middle of the available vertical space
      // on tall screens (iPad). Without it, content hugged the top
      // of the page and the badges/dots cluster at the bottom of
      // the description bunched up — Apple flagged the iPad layout
      // as Guideline 4 ("content not fully displayed / cramped").
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View style={{ width: "100%", maxWidth: SLIDE_CONTENT_MAX_WIDTH }}>
          {/* Branded illustration canvas — soft gradient backdrop. */}
          <View
            className="rounded-[32px] overflow-hidden"
            style={{
              height: canvasHeight,
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

          {/* Feature chips. Gap above bumped from mt-5 → mt-8 so the
              chips don't crowd the bottom of the (potentially 2-line)
              description on iPad — the visual congestion zone Apple
              flagged in the Guideline 4 review. */}
          <View className="flex-row flex-wrap justify-center gap-2 mt-8">
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
      </View>
    );
  };

  return (
    // Bottom edge added so the sticky CTA doesn't ride under the
    // iPad's bottom safe-area inset on devices that have one. The
    // previous `["top"]`-only variant clipped the "Get started"
    // button on some iPad models, which was part of the Guideline 4
    // "content not fully displayed" finding.
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
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

      {/* Slides — native PagerView. `setPage` is a real native call
          (UIPageViewController on iOS, ViewPager2 on Android) so the
          auto-advance from `setInterval` is guaranteed to slide the
          page. The previous ScrollView + scrollTo({animated:true})
          combo silently no-op'd on iOS 17+ for programmatic scrolls
          while still updating the JS state — which is why the dots
          changed but the slide didn't. PagerView eliminates that
          entire failure mode and also drops the screenWidth math. */}
      <View className="flex-1 justify-center">
        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={0}
          orientation="horizontal"
          // Stop auto-advance the first time the vendor swipes. State
          // for the dots is also updated here as the page settles.
          onPageScrollStateChanged={(e: PageScrollStateChangedNativeEvent) => {
            if (e.nativeEvent.pageScrollState === "dragging") {
              userInteractedRef.current = true;
              stopAutoScroll();
            }
          }}
          onPageSelected={(e: PagerViewOnPageSelectedEvent) => {
            const next = e.nativeEvent.position;
            if (next !== currentIndexRef.current) {
              currentIndexRef.current = next;
              setCurrentIndex(next);
            }
          }}
        >
          {slides.map((slide) => (
            <View key={slide.id} style={{ flex: 1 }}>
              {renderSlide({ item: slide })}
            </View>
          ))}
        </PagerView>
      </View>

      {/* Tappable progress dots. Top margin bumped from mt-2 → mt-5
          so the dots sit a clear distance below the PagerView's slide
          content — on iPad the previous spacing made the dots read
          as part of the badges row. */}
      <View className="flex-row justify-center items-center mt-5 mb-6 gap-2">
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

      {/* CTAs — sticky bottom. The outer wrapper centres on iPad so
          the button doesn't run the full ~800-1180pt width; the inner
          container is capped at the same SLIDE_CONTENT_MAX_WIDTH so
          the CTA aligns under the slide content on every device. */}
      <View
        className="px-6 pb-8"
        style={{ alignItems: "center" }}
      >
        <View style={{ width: "100%", maxWidth: SLIDE_CONTENT_MAX_WIDTH }}>
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
      </View>
    </SafeAreaView>
  );
}
