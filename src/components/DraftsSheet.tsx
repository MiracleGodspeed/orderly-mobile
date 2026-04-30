import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { BottomSheet } from "./BottomSheet";
import { AppImage } from "./AppImage";
import {
  ProductDraft,
  loadDrafts,
  deleteDraft as deleteDraftStorage,
  MAX_DRAFTS,
} from "../lib/productDrafts";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fired when the vendor taps a draft — parent should hydrate the form
   *  with the values and open the editor. */
  onLoad: (draft: ProductDraft) => void;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

const formatRelative = (iso: string): string => {
  const created = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - created) / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
};

/**
 * Counts the number of "meaningful" fields the vendor has filled in so we
 * can show a completion ratio on each draft card. Quick visual cue for
 * "this draft is almost done" vs "barely started".
 */
const completion = (
  draft: ProductDraft
): { filled: number; total: number; pct: number } => {
  const checks = [
    !!draft.productName?.trim(),
    !!draft.productDescription?.trim(),
    !!draft.price?.trim(),
    !!draft.stockQuantity?.trim(),
    !!draft.category?.trim(),
    (draft.productImages?.length ?? 0) > 0,
    draft.features.length > 0 ||
      draft.sizes.length > 0 ||
      draft.colors.length > 0,
  ];
  const filled = checks.filter(Boolean).length;
  const total = checks.length;
  return { filled, total, pct: Math.round((filled / total) * 100) };
};

