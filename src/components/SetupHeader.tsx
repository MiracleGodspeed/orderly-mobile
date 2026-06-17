import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface SetupHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** When provided, renders a "Back to login" escape at the top-right
   *  so a vendor whose setup is stuck or half-finished is never trapped
   *  — it signs them out and returns them to login. */
  onExit?: () => void;
}

/**
 * Premium chrome shared by every store-setup screen:
 *   back pill + segmented step indicator + "Step X of Y" eyebrow + heading.
 * Keeps the setup flow visually cohesive and removes per-screen drift.
 */
export function SetupHeader({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onExit,
}: SetupHeaderProps) {
  return (
    <View>
      {/* Top bar */}
      <View className="px-6 pt-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text
            className="text-[15px] text-gray-900"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Set up your store
          </Text>
          {onExit ? (
            <TouchableOpacity
              onPress={onExit}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text
                className="text-[12.5px] text-gray-400"
                style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
              >
                Back to login
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10" />
          )}
        </View>
      </View>

      {/* Step indicator */}
      <View className="px-6 mt-7">
        <View className="flex-row items-center gap-1.5 mb-3">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isComplete = i < step - 1;
            const isCurrent = i === step - 1;
            return (
              <View
                key={i}
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{
                  backgroundColor: "#e5e7eb",
                }}
              >
                {(isComplete || isCurrent) && (
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: isComplete ? "100%" : "55%",
                      backgroundColor: "#2563eb",
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>

        <Text className="text-[11px] font-extrabold text-blue-600 uppercase tracking-[1.4px] mb-3">
          Step {step} of {totalSteps}
        </Text>

        <Text
          className="text-gray-900"
          style={{
            fontFamily: "PlusJakartaSans_700Bold",
            fontSize: 26,
            letterSpacing: -0.5,
            lineHeight: 32,
          }}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text className="text-gray-500 text-[14.5px] mt-2 leading-[21px]">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
