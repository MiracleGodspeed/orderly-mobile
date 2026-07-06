import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { RootStackParamList } from "../navigation/types";
import {
  EXPENSE_CATEGORIES,
  createExpense,
  deleteExpense,
  expenseCategoryLabel,
  getExpenseSummary,
  getExpenses,
  updateExpense,
  type ExpenseItem,
} from "../api/vendor/invoice.api";
import { AppToast, AppToastTone } from "../components/AppToast";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

// Tabular figures make every amount line up column-perfect down the
// ledger — the single biggest tell of finance-grade typography.
const TABULAR: TextStyle = { fontVariant: ["tabular-nums"] };
const DISPLAY = "PlusJakartaSans_800ExtraBold";
const BOLD = "PlusJakartaSans_700Bold";

// Per-category icon + tint. Kept muted and consistent so the ledger
// reads calm, not like a box of crayons.
const CATEGORY_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; tint: string; color: string }
> = {
  stock: { icon: "cube-outline", tint: "#eff6ff", color: "#2563eb" },
  delivery: { icon: "bicycle-outline", tint: "#ecfdf5", color: "#059669" },
  marketing: { icon: "megaphone-outline", tint: "#f5f3ff", color: "#7c3aed" },
  packaging: { icon: "gift-outline", tint: "#fdf2f8", color: "#db2777" },
  rent: { icon: "home-outline", tint: "#fff7ed", color: "#c2410c" },
  utilities: { icon: "flash-outline", tint: "#fffbeb", color: "#d97706" },
  data_airtime: { icon: "wifi-outline", tint: "#ecfeff", color: "#0891b2" },
  salaries: { icon: "people-outline", tint: "#eef2ff", color: "#4338ca" },
  equipment: { icon: "construct-outline", tint: "#f8fafc", color: "#475569" },
  other: { icon: "ellipsis-horizontal", tint: "#f8fafc", color: "#64748b" },
};
const categoryMeta = (key: string) => CATEGORY_META[key] ?? CATEGORY_META.other;

