import {
  View,
  Text,
  TextInput,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { RootStackParamList } from "../navigation/types";
import { CHANNELS, ChannelMeta } from "../lib/orderChannels";
import { useProducts } from "../hooks/useProducts";
import { logOfflineOrder } from "../api/vendor/vendor.api";
import type {
  OrderChannel,
  Product,
  LogOfflineOrderRequest,
} from "../api/vendor/vendor.types";
import { formatNaira } from "../lib/format";
import { AppToast, AppToastTone } from "../components/AppToast";
import { AppImage } from "../components/AppImage";
import KeyboardScreen from "../components/KeyboardScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = (
  style: "light" | "medium" | "success" | "error" = "light"
) => {
  if (Platform.OS !== "ios") return;
  if (style === "success") {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
  } else if (style === "error") {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error
    ).catch(() => {});
  } else if (style === "medium") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } else {
    Haptics.selectionAsync().catch(() => {});
  }
};

interface CartLine {
  product: Product;
  quantity: number;
}

/**
 * Vendor-facing form for recording an offline sale (WhatsApp, walk-in,
 * phone, etc). Three logical chunks:
 *   1. Channel — single-select chip picker, drives badge + reports.
 *   2. Customer — name (required) + phone.
 *   3. Items   — picked from the existing catalog with quantity steppers.
 *
 * Submits to /api/order-requests/log-offline which materialises the
 * order + payment so it lands in reports the same way storefront
 * orders do.
 */
