import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "react-native-toast-notifications";
import ColorPicker, {
  Panel1,
  HueSlider,
  Preview,
} from "reanimated-color-picker";
import { runOnJS } from "react-native-reanimated";

import {
  createProduct,
  updateProduct,
} from "../../src/api/vendor/vendor.api";
import {
  CreateProductPayload,
  Product,
} from "../../src/api/vendor/vendor.types";
import { AppImage } from "./AppImage";
import KeyboardScreen from "./KeyboardScreen";

interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  productData?: Product | null;
  onProductAdded?: () => void;
}

const SECTION_LABEL =
  "text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-3 mt-1";
const FIELD_LABEL = "text-[13px] font-semibold text-gray-700 mb-2";

const PRESET_COLORS = [
  "#0F172A",
  "#1E40AF",
  "#2563EB",
  "#0EA5E9",
  "#0D9488",
  "#059669",
  "#CA8A04",
  "#F97316",
  "#DC2626",
  "#DB2777",
  "#9333EA",
  "#FFFFFF",
];

const isLightColor = (hex: string): boolean => {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7;
};

interface FormErrors {
  productName: string;
  price: string;
  stockQuantity: string;
  productDescription: string;
}

export default function AddProductModal({
  visible,
  onClose,
  mode = "add",
  productData,
  onProductAdded,
}: Props) {
  const toast = useToast();

  const [productImages, setProductImages] = useState<string[]>([]);
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [currentSize, setCurrentSize] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [currentColor, setCurrentColor] = useState("#2563EB");
  const [features, setFeatures] = useState<string[]>([]);
  const [currentFeature, setCurrentFeature] = useState("");
  const [enableVariants, setEnableVariants] = useState(false);

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerReady, setPickerReady] = useState(false);
  const pickerReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [errors, setErrors] = useState<FormErrors>({
    productName: "",
    price: "",
    stockQuantity: "",
    productDescription: "",
  });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Hydrate when editing
  useEffect(() => {
    if (mode === "edit" && productData) {
      setProductName(productData.title);
      setCategory(productData.category);
      setPrice(String(productData.price));
      setStockQuantity(String(productData.stock));
      setProductDescription(productData.description);

      const existingImages: string[] = [];
      if (productData.image) existingImages.push(productData.image);
      if (productData.image2) existingImages.push(productData.image2);
      setProductImages(existingImages);

      if (productData.sizeOptions?.length) setSizes(productData.sizeOptions);
      if (productData.colourOptions?.length)
        setColors(productData.colourOptions);
      if (productData.features?.length) setFeatures(productData.features);

      if (
        (productData.sizeOptions && productData.sizeOptions.length) ||
        (productData.colourOptions && productData.colourOptions.length)
      ) {
        setEnableVariants(true);
      }
    }
  }, [mode, productData]);

  useEffect(() => {
    if (!visible) resetForm();
  }, [visible]);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          const request =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          setHasPermission(request.status === "granted");
        } else {
          setHasPermission(true);
        }
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (pickerReadyTimerRef.current) clearTimeout(pickerReadyTimerRef.current);
    };
  }, []);

  const haptic = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const pickImage = async (slot: number) => {
    if (hasPermission === false) {
      toast.show("Photo library permission is required", { type: "warning" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets.length > 0) {
      const next = [...productImages];
      next[slot] = result.assets[0].uri;
      setProductImages(next.filter(Boolean));
    }
  };

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  // Sizes
  const addSize = () => {
    const value = currentSize.trim().toUpperCase();
    if (!value) return;
    if (sizes.includes(value)) {
      toast.show("Size already added", { type: "info" });
      return;
    }
    setSizes((prev) => [...prev, value]);
    setCurrentSize("");
  };
  const removeSize = (sizeToRemove: string) => {
    setSizes(sizes.filter((s) => s !== sizeToRemove));
  };

  // Colors
  const onColorChange = (color: { hex: string }) => {
    "worklet";
    runOnJS(setCurrentColor)(color.hex.toUpperCase());
  };
  const openColorPicker = () => {
    setPickerReady(false);
    if (pickerReadyTimerRef.current) clearTimeout(pickerReadyTimerRef.current);
    pickerReadyTimerRef.current = setTimeout(() => setPickerReady(true), 1200);
    setShowColorPicker(true);
  };
  const handlePickerLaidOut = () => {
    if (pickerReadyTimerRef.current) {
      clearTimeout(pickerReadyTimerRef.current);
      pickerReadyTimerRef.current = null;
    }
    requestAnimationFrame(() => setPickerReady(true));
  };
  const confirmColor = () => {
    const hex = currentColor.toUpperCase();
    if (colors.includes(hex)) {
      toast.show("Color already added", { type: "info" });
      setShowColorPicker(false);
      return;
    }
    setColors((prev) => [...prev, hex]);
    setShowColorPicker(false);
  };
  const pickPresetColor = (hex: string) => {
    haptic();
    if (colors.includes(hex.toUpperCase())) return;
    setColors((prev) => [...prev, hex.toUpperCase()]);
  };
  const removeColor = (hexToRemove: string) => {
    setColors(colors.filter((c) => c !== hexToRemove));
  };

  // Features
  const addFeature = () => {
    const value = currentFeature.trim();
    if (!value) return;
    setFeatures((prev) => [...prev, value]);
    setCurrentFeature("");
  };
  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: FormErrors = {
      productName: "",
      price: "",
      stockQuantity: "",
      productDescription: "",
    };
    let isValid = true;

    if (!productName.trim()) {
      newErrors.productName = "Product name is required";
      isValid = false;
    }
    if (!price.trim()) {
      newErrors.price = "Price is required";
      isValid = false;
    } else if (parseFloat(price) <= 0) {
      newErrors.price = "Price must be greater than 0";
      isValid = false;
    }
    if (!stockQuantity.trim()) {
      newErrors.stockQuantity = "Stock quantity is required";
      isValid = false;
    } else if (parseInt(stockQuantity) < 0) {
      newErrors.stockQuantity = "Stock cannot be negative";
      isValid = false;
    }
    if (!productDescription.trim()) {
      newErrors.productDescription = "Product description is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const resetForm = () => {
    setProductImages([]);
    setProductName("");
    setCategory("");
    setPrice("");
    setStockQuantity("");
    setProductDescription("");
    setSizes([]);
    setColors([]);
    setFeatures([]);
    setCurrentSize("");
    setCurrentFeature("");
    setEnableVariants(false);
    setErrors({
      productName: "",
      price: "",
      stockQuantity: "",
      productDescription: "",
    });
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.show("Please fill in the required fields", { type: "danger" });
      return;
    }

    try {
      setLoading(true);
      const basePrice = parseFloat(price);
      const payload: CreateProductPayload = {
        title: productName.trim(),
        category: category.trim() || "Uncategorized",
        description: productDescription.trim(),
        originalPrice: basePrice,
        price: basePrice,
        stock: parseInt(stockQuantity),
        sku:
          mode === "edit" && productData?.sku
            ? productData.sku
            : `SKU-${Date.now()}`,
        badge: "New",
        features: features.length > 0 ? features : undefined,
        colourOptions: colors.length > 0 ? colors : undefined,
        sizeOptions: sizes.length > 0 ? sizes : undefined,
      };

      if (
        productImages[0] &&
        (productImages[0].startsWith("file://") ||
          productImages[0].startsWith("content://"))
      ) {
        payload.imageFile1 = {
          uri: productImages[0],
          name: "image1.jpg",
          type: "image/jpeg",
        };
      }
      if (
        productImages[1] &&
        (productImages[1].startsWith("file://") ||
          productImages[1].startsWith("content://"))
      ) {
        payload.imageFile2 = {
          uri: productImages[1],
          name: "image2.jpg",
          type: "image/jpeg",
        };
      }

      if (mode === "edit" && productData?.id) {
        await updateProduct(productData.id, payload);
        toast.show("Product updated", { type: "success" });
      } else {
        await createProduct(payload);
        toast.show("Product created", { type: "success" });
      }

      if (Platform.OS === "ios") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }
      resetForm();
      onClose();
      onProductAdded?.();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.show(
        error instanceof Error
          ? error.message
          : `Failed to ${mode === "edit" ? "update" : "add"} product`,
        { type: "danger" }
      );
    } finally {
      setLoading(false);
    }
  };

  const charCount = productDescription.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <KeyboardScreen>
          <View className="flex-1">
            {/* Premium header */}
            <View className="bg-white px-5 pt-2 pb-4 border-b border-gray-100">
              <View className="items-center pb-2">
                <View className="w-10 h-[5px] bg-gray-200 rounded-full" />
              </View>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-[18px] font-extrabold text-gray-900 tracking-tight">
                    {mode === "edit" ? "Edit Product" : "Add New Product"}
                  </Text>
                  <Text className="text-[12.5px] text-gray-500 mt-0.5">
                    {mode === "edit"
                      ? "Update your product details"
                      : "Showcase your product to customers"}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                  hitSlop={6}
                >
                  <Ionicons name="close" size={18} color="#374151" />
                </Pressable>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            >
              {/* IMAGES */}
              <Text className={`${SECTION_LABEL} mt-5`}>Photos</Text>
              <View className="flex-row gap-3 mb-1">
                {[0, 1].map((slot) => {
                  const uri = productImages[slot];
                  const isPrimary = slot === 0;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => pickImage(slot)}
                      className="flex-1 aspect-square rounded-2xl overflow-hidden bg-white border border-dashed border-gray-200"
                    >
                      {uri ? (
                        <View className="w-full h-full">
                          <AppImage
                            uri={uri}
                            style={{ width: "100%", height: "100%" }}
                          />
                          <View className="absolute inset-0 bg-black/15" />
                          <View className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded-full">
                            <Text className="text-[9px] font-extrabold text-gray-700 tracking-wide uppercase">
                              {isPrimary ? "Primary" : "Secondary"}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => removeImage(slot)}
                            className="absolute top-2 right-2 bg-white/95 w-7 h-7 rounded-full items-center justify-center"
                            hitSlop={4}
                          >
                            <Ionicons name="trash-outline" size={14} color="#dc2626" />
                          </Pressable>
                        </View>
                      ) : (
                        <View className="flex-1 items-center justify-center px-3">
                          <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mb-2">
                            <Ionicons
                              name="add"
                              size={20}
                              color="#2563eb"
                            />
                          </View>
                          <Text className="text-[12px] font-semibold text-gray-700 text-center">
                            {isPrimary ? "Primary photo" : "Secondary photo"}
                          </Text>
                          <Text className="text-[10.5px] text-gray-400 text-center mt-0.5">
                            Tap to upload
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <Text className="text-[11px] text-gray-400 mb-5 ml-1">
                Square images look best · max 2 photos
              </Text>

              {/* PRODUCT DETAILS */}
              <Text className={SECTION_LABEL}>Product Details</Text>

              <Text className={FIELD_LABEL}>
                Name <Text className="text-rose-500">*</Text>
              </Text>
              <View
                className={`flex-row items-center bg-white rounded-2xl px-4 h-12 mb-1 border ${
                  errors.productName ? "border-rose-300" : "border-gray-200"
                }`}
              >
                <Ionicons name="pricetag-outline" size={16} color="#9ca3af" />
                <TextInput
                  value={productName}
                  onChangeText={(text) => {
                    setProductName(text);
                    clearError("productName");
                  }}
                  className="flex-1 ml-3 text-[15px] text-gray-900 h-full"
                  placeholder="e.g. Premium Hair Bonnet"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.productName ? (
                <View className="flex-row items-center gap-1.5 mb-3 ml-1">
                  <Ionicons name="alert-circle" size={12} color="#dc2626" />
                  <Text className="text-[11px] text-rose-600 font-semibold">
                    {errors.productName}
                  </Text>
                </View>
              ) : (
                <View className="mb-3" />
              )}

              <Text className={FIELD_LABEL}>Category</Text>
              <View className="flex-row items-center bg-white rounded-2xl px-4 h-12 mb-5 border border-gray-200">
                <Ionicons name="folder-open-outline" size={16} color="#9ca3af" />
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  className="flex-1 ml-3 text-[15px] text-gray-900 h-full"
                  placeholder="Electronics, Clothing, Food..."
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* PRICING */}
              <Text className={SECTION_LABEL}>Pricing & Stock</Text>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className={FIELD_LABEL}>
                    Price <Text className="text-rose-500">*</Text>
                  </Text>
                  <View
                    className={`flex-row items-center bg-white rounded-2xl px-4 h-12 border ${
                      errors.price ? "border-rose-300" : "border-gray-200"
                    }`}
                  >
                    <Text className="text-[15px] font-bold text-gray-500 mr-2">
                      ₦
                    </Text>
                    <TextInput
                      value={price}
                      onChangeText={(text) => {
                        setPrice(text.replace(/[^0-9.]/g, ""));
                        clearError("price");
                      }}
                      className="flex-1 text-[15px] text-gray-900 h-full"
                      placeholder="0.00"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {errors.price ? (
                    <Text className="text-[11px] text-rose-600 font-semibold mt-1 ml-1">
                      {errors.price}
                    </Text>
                  ) : null}
                </View>

                <View className="flex-1">
                  <Text className={FIELD_LABEL}>
                    Stock <Text className="text-rose-500">*</Text>
                  </Text>
                  <View
                    className={`flex-row items-center bg-white rounded-2xl px-4 h-12 border ${
                      errors.stockQuantity
                        ? "border-rose-300"
                        : "border-gray-200"
                    }`}
                  >
                    <Ionicons name="cube-outline" size={16} color="#9ca3af" />
                    <TextInput
                      value={stockQuantity}
                      onChangeText={(text) => {
                        setStockQuantity(text.replace(/[^0-9]/g, ""));
                        clearError("stockQuantity");
                      }}
                      className="flex-1 ml-2 text-[15px] text-gray-900 h-full"
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                    />
                  </View>
                  {errors.stockQuantity ? (
                    <Text className="text-[11px] text-rose-600 font-semibold mt-1 ml-1">
                      {errors.stockQuantity}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="h-5" />

              {/* VARIANTS */}
              <Pressable
                onPress={() => {
                  haptic();
                  setEnableVariants((prev) => !prev);
                }}
                className="flex-row items-center bg-white border border-gray-100 rounded-2xl px-4 py-3.5"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="w-11 h-11 rounded-xl bg-violet-50 items-center justify-center mr-3">
                  <Ionicons name="layers-outline" size={20} color="#7c3aed" />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-gray-900">
                    Product variants
                  </Text>
                  <Text className="text-[12px] text-gray-500 leading-[16px]">
                    Add sizes and colors customers can pick
                  </Text>
                </View>
                <View
                  className={`w-12 h-7 rounded-full px-1 justify-center ${
                    enableVariants ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full bg-white ${
                      enableVariants ? "self-end" : "self-start"
                    }`}
                  />
                </View>
              </Pressable>

              {enableVariants && (
                <View className="bg-white border border-gray-100 rounded-2xl mt-3 px-4 py-4">
                  {/* Sizes */}
                  <Text className={FIELD_LABEL}>Sizes</Text>
                  <View className="flex-row items-center mb-3">
                    <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 h-11 mr-2">
                      <TextInput
                        value={currentSize}
                        onChangeText={setCurrentSize}
                        className="flex-1 text-[14px] text-gray-900 h-full"
                        placeholder="S, M, L, XL..."
                        placeholderTextColor="#9ca3af"
                        onSubmitEditing={addSize}
                        autoCapitalize="characters"
                      />
                    </View>
                    <Pressable
                      onPress={addSize}
                      className="bg-gray-900 px-4 h-11 rounded-2xl items-center justify-center"
                    >
                      <Text className="text-white font-bold text-[13px]">
                        Add
                      </Text>
                    </Pressable>
                  </View>
                  {sizes.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mb-2">
                      {sizes.map((size) => (
                        <Pressable
                          key={size}
                          onPress={() => removeSize(size)}
                          className="flex-row items-center gap-1.5 bg-violet-50 border border-violet-100 px-3 h-8 rounded-full"
                        >
                          <Text className="text-[12px] font-bold text-violet-700">
                            {size}
                          </Text>
                          <Ionicons
                            name="close-circle"
                            size={14}
                            color="#7c3aed"
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  <View className="h-px bg-gray-100 my-4" />

                  {/* Colors */}
                  <Text className={FIELD_LABEL}>Colors</Text>

                  {colors.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      {colors.map((hex) => {
                        const light = isLightColor(hex);
                        return (
                          <Pressable
                            key={hex}
                            onPress={() => removeColor(hex)}
                            className="relative"
                          >
                            <View
                              className="w-10 h-10 rounded-full"
                              style={{
                                backgroundColor: hex,
                                borderWidth: light ? 1 : 0,
                                borderColor: "#e5e7eb",
                              }}
                            />
                            <View className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 rounded-full items-center justify-center">
                              <Ionicons
                                name="close"
                                size={12}
                                color="white"
                              />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1px] mb-2">
                    Curated palette
                  </Text>
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {PRESET_COLORS.map((c) => {
                      const light = isLightColor(c);
                      const selected = colors.includes(c.toUpperCase());
                      return (
                        <Pressable
                          key={c}
                          onPress={() => pickPresetColor(c)}
                          disabled={selected}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: c,
                            borderWidth: light ? 1 : 0,
                            borderColor: "#e5e7eb",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: selected ? 0.4 : 1,
                          }}
                        >
                          {selected && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={light ? "#0f172a" : "white"}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={openColorPicker}
                    className="flex-row items-center gap-2 self-start px-3 h-9 rounded-full border-2 border-dashed border-gray-300 active:bg-gray-50"
                  >
                    <Ionicons
                      name="color-palette-outline"
                      size={14}
                      color="#374151"
                    />
                    <Text className="text-[12.5px] font-bold text-gray-700">
                      Custom color
                    </Text>
                  </Pressable>
                </View>
              )}

              <View className="h-5" />

              {/* DESCRIPTION */}
              <Text className={SECTION_LABEL}>Description</Text>
              <View
                className={`bg-white rounded-2xl px-4 py-3 border ${
                  errors.productDescription
                    ? "border-rose-300"
                    : "border-gray-200"
                }`}
              >
                <TextInput
                  value={productDescription}
                  onChangeText={(text) => {
                    setProductDescription(text);
                    clearError("productDescription");
                  }}
                  className="text-[15px] text-gray-900"
                  style={{ minHeight: 100, textAlignVertical: "top" }}
                  placeholder="Describe what makes this product great…"
                  placeholderTextColor="#9ca3af"
                  multiline
                />
                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <Text className="text-[10.5px] text-gray-400">
                    A clear description helps customers decide
                  </Text>
                  <Text className="text-[10.5px] font-semibold text-gray-400">
                    {charCount}
                  </Text>
                </View>
              </View>
              {errors.productDescription ? (
                <View className="flex-row items-center gap-1.5 mt-1 ml-1">
                  <Ionicons name="alert-circle" size={12} color="#dc2626" />
                  <Text className="text-[11px] text-rose-600 font-semibold">
                    {errors.productDescription}
                  </Text>
                </View>
              ) : null}

              <View className="h-5" />

              {/* FEATURES */}
              <Text className={SECTION_LABEL}>Key Features</Text>
              <View className="flex-row items-center mb-3">
                <View className="flex-1 flex-row items-center bg-white rounded-2xl px-4 h-12 mr-2 border border-gray-200">
                  <Ionicons name="sparkles-outline" size={16} color="#9ca3af" />
                  <TextInput
                    value={currentFeature}
                    onChangeText={setCurrentFeature}
                    className="flex-1 ml-3 text-[14px] text-gray-900 h-full"
                    placeholder="e.g. 100% organic cotton"
                    placeholderTextColor="#9ca3af"
                    onSubmitEditing={addFeature}
                  />
                </View>
                <Pressable
                  onPress={addFeature}
                  className="bg-gray-900 w-12 h-12 rounded-2xl items-center justify-center"
                  hitSlop={4}
                >
                  <Ionicons name="add" size={20} color="white" />
                </Pressable>
              </View>

              {features.length === 0 ? (
                <View className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-4 py-3 flex-row items-start gap-2">
                  <Ionicons name="bulb-outline" size={14} color="#94a3b8" />
                  <Text className="text-[12px] text-gray-500 italic flex-1 leading-[18px]">
                    Highlight what makes this product stand out — materials,
                    benefits, certifications.
                  </Text>
                </View>
              ) : (
                <View>
                  {features.map((feature, index) => (
                    <View
                      key={`${feature}-${index}`}
                      className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-2 border border-gray-100"
                    >
                      <View className="w-6 h-6 rounded-full bg-emerald-50 items-center justify-center mr-3">
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color="#059669"
                        />
                      </View>
                      <Text className="flex-1 text-[14px] text-gray-900">
                        {feature}
                      </Text>
                      <Pressable
                        onPress={() => removeFeature(index)}
                        className="w-7 h-7 rounded-full items-center justify-center active:bg-gray-100"
                        hitSlop={4}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color="#9ca3af"
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Sticky footer */}
            <View
              className="flex-row items-center px-5 pt-3 pb-7 border-t border-gray-100 bg-white gap-3"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Pressable
                onPress={onClose}
                disabled={loading}
                className="flex-1 h-12 rounded-2xl border border-gray-200 items-center justify-center bg-white active:bg-gray-50"
              >
                <Text className="text-gray-900 font-semibold text-[15px]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={loading}
                className={`flex-1 h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
                  loading ? "bg-blue-300" : "bg-blue-600"
                }`}
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: loading ? 0 : 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text className="text-white font-bold text-[15px]">
                      {mode === "edit" ? "Updating…" : "Creating…"}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name={mode === "edit" ? "save-outline" : "sparkles"}
                      size={16}
                      color="white"
                    />
                    <Text className="text-white font-bold text-[15px]">
                      {mode === "edit" ? "Save changes" : "Create product"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardScreen>

        {/* Custom color picker overlay (in-place — same fix as BrandAssetsModal) */}
        {showColorPicker && (
          <View
            className="absolute inset-0"
            style={{ zIndex: 100, elevation: 100 }}
          >
            <Pressable
              className="absolute inset-0 bg-black/60"
              onPress={() => setShowColorPicker(false)}
            />
            <View className="flex-1 justify-center px-6">
              <View
                className="bg-white rounded-3xl overflow-hidden"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.25,
                  shadowRadius: 24,
                  elevation: 12,
                }}
              >
                <View className="px-5 pt-5 pb-3 flex-row items-center justify-between">
                  <Text className="text-[16px] font-extrabold text-gray-900">
                    Pick a color
                  </Text>
                  <Pressable
                    onPress={() => setShowColorPicker(false)}
                    className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={18} color="#374151" />
                  </Pressable>
                </View>

                <View className="px-5 pb-4">
                  <View
                    onLayout={handlePickerLaidOut}
                    style={{ minHeight: 280, opacity: pickerReady ? 1 : 0 }}
                  >
                    <ColorPicker
                      value={currentColor}
                      onChange={onColorChange}
                      onComplete={onColorChange}
                      style={{ gap: 16 }}
                    >
                      <Preview
                        hideInitialColor
                        hideText
                        style={{ height: 44, borderRadius: 12 }}
                      />
                      <Panel1 style={{ borderRadius: 16 }} />
                      <HueSlider style={{ borderRadius: 999 }} />
                    </ColorPicker>
                  </View>

                  {!pickerReady && (
                    <View
                      className="absolute inset-0 items-center justify-center"
                      pointerEvents="none"
                    >
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text className="text-[12px] text-gray-500 mt-2">
                        Preparing color picker…
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center justify-between mt-5 mb-2">
                    <Text className="text-[12px] text-gray-500">Selected</Text>
                    <View className="flex-row items-center gap-2">
                      <View
                        className="w-7 h-7 rounded-full border border-gray-200"
                        style={{ backgroundColor: currentColor }}
                      />
                      <Text className="text-[13px] font-mono font-semibold text-gray-900">
                        {currentColor.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center px-5 pb-5 pt-2 gap-3">
                  <Pressable
                    onPress={() => setShowColorPicker(false)}
                    className="flex-1 h-12 rounded-2xl border border-gray-200 items-center justify-center"
                  >
                    <Text className="text-gray-900 font-semibold text-[15px]">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmColor}
                    className="flex-1 h-12 rounded-2xl bg-blue-600 items-center justify-center"
                  >
                    <Text className="text-white font-bold text-[15px]">
                      Add color
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
