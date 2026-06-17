import { useState } from "react";
import { View, Text, Pressable, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import ReportDownloads from "../components/ReportDownloads";
import { FeaturePaywallSheet } from "../components/FeaturePaywallSheet";
import { useFeatures } from "../hooks/useFeatures";
import { FEATURES } from "../lib/features";

/**
 * Dedicated report-download screen — vendors land here straight from the
 * dashboard "Download report" insight. Premium, minimal, classy: a refined
 * dark hero, the download control, and a quiet "what's inside" list.
 */

const INSIDE: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}[] = [
  {
    icon: "sparkles-outline",
    title: "Plain-language summary",
    body: "A short, human write-up of how the period went — written fresh each time.",
  },
  {
    icon: "trending-up-outline",
    title: "Revenue & trend",
    body: "Sales, orders, returning-customer rate, and how you moved vs. before.",
  },
  {
    icon: "trophy-outline",
    title: "Best sellers",
    body: "Your top products by units and revenue.",
  },
  {
    icon: "people-outline",
    title: "Top customers",
    body: "Who spent the most, ready for follow-up.",
  },
];

export default function ReportDownload() {
  const navigation = useNavigation<any>();

  // Reports are part of the Growth Partner experience, gated behind the
  // products.low_stock key (unlocked for everyone during the 14-day trial).
  // Show the controls optimistically while features load (the common case
  // is eligible), then lock once we know the plan doesn't grant it. The
  // backend rejects the report endpoints with the same gate regardless.
  const { has, isReady } = useFeatures();
  const locked = isReady && !has(FEATURES.PRODUCTS_LOW_STOCK);
  const [paywallOpen, setPaywallOpen] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Minimal header */}
      <View className="flex-row items-center px-3 py-2">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 items-center justify-center rounded-full active:bg-gray-100"
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium dark hero */}
        <View
          className="mx-5 mb-9 rounded-[28px] overflow-hidden p-6"
          style={{ backgroundColor: "#0B1220" }}
        >
          <View
            style={{
              position: "absolute",
              top: -60,
              right: -44,
              width: 190,
              height: 190,
              borderRadius: 95,
              backgroundColor: "rgba(0,128,255,0.22)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -50,
              left: -28,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          />
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mb-6"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <Ionicons name="document-text-outline" size={24} color="#fff" />
          </View>
          <Text className="text-white text-[25px] font-extrabold tracking-tight leading-[30px]">
            Your performance,{"\n"}on paper.
          </Text>
          <Text className="text-white/55 text-[13px] mt-2.5 leading-5 max-w-[280px]">
            Perfect for your records, your accountant, or a quick review of how the business is doing.
          </Text>
        </View>

        {/* Controls — or an upgrade prompt when the plan doesn't include
            performance reports (post-trial, without products.low_stock). */}
        {locked ? (
          <View className="mx-5">
            <View className="rounded-[24px] border border-gray-100 bg-white p-6 items-center">
              <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-4">
                <Ionicons name="lock-closed" size={24} color="#0080ff" />
              </View>
              <Text className="text-[10.5px] font-extrabold uppercase tracking-[1.4px] text-blue-600">
                Upgrade required
              </Text>
              <Text className="mt-1.5 text-[18px] font-extrabold tracking-tight text-gray-900 text-center">
                Unlock performance reports
              </Text>
              <Text className="mt-2 text-[13px] leading-5 text-gray-500 text-center max-w-[300px]">
                Weekly and monthly reports — plus the dashboard insights that
                come with them — are part of a paid plan. Upgrade to keep your
                finger on the pulse of the business.
              </Text>
              <Pressable
                onPress={() => setPaywallOpen(true)}
                className="mt-5 h-12 w-full rounded-2xl bg-blue-600 items-center justify-center active:opacity-90"
              >
                <Text className="text-white text-[14.5px] font-extrabold">
                  See plans &amp; upgrade
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ReportDownloads />
        )}

        {/* What's inside */}
        <View className="mx-5 mt-10">
          <Text className="uppercase text-[11px] font-bold tracking-[2px] text-gray-400 mb-5 ml-0.5">
            What's inside
          </Text>
          {INSIDE.map((item, i) => (
            <View
              key={item.title}
              className={`flex-row items-start gap-3.5 ${i < INSIDE.length - 1 ? "mb-5" : ""}`}
            >
              <View className="w-9 h-9 rounded-xl bg-gray-50 items-center justify-center">
                <Ionicons name={item.icon} size={17} color="#334155" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-gray-900 tracking-tight">
                  {item.title}
                </Text>
                <Text className="text-[12.5px] text-gray-500 leading-[18px] mt-0.5">
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <FeaturePaywallSheet
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature={FEATURES.PRODUCTS_LOW_STOCK}
      />
    </SafeAreaView>
  );
}
