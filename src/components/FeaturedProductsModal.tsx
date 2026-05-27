import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useVendor } from "../../context/VendorContext";
import { useProducts } from "../hooks/useProducts";
import { AppImage } from "./AppImage";
import { BottomSheet } from "./BottomSheet";

const MAX = 3;

interface Props {
  visible: boolean;
  onClose: () => void;
}

const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="px-5 pt-3 pb-7 border-t border-gray-100 bg-white"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      {children}
    </View>
  );
}

/**
 * Featured products picker — vendor selects up to 3 catalog items to
 * surface in the Grace template's "Featured Products" section. Saves
 * an `featuredProductIds: string[]` slot inside `storeFrontJson`.
 *
 * The picker loads the vendor's products through `useProducts` so we
 * don't have to add a new endpoint just for the picker. A search field
 * narrows the list client-side — vendors with massive catalogs will
 * want server-side search later, but for the typical 10–50 SKU vendor
 * this is plenty.
 */
export default function FeaturedProductsModal({ visible, onClose }: Props) {
  const { storeData, updateVendorSettings } = useVendor();
  const { data: productsData } = useProducts({ page: 1 });
  const all = productsData?.data ?? [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const initial: string[] =
      (storeData as any)?.storeFrontJson?.featuredProductIds ?? [];
    setSelectedIds(initial);
    setQuery("");
  }, [visible, storeData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [all, query]);

  const toggle = (id: string) => {
    haptic();
    setSelectedIds((curr) => {
      if (curr.includes(id)) return curr.filter((x) => x !== id);
      if (curr.length >= MAX) {
        Alert.alert(
          "Limit reached",
          `You can feature up to ${MAX} products. Remove one first.`,
        );
        return curr;
      }
      return [...curr, id];
    });
  };

  const handleSave = async () => {
    if (!storeData) return;
    setSaving(true);
    try {
      const merged = {
        ...(storeData as any).storeFrontJson,
        featuredProductIds: selectedIds.slice(0, MAX),
      };
      await updateVendorSettings({ storeFrontJson: merged });
      onClose();
    } catch (e) {
      Alert.alert("Couldn't save", "Please try again.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Featured products"
      subtitle={`${selectedIds.length} of ${MAX} picked · shown on your storefront`}
      height="92%"
    >
      <View className="px-5 pt-4 pb-3">
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl h-11 px-3">
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products"
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-2 text-[14px] text-gray-900 h-full"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color="#cbd5e1" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {all.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator size="small" color="#2563eb" />
            <Text className="text-[12.5px] text-gray-500 mt-2">
              Loading your catalog…
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-[13px] text-gray-500">
              No products match &quot;{query}&quot;.
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap -mx-1">
            {filtered.map((p) => {
              const selectedIdx = selectedIds.indexOf(p.id);
              const isSelected = selectedIdx >= 0;
              return (
                <View key={p.id} style={{ width: "33.333%" }} className="px-1 mb-3">
                  <Pressable
                    onPress={() => toggle(p.id)}
                    className={`relative rounded-2xl overflow-hidden border ${
                      isSelected ? "border-blue-500" : "border-gray-100"
                    }`}
                    style={
                      isSelected
                        ? {
                            shadowColor: "#2563eb",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.18,
                            shadowRadius: 6,
                            elevation: 3,
                          }
                        : undefined
                    }
                  >
                    <View className="aspect-square bg-gray-50">
                      {p.image ? (
                        <AppImage
                          uri={p.image}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : (
                        <View className="w-full h-full items-center justify-center">
                          <Ionicons name="image-outline" size={20} color="#cbd5e1" />
                        </View>
                      )}
                      {isSelected && (
                        <View className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                          <Text
                            className="text-white text-[11px]"
                            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                          >
                            {selectedIdx + 1}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="p-2">
                      <Text
                        className="text-[11.5px] text-gray-900"
                        numberOfLines={1}
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        {p.title}
                      </Text>
                      <Text
                        className="text-[11px] text-gray-900 mt-0.5"
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        ₦{(p.price ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <SheetFooter>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="h-12 rounded-2xl items-center justify-center flex-row gap-2 bg-blue-600"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Ionicons name="checkmark" size={16} color="white" />
          <Text
            className="text-white text-[14.5px]"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {saving ? "Saving…" : "Save"}
          </Text>
        </Pressable>
      </SheetFooter>
    </BottomSheet>
  );
}