export function DraftsSheet({ visible, onClose, onLoad }: Props) {
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await loadDrafts();
      if (!cancelled) {
        setDrafts(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const usedPct = useMemo(
    () => Math.round((drafts.length / MAX_DRAFTS) * 100),
    [drafts.length]
  );

  const handleDelete = (draft: ProductDraft) => {
    Alert.alert(
      "Delete draft?",
      `"${draft.productName?.trim() || "Untitled draft"}" will be removed from your drafts. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updated = await deleteDraftStorage(draft.id);
            setDrafts(updated);
          },
        },
      ]
    );
  };

  const handleLoad = (draft: ProductDraft) => {
    haptic();
    onLoad(draft);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Saved drafts"
      subtitle="Local to this device — pick up right where you left off"
      height="86%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
      >
        {loading ? (
          <View className="items-center py-14">
            <ActivityIndicator size="small" color="#2563eb" />
            <Text className="text-[12.5px] text-gray-500 mt-3 font-semibold">
              Loading drafts…
            </Text>
          </View>
        ) : drafts.length === 0 ? (
          <View
            className="items-center py-12 px-6 bg-white rounded-3xl border border-gray-100 mt-3"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 16,
              elevation: 2,
            }}
          >
            <View className="w-16 h-16 rounded-3xl bg-blue-50 items-center justify-center mb-4 border border-blue-100/70">
              <Ionicons name="bookmark-outline" size={26} color="#2563eb" />
            </View>
            <Text className="text-[16px] font-extrabold text-gray-900 tracking-tight">
              No drafts yet
            </Text>
            <Text className="text-[12.5px] text-gray-500 mt-1.5 text-center max-w-[280px] leading-5">
              Half-finished product? Tap{" "}
              <Text className="font-bold text-gray-700">"Save as draft"</Text>{" "}
              while adding a product and you'll find it here later.
            </Text>
            <View className="flex-row items-center gap-2 mt-5 px-3.5 py-2 rounded-full bg-gray-50 border border-gray-100">
              <Ionicons name="lock-closed" size={11} color="#64748b" />
              <Text className="text-[11px] font-semibold text-gray-600">
                Stays on this device — never uploaded
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* Capacity meter — premium hero */}
            <View
              className="mt-3 mb-4 rounded-3xl overflow-hidden border border-blue-100"
              style={{
                shadowColor: "#1d4ed8",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              <View
                className="px-5 py-4"
                style={{ backgroundColor: "#eff6ff" }}
              >
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1 pr-3">
                    <Text className="text-[10.5px] font-extrabold text-blue-700 uppercase tracking-[1.4px]">
                      Capacity
                    </Text>
                    <View className="flex-row items-baseline mt-1.5 gap-1.5">
                      <Text className="text-[26px] font-extrabold text-gray-900 tracking-tight leading-[28px]">
                        {drafts.length}
                      </Text>
                      <Text className="text-[14px] font-bold text-gray-500">
                        / {MAX_DRAFTS}
                      </Text>
                      <Text className="text-[12px] font-semibold text-gray-500 ml-1">
                        slots used
                      </Text>
                    </View>
                  </View>
                  <View className="w-10 h-10 rounded-2xl bg-white items-center justify-center border border-blue-100">
                    <Ionicons name="bookmark" size={16} color="#2563eb" />
                  </View>
                </View>

                <View className="h-2 rounded-full bg-blue-200/40 overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${usedPct}%`,
                      backgroundColor: "#2563eb",
                    }}
                  />
                </View>

                <Text className="text-[11px] text-blue-700/85 mt-2 font-semibold">
                  {drafts.length === MAX_DRAFTS
                    ? "Slots full — delete an older draft to save a new one."
                    : `${MAX_DRAFTS - drafts.length} more draft${
                        MAX_DRAFTS - drafts.length === 1 ? "" : "s"
                      } can be saved.`}
                </Text>
              </View>
            </View>

            <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.4px] mb-2.5 px-1">
              Tap a draft to continue editing
            </Text>

            <View className="gap-2.5">
              {drafts.map((draft) => {
                const cover = draft.productImages?.[0];
                const hasPrice = !!draft.price?.trim();
                const priceLabel = hasPrice
                  ? `₦${Number(draft.price).toLocaleString()}`
                  : "No price";
                const stockLabel = draft.stockQuantity?.trim()
                  ? `${draft.stockQuantity} in stock`
                  : null;
                const description = draft.productDescription?.trim();
                const { filled, total, pct } = completion(draft);
                const completionTone =
                  pct >= 80
                    ? {
                        text: "text-emerald-700",
                        bg: "bg-emerald-50",
                        bar: "#059669",
                      }
                    : pct >= 50
                    ? {
                        text: "text-amber-700",
                        bg: "bg-amber-50",
                        bar: "#d97706",
                      }
                    : {
                        text: "text-blue-700",
                        bg: "bg-blue-50",
                        bar: "#2563eb",
                      };

                return (
                  <Pressable
                    key={draft.id}
                    onPress={() => handleLoad(draft)}
                    className="bg-white rounded-3xl border border-gray-100 overflow-hidden active:bg-gray-50"
                    style={{
                      shadowColor: "#0f172a",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 12,
                      elevation: 2,
                    }}
                  >
                    <View className="flex-row p-3">
                      {/* Cover */}
                      <View className="w-[72px] h-[72px] rounded-2xl overflow-hidden bg-gray-50 items-center justify-center border border-gray-100">
                        {cover ? (
                          <AppImage
                            uri={cover}
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          <Ionicons
                            name="image-outline"
                            size={22}
                            color="#94a3b8"
                          />
                        )}
                      </View>

                      {/* Body */}
                      <View className="flex-1 min-w-0 ml-3.5">
                        <View className="flex-row items-start justify-between gap-2">
                          <Text
                            className="flex-1 text-[14.5px] font-extrabold text-gray-900 tracking-tight"
                            numberOfLines={1}
                          >
                            {draft.productName?.trim() || "Untitled draft"}
                          </Text>
                          <Pressable
                            onPress={() => handleDelete(draft)}
                            hitSlop={8}
                            className="w-7 h-7 rounded-full items-center justify-center -mt-1 -mr-1 active:bg-rose-50"
                          >
                            <Ionicons
                              name="close"
                              size={14}
                              color="#94a3b8"
                            />
                          </Pressable>
                        </View>

                        {description ? (
                          <Text
                            className="text-[12px] text-gray-500 mt-1 leading-[16px]"
                            numberOfLines={2}
                          >
                            {description}
                          </Text>
                        ) : (
                          <Text className="text-[12px] text-gray-400 italic mt-1">
                            No description yet
                          </Text>
                        )}

                        <View className="flex-row items-center flex-wrap gap-1.5 mt-2">
                          <View
                            className={`px-2 py-0.5 rounded-md ${
                              hasPrice ? "bg-gray-900" : "bg-gray-100"
                            }`}
                          >
                            <Text
                              className={`text-[10.5px] font-extrabold tracking-wide ${
                                hasPrice ? "text-white" : "text-gray-500"
                              }`}
                            >
                              {priceLabel}
                            </Text>
                          </View>
                          {stockLabel && (
                            <View className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100">
                              <Text className="text-[10.5px] font-bold text-emerald-700">
                                {stockLabel}
                              </Text>
                            </View>
                          )}
                          {!!draft.category?.trim() && (
                            <View className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100">
                              <Text
                                className="text-[10.5px] font-bold text-blue-700"
                                numberOfLines={1}
                              >
                                {draft.category}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Footer strip */}
                    <View className="flex-row items-center justify-between px-3.5 py-2.5 border-t border-gray-50 bg-gray-50/40">
                      <View className="flex-row items-center gap-2 flex-1 min-w-0">
                        <View className="flex-row items-center gap-1.5">
                          <View
                            className={`w-1.5 h-1.5 rounded-full`}
                            style={{ backgroundColor: completionTone.bar }}
                          />
                          <Text
                            className={`text-[11px] font-extrabold ${completionTone.text}`}
                          >
                            {filled}/{total} filled
                          </Text>
                        </View>
                        <Text className="text-gray-300 text-[11px]">·</Text>
                        <Text
                          className="text-[11px] font-semibold text-gray-500"
                          numberOfLines={1}
                        >
                          Saved {formatRelative(draft.createdAt)}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-[11.5px] font-extrabold text-blue-700">
                          Continue
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={13}
                          color="#2563eb"
                        />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
