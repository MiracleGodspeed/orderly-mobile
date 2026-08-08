import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useProducts } from "../hooks/useProducts";
import { AppImage } from "./AppImage";
import { formatNaira } from "../lib/format";

/**
 * Pick the products a question applies to.
 *
 * Deliberately the same interaction as the product picker in Log order:
 * a full screen, a search box at the top, a list of rows, tap a row and
 * it ticks. A vendor who has ever logged an offline order already knows
 * this screen, so there is nothing new to learn.
 *
 * Selections are held locally and only handed back on Done, so a vendor
 * who taps through six products and changes their mind can close without
 * having half-applied the change.
 */
export default function ProductPickerSheet({
  selectedIds,
  onClose,
  onChange,
}: {
  selectedIds: string[];
  onClose: () => void;
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Mounted only while open, so the initial selection is just initial
  // state — no reset effect, and no chance of going stale between
  // openings.
  const [picked, setPicked] = useState<string[]>(selectedIds);

  // 300ms matches the Log order picker: short enough to feel instant,
  // long enough to collapse a typing burst into one request.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const {
    data: productsData,
    isPending: isLoading,
    isFetching,
  } = useProducts({
    pageSize: 50,
    search: debouncedSearch || undefined,
  });

  const products = useMemo(
    () => productsData?.data ?? [],
    [productsData?.data],
  );
  const pickedSet = useMemo(() => new Set(picked), [picked]);

  const toggle = (id: string) =>
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  return (
    <View className="absolute inset-0 bg-white">
      <SafeAreaView edges={["top"]} className="flex-1">
        <View className="bg-white px-5 py-3 border-b border-gray-100 flex-row items-center">
          <Pressable
            onPress={onClose}
            hitSlop={8}
            className="w-10 h-10 rounded-full items-center justify-center bg-gray-50 mr-3 active:bg-gray-100"
          >
            <Ionicons name="close" size={20} color="#111827" />
          </Pressable>
          <View className="flex-1 min-w-0">
            <Text
              className="text-[16px] text-gray-900"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Pick products
            </Text>
            <Text className="text-[11.5px] text-gray-500">
              This question shows on the ones you tick
            </Text>
          </View>
        </View>

        <View className="px-4 pt-3">
          <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-3 py-2.5">
            <Ionicons name="search" size={16} color="#94a3b8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search products"
              placeholderTextColor="#9ca3af"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              className="flex-1 ml-2 text-[14px] text-gray-900"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            />
            {isFetching && query.trim().length > 0 ? (
              <ActivityIndicator size="small" color="#94a3b8" />
            ) : query.length > 0 ? (
              <Pressable
                onPress={() => setQuery("")}
                hitSlop={8}
                className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={12} color="#64748b" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 24,
            }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = pickedSet.has(item.id);
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  className={`flex-row items-center bg-white rounded-2xl border px-3 py-2.5 mb-2 active:bg-gray-50 ${
                    active ? "border-blue-200 bg-blue-50/40" : "border-gray-100"
                  }`}
                >
                  <View className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden mr-3">
                    {item.image ? (
                      <AppImage
                        uri={item.image}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <Ionicons name="cube-outline" size={18} color="#94a3b8" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 min-w-0 pr-2">
                    <Text
                      className="text-[13.5px] text-gray-900"
                      numberOfLines={1}
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-[12px] text-gray-500 mt-0.5">
                      {formatNaira(item.price)}
                    </Text>
                  </View>
                  <View
                    className={`w-7 h-7 rounded-full items-center justify-center ${
                      active ? "bg-blue-600" : "border border-gray-200"
                    }`}
                  >
                    {active && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Ionicons name="cube-outline" size={28} color="#cbd5e1" />
                <Text className="text-[13px] text-gray-500 mt-2">
                  {debouncedSearch
                    ? `No products match "${debouncedSearch}".`
                    : "You haven't added any products yet."}
                </Text>
              </View>
            }
          />
        )}

        <View className="bg-white px-5 py-4 border-t border-gray-100">
          <Pressable
            onPress={() => {
              onChange(picked);
              onClose();
            }}
            className="rounded-xl bg-gray-900 py-3.5 items-center active:bg-gray-800"
          >
            <Text
              className="text-[14px] text-white"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {picked.length === 0
                ? "Done"
                : `Done · ${picked.length} product${
                    picked.length === 1 ? "" : "s"
                  }`}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