export default function LogOrder() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const [channel, setChannel] = useState<OrderChannel | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [markAsPaid, setMarkAsPaid] = useState(true);
  const [notes, setNotes] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  // Debounced mirror of `productSearch`. Querying the API on every
  // keystroke would hammer the network and the input would lag on slower
  // devices; 300ms is short enough to feel instant and long enough to
  // collapse a typing burst into one request.
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(productSearch.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [productSearch]);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  // Server-side search against the vendor's full catalog — page 1 is
  // a recency sample for the empty state, anything typed into the bar
  // hits the same indexed search the Products screen uses (matches
  // title / description / category, not just the page-1 slice).
  // `keepPreviousData` keeps the prior list visible while the next
  // query resolves, so the list never blanks between keystrokes.
  const {
    data: productsData,
    isPending: productsLoading,
    isFetching: productsFetching,
  } = useProducts({
    page: 1,
    pageSize: 30,
    search: debouncedSearch || undefined,
  });

  const filteredProducts: Product[] = useMemo(
    () => productsData?.data ?? [],
    [productsData?.data]
  );

  // Subtle "background search in progress" hint — the list keeps showing
  // the previous results while a new search resolves, but a tiny spinner
  // in the search bar tells the vendor work is happening.
  const searchInFlight =
    productSearch.trim() !== debouncedSearch || productsFetching;

  const total = useMemo(
    () =>
      cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [cart]
  );

  const canSubmit =
    !submitting &&
    !!channel &&
    customerName.trim().length > 0 &&
    cart.length > 0;

  const addToCart = (product: Product) => {
    haptic();
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const decrement = (productId: string) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.max(0, l.quantity - 1) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const increment = (productId: string) => {
    setCart((prev) =>
      prev.map((l) =>
        l.product.id === productId ? { ...l, quantity: l.quantity + 1 } : l
      )
    );
  };

  const remove = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !channel) return;
    haptic("medium");
    setSubmitting(true);
    try {
      const payload: LogOfflineOrderRequest = {
        channel,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        markAsPaid,
        notes: notes.trim() || undefined,
        items: cart.map((line) => ({
          catalogItemId: line.product.id,
          quantity: line.quantity,
          unitPrice: line.product.price,
        })),
      };
      await logOfflineOrder(payload);
      // Bust the orders cache so the new entry shows up immediately
      // when the vendor lands back on the Orders screen — no more
      // pull-to-refresh required. Invalidating by the "orders" prefix
      // covers both paid + unpaid query keys regardless of page/search.
      qc.invalidateQueries({ queryKey: ["orders"] });
      haptic("success");
      setToast({
        title: "Order logged",
        subtitle: `${cart.length} ${
          cart.length === 1 ? "item" : "items"
        } · ${formatNaira(total)}`,
        tone: "success",
      });
      // Pop back after a beat so the toast has a chance to play.
      setTimeout(() => navigation.goBack(), 900);
    } catch (e: any) {
      console.error("Log offline order failed:", e);
      haptic("error");
      setToast({
        title: "Couldn't log the order",
        subtitle: e?.message ?? "Try again in a moment.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <AppToast
        visible={toast != null}
        title={toast?.title ?? ""}
        subtitle={toast?.subtitle}
        tone={toast?.tone}
        onHide={() => setToast(null)}
      />

      {/* Header */}
      <View className="bg-white px-5 py-3 border-b border-gray-100 flex-row items-center">
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          className="w-10 h-10 rounded-full items-center justify-center bg-gray-50 mr-3 active:bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>
        <Text
          className="text-[16px] text-gray-900"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Log offline order
        </Text>
      </View>

      <View className="flex-1">
        <KeyboardScreen
          className="flex-1"
          bottomPadding={160}
          extraScrollHeight={40}
        >
          {/* Hero — sets the mental model for what this screen does.
              Brand-blue (#194eb8) matches the hero treatment on
              LocationManagement, CustomDomain, OrderDetails, etc. */}
          <View
            className="mx-4 mt-4 rounded-3xl overflow-hidden p-5"
            style={{ backgroundColor: "#194eb8" }}
          >
            <View
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: "rgba(96, 165, 250, 0.18)",
              }}
            />
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-2xl bg-blue-500/20 items-center justify-center border border-blue-400/30">
                <Ionicons
                  name="receipt-outline"
                  size={22}
                  color="#bfdbfe"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-white text-[17px] tracking-tight"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Sold through another channel?
                </Text>
                <Text className="text-blue-100/80 text-[12.5px] mt-0.5 leading-[17px]">
                  Log it here and it'll show up in your reports — tagged with
                  where the sale came from.
                </Text>
              </View>
            </View>
          </View>

          {/* Step 1: channel picker */}
          <SectionLabel index={1} title="Where did this order come from?" />
          <View className="px-4">
            <View className="flex-row flex-wrap -mx-1">
              {CHANNELS.map((c) => (
                <ChannelChip
                  key={c.key}
                  meta={c}
                  selected={channel === c.key}
                  onPress={() => {
                    haptic();
                    setChannel(c.key);
                  }}
                />
              ))}
            </View>
          </View>

          {/* Step 2: customer info */}
          <SectionLabel index={2} title="Customer" />
          <View className="mx-4 gap-3">
            <Field
              label="Customer name"
              required
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. Adaeze Okafor"
              autoCapitalize="words"
            />
            <Field
              label="Phone number"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Optional"
              keyboardType="phone-pad"
            />
          </View>

          {/* Step 3: items */}
          <SectionLabel index={3} title="Items" />
          <View className="mx-4">
            {cart.length === 0 ? (
              <Pressable
                onPress={() => {
                  haptic();
                  setPickerOpen(true);
                }}
                className="bg-white rounded-2xl border border-dashed border-gray-300 px-5 py-7 items-center active:bg-gray-50"
              >
                <View className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center border border-blue-100 mb-2">
                  <Ionicons name="add" size={22} color="#2563eb" />
                </View>
                <Text
                  className="text-[14px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Add a product
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5 text-center">
                  Pick from your catalog and set the quantity sold.
                </Text>
              </Pressable>
            ) : (
              <View
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                {cart.map((line, i) => {
                  const lineTotal = line.product.price * line.quantity;
                  return (
                    <View
                      key={line.product.id}
                      className={`flex-row items-center px-3 py-3 ${
                        i === cart.length - 1
                          ? ""
                          : "border-b border-gray-100"
                      }`}
                    >
                      <View className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden mr-3">
                        {line.product.image ? (
                          <AppImage
                            uri={line.product.image}
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <Ionicons
                              name="cube-outline"
                              size={18}
                              color="#94a3b8"
                            />
                          </View>
                        )}
                      </View>
                      <View className="flex-1 min-w-0 pr-2">
                        <Text
                          className="text-[13.5px] text-gray-900"
                          numberOfLines={1}
                          style={{
                            fontFamily: "PlusJakartaSans_700Bold",
                          }}
                        >
                          {line.product.title}
                        </Text>
                        <Text className="text-[11.5px] text-gray-500 mt-0.5">
                          {formatNaira(line.product.price)} each ·{" "}
                          {formatNaira(lineTotal)}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5 mr-2">
                        <QtyStepperButton
                          icon="remove"
                          onPress={() => decrement(line.product.id)}
                        />
                        <Text
                          className="text-[14px] text-gray-900 w-6 text-center"
                          style={{
                            fontFamily: "PlusJakartaSans_700Bold",
                          }}
                        >
                          {line.quantity}
                        </Text>
                        <QtyStepperButton
                          icon="add"
                          onPress={() => increment(line.product.id)}
                        />
                      </View>
                      <Pressable
                        onPress={() => remove(line.product.id)}
                        hitSlop={8}
                        className="w-8 h-8 rounded-full items-center justify-center active:bg-rose-50"
                      >
                        <Ionicons
                          name="close"
                          size={14}
                          color="#9ca3af"
                        />
                      </Pressable>
                    </View>
                  );
                })}

                <Pressable
                  onPress={() => {
                    haptic();
                    setPickerOpen(true);
                  }}
                  className="flex-row items-center justify-center gap-1.5 py-3 border-t border-gray-100 active:bg-gray-50"
                >
                  <Ionicons name="add-circle" size={16} color="#2563eb" />
                  <Text
                    className="text-[13px] text-blue-600"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Add another item
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Optional: notes + payment toggle */}
          <SectionLabel index={4} title="Payment" />
          <View className="mx-4">
            <Pressable
              onPress={() => {
                haptic();
                setMarkAsPaid((v) => !v);
              }}
              className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex-row items-center"
              style={{
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <View
                className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${
                  markAsPaid ? "bg-emerald-50 border border-emerald-100" : "bg-gray-50"
                }`}
              >
                <Ionicons
                  name={
                    markAsPaid
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={20}
                  color={markAsPaid ? "#059669" : "#9ca3af"}
                />
              </View>
              <View className="flex-1 pr-2">
                <Text
                  className="text-[13.5px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Mark as paid
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5 leading-[16px]">
                  {markAsPaid
                    ? "Counts as a paid sale and updates revenue immediately."
                    : "Saved as awaiting payment — won't add to revenue yet."}
                </Text>
              </View>
              <View
                className={`w-12 h-7 rounded-full justify-center px-1 ${
                  markAsPaid ? "bg-emerald-500" : "bg-gray-200"
                }`}
              >
                <View
                  className="w-5 h-5 rounded-full bg-white"
                  style={{
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                    elevation: 2,
                    transform: [{ translateX: markAsPaid ? 20 : 0 }],
                  }}
                />
              </View>
            </Pressable>

            <View className="mt-3">
              <Field
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Any private notes for your records"
                multiline
              />
            </View>
          </View>
        </KeyboardScreen>

        {/* Sticky bottom bar — total + submit. */}
        <View
          className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-3 pb-7 border-t border-gray-100"
          style={{
            shadowColor: "#0f172a",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <View className="flex-row items-center mb-3">
            <Text className="text-[11.5px] text-gray-500 font-extrabold uppercase tracking-[1.2px]">
              Total
            </Text>
            <Text
              className="ml-auto text-[18px] text-gray-900"
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                letterSpacing: -0.4,
              }}
            >
              {formatNaira(total)}
            </Text>
          </View>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
              canSubmit ? "bg-blue-600 active:bg-blue-700" : "bg-gray-200"
            }`}
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: canSubmit ? 0.25 : 0,
              shadowRadius: 10,
              elevation: canSubmit ? 4 : 0,
            }}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text className="text-white font-extrabold text-[14.5px]">
                  Logging…
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={canSubmit ? "#fff" : "#9ca3af"}
                />
                <Text
                  className={`font-extrabold text-[14.5px] ${
                    canSubmit ? "text-white" : "text-gray-500"
                  }`}
                >
                  Log order
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Product picker — full-screen list with search. */}
      {pickerOpen && (
        <View className="absolute inset-0 bg-white">
          <SafeAreaView edges={["top"]} className="flex-1">
            <View className="bg-white px-5 py-3 border-b border-gray-100 flex-row items-center">
              <Pressable
                onPress={() => setPickerOpen(false)}
                hitSlop={8}
                className="w-10 h-10 rounded-full items-center justify-center bg-gray-50 mr-3 active:bg-gray-100"
              >
                <Ionicons name="close" size={20} color="#111827" />
              </Pressable>
              <Text
                className="text-[16px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Pick products
              </Text>
            </View>

            <View className="px-4 pt-3">
              <View
                className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-3 py-2.5"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <Ionicons name="search" size={16} color="#94a3b8" />
                <TextInput
                  value={productSearch}
                  onChangeText={setProductSearch}
                  placeholder="Search products"
                  placeholderTextColor="#9ca3af"
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  className="flex-1 ml-2 text-[14px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                />
                {searchInFlight && productSearch.trim().length > 0 ? (
                  // Lightweight inline spinner while the next query
                  // resolves — the list itself keeps the previous
                  // results so this is the only "searching…" affordance.
                  <ActivityIndicator size="small" color="#94a3b8" />
                ) : productSearch.length > 0 ? (
                  <Pressable
                    onPress={() => setProductSearch("")}
                    hitSlop={8}
                    className="w-6 h-6 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Ionicons name="close" size={12} color="#64748b" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {productsLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 24,
                }}
                renderItem={({ item }) => {
                  const inCart = cart.find((l) => l.product.id === item.id);
                  return (
                    <Pressable
                      onPress={() => addToCart(item)}
                      className={`flex-row items-center bg-white rounded-2xl border px-3 py-2.5 mb-2 active:bg-gray-50 ${
                        inCart ? "border-blue-200" : "border-gray-100"
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
                            <Ionicons
                              name="cube-outline"
                              size={18}
                              color="#94a3b8"
                            />
                          </View>
                        )}
                      </View>
                      <View className="flex-1 min-w-0 pr-2">
                        <Text
                          className="text-[13.5px] text-gray-900"
                          numberOfLines={1}
                          style={{
                            fontFamily: "PlusJakartaSans_700Bold",
                          }}
                        >
                          {item.title}
                        </Text>
                        <Text className="text-[12px] text-gray-500 mt-0.5">
                          {formatNaira(item.price)}
                          {typeof item.stock === "number"
                            ? ` · ${item.stock} in stock`
                            : ""}
                        </Text>
                      </View>
                      {inCart ? (
                        <View className="flex-row items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-100">
                          <Ionicons
                            name="checkmark"
                            size={11}
                            color="#2563eb"
                          />
                          <Text className="text-[10.5px] font-extrabold text-blue-700">
                            ×{inCart.quantity}
                          </Text>
                        </View>
                      ) : (
                        <View className="w-8 h-8 rounded-full items-center justify-center bg-blue-600">
                          <Ionicons name="add" size={16} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View className="items-center justify-center py-12">
                    <Ionicons
                      name="cube-outline"
                      size={28}
                      color="#cbd5e1"
                    />
                    <Text className="text-[13px] text-gray-500 mt-2">
                      No products match "{productSearch}".
                    </Text>
                  </View>
                }
              />
            )}

            <View
              className="px-5 py-3 bg-white border-t border-gray-100"
              style={{ paddingBottom: Platform.OS === "ios" ? 28 : 16 }}
            >
              <Pressable
                onPress={() => setPickerOpen(false)}
                className="h-12 rounded-2xl bg-gray-900 items-center justify-center"
              >
                <Text
                  className="text-white text-[14.5px]"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Done · {cart.length}{" "}
                  {cart.length === 1 ? "item" : "items"}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

interface SectionLabelProps {
  index: number;
  title: string;
}

function SectionLabel({ index, title }: SectionLabelProps) {
  return (
    <View className="px-5 mt-6 mb-3 flex-row items-center gap-2">
      <View
        className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 items-center justify-center"
      >
        <Text
          className="text-[10px] text-blue-600"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          {index}
        </Text>
      </View>
      <Text
        className="text-[13px] text-gray-900"
        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
      >
        {title}
      </Text>
    </View>
  );
}

interface ChannelChipProps {
  meta: ChannelMeta;
  selected: boolean;
  onPress: () => void;
}

function ChannelChip({ meta, selected, onPress }: ChannelChipProps) {
  return (
    <View style={{ width: "33.333%" }} className="px-1 mb-2">
      <Pressable
        onPress={onPress}
        className={`rounded-2xl border px-3 py-3 items-center ${
          selected ? "border-transparent" : "bg-white border-gray-100"
        }`}
        style={
          selected
            ? {
                backgroundColor: meta.bg,
                borderColor: meta.accent,
                shadowColor: meta.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 2,
              }
            : {
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }
        }
      >
        <View
          className="w-9 h-9 rounded-2xl items-center justify-center mb-1.5"
          style={{ backgroundColor: selected ? "#ffffff" : meta.bg }}
        >
          <Ionicons name={meta.icon} size={18} color={meta.accent} />
        </View>
        <Text
          className="text-[12px]"
          numberOfLines={1}
          style={{
            color: selected ? meta.accent : "#0f172a",
            fontFamily: "PlusJakartaSans_700Bold",
          }}
        >
          {meta.label}
        </Text>
      </Pressable>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  keyboardType,
  autoCapitalize,
  multiline,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <View className="flex-row items-center gap-1 mb-1.5">
        <Text className="text-[10.5px] font-extrabold text-gray-500 uppercase tracking-[1.2px]">
          {label}
        </Text>
        {required && (
          <Text className="text-[10.5px] font-extrabold text-rose-500">
            *
          </Text>
        )}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`bg-white rounded-2xl border px-4 py-3 text-[14.5px] text-gray-900 ${
          focused ? "border-blue-300" : "border-gray-100"
        }`}
        style={{
          fontFamily: "PlusJakartaSans_500Medium",
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? "top" : "auto",
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: focused ? 0.08 : 0.04,
          shadowRadius: focused ? 8 : 4,
          elevation: focused ? 2 : 1,
        }}
      />
    </View>
  );
}

interface QtyStepperButtonProps {
  icon: "add" | "remove";
  onPress: () => void;
}

function QtyStepperButton({ icon, onPress }: QtyStepperButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
    >
      <Ionicons name={icon} size={14} color="#374151" />
    </Pressable>
  );
}
