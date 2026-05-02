import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  RefreshControl,
  Platform,
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
  useProducts,
  useInvalidateProducts,
  PRODUCTS_PAGE_SIZE,
} from "../hooks/useProducts";
import { AppImage, prefetchImage } from "../components/AppImage";
import { ProductGridSkeleton } from "../components/ProductCardSkeleton";
import { ScreenHeader } from "../components/ScreenHeader";
import { Pagination } from "../components/Pagination";
import { ListSearchBar } from "../components/ListSearchBar";
import { BottomSheet, BottomSheetFooter } from "../components/BottomSheet";
import {
  applyGlobalDiscount,
  setTransactionChargeBearer,
  getCatalogCategories,
} from "../../src/api/vendor/vendor.api";
import { getDisplayPrice, FeeBearer } from "../lib/pricing";
import { useVendor } from "../../context/VendorContext";
import { CatalogCategory } from "../../src/api/vendor/vendor.types";
import { CategoryManagerSheet } from "../components/CategoryManagerSheet";
import { CategoryPickerSheet } from "../components/CategoryPickerSheet";
import { DraftsSheet } from "../components/DraftsSheet";
import { loadDrafts, ProductDraft } from "../lib/productDrafts";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useFeatures } from "../hooks/useFeatures";
import {
  useSubscriptionUsage,
  useInvalidateSubscriptionUsage,
} from "../hooks/useSubscriptionUsage";
import { FEATURES, FeatureKey } from "../lib/features";
import { FeaturePaywallSheet } from "../components/FeaturePaywallSheet";

type FilterType = "all" | "active" | "low_stock";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  discountPercent: number;
  feeBearer: FeeBearer | null | undefined;
}

