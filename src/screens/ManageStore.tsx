import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Linking,
  Alert,
  Clipboard,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { AppImage } from "../components/AppImage";

import HeroSectionModal from "../components/HeroSectionModal";
import AboutSectionModal from "../components/AboutSectionModal";
import StoreLogoModal from "../components/StoreLogoModal";
import BrandAssetsModal from "../components/BrandAssetsModal";
import ThemeLayoutModal from "../components/ThemeAndLayout";
import TypographyModal from "../components/TypographyModal";
import ContactUsSectionModal from "../components/ContactUsModal";
import CustomerReviewsModal from "../components/CustomerReviewsModal";
import FeaturedProductsModal from "../components/FeaturedProductsModal";
import PopularCategoriesModal from "../components/PopularCategoriesModal";
import PromoSocialModal from "../components/PromoSocialModal";
import WhyChooseUsModal from "../components/WhyChooseUsModal";
import { FeaturePaywallSheet } from "../components/FeaturePaywallSheet";
import { useFeatures } from "../hooks/useFeatures";
import { FEATURES, FeatureKey } from "../lib/features";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabKey = "sections" | "branding";

type SectionTone = "blue" | "purple" | "emerald" | "pink" | "orange" | "cyan";

const TONE_STYLES: Record<
  SectionTone,
  { bg: string; iconColor: string }
> = {
  blue: { bg: "bg-blue-50", iconColor: "#2563eb" },
  purple: { bg: "bg-violet-50", iconColor: "#7c3aed" },
  emerald: { bg: "bg-emerald-50", iconColor: "#059669" },
  pink: { bg: "bg-pink-50", iconColor: "#db2777" },
  orange: { bg: "bg-orange-50", iconColor: "#ea580c" },
  cyan: { bg: "bg-cyan-50", iconColor: "#0891b2" },
};

interface SectionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  tone: SectionTone;
  configured: boolean;
  preview?: React.ReactNode;
  onPress: () => void;
  /** When true, the row replaces the SET/EMPTY badge with an UPGRADE pill,
   *  dims the icon, and lets the parent intercept the tap to surface a
   *  paywall instead of opening the underlying editor. The press handler
   *  itself is unchanged — gate the action in the parent's onPress. */
  locked?: boolean;
}

