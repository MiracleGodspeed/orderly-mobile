import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/types";
import { SetupHeader } from "../components/SetupHeader";
import { useProgress } from "../../context/ProgressContext";
import { useVendor } from "../../context/VendorContext";
import { useAuth } from "../../context/AuthContext";
import {
  getCategories,
  submitVendorOnboarding,
} from "../api/vendor/vendor.api";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface Category {
  id: number;
  name: string;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function SetupStep3() {
  const navigation = useNavigation<NavProp>();
  const { setProgress } = useProgress();
  const { user } = useAuth();
  const {
    selectedCategories,
    toggleCategory,
    businessName,
    description,
    isServiceBased,
    fetchVendorData,
  } = useVendor();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    setProgress(0.66);

    let cancelled = false;
    setLoadingCats(true);
    getCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
      })
      .catch((err) => {
        console.log("Failed to fetch categories", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingCats(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setProgress]);

  const isValid = selectedCategories.length > 0;

  const handleToggle = (id: number) => {
    haptic();
    toggleCategory(id);
  };

  const handleContinue = async () => {
    if (!isValid || isSettingUp) return;
    if (!user?.storeId) {
      console.log("Store ID not available!");
      return;
    }
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    setModalVisible(true);
    setIsSettingUp(true);
    setProgress(1);

    try {
      console.log({
        storeId: user.storeId,
        businessName,
        description,
        isServiceBased: isServiceBased ?? false,
        applicableCategories: selectedCategories,
      }, "payload")

      const response = await submitVendorOnboarding({
        storeId: user.storeId,
        businessName,
        description,
        isServiceBased: isServiceBased ?? false,
        applicableCategories: selectedCategories,
      });

      console.log(response, "response")

      // Pull the freshly-onboarded store from the server so Home renders the
      // real store name, slug, etc. instead of the empty pre-onboarding state.
      await fetchVendorData();

      if (Platform.OS === "ios") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }

      // Tiny pause so the user sees "all set"
      setTimeout(() => {
        setModalVisible(false);
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      }, 800);
    } catch (err) {
      console.log("VENDOR ONBOARDING ERROR:", err);
      setModalVisible(false);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <SetupHeader
          step={3}
          totalSteps={3}
          title="Pick your categories"
          subtitle="Choose all that fits. This helps us understand your business and create a website that fits your brand."
          onBack={() => navigation.goBack()}
        />

        {/* Selected count */}
        <View className="px-6 mt-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px]">
              Categories
            </Text>
            {selectedCategories.length > 0 ? (
              <View className="flex-row items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                <Ionicons name="checkmark" size={11} color="#2563eb" />
                <Text className="text-[10.5px] font-extrabold text-blue-700 uppercase tracking-wide">
                  {selectedCategories.length} selected
                </Text>
              </View>
            ) : (
              <Text className="text-[11px] font-bold text-gray-400">
                Pick at least one
              </Text>
            )}
          </View>
        </View>

        {/* Categories */}
        <View className="px-6 mt-3">
          {loadingCats ? (
            <View
              className="bg-white rounded-3xl border border-gray-100 p-8 items-center"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-[12.5px] text-gray-500 mt-2 font-semibold">
                Loading categories…
              </Text>
            </View>
          ) : (
            <View
              className="bg-white rounded-3xl border border-gray-100 p-4"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View className="flex-row flex-wrap">
                {categories.map((c) => {
                  const isActive = selectedCategories.includes(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => handleToggle(c.id)}
                      className={`mr-2 mb-2 px-3.5 py-2.5 rounded-full flex-row items-center border ${
                        isActive
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <Text
                        className={`text-[13px] ${
                          isActive
                            ? "text-blue-700 font-extrabold"
                            : "text-gray-700 font-semibold"
                        }`}
                      >
                        {c.name}
                      </Text>
                      <Ionicons
                        name={isActive ? "checkmark-circle" : "add-circle-outline"}
                        size={16}
                        color={isActive ? "#2563eb" : "#9ca3af"}
                        style={{ marginLeft: 6 }}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Continue */}
        <View className="px-6 mt-6">
          <Pressable
            onPress={handleContinue}
            disabled={!isValid || isSettingUp}
            className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
              isValid && !isSettingUp ? "bg-blue-600" : "bg-gray-200"
            }`}
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isValid && !isSettingUp ? 0.25 : 0,
              shadowRadius: 8,
              elevation: isValid && !isSettingUp ? 4 : 0,
            }}
          >
            <Text
              className={`text-[15px] font-bold ${
                isValid && !isSettingUp ? "text-white" : "text-gray-500"
              }`}
            >
              Finish setup
            </Text>
            {isValid && !isSettingUp && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </Pressable>

          {/* Trust line */}
          <View className="flex-row items-center justify-center gap-1.5 mt-4">
            <Ionicons
              name="sparkles-outline"
              size={13}
              color="#94a3b8"
            />
            <Text className="text-[11.5px] text-gray-500">
              You can change your categories anytime in store settings
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Setting-up overlay — uses a native Modal so the backdrop is real and we can't tap through */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View
            className="w-full bg-white rounded-3xl p-6 items-center"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            <View
              className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 items-center justify-center mb-4"
              style={{
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.18,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <Ionicons name="sparkles" size={28} color="#2563eb" />
            </View>

            <Text
              className="text-gray-900 text-[20px]"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                letterSpacing: -0.4,
              }}
            >
              Setting up your store
            </Text>
            <Text className="text-[13px] text-gray-500 mt-1.5 text-center leading-[18px]">
              Pulling things together — this only takes a few seconds.
            </Text>

            <View className="flex-row items-center gap-2 mt-5">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-[12px] text-blue-600 font-extrabold uppercase tracking-wide">
                Almost there
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
