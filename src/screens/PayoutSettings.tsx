import {
  View,
  Text,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useToast } from "react-native-toast-notifications";

import { RootStackParamList } from "../navigation/types";
import { useVendor } from "../../context/VendorContext";
import {
  getBanks,
  validateAccount,
  updateBankAccountInfo,
} from "../api/vendor/vendor.api";
import { Bank } from "../api/vendor/vendor.types";
import { BottomSheet } from "../components/BottomSheet";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const maskAccount = (n: string) => {
  if (!n || n.length < 4) return n;
  return `•••• ${n.slice(-4)}`;
};

type ValidationStatus = "idle" | "validating" | "valid" | "error";

export default function PayoutSettings() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const toast = useToast();
  const { storeData, fetchVendorData } = useVendor();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);

  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState(
    storeData?.accountNumber || ""
  );
  const [accountName, setAccountName] = useState(
    storeData?.accountName || ""
  );
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>(
    storeData?.accountName ? "valid" : "idle"
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isAccountFocused, setIsAccountFocused] = useState(false);

  const [bankSheetVisible, setBankSheetVisible] = useState(false);
  const [bankQuery, setBankQuery] = useState("");

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setBanksLoading(true);
    getBanks()
      .then((list) => {
        if (cancelled) return;
        setBanks(list);
      })
      .catch((err) => {
        console.error("Error fetching banks:", err);
      })
      .finally(() => {
        if (!cancelled) setBanksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate the selected bank from storeData once banks arrive
  useEffect(() => {
    if (storeData?.bank && banks.length > 0 && !selectedBank) {
      const found = banks.find((b) => b.name === storeData.bank);
      if (found) setSelectedBank(found);
    }
  }, [storeData?.bank, banks, selectedBank]);

  const runValidation = useCallback(
    async (bank: Bank, number: string) => {
      setValidationStatus("validating");
      console.log("validating", bank.code, number);
      setValidationError(null);
      try {
        const data = await validateAccount(bank.code, number);
        if (!data?.accountName) {
          throw new Error("No account found for those details.");
        }
        console.log(data)
        setAccountName(data.accountName);
        setValidationStatus("valid");
        if (Platform.OS === "ios") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
        }
      } catch (error: any) {
        setAccountName("");
        console.log(error)
        setValidationStatus("error");
        setValidationError(
          error?.message ||
            "We couldn't verify that account. Check the number and try again."
        );
        if (Platform.OS === "ios") {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error
          ).catch(() => {});
        }
      }
    },
    []
  );

  // Auto-validate the moment we have a bank + 10-digit account number.
  // Only fire from `idle` so a failed lookup doesn't re-loop into itself —
  // the user retries via the inline Retry button instead.
  useEffect(() => {
    if (
      selectedBank &&
      accountNumber.length === 10 &&
      validationStatus === "idle"
    ) {
      runValidation(selectedBank, accountNumber);
    }
  }, [selectedBank, accountNumber, validationStatus, runValidation]);

  const handleAccountNumberChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(digits);
    if (validationStatus !== "idle") {
      setValidationStatus("idle");
      setAccountName("");
      setValidationError(null);
    }
  };

  const handleSelectBank = (bank: Bank) => {
    haptic();
    setSelectedBank(bank);
    setBankSheetVisible(false);
    setBankQuery("");
    if (validationStatus !== "idle") {
      setValidationStatus("idle");
      setAccountName("");
      setValidationError(null);
    }
  };

  const handleRetryValidation = () => {
    if (selectedBank && accountNumber.length === 10) {
      runValidation(selectedBank, accountNumber);
    }
  };

  const handleSave = async () => {
    if (
      !selectedBank ||
      accountNumber.length !== 10 ||
      !accountName ||
      validationStatus !== "valid"
    ) {
      return;
    }
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    try {
      setIsSaving(true);
      // Bank details have a dedicated endpoint on the backend — going through
      // /update-store-front-settings (which is what the old updateVendorSettings
      // call did) doesn't actually persist these fields.
      await updateBankAccountInfo({
        bank: selectedBank.name,
        accountNumber,
        accountName,
      });
      // Refresh storeData so the connected-account hero card updates immediately.
      await fetchVendorData();
      toast.show("Payout details saved.", { type: "success" });
    } catch (error: any) {
      console.error("Error saving payment settings:", error);
      toast.show(
        error?.message || "Failed to save payout details.",
        { type: "danger" }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, bankQuery]);

  const canSave =
    !!selectedBank &&
    accountNumber.length === 10 &&
    !!accountName &&
    validationStatus === "valid" &&
    !isSaving;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top bar */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </TouchableOpacity>
            <Text
              className="text-[16px] text-gray-900"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Payout settings
            </Text>
            <View className="w-10 h-10" />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Hero / status card */}
          <View className="px-6 pt-3">
            {validationStatus === "valid" && accountName ? (
              <View
                className="rounded-3xl p-5 overflow-hidden"
                style={{ backgroundColor: "#0f172a" }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: -40,
                    right: -40,
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    backgroundColor: "rgba(96, 165, 250, 0.2)",
                  }}
                />
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-[11px] font-extrabold text-blue-200 uppercase tracking-[1.4px]">
                    Connected account
                  </Text>
                  <View className="flex-row items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    <Ionicons
                      name="checkmark-circle"
                      size={11}
                      color="#34d399"
                    />
                    <Text className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wide">
                      Verified
                    </Text>
                  </View>
                </View>

                <Text
                  className="text-white text-[22px]"
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    letterSpacing: -0.4,
                  }}
                  numberOfLines={1}
                >
                  {accountName}
                </Text>
                <Text className="text-blue-100/80 text-[13px] mt-1">
                  {selectedBank?.name} · {maskAccount(accountNumber)}
                </Text>
              </View>
            ) : (
              <View
                className="rounded-3xl bg-white border border-gray-100 p-5 flex-row items-center"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <View className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 items-center justify-center">
                  <Ionicons name="card-outline" size={22} color="#2563eb" />
                </View>
                <View className="flex-1 ml-3">
                  <Text
                    className="text-gray-900 text-[16px]"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Get paid for sales
                  </Text>
                  <Text className="text-gray-500 text-[12.5px] mt-0.5 leading-[18px]">
                    Connect a bank account to receive your payouts.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Form */}
          <View className="px-6 pt-5">
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
                Bank account
              </Text>

              {/* Bank */}
              <Text className="text-[13px] font-semibold text-gray-700 mb-2">
                Bank
              </Text>
              <Pressable
                onPress={() => {
                  haptic();
                  setBankSheetVisible(true);
                }}
                className="flex-row items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 h-12 mb-4"
              >
                <Ionicons name="business-outline" size={18} color="#9ca3af" />
                <Text
                  className={`flex-1 ml-3 text-[15px] ${
                    selectedBank ? "text-gray-900 font-semibold" : "text-gray-400"
                  }`}
                  numberOfLines={1}
                >
                  {selectedBank ? selectedBank.name : "Select your bank"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="#9ca3af"
                />
              </Pressable>

              {/* Account number */}
              <Text className="text-[13px] font-semibold text-gray-700 mb-2">
                Account number
              </Text>
              <View
                className={`flex-row items-center rounded-2xl border bg-gray-50 px-4 mb-2 ${
                  isAccountFocused
                    ? "border-blue-600 bg-white"
                    : validationStatus === "error"
                    ? "border-red-200 bg-red-50/50"
                    : validationStatus === "valid"
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-gray-200"
                }`}
              >
                <Ionicons name="keypad-outline" size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 ml-3 py-3 text-[15px] text-gray-900"
                  placeholder="0123456789"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={accountNumber}
                  onChangeText={handleAccountNumberChange}
                  onFocus={() => setIsAccountFocused(true)}
                  onBlur={() => setIsAccountFocused(false)}
                />
                {validationStatus === "validating" ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : validationStatus === "valid" ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#10b981"
                  />
                ) : validationStatus === "error" ? (
                  <Ionicons name="alert-circle" size={20} color="#dc2626" />
                ) : null}
              </View>

              {/* Live status hint */}
              {validationStatus === "idle" && !selectedBank && (
                <Text className="text-[12px] text-gray-500 mb-3">
                  Pick a bank first, then enter your 10-digit account number.
                </Text>
              )}
              {validationStatus === "idle" &&
                selectedBank &&
                accountNumber.length < 10 && (
                  <Text className="text-[12px] text-gray-500 mb-3">
                    {10 - accountNumber.length}{" "}
                    {10 - accountNumber.length === 1 ? "digit" : "digits"} to
                    go — we'll verify the account automatically.
                  </Text>
                )}
              {validationStatus === "validating" && (
                <Text className="text-[12px] text-blue-600 font-semibold mb-3">
                  Looking up your account…
                </Text>
              )}

              {/* Error card */}
              {validationStatus === "error" && (
                <View className="rounded-2xl border border-red-100 bg-red-50/70 p-3 mb-3 flex-row items-center">
                  <Ionicons name="alert-circle" size={18} color="#dc2626" />
                  <Text className="flex-1 ml-2 text-[12.5px] text-red-700 leading-[18px]">
                    {validationError ||
                      "We couldn't verify that account. Check the details and try again."}
                  </Text>
                  <Pressable
                    onPress={handleRetryValidation}
                    className="ml-2 px-2.5 py-1 rounded-full bg-red-100"
                    hitSlop={6}
                  >
                    <Text className="text-[11px] font-extrabold text-red-700">
                      Retry
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Verified account */}
              {validationStatus === "valid" && accountName && (
                <View className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 mb-3 flex-row items-center">
                  <View className="w-9 h-9 rounded-full bg-emerald-100 items-center justify-center">
                    <Ionicons name="checkmark" size={18} color="#059669" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-[10.5px] font-extrabold text-emerald-700 uppercase tracking-[1px]">
                      Account verified
                    </Text>
                    <Text
                      className="text-gray-900 text-[14.5px] mt-0.5"
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        letterSpacing: -0.2,
                      }}
                      numberOfLines={1}
                    >
                      {accountName}
                    </Text>
                  </View>
                </View>
              )}

              {/* Save */}
              <Pressable
                onPress={handleSave}
                disabled={!canSave}
                className={`mt-2 h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                  canSave ? "bg-blue-600" : "bg-gray-200"
                }`}
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: canSave ? 0.25 : 0,
                  shadowRadius: 8,
                  elevation: canSave ? 4 : 0,
                }}
              >
                {isSaving ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text className="text-[15px] font-bold text-white">
                      Saving…
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="save-outline"
                      size={16}
                      color={canSave ? "#fff" : "#9ca3af"}
                    />
                    <Text
                      className={`text-[15px] font-bold ${
                        canSave ? "text-white" : "text-gray-500"
                      }`}
                    >
                      Save payout details
                    </Text>
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
                  Bank-grade security · We never store full card details
                </Text>
              </View>
            </View>
          </View>

          {/* Helpful tips */}
          <View className="px-6 mt-5">
            <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3">
              Good to know
            </Text>
            {[
              {
                icon: "time-outline" as const,
                title: "Payouts settle within 24 hours",
                desc: "Once an order is paid, your share lands in this account next business day.",
              },
              {
                icon: "person-outline" as const,
                title: "Use an account in your name",
                desc: "Verification will fail if the bank can't match it to your store profile.",
              },
            ].map((tip) => (
              <View
                key={tip.title}
                className="flex-row items-start bg-white border border-gray-100 rounded-2xl p-3.5 mb-2"
              >
                <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
                  <Ionicons name={tip.icon} size={18} color="#2563eb" />
                </View>
                <View className="flex-1 ml-3 pr-1">
                  <Text className="text-[13.5px] font-extrabold text-gray-900 mb-0.5">
                    {tip.title}
                  </Text>
                  <Text className="text-[12px] text-gray-500 leading-[17px]">
                    {tip.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bank picker */}
      <BottomSheet
        visible={bankSheetVisible}
        onClose={() => setBankSheetVisible(false)}
        title="Select your bank"
        subtitle="Choose where you'd like your payouts sent"
        height="85%"
      >
        <View className="px-5 pt-3 pb-3">
          <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-11">
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput
              value={bankQuery}
              onChangeText={setBankQuery}
              className="flex-1 ml-2 text-[14px] text-gray-900 h-full"
              placeholder="Search banks…"
              placeholderTextColor="#9ca3af"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {bankQuery.length > 0 && (
              <Pressable
                onPress={() => setBankQuery("")}
                hitSlop={8}
                className="p-1"
              >
                <Ionicons name="close-circle" size={16} color="#cbd5e1" />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          {banksLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-[12px] text-gray-500 mt-2">
                Loading banks…
              </Text>
            </View>
          ) : filteredBanks.length === 0 ? (
            <View className="items-center py-12">
              <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mb-3">
                <Ionicons name="business-outline" size={22} color="#9ca3af" />
              </View>
              <Text className="text-[14px] font-semibold text-gray-700 mb-1">
                No matches
              </Text>
              <Text className="text-[12px] text-gray-500 text-center">
                No bank matches "{bankQuery}"
              </Text>
            </View>
          ) : (
            filteredBanks.map((bank, idx) => {
              const isSelected =
                selectedBank?.code === bank.code &&
                selectedBank?.name === bank.name;
              return (
                <Pressable
                  key={`${bank.code}-${bank.name}-${idx}`}
                  onPress={() => handleSelectBank(bank)}
                  className={`flex-row items-center px-3 py-3 rounded-2xl mb-1 ${
                    isSelected
                      ? "bg-blue-50/60 border border-blue-100"
                      : "border border-transparent"
                  }`}
                >
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center ${
                      isSelected ? "bg-blue-100" : "bg-gray-100"
                    }`}
                  >
                    <Ionicons
                      name="business-outline"
                      size={16}
                      color={isSelected ? "#2563eb" : "#6b7280"}
                    />
                  </View>
                  <Text
                    className={`flex-1 ml-3 text-[14px] ${
                      isSelected
                        ? "font-extrabold text-gray-900"
                        : "font-semibold text-gray-800"
                    }`}
                    numberOfLines={1}
                  >
                    {bank.name}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#2563eb"
                    />
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}
