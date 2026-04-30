import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { BottomSheet } from "./BottomSheet";
import { CatalogCategory } from "../api/vendor/vendor.types";

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: CatalogCategory[];
  selectedCategoryId: number | null;
  onSelect: (categoryId: number | null) => void;
  /** Opens the manage drawer; the parent is responsible for closing this
   *  picker first if it wants to swap to the manager. */
  onManage: () => void;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export function CategoryPickerSheet({
  visible,
  onClose,
  categories,
  selectedCategoryId,
  onSelect,
  onManage,
}: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const handlePick = (id: number | null) => {
    haptic();
    onSelect(id);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filter by category"
      subtitle="Pick a category to narrow your products"
      height="80%"
    >
      {/* Search */}
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search categories"
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 py-3 text-[14px] text-gray-900"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      >
        {/* "All categories" — only shown when no search query */}
        {query.trim().length === 0 && (
          <Pressable
            onPress={() => handlePick(null)}
            className={`flex-row items-center px-4 py-3 rounded-2xl mb-2 border ${
              selectedCategoryId == null
                ? "bg-blue-50 border-blue-200"
                : "bg-white border-gray-100"
            }`}
          >
            <View
              className={`w-9 h-9 rounded-xl items-center justify-center ${
                selectedCategoryId == null ? "bg-blue-600" : "bg-gray-50"
              }`}
            >
              <Ionicons
                name="apps-outline"
                size={15}
                color={selectedCategoryId == null ? "white" : "#6b7280"}
              />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-[14px] font-extrabold text-gray-900">
                All categories
              </Text>
              <Text className="text-[12px] text-gray-500 mt-0.5">
                Show every product in your catalog
              </Text>
            </View>
            {selectedCategoryId == null && (
              <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
            )}
          </Pressable>
        )}

        {/* Category list */}
        {categories.length === 0 ? (
          <View className="items-center py-10 bg-white rounded-3xl border border-gray-100 mt-2">
            <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-2">
              <Ionicons name="albums-outline" size={20} color="#2563eb" />
            </View>
            <Text className="text-[14px] font-extrabold text-gray-900">
              No categories yet
            </Text>
            <Text className="text-[12px] text-gray-500 mt-1 text-center max-w-[260px] mb-4">
              Create categories to group products into your own collections.
            </Text>
            <Pressable
              onPress={() => {
                haptic();
                onManage();
              }}
              className="bg-blue-600 h-10 px-4 rounded-2xl flex-row items-center gap-2"
            >
              <Ionicons name="add-circle-outline" size={14} color="white" />
              <Text className="text-white font-bold text-[13px]">
                Create first category
              </Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center py-8">
            <Text className="text-[13px] font-bold text-gray-700">
              No matches
            </Text>
            <Text className="text-[12px] text-gray-500 mt-1">
              Try a different search.
            </Text>
          </View>
        ) : (
          <View
            className="bg-white rounded-3xl border border-gray-100 overflow-hidden mt-1"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            {filtered.map((category, idx) => {
              const isActive = selectedCategoryId === category.id;
              const isLast = idx === filtered.length - 1;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => handlePick(category.id)}
                  className={`flex-row items-center px-4 py-3 ${
                    isLast ? "" : "border-b border-gray-50"
                  } ${isActive ? "bg-blue-50/60" : ""}`}
                >
                  <View
                    className={`w-9 h-9 rounded-xl items-center justify-center ${
                      isActive ? "bg-blue-600" : "bg-blue-50"
                    }`}
                  >
                    <Ionicons
                      name="pricetag"
                      size={14}
                      color={isActive ? "white" : "#2563eb"}
                    />
                  </View>
                  <View className="flex-1 min-w-0 ml-3">
                    <Text
                      className="text-[14px] font-extrabold text-gray-900"
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                    {!!category.description && (
                      <Text
                        className="text-[12px] text-gray-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {category.description}
                      </Text>
                    )}
                  </View>
                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#2563eb"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Manage link — present at the bottom whenever categories exist */}
        {categories.length > 0 && (
          <Pressable
            onPress={() => {
              haptic();
              onManage();
            }}
            className="mt-4 h-11 rounded-2xl border border-gray-200 bg-white flex-row items-center justify-center gap-1.5"
          >
            <Ionicons name="settings-outline" size={14} color="#374151" />
            <Text className="text-[13px] font-extrabold text-gray-800">
              Manage categories
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
