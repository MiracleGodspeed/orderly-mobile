import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from "react-native-pager-view";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { usePromoCards } from "../hooks/usePromoCards";
import type { PromoCard } from "../api/promoCards/promoCards.types";

// Brand accent for icon bubble + CTA. The card itself is a soft
// brand-tinted surface — the greeting card directly above already
// owns the full-blue block, so repeating that here would flatten the
// dashboard's visual rhythm. Soft-tint + accent reads as a secondary
// announcement strip without competing with the greeting.
//
// No gradient anywhere — depth comes from layered hairlines (top
// specular edge on the card, inner white ring on the icon and CTA)
// the way Apple and Linear suggest "edge of glass" without resorting
// to colour transitions.
const BRAND = "#0080ff";

// Auto-advance cadence — long enough that a vendor can read a card
// without it feeling rushed, short enough that two cards cycle inside
// a typical dashboard glance.
const AUTO_ADVANCE_MS = 5000;

// How long we keep our hands off after the vendor manually swipes
// or taps a CTA. They obviously want to read this one — resuming
// auto-advance too eagerly comes across as twitchy.
const RESUME_DELAY_MS = 10000;

// Curated icon registry. Server-side validation guarantees only
// these keys reach us, but the fallback makes the UI tolerant of
// rollouts where a new key shipped before this build was updated.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  sparkles: "sparkles",
  gift: "gift",
  bolt: "flash",
  megaphone: "megaphone",
  rocket: "rocket",
  star: "star",
  trophy: "trophy",
  "trending-up": "trending-up",
  shield: "shield-checkmark",
  tag: "pricetag",
  calendar: "calendar",
  info: "information-circle",
};

const resolveIcon = (key: string | null): keyof typeof Ionicons.glyphMap =>
  (key && ICONS[key]) || "sparkles";

export default function PromoCardCarousel() {
  const navigation = useNavigation<any>();
  const { data: cards = [], isLoading } = usePromoCards();

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

  // Kick off / restart auto-advance whenever the card count changes.
  useEffect(() => {
    startAutoAdvance();
    return () => {
      stopAutoAdvance();
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, [startAutoAdvance, stopAutoAdvance]);

  // User touched the carousel — freeze auto-advance, then resume
  // after a beat so they can finish reading.
  const onUserInteraction = useCallback(() => {
    stopAutoAdvance();
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      startAutoAdvance();
    }, RESUME_DELAY_MS);
  }, [startAutoAdvance, stopAutoAdvance]);

  const handlePageSelected = (e: PagerViewOnPageSelectedEvent) => {
    const next = e.nativeEvent.position;
    indexRef.current = next;
    setIndex(next);
  };

  const handleCta = (card: PromoCard) => {
    onUserInteraction();
    const route = (card.buttonRoute ?? "").trim();
    if (!route) return;
    // Wrapped — the admin can in theory persist a route name that
    // this build doesn't know about (e.g. a route we removed in a
    // refactor). React Navigation throws synchronously on unknown
    // routes, which would crash the dashboard. Swallow + log.
    try {
      navigation.navigate(route as never);
    } catch (err) {
      if (__DEV__) console.warn("Promo CTA navigate failed:", route, err);
    }
  };

  // Empty / loading → render nothing. Keeping the carousel slot
  // invisible (instead of placeholder skeletons) avoids dashboards
  // with no promo content "growing" briefly on first paint.
  if (isLoading || cards.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <PagerView
        ref={pagerRef}
        initialPage={0}
        style={styles.pager}
        onPageSelected={handlePageSelected}
        onPageScrollStateChanged={(e) => {
          if (e.nativeEvent.pageScrollState === "dragging") {
            onUserInteraction();
          }
        }}
      >
        {cards.map((card) => (
          <View key={card.id} collapsable={false} style={styles.pageContainer}>
            {/* Whole card is the tap target — the CTA pill at the
                end signals intent, the card itself is the affordance.
                Stripe/Apple-Wallet "Continue setup →" pattern. */}
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => handleCta(card)}
              style={styles.card}
            >
              {/* Specular hairline along the very top edge — 1px
                  near-white "glass edge" that catches the light. */}
              <View pointerEvents="none" style={styles.topEdge} />

              {/* Decorative ghost glyph — faded oversized copy of the
                  same icon. Editorial texture, no new colour. */}
              <View pointerEvents="none" style={styles.ghost}>
                <Ionicons
                  name={resolveIcon(card.iconKey)}
                  size={130}
                  color="rgba(0, 128, 255, 0.06)"
                />
              </View>

              {/* Icon as a layered glow halo — two concentric soft
                  brand-tinted circles approximate a radial light source
                  without using a gradient. The glyph floats on top in
                  solid brand colour. Reads as a "presence" rather than
                  a chip. */}
              <View style={styles.iconHalo}>
                <View style={styles.iconCore}>
                  <Ionicons
                    name={resolveIcon(card.iconKey)}
                    size={18}
                    color={"#fff"}
                  />
                </View>
              </View>

              <Text style={styles.body} 
              // numberOfLines={2}
              >
                {card.body}
              </Text>

              <View style={styles.ctaPill}>
                <Text style={styles.ctaText} numberOfLines={1}>
                  {card.buttonText}
                </Text>
                <Ionicons name="arrow-forward" size={12} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </PagerView>

      {cards.length > 1 && (
        <View style={styles.dotsRow}>
          {cards.map((c, i) => {
            const active = i === index;
            return (
              <View
                key={c.id}
                style={[
                  styles.dot,
                  active ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  pager: {
    // Compact horizontal strip — the carousel is a secondary
    // announcement layer, never an editorial hero. Single row, body
    // truncates to two short lines if the admin writes long copy.
    height: 75,
  },
  pageContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f3f8ff",
    borderWidth: 1,
    borderColor: "rgba(0, 128, 255, 0.16)",
    // Cool, neutral shadow — brand-coloured shadows always read
    // juvenile (the "Bootstrap 5 era" tell).
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 1,
  },
  // 1px specular edge along the very top of the card — catches the
  // light the way the top edge of a glass surface does.
  topEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  ghost: {
    position: "absolute",
    right: -28,
    top: -22,
  },
  // Layered glow halo — two concentric translucent circles plus the
  // solid-brand glyph on top. Approximates a radial light source by
  // *layering material*, not by painting a gradient. Each ring is a
  // discrete circle; the eye reads the falloff. Same trick iOS uses
  // for the "lit" state on icon backdrops.
  iconHalo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 128, 255, 0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0080ff29",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    color: "#1e2128d2",
    fontSize: 12.4,
    lineHeight: 17,
    letterSpacing: -0.2,
    marginHorizontal: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  ctaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d63b9a1",
    paddingHorizontal: 11,
    paddingVertical: 6.5,
    borderRadius: 999,
    gap: 4,
    // Top-only specular hairline — "edge of glass" detail on the
    // pill, no drop shadow, no gradient.
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.32)",
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: -0.05,
  },
  dotsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 14,
    backgroundColor: "#0080ff",
  },
  dotInactive: {
    width: 4,
    backgroundColor: "#cbd5e1",
  },
});
