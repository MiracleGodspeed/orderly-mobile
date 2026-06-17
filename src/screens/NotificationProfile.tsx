import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useToast } from "react-native-toast-notifications";

import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "../api/insights/preferences.api";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Key = keyof NotificationPreferences;
type IoniconName = keyof typeof Ionicons.glyphMap;

const ALL_ON: NotificationPreferences = {
  lowStockAlerts: true,
  reports: true,
  engagementNudges: true,
  encouragement: true,
  milestones: true,
};

const ROWS: {
  key: Key;
  icon: IoniconName;
  tint: string;
  color: string;
  title: string;
  hint: string;
}[] = [
  {
    key: "lowStockAlerts",
    icon: "cube-outline",
    tint: "#fffbeb",
    color: "#d97706",
    title: "Stock alerts",
    hint: "When products run low or sell out",
  },
  {
    key: "reports",
    icon: "document-text-outline",
    tint: "#eff6ff",
    color: "#0080ff",
    title: "Weekly & monthly reports",
    hint: "Your business summary, in plain language",
  },
  {
    key: "engagementNudges",
    icon: "people-outline",
    tint: "#f5f3ff",
    color: "#7c3aed",
    title: "Customer win-backs",
    hint: "When customers go quiet and are worth a nudge",
  },
  {
    key: "encouragement",
    icon: "heart-outline",
    tint: "#fff1f2",
    color: "#e11d48",
    title: "Encouragement & check-ins",
    hint: "A genuine word from Orderly, now and then",
  },
  {
    key: "milestones",
    icon: "trophy-outline",
    tint: "#ecfdf5",
    color: "#059669",
    title: "Milestones",
    hint: "Celebrate your records and big moments",
  },
];

const cardShadow = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 2,
} as const;

export default function NotificationProfile() {
  const toast = useToast();
  const navigation = useNavigation<ScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPreferences>(ALL_ON);
  const [toggling, setToggling] = useState<Key | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setPrefs(await getNotificationPreferences());
      } catch {
        setPrefs(ALL_ON);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleToggle = async (key: Key, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setToggling(key);
    try {
      const ok = await updateNotificationPreferences(next);
      if (!ok) throw new Error("save failed");
    } catch {
      setPrefs((p) => ({ ...p, [key]: !value }));
      toast.show("Couldn't update that setting", { type: "danger" });
    } finally {
      setToggling(null);
    }
  };

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

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0080ff" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title block */}
          <View className="px-5 pt-1 pb-7">
            <Text className="text-[26px] font-extrabold text-gray-900 tracking-tight">
              Notifications
            </Text>
            <Text className="text-[13.5px] text-gray-500 mt-1.5 leading-5 max-w-[300px]">
              All on by default. Turn off anything you'd rather not get — this
              applies to both push and email.
            </Text>
          </View>

          {/* Toggle card */}
          <View
            className="mx-5 bg-white rounded-3xl border border-gray-100 overflow-hidden"
            style={cardShadow}
          >
            {ROWS.map((row, i) => (
              <View
                key={row.key}
                className={`flex-row items-center px-4 py-4 ${
                  i < ROWS.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <View
                  className="w-10 h-10 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: row.tint }}
                >
                  <Ionicons name={row.icon} size={18} color={row.color} />
                </View>
                <View className="flex-1 ml-3.5 mr-3">
                  <Text className="text-[14.5px] font-bold text-gray-900 tracking-tight">
                    {row.title}
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5 leading-4">
                    {row.hint}
                  </Text>
                </View>
                <Switch
                  value={prefs[row.key]}
                  onValueChange={(v) => handleToggle(row.key, v)}
                  disabled={toggling === row.key}
                  trackColor={{ false: "#e5e7eb", true: "#0080ff" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#e5e7eb"
                />
              </View>
            ))}
          </View>

          {/* Footnote */}
          <Text className="mx-5 mt-4 text-[12px] text-gray-400 leading-5">
            You can change these anytime. Important account and order alerts are
            always delivered.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
