import { View, Text, Pressable, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { BottomSheet } from "./BottomSheet";
import { FEATURE_META, FeatureKey } from "../lib/features";
import { RootStackParamList } from "../navigation/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The gated feature the vendor tried to access. */
  feature: FeatureKey | null;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

/**
 * Generic paywall sheet shown when a vendor taps a gated feature their
 * current plan doesn't include. Pulls labels/descriptions from
 * `FEATURE_META` so the sheet stays generic — to add a new gated feature,
 * register it in `features.ts` and this sheet handles it automatically.
 */
export function FeaturePaywallSheet({ visible, onClose, feature }: Props) {
  const navigation = useNavigation<Nav>();
  const meta = feature ? FEATURE_META[feature] : null;

  const handleUpgrade = () => {
    haptic();
    onClose();
    navigation.navigate("SubscriptionBilling" as any);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Upgrade required"
      subtitle="This feature is part of a higher plan"
      height="60%"
    >
      <View className="px-5 pt-4 pb-6">
        <View
          className="bg-white rounded-3xl border border-gray-100 px-5 py-6 items-center"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 16,
            elevation: 3,
          }}
        >
          <View
            className="w-16 h-16 rounded-3xl items-center justify-center mb-4 border border-blue-100"
            style={{ backgroundColor: "#eff6ff" }}
          >
            <Ionicons name="sparkles" size={26} color="#2563eb" />
          </View>
          <Text className="text-[18px] font-extrabold text-gray-900 tracking-tight text-center">
            {meta?.label ?? "Premium feature"}
          </Text>
          <Text className="text-[13px] text-gray-500 mt-2 text-center leading-[18px] max-w-[300px]">
            {meta?.description ??
              "Upgrade your plan to unlock this feature for your store."}
          </Text>

          <View className="flex-row items-center gap-2 mt-5 px-3.5 py-2 rounded-full bg-emerald-50 border border-emerald-100">
            <Ionicons name="checkmark-circle" size={12} color="#059669" />
            <Text className="text-[11px] font-bold text-emerald-700">
              Cancel anytime · No hidden fees
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleUpgrade}
          className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2 mt-5 active:bg-blue-700"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <Ionicons name="rocket" size={15} color="white" />
          <Text className="text-white font-extrabold text-[14.5px]">
            See plans & upgrade
          </Text>
        </Pressable>

        <Pressable
          onPress={onClose}
          className="h-11 rounded-2xl items-center justify-center mt-2.5"
        >
          <Text className="text-gray-700 font-bold text-[13.5px]">
            Maybe later
          </Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
