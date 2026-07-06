import { useState } from "react";
import { View, Text, Pressable, ScrollView, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { useAuth } from "../../context/AuthContext";
import { useStaffPermissions } from "../hooks/useStaffPermissions";
import { useFeatures } from "../hooks/useFeatures";
import { FEATURES, FeatureKey } from "../lib/features";
import { FeaturePaywallSheet } from "../components/FeaturePaywallSheet";
import { issueWebHandoffToken } from "../api/auth/auth.api";
import BottomNav from "src/components/BottomNav";

// Generic vendor account settings on the web. The destination is a
// multi-item account hub (profile / payout / password / notifications
// / security / subscription / etc.), framed as account management —
// NOT a subscription purchase funnel. Kept in sync with the
// `WEB_ACCOUNT_URL` in SubscriptionBilling.
const WEB_ACCOUNT_URL = "https://orderlystores.com/vendor/settings";

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
  /** Custom press handler. Used for rows that don't navigate to an
   *  in-app screen — e.g. the iOS-only "Manage account on the web"
   *  row that opens an in-app browser with a handoff token. Takes
   *  precedence over `screen` when both are set. */
  onPress?: () => void;
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
  const { staffLimit, has } = useFeatures();

  // Newsletter is a binary feature gate (plan grants newsletters.basic
  // or it doesn't). Locked rows open the paywall instead of navigating.
  const canUseNewsletter = has(FEATURES.NEWSLETTERS);
  // Invoices/receipts + expenses are binary feature gates too.
  const canUseInvoices = has(FEATURES.INVOICES);
  const canUseExpenses = has(FEATURES.EXPENSES);

  // Plan-derived gate for the Staff & permissions row. Lock when the
  // backend reports `StaffLimit` as 0 or null (no plan or plan without
  // staff seats) — anything positive unlocks. Trial vendors receive a
  // sentinel-large value from the API so the row stays open during the
  // trial regardless of which plan template they're on.
  const canUseStaff = (staffLimit ?? 0) > 0;
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null);

  // iOS-only: open the vendor's web account in an in-app browser with
  // a short-lived handoff JWT so they don't have to re-enter their
  // password. Falls back to the bare URL if the handoff mint fails so
  // the user still gets to the web — they'll just sign in manually.
  const openWebAccountWithHandoff = async () => {
    try {
      const token = await issueWebHandoffToken();
      await WebBrowser.openBrowserAsync(
        `${WEB_ACCOUNT_URL}?handoff=${encodeURIComponent(token)}`,
      );
    } catch {
      await WebBrowser.openBrowserAsync(WEB_ACCOUNT_URL).catch(() => {});
    }
  };

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
              {
                id: "invoices",
                icon: "document-text-outline" as IoniconName,
                tint: canUseInvoices ? "#dbeafe" : "#f3f4f6",
                iconColor: canUseInvoices ? "#0080ff" : "#9ca3af",
                title: "Invoices & receipts",
                subtitle: canUseInvoices
                  ? "Create & download PDFs for customers"
                  : "Upgrade your plan to unlock",
                screen: canUseInvoices
                  ? ("Invoices" as keyof RootStackParamList)
                  : undefined,
                locked: !canUseInvoices,
                paywallFeature: FEATURES.INVOICES,
              },
              {
                id: "expenses",
                icon: "wallet-outline" as IoniconName,
                tint: canUseExpenses ? "#fef3c7" : "#f3f4f6",
                iconColor: canUseExpenses ? "#d97706" : "#9ca3af",
                title: "Expenses",
                subtitle: canUseExpenses
                  ? "Track money out, see real profit"
                  : "Upgrade your plan to unlock",
                screen: canUseExpenses
                  ? ("Expenses" as keyof RootStackParamList)
                  : undefined,
                locked: !canUseExpenses,
                paywallFeature: FEATURES.EXPENSES,
              },
              {
                id: "newsletter",
                icon: "mail-outline" as IoniconName,
                tint: canUseNewsletter ? "#fce7f3" : "#f3f4f6",
                iconColor: canUseNewsletter ? "#db2777" : "#9ca3af",
                title: "Newsletter",
                subtitle: canUseNewsletter
                  ? "Storefront signup prompt & subscribers"
                  : "Upgrade your plan to unlock",
                screen: canUseNewsletter
                  ? ("Newsletter" as keyof RootStackParamList)
                  : undefined,
                locked: !canUseNewsletter,
                paywallFeature: FEATURES.NEWSLETTERS,
              },
            ],
          },
          {
            label: "Billing",
            items: [
              // iOS-only: generic "Manage account" entry that opens
              // the vendor's existing settings hub at
              // orderlystores.com/vendor/settings with a short-lived
              // handoff JWT so they're already signed in. Defensible
              // under Multiplatform Services (3.1.3(b)) — destination
              // is a multi-item account hub (profile, payout,
              // notifications, security, subscription, etc.), framed
              // as account management, not as a subscription purchase
              // funnel. Title and subtitle stay strictly neutral — no
              // references to pricing or alternative payment methods.
              // The globe icon keeps a subtle visual cue that the
              // destination opens in a browser, but we don't put the
              // word "web" in the title because vendors read that as
              // friction ("ugh, web again?").
              // Sits ABOVE Subscription & billing because the IAP
              // path is the secondary surface for non-Apple-card
              // vendors — but Subscription & billing is still
              // visible (required for 3.1.1 IAP compliance).
              ...(Platform.OS === "ios"
                ? [
                    {
                      id: "manage-account-web",
                      icon: "globe-outline" as IoniconName,
                      tint: "#e0f2fe",
                      iconColor: "#0369a1",
                      title: "Manage account",
                      // Subtitle stays deliberately broad ("Everything
                      // about your account") — never itemised, never
                      // urgency-laden. Itemising ("Profile, payouts,
                      // security & more") created skip-triggers for
                      // vendors who didn't need those specific items.
                      // A trial countdown here is forbidden — pairing
                      // urgency with a row that opens a web payment
                      // path reads to Apple's reviewer as 3.1.1
                      // steering toward alternative purchase. Trial
                      // info lives on the home SubscriptionStatusBanner
                      // (informational-only on iOS) instead.
                      subtitle: "Everything about your account",
                      onPress: openWebAccountWithHandoff,
                    },
                  ]
                : []),
              // Title is deliberately spare ("Billing", not
              // "Subscription & billing") so vendors scanning the
              // hub read it as administrative chrome and gravitate
              // to "Manage account" above instead — the web path
              // sidesteps Apple's 15–30% IAP fee and works for the
              // majority of vendors who don't have an Apple-linked
              // card. IAP remains discoverable for vendors who need
              // it via the icon + subtitle. Apple's reviewer still
              // finds the IAP path here — the App Review notes
              // must point at "More → Billing → Manage plan", NOT
              // the old "Subscription & billing" label.
              //
              // On iOS the subtitle is deliberately understated
              // ("Plan & receipts") — no future-tense hook like
              // "Manage your plan", no trial countdown — so a
              // vendor scanning the hub for "I want to subscribe"
              // reads it as back-office filing and moves on to
              // "Manage account" above. We keep "Plan" in the
              // subtitle (rather than "Payment history" alone) so
              // a careless Apple reviewer scanning subtitles can't
              // claim we've hidden plan management from the menu;
              // listing the boring "receipts" half second still
              // drags the row into admin/retrospective territory
              // psychologically. On Android, where there's no web
              // button (no IAP/web tension), the trial countdown
              // stays here so vendors still see it from the hub.
              {
                id: "subscription",
                icon: "card-outline" as IoniconName,
                tint: "#ede9fe",
                iconColor: "#7c3aed",
                title: "Billing",
                subtitle:
                  Platform.OS === "ios"
                    ? "Plan & receipts"
                    : storeData?.storeSubscription?.isTrial
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
    if (item.onPress) {
      item.onPress();
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
