import {
  View,
  Text,
  StatusBar,
  Platform,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import { useProgress } from "../../context/ProgressContext";
import { useAuth } from "../../context/AuthContext";
import { SetupHeader } from "../components/SetupHeader";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type IoniconName = keyof typeof Ionicons.glyphMap;

type Choice = "products" | "services";

interface Option {
  id: Choice;
  icon: IoniconName;
  tint: string;
  iconColor: string;
  title: string;
  desc: string;
  examples: string[];
}

const OPTIONS: Option[] = [
  {
    id: "products",
    icon: "cube-outline",
    tint: "#dbeafe",
    iconColor: "#2563eb",
    title: "I sell products",
    desc: "Physical or digital items you ship, deliver, or hand over.",
    examples: ["Fashion", "Food", "Electronics"],
  },
  {
    id: "services",
    icon: "briefcase-outline",
    tint: "#ede9fe",
    iconColor: "#7c3aed",
    title: "I render services",
    desc: "Time, expertise, or experiences you offer to customers.",
    examples: ["Tutoring", "Beauty", "Consulting"],
  },
];

export default function SetupStep2() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { setProgress } = useProgress();
  const { setServiceType, isServiceBased } = useVendor();
  const { logout } = useAuth();

  const handleBackToLogin = () => {
    Alert.alert(
      "Back to login?",
      "You'll be signed out. You can sign back in anytime to finish setting up your store.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Back to login",
          style: "destructive",
          onPress: () => {
            logout().catch(() => {});
          },
        },
      ]
    );
  };

  const [selected, setSelected] = useState<Choice | null>(
    isServiceBased === null
      ? null
      : isServiceBased
      ? "services"
      : "products"
  );

  useEffect(() => {
    setProgress(0.33);
  }, [setProgress]);

  const handleSelect = (choice: Choice) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setSelected(choice);
  };

  const handleContinue = () => {
    if (!selected) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setServiceType(selected === "services");
    setProgress(0.66);
    navigation.navigate("SetupStep3");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <SetupHeader
          step={2}
          totalSteps={3}
          title="What do you sell?"
          subtitle="Pick the option that best describes your business — you can fine-tune this later."
          onBack={() => navigation.goBack()}
          onExit={handleBackToLogin}
        />

        {/* Options */}
        <View className="px-6 mt-7">
          {OPTIONS.map((opt) => {
            const isActive = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                className={`bg-white rounded-3xl border p-4 mb-3 ${
                  isActive ? "border-blue-500" : "border-gray-100"
                }`}
                style={{
                  shadowColor: isActive ? "#2563eb" : "#0f172a",
                  shadowOffset: { width: 0, height: isActive ? 4 : 2 },
                  shadowOpacity: isActive ? 0.12 : 0.04,
                  shadowRadius: isActive ? 12 : 10,
                  elevation: isActive ? 4 : 2,
                }}
              >
                <View className="flex-row items-start">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center"
                    style={{
                      backgroundColor: isActive ? "#dbeafe" : opt.tint,
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={22}
                      color={isActive ? "#2563eb" : opt.iconColor}
                    />
                  </View>

                  <View className="flex-1 ml-3 pr-2">
                    <Text
                      className={`text-[15.5px] mb-0.5 ${
                        isActive ? "text-blue-700" : "text-gray-900"
                      }`}
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        letterSpacing: -0.2,
                      }}
                    >
                      {opt.title}
                    </Text>
                    <Text className="text-[13px] text-gray-500 leading-[18px]">
                      {opt.desc}
                    </Text>
                  </View>

                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#2563eb"
                    />
                  ) : (
                    <View className="w-5 h-5 rounded-full border-2 border-gray-200 mt-0.5" />
                  )}
                </View>

                {/* Examples row */}
                <View className="flex-row flex-wrap gap-1.5 mt-3 ml-15 pl-15" style={{ paddingLeft: 60 }}>
                  {opt.examples.map((ex) => (
                    <View
                      key={ex}
                      className={`px-2 py-0.5 rounded-full ${
                        isActive ? "bg-blue-50" : "bg-gray-50"
                      }`}
                    >
                      <Text
                        className={`text-[10.5px] font-bold ${
                          isActive ? "text-blue-700" : "text-gray-500"
                        }`}
                      >
                        {ex}
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Continue */}
        <View className="px-6 mt-3">
          <Pressable
            onPress={handleContinue}
            disabled={!selected}
            className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
              selected ? "bg-blue-600" : "bg-gray-200"
            }`}
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: selected ? 0.25 : 0,
              shadowRadius: 8,
              elevation: selected ? 4 : 0,
            }}
          >
            <Text
              className={`text-[15px] font-bold ${
                selected ? "text-white" : "text-gray-500"
              }`}
            >
              Continue
            </Text>
            {selected && (
              <Ionicons name="arrow-forward" size={16} color="white" />
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
