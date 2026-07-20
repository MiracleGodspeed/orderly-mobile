import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useToast } from "react-native-toast-notifications";

import { ScreenHeader } from "../components/ScreenHeader";
import { AppImage } from "../components/AppImage";
import { FeaturePaywallSheet } from "../components/FeaturePaywallSheet";
import { useFeatures } from "../hooks/useFeatures";
import { FEATURES, FeatureKey } from "../lib/features";
import {
  getMyReviews,
  setReviewActive,
  type ProductReviewRow,
} from "../api/vendor/vendor.api";

const PAGE_SIZE = 20;

const cardShadow = {
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 14,
  elevation: 2,
} as const;

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row items-center" style={{ gap: 1.5 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < rating ? "star" : "star-outline"}
          size={size}
          color={i < rating ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </View>
  );
}

/**
 * Vendor Reviews module — every rating + written review customers left
 * on the storefront, newest first, with the product it belongs to.
 * Plan-gated on products.reviews.
 */
export default function Reviews() {
  const toast = useToast();
  const { has, isReady } = useFeatures();
  const locked = isReady && !has(FEATURES.PRODUCT_REVIEWS);

  const [rows, setRows] = useState<ProductReviewRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(null);

  const handleToggle = async (row: ProductReviewRow) => {
    setBusyId(row.id);
    try {
      await setReviewActive(row.id, !row.isActive);
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, isActive: !row.isActive } : r
        )
      );
    } catch (err: any) {
      toast.show(err?.message || "Couldn't update the review", {
        type: "danger",
      });
    } finally {
      setBusyId(null);
    }
  };

  const load = useCallback(
    async (pageIndex: number, replace: boolean) => {
      const result = await getMyReviews({ pageIndex, pageSize: PAGE_SIZE });
      setTotalCount(result.totalCount);
      setRows((prev) => (replace ? result.data : [...prev, ...result.data]));
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        await load(1, true);
      } catch (err: any) {
        toast.show(err?.message || "Couldn't load reviews", { type: "danger" });
      } finally {
        setLoading(false);
      }
    })();
  }, [load, toast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(1, true);
      setPage(1);
    } catch {
      // Pull-to-refresh failures stay silent.
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onLoadMore = async () => {
    const next = page + 1;
    setLoadingMore(true);
    try {
      await load(next, false);
      setPage(next);
    } finally {
      setLoadingMore(false);
    }
  };

  const average =
    rows.length > 0
      ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length
      : 0;

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Reviews" />

      {locked ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-14 h-14 rounded-2xl bg-amber-50 items-center justify-center mb-4">
            <Ionicons name="lock-closed" size={22} color="#d97706" />
          </View>
          <Text
            className="text-gray-900 text-[16px] text-center"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Ratings & reviews is a plan feature
          </Text>
          <Text className="text-gray-500 text-[13px] mt-1.5 text-center leading-[19px]">
            Let customers rate your products and leave written reviews on your
            storefront — social proof that sells for you.
          </Text>
          <Pressable
            onPress={() => setPaywallFeature(FEATURES.PRODUCT_REVIEWS)}
            className="h-10 mt-5 px-5 rounded-full bg-blue-600 items-center justify-center"
          >
            <Text className="text-white font-bold text-[13px]">
              See upgrade options
            </Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {rows.length === 0 ? (
            <View className="items-center px-8 py-20">
              <View className="w-14 h-14 rounded-2xl bg-amber-50 items-center justify-center mb-4">
                <Ionicons name="star-outline" size={22} color="#f59e0b" />
              </View>
              <Text
                className="text-gray-900 text-[16px] text-center"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                No reviews yet
              </Text>
              <Text className="text-gray-500 text-[13px] mt-1.5 text-center leading-[19px]">
                When customers rate your products on your storefront, every
                star and every word lands here.
              </Text>
            </View>
          ) : (
            <>
              {/* Summary strip */}
              <View
                className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-4 py-3.5 mb-3"
                style={cardShadow}
              >
                <View className="w-11 h-11 rounded-2xl bg-amber-50 items-center justify-center mr-3.5">
                  <Ionicons name="star" size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text
                    className="text-gray-900 text-[19px]"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {average.toFixed(1)}
                    <Text className="text-[12px] text-gray-400"> / 5</Text>
                  </Text>
                  <Text className="text-[11.5px] text-gray-500 font-semibold">
                    {totalCount} review{totalCount === 1 ? "" : "s"} across your
                    products
                  </Text>
                </View>
              </View>

              {rows.map((r) => (
                <View
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 mb-3"
                  style={cardShadow}
                >
                  <View className="flex-row items-start">
                    <View className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden mr-3.5">
                      {r.productImage ? (
                        <AppImage
                          uri={r.productImage}
                          style={{ width: 48, height: 48 }}
                        />
                      ) : null}
                    </View>
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className="text-gray-900 text-[13.5px] flex-1 mr-2"
                          numberOfLines={1}
                          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                        >
                          {r.productTitle ?? "Product"}
                        </Text>
                        <Text className="text-[10.5px] text-gray-400">
                          {formatDate(r.createdAt)}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-1" style={{ gap: 8 }}>
                        <Stars rating={r.rating} />
                        <Text className="text-[12px] font-semibold text-gray-600">
                          {r.reviewerName}
                        </Text>
                        <View
                          className={`px-2 py-0.5 rounded-full ${
                            r.isActive ? "bg-emerald-50" : "bg-amber-50"
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-extrabold uppercase tracking-wide ${
                              r.isActive ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {r.isActive ? "Published" : "Awaiting approval"}
                          </Text>
                        </View>
                      </View>
                      {r.body ? (
                        <Text className="text-[13px] text-gray-700 mt-2 leading-[19px]">
                          {r.body}
                        </Text>
                      ) : null}
                      <Pressable
                        onPress={() => handleToggle(r)}
                        disabled={busyId === r.id}
                        className={`self-start flex-row items-center mt-3 h-8 px-3.5 rounded-full ${
                          r.isActive
                            ? "border border-gray-200 bg-white active:bg-gray-50"
                            : "bg-blue-600 active:bg-blue-700"
                        }`}
                        style={{ gap: 5, opacity: busyId === r.id ? 0.6 : 1 }}
                      >
                        {busyId === r.id ? (
                          <ActivityIndicator
                            size="small"
                            color={r.isActive ? "#6b7280" : "white"}
                          />
                        ) : (
                          <Ionicons
                            name={r.isActive ? "eye-off-outline" : "eye-outline"}
                            size={13}
                            color={r.isActive ? "#6b7280" : "white"}
                          />
                        )}
                        <Text
                          className={`text-[11.5px] font-extrabold ${
                            r.isActive ? "text-gray-600" : "text-white"
                          }`}
                        >
                          {r.isActive ? "Hide from storefront" : "Publish to storefront"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}

              {rows.length < totalCount && (
                <Pressable
                  onPress={onLoadMore}
                  disabled={loadingMore}
                  className="h-11 mt-1 rounded-full border border-gray-200 bg-white items-center justify-center flex-row"
                  style={{ gap: 8 }}
                >
                  {loadingMore && (
                    <ActivityIndicator size="small" color="#6b7280" />
                  )}
                  <Text className="text-[13px] font-semibold text-gray-700">
                    Load more
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      )}

      <FeaturePaywallSheet
        visible={paywallFeature != null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature}
      />
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
