import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState, useEffect, useMemo } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useVendor } from "../../context/VendorContext";
import { ScreenHeader } from "../components/ScreenHeader";
import KeyboardScreen from "../components/KeyboardScreen";
import { AppToast, AppToastTone } from "../components/AppToast";
import { updatePersonalProfile } from "../api/vendor/vendor.api";

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const getInitials = (name: string): string => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
};

export default function PersonalDetails() {
  const { storeData, fetchVendorData } = useVendor();
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Hydrate from vendor data once it lands. We deliberately don't track
  // a separate `loading` state — the screen renders the form
  // immediately with whatever's in storeData (likely cached) and
  // updates in place when the fetch settles.
  useEffect(() => {
    if (!storeData) return;
    setFullName(storeData.fullName ?? "");
    setPhoneNumber(storeData.userPhoneNumber ?? "");
  }, [storeData?.fullName, storeData?.userPhoneNumber]);

  const initialFullName = storeData?.fullName ?? "";
  const initialPhone = storeData?.userPhoneNumber ?? "";
  const isDirty =
    fullName.trim() !== initialFullName.trim() ||
    phoneNumber.trim() !== initialPhone.trim();

  const initials = useMemo(() => getInitials(fullName || "??"), [fullName]);

  const handleSave = async () => {
    if (!isDirty || saving) return;
    if (!fullName.trim()) {
      setToast({ title: "Name can't be empty", tone: "error" });
      return;
    }
    haptic();
    try {
      setSaving(true);
      await updatePersonalProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });
      // Refetch so storeData reflects the new values everywhere
      // (Home greeting, profile menu, etc.).
      await fetchVendorData();
      setToast({
        title: "Profile updated",
        subtitle: fullName.trim(),
        tone: "success",
      });
    } catch (err: any) {
      // Log to console too so the actual stack/network detail is
      // visible during dev, not just the toast.
      console.error("Update personal profile failed:", err);
      setToast({
        title: "Couldn't update profile",
        subtitle: err?.message || "Try again in a moment.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppToast
        visible={toast != null}
        title={toast?.title ?? ""}
        subtitle={toast?.subtitle}
        tone={toast?.tone}
        onHide={() => setToast(null)}
      />
      <ScreenHeader title="Personal details" />

      <KeyboardScreen>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {/* Branded hero with avatar */}
          <View
            className="mx-5 mt-4 mb-4 rounded-3xl overflow-hidden px-5 pt-6 pb-7"
            style={{ backgroundColor: "#194eb8" }}
          >
            <View
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            />
            <View className="items-center">
              <View
                className="w-20 h-20 rounded-3xl items-center justify-center"
                style={{
                  backgroundColor: "rgba(255,255,255,0.18)",
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.25)",
                }}
              >
                <Text className="text-white text-[26px] font-extrabold tracking-tight">
                  {initials}
                </Text>
              </View>
              <Text
                className="text-white text-[20px] font-extrabold tracking-tight mt-3"
                numberOfLines={1}
              >
                {fullName || "Your name"}
              </Text>
              <Text className="text-white/70 text-[12px] mt-0.5" numberOfLines={1}>
                {storeData?.email || "—"}
              </Text>
            </View>
          </View>

          {/* Form card */}
          <View className="px-5">
            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-2 pl-1">
              Account info
            </Text>

            <View
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              {/* Full name */}
              <View className="px-4 py-3.5 border-b border-gray-50">
                <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px] mb-1">
                  Full name
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="person" size={15} color="#94a3b8" />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="What customers should call you"
                    placeholderTextColor="#cbd5e1"
                    className="flex-1 ml-2.5 text-[15px] font-semibold text-gray-900"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Phone */}
              <View className="px-4 py-3.5 border-b border-gray-50">
                <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px] mb-1">
                  Phone
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="call" size={15} color="#94a3b8" />
                  <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#cbd5e1"
                    className="flex-1 ml-2.5 text-[15px] font-semibold text-gray-900"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Email — read-only */}
              <View className="px-4 py-3.5 bg-gray-50/50">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px]">
                    Email
                  </Text>
                  <View className="flex-row items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                    <Ionicons name="lock-closed" size={9} color="#6b7280" />
                    <Text className="text-[9px] font-extrabold text-gray-500 tracking-wide uppercase">
                      Locked
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="mail" size={15} color="#94a3b8" />
                  <Text
                    className="flex-1 ml-2.5 text-[15px] font-semibold text-gray-500"
                    numberOfLines={1}
                  >
                    {storeData?.email || "—"}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row items-start gap-2 mt-3 px-1">
              <Ionicons
                name="information-circle"
                size={13}
                color="#94a3b8"
                style={{ marginTop: 1 }}
              />
              <Text className="flex-1 text-[11.5px] text-gray-500 leading-[16px]">
                Email changes need re-verification — contact support if you
                need to update it.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Save bar */}
        <View
          className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-7 bg-white border-t border-gray-100"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={!isDirty || saving}
            className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
              isDirty && !saving ? "" : "opacity-50"
            }`}
            style={{
              backgroundColor: "#194eb8",
              shadowColor: "#194eb8",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDirty && !saving ? 0.3 : 0,
              shadowRadius: 16,
              elevation: isDirty && !saving ? 6 : 0,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark-circle" size={18} color="white" />
            )}
            <Text className="text-white font-extrabold text-[15px] tracking-tight">
              {saving ? "Saving…" : isDirty ? "Save changes" : "No changes"}
            </Text>
          </Pressable>
        </View>
      </KeyboardScreen>
    </View>
  );
}
