import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useInsights } from "../hooks/useInsights";
import { dismissInsight } from "../api/insights/insights.api";
import type { InsightCard } from "../api/insights/insights.types";

/**
 * Growth Partner insights carousel — the calm, comforting strip on Home
 * where each slide is one piece of advice that resolves to exactly what
 * the vendor needs to see. Mirrors the web carousel. Sits right under the
 * greeting hero (see Home.tsx) — a soft-tinted secondary surface, never a
 * second solid brand block. See docs/growth-partner-vision.md §5.
 */

const AUTO_ADVANCE_MS = 6000;
const RESUME_DELAY_MS = 12000;

const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  revenue_pulse: "trending-up",
  best_seller: "trophy",
  returning_rate: "repeat",
  unfulfilled: "cart",
  low_stock: "alert-circle",
  out_of_stock: "close-circle",
  stockout_forecast: "time",
  category_growth: "bar-chart",
  lapsed_customers: "people",
  vip_spotlight: "heart",
  conversion: "stats-chart",
  milestone: "ribbon",
  welcome: "sparkles",
  report_ready: "document-text",
};

// Soft tone palettes — light tinted surface + accent, no second solid
// brand block (the greeting card above owns the full-blue splash).
const TONE: Record<
  string,
  { bg: string; border: string; iconBg: string; accent: string; cta: string }
> = {
  positive: {
    bg: "#ecfdf5",
    border: "rgba(5,150,105,0.18)",
    iconBg: "#10b98122",
    accent: "#047857",
    cta: "#0596694d",
  },
  warning: {
    bg: "#fffbeb",
    border: "rgba(217,119,6,0.18)",
    iconBg: "#f59e0b22",
    accent: "#b45309",
    cta: "#d977064d",
  },
  celebrate: {
    bg: "#f5f3ff",
    border: "rgba(124,58,237,0.18)",
    iconBg: "#8b5cf622",
    accent: "#6d28d9",
    cta: "#7c3aed4d",
  },
  neutral: {
    bg: "#f3f8ff",
    border: "rgba(0,128,255,0.16)",
    iconBg: "#0080ff1a",
    accent: "#0d63b9",
    cta: "#0d63b9a1",
  },
};

const toneFor = (t: string) => TONE[t] ?? TONE.neutral;
const iconFor = (kind: string): keyof typeof Ionicons.glyphMap =>
  KIND_ICON[kind] ?? "sparkles";

/** Resolve a platform-neutral insight route to a mobile screen + params. */
function resolveNav(card: InsightCard): { screen: string; params?: any } | null {
  const p = card.routeParams ?? {};
  switch (card.route) {
    case "customers":
      return { screen: "Customers", params: p.segment ? { segment: p.segment } : undefined };
    case "orders":
      return { screen: "Orders", params: p.filter ? { filter: p.filter } : undefined };
    case "product":
    case "products":
      return {
        screen: "ProductsList",
        params: p.productId
          ? { productId: p.productId }
          : p.filter
            ? { filter: p.filter }
            : undefined,
      };
    case "report_download":
      return { screen: "ReportDownload" };
    case "reports":
      return { screen: "ReportsAnalytics" };
    default:
      return null;
  }
}

export default function InsightsCarousel() {
  const navigation = useNavigation<any>();
  const { data, isLoading } = useInsights();
  const cards = data?.cards ?? [];

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const pagerRef = useRef<PagerView>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAutoAdvance = useCallback(() => {
    if (autoTimer.current) {
      clearInterval(autoTimer.current);
      autoTimer.current = null;
    }
  }, []);

  const startAutoAdvance = useCallback(() => {
    stopAutoAdvance();
    if (cards.length < 2) return;
    autoTimer.current = setInterval(() => {
      const next = (indexRef.current + 1) % cards.length;
      pagerRef.current?.setPage(next);
    }, AUTO_ADVANCE_MS);
  }, [cards.length, stopAutoAdvance]);

  useEffect(() => {
    startAutoAdvance();
    return () => {
      stopAutoAdvance();
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [startAutoAdvance, stopAutoAdvance]);

  const onUserInteraction = useCallback(() => {
    stopAutoAdvance();
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(startAutoAdvance, RESUME_DELAY_MS);
  }, [startAutoAdvance, stopAutoAdvance]);

  const handlePageSelected = (e: PagerViewOnPageSelectedEvent) => {
    const next = e.nativeEvent.position;
    indexRef.current = next;
    setIndex(next);
  };

  const handleCta = (card: InsightCard) => {
    onUserInteraction();
    const nav = resolveNav(card);
    if (!nav) return;
    // Only report cards leave on the tap (the vendor is downloading it).
    // Stock/unfulfilled are data-driven; outreach cards leave only after an
    // explicit "I've reached out" confirm in the segment view.
    if (card.kind === "report_ready") void dismissInsight(card.id);
    try {
      navigation.navigate(nav.screen as never, nav.params as never);
    } catch (err) {
      if (__DEV__) console.warn("Insight CTA navigate failed:", nav.screen, err);
    }
  };

  // Empty / loading → render nothing (no skeleton "growth" on first paint,
  // matching PromoCardCarousel).
  if (isLoading || cards.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.eyebrowRow}>
        <Ionicons name="sparkles" size={12} color="#94a3b8" />
        <Text style={styles.eyebrow}>For you</Text>
      </View>

      <PagerView
        ref={pagerRef}
        initialPage={0}
        style={styles.pager}
        onPageSelected={handlePageSelected}
        onPageScrollStateChanged={(e) => {
          if (e.nativeEvent.pageScrollState === "dragging") onUserInteraction();
        }}
      >
        {cards.map((card) => {
          const tone = toneFor(card.tone);
          const hasCta = !!card.ctaLabel && !!resolveNav(card);
          return (
            <View key={card.id} collapsable={false} style={styles.pageContainer}>
              <TouchableOpacity
                activeOpacity={hasCta ? 0.92 : 1}
                onPress={() => hasCta && handleCta(card)}
                style={[
                  styles.card,
                  { backgroundColor: tone.bg, borderColor: tone.border },
                ]}
              >
                <View pointerEvents="none" style={styles.topEdge} />
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: tone.iconBg }]}>
                    <Ionicons name={iconFor(card.kind)} size={18} color={tone.accent} />
                  </View>
                  <View style={styles.textCol}>
                    <Text style={styles.headline} numberOfLines={2}>
                      {card.headline}
                    </Text>
                    <Text style={styles.body} numberOfLines={2}>
                      {card.body}
                    </Text>
                    {hasCta && (
                      <View style={[styles.ctaPill, { backgroundColor: tone.cta }]}>
                        <Text style={styles.ctaText} numberOfLines={1}>
                          {card.ctaLabel}
                        </Text>
                        <Ionicons name="arrow-forward" size={11} color="#fff" />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </PagerView>

      {cards.length > 1 && (
        <View style={styles.dotsRow}>
          {cards.map((c, i) => (
            <View
              key={c.id}
              style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginBottom: 10 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 7, marginLeft: 2 },
  eyebrow: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 0.2,
  },
  pager: { height: 132 },
  pageContainer: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 14,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 1,
  },
  topEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1 },
  headline: {
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  body: {
    color: "#475569",
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: -0.1,
    marginTop: 3,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  ctaPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.32)",
  },
  ctaText: {
    color: "#fff",
    fontSize: 11.5,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: -0.05,
  },
  dotsRow: {
    marginTop: 9,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  dot: { height: 4, borderRadius: 2 },
  dotActive: { width: 14, backgroundColor: "#0080ff" },
  dotInactive: { width: 4, backgroundColor: "#cbd5e1" },
});
