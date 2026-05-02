import React, { memo, useMemo } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "./BottomSheet";
import { useVendor } from "../../context/VendorContext";
import { setupProgressPct } from "../lib/setupProgress";

type IoniconName = keyof typeof Ionicons.glyphMap;

export type SetupStepId = "add-delivery-locations" | "add-product" | "setup-payment";

interface Step {
  id: SetupStepId;
  title: string;
  description: string;
  icon: IoniconName;
  tint: string;
  iconColor: string;
}

const STEPS: Step[] = [
  {
    id: "add-delivery-locations",
    title: "Add delivery locations",
    description:
      "Tell customers where you deliver. Without this, checkout stalls and they can't place an order.",
    icon: "location-outline",
    tint: "#fff1f2",
    iconColor: "#e11d48",
  },
  {
    id: "add-product",
    title: "Add your first product",
    description:
      "Upload photos, set prices, and organise inventory so customers can start shopping.",
    icon: "cube-outline",
    tint: "#ecfeff",
    iconColor: "#0891b2",
  },
  {
    id: "setup-payment",
    title: "Set up your payment method",
    description:
      "Connect your bank or payment provider to start receiving payments securely.",
    icon: "card-outline",
    tint: "#ecfdf5",
    iconColor: "#059669",
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onStepPress: (step: SetupStepId) => void;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

function StoreSetupModalImpl({ visible, onClose, onStepPress }: Props) {
  // Server-driven completion. Single source of truth — the home progress card
  // reads from the same place, so the two displays can never disagree.
  const { checklistItems } = useVendor();

  const completedIds = useMemo(
    () => new Set(checklistItems.filter((i) => i.completed).map((i) => i.id)),
    [checklistItems]
  );
  const completedCount = completedIds.size;
  const total = STEPS.length;
  const pct = setupProgressPct(checklistItems);
  const remaining = total - completedCount;
  const allDone = remaining === 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Complete your store setup"
      subtitle={
        allDone
          ? "You've finished every step — nice work."
          : `${remaining} ${remaining === 1 ? "step" : "steps"} left to go live`
      }
      height="78%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
      >
        {/* Progress card */}
        <View
          className="mt-4 mb-5 rounded-3xl p-5 overflow-hidden"
          style={{
            backgroundColor: "#0f172a",
          }}
        >
          {/* Decorative orb */}
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "rgba(96, 165, 250, 0.18)",
            }}
          />
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[11px] font-extrabold text-blue-200 uppercase tracking-[1.2px]">
                Setup progress
              </Text>
              <Text
                className="text-white text-[28px] mt-1"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  letterSpacing: -0.5,
                }}
              >
                {pct}%{" "}
                <Text className="text-blue-200 text-[16px] font-semibold">
                  complete
                </Text>
              </Text>
            </View>
            <View className="w-12 h-12 rounded-2xl bg-blue-500/20 items-center justify-center border border-blue-400/30">
              <Ionicons
                name={allDone ? "trophy" : "rocket-outline"}
                size={22}
                color="#bfdbfe"
              />
            </View>
          </View>

          <View className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <View
              className="h-2 bg-blue-400 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </View>

          <Text className="text-[12px] text-blue-100/80 mt-3">
            {completedCount} of {total} steps completed
          </Text>
        </View>

        {/* Section label */}
        <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3">
          Steps
        </Text>

        {/* Steps */}
        {STEPS.map((step) => {
          const isDone = completedIds.has(step.id);
          return (
            <Pressable
              key={step.id}
              onPress={() => {
                haptic();
                onStepPress(step.id);
              }}
              className={`flex-row items-center bg-white border rounded-2xl p-4 mb-3 active:bg-gray-50 ${
                isDone ? "border-blue-100" : "border-gray-100"
              }`}
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
                style={{ backgroundColor: isDone ? "#dbeafe" : step.tint }}
              >
                <Ionicons
                  name={isDone ? "checkmark" : step.icon}
                  size={22}
                  color={isDone ? "#2563eb" : step.iconColor}
                />
              </View>

              <View className="flex-1 pr-2">
                <Text
                  className={`text-[14.5px] font-extrabold mb-0.5 ${
                    isDone ? "text-blue-700" : "text-gray-900"
                  }`}
                >
                  {step.title}
                </Text>
                <Text
                  className="text-[12.5px] text-gray-500 leading-[18px]"
                  numberOfLines={2}
                >
                  {step.description}
                </Text>
              </View>

              {isDone ? (
                <View className="bg-blue-50 px-2 py-1 rounded-full">
                  <Text className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wide">
                    Done
                  </Text>
                </View>
              ) : (
                <View className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center">
                  <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Trust line */}
        <View className="flex-row items-center justify-center gap-1.5 mt-3">
          <Ionicons name="shield-checkmark-outline" size={13} color="#94a3b8" />
          <Text className="text-[11.5px] text-gray-500">
            Your data is encrypted and never shared
          </Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

export const StoreSetupModal = memo(StoreSetupModalImpl);
