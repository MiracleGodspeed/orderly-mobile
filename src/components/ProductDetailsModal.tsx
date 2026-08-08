import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { Product } from "../../src/api/vendor/vendor.types";
import { AppImage } from "./AppImage";

interface Props {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  /** Hide the Edit button when the active session lacks
   *  catalog.edit. Defaults to true so vendors / admins are unaffected. */
  canEdit?: boolean;
  /** Hide the Delete button when the active session lacks
   *  catalog.delete. Defaults to true. */
  canDelete?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

export default function ProductDetailsModal({
  visible,
  onClose,
  product,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: Props) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Pull every non-empty image off the product.
  const images = useMemo(() => {
    if (!product) return [];
    return [
      product.image,
      product.image2,
      product.image3,
      product.image4,
      product.image5,
    ].filter((s): s is string => !!s && s.length > 0);
  }, [product]);

  if (!product) return null;

  const handleScroll = (e: any) => {
    const idx = Math.round(
      e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
    );
    if (idx !== activeImage) setActiveImage(idx);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await onDelete();
      setShowDeleteConfirmation(false);
    } catch (error) {
      setDeleteLoading(false);
    }
  };

  // Stock status — drives the pill color & label
  const stockStatus = (() => {
    if (product.stock <= 0) {
      return {
        label: "Out of stock",
        bg: "bg-rose-50",
        border: "border-rose-100",
        text: "text-rose-700",
        dot: "bg-rose-500",
      };
    }
    if (product.stock <= 5) {
      return {
        label: `Low · ${product.stock} left`,
        bg: "bg-amber-50",
        border: "border-amber-100",
        text: "text-amber-700",
        dot: "bg-amber-500",
      };
    }
    return {
      label: `${product.stock} in stock`,
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    };
  })();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        {/* Top bar */}
        <View className="px-5 pt-2 pb-3 bg-gray-50 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={20} color="#111827" />
          </TouchableOpacity>
          <Text
            className="text-[15px] text-gray-900"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Product details
          </Text>
          <View className="w-10 h-10" />
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Image carousel */}
          <View
            className="mx-5 mt-1 rounded-3xl overflow-hidden bg-white border border-gray-100"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <View
              style={{
                width: SCREEN_WIDTH - 40, // account for mx-5
                height: 320,
                position: "relative",
              }}
            >
              {images.length === 0 ? (
                <View className="flex-1 items-center justify-center bg-gray-100">
                  <View className="w-16 h-16 rounded-2xl bg-gray-200 items-center justify-center mb-2">
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color="#9ca3af"
                    />
                  </View>
                  <Text className="text-[12px] text-gray-500">
                    No images yet
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleScroll}
                  scrollEventThrottle={16}
                >
                  {images.map((src, i) => (
                    <View
                      key={`${src}-${i}`}
                      style={{
                        width: SCREEN_WIDTH - 40,
                        height: 320,
                      }}
                    >
                      <AppImage
                        uri={src}
                        contentFit="cover"
                        style={{ width: "100%", height: "100%" }}
                      />
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Image counter chip — only when there's more than one */}
              {images.length > 1 && (
                <View
                  className="absolute top-3 right-3 bg-black/55 px-2.5 py-1 rounded-full"
                >
                  <Text className="text-white text-[11px] font-extrabold tracking-wide">
                    {activeImage + 1} / {images.length}
                  </Text>
                </View>
              )}

              {/* Badge — top-left over the image */}
              {!!product.badge && (
                <View className="absolute top-3 left-3 bg-blue-600 px-2.5 py-1 rounded-full">
                  <Text className="text-white text-[10.5px] font-extrabold tracking-wide uppercase">
                    {product.badge}
                  </Text>
                </View>
              )}
            </View>

            {/* Dots — only when multi-image */}
            {images.length > 1 && (
              <View className="flex-row items-center justify-center gap-1.5 py-3 bg-white">
                {images.map((_, i) => (
                  <View
                    key={i}
                    className={`h-1.5 rounded-full ${
                      i === activeImage
                        ? "w-5 bg-blue-600"
                        : "w-1.5 bg-gray-300"
                    }`}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Title + price card */}
          <View
            className="mx-5 mt-4 bg-white rounded-3xl border border-gray-100 p-5"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
            }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <Text
                className="text-gray-900 flex-1 text-[20px]"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  letterSpacing: -0.4,
                  lineHeight: 26,
                }}
              >
                {product.title}
              </Text>
              <View
                className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border ${stockStatus.bg} ${stockStatus.border}`}
              >
                <View
                  className={`w-1.5 h-1.5 rounded-full ${stockStatus.dot}`}
                />
                <Text
                  className={`text-[10.5px] font-extrabold ${stockStatus.text}`}
                >
                  {stockStatus.label}
                </Text>
              </View>
            </View>

            <View className="flex-row items-baseline gap-2 mt-3">
              <Text
                className="text-gray-900"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 26,
                  letterSpacing: -0.8,
                }}
              >
                ₦{product.price.toLocaleString()}
              </Text>
              {!!product.originalPrice &&
                product.originalPrice > product.price && (
                  <Text
                    className="text-[14px] text-gray-400"
                    style={{
                      textDecorationLine: "line-through",
                    }}
                  >
                    ₦{product.originalPrice.toLocaleString()}
                  </Text>
                )}
            </View>

            {/* Tiny meta row — category + sku */}
            <View className="flex-row items-center gap-2 mt-3">
              {!!product.category && (
                <View className="flex-row items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Ionicons name="pricetag-outline" size={10} color="#6b7280" />
                  <Text className="text-[10.5px] font-bold text-gray-700">
                    {product.category}
                  </Text>
                </View>
              )}
              {!!product.sku && (
                <View className="flex-row items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] text-gray-500 font-bold">
                    SKU
                  </Text>
                  <Text className="text-[10.5px] font-bold text-gray-700">
                    {product.sku}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Variants — only render section if either exists */}
          {((product.colourOptions && product.colourOptions.length > 0) ||
            (product.sizeOptions && product.sizeOptions.length > 0)) && (
            <View
              className="mx-5 mt-4 bg-white rounded-3xl border border-gray-100 p-5"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              {!!(product.colourOptions && product.colourOptions.length > 0) && (
                <View className={product.sizeOptions?.length ? "mb-5" : undefined}>
                  <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3">
                    Colors · {product.colourOptions.length}
                  </Text>
                  <View className="flex-row flex-wrap gap-2.5">
                    {product.colourOptions.map((color, i) => (
                      <View
                        key={`${color}-${i}`}
                        className="w-9 h-9 rounded-full border-2 border-white items-center justify-center"
                        style={{
                          backgroundColor: color,
                          shadowColor: "#0f172a",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 3,
                          elevation: 1,
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}

              {!!(product.sizeOptions && product.sizeOptions.length > 0) && (
                <View>
                  <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3">
                    Sizes · {product.sizeOptions.length}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {product.sizeOptions.map((size, i) => (
                      <View
                        key={`${size}-${i}`}
                        className="bg-gray-50 border border-gray-200 px-3.5 py-1.5 rounded-full"
                      >
                        <Text className="text-[12.5px] font-extrabold text-gray-800">
                          {size}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          {!!product.description && (
            <View
              className="mx-5 mt-4 bg-white rounded-3xl border border-gray-100 p-5"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-2">
                Description
              </Text>
              <Text className="text-[14px] text-gray-700 leading-[22px]">
                {product.description}
              </Text>
            </View>
          )}

          {/* Features */}
          {!!(product.features && product.features.length > 0) && (
            <View
              className="mx-5 mt-4 bg-white rounded-3xl border border-gray-100 p-5"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <Text className="text-[11px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-3">
                Key features
              </Text>
              {product.features.map((feature, i) => (
                <View
                  key={`${feature}-${i}`}
                  className="flex-row items-start gap-2.5 py-1.5"
                >
                  <View className="w-5 h-5 rounded-full bg-emerald-50 items-center justify-center mt-0.5">
                    <Ionicons name="checkmark" size={12} color="#059669" />
                  </View>
                  <Text className="text-[13.5px] text-gray-700 leading-[20px] flex-1">
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats grid */}
          <View className="mx-5 mt-4 flex-row gap-3">
            <StatTile
              icon="cube-outline"
              tint="#dbeafe"
              iconColor="#2563eb"
              label="Stock"
              value={`${product.stock} units`}
            />
            <StatTile
              icon="cash-outline"
              tint="#d1fae5"
              iconColor="#059669"
              label="Sales"
              value={`${product.sales ?? 0}`}
            />
          </View>
        </ScrollView>

        {/* Sticky action bar — entire bar disappears when the staff
            session has neither edit nor delete, so we don't render an
            empty white strip on view-only sessions. */}
        {(canEdit || canDelete) && (
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
            <View className="flex-row gap-3">
              {canDelete && (
                <Pressable
                  onPress={() => {
                    haptic();
                    setShowDeleteConfirmation(true);
                  }}
                  className="flex-1 h-12 rounded-2xl border border-rose-100 bg-white items-center justify-center flex-row gap-2 active:bg-rose-50"
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  <Text className="text-rose-600 text-[14.5px]"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Delete
                  </Text>
                </Pressable>
              )}
              {canEdit && (
                <Pressable
                  onPress={() => {
                    haptic();
                    onEdit();
                  }}
                  className="flex-1 h-12 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2"
                  style={{
                    shadowColor: "#2563eb",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="white" />
                  <Text className="text-white text-[14.5px]"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Edit product
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirmation && (
          <View className="absolute inset-0 bg-black/60 justify-center items-center px-6">
            <View
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.18,
                shadowRadius: 24,
                elevation: 12,
              }}
            >
              <View className="items-center mb-4">
                <View className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl items-center justify-center">
                  <Ionicons name="alert-circle" size={28} color="#dc2626" />
                </View>
              </View>

              <Text
                className="text-gray-900 text-center text-[18px] mb-2"
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  letterSpacing: -0.3,
                }}
              >
                Delete this product?
              </Text>

              <Text className="text-[13.5px] text-gray-500 text-center mb-6 leading-[20px]">
                "{product.title}" will be permanently removed from your store.
                This can't be undone.
              </Text>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setShowDeleteConfirmation(false)}
                  disabled={deleteLoading}
                  className="flex-1 h-12 rounded-2xl border border-gray-200 bg-white items-center justify-center active:bg-gray-50"
                >
                  <Text className="text-gray-900 font-semibold text-[14px]">
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirmDelete}
                  disabled={deleteLoading}
                  className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                    deleteLoading ? "bg-rose-400" : "bg-rose-600"
                  }`}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={14} color="white" />
                      <Text className="text-white font-bold text-[14px]">
                        Delete
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function StatTile({
  icon,
  tint,
  iconColor,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View
      className="flex-1 bg-white rounded-3xl border border-gray-100 p-4"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mb-2"
        style={{ backgroundColor: tint }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-[1.2px] mb-0.5">
        {label}
      </Text>
      <Text
        className="text-gray-900 text-[16px]"
        style={{
          fontFamily: "PlusJakartaSans_700Bold",
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
