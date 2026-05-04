import { useState } from "react";
import { View, Text, Pressable, ScrollView, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { useAuth } from "../../context/AuthContext";
import { useStaffPermissions } from "../hooks/useStaffPermissions";
import { useFeatures } from "../hooks/useFeatures";
import { FEATURES, FeatureKey } from "../lib/features";
import { FeaturePaywallSheet } from "../components/FeaturePaywallSheet";
import BottomNav from "src/components/BottomNav";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type IoniconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  id: string;
  icon: IoniconName;
  tint: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  screen?: keyof RootStackParamList;
  /** When true, the row renders in a locked state (greyed icon +
   *  padlock badge) and tapping opens the paywall sheet for
   *  `paywallFeature` instead of navigating. */
  locked?: boolean;
  /** Feature key the paywall sheet should pitch when this row is
   *  tapped while locked. Required when `locked` is true. */
  paywallFeature?: FeatureKey;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function MoreHub() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { storeData } = useVendor();
  const { user } = useAuth();
  const perms = useStaffPermissions();
  const { staffLimit } = useFeatures();

  // Plan-derived gate for the Staff & permissions row. Lock when the
  // backend reports `StaffLimit` as 0 or null (no plan or plan without
  // staff seats) — anything positive unlocks. Trial vendors receive a
  // sentinel-large value from the API so the row stays open during the
  // trial regardless of which plan template they're on.
  const canUseStaff = (staffLimit ?? 0) > 0;
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null);

  // Owner-only groups (Store, Billing, Workspace) are hidden for staff
  // sessions because the underlying screens either mutate vendor-level
  // state (bank, store branding, subscription) or manage other staff.
  // Staff still see Profile + Support.
  const isOwnerView = !perms.isStaff;

  const getInitials = (name: string) => {
    if (!name) return "S";
    return name.trim().charAt(0).toUpperCase();
  };

  const groups: MenuGroup[] = [
    ...(isOwnerView
      ? [
          {
            label: "Store",
            items: [
              {
                id: "store-info",
                icon: "storefront-outline" as IoniconName,
                tint: "#dbeafe",
                iconColor: "#2563eb",
                title: "Store information",
                subtitle: "Brand, address, working hours",
                screen: "StoreInformation" as keyof RootStackParamList,
              },
              {
                id: "payout-settings",
                icon: "wallet-outline" as IoniconName,
                tint: "#d1fae5",
                iconColor: "#059669",
                title: "Bank settings",
                subtitle: storeData?.accountNumber
                  ? `•••• ${storeData.accountNumber.slice(-4)}`
                  : "Set up payouts",
                screen: "PayoutSettings" as keyof RootStackParamList,
              },
              {
                id: "payment-setup",
                icon: "cash-outline" as IoniconName,
                tint: "#fef3c7",
                iconColor: "#b45309",
                title: "Payment setup",
                subtitle:
                  storeData?.feeBearer === ("direct" as any)
                    ? "Direct to your bank"
                    : "Online payment (Paystack)",
                screen: "PaymentSetup" as keyof RootStackParamList,
              },
            ],
          },
          {
            label: "Billing",
            items: [
              {
                id: "subscription",
                icon: "card-outline" as IoniconName,
                tint: "#ede9fe",
                iconColor: "#7c3aed",
                title: "Subscription & billing",
                subtitle: storeData?.storeSubscription?.isTrial
                  ? `${storeData?.storeSubscription?.daysRemaining ?? 0} days left in trial`
                  : "Manage your plan",
                screen: "SubscriptionBilling" as keyof RootStackParamList,
              },
            ],
          },
          {
            label: "Workspace",
            items: [
              {
                id: "staff",
                icon: "people-outline" as IoniconName,
                tint: canUseStaff ? "#dbeafe" : "#f3f4f6",
                iconColor: canUseStaff ? "#2563eb" : "#9ca3af",
                title: "Staff & permissions",
                subtitle: canUseStaff
                  ? "Invite teammates with scoped access"
                  : "Upgrade your plan to unlock",
                screen: canUseStaff
                  ? ("StaffManagement" as keyof RootStackParamList)
                  : undefined,
                locked: !canUseStaff,
                paywallFeature: FEATURES.STAFF_ACCOUNTS,
              },
            ],
          },
        ]
      : []),
    {
      label: "Support",
      items: [
        {
          id: "help",
          icon: "help-circle-outline",
          tint: "#cffafe",
          iconColor: "#0891b2",
          title: "Help & support",
          subtitle: "Get answers or contact us",
          screen: "HelpSupport",
        },
        {
          id: "legal",
          icon: "document-text-outline",
          tint: "#ffe4e6",
          iconColor: "#e11d48",
          title: "Legal & policies",
          subtitle: "Terms, privacy, refunds",
          screen: "LegalPolicies",
        },
      ],
    },
  ];

  const handleMenuPress = (item: MenuItem) => {
    haptic();
    // Locked rows surface the paywall sheet instead of navigating —
    // the destination screen wouldn't render anything useful for a
    // vendor whose plan doesn't include the feature anyway.
    if (item.locked && item.paywallFeature) {
      setPaywallFeature(item.paywallFeature);
      return;
    }
    if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Top bar — title only. No back arrow because this is a tab
          destination, not a pushed screen. */}
      <View className="px-6 pt-4 pb-2">
        <Text
          className="text-[22px] text-gray-900"
          style={{
            fontFamily: "PlusJakartaSans_700Bold",
            letterSpacing: -0.5,
          }}
        >
          More
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Profile pill — compact identity row at the top of the hub.
            Tapping leads to the dedicated Profile screen with the full
            hero + personal-account items. Reads as "your profile" not
            as "this is the profile page" — keeps More feeling like a
            settings hub. */}
        <View className="px-5 pt-2">
          <Pressable
            onPress={() => {
              haptic();
              navigation.navigate("Profile");
            }}
            className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 py-3.5 active:bg-gray-50"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <View className="w-11 h-11 rounded-full bg-blue-50 items-center justify-center border border-blue-100 mr-3">
              <Text
                className="text-blue-600"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 18,
                }}
              >
                {getInitials(storeData?.storeName || user?.name || "S")}
              </Text>
            </View>
            <View className="flex-1 min-w-0 pr-2">
              <Text
                className="text-[14.5px] text-gray-900"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  letterSpacing: -0.2,
                }}
                numberOfLines={1}
              >
                {storeData?.storeName || user?.name || "Your profile"}
              </Text>
              <Text className="text-[12px] text-gray-500 mt-0.5" numberOfLines={1}>
                {user?.email || storeData?.email || "View your account"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Menu groups */}
        {groups.map((group) => (
          <View key={group.label} className="px-5 mt-6">
            <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3 px-1">
              {group.label}
            </Text>
            <View
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              {group.items.map((item, idx) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleMenuPress(item)}
                  android_ripple={{ color: "#f3f4f6" }}
                  className={`flex-row items-center px-4 py-3.5 active:bg-gray-50 ${
                    idx !== group.items.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center relative"
                    style={{ backgroundColor: item.tint }}
                  >
                    <Ionicons name={item.icon} size={19} color={item.iconColor} />
                    {/* Padlock badge — same treatment as the locked
                        Visits tile on Home so vendors recognise the
                        upgrade pattern across the app. */}
                    {item.locked && (
                      <View
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white items-center justify-center"
                        style={{
                          shadowColor: "#0f172a",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.12,
                          shadowRadius: 2,
                          elevation: 2,
                        }}
                      >
                        <Ionicons name="lock-closed" size={8} color="#6b7280" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 ml-3 pr-2">
                    <Text
                      className={`text-[14.5px] ${item.locked ? "text-gray-500" : "text-gray-900"}`}
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        letterSpacing: -0.2,
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text
                        className="text-[12px] text-gray-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Version footer */}
        <View className="items-center mt-8">
          <Text className="text-[11px] text-gray-400 font-medium">
            Version 2.4.0 · Build 1042
          </Text>
        </View>
      </ScrollView>

      <FeaturePaywallSheet
        visible={paywallFeature != null}
        feature={paywallFeature}
        onClose={() => setPaywallFeature(null)}
      />

      <BottomNav />
    </SafeAreaView>
  );
}
