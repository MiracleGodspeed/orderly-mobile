import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { useVendor } from "../../context/VendorContext";
import { AppImage } from "../components/AppImage";

const LOGO = require("../../assets/blackLogo.png");
const GOOGLE_LOGO = require("../../assets/Google.png");

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function AuthOptions() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { googleLogin } = useAuth();
  const { fetchVendorData } = useVendor();

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data?.idToken) {
        const payload = {
          email: "",
          idToken: userInfo.data.idToken,
          role: 2,
        };
        const data = await googleLogin(payload);
        await fetchVendorData();
        navigation.replace(data?.userStatus === 2 ? "SetupStep1" : "Home");
      } else {
        Alert.alert("Error", "No ID token received from Google");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert("Error", "Google Play Services not available");
      } else {
        console.error(error);
        Alert.alert("Error", "Google Sign In failed: " + error.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* Top bar */}
      <View className="px-6 pt-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>

          <AppImage
            source={LOGO}
            contentFit="contain"
            style={{ width: 96, height: 32 }}
          />

          <View className="w-10 h-10" />
        </View>

        {/* Heading */}
        <View className="mt-8">
          <Text
            className="text-3xl text-gray-900"
            style={{
              fontFamily: "PlusJakartaSans_700Bold",
              letterSpacing: -0.5,
            }}
          >
            Create your account
          </Text>
          <Text className="text-gray-500 text-[15px] mt-2 leading-[22px]">
            Start your stress-free business journey in minutes.
          </Text>
        </View>
      </View>

      <View className="flex-1 px-6 pt-6">
        {/* Benefits — quick value bullets */}
        <View className="flex-row gap-2 mb-5">
          {[
            { icon: "storefront-outline" as const, label: "Storefront" },
            { icon: "cart-outline" as const, label: "Live orders" },
            { icon: "trending-up-outline" as const, label: "Insights" },
          ].map((b) => (
            <View
              key={b.label}
              className="flex-1 flex-row items-center justify-center gap-1.5 bg-white border border-gray-100 rounded-2xl py-2.5"
            >
              <Ionicons name={b.icon} size={14} color="#2563eb" />
              <Text className="text-[12px] font-bold text-gray-700">
                {b.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Provider card */}
        <View
          className="bg-white rounded-3xl border border-gray-100 p-5"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-4">
            Get started
          </Text>

          {/* Email CTA */}
          <Pressable
            onPress={() => {
              haptic();
              navigation.navigate("EmailSignUp");
            }}
            className="h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2"
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text className="text-[15px] font-bold text-white">
              Continue with Email
            </Text>
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center mt-6 mb-4">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="mx-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.5px]">
              Or
            </Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Google */}
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            className="h-12 rounded-2xl border border-gray-200 bg-white items-center justify-center flex-row gap-3 active:bg-gray-50"
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#374151" />
            ) : (
              <Image
                source={GOOGLE_LOGO}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
            )}
            <Text className="text-[14px] font-bold text-gray-800">
              {googleLoading ? "Signing in…" : "Continue with Google"}
            </Text>
          </Pressable>

          {/* Trust line */}
          <View className="flex-row items-center justify-center gap-1.5 mt-4">
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color="#94a3b8"
            />
            <Text className="text-[11.5px] text-gray-500">
              Bank-grade security · SSL encrypted
            </Text>
          </View>
        </View>

        {/* Terms note */}
        <View className="mt-5 px-2">
          <Text className="text-[12px] text-gray-500 text-center leading-[18px]">
            By continuing, you agree to our{" "}
            <Text className="text-blue-600 font-bold">Terms of Service</Text>{" "}
            and{" "}
            <Text className="text-blue-600 font-bold">Privacy Policy</Text>.
          </Text>
        </View>

        {/* Sign-in nudge */}
        <View className="mt-7 items-center">
          <Text className="text-[14px] text-gray-500">
            Already have an account?{" "}
            <Text
              className="text-blue-600 font-bold"
              onPress={() => {
                haptic();
                navigation.navigate("Login");
              }}
            >
              Sign in
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
