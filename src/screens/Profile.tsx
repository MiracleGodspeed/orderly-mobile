import { View, Text, Pressable, ScrollView, StatusBar, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { useAuth } from "../../context/AuthContext";

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
  // Destructive rows (currently just "Delete account") render in rose
  // and skip the bold title weight so they read as a warning rather
  // than just another menu option.
  destructive?: boolean;
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

export default function Profile() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { storeData } = useVendor();
  const { logout, user } = useAuth();

  const getInitials = (name: string) => {
    if (!name) return "S";
    return name.trim().charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Profile is the personal-account sub-screen reached from MoreHub —
  // everything store / billing / workspace lives on MoreHub now.
  // Profile only carries items that describe the logged-in user
  // themselves (their name, their password). Staff sessions see the
  // same items because both apply to them too.
  const groups: MenuGroup[] = [
    {
      label: "Account",
      items: [
        {
          id: "personal-details",
          icon: "person-outline",
          tint: "#e0e7ff",
          iconColor: "#4f46e5",
          title: "Personal details",
          subtitle: "Your name and contact info",
          screen: "PersonalDetails",
        },
        {
          id: "security",
          icon: "shield-checkmark-outline",
          tint: "#f1f5f9",
          iconColor: "#475569",
          title: "Security",
          subtitle: "Password, sessions, 2FA",
          screen: "Security",
        },
        {
          id: "notifications",
          icon: "notifications-outline",
          tint: "#dbeafe",
          iconColor: "#0080ff",
          title: "Notifications",
          subtitle: "Choose what Orderly tells you about",
          screen: "NotificationProfile",
        },
        // App Store guideline 5.1.1(v): in-app account deletion must
        // be reachable, not buried. Lives in the Account group so a
        // reviewer (or vendor) sees it the moment they open Profile.
        {
          id: "delete-account",
          icon: "trash-outline",
          tint: "#fee2e2",
          iconColor: "#e11d48",
          title: "Delete account",
          subtitle: "Permanently remove your account and data",
          screen: "DeleteAccount",
          destructive: true,
        },
      ],
    },
  ];

  const visibleGroups = groups;

  const handleMenuPress = (item: MenuItem) => {
    haptic();
    if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  const isVerified = storeData?.isVerified;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Top bar */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text
            className="text-[16px] text-gray-900"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Profile
          </Text>
          <View className="w-10 h-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Hero card */}
        <View className="px-6 pt-3">
          <View
            className="rounded-3xl bg-white border border-gray-100 p-5 items-center"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            {/* Avatar */}
            <View className="relative mb-3">
              <View
                className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center border-2 border-blue-100"
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                <Text
                  className="text-blue-600"
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    fontSize: 32,
                    letterSpacing: -0.5,
                  }}
                >
                  {getInitials(storeData?.storeName || "Store")}
                </Text>
              </View>
              {isVerified && (
                <View
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 items-center justify-center border-[3px] border-white"
                >
                  <Ionicons name="checkmark" size={14} color="white" />
                </View>
              )}
            </View>

            <Text
              className="text-gray-900 text-[20px] mb-0.5"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                letterSpacing: -0.4,
              }}
              numberOfLines={1}
            >
              {storeData?.storeName || "My Store"}
            </Text>

            <Text className="text-[13px] text-gray-500 mb-3" numberOfLines={1}>
              {user?.email || storeData?.email || "Store email"}
            </Text>

            <View className="flex-row items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <Text className="text-[10.5px] text-emerald-700 font-extrabold uppercase tracking-wide">
                Active account
              </Text>
            </View>
          </View>
        </View>

        {/* Menu groups */}
        {visibleGroups.map((group) => (
          <View key={group.label} className="px-6 mt-6">
            <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3 px-1">
              {group.label}
            </Text>
            <View
              className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
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
                  className={`flex-row items-center px-4 py-3.5 ${
                    item.destructive ? "active:bg-rose-50/40" : "active:bg-gray-50"
                  } ${
                    idx !== group.items.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: item.tint }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={item.iconColor}
                    />
                  </View>

                  <View className="flex-1 ml-3 pr-2">
                    <Text
                      className={`text-[14.5px] ${
                        item.destructive ? "text-rose-600" : "text-gray-900"
                      }`}
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

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={item.destructive ? "#fb7185" : "#9ca3af"}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Log out */}
        <View className="px-6 mt-6">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center bg-white border border-red-100 rounded-2xl py-3.5 active:bg-red-50"
            style={{
              shadowColor: "#dc2626",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            <Text className="text-red-600 ml-2 text-[14.5px]"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Log out
            </Text>
          </Pressable>
        </View>

        {/* Version */}
        <View className="items-center mt-6">
          <Text className="text-[11px] text-gray-400 font-medium">
            Version 2.4.0 · Build 1042
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
