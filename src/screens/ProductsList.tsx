import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  RefreshControl,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AddProductModal from "../components/AddProductModal";
import ProductDetailsModal from "../components/ProductDetailsModal";
import Ionicons from "@expo/vector-icons/Ionicons";
import { deleteProduct } from "../../src/api/vendor/vendor.api";
import { Product } from "../../src/api/vendor/vendor.types";
import { useToast } from "react-native-toast-notifications";
import * as Haptics from "expo-haptics";

import {
  useInfiniteProducts,
  useInvalidateInfiniteProducts,
} from "../hooks/useInfiniteProducts";
import { useInvalidateProducts } from "../hooks/useProducts";
import { AppImage, prefetchImage } from "../components/AppImage";
import { ProductGridSkeleton } from "../components/ProductCardSkeleton";
import { ScreenHeader } from "../components/ScreenHeader";
import { EndOfList } from "../components/EndOfList";
import { ListSearchBar } from "../components/ListSearchBar";
import { BottomSheet, BottomSheetFooter } from "../components/BottomSheet";

type FilterType = "all" | "active" | "drafts";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

function ProductCard({ product, onPress }: ProductCardProps) {
  const stock = product.stock ?? 0;
  const stockStyle =
    stock === 0
      ? { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" }
      : stock < 10
      ? { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" }
      : { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" };

  const stockLabel =
    stock === 0
      ? "Out of stock"
      : stock < 10
      ? `Low · ${stock} left`
      : `${stock} in stock`;

  const isDraft = product.status !== 1;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-3xl mb-4 overflow-hidden border border-gray-100"
      style={{
        width: "48.5%",
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View className="aspect-square bg-gray-50 relative">
        {product.image ? (
          <AppImage
            uri={product.image}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="image-outline" size={28} color="#cbd5e1" />
          </View>
        )}

        {isDraft && (
          <View className="absolute top-2.5 left-2.5 bg-gray-900/85 px-2 py-1 rounded-full">
            <Text className="text-white text-[10px] font-bold tracking-wider uppercase">
              Draft
            </Text>
          </View>
        )}
      </View>

      <View className="p-3.5">
        <Text
          className="text-gray-900 font-semibold text-[14px] leading-snug mb-2"
          numberOfLines={2}
          style={{ minHeight: 36 }}
        >
          {product.title}
        </Text>

        <Text className="text-gray-900 font-extrabold text-[17px] tracking-tight">
          ₦{(product.price ?? 0).toLocaleString()}
        </Text>

        <View className="h-px bg-gray-100 my-3" />

        <View
          className={`flex-row items-center gap-1.5 self-start px-2 py-1 rounded-md ${stockStyle.bg}`}
        >
          <View className={`w-1.5 h-1.5 rounded-full ${stockStyle.dot}`} />
          <Text className={`text-[11px] font-bold ${stockStyle.text}`}>
            {stockLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProductsList() {
  const toast = useToast();

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  // ListSearchBar owns the visible text + debounce; we only see the settled
  // value, so the parent doesn't re-render on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [configureFeeModalOpen, setConfigureFeeModalOpen] = useState(false);
  const [selectedFeeOption, setSelectedFeeOption] = useState<
    "vendor" | "customer" | "included"
  >("customer");
  const [applyDiscountModalOpen, setApplyDiscountModalOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState("");

  const invalidateInfinite = useInvalidateInfiniteProducts();
  const invalidatePaged = useInvalidateProducts();
  const invalidateAll = useCallback(() => {
    invalidateInfinite();
    invalidatePaged();
  }, [invalidateInfinite, invalidatePaged]);

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteProducts({ search: debouncedSearch });

  const allProducts: Product[] = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  );
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Pre-warm the disk cache for products the user might tap into next.
  useEffect(() => {
    allProducts.forEach((p) => prefetchImage(p.image));
  }, [allProducts]);

  const handleProductClick = (product: Product) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setSelectedProduct(product);
    setShowProductDetailsModal(true);
  };

  const handleEditProduct = () => {
    setShowProductDetailsModal(false);
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      await deleteProduct(selectedProduct.id);
      toast.show("Product deleted successfully", { type: "success" });
      setShowProductDetailsModal(false);
      setSelectedProduct(null);
      invalidateAll();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.show(
        error instanceof Error ? error.message : "Failed to delete product",
        { type: "danger" }
      );
    }
  };

  const filteredProducts = useMemo(() => {
    if (activeFilter === "all") return allProducts;
    return allProducts.filter((product) => {
      if (activeFilter === "active") return product.status === 1;
      if (activeFilter === "drafts") return product.status !== 1;
      return true;
    });
  }, [allProducts, activeFilter]);

  const activeCount = useMemo(
    () => allProducts.filter((p) => p.status === 1).length,
    [allProducts]
  );
  const draftCount = useMemo(
    () => allProducts.filter((p) => p.status !== 1).length,
    [allProducts]
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleFilterTap = (next: FilterType) => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setActiveFilter(next);
  };

  const handleSaveFeeConfiguration = () => {
    toast.show("Fee configuration saved", { type: "success" });
    setConfigureFeeModalOpen(false);
  };

  // Infinite scroll trigger via onScroll instead of FlatList — keeps the
  // TextInput in the header from being unmounted during data updates.
  const fetchingRef = useRef(false);
  fetchingRef.current = isFetchingNextPage;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < 400 && hasNextPage && !fetchingRef.current) {
        fetchNextPage();
      }
    },
    [hasNextPage, fetchNextPage]
  );

  const showInitialSkeleton = isPending && !data;

  // Hero metric scrolls with the list — pure summary content.
  const HeroCard = (
    <View
      className="mx-5 mt-4 mb-4 bg-white rounded-3xl px-5 py-6 border border-gray-100"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-[12px] font-semibold text-gray-500 uppercase tracking-[1.2px]">
          Total Products
        </Text>
        <View className="bg-blue-50 w-9 h-9 rounded-full items-center justify-center">
          <Ionicons name="cube-outline" size={18} color="#2563eb" />
        </View>
      </View>

      <Text className="text-[44px] leading-[52px] font-extrabold text-gray-900 tracking-tight">
        {totalCount}
      </Text>
      <Text className="text-[13px] text-gray-500 mt-1">
        across your catalog
      </Text>

      <View className="h-px bg-gray-100 my-4" />

      <View className="flex-row items-center gap-5">
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-emerald-500" />
          <Text className="text-[14px] font-bold text-gray-900">
            {activeCount}
          </Text>
          <Text className="text-[13px] text-gray-500">Active</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-gray-400" />
          <Text className="text-[14px] font-bold text-gray-900">
            {draftCount}
          </Text>
          <Text className="text-[13px] text-gray-500">Drafts</Text>
        </View>
      </View>
    </View>
  );

  // Search input + filter chips render inside the scrolling list header.
  // The keyboard-dismiss problem is solved by ListSearchBar holding its own
  // text state — the parent only re-renders when the *debounced* value
  // settles, and ListSearchBar is React.memo'd so it never re-mounts.
  const SearchAndFilter = (
    <View>
      <View className="px-5 mb-3">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <ListSearchBar
              placeholder="Search products..."
              onSearchChange={setDebouncedSearch}
            />
          </View>
          <Pressable
            className="w-12 h-12 bg-white border border-gray-200 rounded-2xl items-center justify-center"
            onPress={() => setApplyDiscountModalOpen(true)}
          >
            <MaterialIcons name="local-offer" size={20} color="#374151" />
          </Pressable>
        </View>
      </View>

      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          keyboardShouldPersistTaps="always"
        >
          {(
            [
              { key: "all", label: "All", count: allProducts.length },
              { key: "active", label: "Active", count: activeCount },
              { key: "drafts", label: "Drafts", count: draftCount },
            ] as const
          ).map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => handleFilterTap(filter.key)}
                className={`flex-row items-center gap-2 px-4 h-9 rounded-full border ${
                  isActive
                    ? "bg-gray-900 border-gray-900"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    isActive ? "text-white" : "text-gray-700"
                  }`}
                >
                  {filter.label}
                </Text>
                <View
                  className={`px-1.5 rounded-full ${
                    isActive ? "bg-white/20" : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      isActive ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {filter.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const EmptyState = (
    <View className="items-center px-8 py-16">
      <View className="w-20 h-20 bg-blue-50 rounded-2xl items-center justify-center mb-5">
        <Ionicons name="cube-outline" size={36} color="#2563eb" />
      </View>
      <Text className="text-gray-900 text-lg font-bold mb-1.5">
        {debouncedSearch ? "No matches" : "No products yet"}
      </Text>
      <Text className="text-gray-500 text-center text-sm leading-5 max-w-xs mb-5">
        {debouncedSearch
          ? "Try a different search term."
          : "Start building your catalog by adding your first product."}
      </Text>
      {!debouncedSearch && (
        <Pressable
          onPress={() => {
            if (Platform.OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {}
              );
            }
            setShowAddProductModal(true);
          }}
          className="bg-blue-600 px-6 py-3 rounded-full flex-row items-center gap-2"
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="text-white font-bold text-sm">Add product</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View className="bg-gray-50 flex-1">
      <ScreenHeader
        title="Products"
        right={
          <Pressable
            onPress={() => setConfigureFeeModalOpen(true)}
            className="p-2 rounded-full bg-gray-50 border border-gray-200"
            hitSlop={6}
          >
            <MaterialIcons name="settings" size={20} color="#374151" />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor="#2563eb"
          />
        }
      >
        {HeroCard}
        {SearchAndFilter}

        <View className="px-5">
          {showInitialSkeleton ? (
            <ProductGridSkeleton count={6} />
          ) : filteredProducts.length === 0 ? (
            EmptyState
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => handleProductClick(product)}
                />
              ))}
            </View>
          )}

          <EndOfList
            isFetchingMore={isFetchingNextPage}
            hasNextPage={!!hasNextPage}
            itemCount={filteredProducts.length}
          />
        </View>
      </ScrollView>

      {/* FAB */}
      <View className="absolute bottom-8 right-6">
        <Pressable
          onPress={() => {
            if (Platform.OS === "ios") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {}
              );
            }
            setShowAddProductModal(true);
          }}
          className="bg-blue-600 w-14 h-14 rounded-full items-center justify-center"
          style={{
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <MaterialIcons name="add" size={28} color="white" />
        </Pressable>
      </View>

      <AddProductModal
        visible={showAddProductModal}
        onClose={() => {
          setShowAddProductModal(false);
          setSelectedProduct(null);
        }}
        mode={selectedProduct ? "edit" : "add"}
        productData={selectedProduct}
        onProductAdded={() => invalidateAll()}
      />

   

      {/* Fee Configuration */}
      <BottomSheet
        visible={configureFeeModalOpen}
        onClose={() => setConfigureFeeModalOpen(false)}
        title="Transaction Fee"
        subtitle="Decide who covers the platform fee on each order"
        height="78%"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        >
          <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mt-4 mb-3">
            Who pays the fee?
          </Text>

          {(
            [
              {
                key: "vendor",
                title: "I'll cover it",
                description: "Deducted from your earnings on each sale",
                example: "On a ₦10,000 order, you receive ₦9,850",
                icon: "storefront-outline" as const,
                tone: { bg: "bg-blue-50", iconColor: "#2563eb" },
              },
              {
                key: "customer",
                title: "Customer covers it",
                description: "Added on top at checkout. You earn the full price.",
                example: "Customer pays ₦10,150, you earn ₦10,000",
                icon: "person-outline" as const,
                tone: { bg: "bg-emerald-50", iconColor: "#059669" },
                badge: "Most popular",
              },
              {
                key: "included",
                title: "Built into the price",
                description: "Already factored into your listed product prices",
                example: "Listed at ₦10,000, you receive ₦9,850",
                icon: "pricetag-outline" as const,
                tone: { bg: "bg-violet-50", iconColor: "#7c3aed" },
              },
            ] as const
          ).map((option) => {
            const selected = selectedFeeOption === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => {
                  if (Platform.OS === "ios") {
                    Haptics.selectionAsync().catch(() => {});
                  }
                  setSelectedFeeOption(option.key);
                }}
                className={`mb-3 rounded-2xl border-2 px-4 py-4 ${
                  selected
                    ? "border-blue-600 bg-blue-50/40"
                    : "border-gray-100 bg-white"
                }`}
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: selected ? 0.06 : 0.03,
                  shadowRadius: 6,
                  elevation: selected ? 2 : 1,
                }}
              >
                <View className="flex-row items-start">
                  <View
                    className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${option.tone.bg}`}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={option.tone.iconColor}
                    />
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-0.5">
                      <Text className="text-[15px] font-extrabold text-gray-900">
                        {option.title}
                      </Text>
                      {"badge" in option && option.badge && (
                        <View className="bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          <Text className="text-[9px] font-extrabold text-emerald-700 tracking-wide uppercase">
                            {option.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[12.5px] text-gray-600 leading-[18px] mb-2">
                      {option.description}
                    </Text>
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons
                        name="calculator-outline"
                        size={12}
                        color="#94a3b8"
                      />
                      <Text className="text-[11px] text-gray-500 italic">
                        {option.example}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`w-6 h-6 rounded-full ml-2 items-center justify-center ${
                      selected
                        ? "bg-blue-600"
                        : "border-2 border-gray-200 bg-white"
                    }`}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}

          <View className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 flex-row items-start gap-3 mt-2">
            <Ionicons name="information-circle-outline" size={18} color="#2563eb" />
            <Text className="text-[12px] text-blue-800 leading-[18px] flex-1">
              You can change this anytime. The platform fee is currently 1.5% of
              each transaction.
            </Text>
          </View>
        </ScrollView>

        <BottomSheetFooter
          onCancel={() => setConfigureFeeModalOpen(false)}
          onSave={handleSaveFeeConfiguration}
          saveLabel="Save Setting"
        />
      </BottomSheet>

      <ProductDetailsModal
        visible={showProductDetailsModal}
        onClose={() => {
          setShowProductDetailsModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
      />
      {/* Apply Discount */}
      <BottomSheet
        visible={applyDiscountModalOpen}
        onClose={() => setApplyDiscountModalOpen(false)}
        title="Apply Discount"
        subtitle="Reduce prices across every product in your catalog"
        height="80%"
      >
        {(() => {
          const parsed = Number(discountValue);
          const discountNum =
            Number.isFinite(parsed) && parsed > 0 && parsed <= 90 ? parsed : 0;
          const isValid =
            Number.isFinite(parsed) && parsed >= 1 && parsed <= 90;
          const sampleOriginal = 10000;
          const sampleDiscounted = Math.round(
            sampleOriginal * (1 - discountNum / 100)
          );
          const sampleSaved = sampleOriginal - sampleDiscounted;

          return (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            >
              {/* Big numeric input — calculator feel */}
              <View
                className="mt-4 mb-5 rounded-3xl border border-gray-100 bg-white px-5 py-6 items-center"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-3">
                  Discount Amount
                </Text>
                <View className="flex-row items-baseline">
                  <TextInput
                    value={discountValue}
                    onChangeText={(v) => setDiscountValue(v.replace(/[^0-9.]/g, ""))}
                    placeholder="0"
                    keyboardType="numeric"
                    className="text-[64px] font-extrabold text-gray-900 tracking-tight"
                    style={{
                      minWidth: 100,
                      textAlign: "center",
                      paddingVertical: 0,
                      lineHeight: 72,
                    }}
                    placeholderTextColor="#cbd5e1"
                    autoFocus
                    maxLength={4}
                  />
                  <Text className="text-[36px] font-extrabold text-gray-300 tracking-tight ml-1">
                    %
                  </Text>
                </View>
                {discountValue.length > 0 && !isValid && (
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <Ionicons name="alert-circle" size={14} color="#dc2626" />
                    <Text className="text-[11.5px] font-semibold text-rose-600">
                      Enter a value between 1 and 90
                    </Text>
                  </View>
                )}
              </View>

              {/* Quick presets */}
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2">
                Quick picks
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-5">
                {[5, 10, 15, 20, 25, 50].map((preset) => {
                  const active = discountValue === String(preset);
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        if (Platform.OS === "ios") {
                          Haptics.selectionAsync().catch(() => {});
                        }
                        setDiscountValue(String(preset));
                      }}
                      className={`px-4 h-10 rounded-full border ${
                        active
                          ? "bg-gray-900 border-gray-900"
                          : "bg-white border-gray-200"
                      }`}
                      style={{ justifyContent: "center" }}
                    >
                      <Text
                        className={`text-[13px] font-bold ${
                          active ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {preset}%
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Live preview */}
              {discountNum > 0 ? (
                <View className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4">
                  <Text className="text-[11px] font-bold text-emerald-700 uppercase tracking-[1.2px] mb-2">
                    Preview
                  </Text>
                  <Text className="text-[13px] text-emerald-900 leading-[20px]">
                    A product priced at{" "}
                    <Text className="font-extrabold">
                      ₦{sampleOriginal.toLocaleString()}
                    </Text>{" "}
                    will sell for{" "}
                    <Text className="font-extrabold">
                      ₦{sampleDiscounted.toLocaleString()}
                    </Text>
                    .
                  </Text>
                  <View className="flex-row items-center gap-2 mt-2">
                    <View className="bg-emerald-600 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-extrabold text-white tracking-wider">
                        −{discountNum}%
                      </Text>
                    </View>
                    <Text className="text-[12px] text-emerald-800 font-semibold">
                      Customer saves ₦{sampleSaved.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-4 flex-row items-start gap-3">
                  <Ionicons
                    name="bulb-outline"
                    size={18}
                    color="#6b7280"
                  />
                  <Text className="text-[12px] text-gray-600 leading-[18px] flex-1">
                    Pick a preset or type a number to see how the discount will
                    affect your prices in real time.
                  </Text>
                </View>
              )}

              <View className="bg-amber-50/60 border border-amber-100 rounded-2xl px-4 py-3 flex-row items-start gap-3 mt-3">
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color="#d97706"
                />
                <Text className="text-[12px] text-amber-800 leading-[18px] flex-1">
                  This applies to{" "}
                  <Text className="font-extrabold">all products</Text>. You can
                  remove the discount anytime by setting it back to 0.
                </Text>
              </View>
            </ScrollView>
          );
        })()}

        <BottomSheetFooter
          onCancel={() => setApplyDiscountModalOpen(false)}
          onSave={() => setApplyDiscountModalOpen(false)}
          saveLabel="Apply Discount"
          saveDisabled={
            !discountValue ||
            !Number.isFinite(Number(discountValue)) ||
            Number(discountValue) < 1 ||
            Number(discountValue) > 90
          }
        />
      </BottomSheet>
    </View>
  );
}