function SectionRow({
  icon,
  title,
  subtitle,
  tone,
  configured,
  preview,
  onPress,
  locked,
}: SectionRowProps) {
  const toneStyle = TONE_STYLES[tone];
  const handlePress = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 mb-3 border border-gray-100 active:bg-gray-50"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      <View
        className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
          locked ? "bg-gray-100" : toneStyle.bg
        }`}
      >
        <Ionicons
          name={icon}
          size={20}
          color={locked ? "#9ca3af" : toneStyle.iconColor}
        />
      </View>

      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 mb-0.5">
          <Text
            className={`text-[15px] font-bold ${
              locked ? "text-gray-700" : "text-gray-900"
            }`}
            numberOfLines={1}
          >
            {title}
          </Text>
          {locked ? (
            <View className="flex-row items-center gap-1 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
              <Ionicons name="lock-closed" size={9} color="#2563eb" />
              <Text className="text-[10px] font-extrabold text-blue-700 tracking-wide">
                UPGRADE
              </Text>
            </View>
          ) : configured ? (
            <View className="flex-row items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <Text className="text-[10px] font-bold text-emerald-700">
                SET
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-1 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">
              <View className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <Text className="text-[10px] font-bold text-gray-500">
                EMPTY
              </Text>
            </View>
          )}
        </View>
        <Text
          className="text-[12px] text-gray-500 leading-4"
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      {preview && <View className="ml-3">{preview}</View>}

      <MaterialIcons
        name="chevron-right"
        size={22}
        color="#9ca3af"
        style={{ marginLeft: 4 }}
      />
    </Pressable>
  );
}

export default function ManageStoreScreen() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabKey>("sections");
  const [heroVisible, setHeroVisible] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showContactUsModal, setShowContactUsModal] = useState(false);
  const [showBrandAssetsModal, setShowBrandAssetsModal] = useState(false);
  const [showStoreLogoModal, setShowStoreLogoModal] = useState(false);
  const [showThemeLayoutModal, setShowThemeLayoutModal] = useState(false);
  const [showTypographyModal, setShowTypographyModal] = useState(false);
  // Advanced storefront content (Grace template). Each section is a
  // standalone bottom-sheet editor that mutates one slice of
  // `storeFrontJson` and saves through the shared
  // `updateVendorSettings` path used by the other modals above.
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showPromoSocialModal, setShowPromoSocialModal] = useState(false);
  const [showWhyChooseUsModal, setShowWhyChooseUsModal] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null);

  const { storeData, updateVendorSettings, loading } = useVendor();
  const { has: hasFeature } = useFeatures();
  const canUseLogo = hasFeature(FEATURES.STORE_LOGO);
  // Gates the four "Advanced Content" rows (Reviews / Featured /
  // Categories / Promo & Social) as a single bundle — the feature
  // copy in FEATURE_META already lists all four together so vendors
  // on the lower plan see one paywall that explains the whole set
  // instead of being nibbled by four separate locked rows.
  const canUseAdvancedSetup = hasFeature(FEATURES.STORE_ADVANCED_SETUP);

  const heroConfigured = useMemo(() => {
    const arr = (storeData as any)?.storeFrontJson?.heroArr;
    return Array.isArray(arr) && arr.length > 0;
  }, [storeData]);
  const aboutConfigured = useMemo(() => {
    const json = (storeData as any)?.storeFrontJson;
    return !!(json?.aboutTitle || json?.aboutBody);
  }, [storeData]);
  const contactConfigured = useMemo(() => {
    return !!(storeData as any)?.storeFrontJson?.contactSection;
  }, [storeData]);
  const reviewsConfigured = useMemo(() => {
    const arr = (storeData as any)?.storeFrontJson?.testimonials;
    return Array.isArray(arr) && arr.length > 0;
  }, [storeData]);
  const featuredConfigured = useMemo(() => {
    const arr = (storeData as any)?.storeFrontJson?.featuredProductIds;
    return Array.isArray(arr) && arr.length > 0;
  }, [storeData]);
  const categoriesConfigured = useMemo(() => {
    const arr = (storeData as any)?.storeFrontJson?.popularCategories;
    return Array.isArray(arr) && arr.length > 0;
  }, [storeData]);
  const promoSocialConfigured = useMemo(() => {
    const json: any = (storeData as any)?.storeFrontJson;
    const hasPromo = !!(json?.promoBar?.text ?? "").trim();
    const social = json?.socialLinks ?? {};
    const hasSocial = Object.values(social).some(
      (v) => typeof v === "string" && v.trim().length > 0,
    );
    return hasPromo || hasSocial;
  }, [storeData]);
  const whyChooseUsConfigured = useMemo(() => {
    const arr = (storeData as any)?.storeFrontJson?.whyChooseUs;
    return Array.isArray(arr) && arr.length > 0;
  }, [storeData]);
  const themeConfigured = !!storeData?.templateId;
  const typographyConfigured = !!(storeData as any)?.storeFrontJson?.fontFamily;
  const logoConfigured = !!storeData?.logoUrl;
  const brandConfigured = !!(
    storeData?.primaryColor ||
    storeData?.secondaryColor ||
    storeData?.accentColor
  );

  const sectionsCount = [heroConfigured, aboutConfigured, contactConfigured]
    .filter(Boolean).length;
  const brandingCount = [themeConfigured, logoConfigured, brandConfigured]
    .filter(Boolean).length;

  const isPublished = !!storeData?.isPublished;
  // Prefer the vendor's custom domain when an admin has marked their
  // DomainOrder as Active (which stamps `customDomain` +
  // `hasCustomDomain` server-side). Otherwise fall back to the
  // `{slug}.orderlystores.com` form. The fallback ensures the screen
  // never blanks out during cutover or for vendors who never bought a
  // domain.
  const customDomain = storeData?.customDomain?.trim() || null;
  const hasCustomDomain = !!storeData?.hasCustomDomain;
  const activeUrlHost =
    customDomain && hasCustomDomain
      ? customDomain
      : storeData?.slugUrl
        ? `${storeData.slugUrl}.orderlystores.com`
        : null;
  const storeUrl = activeUrlHost ?? "yourstore.orderlystores.com";

  const openStoreFrontLink = () => {
    if (activeUrlHost) {
      Linking.openURL(`https://${activeUrlHost}/`).catch((err) =>
        console.error("Couldn't load page", err)
      );
    }
  };

  const handleCopyLink = () => {
    if (activeUrlHost) {
      Clipboard.setString(`https://${activeUrlHost}/`);
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {}
        );
      }
      Alert.alert("Copied", "Store link copied to clipboard");
    }
  };

  const handleTogglePublish = () => {
    if (loading) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    updateVendorSettings({ isPublished: !isPublished });
  };

  const handleTabChange = (tab: TabKey) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setActiveTab(tab);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title="Manage Store"
        right={
          <Pressable
            onPress={openStoreFrontLink}
            className="flex-row items-center gap-1.5 px-3 h-9 rounded-full bg-blue-50 border border-blue-100"
            hitSlop={6}
          >
            <Ionicons name="eye-outline" size={16} color="#2563eb" />
            <Text className="text-[13px] font-semibold text-blue-700">
              Preview
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Store identity hero */}
        <View
          className="mx-5 mt-4 mb-5 bg-white rounded-3xl border border-gray-100 overflow-hidden"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View className="px-5 pt-5 pb-4">
            <View className="flex-row items-center">
              {/* Logo */}
              {logoConfigured ? (
                <View className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mr-3.5">
                  <AppImage
                    uri={storeData?.logoUrl ?? null}
                    style={{ width: "100%", height: "100%" }}
                  />
                </View>
              ) : (
                <View className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center mr-3.5">
                  <Ionicons name="storefront" size={26} color="#2563eb" />
                </View>
              )}

              {/* Store name + status */}
              <View className="flex-1 min-w-0">
                <Text
                  className="text-[18px] font-extrabold text-gray-900 mb-1"
                  numberOfLines={1}
                >
                  {storeData?.storeName || "My Store"}
                </Text>
                {isPublished ? (
                  <View className="flex-row items-center gap-1.5 self-start bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <Text className="text-[10px] font-bold text-emerald-700 tracking-wider">
                      LIVE
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-1.5 self-start bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    <Text className="text-[10px] font-bold text-gray-600 tracking-wider">
                      OFFLINE
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* URL row */}
          <View className="flex-row items-center bg-gray-50 border-t border-gray-100 px-5 py-3">
            <Ionicons
              name="globe-outline"
              size={16}
              color="#6b7280"
              style={{ marginRight: 8 }}
            />
            <Text
              className="flex-1 text-[13px] text-gray-700 font-medium"
              numberOfLines={1}
            >
              {storeUrl}
            </Text>
            <Pressable
              onPress={handleCopyLink}
              className="w-8 h-8 items-center justify-center rounded-full active:bg-gray-200 ml-1"
              hitSlop={6}
            >
              <Ionicons name="copy-outline" size={16} color="#374151" />
            </Pressable>
            <Pressable
              onPress={openStoreFrontLink}
              className="w-8 h-8 items-center justify-center rounded-full active:bg-gray-200"
              hitSlop={6}
            >
              <Ionicons name="open-outline" size={16} color="#374151" />
            </Pressable>
          </View>
        </View>

        {/* Tab pills */}
        <View className="px-5 mb-4">
          <View className="flex-row bg-gray-100 rounded-2xl p-1">
            {(
              [
                {
                  key: "sections" as const,
                  label: "Sections",
                  count: sectionsCount,
                  total: 3,
                },
                {
                  key: "branding" as const,
                  label: "Branding",
                  count: brandingCount,
                  total: 3,
                },
              ]
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleTabChange(tab.key)}
                  className={`flex-1 flex-row items-center justify-center gap-2 h-10 rounded-xl ${
                    isActive ? "bg-white" : ""
                  }`}
                  style={
                    isActive
                      ? {
                          shadowColor: "#0f172a",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.06,
                          shadowRadius: 3,
                          elevation: 1,
                        }
                      : undefined
                  }
                >
                  <Text
                    className={`text-[14px] font-bold ${
                      isActive ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {tab.label}
                  </Text>
                  <Text
                    className={`text-[11px] font-bold ${
                      isActive ? "text-blue-600" : "text-gray-400"
                    }`}
                  >
                    {tab.count}/{tab.total}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section / Branding list */}
        <View className="px-5">
          {activeTab === "sections" ? (
            <>
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-3 px-1">
                Storefront Content
              </Text>

              <SectionRow
                icon="image-outline"
                title="Hero Section"
                subtitle="The first thing every visitor sees"
                tone="blue"
                configured={heroConfigured}
                onPress={() => setHeroVisible(true)}
              />

              <SectionRow
                icon="information-circle-outline"
                title="About Us"
                subtitle="Tell your story and build trust"
                tone="purple"
                configured={aboutConfigured}
                onPress={() => setShowAboutModal(true)}
              />

              <SectionRow
                icon="call-outline"
                title="Contact Us"
                subtitle="How customers can reach you"
                tone="emerald"
                configured={contactConfigured}
                onPress={() => setShowContactUsModal(true)}
              />

              {/* Advanced storefront content — Grace template slots.
                  Vendors on basic templates can still set these; the
                  data is ignored until they switch to a richer
                  template. */}
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mt-6 mb-3 px-1">
                Advanced Content
              </Text>

              <SectionRow
                icon="chatbubble-ellipses-outline"
                title="Customer Reviews"
                subtitle={
                  canUseAdvancedSetup
                    ? "Quotes that build trust at a glance"
                    : "Available on a higher plan"
                }
                tone="purple"
                configured={canUseAdvancedSetup && reviewsConfigured}
                locked={!canUseAdvancedSetup}
                onPress={() => {
                  if (!canUseAdvancedSetup) {
                    setPaywallFeature(FEATURES.STORE_ADVANCED_SETUP);
                    return;
                  }
                  setShowReviewsModal(true);
                }}
              />

              <SectionRow
                icon="star-outline"
                title="Featured Products"
                subtitle={
                  canUseAdvancedSetup
                    ? "Pick up to 3 to highlight"
                    : "Available on a higher plan"
                }
                tone="orange"
                configured={canUseAdvancedSetup && featuredConfigured}
                locked={!canUseAdvancedSetup}
                onPress={() => {
                  if (!canUseAdvancedSetup) {
                    setPaywallFeature(FEATURES.STORE_ADVANCED_SETUP);
                    return;
                  }
                  setShowFeaturedModal(true);
                }}
              />

              <SectionRow
                icon="grid-outline"
                title="Popular Categories"
                subtitle={
                  canUseAdvancedSetup
                    ? "Surface up to 6 category tiles"
                    : "Available on a higher plan"
                }
                tone="cyan"
                configured={canUseAdvancedSetup && categoriesConfigured}
                locked={!canUseAdvancedSetup}
                onPress={() => {
                  if (!canUseAdvancedSetup) {
                    setPaywallFeature(FEATURES.STORE_ADVANCED_SETUP);
                    return;
                  }
                  setShowCategoriesModal(true);
                }}
              />

              <SectionRow
                icon="megaphone-outline"
                title="Promo Bar & Social"
                subtitle={
                  canUseAdvancedSetup
                    ? "Top strip text and footer social links"
                    : "Available on a higher plan"
                }
                tone="pink"
                configured={canUseAdvancedSetup && promoSocialConfigured}
                locked={!canUseAdvancedSetup}
                onPress={() => {
                  if (!canUseAdvancedSetup) {
                    setPaywallFeature(FEATURES.STORE_ADVANCED_SETUP);
                    return;
                  }
                  setShowPromoSocialModal(true);
                }}
              />

              <SectionRow
                icon="ribbon-outline"
                title="Why Choose Us"
                subtitle={
                  canUseAdvancedSetup
                    ? "Up to 4 short promises shown below the hero"
                    : "Available on a higher plan"
                }
                tone="emerald"
                configured={canUseAdvancedSetup && whyChooseUsConfigured}
                locked={!canUseAdvancedSetup}
                onPress={() => {
                  if (!canUseAdvancedSetup) {
                    setPaywallFeature(FEATURES.STORE_ADVANCED_SETUP);
                    return;
                  }
                  setShowWhyChooseUsModal(true);
                }}
              />
            </>
          ) : (
            <>
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-3 px-1">
                Brand & Theme
              </Text>

              <SectionRow
                icon="color-palette-outline"
                title="Theme & Layout"
                subtitle="Choose how your storefront looks"
                tone="pink"
                configured={themeConfigured}
                onPress={() => setShowThemeLayoutModal(true)}
              />

              <SectionRow
                icon="text-outline"
                title="Typography"
                subtitle="The font your whole storefront uses"
                tone="cyan"
                configured={typographyConfigured}
                onPress={() => setShowTypographyModal(true)}
              />

              <SectionRow
                icon="image-outline"
                title="Store Logo"
                subtitle={
                  canUseLogo
                    ? "Upload your brand mark"
                    : "Available on a higher plan"
                }
                tone="orange"
                configured={canUseLogo && logoConfigured}
                locked={!canUseLogo}
                preview={
                  canUseLogo && logoConfigured ? (
                    <View className="w-9 h-9 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                      <AppImage
                        uri={storeData?.logoUrl ?? null}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </View>
                  ) : null
                }
                onPress={() => {
                  if (!canUseLogo) {
                    setPaywallFeature(FEATURES.STORE_LOGO);
                    return;
                  }
                  setShowStoreLogoModal(true);
                }}
              />

              <SectionRow
                icon="brush-outline"
                title="Brand Assets"
                subtitle="Pick your primary brand colors"
                tone="cyan"
                configured={brandConfigured}
                preview={
                  brandConfigured ? (
                    <View className="flex-row -space-x-1.5">
                      {[
                        storeData?.primaryColor,
                        storeData?.secondaryColor,
                        storeData?.accentColor,
                      ]
                        .filter(Boolean)
                        .slice(0, 3)
                        .map((c, i) => (
                          <View
                            key={`${c}-${i}`}
                            className="w-5 h-5 rounded-full border-2 border-white"
                            style={{ backgroundColor: c as string }}
                          />
                        ))}
                    </View>
                  ) : null
                }
                onPress={() => setShowBrandAssetsModal(true)}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky publish CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-3 pb-6"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <Pressable
          onPress={handleTogglePublish}
          disabled={loading}
          className={`rounded-2xl h-14 flex-row items-center justify-center ${
            loading
              ? "bg-blue-300"
              : isPublished
              ? "bg-gray-900"
              : "bg-blue-600"
          }`}
          style={{
            shadowColor: isPublished ? "#0f172a" : "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons
                name={isPublished ? "pause-circle-outline" : "rocket-outline"}
                size={18}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white font-bold text-[15px]">
                {isPublished ? "Take Store Offline" : "Publish My Store"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Modals */}
      <HeroSectionModal
        visible={heroVisible}
        onClose={() => setHeroVisible(false)}
        initialData={(storeData as any)?.storeFrontJson?.heroArr}
      />
      <AboutSectionModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        initialTitle={(storeData as any)?.storeFrontJson?.aboutTitle}
        initialBody={(storeData as any)?.storeFrontJson?.aboutBody}
      />
      <ContactUsSectionModal
        visible={showContactUsModal}
        onClose={() => setShowContactUsModal(false)}
        initialContact={(storeData as any)?.storeFrontJson?.contactSection}
      />
      <BrandAssetsModal
        visible={showBrandAssetsModal}
        onClose={() => setShowBrandAssetsModal(false)}
        initialPrimary={storeData?.primaryColor}
        initialSecondary={storeData?.secondaryColor}
        initialAccent={storeData?.accentColor}
      />
      <StoreLogoModal
        visible={showStoreLogoModal}
        onClose={() => setShowStoreLogoModal(false)}
        initialLogo={storeData?.logoUrl}
      />
      <ThemeLayoutModal
        visible={showThemeLayoutModal}
        onClose={() => setShowThemeLayoutModal(false)}
        initialTemplateId={storeData?.templateId}
      />

      <TypographyModal
        visible={showTypographyModal}
        onClose={() => setShowTypographyModal(false)}
      />

      {/* Paywall — opened when a vendor taps a gated section their plan
          doesn't include (currently the Store Logo row). */}
      <FeaturePaywallSheet
        visible={paywallFeature != null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature}
      />

      {/* Advanced storefront content modals — Grace template slots. */}
      <CustomerReviewsModal
        visible={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
      />
      <FeaturedProductsModal
        visible={showFeaturedModal}
        onClose={() => setShowFeaturedModal(false)}
      />
      <PopularCategoriesModal
        visible={showCategoriesModal}
        onClose={() => setShowCategoriesModal(false)}
      />
      <PromoSocialModal
        visible={showPromoSocialModal}
        onClose={() => setShowPromoSocialModal(false)}
      />
      <WhyChooseUsModal
        visible={showWhyChooseUsModal}
        onClose={() => setShowWhyChooseUsModal(false)}
      />
    </View>
  );
}
