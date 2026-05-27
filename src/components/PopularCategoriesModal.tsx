import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useVendor } from "../../context/VendorContext";
import { getCatalogCategories } from "../api/vendor/vendor.api";
import type { CatalogCategory } from "../api/vendor/vendor.types";
import { BottomSheet } from "./BottomSheet";

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

const MAX = 6;

export interface PopularCategoryTile {
  catalogCategoryId: number;
  imageUrl?: string | null;
}

interface DraftTile {
  catalogCategoryId: number;
  imageUrl: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

/**
 * Popular categories editor — picks up to 6 catalog categories to
 * surface as circular tiles near the top of the Grace landing page.
 * Each tile has a category id + optional image URL; the tile's label
 * is derived from the catalog category name server-side, so we just
 * persist `{ catalogCategoryId, imageUrl }` pairs.
 */
export default function PopularCategoriesModal({ visible, onClose }: Props) {
  const { storeData, updateVendorSettings } = useVendor();
  const [tiles, setTiles] = useState<DraftTile[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const initial: PopularCategoryTile[] =
      (storeData as any)?.storeFrontJson?.popularCategories ?? [];
    setTiles(
      initial.map((t) => ({
        catalogCategoryId: t.catalogCategoryId,
        imageUrl: t.imageUrl ?? "",
      })),
    );

    // Load categories fresh — small list, fast call.
    let cancelled = false;
    setLoading(true);
    getCatalogCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, storeData]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const usedIds = useMemo(
    () => new Set(tiles.map((t) => t.catalogCategoryId)),
    [tiles],
  );

  const addable = categories.filter((c) => !usedIds.has(c.id));

  const addTile = (catalogCategoryId: number) => {
    haptic();
    if (tiles.length >= MAX) {
      Alert.alert("Limit reached", `You can show up to ${MAX} category tiles.`);
      return;
    }
    setTiles((c) => [...c, { catalogCategoryId, imageUrl: "" }]);
  };

  const removeTile = (i: number) => {
    haptic();
    setTiles((c) => c.filter((_, idx) => idx !== i));
  };

  const setImage = (i: number, value: string) => {
    setTiles((c) =>
      c.map((t, idx) => (idx === i ? { ...t, imageUrl: value } : t)),
    );
  };

  const handleSave = async () => {
    if (!storeData) return;
    setSaving(true);
    try {
      const merged = {
        ...(storeData as any).storeFrontJson,
        popularCategories: tiles.map((t) => ({
          catalogCategoryId: t.catalogCategoryId,
          imageUrl: t.imageUrl.trim() || null,
        })),
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
      title="Popular categories"
      subtitle={`${tiles.length} of ${MAX} tiles · circular tiles on your landing page`}
      height="92%"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current tiles */}
          {tiles.length === 0 ? (
            <View className="items-center py-8">
              <View className="w-16 h-16 rounded-2xl bg-violet-50 items-center justify-center mb-3">
                <Ionicons name="grid-outline" size={26} color="#7c3aed" />
              </View>
              <Text
                className="text-[14.5px] text-gray-900 mb-1"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                No category tiles yet
              </Text>
              <Text className="text-[12.5px] text-gray-500 text-center max-w-[280px] leading-[18px]">
                Pick categories from your catalog below to surface them at the
                top of your landing page.
              </Text>
            </View>
          ) : (
            <View className="gap-3 mb-5">
              {tiles.map((tile, i) => {
                const cat = categoryById.get(tile.catalogCategoryId);
                return (
                  <View
                    key={`${tile.catalogCategoryId}-${i}`}
                    className="bg-white rounded-2xl border border-gray-100 p-3"
                  >
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mr-3">
                        <Ionicons name="grid" size={18} color="#2563eb" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text
                          className="text-[10.5px] font-extrabold text-gray-400 uppercase"
                          style={{ letterSpacing: 1.2 }}
                        >
                          Category
                        </Text>
                        <Text
                          className="text-[14px] text-gray-900"
                          numberOfLines={1}
                          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                        >
                          {cat?.name ?? `Unknown #${tile.catalogCategoryId}`}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => removeTile(i)}
                        hitSlop={6}
                        className="w-9 h-9 rounded-full bg-rose-50 items-center justify-center active:bg-rose-100"
                      >
                        <Ionicons name="close" size={16} color="#dc2626" />
                      </Pressable>
                    </View>
                    <View className="mt-3">
                      <Text
                        className="text-[10.5px] font-extrabold text-gray-500 uppercase mb-1.5"
                        style={{ letterSpacing: 1.2 }}
                      >
                        Image URL (optional)
                      </Text>
                      <TextInput
                        value={tile.imageUrl}
                        onChangeText={(v) => setImage(i, v)}
                        placeholder="https://…"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[13.5px] text-gray-900"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Picker */}
          <View>
            <Text
              className="text-[10.5px] font-extrabold text-gray-500 uppercase mb-2"
              style={{ letterSpacing: 1.2 }}
            >
              Add a category
            </Text>
            {loading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            ) : addable.length === 0 ? (
              <Text className="text-[12.5px] text-gray-500">
                {tiles.length >= MAX
                  ? `You've added the maximum of ${MAX} tiles.`
                  : "All your categories are already shown. Add categories in the Products screen to surface more."}
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {addable.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => addTile(cat.id)}
                    disabled={tiles.length >= MAX}
                    className={`flex-row items-center gap-1.5 px-3 h-9 rounded-full border ${
                      tiles.length >= MAX
                        ? "bg-gray-50 border-gray-200 opacity-50"
                        : "bg-white border-gray-200 active:bg-blue-50"
                    }`}
                  >
                    <Ionicons name="add" size={12} color="#374151" />
                    <Text
                      className="text-[12.5px] text-gray-700"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
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
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}
