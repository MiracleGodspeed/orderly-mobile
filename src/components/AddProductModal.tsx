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
  getCatalogCategories,
  generateProductDescription,
  getAiDescriptionCredits,
  AiDescriptionLimitError,
} from "../../src/api/vendor/vendor.api";
import {
  CreateProductPayload,
  Product,
  CatalogCategory,
} from "../../src/api/vendor/vendor.types";
import { AppImage } from "./AppImage";
import KeyboardScreen from "./KeyboardScreen";
import { useVendor } from "../../context/VendorContext";
import { resolveVariantAxis } from "../utils/variantAxis";
import { DraftsSheet } from "./DraftsSheet";
import {
  appendDraft,
  ProductDraft,
  loadDrafts,
  MAX_DRAFTS,
} from "../lib/productDrafts";
import { useFeatures } from "../hooks/useFeatures";
import { FEATURES, FeatureKey } from "../lib/features";
import { suggestDescription } from "../lib/descriptionSuggest";
import { FeaturePaywallSheet } from "./FeaturePaywallSheet";
import { SelectionDrawer } from "./SelectionDrawer";
import { AlertDialog } from "./AlertDialog";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  productData?: Product | null;
  onProductAdded?: () => void;
  /** Optional draft to hydrate the form from when opened in "add" mode —
   *  lets ProductsList deep-link straight into editing a saved draft. */
  initialDraft?: ProductDraft | null;
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

/**
 * Live margin under the cost field. Money first ("You make ₦8,000 on
 * each one"), percentage second — vendors quote each other margins in
 * naira, not points. Selling below cost is called out in words rather
 * than as a negative number, which is easy to skim past on a phone.
 */
function MarginReadout({ price, cost }: { price: string; cost: string }) {
  const p = Number((price ?? "").trim());
  const c = Number((cost ?? "").trim());
  if (!Number.isFinite(p) || p <= 0 || !(cost ?? "").trim() || !Number.isFinite(c)) {
    return null;
  }
  const profit = p - c;
  const pct = p > 0 ? Math.round((profit / p) * 100) : 0;
  const money = (n: number) => `₦${Math.abs(n).toLocaleString()}`;

  if (profit < 0) {
    return (
      <View className="mt-2 rounded-xl bg-rose-50 px-3 py-2.5">
        <Text className="text-[12.5px] font-semibold text-rose-800 leading-[18px]">
          You'd lose {money(profit)} on every sale. Your price is below what it
          cost you.
        </Text>
      </View>
    );
  }
  if (profit === 0) {
    return (
      <View className="mt-2 rounded-xl bg-amber-50 px-3 py-2.5">
        <Text className="text-[12.5px] font-semibold text-amber-800 leading-[18px]">
          You'd break even on this one. No profit, no loss.
        </Text>
      </View>
    );
  }
  return (
    <View className="mt-2 rounded-xl bg-emerald-50 px-3 py-2.5">
      <Text className="text-[12.5px] text-emerald-900 leading-[18px]">
        You make <Text className="font-bold">{money(profit)}</Text> on each one,
        a <Text className="font-bold">{pct}%</Text> margin.
      </Text>
    </View>
  );
}

/** Numbered step heading inside the variant rule form — the shape of
 *  a rule (size, then color, then price) should never be something a
 *  vendor has to infer. */
function VariantStep({ n, text }: { n: number; text: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-2">
      <View className="w-5 h-5 rounded-full bg-gray-900 items-center justify-center">
        <Text className="text-[10px] font-extrabold text-white">{n}</Text>
      </View>
      <Text className="flex-1 text-[12.5px] font-bold text-gray-800">
        {text}
      </Text>
    </View>
  );
}

/** Pill choice used for the "Any ..." option and each existing value
 *  on the variant axis (size, format, bottle size, ...). */
function VariantChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-9 px-3.5 rounded-full border items-center justify-center ${
        selected
          ? "bg-violet-600 border-violet-600"
          : "bg-white border-gray-200"
      }`}
    >
      <Text
        className={`text-[13px] font-extrabold ${
          selected ? "text-white" : "text-gray-700"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

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
  initialDraft,
}: Props) {
  const toast = useToast();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Server / save errors live INSIDE the modal — RN's Modal is a separate
  // native window, so the global toast at app root gets covered by the
  // page-sheet. The inline alert keeps the message visible right where the
  // vendor needs to see it.
  const [saveError, setSaveError] = useState<{
    title: string;
    message: string;
    isPlanLimit: boolean;
  } | null>(null);
  const { fetchVendorData, storeData } = useVendor();
  // What this vendor's trade calls the non-colour variant axis: a
  // clothing seller sizes things, a bookshop picks a format, a perfume
  // seller a bottle size. Falls back to "Size" when the store's
  // categories are unknown.
  const axis = resolveVariantAxis({
    categoryIds: storeData?.businessCategoryIds,
    categoryNames: storeData?.businessCategoryNames,
    isServiceBased: storeData?.isServiceBased,
  });

  const [productImages, setProductImages] = useState<string[]>([]);
  const [productName, setProductName] = useState("");
  // Category is now an ID (linked to a CatalogCategory row), not a free
  // string. Null = uncategorised. Hydrated from productData.catalogCategoryId
  // on edit, or the saved draft's catalogCategoryId field.
  const [catalogCategoryId, setCatalogCategoryId] = useState<number | null>(
    null
  );
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [vendorCategories, setVendorCategories] = useState<CatalogCategory[]>(
    []
  );
  const [price, setPrice] = useState("");
  // Digits as typed. Empty means this product isn't tracking a cost,
  // which is different from a cost of zero. Only rendered when the
  // store turned cost tracking on in the Products settings sheet.
  const [costPrice, setCostPrice] = useState("");
  const costPriceEnabled = !!storeData?.costPriceEnabled;
  const [stockQuantity, setStockQuantity] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [sizes, setSizes] = useState<string[]>([]);
  const [currentSize, setCurrentSize] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [currentColor, setCurrentColor] = useState("#2563EB");
  const [features, setFeatures] = useState<string[]>([]);
  const [currentFeature, setCurrentFeature] = useState("");
  const [enableVariants, setEnableVariants] = useState(false);
  // Explicit list of vendor-defined variant overrides. Each entry pins
  // ONE specific (size, color) combo (or just one of them) to a custom
  // price. The list is what the vendor sees and edits; nothing is
  // auto-generated from sizes/colors.
  type VariantEntry = {
    size: string | null;
    color: string | null;
    price: string;
    /** Units left of this exact combination. Empty means the vendor
     *  doesn't count stock at this level and the product's overall
     *  stock applies instead. "0" means this one is sold out. */
    stock?: string;
  };
  const [variantEntries, setVariantEntries] = useState<VariantEntry[]>([]);
  // The form for adding/editing a single entry. `index` === -1 means
  // "creating new"; >= 0 means "editing existing entry at that index".
  // Scratch state for the rule form: a size the vendor is typing and
  // whether the extra color palette is showing. Both live here rather
  // than inside the form object so they survive a re-render of it.
  const [variantSizeDraft, setVariantSizeDraft] = useState("");
  const [variantPaletteOpen, setVariantPaletteOpen] = useState(false);
  const [variantForm, setVariantForm] = useState<
    | (VariantEntry & { index: number })
    | null
  >(null);

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
  const [aiGenerating, setAiGenerating] = useState(false);

  // Feature gating — secondary photo slot is paywalled. Tapping it when
  // locked opens the upgrade sheet instead of the image picker.
  const { has: hasFeature, aiDescriptionCreditsPerDay: aiDailyLimit } =
    useFeatures();
  const canUseSecondaryImage = hasFeature(FEATURES.PRODUCTS_SECONDARY_IMAGE);
  const canUseVariants = hasFeature(FEATURES.PRODUCTS_VARIANTS);
  const canUseCategories = hasFeature(FEATURES.PRODUCTS_CATEGORIES);
  // Orderly AI is gated by both the boolean feature key AND the
  // per-day quota — a plan can technically have the key but a 0/null
  // quota would still mean "no access" (defensive belt-and-braces;
  // shouldn't happen in practice).
  const canUseAi =
    hasFeature(FEATURES.AI_DESCRIPTIONS) && (aiDailyLimit ?? 0) > 0;
  // Remaining-today counter. Pre-fetched from the read-only
  // `/catalog/ai/credits` endpoint when the modal opens (so the
  // "X left today" chip surfaces BEFORE the vendor taps Generate),
  // then refreshed from the X-RateLimit-Remaining header after each
  // generation. The pre-fetch is gated on `canUseAi` so plans
  // without the feature don't incur the round-trip.
  const [aiRemainingToday, setAiRemainingToday] = useState<number | null>(null);
  // Trial sentinel: backend sends int.MaxValue for trial vendors so
  // every gate passes regardless of quota. The actual int value the
  // mobile sees is implementation-defined-large; the safe heuristic
  // is "treat anything bigger than a daily cap a human plan would
  // ever set as unlimited" — pick a number that's clearly out of
  // band for any real plan (1000+/day).
  const aiIsUnlimited = (aiDailyLimit ?? 0) >= 1000;
  const [paywallFeature, setPaywallFeature] = useState<FeatureKey | null>(
    null
  );

  // Drafts — local-only (AsyncStorage), capped at MAX_DRAFTS like web.
  const [draftsSheetOpen, setDraftsSheetOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  // Pre-fetch the daily AI credits when the modal opens so the chip
  // ("X left today") is visible BEFORE the vendor taps Generate.
  // Skipped when the plan doesn't grant AI (no point asking for
  // credits we can't use) and on unlimited plans where the chip is
  // hidden anyway. Reset on close so a stale count from another
  // session can't bleed in.
  useEffect(() => {
    if (!visible) {
      setAiRemainingToday(null);
      return;
    }
    if (!canUseAi || aiIsUnlimited) return;
    let cancelled = false;
    (async () => {
      const snapshot = await getAiDescriptionCredits();
      if (cancelled || !snapshot) return;
      setAiRemainingToday(snapshot.remainingToday);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, canUseAi, aiIsUnlimited]);

  // Refresh the draft count + vendor categories whenever the modal opens.
  // Categories are needed for the dropdown options; we load them every open
  // so a freshly-added category in the manager sheet shows up immediately.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const [drafts, categories] = await Promise.all([
        loadDrafts(),
        getCatalogCategories().catch(() => [] as CatalogCategory[]),
      ]);
      if (!cancelled) {
        setDraftCount(drafts.length);
        setVendorCategories(categories);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Single source of truth for form hydration. We deliberately collapsed
  // what used to be two effects (one for edit-hydrate, one for visibility
  // reset) — they raced when the parent set `selectedProduct` BEFORE
  // flipping `visible` to true: the edit-hydrate ran while still hidden,
  // then the visibility effect immediately reset, and the modal opened
  // empty because `productData` never changed reference again.
  //
  // Now the rule is simple: nothing happens until the modal becomes
  // visible. When it opens, we hydrate based on intent (productData for
  // edit, initialDraft for resumed-draft Add, blank for fresh Add). When
  // it closes, we reset.
  useEffect(() => {
    if (!visible) {
      resetForm();
      return;
    }
    if (mode === "edit" && productData) {
      // Coerce every text field to a string — the server occasionally
      // returns null for description/category and `.trim()` would blow up.
      setProductName(productData.title ?? "");
      setCatalogCategoryId(productData.catalogCategoryId ?? null);
      setPrice(productData.price != null ? String(productData.price) : "");
      setCostPrice(
        productData.costPrice != null ? String(productData.costPrice) : ""
      );
      setStockQuantity(
        productData.stock != null ? String(productData.stock) : ""
      );
      setProductDescription(productData.description ?? "");

      const existingImages: string[] = [];
      if (productData.image) existingImages.push(productData.image);
      if (productData.image2) existingImages.push(productData.image2);
      setProductImages(existingImages);

      setSizes(productData.sizeOptions ?? []);
      setColors(productData.colourOptions ?? []);
      setFeatures(productData.features ?? []);
      setEnableVariants(
        !!(
          (productData.sizeOptions && productData.sizeOptions.length) ||
          (productData.colourOptions && productData.colourOptions.length)
        )
      );
      // Pre-fill explicit variant entries from the API. Each row keeps
      // its own (size, color) — either may be null when the vendor only
      // wants to constrain one axis.
      const incoming = productData.variantPrices ?? [];
      setVariantEntries(
        incoming.map((v) => ({
          size: v.size ?? null,
          color: v.color ?? null,
          price: String(v.price ?? ""),
          stock: v.stock == null ? "" : String(v.stock),
        }))
      );
      setVariantForm(null);
      return;
    }
    if (mode === "add" && initialDraft) {
      setProductName(initialDraft.productName ?? "");
      setCatalogCategoryId(initialDraft.catalogCategoryId ?? null);
      setPrice(initialDraft.price ?? "");
      setCostPrice(initialDraft.costPrice ?? "");
      setStockQuantity(initialDraft.stockQuantity ?? "");
      setProductDescription(initialDraft.productDescription ?? "");
      setProductImages(initialDraft.productImages ?? []);
      setSizes(initialDraft.sizes ?? []);
      setColors(initialDraft.colors ?? []);
      setFeatures(initialDraft.features ?? []);
      setEnableVariants(!!initialDraft.enableVariants);
      // Drafts persist variant prices as a Record keyed by `${size}||${color}`.
      // Reconstitute as explicit entries so the editor list looks the same
      // as it did before the draft was saved.
      const draftEntries: VariantEntry[] = [];
      Object.entries(initialDraft.variantPrices ?? {}).forEach(([k, v]) => {
        if (!v?.price) return;
        const [sz, cl] = k.includes("||") ? k.split("||") : [k, ""];
        draftEntries.push({
          size: sz || null,
          color: cl || null,
          price: String(v.price),
          stock: v.stock == null ? "" : String(v.stock),
        });
      });
      setVariantEntries(draftEntries);
      setVariantForm(null);
      return;
    }
    // Fresh Add — clean slate.
    resetForm();
  }, [visible, mode, productData, initialDraft]);

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

    // Defensive `?? ""` on every field — state can land on null briefly if
    // the server returns null for a hydrated-then-cleared field.
    if (!(productName ?? "").trim()) {
      newErrors.productName = "Product name is required";
      isValid = false;
    }
    if (!(price ?? "").trim()) {
      newErrors.price = "Price is required";
      isValid = false;
    } else if (parseFloat(price) <= 0) {
      newErrors.price = "Price must be greater than 0";
      isValid = false;
    }
    if (!(stockQuantity ?? "").trim()) {
      newErrors.stockQuantity = "Stock quantity is required";
      isValid = false;
    } else if (parseInt(stockQuantity) < 0) {
      newErrors.stockQuantity = "Stock cannot be negative";
      isValid = false;
    }
    if (!(productDescription ?? "").trim()) {
      newErrors.productDescription = "Product description is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  // Saving the in-progress form to local storage. Validation is intentionally
  // permissive — drafts represent half-finished work, so we allow saving with
  // missing fields. The only hard rule is "have at least *something* worth
  // saving" so we don't litter the drawer with empty entries.
  const handleSaveDraft = async () => {
    if (savingDraft) return;
    const hasAnything =
      (productName ?? "").trim() ||
      (productDescription ?? "").trim() ||
      (price ?? "").trim() ||
      productImages.length > 0;
    if (!hasAnything) {
      toast.show("Add a name, photo, or description before saving a draft", {
        type: "info",
      });
      return;
    }
    try {
      setSavingDraft(true);
      // Persist each explicit entry under a `${size}||${color}` key so the
      // legacy draft shape stays compatible.
      const draftVariantPrices: Record<
        string,
        { price: string; stock?: string }
      > = {};
      variantEntries.forEach((entry) => {
        if (!entry.price || !entry.price.trim()) return;
        const key = `${entry.size ?? ""}||${entry.color ?? ""}`;
        draftVariantPrices[key] = {
          price: entry.price,
          ...(entry.stock ? { stock: entry.stock } : {}),
        };
      });
      const updated = await appendDraft({
        productName,
        catalogCategoryId,
        price,
        costPrice,
        stockQuantity,
        productDescription,
        productImages,
        sizes,
        colors,
        features,
        enableVariants,
        variantPrices: draftVariantPrices,
      });
      setDraftCount(updated.length);
      toast.show("Draft saved", { type: "success" });
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }
      resetForm();
      onClose();
    } catch (err: any) {
      toast.show(err?.message || "Couldn't save draft", { type: "danger" });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleLoadDraft = (draft: ProductDraft) => {
    setProductName(draft.productName ?? "");
    setCatalogCategoryId(draft.catalogCategoryId ?? null);
    setPrice(draft.price ?? "");
    setStockQuantity(draft.stockQuantity ?? "");
    setProductDescription(draft.productDescription ?? "");
    setProductImages(draft.productImages ?? []);
    setSizes(draft.sizes ?? []);
    setColors(draft.colors ?? []);
    setFeatures(draft.features ?? []);
    setEnableVariants(!!draft.enableVariants);
    const restored: VariantEntry[] = [];
    Object.entries(draft.variantPrices ?? {}).forEach(([k, v]) => {
      if (!v?.price) return;
      const [sz, cl] = k.includes("||") ? k.split("||") : [k, ""];
      restored.push({
        size: sz || null,
        color: cl || null,
        price: String(v.price),
        stock: v.stock == null ? "" : String(v.stock),
      });
    });
    setVariantEntries(restored);
    setVariantForm(null);
    setDraftsSheetOpen(false);
    toast.show("Draft loaded", { type: "success" });
  };

  const resetForm = () => {
    setProductImages([]);
    setProductName("");
    setCatalogCategoryId(null);
    setPrice("");
    setCostPrice("");
    setStockQuantity("");
    setProductDescription("");
    setSizes([]);
    setColors([]);
    setFeatures([]);
    setCurrentSize("");
    setCurrentFeature("");
    setEnableVariants(false);
    setVariantEntries([]);
    setVariantForm(null);
    setSaveError(null);
    setErrors({
      productName: "",
      price: "",
      stockQuantity: "",
      productDescription: "",
    });
  };

  // === Variant entry editor helpers ===

  // True when an existing entry in the list matches the form's
  // (size, color) — used to block duplicate combos.
  const entryConflicts = (
    list: VariantEntry[],
    candidate: { size: string | null; color: string | null },
    skipIndex: number
  ) => {
    const norm = (v: string | null | undefined) =>
      (v ?? "").trim().toLowerCase();
    return list.some(
      (e, i) =>
        i !== skipIndex &&
        norm(e.size) === norm(candidate.size) &&
        norm(e.color) === norm(candidate.color)
    );
  };

  const openVariantForm = (index: number) => {
    haptic();
    setVariantSizeDraft("");
    setVariantPaletteOpen(false);
    if (index === -1) {
      setVariantForm({
        index: -1,
        size: null,
        color: null,
        price: "",
        stock: "",
      });
    } else {
      const existing = variantEntries[index];
      setVariantForm({ index, ...existing });
    }
  };

  const closeVariantForm = () => {
    setVariantForm(null);
    setVariantSizeDraft("");
    setVariantPaletteOpen(false);
  };

  // A size typed inside the rule form has to land on the product too,
  // or the rule would price something no customer can select.
  const commitVariantSizeDraft = () => {
    const next = variantSizeDraft.trim().toUpperCase();
    if (!next) return;
    if (!sizes.includes(next)) setSizes((prev) => [...prev, next]);
    setVariantForm((prev) => (prev ? { ...prev, size: next } : prev));
    setVariantSizeDraft("");
  };

  // Same for a color picked from the palette inside the rule form.
  const pickVariantColor = (hex: string) => {
    haptic();
    const H = hex.toUpperCase();
    if (!colors.some((c) => c.toUpperCase() === H)) {
      setColors((prev) => [...prev, H]);
    }
    setVariantForm((prev) => (prev ? { ...prev, color: H } : prev));
    setVariantPaletteOpen(false);
  };

  const saveVariantForm = () => {
    if (!variantForm) return;
    if (!variantForm.size && !variantForm.color) {
      toast.show(`Choose a ${axis.lower}, a color, or both for this rule`, {
        type: "danger",
      });
      return;
    }
    const priceNum = Number((variantForm.price ?? "").trim());
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.show("Enter the price for this combination", { type: "danger" });
      return;
    }
    if (
      entryConflicts(
        variantEntries,
        { size: variantForm.size, color: variantForm.color },
        variantForm.index
      )
    ) {
      toast.show("You already have a rule for that combination", {
        type: "danger",
      });
      return;
    }
    const rawStock = (variantForm.stock ?? "").trim();
    const next: VariantEntry = {
      size: variantForm.size,
      color: variantForm.color,
      price: String(priceNum),
      // Empty means "not tracked here". Zero is meaningful and must
      // survive: it's how a vendor marks one combination sold out.
      stock:
        rawStock === ""
          ? ""
          : String(Math.max(0, parseInt(rawStock, 10) || 0)),
    };
    setVariantEntries((prev) => {
      if (variantForm.index === -1) return [...prev, next];
      const copy = [...prev];
      copy[variantForm.index] = next;
      return copy;
    });
    closeVariantForm();
  };

  const deleteVariantEntry = (index: number) => {
    haptic();
    setVariantEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!validateForm()) {
      toast.show("Please fill in the required fields", { type: "danger" });
      return;
    }

    try {
      setLoading(true);
      const basePrice = parseFloat(price);

      // Send each explicit entry verbatim. The backend resolves matching
      // priority (exact > size-only > color-only > base) at purchase time.
      // Rows naming a size/color the vendor has since removed are
      // pruned — same rule the web drawer applies — so we never ship an
      // override no customer can ever match.
      const sizeSet = new Set(sizes);
      const colorSet = new Set(colors.map((c) => c.toLowerCase()));
      const variantPricesPayload = enableVariants
        ? variantEntries
            .map((e) => {
              const parsed = Number((e.price ?? "").trim());
              if (!Number.isFinite(parsed) || parsed <= 0) return null;
              if (!e.size && !e.color) return null;
              if (e.size && !sizeSet.has(e.size)) return null;
              if (e.color && !colorSet.has(e.color.toLowerCase())) return null;
              const stockRaw = (e.stock ?? "").trim();
              const stock = stockRaw === "" ? null : Number(stockRaw);
              return {
                size: e.size && e.size.trim() ? e.size : null,
                color: e.color && e.color.trim() ? e.color : null,
                price: parsed,
                // null tells the server this variant keeps no count of
                // its own; a number (including 0) is authoritative.
                stock: stock != null && Number.isFinite(stock) ? stock : null,
              };
            })
            .filter(
              (
                v,
              ): v is {
                size: string | null;
                color: string | null;
                price: number;
                stock: number | null;
              } => v !== null
            )
        : [];

      const trimmedCost = (costPrice ?? "").trim();
      const payload: CreateProductPayload = {
        title: (productName ?? "").trim(),
        // Only sent while the store tracks cost, so switching the
        // feature off never wipes costs recorded earlier. Empty clears.
        ...(costPriceEnabled
          ? { costPrice: trimmedCost === "" ? null : Number(trimmedCost) }
          : {}),
        catalogCategoryId,
        description: (productDescription ?? "").trim(),
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
        variantPrices: variantPricesPayload,
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
        // Creating the first product flips vendorOnboardProgressResponse on
        // the server. Refetch so checklistItems (and the onboarding progress
        // bar that reads from it) reflect the new state.
        fetchVendorData().catch(() => {});
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
      const rawMessage =
        error instanceof Error
          ? error.message
          : `Failed to ${mode === "edit" ? "update" : "add"} product`;
      // Detect plan-limit / paywall errors so we can surface an upgrade
      // CTA on the alert instead of a generic dismiss. The backend's
      // strings vary ("limit", "upgrade", "plan", "professional"), so we
      // match liberally — false positives here only over-offer upgrade,
      // which is harmless.
      const isPlanLimit =
        /\b(limit|upgrade|plan|professional|reached the)\b/i.test(rawMessage);
      setSaveError({
        title: isPlanLimit
          ? "Plan limit reached"
          : `Couldn't ${mode === "edit" ? "update" : "save"} product`,
        message: rawMessage,
        isPlanLimit,
      });
    } finally {
      setLoading(false);
    }
  };

  const charCount = productDescription.length;

  const handleGenerateDescription = async () => {
    const name = productName.trim();
    if (!name || aiGenerating) return;
    haptic();

    // Plan-level gate. Vendors without the AI feature on their plan
    // see the upgrade paywall instead of making a doomed API call.
    // Trial vendors bypass this gate via the int.MaxValue sentinel,
    // which makes `canUseAi` resolve true.
    if (!canUseAi) {
      setPaywallFeature(FEATURES.AI_DESCRIPTIONS);
      return;
    }

    setAiGenerating(true);
    try {
      const categoryName =
        vendorCategories.find((c) => c.id === catalogCategoryId)?.name ?? undefined;
      const result = await generateProductDescription(name, categoryName);
      setProductDescription(result.description);
      if (result.remainingToday != null) {
        setAiRemainingToday(result.remainingToday);
      }
      clearError("productDescription");
    } catch (err: unknown) {
      if (err instanceof AiDescriptionLimitError) {
        if (err.kind === "feature_locked") {
          // Race condition fallback — the local features cache thought
          // we had access but the server disagreed (e.g. a downgrade
          // that hasn't propagated yet). Show the paywall rather than
          // a confusing toast.
          setPaywallFeature(FEATURES.AI_DESCRIPTIONS);
        } else {
          // Rate-limited — pin remaining to 0 so the inline counter
          // immediately reflects exhaustion, then surface the
          // server's friendly "resets at HH:MM UTC" message.
          setAiRemainingToday(0);
          toast.show(err.message, { type: "danger" });
        }
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't generate a description right now";
      toast.show(message, { type: "danger" });
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
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
                <View className="flex-row items-center gap-2">
                  {mode === "add" && (
                    <Pressable
                      onPress={() => {
                        haptic();
                        setDraftsSheetOpen(true);
                      }}
                      className="h-9 px-3 rounded-full bg-blue-50 border border-blue-100 flex-row items-center gap-1.5 active:bg-blue-100"
                      hitSlop={6}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={13}
                        color="#1d4ed8"
                      />
                      <Text className="text-[12px] font-extrabold text-blue-700">
                        Drafts
                      </Text>
                      {draftCount > 0 && (
                        <View className="bg-blue-600 min-w-[16px] h-[16px] px-1 rounded-full items-center justify-center">
                          <Text className="text-white text-[10px] font-extrabold">
                            {draftCount}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    onPress={onClose}
                    className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={18} color="#374151" />
                  </Pressable>
                </View>
              </View>
            </View>

            <KeyboardScreen
              contentContainerStyle={{ paddingHorizontal: 20 }}
              bottomPadding={24}
            >
              {/* IMAGES */}
              <Text className={`${SECTION_LABEL} mt-5`}>Photos</Text>
              <View className="flex-row gap-3 mb-1">
                {[0, 1].map((slot) => {
                  const uri = productImages[slot];
                  const isPrimary = slot === 0;
                  const isLocked = !isPrimary && !canUseSecondaryImage;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => {
                        if (isLocked) {
                          setPaywallFeature(FEATURES.PRODUCTS_SECONDARY_IMAGE);
                          return;
                        }
                        pickImage(slot);
                      }}
                      className={`flex-1 aspect-square rounded-2xl overflow-hidden border border-dashed ${
                        isLocked
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white border-gray-200"
                      }`}
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
                      ) : isLocked ? (
                        <View className="flex-1 items-center justify-center px-3">
                          <View className="w-10 h-10 rounded-full bg-white items-center justify-center mb-2 border border-gray-200">
                            <Ionicons
                              name="lock-closed"
                              size={16}
                              color="#9ca3af"
                            />
                          </View>
                          <Text className="text-[12px] font-extrabold text-gray-700 text-center">
                            Secondary photo
                          </Text>
                          <Text className="text-[10.5px] text-blue-600 font-bold text-center mt-0.5">
                            Upgrade to unlock
                          </Text>
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
                {canUseSecondaryImage
                  ? "Square images look best · max 2 photos"
                  : "Square images look best · upgrade for a second photo"}
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

              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Text className="text-[12.5px] font-semibold text-gray-700">
                  Category
                </Text>
                {!canUseCategories && (
                  <View className="flex-row items-center gap-0.5 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    <Ionicons name="lock-closed" size={9} color="#b45309" />
                    <Text className="text-[9px] font-extrabold text-amber-800 tracking-wide uppercase">
                      Upgrade
                    </Text>
                  </View>
                )}
              </View>
              {(() => {
                const selectedCategory = vendorCategories.find(
                  (c) => c.id === catalogCategoryId
                );
                const hasCategories = vendorCategories.length > 0;
                return (
                  <Pressable
                    onPress={() => {
                      if (Platform.OS === "ios") {
                        Haptics.selectionAsync().catch(() => {});
                      }
                      // Paywalled — tap routes to upgrade sheet rather
                      // than opening the picker.
                      if (!canUseCategories) {
                        setPaywallFeature(FEATURES.PRODUCTS_CATEGORIES);
                        return;
                      }
                      setCategoryPickerOpen(true);
                    }}
                    className={`flex-row items-center rounded-2xl px-4 h-12 mb-5 border ${
                      canUseCategories
                        ? "bg-white border-gray-200 active:bg-gray-50"
                        : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <Ionicons
                      name="folder-open-outline"
                      size={16}
                      color={canUseCategories ? "#9ca3af" : "#cbd5e1"}
                    />
                    <Text
                      className={`flex-1 ml-3 text-[15px] ${
                        !canUseCategories
                          ? "text-gray-400"
                          : selectedCategory
                          ? "text-gray-900 font-semibold"
                          : "text-gray-400"
                      }`}
                      numberOfLines={1}
                    >
                      {!canUseCategories
                        ? "Upgrade to organise products into categories"
                        : selectedCategory
                        ? selectedCategory.name
                        : hasCategories
                        ? "Select a category"
                        : "No categories yet — add one in Products"}
                    </Text>
                    {canUseCategories && catalogCategoryId != null && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          setCatalogCategoryId(null);
                        }}
                        hitSlop={8}
                        className="w-7 h-7 rounded-full items-center justify-center mr-1 active:bg-gray-100"
                      >
                        <Ionicons name="close" size={14} color="#9ca3af" />
                      </Pressable>
                    )}
                    <Ionicons
                      name={canUseCategories ? "chevron-down" : "chevron-forward"}
                      size={16}
                      color={canUseCategories ? "#9ca3af" : "#9ca3af"}
                    />
                  </Pressable>
                );
              })()}

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

              {/* Cost price + live margin. Only here when the vendor
                  asked for it in the Products settings sheet. The margin
                  read-back sits directly under the field because it's
                  the whole reason to type a cost at all. */}
              {costPriceEnabled && (
                <View className="mt-4">
                  <Text className={FIELD_LABEL}>Cost price</Text>
                  <View className="flex-row items-center bg-white rounded-2xl px-4 h-12 border border-gray-200">
                    <Text className="text-[15px] font-bold text-gray-500 mr-2">
                      ₦
                    </Text>
                    <TextInput
                      value={costPrice}
                      onChangeText={(t) => setCostPrice(t.replace(/[^0-9.]/g, ""))}
                      className="flex-1 text-[15px] text-gray-900 h-full"
                      placeholder="What you paid for it"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <Text className="text-[11.5px] text-gray-500 mt-1.5 ml-1">
                    Never shown to customers.
                  </Text>
                  <MarginReadout price={price} cost={costPrice} />
                </View>
              )}

              <View className="h-5" />

              {/* VARIANTS — paywalled. Tapping while locked opens the
                  upgrade sheet instead of toggling. The lock badge
                  replaces the toggle so the gate is visually obvious. */}
              <Pressable
                onPress={() => {
                  haptic();
                  if (!canUseVariants) {
                    setPaywallFeature(FEATURES.PRODUCTS_VARIANTS);
                    return;
                  }
                  setEnableVariants((prev) => !prev);
                }}
                className={`flex-row items-center rounded-2xl px-4 py-3.5 border ${
                  canUseVariants
                    ? "bg-white border-gray-100"
                    : "bg-gray-50 border-gray-100"
                }`}
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View
                  className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
                    canUseVariants ? "bg-violet-50" : "bg-gray-100"
                  }`}
                >
                  <Ionicons
                    name="layers-outline"
                    size={20}
                    color={canUseVariants ? "#7c3aed" : "#9ca3af"}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[14px] font-bold text-gray-900">
                      Product variants
                    </Text>
                    {!canUseVariants && (
                      <View className="flex-row items-center gap-0.5 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        <Ionicons name="lock-closed" size={9} color="#b45309" />
                        <Text className="text-[9px] font-extrabold text-amber-800 tracking-wide uppercase">
                          UPGRADE
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[12px] text-gray-500 leading-[16px]">
                    {canUseVariants
                      ? `Add ${axis.many.toLowerCase()} and colors customers can pick`
                      : `Upgrade to offer ${axis.many.toLowerCase()}, colors and per-variant pricing`}
                  </Text>
                </View>
                {canUseVariants ? (
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
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                )}
              </Pressable>

              {enableVariants && (
                <View className="bg-white border border-gray-100 rounded-2xl mt-3 px-4 py-4">
                  {/* Size / Format / Bottle size / ... named for the trade */}
                  <Text className={FIELD_LABEL}>{axis.many}</Text>
                  <View className="flex-row items-center mb-3">
                    <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 h-11 mr-2">
                      <TextInput
                        value={currentSize}
                        onChangeText={setCurrentSize}
                        className="flex-1 text-[14px] text-gray-900 h-full"
                        placeholder={axis.examples}
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

                  {/* Per-variant pricing. Stands on its own now: it
                      used to appear only after a size or color had
                      been entered above, so vendors never found it
                      while wondering whether per-size pricing even
                      existed. The rule form is also where the
                      combination gets built — pick or type the size,
                      pick the color, set the price — and anything new
                      joins the product's own size/color lists, since
                      otherwise buyers could never pick the thing that
                      was just priced. */}
                  <View className="h-px bg-gray-100 my-4" />
                  <View className="flex-row items-start justify-between mb-1">
                    <Text className={FIELD_LABEL}>
                      Price by {axis.lower} or color
                    </Text>
                    {variantEntries.length > 0 && (
                      <Pressable
                        onPress={() => {
                          haptic();
                          setVariantEntries([]);
                          closeVariantForm();
                        }}
                        hitSlop={6}
                      >
                        <Text className="text-[11.5px] font-bold text-blue-600">
                          Clear all
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <Text className="text-[11.5px] text-gray-500 leading-[16px] mb-3">
                    Optional. Everything sells at your base price of{" "}
                    <Text className="font-bold text-gray-700">
                      ₦{price ? Number(price).toLocaleString() : "\u2014"}
                    </Text>{" "}
                    unless you add a rule. Use one when a {axis.lower} or color
                    costs more or less, or to count stock for that exact
                    combination.
                  </Text>

                  {/* Worked example, only while there's nothing to look at */}
                  {variantEntries.length === 0 && !variantForm && (
                    <View className="bg-gray-50 border border-gray-100 rounded-2xl px-3.5 py-3 mb-3">
                      <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px] mb-1">
                        Example
                      </Text>
                      <Text className="text-[12px] text-gray-600 leading-[17px]">
                        Base price {price ? `₦${Number(price).toLocaleString()}` : "₦5,000"}.
                        Add a rule for {axis.sample} at{" "}
                        {price
                          ? `₦${(Number(price) + 1500).toLocaleString()}`
                          : "₦6,500"}{" "}
                        and anyone who picks {axis.sample} pays that instead.
                        Every other {axis.lower} keeps the base price.
                      </Text>
                    </View>
                  )}

                  {/* Existing rules */}
                  {variantEntries.length > 0 && (
                    <View className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-3">
                      {variantEntries.map((entry, idx) => {
                        const isLast = idx === variantEntries.length - 1;
                        const swatchLight =
                          entry.color && isLightColor(entry.color);
                        // A rule can outlive the size/color it names if
                        // the vendor deletes it above. It gets dropped at
                        // save, so say so rather than letting it look
                        // active.
                        const stale =
                          (!!entry.size && !sizes.includes(entry.size)) ||
                          (!!entry.color &&
                            !colors.some(
                              (c) =>
                                c.toLowerCase() === entry.color!.toLowerCase()
                            ));
                        return (
                          <Pressable
                            key={`${entry.size ?? ""}||${entry.color ?? ""}||${idx}`}
                            onPress={() => openVariantForm(idx)}
                            className={`flex-row items-center px-3 py-3 ${
                              isLast ? "" : "border-b border-gray-100"
                            } active:bg-gray-50`}
                          >
                            <View className="flex-1 min-w-0">
                              <View className="flex-row items-center gap-1.5">
                                {entry.size ? (
                                  <View className="bg-violet-50 border border-violet-100 rounded-md px-2 py-0.5">
                                    <Text className="text-[12px] font-extrabold text-violet-700">
                                      {entry.size}
                                    </Text>
                                  </View>
                                ) : (
                                  <Text className="text-[12.5px] font-semibold text-gray-500">
                                    Any {axis.lower}
                                  </Text>
                                )}
                                <Text className="text-[11px] text-gray-300">
                                  {"\u00b7"}
                                </Text>
                                {entry.color ? (
                                  <View
                                    className="w-6 h-6 rounded-full"
                                    style={{
                                      backgroundColor: entry.color,
                                      borderWidth: swatchLight ? 1 : 0,
                                      borderColor: "#e5e7eb",
                                    }}
                                  />
                                ) : (
                                  <Text className="text-[12.5px] font-semibold text-gray-500">
                                    Any color
                                  </Text>
                                )}
                              </View>
                              {stale && (
                                <Text className="text-[11px] font-semibold text-amber-700 mt-0.5">
                                  No longer on this product. Tap to fix
                                </Text>
                              )}
                            </View>
                            <View className="items-end mr-3">
                              <Text className="text-[13.5px] font-extrabold text-gray-900">
                                ₦{entry.price ? Number(entry.price).toLocaleString() : "\u2014"}
                              </Text>
                              {!!(entry.stock ?? "") && (
                                <Text
                                  className={`text-[11px] font-semibold ${
                                    Number(entry.stock) === 0
                                      ? "text-rose-600"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {Number(entry.stock) === 0
                                    ? "Sold out"
                                    : `${Number(entry.stock).toLocaleString()} left`}
                                </Text>
                              )}
                            </View>
                            <Pressable
                              onPress={() => deleteVariantEntry(idx)}
                              hitSlop={6}
                              className="w-7 h-7 rounded-full bg-white border border-gray-200 items-center justify-center"
                            >
                              <Ionicons name="close" size={12} color="#6b7280" />
                            </Pressable>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {/* Add / edit form — three numbered steps so the
                      shape of a rule is never something to infer. */}
                  {variantForm ? (
                    <View className="bg-white border-2 border-blue-200 rounded-2xl p-4">
                      <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-[13px] font-extrabold text-gray-900">
                          {variantForm.index === -1
                            ? "New price rule"
                            : "Edit price rule"}
                        </Text>
                        <Pressable
                          onPress={closeVariantForm}
                          hitSlop={6}
                          className="w-7 h-7 rounded-full bg-gray-50 items-center justify-center"
                        >
                          <Ionicons name="close" size={14} color="#6b7280" />
                        </Pressable>
                      </View>

                      <VariantStep
                        n={1}
                        text={`Which ${axis.lower} does this price apply to?`}
                      />
                      <View className="flex-row flex-wrap items-center gap-2 mb-4">
                        <VariantChip
                          label={`Any ${axis.lower}`}
                          selected={!variantForm.size}
                          onPress={() => {
                            haptic();
                            setVariantForm((prev) =>
                              prev ? { ...prev, size: null } : prev
                            );
                          }}
                        />
                        {sizes.map((s) => (
                          <VariantChip
                            key={s}
                            label={s}
                            selected={variantForm.size === s}
                            onPress={() => {
                              haptic();
                              setVariantForm((prev) =>
                                prev ? { ...prev, size: s } : prev
                              );
                            }}
                          />
                        ))}
                        <View className="flex-row items-center gap-1">
                          <TextInput
                            value={variantSizeDraft}
                            onChangeText={(t) =>
                              setVariantSizeDraft(t.toUpperCase())
                            }
                            onSubmitEditing={commitVariantSizeDraft}
                            placeholder={`Add ${axis.lower}`}
                            placeholderTextColor="#9ca3af"
                            autoCapitalize="characters"
                            returnKeyType="done"
                            className="w-[104px] h-9 rounded-full border border-dashed border-gray-300 bg-white px-3 text-[13px] font-bold text-gray-900"
                          />
                          {variantSizeDraft.trim().length > 0 && (
                            <Pressable
                              onPress={commitVariantSizeDraft}
                              className="w-9 h-9 rounded-full bg-gray-900 items-center justify-center"
                            >
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="white"
                              />
                            </Pressable>
                          )}
                        </View>
                      </View>

                      <VariantStep
                        n={2}
                        text="Which color does this price apply to?"
                      />
                      <View className="flex-row flex-wrap items-center gap-2 mb-4">
                        <VariantChip
                          label="Any color"
                          selected={!variantForm.color}
                          onPress={() => {
                            haptic();
                            setVariantForm((prev) =>
                              prev ? { ...prev, color: null } : prev
                            );
                          }}
                        />
                        {colors.map((c) => {
                          const light = isLightColor(c);
                          const selected =
                            variantForm.color?.toLowerCase() ===
                            c.toLowerCase();
                          return (
                            <Pressable
                              key={c}
                              onPress={() => {
                                haptic();
                                setVariantForm((prev) =>
                                  prev ? { ...prev, color: c } : prev
                                );
                              }}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: c,
                                borderWidth: selected ? 3 : light ? 1 : 0,
                                borderColor: selected ? "#2563eb" : "#e5e7eb",
                                alignItems: "center",
                                justifyContent: "center",
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
                        <Pressable
                          onPress={() => {
                            haptic();
                            setVariantPaletteOpen((prev) => !prev);
                          }}
                          className={`flex-row items-center gap-1 h-9 px-3 rounded-full border border-dashed ${
                            variantPaletteOpen
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          <Ionicons
                            name="add"
                            size={14}
                            color={variantPaletteOpen ? "#1d4ed8" : "#374151"}
                          />
                          <Text
                            className={`text-[12.5px] font-bold ${
                              variantPaletteOpen
                                ? "text-blue-700"
                                : "text-gray-700"
                            }`}
                          >
                            Color
                          </Text>
                        </Pressable>
                      </View>

                      {variantPaletteOpen && (
                        <View className="bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-4">
                          <Text className="text-[10.5px] font-bold text-gray-400 uppercase tracking-[1px] mb-2">
                            Tap a color to use it
                          </Text>
                          <View className="flex-row flex-wrap gap-2">
                            {PRESET_COLORS.map((c) => {
                              const light = isLightColor(c);
                              const selected =
                                variantForm.color?.toUpperCase() ===
                                c.toUpperCase();
                              return (
                                <Pressable
                                  key={c}
                                  onPress={() => pickVariantColor(c)}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: c,
                                    borderWidth: selected ? 3 : light ? 1 : 0,
                                    borderColor: selected
                                      ? "#2563eb"
                                      : "#e5e7eb",
                                    alignItems: "center",
                                    justifyContent: "center",
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
                          <Text className="text-[11px] text-gray-500 mt-2 leading-[15px]">
                            New colors are added to this product automatically,
                            so customers can pick them.
                          </Text>
                        </View>
                      )}

                      <VariantStep
                        n={3}
                        text={`What should this ${axis.lower} cost, and how many are left?`}
                      />
                      <Text className="text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.6px] mb-1">
                        Price
                      </Text>
                      <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 h-12 mb-3">
                        <Text className="text-[14px] font-bold text-gray-500 mr-1">
                          ₦
                        </Text>
                        <TextInput
                          value={variantForm.price}
                          onChangeText={(t) =>
                            setVariantForm((prev) =>
                              prev
                                ? { ...prev, price: t.replace(/[^0-9]/g, "") }
                                : prev
                            )
                          }
                          placeholder={
                            price ? Number(price).toLocaleString() : "0"
                          }
                          placeholderTextColor="#cbd5e1"
                          className="flex-1 text-[14px] font-semibold text-gray-900 h-full"
                          keyboardType="number-pad"
                        />
                      </View>

                      <Text className="text-[10.5px] font-bold text-gray-500 uppercase tracking-[0.6px] mb-1">
                        In stock
                      </Text>
                      <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 h-12 mb-2">
                        <TextInput
                          value={variantForm.stock ?? ""}
                          onChangeText={(t) =>
                            setVariantForm((prev) =>
                              prev
                                ? { ...prev, stock: t.replace(/[^0-9]/g, "") }
                                : prev
                            )
                          }
                          placeholder="Leave empty"
                          placeholderTextColor="#cbd5e1"
                          className="flex-1 text-[14px] font-semibold text-gray-900 h-full"
                          keyboardType="number-pad"
                        />
                      </View>
                      <Text className="text-[11px] text-gray-500 leading-[15px] mb-3">
                        Leave stock empty to keep counting this one against the
                        product's overall stock. Set it to 0 to mark just this
                        combination sold out.
                      </Text>

                      {/* Plain-English read-back of the rule */}
                      {!variantForm.size && !variantForm.color ? (
                        <View className="bg-amber-50 rounded-xl px-3 py-2.5">
                          <Text className="text-[12px] font-semibold text-amber-800 leading-[17px]">
                            Choose a {axis.lower}, a color, or both. A rule for
                            any {axis.lower} and any color would just be your
                            base price.
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-2 bg-blue-50 rounded-xl px-3 py-2.5">
                          {variantForm.color && (
                            <View
                              className="w-4 h-4 rounded-full"
                              style={{
                                backgroundColor: variantForm.color,
                                borderWidth: isLightColor(variantForm.color)
                                  ? 1
                                  : 0,
                                borderColor: "#bfdbfe",
                              }}
                            />
                          )}
                          <Text className="flex-1 text-[12px] text-blue-900 leading-[17px]">
                            Customers who choose{" "}
                            <Text className="font-bold">
                              {variantForm.size && variantForm.color
                                ? `${variantForm.size} in this color`
                                : variantForm.size
                                ? `${variantForm.size}, in any color`
                                : `this color, in any ${axis.lower}`}
                            </Text>{" "}
                            pay{" "}
                            <Text className="font-bold">
                              {variantForm.price
                                ? `₦${Number(variantForm.price).toLocaleString()}`
                                : "this price"}
                            </Text>
                            .
                            {!!(variantForm.stock ?? "") &&
                              (Number(variantForm.stock) === 0 ? (
                                <Text className="font-bold">
                                  {" "}
                                  This one shows as sold out.
                                </Text>
                              ) : (
                                <Text>
                                  {" "}
                                  You have{" "}
                                  <Text className="font-bold">
                                    {Number(variantForm.stock)}
                                  </Text>{" "}
                                  of them.
                                </Text>
                              ))}
                          </Text>
                        </View>
                      )}

                      <View className="flex-row gap-2 mt-3">
                        <Pressable
                          onPress={closeVariantForm}
                          className="flex-1 h-11 rounded-xl border border-gray-200 bg-white items-center justify-center"
                        >
                          <Text className="text-[13px] font-extrabold text-gray-700">
                            Cancel
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={saveVariantForm}
                          className="flex-1 h-11 rounded-xl bg-blue-600 items-center justify-center"
                        >
                          <Text className="text-[13px] font-extrabold text-white">
                            {variantForm.index === -1 ? "Add rule" : "Save rule"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => openVariantForm(-1)}
                      className="flex-row items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-gray-300 bg-white active:bg-gray-50"
                    >
                      <Ionicons name="add" size={16} color="#374151" />
                      <Text className="text-[13px] font-extrabold text-gray-700">
                        {variantEntries.length === 0
                          ? "Add a price rule"
                          : "Add another price rule"}
                      </Text>
                    </Pressable>
                  )}
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
                {/* Orderly AI suggestion — always visible when description
                    is empty (so vendors discover it). States:
                      - locked: plan doesn't include AI → tap opens
                        the upgrade paywall (handler decides this).
                      - exhausted: feature available but today's
                        credits are spent → tap surfaces a 429 toast.
                      - name-missing: needs the product name first.
                      - generating: in-flight call.
                      - ready: tap fires the generation.
                    The Pressable stays enabled in `locked` so the
                    handler can open the paywall — disabling it would
                    swallow the tap. */}
                {!productDescription.trim() && (() => {
                  const nameReady = !!productName.trim();
                  const tappable = nameReady && !aiGenerating;
                  const exhausted = canUseAi && aiRemainingToday === 0;
                  // Credit chip: shown when the plan has a finite
                  // quota AND we've made at least one call so the
                  // remaining count is known. Trial sentinel
                  // (`aiIsUnlimited`) hides the chip so vendors
                  // don't see a confusing huge number.
                  const showCreditChip =
                    canUseAi && !aiIsUnlimited && aiRemainingToday != null;
                  return (
                    <Pressable
                      onPress={handleGenerateDescription}
                      disabled={!tappable}
                      className="flex-row items-center gap-3 px-3 py-3 rounded-xl mb-3"
                      style={{
                        backgroundColor: tappable && !exhausted
                          ? "#f5f9ff"
                          : aiGenerating
                          ? "#eff6ff"
                          : "#f9fafb",
                        borderWidth: 1,
                        borderColor:
                          tappable && !exhausted ? "#dbeafe" : "#e5e7eb",
                        borderStyle: "dashed",
                        opacity: nameReady ? 1 : 0.85,
                      }}
                    >
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center relative"
                        style={{
                          backgroundColor: nameReady ? "#dbeafe" : "#e5e7eb",
                        }}
                      >
                        {aiGenerating ? (
                          <ActivityIndicator size="small" color="#2563EB" />
                        ) : (
                          <Ionicons
                            name="sparkles"
                            size={16}
                            color={nameReady ? "#2563EB" : "#9ca3af"}
                          />
                        )}
                        {/* Lock badge mirrors the Staff & permissions
                            lock affordance in MoreHub — vendors
                            recognise the same pattern across the app. */}
                        {!canUseAi && !aiGenerating && (
                          <View
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white items-center justify-center"
                            style={{
                              shadowColor: "#0f172a",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.12,
                              shadowRadius: 2,
                              elevation: 2,
                            }}
                          >
                            <Ionicons name="lock-closed" size={8} color="#6b7280" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-[13px] font-extrabold tracking-tight"
                          style={{ color: nameReady ? "#1d4ed8" : "#6b7280" }}
                        >
                          {aiGenerating
                            ? "Writing your description…"
                            : "Let Orderly AI write this for you"}
                        </Text>
                        <Text
                          className="text-[11px] mt-0.5"
                          style={{ color: nameReady ? "#2563EB" : "#9ca3af" }}
                        >
                          {aiGenerating
                            ? "Hang tight — almost done"
                            : !canUseAi
                            ? "Upgrade your plan to unlock"
                            : exhausted
                            ? "You've used today's credits — they reset overnight"
                            : nameReady
                            ? `Tap once — we'll handle the writing for "${productName.trim().slice(0, 28)}${productName.trim().length > 28 ? "…" : ""}"`
                            : "Add a product name and we'll handle the rest"}
                        </Text>
                      </View>
                      {showCreditChip ? (
                        <View
                          className={`px-2 py-0.5 rounded-full border ${
                            exhausted
                              ? "bg-rose-50 border-rose-100"
                              : "bg-blue-50 border-blue-100"
                          }`}
                        >
                          <Text
                            className={`text-[10.5px] font-extrabold ${
                              exhausted ? "text-rose-700" : "text-blue-700"
                            }`}
                          >
                            {aiRemainingToday} left today
                          </Text>
                        </View>
                      ) : tappable ? (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#2563EB"
                        />
                      ) : null}
                    </Pressable>
                  );
                })()}

                {/* Free instant suggestion — template-based, no AI credits.
                    Removes the blank-description wall for vendors who can't
                    (or won't) use the paid AI writer. Fully editable after
                    insert. Mirrors web ProductDrawer. */}
                {!productDescription.trim() && productName.trim().length >= 3 && (
                  <Pressable
                    onPress={() => {
                      const s = suggestDescription(productName);
                      if (s) {
                        setProductDescription(s.slice(0, 500));
                        clearError("productDescription");
                      }
                    }}
                    className="flex-row items-center self-start gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-200 bg-gray-50 mb-3 active:bg-gray-100"
                  >
                    <Ionicons name="color-wand-outline" size={12} color="#4b5563" />
                    <Text className="text-[10.5px] font-extrabold text-gray-600">
                      Use a suggested description — free
                    </Text>
                  </Pressable>
                )}

                <TextInput
                  value={productDescription}
                  onChangeText={(text) => {
                    setProductDescription(text);
                    clearError("productDescription");
                  }}
                  className="text-[15px] text-gray-900"
                  style={{ minHeight: 100, textAlignVertical: "top" }}
                  placeholder={
                    productName.trim()
                      ? "Or write your own description…"
                      : "Describe what makes this product great…"
                  }
                  placeholderTextColor="#9ca3af"
                  multiline
                  editable={!aiGenerating}
                />
                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  {/* When description has content AND a name is set, swap
                      the helper for a small "Rewrite with AI" affordance so
                      vendors can regenerate. Otherwise show the contextual
                      hint. */}
                  {productName.trim() && productDescription.trim() ? (
                    <Pressable
                      onPress={handleGenerateDescription}
                      disabled={aiGenerating}
                      className="flex-row items-center gap-1"
                      hitSlop={8}
                    >
                      {aiGenerating ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                      ) : (
                        <Ionicons name="sparkles" size={11} color="#2563EB" />
                      )}
                      <Text className="text-[10.5px] font-extrabold text-blue-600 tracking-tight">
                        {aiGenerating ? "Rewriting…" : "Rewrite with Orderly AI"}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text className="text-[10.5px] text-gray-400">
                      {!productName.trim()
                        ? "Add a product name to use Orderly AI"
                        : "A clear description helps customers decide"}
                    </Text>
                  )}
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
            </KeyboardScreen>

            {/* Sticky footer */}
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
              {mode === "add" && (
                <Pressable
                  onPress={handleSaveDraft}
                  disabled={loading || savingDraft}
                  className="h-11 rounded-2xl border border-blue-200 bg-blue-50 items-center justify-center flex-row gap-2 mb-2.5 active:bg-blue-100"
                >
                  {savingDraft ? (
                    <ActivityIndicator size="small" color="#1d4ed8" />
                  ) : (
                    <Ionicons name="bookmark-outline" size={14} color="#1d4ed8" />
                  )}
                  <Text className="text-blue-700 font-extrabold text-[13.5px]">
                    {savingDraft ? "Saving draft…" : "Save as draft"}
                  </Text>
                </Pressable>
              )}
              <View className="flex-row items-center gap-3">
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
          </View>

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

        <DraftsSheet
          visible={draftsSheetOpen}
          onClose={() => setDraftsSheetOpen(false)}
          onLoad={handleLoadDraft}
        />

        <FeaturePaywallSheet
          visible={paywallFeature != null}
          onClose={() => setPaywallFeature(null)}
          feature={paywallFeature}
          onUpgrade={onClose}
        />

        <SelectionDrawer
          visible={categoryPickerOpen}
          onClose={() => setCategoryPickerOpen(false)}
          title="Choose category"
          searchPlaceholder="Search categories"
          options={vendorCategories.map((c) => ({
            value: String(c.id),
            label: c.name,
          }))}
          emptyMessage="You haven't added any categories yet."
          onSelect={(value) => {
            const id = Number(value);
            if (Number.isFinite(id)) setCatalogCategoryId(id);
          }}
        />

        {/* Save / server error alert. Rendered as a nested Modal so it
            overlays this page-sheet — guaranteed visible regardless of
            scroll position. For plan-limit errors we offer an "Upgrade
            plan" primary CTA that closes the form and routes to billing. */}
        <AlertDialog
          visible={saveError != null}
          onClose={() => setSaveError(null)}
          title={saveError?.title ?? ""}
          message={saveError?.message ?? ""}
          severity={saveError?.isPlanLimit ? "warning" : "error"}
          primaryAction={
            saveError?.isPlanLimit
              ? {
                  // iOS uses neutral "Manage subscription" copy and
                  // routes to the status screen, where the only path
                  // forward is the web billing dashboard (Apple 3.1.3
                  // forbids surfacing "Upgrade" CTAs for purchases
                  // not made through IAP). Android keeps the in-app
                  // Paystack flow with action-oriented copy.
                  label:
                    Platform.OS === "ios"
                      ? "Manage subscription"
                      : "Upgrade plan",
                  primary: true,
                  icon: "arrow-up-circle",
                  onPress: () => {
                    setSaveError(null);
                    onClose();
                    if (Platform.OS === "ios") {
                      navigation.navigate("SubscriptionBilling" as any, {});
                    } else {
                      navigation.navigate("SubscriptionFlow", {});
                    }
                  },
                }
              : {
                  label: "Got it",
                  primary: true,
                  onPress: () => setSaveError(null),
                }
          }
          secondaryAction={
            saveError?.isPlanLimit
              ? {
                  label: "Not now",
                  onPress: () => setSaveError(null),
                }
              : undefined
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
