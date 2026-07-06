import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";

import { RootStackParamList } from "../navigation/types";
import { useProducts } from "../hooks/useProducts";
import {
  createInvoiceDocument,
  getInvoiceShareUrl,
  invoicePdfUrl,
  type DocumentKind,
} from "../api/vendor/invoice.api";
import type { Product } from "../api/vendor/vendor.types";
import { formatNaira } from "../lib/format";
import { AppToast, AppToastTone } from "../components/AppToast";
import { AppImage } from "../components/AppImage";
import KeyboardScreen from "../components/KeyboardScreen";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = (style: "light" | "success" | "error" = "light") => {
  if (Platform.OS !== "ios") return;
  if (style === "success")
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (style === "error")
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
};

interface Line {
  product: Product;
  quantity: number;
  unitPrice: number;
}

/**
 * Create an invoice or receipt — the mobile twin of the web drawer,
 * built on the same joyful flow as LogOrder: pick the kind, say who
 * it's for, search-and-tap products from the catalog, watch the total
 * build, download the branded PDF at the end.
 */
export default function CreateInvoice() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const [kind, setKind] = useState<DocumentKind>("invoice");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [recordToIncome, setRecordToIncome] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  // Debounced product search (same pattern as LogOrder).
  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(productSearch.trim()), 300);
    return () => clearTimeout(handle);
  }, [productSearch]);

  const { data: productsData, isFetching: productsFetching } = useProducts({
    page: 1,
    pageSize: 30,
    search: debouncedSearch || undefined,
  });
  const products: Product[] = useMemo(
    () => productsData?.data ?? [],
    [productsData?.data]
  );
  const searchInFlight =
    productSearch.trim() !== debouncedSearch || productsFetching;

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines]
  );
  const discountNum = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);

  const addProduct = (p: Product) => {
    haptic();
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing)
        return prev.map((l) =>
          l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      return [...prev, { product: p, quantity: 1, unitPrice: p.price }];
    });
  };

  const setQuantity = (id: string, q: number) =>
    setLines((prev) =>
      q <= 0
        ? prev.filter((l) => l.product.id !== id)
        : prev.map((l) => (l.product.id === id ? { ...l, quantity: q } : l))
    );

  const setPrice = (id: string, price: number) =>
    setLines((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, unitPrice: price } : l))
    );

  const canSubmit =
    !submitting && customerName.trim().length > 0 && lines.length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    if (discountNum < 0 || discountNum > subtotal) {
      setToast({ title: "Discount can't exceed the subtotal", tone: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await createInvoiceDocument({
        kind,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        items: lines.map((l) => ({
          catalogItemId: l.product.id,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        discount: discountNum,
        notes: notes.trim() || null,
        recordToIncome: kind === "receipt" ? recordToIncome : false,
      });
      haptic("success");
      qc.invalidateQueries({ queryKey: ["invoices"] });

      Alert.alert(
        `${kind === "receipt" ? "Receipt" : "Invoice"} ${res.document.reference} created 🎉`,
        res.message ?? "Your PDF is ready to download.",
        [
          {
            text: "Download PDF",
            onPress: () => {
              // Clean public share link (falls back to the local view URL).
              getInvoiceShareUrl(res.document.id)
                .catch(() => invoicePdfUrl(res.document.id))
                .then((url) => WebBrowser.openBrowserAsync(url))
                .catch(() => {});
              navigation.goBack();
            },
          },
          { text: "Done", onPress: () => navigation.goBack() },
        ]
      );
    } catch {
      haptic("error");
      setToast({ title: "Couldn't create the document", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pt-2 pb-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-2xl bg-white border border-gray-100"
        >
          <Ionicons name="chevron-back" size={20} color="#0f172a" />
        </Pressable>
        <View>
          <Text className="text-[20px] font-extrabold text-gray-900">
            New document
          </Text>
          <Text className="text-[12px] text-gray-500">
            Fill in the details, download the PDF
          </Text>
        </View>
      </View>

      <KeyboardScreen contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
        {/* Kind toggle */}
        <View className="flex-row gap-2.5">
          <KindCard
            active={kind === "invoice"}
            icon="document-text-outline"
            title="Invoice"
            subtitle="Request payment"
            onPress={() => setKind("invoice")}
          />
          <KindCard
            active={kind === "receipt"}
            icon="receipt-outline"
            title="Receipt"
            subtitle="Payment received"
            onPress={() => setKind("receipt")}
          />
        </View>

        {/* Customer */}
        <SectionLabel>
          {kind === "receipt" ? "Received from" : "Bill to"}
        </SectionLabel>
        <TextInput
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Customer name *"
          placeholderTextColor="#94a3b8"
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-900"
        />
        <TextInput
          value={customerPhone}
          onChangeText={setCustomerPhone}
          placeholder="Phone (optional)"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          className="mt-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-900"
        />

        {/* Product picker */}
        <SectionLabel>Items — pick from your products</SectionLabel>
        <View className="flex-row items-center rounded-2xl border border-gray-200 bg-white px-3.5">
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            value={productSearch}
            onChangeText={setProductSearch}
            placeholder="Search your products…"
            placeholderTextColor="#94a3b8"
            className="ml-2 flex-1 py-3 text-[14px] text-gray-900"
          />
          {searchInFlight && <ActivityIndicator size="small" color="#94a3b8" />}
        </View>

        {/* Results */}
        <View className="mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white">
          {products.slice(0, 8).map((p) => {
            const picked = lines.some((l) => l.product.id === p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => addProduct(p)}
                className={`flex-row items-center gap-3 border-b border-gray-50 px-3.5 py-3 ${
                  picked ? "bg-blue-50/50" : ""
                }`}
              >
                <View className="h-10 w-10 overflow-hidden rounded-xl bg-gray-50">
                  {p.image ? (
                    <AppImage uri={p.image} style={{ width: 40, height: 40 }} />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Ionicons name="image-outline" size={15} color="#cbd5e1" />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-gray-900" numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text className="text-[12px] text-gray-500">
                    {formatNaira(p.price)}
                  </Text>
                </View>
                <View
                  className={`h-7 w-7 items-center justify-center rounded-lg ${
                    picked ? "bg-blue-100" : "bg-blue-50"
                  }`}
                >
                  <Ionicons name="add" size={16} color="#0080ff" />
                </View>
              </Pressable>
            );
          })}
          {products.length === 0 && !searchInFlight && (
            <Text className="px-4 py-6 text-center text-[12px] text-gray-400">
              No products found.
            </Text>
          )}
        </View>

        {/* Selected lines */}
        {lines.length > 0 && (
          <View className="mt-3">
            {lines.map((line) => (
              <View
                key={line.product.id}
                className="mb-2 rounded-2xl border border-gray-100 bg-white p-3"
              >
                <View className="flex-row items-center gap-3">
                  <Text className="flex-1 text-[13px] font-bold text-gray-900" numberOfLines={1}>
                    {line.product.title}
                  </Text>
                  <Text className="text-[13px] font-extrabold text-gray-900">
                    {formatNaira(line.unitPrice * line.quantity)}
                  </Text>
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <View className="flex-row items-center rounded-xl border border-gray-200 px-2 py-1">
                    <Text className="mr-1 text-[11px] text-gray-400">₦</Text>
                    <TextInput
                      value={String(line.unitPrice)}
                      onChangeText={(t) =>
                        setPrice(line.product.id, Math.max(0, Number(t) || 0))
                      }
                      keyboardType="numeric"
                      className="w-20 py-0.5 text-[12px] text-gray-900"
                    />
                    <Text className="ml-1 text-[11px] text-gray-400">each</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Stepper
                      icon="remove"
                      onPress={() => setQuantity(line.product.id, line.quantity - 1)}
                    />
                    <Text className="w-7 text-center text-[14px] font-extrabold text-gray-900">
                      {line.quantity}
                    </Text>
                    <Stepper
                      icon="add"
                      onPress={() => setQuantity(line.product.id, line.quantity + 1)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Discount + notes */}
        <SectionLabel>Discount (₦, optional)</SectionLabel>
        <TextInput
          value={discount}
          onChangeText={setDiscount}
          placeholder="0"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-900"
        />

        <SectionLabel>Notes on the document (optional)</SectionLabel>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={
            kind === "invoice"
              ? "e.g. Payment: transfer to GTBank 0123456789"
              : "e.g. Thank you for your patronage!"
          }
          placeholderTextColor="#94a3b8"
          multiline
          className="min-h-[70px] rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-900"
          style={{ textAlignVertical: "top" }}
        />

        {/* Record to income — receipts only */}
        {kind === "receipt" && (
          <Pressable
            onPress={() => {
              haptic();
              setRecordToIncome((v) => !v);
            }}
            className={`mt-4 flex-row items-start gap-3 rounded-2xl border p-4 ${
              recordToIncome
                ? "border-blue-300 bg-blue-50/70"
                : "border-gray-200 bg-white"
            }`}
          >
            <View
              className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border-2 ${
                recordToIncome
                  ? "border-[#0080ff] bg-[#0080ff]"
                  : "border-gray-300 bg-white"
              }`}
            >
              {recordToIncome && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <View className="flex-1">
              <Text className="text-[13.5px] font-bold text-gray-900">
                Add to my income
              </Text>
              <Text className="mt-0.5 text-[12px] leading-4 text-gray-500">
                Records this receipt as a paid order so it counts in your
                revenue, reports and analytics.
              </Text>
            </View>
          </Pressable>
        )}
      </KeyboardScreen>

      {/* Sticky footer: total + submit */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-5 pb-8 pt-4"
        style={{
          shadowColor: "#0f172a",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              {kind === "receipt" ? "Amount paid" : "Total due"}
            </Text>
            <Text className="text-[20px] font-extrabold text-gray-900">
              {formatNaira(total)}
            </Text>
          </View>
          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            className={`flex-row items-center gap-2 rounded-2xl px-7 py-3.5 ${
              canSubmit ? "bg-[#0080ff]" : "bg-gray-200"
            }`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={kind === "receipt" ? "receipt-outline" : "document-text-outline"}
                size={15}
                color={canSubmit ? "#fff" : "#94a3b8"}
              />
            )}
            <Text
              className={`text-[14px] font-extrabold ${
                canSubmit ? "text-white" : "text-gray-400"
              }`}
            >
              Create {kind}
            </Text>
          </Pressable>
        </View>
      </View>

      {toast && (
        <AppToast
          visible
          title={toast.title}
          subtitle={toast.subtitle}
          tone={toast.tone}
          onHide={() => setToast(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Bits ────────────────────────────────────────────────────────────

function KindCard({
  active,
  icon,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      className={`flex-1 rounded-2xl border p-4 ${
        active ? "border-blue-300 bg-blue-50/70" : "border-gray-200 bg-white"
      }`}
    >
      <View
        className={`h-8 w-8 items-center justify-center rounded-xl ${
          active ? "bg-blue-100" : "bg-gray-50"
        }`}
      >
        <Ionicons name={icon} size={16} color={active ? "#0080ff" : "#64748b"} />
      </View>
      <Text className="mt-2 text-[14px] font-extrabold text-gray-900">{title}</Text>
      <Text className="text-[11px] text-gray-500">{subtitle}</Text>
    </Pressable>
  );
}

function Stepper({
  icon,
  onPress,
}: {
  icon: "add" | "remove";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      className="h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white"
    >
      <Ionicons name={icon} size={14} color="#334155" />
    </Pressable>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 mt-5 text-[10.5px] font-extrabold uppercase tracking-widest text-gray-400">
      {children}
    </Text>
  );
}
