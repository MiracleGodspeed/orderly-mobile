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
const THEMES = [
  {
    id: "mg1",
    label: "Orderly Core",
    tagline: "Clean, balanced, and versatile.",
    screenshot: require("../../assets/templates/t1.png"),
    accent: "#6366F1",
  },
  {
    id: "speedpro",
    label: "Speed-Pro",
    tagline: "Bold, polished, and business-ready.",
    screenshot: require("../../assets/templates/speed1.png"),
    accent: "#791A4D",
  },
  {
    id: "ranger",
    label: "Shop Ranger",
    tagline: "Strong, flexible, and sales-driven.",
    screenshot: require("../../assets/templates/ranger.png"),
    accent: "#791A4D",
  },
  {
    id: "jewl",
    label: "Jeweler-Esque",
    tagline: "Elegant, refined, and premium.",
    screenshot: require("../../assets/templates/straight.png"),
    accent: "#791A4D",
  },
  {
    id: "da1",
    label: "Fresh Cart",
    tagline: "Fresh, modern, and conversion-focused.",
    screenshot: require("../../assets/templates/fresh.png"),
    accent: "#059669",
  },
  {
    id: "galactic",
    label: "Galactic",
    tagline: "Premium catalog with luxury leather aesthetics.",
    screenshot: require("../../assets/templates/squint.png"),
    accent: "#2f3237",
  },
  {
    id: "atelier",
    label: "Atelier",
    tagline: "Editorial, minimal, and quietly premium.",
    screenshot: require("../../assets/templates/atlier.png"),
    accent: "#0a0a0a",
  },
  {
    id: "brio",
    label: "Brio",
    tagline: "Crisp, product-first storefront with bright hero.",
    screenshot: require("../../assets/templates/brio.png"),
    accent: "#0a0a0a",
  },
  {
    id: "carte",
    label: "Carte",
    tagline: "No hero — opens straight into the product grid.",
    screenshot: require("../../assets/templates/carte.png"),
    accent: "#0a0a0a",
  },
  {
    id: "grace",
    label: "Grace",
    tagline: "Premium jewelry-inspired editorial collections.",
    // Screenshot file isn't shipped yet — falls back to a placeholder
    // image until a marketing asset lands at this path.
    screenshot: require("../../assets/templates/carte.png"),
    accent: "#0a0a0a",
  },
  {
    id: "prism",
    label: "Prism",
    tagline: "Modern DTC polish — refined cinematic, brand-color accents.",
    screenshot: require("../../assets/templates/carte.png"),
    accent: "#18181b",
  },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export default function ThemeLayoutModal({
  visible,
  onClose,
  initialTemplateId,
}: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const { has: hasFeature, isUnlimited } = useFeatures();
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

  /** Whether the trial info sheet should appear for this candidate. */
  const needsTrialInfo = (id: string): boolean => {
    if (!isUnlimited) return false;
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
                <View
                  className={`rounded-3xl overflow-hidden bg-gray-50 border-2 ${
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
                  <View className="aspect-[9/16] bg-gray-100">
                    <AppImage
                      source={theme.screenshot}
                      contentFit="cover"
                      style={{
                        width: "100%",
                        height: "100%",
                        opacity: locked ? 0.6 : 1,
                      }}
                    />
                  </View>

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

                  {/* Currently-applied indicator — distinct from "selected
                      in this picker" so the vendor can see what's live.
                      Suppressed when locked so the Upgrade pill owns the
                      visual space. */}
                  {storeData?.templateId === theme.id && !locked && (
                    <View className="absolute top-2.5 left-2.5 bg-gray-900/85 px-2 py-0.5 rounded-full">
                      <Text className="text-white text-[9px] font-extrabold tracking-wider uppercase">
                        Active
                      </Text>
                    </View>
                  )}
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
