// src/screens/OtpSuccess.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types"; // adjust path if needed

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OtpSuccess() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { width } = Dimensions.get("window");

  // We will create quick bursts repeatedly for a few seconds to feel like a continuous confetti effect
  const [bursts, setBursts] = useState<number[]>([]);

  useEffect(() => {
    // create 4 bursts spaced 700ms apart (≈ ~2.1s of activity)
    let count = 0;
    const maxBursts = 4;
    const interval = setInterval(() => {
      setBursts((p) => [...p, Date.now() + Math.random()]);
      count += 1;
      if (count >= maxBursts) {
        clearInterval(interval);
      }
    }, 700);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View className="flex-1 px-6 pt-10 items-center">
        {/* Image */}
        <View className="mb-6 mt-8 pt-8">
          <Image
            source={require("../../assets/check.png")} // <-- replace with your asset path
            style={{ width: 140, height: 140 }}
            resizeMode="contain"
          />
        </View>

        {/* Title + writeup */}
        <View className="items-center px-4 mb-8">
          <Text className="text-2xl font-semibold text-[#374151] mb-3">
            Congratulations!
          </Text>
          <Text className="text-center text-[18px] text-[#6B7280] font-[400]">
            You’re all set. Let’s help you build and {"\n"} manage your store like a pro!
          </Text>
        </View>

        {/* Continue button */}
        <View className="w-full px-6 mt-auto mb-12">
          <TouchableOpacity
            onPress={() => {
              // navigate to main app screen — change route name to whatever your flow expects
              navigation.navigate("Home" as any);
            }}
            activeOpacity={0.8}
            className="w-full py-4 rounded-full items-center justify-center bg-[#1A56DB]"
          >
            <Text className="text-white text-lg font-semibold">Continue</Text>
          </TouchableOpacity>
        </View>

        {/* Confetti bursts (rendered last so they float above) */}
        {bursts.map((bKey) => (
          <ConfettiCannon
            key={String(bKey)}
            count={40}
            origin={{ x: width / 2, y: 0 }}
            fadeOut={true}
            autoStart={true}
            fallSpeed={3000} // longer fall speed for nicer effect
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
