import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
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
import { useToast } from "react-native-toast-notifications";

import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { useVendor } from "../../context/VendorContext";
import { AppImage } from "../components/AppImage";

const LOGO = require("../../assets/blackLogo.png");
const GOOGLE_LOGO = require("../../assets/Google.png");

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Login() {
  const toast = useToast();
  const navigation = useNavigation<ScreenNavigationProp>();
  const { login, googleLogin } = useAuth();
  const { fetchVendorData } = useVendor();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "email" | "password" | null
  >(null);

  const isFormValid = email.trim() !== "" && password.trim() !== "";

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
        // User cancelled — no error toast
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

  const handleLogin = async () => {
    if (!isFormValid || loading) return;
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    try {
      setLoading(true);
      const data = await login(email.trim().toLowerCase(), password);
      await fetchVendorData();
      navigation.replace(data?.userStatus === 2 ? "SetupStep1" : "Home");
    } catch (err) {
      let message = "Login failed. Please try again.";
      if (err instanceof Error) message = err.message;
      else if (typeof err === "string") message = err;
      toast.show(message || "Login failed", { type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        >
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

            <View className="mt-8">
              <Text
                className="text-3xl text-gray-900"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  letterSpacing: -0.5,
                }}
              >
                Welcome back
              </Text>
              <Text className="text-gray-500 text-[15px] mt-2 leading-[22px]">
                Log in to keep your store moving.
              </Text>
            </View>
          </View>

          <View className="flex-1 px-6 pt-6">
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
                Account
              </Text>

              {/* Email */}
              <Text className="text-[13px] font-semibold text-gray-700 mb-2">
                Email
              </Text>
              <View
                className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 mb-4 ${
                  focusedField === "email"
                    ? "border-blue-600 bg-white"
                    : "border-gray-200"
                }`}
              >
                <Ionicons name="mail-outline" size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 py-3 text-[15px] text-gray-900"
                  placeholder="you@company.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* Password */}
              <Text className="text-[13px] font-semibold text-gray-700 mb-2">
                Password
              </Text>
              <View
                className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 ${
                  focusedField === "password"
                    ? "border-blue-600 bg-white"
                    : "border-gray-200"
                }`}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color="#9ca3af"
                />
                <TextInput
                  className="flex-1 ml-3 py-3 pr-2 text-[15px] text-gray-900"
                  placeholder="Your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => {
                    haptic();
                    setShowPassword(!showPassword);
                  }}
                  activeOpacity={0.7}
                  className="w-10 h-10 items-center justify-center -mr-2"
                  hitSlop={4}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => {
                  haptic();
                  navigation.navigate("ForgotPassword");
                }}
                activeOpacity={0.7}
                className="self-end mt-3"
                hitSlop={6}
              >
                <Text className="text-blue-600 font-bold text-[12.5px]">
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {/* Submit */}
              <Pressable
                onPress={handleLogin}
                disabled={!isFormValid || loading}
                className={`mt-5 h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                  isFormValid && !loading ? "bg-blue-600" : "bg-gray-200"
                }`}
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isFormValid && !loading ? 0.25 : 0,
                  shadowRadius: 8,
                  elevation: isFormValid && !loading ? 4 : 0,
                }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text className="text-[15px] font-bold text-white">
                      Logging in…
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      className={`text-[15px] font-bold ${
                        isFormValid ? "text-white" : "text-gray-500"
                      }`}
                    >
                      Log in
                    </Text>
                    {isFormValid && (
                      <Ionicons name="arrow-forward" size={16} color="white" />
                    )}
                  </>
                )}
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

            {/* Sign-up nudge */}
            <View className="mt-7 items-center">
              <Text className="text-[14px] text-gray-500">
                Don't have an account?{" "}
                <Text
                  className="text-blue-600 font-bold"
                  onPress={() => {
                    haptic();
                    navigation.navigate("EmailSignUp");
                  }}
                >
                  Sign up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
