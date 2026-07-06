import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
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
import { formatNaira } from "../lib/format";
import { AppToast, AppToastTone } from "../components/AppToast";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

/**
 * Expenses — money out, recorded in seconds. Summary strip (this month
 * vs last, top category), category chips, list, and a fast add/edit
 * modal. Pairs with reports: revenue − expenses = net profit.
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

  const topCategory = summary?.byCategoryThisMonth?.[0];

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
            <Text className="text-[20px] font-extrabold text-gray-900">Expenses</Text>
            <Text className="text-[12px] text-gray-500">
              Track money out, see real profit
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            haptic();
            setEditing(null);
            setEditorOpen(true);
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

      {/* Summary strip */}
      <View className="mx-5 mb-3 flex-row gap-2.5">
        <SummaryTile
          label="This month"
          value={formatNaira(summary?.totalThisMonth ?? 0)}
        />
        <SummaryTile
          label="Last month"
          value={formatNaira(summary?.totalLastMonth ?? 0)}
        />
        <SummaryTile
          label="Top category"
          value={topCategory ? expenseCategoryLabel(topCategory.category) : "—"}
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3 max-h-10 flex-grow-0"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
      >
        <Chip label="All" active={category === "all"} onPress={() => setCategory("all")} />
        {EXPENSE_CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            active={category === c.key}
            onPress={() => setCategory(c.key)}
          />
        ))}
      </ScrollView>

      {/* List */}
      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0080ff" />
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-amber-50">
            <Ionicons name="wallet-outline" size={26} color="#d97706" />
          </View>
          <Text className="mt-4 text-[16px] font-extrabold text-gray-900">
            {category !== "all" ? "Nothing in this category" : "No expenses yet"}
          </Text>
          <Text className="mt-1 text-center text-[13px] leading-5 text-gray-500">
            Record what you spend — stock, delivery, data, ads — and your
            reports will show true profit, not just revenue.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View
              className="mb-2.5 flex-row items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5"
              style={{
                shadowColor: "#0f172a",
                shadowOpacity: 0.04,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 1,
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
                <Ionicons name="wallet-outline" size={16} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-[13.5px] font-bold text-gray-900" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-[11.5px] text-gray-500">
                  {expenseCategoryLabel(item.category)} ·{" "}
                  {new Date(item.expenseDateUtc).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
              <Text className="text-[14px] font-extrabold text-gray-900">
                {formatNaira(item.amount)}
              </Text>
              <Pressable
                onPress={() => {
                  haptic();
                  setEditing(item);
                  setEditorOpen(true);
                }}
                className="h-8 w-8 items-center justify-center rounded-xl border border-gray-200"
              >
                <Ionicons name="pencil-outline" size={13} color="#64748b" />
              </Pressable>
              <Pressable
                onPress={() => remove(item)}
                disabled={busyId === item.id}
                className="h-8 w-8 items-center justify-center rounded-xl border border-gray-200"
              >
                {busyId === item.id ? (
                  <ActivityIndicator size="small" color="#94a3b8" />
                ) : (
                  <Ionicons name="trash-outline" size={13} color="#94a3b8" />
                )}
              </Pressable>
            </View>
          )}
        />
      )}

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

// ── Add / edit modal ────────────────────────────────────────────────

function ExpenseEditor({
  visible,
  expense,
  onClose,
  onSaved,
  onError,
}: {
  visible: boolean;
  expense: ExpenseItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
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
        <View className="rounded-t-3xl bg-white px-5 pb-10 pt-5">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[17px] font-extrabold text-gray-900">
              {expense ? "Edit expense" : "Record an expense"}
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-xl bg-gray-50"
            >
              <Ionicons name="close" size={16} color="#64748b" />
            </Pressable>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What did you spend on? *"
            placeholderTextColor="#94a3b8"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-900"
          />

          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {EXPENSE_CATEGORIES.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => {
                  haptic();
                  setCategoryKey(c.key);
                }}
                className={`rounded-full px-3 py-1.5 ${
                  categoryKey === c.key
                    ? "bg-slate-900"
                    : "border border-gray-200 bg-white"
                }`}
              >
                <Text
                  className={`text-[11.5px] font-bold ${
                    categoryKey === c.key ? "text-white" : "text-gray-600"
                  }`}
                >
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount (₦) *"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            className="mt-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-[14px] text-gray-900"
          />

          <Pressable
            onPress={save}
            disabled={saving}
            className="mt-5 flex-row items-center justify-center gap-2 rounded-2xl bg-[#0080ff] py-3.5"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
            <Text className="text-[14px] font-extrabold text-white">
              {expense ? "Save changes" : "Record expense"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Bits ────────────────────────────────────────────────────────────

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-gray-100 bg-white p-3">
      <Text className="text-[9.5px] font-extrabold uppercase tracking-wider text-gray-400">
        {label}
      </Text>
      <Text className="mt-1 text-[13.5px] font-extrabold text-gray-900" numberOfLines={1}>
        {value}
      </Text>
    </View>
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
      className={`rounded-full px-3.5 py-2 ${
        active ? "bg-slate-900" : "border border-gray-200 bg-white"
      }`}
    >
      <Text className={`text-[12px] font-bold ${active ? "text-white" : "text-gray-600"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
