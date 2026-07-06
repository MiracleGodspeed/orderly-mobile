import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  TextStyle,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { RootStackParamList } from "../navigation/types";
import {
  deleteInvoiceDocument,
  generateReceipt,
  getInvoices,
  getInvoiceShareUrl,
  invoicePdfUrl,
  recordReceiptIncome,
  type InvoiceListItem,
} from "../api/vendor/invoice.api";
import { AppToast, AppToastTone } from "../components/AppToast";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = "all" | "invoice" | "receipt";

const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

const TABULAR: TextStyle = { fontVariant: ["tabular-nums"] };
const DISPLAY = "PlusJakartaSans_800ExtraBold";
const BOLD = "PlusJakartaSans_700Bold";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "invoice", label: "Invoices" },
  { key: "receipt", label: "Receipts" },
];

function Money({
  value,
  size,
  color = "#0f172a",
  weight = BOLD,
}: {
  value: number | null | undefined;
  size: number;
  color?: string;
  weight?: string;
}) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const [whole, frac] = n
    .toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .split(".");
  return (
    <Text
      style={[
        TABULAR,
        { fontFamily: weight, color, fontSize: size, letterSpacing: -size * 0.03 },
      ]}
    >
      ₦{whole}
      <Text style={{ fontSize: size * 0.64, opacity: 0.45 }}>.{frac}</Text>
    </Text>
  );
}

/**
 * Invoices & Receipts — the vendor's paperwork desk on mobile. Gradient
 * hero carrying the Create CTA, kind tabs + search, and refined document
 * cards with PDF / generate-receipt / add-to-income / delete actions.
 */
