import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useVendor } from "../../context/VendorContext";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";
import { AppImage } from "./AppImage";
import { useFeatures } from "../hooks/useFeatures";
import {
  TEMPLATE_FEATURE_KEY_BY_ID,
  type FeatureKey,
} from "../lib/features";
import { FeaturePaywallSheet } from "./FeaturePaywallSheet";
import { TemplateTrialInfoSheet } from "./TemplateTrialInfoSheet";
import { getAvailablePlans } from "../api/vendor/vendor.api";
import type { ApiSubscriptionPlan } from "../api/vendor/vendor.types";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialTemplateId?: string;
}

/**
 * Storefront templates available to vendors. IDs match the values the
 * backend stores in `storeData.templateId`, and the screenshot files were
 * lifted from `orderly-by-goodspeed/src/assets/images/Templates/` so the
 * mobile preview matches the web one byte-for-byte.
 */
// Order mirrors the web picker (TEMPLATE_OPTIONS in StorefrontEditorDrawer.tsx):
// most-stunning first, descending — kept identical across web + mobile so the
// vendor sees the same sequence on every device.
const THEMES = [
  {
    id: "mercato",
    label: "Mercato",
    tagline: "Modern fashion marketplace — geometric type, hero slider.",
    screenshot: require("../../assets/templates/web/mercato.png"),
    accent: "#111827",
  },
  {
    id: "margaux",
    label: "Margaux",
    tagline: "Editorial luxe fashion — navy & gold Bodoni serif.",
    screenshot: require("../../assets/templates/web/margaux.png"),
    accent: "#1e2a44",
  },
  {
    id: "cobalt",
    label: "Cobalt",
    tagline: "Clean fashion-ecommerce — navy on white, pale-blue hero.",
    screenshot: require("../../assets/templates/web/cobalt.png"),
    accent: "#16233f",
  },
  {
    id: "arena",
    label: "Arena",
    tagline: "Monochrome streetwear — bold type, icon category grid.",
    screenshot: require("../../assets/templates/web/arena.png"),
    accent: "#1a1a1a",
  },
  {
    id: "colette",
    label: "Colette",
    tagline: "Magazine-elegant fashion — serif headings, airy light.",
    screenshot: require("../../assets/templates/web/colette.png"),
    accent: "#1c1917",
  },
  {
    id: "galactic",
    label: "Galactic",
    tagline: "Premium catalog with luxury leather aesthetics.",
    screenshot: require("../../assets/templates/web/galactic.png"),
    accent: "#2f3237",
  },
  {
    id: "maison",
    label: "Maison",
    tagline: "Quiet-luxury fashion house — stark monochrome gallery.",
    screenshot: require("../../assets/templates/web/maison.png"),
    accent: "#0a0a0a",
  },
  {
    id: "aurum",
    label: "Aurum",
    tagline: "The jeweller's boutique at night — near-black, warm gold.",
    screenshot: require("../../assets/templates/web/aurum.png"),
    accent: "#15110a",
  },
  {
    id: "couture",
    label: "Couture",
    tagline: "Romantic atelier — warm ivory with soft rosé accents.",
    screenshot: require("../../assets/templates/web/couture.png"),
    accent: "#b76e79",
  },
  {
    id: "avenue",
    label: "Avenue",
    tagline: "Contemporary fashion shop — bright, clean lifestyle hero.",
    screenshot: require("../../assets/templates/web/avenue.png"),
    accent: "#0a0a0a",
  },
  {
    id: "bazaar",
    label: "Bazaar",
    tagline: "Feature-rich classic store — deals, carousels, ratings.",
    screenshot: require("../../assets/templates/web/bazaar.png"),
    accent: "#1f2937",
  },
  {
    id: "atelier",
    label: "Atelier",
    tagline: "Editorial, minimal, and quietly premium.",
    screenshot: require("../../assets/templates/web/atelier.png"),
    accent: "#0a0a0a",
  },
  {
    id: "brio",
    label: "Brio",
    tagline: "Crisp, product-first storefront with bright hero.",
    screenshot: require("../../assets/templates/web/brio.png"),
    accent: "#0a0a0a",
  },
  {
    id: "vivid",
    label: "Vivid",
    tagline: "Bright marketplace — bold brand-colour header, pill buttons.",
    screenshot: require("../../assets/templates/web/vivid.png"),
    accent: "#2563eb",
  },
  {
    id: "carte",
    label: "Carte",
    tagline: "No hero — opens straight into the product grid.",
    screenshot: require("../../assets/templates/web/carte.png"),
    accent: "#0a0a0a",
  },
  {
    id: "mg1",
    label: "Orderly Core",
    tagline: "Clean, balanced, and versatile.",
    screenshot: require("../../assets/templates/web/mg1.png"),
    accent: "#6366F1",
  },
  {
    id: "speedpro",
    label: "Speed-Pro",
    tagline: "Bold, polished, and business-ready.",
    screenshot: require("../../assets/templates/web/speedpro.png"),
    accent: "#791A4D",
  },
  {
    id: "ranger",
    label: "Shop Ranger",
    tagline: "Strong, flexible, and sales-driven.",
    screenshot: require("../../assets/templates/web/ranger.png"),
    accent: "#791A4D",
  },
  {
    id: "jewl",
    label: "Jeweler-Esque",
    tagline: "Elegant, refined, and premium.",
    screenshot: require("../../assets/templates/web/jewl.png"),
    accent: "#791A4D",
  },
  {
    id: "da1",
    label: "Fresh Cart",
    tagline: "Fresh, modern, and conversion-focused.",
    screenshot: require("../../assets/templates/web/da1.png"),
    accent: "#059669",
  },
  {
    id: "grace",
    label: "Grace",
    tagline: "Premium jewelry-inspired editorial collections.",
    screenshot: require("../../assets/templates/web/grace.png"),
    accent: "#0a0a0a",
  },
  {
    id: "prism",
    label: "Prism",
    tagline: "Modern DTC polish — refined cinematic, brand-color accents.",
    screenshot: require("../../assets/templates/web/prism.png"),
    accent: "#18181b",
  },
  {
    id: "lume",
    label: "Lume",
    tagline: "Warm organic DTC — cream surfaces, soft rounded shapes.",
    screenshot: require("../../assets/templates/web/lume.png"),
    accent: "#a8754f",
  },
  {
    id: "onyx",
    label: "Onyx",
    tagline: "Dark luxury — sophisticated surfaces, champagne accents.",
    screenshot: require("../../assets/templates/web/onyx.png"),
    accent: "#18181b",
  },
  {
    id: "linen",
    label: "Linen",
    tagline: "Warm-neutral fashion app — filter pills, wishlist cards.",
    screenshot: require("../../assets/templates/web/linen.png"),
    accent: "#1c1917",
  },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export default function ThemeLayoutModal({
  visible,
  onClose,
  initialTemplateId,
}: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const { has: hasFeature, isUnlimited, isTrial } = useFeatures();
  // We seed with the first id but the effect below replaces it whenever the
  // sheet opens, so initial mount never shows the wrong selection.
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(THEMES[0].id);
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<{
    id: ThemeId;
    label: string;
    plan: ApiSubscriptionPlan | null;
  } | null>(null);

  const currentTemplateId = storeData?.templateId ?? THEMES[0].id;

  // Plans list — used by the trial info sheet to name the plan that
  // owns the tapped template + its price. Mounted only while the
  // theme sheet is visible to avoid spending the call on cold app
  // launches that never touch the picker. Cached 10 minutes; soft
  // failure returns an empty list (sheet renders with "a premium
  // plan" fallback copy).
  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      try {
        const list = await getAvailablePlans();
        return list
          .filter((p) => p.isActive !== false)
          .sort((a, b) => a.price - b.price);
      } catch {
        return [] as ApiSubscriptionPlan[];
      }
    },
    staleTime: 10 * 60 * 1000,
    enabled: visible,
  });

  useEffect(() => {
    if (!visible) return;
    const matched = THEMES.find((t) => t.id === initialTemplateId);
    setSelectedTheme(matched ? matched.id : THEMES[0].id);
  }, [visible, initialTemplateId]);

  /**
   * Lock check for a candidate template. Returns the required key
   * for non-trial vendors who lack it (caller opens the paywall),
   * or null when the template is free / unlocked / grandfathered.
   *
   * Grandfather rule: the vendor's currently-applied template never
   * shows as locked in the picker — the backend resolver handles
   * the public storefront fallback separately.
   */
  const lockKeyFor = (id: string): FeatureKey | null => {
    const required = TEMPLATE_FEATURE_KEY_BY_ID[id];
    if (!required) return null;
    if (isUnlimited) return null;
    if (hasFeature(required)) return null;
    if (id === currentTemplateId) return null;
    return required;
  };

  /**
   * Whether the trial info sheet should appear for this candidate.
   * Gates on `isTrial`, NOT `isUnlimited`: a paid top-tier plan is also
   * unlimited but is not on trial — showing them the "your trial" sheet
   * was the bug. The selection still applies on confirm either way.
   */
  const needsTrialInfo = (id: string): boolean => {
    if (!isTrial) return false;
    if (id === currentTemplateId) return false;
    return TEMPLATE_FEATURE_KEY_BY_ID[id] != null;
  };

  /** Cheapest plan that grants `key`, or null when no plan does. */
  const findOwningPlan = useMemo(() => {
    return (key: FeatureKey): ApiSubscriptionPlan | null => {
      if (!plans?.length) return null;
      return (
        plans.find(
          (p) =>
            Array.isArray(p.featureKeys) && p.featureKeys.includes(key),
        ) ?? null
      );
    };
  }, [plans]);

  const handleSelect = (id: ThemeId, label: string) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    const lockKey = lockKeyFor(id);
    if (lockKey) {
      // Non-trial vendor lacking the feature — open paywall.
      setPaywallFeature(lockKey);
      return;
    }
    if (needsTrialInfo(id)) {
      const requiredKey = TEMPLATE_FEATURE_KEY_BY_ID[id];
      const owningPlan = requiredKey ? findOwningPlan(requiredKey) : null;
      setPendingTemplate({ id, label, plan: owningPlan });
      return;
    }
    setSelectedTheme(id);
  };

  const handleSave = async () => {
    if (!storeData) return;
    // Defensive — picker click is gated, but a features refetch could
    // land between pick + save. Bail loud rather than send a request
    // the .NET gate will reject.
    const stillLocked = lockKeyFor(selectedTheme);
    if (stillLocked) {
      setPaywallFeature(stillLocked);
      return;
    }
    try {
      await updateVendorSettings({ templateId: selectedTheme });
      onClose();
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Theme & Layout"
      subtitle="Pick the look and feel of your storefront"
      height="92%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      >
        <View className="flex-row items-center justify-between mt-3 mb-3">
          <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px]">
            Available themes
          </Text>
          <Text className="text-[11px] font-bold text-gray-500">
            {THEMES.length} options
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            const locked = lockKeyFor(theme.id) != null;
            return (
              <Pressable
                key={theme.id}
                onPress={() => handleSelect(theme.id, theme.label)}
                className="w-[48%] mb-5"
              >
                {/* Phone-framed preview — the screenshots are full-height
                    phone captures, so we present them inside a device
                    frame at the screen's own aspect ratio. The whole
                    storefront top-to-bottom shows instead of a crop. */}
                <View
                  className={`rounded-3xl border-2 bg-white p-2 ${
                    isSelected ? "border-blue-600" : "border-transparent"
                  }`}
                  style={{
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isSelected ? 0.14 : 0.06,
                    shadowRadius: 12,
                    elevation: isSelected ? 4 : 2,
                  }}
                >
                  <View className="rounded-[26px] bg-neutral-900 p-[4px]">
                    <View className="relative rounded-[22px] overflow-hidden bg-gray-100 aspect-[9/19]">
                      <AppImage
                        source={theme.screenshot}
                        contentFit="cover"
                        style={{
                          width: "100%",
                          height: "100%",
                          opacity: locked ? 0.6 : 1,
                        }}
                      />

                      {/* Notch */}
                      <View
                        pointerEvents="none"
                        className="absolute top-1.5 left-1/2 h-1.5 w-12 rounded-full"
                        style={{
                          backgroundColor: "rgba(0,0,0,0.4)",
                          transform: [{ translateX: -24 }],
                        }}
                      />

                      {isSelected && !locked && (
                        <View
                          className="absolute inset-0"
                          pointerEvents="none"
                          style={{ backgroundColor: "rgba(37,99,235,0.06)" }}
                        />
                      )}

                      {/* Locked overlay — sits above the dimmed image */}
                      {locked && (
                        <View
                          className="absolute inset-0 items-center justify-center"
                          pointerEvents="none"
                        >
                          <View className="flex-row items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5">
                            <Ionicons
                              name="lock-closed"
                              size={12}
                              color="white"
                            />
                            <Text className="text-white text-[10px] font-extrabold uppercase tracking-wider">
                              Upgrade
                            </Text>
                          </View>
                        </View>
                      )}

                      {isSelected && !locked ? (
                        <View className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-blue-600 items-center justify-center">
                          <Ionicons name="checkmark" size={16} color="white" />
                        </View>
                      ) : !locked ? (
                        <View className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 items-center justify-center">
                          <Ionicons
                            name="ellipse-outline"
                            size={14}
                            color="#94a3b8"
                          />
                        </View>
                      ) : null}

                      {/* Currently-applied indicator — distinct from
                          "selected in this picker" so the vendor can see
                          what's live. Suppressed when locked so the
                          Upgrade pill owns the visual space. */}
                      {storeData?.templateId === theme.id && !locked && (
                        <View className="absolute top-2.5 left-2.5 bg-gray-900/85 px-2 py-0.5 rounded-full">
                          <Text className="text-white text-[9px] font-extrabold tracking-wider uppercase">
                            Active
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View className="mt-3 px-1">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <Text
                      className="text-[14px] font-extrabold text-gray-900 tracking-tight flex-1"
                      numberOfLines={1}
                    >
                      {theme.label}
                    </Text>
                  </View>
                  <Text
                    className="text-[11.5px] text-gray-500 leading-[16px]"
                    numberOfLines={2}
                  >
                    {theme.tagline}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 flex-row items-start gap-3 mt-2">
          <Ionicons name="bulb-outline" size={18} color="#2563eb" />
          <Text className="text-[12.5px] text-blue-800 leading-[18px] flex-1">
            You can switch themes anytime — your products, customers, and
            settings stay exactly where they are.
          </Text>
        </View>
      </ScrollView>

      <BottomSheetFooter
        onCancel={onClose}
        onSave={handleSave}
        loading={loading}
      />

      <FeaturePaywallSheet
        visible={paywallFeature != null}
        feature={paywallFeature}
        onClose={() => setPaywallFeature(null)}
      />
      <TemplateTrialInfoSheet
        visible={pendingTemplate != null}
        templateLabel={pendingTemplate?.label ?? ""}
        plan={pendingTemplate?.plan ?? null}
        onConfirm={() => {
          if (pendingTemplate) {
            setSelectedTheme(pendingTemplate.id);
          }
          setPendingTemplate(null);
        }}
        onClose={() => setPendingTemplate(null)}
      />
    </BottomSheet>
  );
}
