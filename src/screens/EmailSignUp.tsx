import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";

import { RootStackParamList } from "../navigation/types";
import { SignupRequest, Country } from "../api/auth/auth.types";
import { signup, getCountries } from "../api/auth/auth.api";
import { CountryPickerDrawer } from "../components/CountryPickerDrawer";
import { AppImage } from "../components/AppImage";
import { isUserStatus } from "../lib/authStatus";
import { AppToast, AppToastTone } from "../components/AppToast";
import { useAuth } from "../../context/AuthContext";
import { useVendor } from "../../context/VendorContext";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LOGO = require("../../assets/blackLogo.png");
const GOOGLE_LOGO = require("../../assets/Google.png");

const FALLBACK_COUNTRY: Country = {
  id: 0,
  name: "Nigeria",
  flag: "🇳🇬",
  code: "+234",
  enabled: true,
};

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function EmailSignUp() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { googleLogin, appleLogin } = useAuth();
  const { fetchVendorData } = useVendor();
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country>(FALLBACK_COUNTRY);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "email" | "password" | "confirm" | "phone" | null
  >(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const handleAppleSignIn = async () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert("Error", "No identity token received from Apple");
        return;
      }

      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(" ")
            .trim() || null
        : null;

      const data = await appleLogin({
        idToken: credential.identityToken,
        email: credential.email ?? null,
        FullName: fullName,
        role: 2,
      });
      await fetchVendorData();
      navigation.replace(
        isUserStatus(data?.userStatus, 2) ? "SetupStep1" : "Home"
      );
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELED") return;
      console.error(error);
      setToast({
        title: "Sign in with Apple failed",
        subtitle: error?.message ?? "Please try again.",
        tone: "error",
      });
    } finally {
      setAppleLoading(false);
    }
  };

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
        navigation.replace(isUserStatus(data?.userStatus, 2) ? "SetupStep1" : "Home");
      } else {
        Alert.alert("Error", "No ID token received from Google");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled — silent
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

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getCountries();
        if (!alive) return;
        setCountries(list);
        const enabled = list.find((c) => c.enabled !== false);
        if (enabled) setCountry(enabled);
      } catch (err) {
        // Stay silent — user can still proceed with the fallback country.
        console.warn("Failed to load countries", err);
      } finally {
        if (alive) setLoadingCountries(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;
  const showMismatch =
    confirmPassword.length > 0 && password.length > 0 && !passwordsMatch;
  const passwordTooShort = password.length > 0 && password.length < 8;

  const isFormValid = useMemo(() => {
    return (
      email.trim().length > 0 &&
      password.length >= 8 &&
      passwordsMatch &&
      phone.trim().length >= 6
    );
  }, [email, password, passwordsMatch, phone]);

  const handleSignup = async () => {
    if (!passwordsMatch) {
      setToast({ title: "Passwords don't match", tone: "error" });
      return;
    }
    if (password.length < 8) {
      setToast({
        title: "Password is too short",
        subtitle: "Use at least 8 characters.",
        tone: "error",
      });
      return;
    }

    setLoading(true);
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const payload: SignupRequest = {
      email: email.trim().toLowerCase(),
      password,
      otp: "",
      skipVerificationForLater: false,
      countryCode: country.code,
      phone: phone.trim(),
    };

    try {
      await signup(payload);
      navigation.navigate("OtpVerification", { email, password });
    } catch (err) {
      let message = "Check your details and try again.";
      if (err instanceof Error) message = err.message;
      else if (typeof err === "string") message = err;
      setToast({
        title: "Couldn't create account",
        subtitle: message,
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <AppToast
        visible={toast != null}
        title={toast?.title ?? ""}
        subtitle={toast?.subtitle}
        tone={toast?.tone}
        onHide={() => setToast(null)}
      />

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
                Create your account
              </Text>
              <Text className="text-gray-500 text-[15px] mt-2 leading-[22px]">
                Start your{" "}
                <Text className="text-gray-900 font-bold">14-day free trial</Text>
                . No card needed.
              </Text>
            </View>
          </View>

          {/* Form card */}
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
              {/* Sign in with Apple — iOS only. Required as an equivalent
                  login option per App Store guideline 4.8 because the
                  app ships Google as a third-party login. Sits above
                  Google to match Apple's HIG prominence expectation. */}
              {appleAvailable && (
                <View className="mb-3">
                  {appleLoading ? (
                    <View className="h-12 rounded-2xl bg-black items-center justify-center flex-row gap-2">
                      <ActivityIndicator size="small" color="#fff" />
                      <Text className="text-[14px] font-bold text-white">
                        Signing in…
                      </Text>
                    </View>
                  ) : (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={
                        AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                      }
                      buttonStyle={
                        AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                      }
                      cornerRadius={16}
                      style={{ width: "100%", height: 48 }}
                      onPress={handleAppleSignIn}
                    />
                  )}
                </View>
              )}

              {/* Google sign-in — OAuth-first, the modern signup pattern */}
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="h-12 rounded-2xl border border-gray-200 bg-white items-center justify-center flex-row gap-3 active:bg-gray-50 mb-4"
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

              {/* OR divider */}
              <View className="flex-row items-center mb-4">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="mx-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.5px]">
                  Or sign up with email
                </Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

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

              {/* Phone with country code */}
              <Text className="text-[13px] font-semibold text-gray-700 mb-2">
                Phone number
              </Text>
              <View
                className={`flex-row items-stretch rounded-2xl border bg-gray-50 mb-4 overflow-hidden ${
                  focusedField === "phone"
                    ? "border-blue-600 bg-white"
                    : "border-gray-200"
                }`}
              >
                <Pressable
                  onPress={() => {
                    haptic();
                    setPickerOpen(true);
                  }}
                  className="flex-row items-center gap-1.5 pl-3 pr-2 border-r border-gray-200 active:bg-gray-100"
                >
                  <Text style={{ fontSize: 18 }}>{country.flag ?? "🏳️"}</Text>
                  <Text className="text-[13px] font-bold text-gray-900">
                    {country.code}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color="#9ca3af" />
                </Pressable>
                <View className="flex-1 flex-row items-center px-3">
                  <Ionicons name="call-outline" size={16} color="#9ca3af" />
                  <TextInput
                    className="flex-1 ml-2 py-3 text-[15px] text-gray-900"
                    placeholder="Phone number"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={(t) =>
                      setPhone(t.replace(/[^\d]/g, ""))
                    }
                    keyboardType="phone-pad"
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Password */}
              <Text className="text-[13px] font-semibold text-gray-700 mb-2">
                Password
              </Text>
              <View
                className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 ${
                  focusedField === "password"
                    ? "border-blue-600 bg-white"
                    : passwordTooShort
                    ? "border-amber-300"
                    : "border-gray-200"
                }`}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 py-3 pr-2 text-[15px] text-gray-900"
                  placeholder="Min. 8 characters"
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
                  onPress={() => setShowPassword(!showPassword)}
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
              {passwordTooShort ? (
                <View className="flex-row items-center gap-1 mt-1.5 ml-1">
                  <Ionicons name="alert-circle" size={12} color="#d97706" />
                  <Text className="text-[11px] font-semibold text-amber-700">
                    Use at least 8 characters
                  </Text>
                </View>
              ) : (
                <View className="h-2" />
              )}

              {/* Confirm password */}
              <Text className="text-[13px] font-semibold text-gray-700 mb-2 mt-2">
                Confirm password
              </Text>
              <View
                className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 ${
                  showMismatch
                    ? "border-rose-300"
                    : focusedField === "confirm"
                    ? "border-blue-600 bg-white"
                    : "border-gray-200"
                }`}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={showMismatch ? "#dc2626" : "#9ca3af"}
                />
                <TextInput
                  className="flex-1 ml-3 py-3 pr-2 text-[15px] text-gray-900"
                  placeholder="Re-enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                  className="w-10 h-10 items-center justify-center -mr-2"
                  hitSlop={4}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {showMismatch ? (
                <View className="flex-row items-center gap-1 mt-1.5 ml-1">
                  <Ionicons name="alert-circle" size={12} color="#dc2626" />
                  <Text className="text-[11px] font-semibold text-rose-600">
                    Passwords don't match
                  </Text>
                </View>
              ) : passwordsMatch ? (
                <View className="flex-row items-center gap-1 mt-1.5 ml-1">
                  <Ionicons
                    name="checkmark-circle"
                    size={12}
                    color="#059669"
                  />
                  <Text className="text-[11px] font-semibold text-emerald-700">
                    Passwords match
                  </Text>
                </View>
              ) : (
                <View className="h-3" />
              )}

              {/* Marketing opt-in */}
              <TouchableOpacity
                onPress={() => {
                  haptic();
                  setAcceptMarketing(!acceptMarketing);
                }}
                activeOpacity={0.7}
                className="flex-row items-start mt-4"
                hitSlop={4}
              >
                <View
                  className={`w-5 h-5 rounded-md border-2 mr-3 mt-0.5 items-center justify-center ${
                    acceptMarketing
                      ? "bg-blue-600 border-blue-600"
                      : "border-gray-300"
                  }`}
                >
                  {acceptMarketing && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
                <Text className="text-[12.5px] text-gray-600 flex-1 leading-[18px]">
                  Send me product updates and growth tips. No spam, unsubscribe
                  anytime.
                </Text>
              </TouchableOpacity>

              {/* Submit */}
              <Pressable
                onPress={handleSignup}
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
                      Creating account…
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      className={`text-[15px] font-bold ${
                        isFormValid ? "text-white" : "text-gray-500"
                      }`}
                    >
                      Create account
                    </Text>
                    {isFormValid && (
                      <Ionicons name="arrow-forward" size={16} color="white" />
                    )}
                  </>
                )}
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

            {/* Sign-in nudge */}
            <View className="mt-6 items-center">
              <Text className="text-[14px] text-gray-500">
                Already have an account?{" "}
                <Text
                  className="text-blue-600 font-bold"
                  onPress={() => navigation.navigate("Login")}
                >
                  Log in
                </Text>
              </Text>
            </View>

            {/* Terms */}
            <Text className="text-[11.5px] text-center text-gray-500 mt-5 px-3 leading-[16px]">
              By creating an account, you agree to Orderly's{" "}
              <Text className="text-blue-600 font-semibold">Terms</Text> and{" "}
              <Text className="text-blue-600 font-semibold">
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPickerDrawer
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        countries={countries.length > 0 ? countries : [FALLBACK_COUNTRY]}
        loading={loadingCountries && countries.length === 0}
        selectedCode={country.code}
        onSelect={(c) => setCountry(c)}
      />
    </SafeAreaView>
  );
}