export default function Invoices() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [receiptFor, setReceiptFor] = useState<InvoiceListItem | null>(null);
  const [recordToIncome, setRecordToIncome] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  const { data, isPending, refetch, isRefetching } = useQuery({
    queryKey: ["invoices", tab, search],
    queryFn: () =>
      getInvoices({
        pageIndex: 1,
        pageSize: 50,
        search: search.trim() || undefined,
        kind: tab === "all" ? undefined : tab,
      }),
  });

  const rows = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["invoices"] });
  };

  const openPdf = async (row: InvoiceListItem) => {
    haptic();
    try {
      // Open the CLEAN public share link so whatever the vendor forwards
      // from the browser is a short, safe URL — never the session token.
      // Falls back to the tokenised URL only if the share endpoint is
      // unavailable (e.g. older API), so viewing never breaks.
      let url: string;
      try {
        url = await getInvoiceShareUrl(row.id);
      } catch {
        url = invoicePdfUrl(row.id);
      }
      await WebBrowser.openBrowserAsync(url);
    } catch {
      setToast({ title: "Couldn't open the PDF", tone: "error" });
    }
  };

  const addToIncome = async (row: InvoiceListItem) => {
    haptic();
    setBusyId(row.id);
    try {
      const res = await recordReceiptIncome(row.id);
      setToast({
        title: "Added to your income 🎉",
        subtitle: res.message ?? undefined,
        tone: "success",
      });
      refresh();
    } catch {
      setToast({ title: "Couldn't record it — try again", tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: InvoiceListItem) => {
    haptic();
    setBusyId(row.id);
    try {
      await deleteInvoiceDocument(row.id);
      setToast({ title: `${row.reference} deleted`, tone: "success" });
      refresh();
    } catch {
      setToast({ title: "Couldn't delete it — try again", tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const confirmReceipt = async () => {
    if (!receiptFor) return;
    const invoice = receiptFor;
    setReceiptFor(null);
    setBusyId(invoice.id);
    try {
      const res = await generateReceipt(invoice.id, recordToIncome);
      setToast({
        title: `Receipt ${res.document.reference} generated`,
        subtitle: res.message ?? "Find it under the Receipts tab.",
        tone: "success",
      });
      refresh();
    } catch {
      setToast({ title: "Couldn't generate the receipt", tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const goCreate = () => {
    haptic();
    navigation.navigate("CreateInvoice");
  };

  const ListHeader = (
    <View>
      {/* ── Gradient hero with primary CTA ───────────────────────── */}
      <View
        className="mx-4 mt-2"
        style={{
          borderRadius: 26,
          backgroundColor: "#0a1424",
          shadowColor: "#0b1220",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 14 },
          elevation: 10,
        }}
      >
        {/* Gradient is an absolute-fill BACKGROUND; the padded content
            View below drives the card height so nothing ever clips. */}
        <View style={{ borderRadius: 26, overflow: "hidden" }}>
          <LinearGradient
            colors={["#0f2f5e", "#0b1f42", "#0a1424"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ padding: 22 }}>
            <View className="flex-row items-center gap-3.5">
              <View className="w-11 h-11 rounded-2xl items-center justify-center bg-white/10">
                <Ionicons name="document-text-outline" size={21} color="#fff" />
              </View>
              <View className="flex-1 min-w-0">
                <Text style={{ fontFamily: DISPLAY, fontSize: 17, color: "#fff" }}>
                  Paperwork that wins trust
                </Text>
                <Text
                  className="mt-0.5"
                  style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 17 }}
                >
                  Branded invoices & receipts, sent as a PDF in one tap.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={goCreate}
              className="mt-4 flex-row items-center justify-center gap-1.5 rounded-2xl bg-white py-3.5 active:opacity-90"
            >
              <Ionicons name="add" size={16} color="#0a1424" />
              <Text style={{ fontFamily: DISPLAY, fontSize: 13.5, color: "#0a1424" }}>
                Create document
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Tabs (segmented) ─────────────────────────────────────── */}
      <View className="mx-4 mt-4 bg-[#eef1f5] rounded-2xl p-1 flex-row">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                haptic();
                setTab(t.key);
              }}
              className="flex-1 items-center justify-center py-2.5 rounded-xl"
              style={
                isActive
                  ? {
                      backgroundColor: "#fff",
                      shadowColor: "#0f172a",
                      shadowOpacity: 0.06,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    }
                  : undefined
              }
            >
              <Text
                style={{
                  fontFamily: BOLD,
                  fontSize: 12.5,
                  color: isActive ? "#0f172a" : "#64748b",
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Search ───────────────────────────────────────────────── */}
      <View className="mx-4 mt-3 flex-row items-center rounded-2xl bg-white border border-[#eef1f5] px-3.5">
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search reference or customer…"
          placeholderTextColor="#94a3b8"
          className="ml-2 flex-1 py-3 text-[14px] text-gray-900"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color="#cbd5e1" />
          </Pressable>
        )}
      </View>

      {rows.length > 0 && (
        <Text
          className="mx-5 mt-4 mb-1"
          style={{
            fontFamily: DISPLAY,
            fontSize: 10.5,
            letterSpacing: 1.2,
            color: "#94a3b8",
          }}
        >
          {totalCount} DOCUMENT{totalCount === 1 ? "" : "S"}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f6f7f9]" edges={["top"]}>
      {/* Top bar */}
      <View className="px-5 pt-3 pb-1 flex-row items-center justify-between">
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 bg-white border border-[#eef1f5] rounded-full items-center justify-center active:bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </Pressable>
        <Text style={{ fontFamily: BOLD, fontSize: 16, color: "#0f172a" }}>
          Invoices & Receipts
        </Text>
        <View className="w-10 h-10" />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          isPending ? (
            <View className="mx-4 mt-3 bg-white rounded-[22px] border border-[#eef1f5] p-12 items-center">
              <ActivityIndicator size="small" color="#0080ff" />
            </View>
          ) : (
            <View className="mx-4 mt-3 bg-white rounded-[22px] border border-[#eef1f5] px-6 py-12 items-center">
              <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-3">
                <Ionicons name="document-text-outline" size={24} color="#0080ff" />
              </View>
              <Text style={{ fontFamily: BOLD, fontSize: 15, color: "#0f172a" }}>
                {search || tab !== "all" ? "Nothing matches" : "No documents yet"}
              </Text>
              <Text className="mt-1.5 text-center text-[12.5px] leading-[18px] text-slate-500 max-w-[260px]">
                {search || tab !== "all"
                  ? "Try a different tab or clear the search."
                  : "Create an invoice or receipt from your products and send your customer the PDF."}
              </Text>
              {!search && tab === "all" && (
                <Pressable
                  onPress={goCreate}
                  className="mt-5 flex-row items-center gap-1.5 rounded-full bg-[#0080ff] px-5 py-3 active:opacity-90"
                >
                  <Ionicons name="add" size={15} color="#fff" />
                  <Text style={{ fontFamily: BOLD, fontSize: 13, color: "#fff" }}>
                    Create your first document
                  </Text>
                </Pressable>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <DocumentCard
            row={item}
            busy={busyId === item.id}
            onPdf={() => openPdf(item)}
            onReceipt={() => {
              setRecordToIncome(true);
              setReceiptFor(item);
            }}
            onIncome={() => addToIncome(item)}
            onDelete={() => remove(item)}
          />
        )}
      />

      {/* Generate-receipt modal */}
      <Modal
        visible={receiptFor != null}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptFor(null)}
      >
        <View className="flex-1 items-center justify-center bg-slate-900/50 px-6">
          <View className="w-full rounded-[28px] bg-white p-6">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <Ionicons name="receipt-outline" size={20} color="#059669" />
            </View>
            <Text
              className="mt-3.5"
              style={{ fontFamily: DISPLAY, fontSize: 17, color: "#0f172a" }}
            >
              Generate receipt for {receiptFor?.reference}
            </Text>
            <Text className="mt-1.5 text-[13px] leading-5 text-slate-500">
              This marks the invoice as paid and creates a receipt for{" "}
              {receiptFor ? (
                <Text style={{ ...TABULAR, fontFamily: BOLD, color: "#0f172a" }}>
                  ₦{receiptFor.amount.toLocaleString("en-US")}
                </Text>
              ) : null}{" "}
              from {receiptFor?.customerName}.
            </Text>

            <Pressable
              onPress={() => setRecordToIncome((v) => !v)}
              className={`mt-4 flex-row items-start gap-3 rounded-2xl border p-4 ${
                recordToIncome
                  ? "border-blue-300 bg-blue-50/70"
                  : "border-[#e7ebf0] bg-white"
              }`}
            >
              <View
                className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border-2 ${
                  recordToIncome
                    ? "border-[#0080ff] bg-[#0080ff]"
                    : "border-gray-300 bg-white"
                }`}
              >
                {recordToIncome && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: BOLD, fontSize: 13.5, color: "#0f172a" }}>
                  Add to my income
                </Text>
                <Text className="mt-0.5 text-[12px] leading-4 text-slate-500">
                  Records it as a paid order so it counts in your revenue,
                  reports and analytics.
                </Text>
              </View>
            </Pressable>

            <View className="mt-5 flex-row gap-2.5">
              <Pressable
                onPress={() => setReceiptFor(null)}
                className="flex-1 items-center rounded-2xl border border-[#e7ebf0] py-3.5 active:bg-gray-50"
              >
                <Text style={{ fontFamily: BOLD, fontSize: 13, color: "#475569" }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmReceipt}
                className="flex-1 items-center rounded-2xl bg-emerald-600 py-3.5 active:opacity-90"
              >
                <Text style={{ fontFamily: BOLD, fontSize: 13, color: "#fff" }}>
                  Generate receipt
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

// ── One document card ───────────────────────────────────────────────

function DocumentCard({
  row,
  busy,
  onPdf,
  onReceipt,
  onIncome,
  onDelete,
}: {
  row: InvoiceListItem;
  busy: boolean;
  onPdf: () => void;
  onReceipt: () => void;
  onIncome: () => void;
  onDelete: () => void;
}) {
  const isReceipt = row.kind === "receipt";
  const paid = isReceipt || row.status === "paid";

  return (
    <View
      className="mx-4 mt-3 rounded-[22px] bg-white p-4"
      style={{
        borderWidth: 1,
        borderColor: "#eef1f5",
        shadowColor: "#0f172a",
        shadowOpacity: 0.04,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`h-11 w-11 items-center justify-center rounded-2xl ${
            isReceipt ? "bg-emerald-50" : "bg-blue-50"
          }`}
        >
          <Ionicons
            name={isReceipt ? "receipt-outline" : "document-text-outline"}
            size={18}
            color={isReceipt ? "#059669" : "#0080ff"}
          />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text style={{ fontFamily: DISPLAY, fontSize: 14, color: "#0f172a" }}>
              {row.reference}
            </Text>
            <View
              className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${
                paid ? "bg-emerald-50" : "bg-amber-50"
              }`}
            >
              <View
                className={`w-1.5 h-1.5 rounded-full ${
                  paid ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <Text
                className={`text-[9px] font-extrabold uppercase ${
                  paid ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {isReceipt ? "Paid" : row.status === "pending" ? "Awaiting" : row.status}
              </Text>
            </View>
            {row.recordedToIncome && (
              <View className="rounded-full bg-blue-50 px-2 py-0.5">
                <Text className="text-[9px] font-extrabold uppercase text-blue-700">
                  In income
                </Text>
              </View>
            )}
          </View>
          <Text className="mt-0.5 text-[12px] text-slate-500" numberOfLines={1}>
            {row.customerName} · {row.itemCount} item{row.itemCount === 1 ? "" : "s"}
            {row.receiptReference ? ` · receipt ${row.receiptReference}` : ""}
          </Text>
        </View>
        <Money value={row.amount} size={15} />
      </View>

      {/* Divider before actions — visually separates the meta from the
          controls, the way a real document row would. */}
      <View className="h-px bg-[#f1f5f9] my-3.5" />

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onPdf}
          className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#0f172a] active:opacity-90"
        >
          <Ionicons name="download-outline" size={13} color="#fff" />
          <Text style={{ fontFamily: BOLD, fontSize: 12, color: "#fff" }}>PDF</Text>
        </Pressable>

        {!isReceipt && !row.receiptId && row.status !== "cancelled" && (
          <Pressable
            onPress={onReceipt}
            disabled={busy}
            className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 active:opacity-80"
          >
            <Ionicons name="receipt-outline" size={13} color="#047857" />
            <Text style={{ fontFamily: BOLD, fontSize: 12, color: "#047857" }}>
              Receipt
            </Text>
          </Pressable>
        )}

        {isReceipt && !row.recordedToIncome && (
          <Pressable
            onPress={onIncome}
            disabled={busy}
            className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 active:opacity-80"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#0080ff" />
            ) : (
              <>
                <Ionicons name="trending-up-outline" size={13} color="#0080ff" />
                <Text style={{ fontFamily: BOLD, fontSize: 12, color: "#1d4ed8" }}>
                  Add to income
                </Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={onDelete}
          disabled={busy}
          className="h-10 w-10 items-center justify-center rounded-xl bg-[#f8fafc] active:bg-gray-100"
        >
          {busy ? (
            <ActivityIndicator size="small" color="#94a3b8" />
          ) : (
            <Ionicons name="trash-outline" size={14} color="#94a3b8" />
          )}
        </Pressable>
      </View>
    </View>
  );
}