function ProductCard({
  product,
  onPress,
  discountPercent,
  feeBearer,
}: ProductCardProps) {
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

  // Resolve what the vendor (and the customer) actually sees on the card —
  // discount applied first, then platform fee added on top when feeBearer
  // is set to "included".
  const pricing = getDisplayPrice({
    price: product.price,
    discountPercent,
    feeBearer,
  });

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

        {pricing.hasDiscount ? (
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-gray-400 text-[12px] line-through">
                ₦{pricing.original.toLocaleString()}
              </Text>
              <View className="bg-emerald-100 px-1.5 py-0.5 rounded">
                <Text className="text-[9.5px] font-extrabold text-emerald-700 tracking-wide">
                  −{pricing.discountPercent}%
                </Text>
              </View>
            </View>
            <Text className="text-gray-900 font-extrabold text-[17px] tracking-tight mt-0.5">
              ₦{pricing.final.toLocaleString()}
            </Text>
          </View>
        ) : (
          <Text className="text-gray-900 font-extrabold text-[17px] tracking-tight">
            ₦{pricing.final.toLocaleString()}
          </Text>
        )}

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
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { storeData, fetchVendorData } = useVendor();

  // Real-time discount + fee-bearer from the store record. When either changes
  // (after Save in the drawers below), every <ProductCard> re-renders with
  // recomputed prices — no API calls per card, no per-product mutations.
  const currentDiscountPercent = Number(storeData?.discountOnAllProducts) || 0;
  const currentFeeBearer: FeeBearer | null = (storeData?.feeBearer as FeeBearer) ?? null;

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

  // Vendor-defined catalog categories: list, selected filter, and the
  // management sheet open state. Fetched once on mount and refetched
  // whenever the management sheet reports a change.
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [categoriesSheetOpen, setCategoriesSheetOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  // Local product drafts (saved via "Save as draft" in the Add modal). We
  // surface the count + a banner here so vendors can find them without
  // hunting inside the modal — fixes the confusion of expecting saved
  // drafts to show under the server-side "Drafts" filter.
  const [localDraftCount, setLocalDraftCount] = useState(0);
  const [draftsSheetOpen, setDraftsSheetOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ProductDraft | null>(null);
  const refreshDraftCount = useCallback(async () => {
    const drafts = await loadDrafts();
    setLocalDraftCount(drafts.length);
  }, []);
  useFocusEffect(
    useCallback(() => {
      refreshDraftCount();
    }, [refreshDraftCount])
  );

  const refreshCategories = useCallback(async () => {
    try {
      const data = await getCatalogCategories();
      setCategories(data);
      // If the currently-selected filter no longer exists, reset to All.
      setSelectedCategoryId((prev) =>
        prev != null && !data.some((c) => c.id === prev) ? null : prev
      );
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, []);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  const invalidatePaged = useInvalidateProducts();
  const invalidateUsage = useInvalidateSubscriptionUsage();
  const invalidateAll = useCallback(() => {
    invalidatePaged();
    // Counts shown in the hero card (and the cap gate) drift after each
    // create/delete — keep them honest by re-fetching on every mutation.
    invalidateUsage();
  }, [invalidatePaged, invalidateUsage]);

  // Plan limits — drives the "X of Y" display in the hero and the
  // upgrade-banner shown at the cap. `catalogItemLimit == null` means the
  // plan is unlimited and we skip the gauge entirely.
  const { data: usageData } = useSubscriptionUsage();
  const catalogLimit = usageData?.catalogItemLimit ?? null;

  // Threshold the server uses when the Low-stock filter is active. Server
  // returns products with `stock < LOW_STOCK_THRESHOLD` only when this value
  // is sent (omitted otherwise so behaviour matches every other caller).
  const LOW_STOCK_THRESHOLD = 5;
  const lowStockThreshold =
    activeFilter === "low_stock" ? LOW_STOCK_THRESHOLD : undefined;

  // Page is reset to 1 whenever search, category, or the low-stock filter
  // changes — otherwise the vendor could land on an out-of-range page (e.g.
  // searching narrows results from 5 pages to 1, but we were on page 4).
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategoryId, lowStockThreshold]);

  const { data, isPending, isFetching, refetch } = useProducts({
    page,
    search: debouncedSearch,
    categoryId: selectedCategoryId ?? undefined,
    lowStockThreshold,
  });

  const allProducts: Product[] = useMemo(() => data?.data ?? [], [data]);
  const totalCount = data?.totalCount ?? 0;
  // Derived from totalCount + pageSize directly so we never depend on the
  // API's totalPages field — keeps mobile correct even if a backend
  // endpoint forgets to compute it (as the orders endpoint did).
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PAGE_SIZE));
  const rangeStart =
    totalCount === 0 ? 0 : (page - 1) * PRODUCTS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PRODUCTS_PAGE_SIZE, totalCount);

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

  // "Active" stays a client-side filter over the current page, since the
  // server doesn't expose a status filter. "low_stock" is server-side now —
  // the API already returns only matching rows when lowStockThreshold is
  // sent, so no extra in-memory pass is needed.
  const filteredProducts = useMemo(() => {
    if (activeFilter === "active")
      return allProducts.filter((p) => p.status === 1);
    return allProducts;
  }, [allProducts, activeFilter]);

  const activeCount = useMemo(
    () => allProducts.filter((p) => p.status === 1).length,
    [allProducts]
  );

  // Feature gating — Low-stock filter is paywalled. The handler below opens
  // the upgrade sheet instead of switching the filter when the active plan
  // doesn't grant it. Declared here (above the sentinel count query) so
  // `canUseLowStock` is in scope when we conditionally fetch.
  const { has: hasFeature } = useFeatures();
  const canUseLowStock = hasFeature(FEATURES.PRODUCTS_LOW_STOCK);
  const canUseCategories = hasFeature(FEATURES.PRODUCTS_CATEGORIES);
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(
    null
  );

  // Pull the *true* low-stock total directly from the server with a tiny
  // sentinel query (pageSize=1, only `totalCount` is consumed). Without this
  // we'd be reporting the count of low-stock items on the current page only,
  // which is misleading once the catalog spans multiple pages.
  //
  // Skip the query for vendors who don't have the feature — the server-side
  // gate would otherwise strip the param and return the full catalog count,
  // which would mislead the badge.
  const lowStockCountQuery = useProducts({
    page: 1,
    pageSize: 1,
    lowStockThreshold: canUseLowStock ? LOW_STOCK_THRESHOLD : undefined,
  });
  const lowStockCount = !canUseLowStock
    ? 0
    : activeFilter === "low_stock"
    ? totalCount
    : lowStockCountQuery.data?.totalCount ?? 0;

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
    if (next === "low_stock" && !canUseLowStock) {
      setPaywallFeature(FEATURES.PRODUCTS_LOW_STOCK);
      return;
    }
    setActiveFilter(next);
  };

  const [savingFee, setSavingFee] = useState(false);
  const handleSaveFeeConfiguration = useCallback(async () => {
    if (savingFee) return;
    try {
      setSavingFee(true);
      await setTransactionChargeBearer(selectedFeeOption);
      // Refresh storeData so every <ProductCard> picks up the new fee setting.
      await fetchVendorData();
      toast.show("Fee setting updated", { type: "success" });
      setConfigureFeeModalOpen(false);
    } catch (err: any) {
      toast.show(err?.message || "Couldn't save fee setting", {
        type: "danger",
      });
    } finally {
      setSavingFee(false);
    }
  }, [savingFee, selectedFeeOption, fetchVendorData, toast]);

  // Discount actions — applying, clearing. Saves via the dedicated endpoint
  // and refetches storeData so cards re-render with new prices instantly.
  const [savingDiscount, setSavingDiscount] = useState(false);
  const handleApplyDiscount = useCallback(async () => {
    const parsed = Number(discountValue);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 90) return;
    if (savingDiscount) return;
    try {
      setSavingDiscount(true);
      await applyGlobalDiscount(parsed);
      await fetchVendorData();
      toast.show(`Discount of ${parsed}% applied`, { type: "success" });
      setApplyDiscountModalOpen(false);
    } catch (err: any) {
      toast.show(err?.message || "Couldn't apply discount", {
        type: "danger",
      });
    } finally {
      setSavingDiscount(false);
    }
  }, [discountValue, savingDiscount, fetchVendorData, toast]);

  const handleClearDiscount = useCallback(async () => {
    if (savingDiscount) return;
    try {
      setSavingDiscount(true);
      await applyGlobalDiscount(0);
      await fetchVendorData();
      setDiscountValue("");
      toast.show("Discount removed", { type: "success" });
      setApplyDiscountModalOpen(false);
    } catch (err: any) {
      toast.show(err?.message || "Couldn't remove discount", {
        type: "danger",
      });
    } finally {
      setSavingDiscount(false);
    }
  }, [savingDiscount, fetchVendorData, toast]);

  // Pre-fill the drawer state from the current store record whenever a
  // drawer opens, so the vendor sees what's currently set.
  useEffect(() => {
    if (applyDiscountModalOpen) {
      setDiscountValue(
        currentDiscountPercent > 0 ? String(currentDiscountPercent) : ""
      );
    }
  }, [applyDiscountModalOpen, currentDiscountPercent]);
  useEffect(() => {
    if (configureFeeModalOpen && currentFeeBearer) {
      setSelectedFeeOption(currentFeeBearer);
    }
  }, [configureFeeModalOpen, currentFeeBearer]);

  // After paging, scroll back to the top of the product grid so the new page
  // is visible without an extra swipe up. The scroll is scheduled on the
  // next macrotask so it runs *after* React commits the new page's render
  // — calling scrollTo synchronously with setPage occasionally no-ops
  // because the ScrollView's contentSize is still mid-update.
  const scrollRef = useRef<ScrollView | null>(null);
  const handlePageChange = useCallback((next: number) => {
    setPage(next);
    const scrollUp = () =>
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
    scrollUp();
    setTimeout(scrollUp, 0);
    setTimeout(scrollUp, 120);
  }, []);

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

      <View className="flex-row items-baseline">
        <Text className="text-[44px] leading-[52px] font-extrabold text-gray-900 tracking-tight">
          {totalCount}
        </Text>
        {catalogLimit != null && (
          <Text className="text-[18px] leading-[24px] font-bold text-gray-400 ml-1.5 tracking-tight">
            / {catalogLimit}
          </Text>
        )}
      </View>
      <Text className="text-[13px] text-gray-500 mt-1">
        {catalogLimit != null
          ? `${Math.max(0, catalogLimit - totalCount)} ${
              catalogLimit - totalCount === 1 ? "slot" : "slots"
            } left on ${usageData?.planName ?? "your plan"}`
          : "across your catalog"}
      </Text>

      {catalogLimit != null && totalCount >= catalogLimit && (
        <Pressable
          onPress={() => {
            if (Platform.OS === "ios") {
              Haptics.selectionAsync().catch(() => {});
            }
            // The Subscription tab is part of the bottom nav — reusing the
            // existing screen avoids a deep-link from the limit banner.
            navigation.navigate("SubscriptionBilling");
          }}
          className="mt-3 flex-row items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5"
        >
          <Ionicons name="alert-circle" size={14} color="#b45309" />
          <Text className="flex-1 text-[12px] font-bold text-amber-800">
            You've hit your product limit. Upgrade to add more.
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#b45309" />
        </Pressable>
      )}

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
          <View
            className={`w-2 h-2 rounded-full ${
              lowStockCount > 0 ? "bg-amber-500" : "bg-gray-300"
            }`}
          />
          <Text className="text-[14px] font-bold text-gray-900">
            {lowStockCount}
          </Text>
          <Text className="text-[13px] text-gray-500">Low stock</Text>
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

      {localDraftCount > 0 && (
        <Pressable
          onPress={() => {
            if (Platform.OS === "ios") {
              Haptics.selectionAsync().catch(() => {});
            }
            setDraftsSheetOpen(true);
          }}
          className="mx-5 mb-3 flex-row items-center bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 active:bg-blue-100"
        >
          <View className="w-9 h-9 rounded-xl bg-blue-600 items-center justify-center">
            <Ionicons name="bookmark" size={15} color="white" />
          </View>
          <View className="flex-1 min-w-0 ml-3">
            <Text className="text-[13.5px] font-extrabold text-blue-900">
              {localDraftCount} saved draft
              {localDraftCount === 1 ? "" : "s"} on this device
            </Text>
            <Text className="text-[11.5px] text-blue-700/80 mt-0.5" numberOfLines={1}>
              Pick up where you left off — these aren't published yet.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#1d4ed8" />
        </Pressable>
      )}

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
              { key: "low_stock", label: "Low stock", count: lowStockCount },
            ] as const
          ).map((filter) => {
            const isActive = activeFilter === filter.key;
            const isLocked = filter.key === "low_stock" && !canUseLowStock;
            return (
              <Pressable
                key={filter.key}
                onPress={() => handleFilterTap(filter.key)}
                className={`flex-row items-center gap-2 px-4 h-9 rounded-full border ${
                  isActive
                    ? "bg-gray-900 border-gray-900"
                    : isLocked
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-gray-200"
                }`}
              >
                {isLocked && (
                  <Ionicons
                    name="lock-closed"
                    size={11}
                    color="#9ca3af"
                  />
                )}
                <Text
                  className={`text-[13px] font-semibold ${
                    isActive
                      ? "text-white"
                      : isLocked
                      ? "text-gray-500"
                      : "text-gray-700"
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

      {/* Single category-filter trigger. Scales to any number of categories —
          tapping opens a searchable picker sheet. */}
     
      <View className="mb-3 px-5">
        {(() => {
          const selectedCategory =
            selectedCategoryId != null
              ? categories.find((c) => c.id === selectedCategoryId)
              : null;
          const isFiltered = selectedCategory != null && canUseCategories;
          const locked = !canUseCategories;

          // When the plan doesn't grant categories, render the same card but
          // grayed out + locked. Tapping anywhere on it opens the paywall
          // instead of the picker / manager sheets, so the vendor sees the
          // feature exists and how to unlock it.
          const openPaywall = () => {
            if (Platform.OS === "ios") {
              Haptics.selectionAsync().catch(() => {});
            }
            setPaywallFeature(FEATURES.PRODUCTS_CATEGORIES);
          };

          return (
            <View
              className={`flex-row items-stretch border rounded-2xl overflow-hidden ${
                locked ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100"
              }`}
              style={
                locked
                  ? undefined
                  : {
                      shadowColor: "#0f172a",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 10,
                      elevation: 2,
                    }
              }
            >
              <Pressable
                onPress={() => {
                  if (locked) {
                    openPaywall();
                    return;
                  }
                  if (Platform.OS === "ios") {
                    Haptics.selectionAsync().catch(() => {});
                  }
                  setCategoryPickerOpen(true);
                }}
                className="flex-1 flex-row items-center px-3.5 py-3"
              >
                <View
                  className={`w-9 h-9 rounded-xl items-center justify-center ${
                    locked
                      ? "bg-gray-200"
                      : isFiltered
                      ? "bg-blue-600"
                      : "bg-blue-50"
                  }`}
                >
                  <Ionicons
                    name={
                      locked
                        ? "lock-closed"
                        : isFiltered
                        ? "pricetag"
                        : "apps-outline"
                    }
                    size={15}
                    color={locked ? "#9ca3af" : isFiltered ? "white" : "#2563eb"}
                  />
                </View>
                <View className="flex-1 min-w-0 ml-3">
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      className={`text-[10.5px] font-extrabold uppercase tracking-[1.2px] ${
                        locked ? "text-gray-400" : "text-gray-400"
                      }`}
                    >
                      Category
                    </Text>
                    {locked ? (
                      <View className="px-1.5 py-[1px] rounded-full bg-blue-50 border border-blue-100">
                        <Text className="text-[8.5px] font-extrabold text-blue-600 tracking-[0.8px]">
                          UPGRADE
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    className={`text-[14px] font-bold mt-0.5 ${
                      locked ? "text-gray-400" : "text-gray-900"
                    }`}
                    numberOfLines={1}
                  >
                    {locked
                      ? "Organize products by category"
                      : selectedCategory
                      ? selectedCategory.name
                      : "All categories"}
                  </Text>
                </View>
                {isFiltered ? (
                  <Pressable
                    onPress={() => {
                      if (Platform.OS === "ios") {
                        Haptics.selectionAsync().catch(() => {});
                      }
                      setSelectedCategoryId(null);
                    }}
                    hitSlop={8}
                    className="w-8 h-8 rounded-full items-center justify-center bg-gray-50 active:bg-gray-100 mr-1"
                  >
                    <Ionicons name="close" size={14} color="#6b7280" />
                  </Pressable>
                ) : null}
                <Ionicons
                  name={locked ? "chevron-forward" : "chevron-down"}
                  size={16}
                  color={locked ? "#cbd5e1" : "#9ca3af"}
                />
              </Pressable>

              <View
                className={`w-px ${locked ? "bg-gray-200" : "bg-gray-100"}`}
              />

              <Pressable
                onPress={() => {
                  if (locked) {
                    openPaywall();
                    return;
                  }
                  if (Platform.OS === "ios") {
                    Haptics.selectionAsync().catch(() => {});
                  }
                  setCategoriesSheetOpen(true);
                }}
                className={`px-4 items-center justify-center ${
                  locked ? "" : "active:bg-gray-50"
                }`}
              >
                <Ionicons
                  name={locked ? "lock-closed-outline" : "settings-outline"}
                  size={16}
                  color={locked ? "#9ca3af" : "#2563eb"}
                />
                <Text
                  className={`text-[10px] font-extrabold mt-0.5 uppercase tracking-[0.8px] ${
                    locked ? "text-gray-400" : "text-blue-600"
                  }`}
                >
                  {locked ? "Locked" : "Manage"}
                </Text>
              </Pressable>
            </View>
          );
        })()}
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
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
                  discountPercent={currentDiscountPercent}
                  feeBearer={currentFeeBearer}
                />
              ))}
            </View>
          )}

        </View>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          isFetching={isFetching}
          onPageChange={handlePageChange}
        />
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
          setPendingDraft(null);
          // Refresh draft count after the modal closes — the user may have
          // saved a new draft or deleted one inside the modal.
          refreshDraftCount();
        }}
        mode={selectedProduct ? "edit" : "add"}
        productData={selectedProduct}
        initialDraft={pendingDraft}
        onProductAdded={() => invalidateAll()}
      />

      <DraftsSheet
        visible={draftsSheetOpen}
        onClose={() => {
          setDraftsSheetOpen(false);
          refreshDraftCount();
        }}
        onLoad={(draft) => {
          setDraftsSheetOpen(false);
          setPendingDraft(draft);
          setSelectedProduct(null);
          setShowAddProductModal(true);
        }}
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
          loading={savingFee}
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
                  <Text className="font-extrabold">all products</Text>. Tap{" "}
                  <Text className="font-extrabold">Remove discount</Text> below
                  to clear it whenever you're done.
                </Text>
              </View>

              {/* Remove-discount action — only when there's actually one set
                  on the server right now. Lives inside the body (not the
                  footer) so vendors notice it before scrolling away. */}
              {currentDiscountPercent > 0 && (
                <Pressable
                  onPress={handleClearDiscount}
                  disabled={savingDiscount}
                  className="mt-3 h-12 rounded-2xl border border-rose-100 bg-white items-center justify-center flex-row gap-2 active:bg-rose-50"
                >
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color="#dc2626"
                  />
                  <Text className="text-rose-600 text-[14px] font-extrabold">
                    Remove current {currentDiscountPercent}% discount
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          );
        })()}

        <BottomSheetFooter
          onCancel={() => setApplyDiscountModalOpen(false)}
          onSave={handleApplyDiscount}
          saveLabel={
            currentDiscountPercent > 0 ? "Update discount" : "Apply discount"
          }
          loading={savingDiscount}
          saveDisabled={
            !discountValue ||
            !Number.isFinite(Number(discountValue)) ||
            Number(discountValue) < 1 ||
            Number(discountValue) > 90
          }
        />
      </BottomSheet>

      {/* Category filter picker — searchable, scales to any list size */}
      <CategoryPickerSheet
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelect={(id) => setSelectedCategoryId(id)}
        onManage={() => {
          setCategoryPickerOpen(false);
          setCategoriesSheetOpen(true);
        }}
      />

      {/* Category management — list, create, rename, delete */}
      <CategoryManagerSheet
        visible={categoriesSheetOpen}
        onClose={() => setCategoriesSheetOpen(false)}
        onChanged={refreshCategories}
      />

      {/* Paywall sheet — opened when the vendor taps a gated feature their
          plan doesn't include. */}
      <FeaturePaywallSheet
        visible={paywallFeature != null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature}
      />
    </View>
  );
}