const pctChange = (current: number, previous: number): number => {
  if (!isFinite(previous) || previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
};

// Renders ₦ amounts with the kobo dimmed and smaller — the whole-naira
// figure stays the hero, decimals recede. All digits tabular.
function Money({
  value,
  size,
  color = "#0f172a",
  weight = BOLD,
  decimalOpacity = 0.45,
}: {
  value: number | null | undefined;
  size: number;
  color?: string;
  weight?: string;
  decimalOpacity?: number;
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
      <Text style={{ fontSize: size * 0.62, opacity: decimalOpacity }}>
        .{frac}
      </Text>
    </Text>
  );
}

/**
 * Expenses — money out, recorded in seconds. Gradient hero, a "where it
 * went" breakdown, category filter, and a grouped ledger. Delete lives
 * inside the editor so the ledger stays clean. Pairs with reports:
 * revenue − expenses = net profit.
 */
export default function Expenses() {
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();

  const [category, setCategory] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  const { data: listData, isPending, refetch, isRefetching } = useQuery({
    queryKey: ["expenses", category],
    queryFn: () =>
      getExpenses({
        pageIndex: 1,
        pageSize: 60,
        category: category === "all" ? undefined : category,
      }),
  });
  const { data: summary } = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: getExpenseSummary,
  });

  const rows = listData?.data ?? [];
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["expenses-summary"] });
  };

  const remove = async (row: ExpenseItem) => {
    haptic();
    setBusyId(row.id);
    try {
      await deleteExpense(row.id);
      setToast({ title: "Expense deleted", tone: "success" });
      refresh();
    } catch {
      setToast({ title: "Couldn't delete it — try again", tone: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const totalThisMonth = summary?.totalThisMonth ?? 0;
  const totalLastMonth = summary?.totalLastMonth ?? 0;
  const delta = pctChange(totalThisMonth, totalLastMonth);
  // Spending DOWN is the good direction — invert the usual red/green.
  const spendingDown = delta <= 0;
  const breakdown = (summary?.byCategoryThisMonth ?? []).slice(0, 3);

  const openNew = () => {
    haptic();
    setEditing(null);
    setEditorOpen(true);
  };

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
          Expenses
        </Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#0080ff"
          />
        }
      >
        {/* ── Gradient hero ─────────────────────────────────────────── */}
        <View
          className="mx-4 mt-2"
          style={{
            borderRadius: 26,
            backgroundColor: "#0b0f18",
            shadowColor: "#0b1220",
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 14 },
            elevation: 10,
          }}
        >
          {/* Gradient is an absolute-fill BACKGROUND; the padded content
              View drives the card height so nothing ever clips. */}
          <View style={{ borderRadius: 26, overflow: "hidden" }}>
            <LinearGradient
              colors={["#1e2536", "#141a28", "#0b0f18"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ padding: 22 }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 10.5,
                  letterSpacing: 1.6,
                  color: "#fbbf7d",
                }}
              >
                MONEY OUT · THIS MONTH
              </Text>
              <View className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
                <Ionicons name="arrow-up-outline" size={15} color="#fcd34d" />
              </View>
            </View>

            <Money value={totalThisMonth} size={38} color="#ffffff" weight={DISPLAY} decimalOpacity={0.5} />

            <View className="flex-row items-center gap-2.5 mt-3.5">
              <View
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: spendingDown
                    ? "rgba(52,211,153,0.14)"
                    : "rgba(251,113,133,0.14)",
                }}
              >
                <Ionicons
                  name={delta <= 0 ? "trending-down" : "trending-up"}
                  size={12}
                  color={spendingDown ? "#34d399" : "#fb7185"}
                />
                <Text
                  style={{
                    ...TABULAR,
                    fontFamily: DISPLAY,
                    fontSize: 11,
                    color: spendingDown ? "#34d399" : "#fb7185",
                  }}
                >
                  {Math.abs(delta).toFixed(1)}%
                </Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12.5 }}>
                vs {"₦"}
                <Text style={TABULAR}>
                  {totalLastMonth.toLocaleString("en-US")}
                </Text>{" "}
                last month
              </Text>
            </View>
            </View>
          </View>
        </View>

        {/* ── Where it went — top categories with share bars ───────── */}
        {breakdown.length > 0 && totalThisMonth > 0 && (
          <View
            className="mx-4 mt-3 rounded-[22px] bg-white p-5"
            style={{
              borderWidth: 1,
              borderColor: "#eef1f5",
              shadowColor: "#0f172a",
              shadowOpacity: 0.03,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 },
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontFamily: DISPLAY,
                fontSize: 10.5,
                letterSpacing: 1.4,
                color: "#94a3b8",
              }}
            >
              WHERE IT WENT
            </Text>
            <View className="mt-4 gap-3.5">
              {breakdown.map((c) => {
                const meta = categoryMeta(c.category);
                const share = Math.max(
                  4,
                  Math.round((c.total / totalThisMonth) * 100)
                );
                return (
                  <View key={c.category}>
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="w-6 h-6 rounded-lg items-center justify-center"
                          style={{ backgroundColor: meta.tint }}
                        >
                          <Ionicons name={meta.icon} size={13} color={meta.color} />
                        </View>
                        <Text style={{ fontFamily: BOLD, fontSize: 13, color: "#0f172a" }}>
                          {expenseCategoryLabel(c.category)}
                        </Text>
                      </View>
                      <Money value={c.total} size={13} />
                    </View>
                    <View className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{ width: `${share}%`, backgroundColor: meta.color }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Category filter ──────────────────────────────────────── */}
        <View className="mt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            <Chip
              label="All"
              active={category === "all"}
              onPress={() => setCategory("all")}
            />
            {EXPENSE_CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                active={category === c.key}
                onPress={() => setCategory(c.key)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Ledger ───────────────────────────────────────────────── */}
        {isPending ? (
          <View className="mx-4 mt-4 bg-white rounded-[22px] border border-[#eef1f5] p-12 items-center">
            <ActivityIndicator size="small" color="#0080ff" />
          </View>
        ) : rows.length === 0 ? (
          <View className="mx-4 mt-4 bg-white rounded-[22px] border border-[#eef1f5] px-6 py-12 items-center">
            <View className="w-14 h-14 rounded-2xl bg-amber-50 items-center justify-center mb-3">
              <Ionicons name="wallet-outline" size={24} color="#d97706" />
            </View>
            <Text style={{ fontFamily: BOLD, fontSize: 15, color: "#0f172a" }}>
              {category !== "all" ? "Nothing in this category" : "No expenses yet"}
            </Text>
            <Text className="mt-1.5 text-center text-[12.5px] leading-[18px] text-slate-500 max-w-[260px]">
              Record what you spend — stock, delivery, data, ads — and your
              reports show true profit, not just revenue.
            </Text>
            <Pressable
              onPress={openNew}
              className="mt-5 flex-row items-center gap-1.5 rounded-full bg-[#0080ff] px-5 py-3 active:opacity-90"
            >
              <Ionicons name="add" size={15} color="#fff" />
              <Text style={{ fontFamily: BOLD, fontSize: 13, color: "#fff" }}>
                Record your first expense
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            className="mx-4 mt-4 bg-white rounded-[22px] overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: "#eef1f5",
              shadowColor: "#0f172a",
              shadowOpacity: 0.03,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 },
              elevation: 1,
            }}
          >
            {rows.map((item, i) => {
              const meta = categoryMeta(item.category);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    haptic();
                    setEditing(item);
                    setEditorOpen(true);
                  }}
                  className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-[#f8fafc] ${
                    i === rows.length - 1 ? "" : "border-b border-[#f1f5f9]"
                  }`}
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: meta.tint }}
                  >
                    <Ionicons name={meta.icon} size={17} color={meta.color} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      style={{ fontFamily: BOLD, fontSize: 13.5, color: "#0f172a" }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text className="text-[11.5px] text-slate-500 mt-0.5">
                      {expenseCategoryLabel(item.category)} ·{" "}
                      {new Date(item.expenseDateUtc).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </View>
                  <Money value={item.amount} size={14} />
                  <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating add button */}
      <Pressable
        onPress={openNew}
        accessibilityLabel="Record an expense"
        className="absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full bg-[#0080ff] active:opacity-90"
        style={{
          shadowColor: "#0080ff",
          shadowOpacity: 0.4,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <ExpenseEditor
        visible={editorOpen}
        expense={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={(msg) => {
          setEditorOpen(false);
          setToast({ title: msg, tone: "success" });
          refresh();
        }}
        onError={(msg) => setToast({ title: msg, tone: "error" })}
        onRequestDelete={(exp) => {
          setEditorOpen(false);
          remove(exp);
        }}
        deleting={busyId === editing?.id}
      />

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

// ── Add / edit sheet ────────────────────────────────────────────────

function ExpenseEditor({
  visible,
  expense,
  onClose,
  onSaved,
  onError,
  onRequestDelete,
  deleting,
}: {
  visible: boolean;
  expense: ExpenseItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
  onRequestDelete: (expense: ExpenseItem) => void;
  deleting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [categoryKey, setCategoryKey] = useState("stock");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);

  // Hydrate per open (modal keeps state otherwise).
  if (visible) {
    const key = expense?.id ?? "new";
    if (hydratedFor !== key) {
      setHydratedFor(key);
      setTitle(expense?.title ?? "");
      setCategoryKey(expense?.category ?? "stock");
      setAmount(expense ? String(expense.amount) : "");
    }
  } else if (hydratedFor !== null) {
    setHydratedFor(null);
  }

  const save = async () => {
    const amt = Number(amount);
    if (!title.trim()) return onError("Give the expense a title.");
    if (!Number.isFinite(amt) || amt <= 0)
      return onError("Enter an amount greater than zero.");
    setSaving(true);
    try {
      const payload = { title: title.trim(), category: categoryKey, amount: amt };
      if (expense) await updateExpense(expense.id, payload);
      else await createExpense(payload);
      onSaved(expense ? "Expense updated" : "Expense recorded");
    } catch {
      onError("Couldn't save the expense — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-900/50">
        <View className="rounded-t-[30px] bg-white px-5 pb-10 pt-3">
          <View className="self-center mb-5 h-1 w-10 rounded-full bg-gray-200" />

          <View className="mb-5 flex-row items-center justify-between">
            <Text style={{ fontFamily: DISPLAY, fontSize: 19, color: "#0f172a" }}>
              {expense ? "Edit expense" : "Record an expense"}
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-gray-50 active:bg-gray-100"
            >
              <Ionicons name="close" size={16} color="#64748b" />
            </Pressable>
          </View>

          <FieldLabel>What did you spend on?</FieldLabel>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Restock — hair bundles"
            placeholderTextColor="#94a3b8"
            className="rounded-2xl border border-[#e7ebf0] bg-[#f8fafc] px-4 py-3.5 text-[14px] text-gray-900"
          />

          <FieldLabel className="mt-4">Category</FieldLabel>
          <View className="flex-row flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.map((c) => {
              const active = categoryKey === c.key;
              const meta = categoryMeta(c.key);
              return (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    haptic();
                    setCategoryKey(c.key);
                  }}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 border ${
                    active ? "border-transparent" : "bg-white border-[#e7ebf0]"
                  }`}
                  style={active ? { backgroundColor: "#0f172a" } : undefined}
                >
                  <Ionicons
                    name={meta.icon}
                    size={12}
                    color={active ? "#fff" : meta.color}
                  />
                  <Text
                    style={{
                      fontFamily: BOLD,
                      fontSize: 11.5,
                      color: active ? "#fff" : "#475569",
                    }}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FieldLabel className="mt-4">Amount</FieldLabel>
          <View className="flex-row items-center rounded-2xl border border-[#e7ebf0] bg-[#f8fafc] px-4">
            <Text style={{ fontFamily: DISPLAY, fontSize: 18, color: "#94a3b8" }}>
              ₦
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              className="ml-2 flex-1 py-3.5 text-gray-900"
              style={{ ...TABULAR, fontFamily: DISPLAY, fontSize: 18 }}
            />
          </View>

          <Pressable
            onPress={save}
            disabled={saving}
            className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl bg-[#0080ff] py-4 active:opacity-90"
            style={{
              shadowColor: "#0080ff",
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
            <Text style={{ fontFamily: DISPLAY, fontSize: 14.5, color: "#fff" }}>
              {expense ? "Save changes" : "Record expense"}
            </Text>
          </Pressable>

          {expense && (
            <Pressable
              onPress={() => onRequestDelete(expense)}
              disabled={deleting}
              className="mt-2.5 flex-row items-center justify-center gap-1.5 py-3"
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
              )}
              <Text style={{ fontFamily: BOLD, fontSize: 13, color: "#ef4444" }}>
                Delete expense
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Bits ────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      className={`mb-1.5 ${className}`}
      style={{
        fontFamily: DISPLAY,
        fontSize: 10.5,
        letterSpacing: 1.2,
        color: "#94a3b8",
      }}
    >
      {String(children).toUpperCase()}
    </Text>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      className={`px-4 py-2 rounded-full border ${
        active ? "border-transparent" : "bg-white border-[#e7ebf0]"
      }`}
      style={active ? { backgroundColor: "#0f172a" } : undefined}
    >
      <Text
        style={{
          fontFamily: BOLD,
          fontSize: 12.5,
          color: active ? "#fff" : "#475569",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
