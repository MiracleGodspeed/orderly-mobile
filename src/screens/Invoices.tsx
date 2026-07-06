import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { RootStackParamList } from "../navigation/types";
import {
  deleteInvoiceDocument,
  generateReceipt,
  getInvoices,
  invoicePdfUrl,
  recordReceiptIncome,
  type InvoiceListItem,
} from "../api/vendor/invoice.api";
import { formatNaira } from "../lib/format";
import { AppToast, AppToastTone } from "../components/AppToast";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = "all" | "invoice" | "receipt";

const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

/**
 * Invoices & Receipts — the vendor's paperwork desk on mobile. List with
 * kind tabs + search, per-document actions (PDF, generate receipt with a
 * "record to income?" ask, add-to-income for receipts, delete), and the
 * big Create button that leads to the CreateInvoice flow.
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

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["invoices"] });
  };

  const openPdf = async (row: InvoiceListItem) => {
    haptic();
    try {
      await WebBrowser.openBrowserAsync(invoicePdfUrl(row.id));
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

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="h-10 w-10 items-center justify-center rounded-2xl bg-white border border-gray-100"
          >
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
          </Pressable>
          <View>
            <Text className="text-[20px] font-extrabold text-gray-900">
              Invoices & Receipts
            </Text>
            <Text className="text-[12px] text-gray-500">
              Create and download invoices & receipts
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            haptic();
            navigation.navigate("CreateInvoice");
          }}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-[#0080ff]"
          style={{
            shadowColor: "#0080ff",
            shadowOpacity: 0.35,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="mx-5 mb-3 flex-row rounded-2xl bg-white border border-gray-100 p-1">
        {(
          [
            { key: "all", label: "All" },
            { key: "invoice", label: "Invoices" },
            { key: "receipt", label: "Receipts" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => {
              haptic();
              setTab(t.key);
            }}
            className={`flex-1 items-center rounded-xl py-2 ${
              tab === t.key ? "bg-slate-900" : ""
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${
                tab === t.key ? "text-white" : "text-gray-600"
              }`}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View className="mx-5 mb-3 flex-row items-center rounded-2xl bg-white border border-gray-100 px-3.5">
        <Ionicons name="search" size={16} color="#94a3b8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search reference or customer…"
          placeholderTextColor="#94a3b8"
          className="ml-2 flex-1 py-3 text-[14px] text-gray-900"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#cbd5e1" />
          </Pressable>
        )}
      </View>

      {/* List */}
      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0080ff" />
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-blue-50">
            <Ionicons name="document-text-outline" size={26} color="#0080ff" />
          </View>
          <Text className="mt-4 text-[16px] font-extrabold text-gray-900">
            {search || tab !== "all" ? "Nothing matches" : "No documents yet"}
          </Text>
          <Text className="mt-1 text-center text-[13px] leading-5 text-gray-500">
            {search || tab !== "all"
              ? "Try a different tab or clear the search."
              : "Create an invoice or receipt from your products and send your customer the PDF."}
          </Text>
          {!search && tab === "all" && (
            <Pressable
              onPress={() => navigation.navigate("CreateInvoice")}
              className="mt-5 rounded-2xl bg-[#0080ff] px-6 py-3"
            >
              <Text className="text-[13px] font-bold text-white">
                Create your first document
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
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
      )}

      {/* Generate-receipt modal */}
      <Modal
        visible={receiptFor != null}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptFor(null)}
      >
        <View className="flex-1 items-center justify-center bg-slate-900/50 px-6">
          <View className="w-full rounded-3xl bg-white p-6">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <Ionicons name="receipt-outline" size={20} color="#059669" />
            </View>
            <Text className="mt-3 text-[16px] font-extrabold text-gray-900">
              Generate receipt for {receiptFor?.reference}
            </Text>
            <Text className="mt-1 text-[13px] leading-5 text-gray-500">
              This marks the invoice as paid and creates a receipt for{" "}
              {receiptFor ? formatNaira(receiptFor.amount) : ""} from{" "}
              {receiptFor?.customerName}.
            </Text>

            <Pressable
              onPress={() => setRecordToIncome((v) => !v)}
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
                {recordToIncome && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[13.5px] font-bold text-gray-900">
                  Add to my income
                </Text>
                <Text className="mt-0.5 text-[12px] leading-4 text-gray-500">
                  Records it as a paid order so it counts in your revenue,
                  reports and analytics.
                </Text>
              </View>
            </Pressable>

            <View className="mt-5 flex-row gap-2">
              <Pressable
                onPress={() => setReceiptFor(null)}
                className="flex-1 items-center rounded-2xl border border-gray-200 py-3"
              >
                <Text className="text-[13px] font-bold text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmReceipt}
                className="flex-1 items-center rounded-2xl bg-emerald-600 py-3"
              >
                <Text className="text-[13px] font-bold text-white">
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
      className="mb-3 rounded-3xl border border-gray-100 bg-white p-4"
      style={{
        shadowColor: "#0f172a",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
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
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text className="text-[14px] font-extrabold text-gray-900">
              {row.reference}
            </Text>
            <View
              className={`rounded-full px-2 py-0.5 ${
                paid ? "bg-emerald-50" : "bg-amber-50"
              }`}
            >
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
          <Text className="mt-0.5 text-[12px] text-gray-500" numberOfLines={1}>
            {row.customerName} · {row.itemCount} item{row.itemCount === 1 ? "" : "s"}
            {row.receiptReference ? ` · receipt ${row.receiptReference}` : ""}
          </Text>
        </View>
        <Text className="text-[15px] font-extrabold text-gray-900">
          {formatNaira(row.amount)}
        </Text>
      </View>

      {/* Actions */}
      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          onPress={onPdf}
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5"
        >
          <Ionicons name="download-outline" size={13} color="#fff" />
          <Text className="text-[12px] font-bold text-white">PDF</Text>
        </Pressable>

        {!isReceipt && !row.receiptId && row.status !== "cancelled" && (
          <Pressable
            onPress={onReceipt}
            disabled={busy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5"
          >
            <Ionicons name="receipt-outline" size={13} color="#047857" />
            <Text className="text-[12px] font-bold text-emerald-700">Receipt</Text>
          </Pressable>
        )}

        {isReceipt && !row.recordedToIncome && (
          <Pressable
            onPress={onIncome}
            disabled={busy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2.5"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#0080ff" />
            ) : (
              <>
                <Ionicons name="trending-up-outline" size={13} color="#0080ff" />
                <Text className="text-[12px] font-bold text-blue-700">
                  Add to income
                </Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={onDelete}
          disabled={busy}
          className="h-9 w-9 items-center justify-center rounded-xl border border-gray-200"
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
