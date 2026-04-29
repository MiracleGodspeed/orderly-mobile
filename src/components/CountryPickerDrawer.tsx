import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "./BottomSheet";
import { Country } from "../api/auth/auth.types";

interface Props {
  visible: boolean;
  onClose: () => void;
  countries: Country[];
  loading?: boolean;
  selectedCode?: string;
  onSelect: (country: Country) => void;
}

export function CountryPickerDrawer({
  visible,
  onClose,
  countries,
  loading,
  selectedCode,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code ?? "").toLowerCase().includes(q)
    );
  }, [countries, query]);

  const handlePick = (country: Country) => {
    if (country.enabled === false) return;
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    onSelect(country);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Select country"
      subtitle="We'll prefix your phone with the right dial code"
      height="85%"
    >
      <View className="px-5 pt-3 pb-3">
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-11">
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            className="flex-1 ml-2 text-[14px] text-gray-900 h-full"
            placeholder="Search country or dial code…"
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
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
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="small" color="#2563eb" />
            <Text className="text-[12px] text-gray-500 mt-2">
              Loading countries…
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center py-12">
            <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mb-3">
              <Ionicons name="globe-outline" size={22} color="#9ca3af" />
            </View>
            <Text className="text-[14px] font-semibold text-gray-700 mb-1">
              No matches
            </Text>
            <Text className="text-[12px] text-gray-500 text-center">
              No country matches "{query}"
            </Text>
          </View>
        ) : (
          filtered.map((country) => {
            const isDisabled = country.enabled === false;
            const isSelected = country.code === selectedCode;
            return (
              <Pressable
                key={`${country.code}-${country.name}`}
                onPress={() => handlePick(country)}
                disabled={isDisabled}
                className={`flex-row items-center px-3 py-3 rounded-2xl mb-1 ${
                  isSelected
                    ? "bg-blue-50/60 border border-blue-100"
                    : "border border-transparent"
                }`}
                style={{ opacity: isDisabled ? 0.45 : 1 }}
              >
                <Text className="text-[22px] mr-3" style={{ lineHeight: 26 }}>
                  {country.flag ?? "🏳️"}
                </Text>
                <Text
                  className={`flex-1 text-[14px] ${
                    isSelected
                      ? "font-extrabold text-gray-900"
                      : "font-semibold text-gray-800"
                  }`}
                  numberOfLines={1}
                >
                  {country.name}
                </Text>
                {isDisabled ? (
                  <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[9px] font-extrabold text-gray-500 tracking-wide uppercase">
                      Coming soon
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text
                      className={`text-[13px] mr-2 ${
                        isSelected
                          ? "font-extrabold text-blue-700"
                          : "font-semibold text-gray-500"
                      }`}
                    >
                      {country.code}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#2563eb"
                      />
                    )}
                  </>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </BottomSheet>
  );
}
