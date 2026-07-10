import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
  Switch,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { useVendor } from "../../context/VendorContext";
import { ScreenHeader } from "../components/ScreenHeader";
import { AppToast, AppToastTone } from "../components/AppToast";
import { getProducts, saveWholesaleRules } from "../api/vendor/vendor.api";
import type { Product } from "../api/vendor/vendor.types";
import {
  MAX_WHOLESALE_PERCENT,
  blankRule,
  validateRules,
  conditionSummary,
  formatNaira,
  CONDITION_LABEL,
  type WholesaleRule,
  type WholesaleCondition,
  type WholesaleConditionType,
} from "../lib/wholesale";

const PRIMARY = "#2563eb";
const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

interface ProductOption {
  id: string;
  title: string;
}

const CONDITION_TYPES: WholesaleConditionType[] = [
  "minCartAmount",
  "minTotalQty",
  "minProductQty",
];

export default function WholesalePricing() {
  const { storeData, fetchVendorData } = useVendor();

  const [rules, setRules] = useState<WholesaleRule[]>(
    storeData?.wholesaleRules ?? [],
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [editing, setEditing] = useState<WholesaleRule | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    subtitle?: string;
    tone?: AppToastTone;
  } | null>(null);

  // Keep local list in sync if the store data refreshes underneath us
  // and we have no unsaved edits.
  useEffect(() => {
    if (!dirty) setRules(storeData?.wholesaleRules ?? []);
  }, [storeData?.wholesaleRules, dirty]);

  useEffect(() => {
    let alive = true;
    getProducts({ pageSize: 500 })
      .then((res) => {
        if (!alive) return;
        setProducts(
          (res.data ?? []).map((p: Product) => ({ id: p.id, title: p.title })),
        );
      })
      .catch(() => {
        /* picker just stays empty — non-fatal */
      });
    return () => {
      alive = false;
    };
  }, []);

  const productById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(p.id, p.title);
    return m;
  }, [products]);

  const openNew = () => {
    haptic();
    setEditing(blankRule());
    setIsNew(true);
  };
  const openEdit = (rule: WholesaleRule) => {
    haptic();
    setEditing(JSON.parse(JSON.stringify(rule)));
    setIsNew(false);
  };

  const commitDraft = (draft: WholesaleRule) => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === draft.id);
      if (idx === -1) return [...prev, draft];
      const next = [...prev];
      next[idx] = draft;
      return next;
    });
    setDirty(true);
    setEditing(null);
  };

  const toggleEnabled = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    );
    setDirty(true);
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setDirty(true);
  };

  const persist = async () => {
    const err = validateRules(rules);
    if (err) {
      setToast({ title: "Check your policies", subtitle: err, tone: "error" });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveWholesaleRules(rules);
      setRules(saved);
      setDirty(false);
      await fetchVendorData();
      setToast({ title: "Wholesale pricing saved", tone: "success" });
    } catch (e: any) {
      setToast({
        title: "Couldn't save",
        subtitle: e?.message ?? "Please try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AppToast
        visible={toast != null}
        title={toast?.title ?? ""}
        subtitle={toast?.subtitle}
        tone={toast?.tone}
        onHide={() => setToast(null)}
      />
      <ScreenHeader title="Wholesale Pricing" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View className="rounded-3xl bg-white border border-gray-100 p-5 mb-4">
          <View className="flex-row items-center gap-2 mb-1.5">
            <View className="w-9 h-9 rounded-2xl bg-blue-50 items-center justify-center">
              <Ionicons name="layers-outline" size={18} color={PRIMARY} />
            </View>
            <Text className="text-base font-extrabold text-gray-900">
              Reward bulk buyers
            </Text>
          </View>
          <Text className="text-[13px] text-gray-500 leading-5">
            Set conditions — like a minimum cart value or quantity — and the
            discount applies itself at checkout. When a cart qualifies for more
            than one policy, the best discount wins.
          </Text>
        </View>

        {rules.length === 0 ? (
          <EmptyState onAdd={openNew} />
        ) : (
          <>
            {rules.map((rule) => (
              <PolicyCard
                key={rule.id}
                rule={rule}
                productById={productById}
                onEdit={() => openEdit(rule)}
                onToggle={() => toggleEnabled(rule.id)}
                onDelete={() => removeRule(rule.id)}
              />
            ))}

            <Pressable
              onPress={openNew}
              className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3.5 mt-1"
            >
              <Ionicons name="add" size={18} color="#6b7280" />
              <Text className="text-sm font-bold text-gray-500">
                Add another policy
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Sticky save bar */}
      {dirty && (
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-white/95 border-t border-gray-100">
          <Pressable
            onPress={persist}
            disabled={saving}
            className="h-12 rounded-2xl items-center justify-center flex-row gap-2"
            style={{ backgroundColor: saving ? "#93b4f7" : PRIMARY }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white text-sm font-bold">Save changes</Text>
            )}
          </Pressable>
        </View>
      )}

      {editing && (
        <PolicyEditorModal
          key={editing.id}
          initial={editing}
          isNew={isNew}
          products={products}
          onCancel={() => setEditing(null)}
          onSave={commitDraft}
        />
      )}
    </View>
  );
}

// ── Policy card ──────────────────────────────────────────────────

function PolicyCard({
  rule,
  productById,
  onEdit,
  onToggle,
  onDelete,
}: {
  rule: WholesaleRule;
  productById: Map<string, string>;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const badge =
    rule.discountType === "percent"
      ? `${rule.discountValue}% off`
      : `${formatNaira(rule.discountValue)} off`;
  return (
    <View
      className={`rounded-2xl border p-4 mb-3 ${
        rule.enabled ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50"
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              className={`text-sm font-extrabold ${
                rule.enabled ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {rule.name || "Untitled policy"}
            </Text>
            <View
              className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${
                rule.enabled ? "bg-emerald-50" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name={rule.discountType === "percent" ? "pricetag" : "cash-outline"}
                size={11}
                color={rule.enabled ? "#059669" : "#9ca3af"}
              />
              <Text
                className={`text-[11px] font-bold ${
                  rule.enabled ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                {badge}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-1.5 mt-2.5">
            {rule.conditions.map((c, i) => (
              <View
                key={i}
                className="flex-row items-center bg-gray-100 px-2 py-1 rounded-lg"
              >
                <Text className="text-[11px] font-medium text-gray-600">
                  {conditionSummary(
                    c,
                    c.productId ? productById.get(c.productId) : undefined,
                  )}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="flex-row items-center">
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <Ionicons name="pencil" size={16} color="#6b7280" />
          </Pressable>
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            className="w-8 h-8 rounded-full items-center justify-center"
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
          Requires all conditions
        </Text>
        <Switch
          value={rule.enabled}
          onValueChange={onToggle}
          trackColor={{ false: "#e5e7eb", true: "#34d399" }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );
}

// ── Editor modal ─────────────────────────────────────────────────

function PolicyEditorModal({
  initial,
  isNew,
  products,
  onCancel,
  onSave,
}: {
  initial: WholesaleRule;
  isNew: boolean;
  products: ProductOption[];
  onCancel: () => void;
  onSave: (rule: WholesaleRule) => void;
}) {
  const [draft, setDraft] = useState<WholesaleRule>(initial);
  const [error, setError] = useState<string | null>(null);
  const [productPickerFor, setProductPickerFor] = useState<number | null>(null);

  const set = (patch: Partial<WholesaleRule>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const usedTypes = new Set(draft.conditions.map((c) => c.type));
  const canAdd = usedTypes.size < CONDITION_TYPES.length;

  const addCondition = () => {
    const next = CONDITION_TYPES.find((t) => !usedTypes.has(t));
    if (!next) return;
    const value = next === "minCartAmount" ? 30000 : 5;
    set({ conditions: [...draft.conditions, { type: next, value }] });
  };

  const updateCondition = (idx: number, patch: Partial<WholesaleCondition>) =>
    set({
      conditions: draft.conditions.map((c, i) =>
        i === idx ? { ...c, ...patch } : c,
      ),
    });

  const removeCondition = (idx: number) =>
    set({ conditions: draft.conditions.filter((_, i) => i !== idx) });

  const cycleType = (idx: number) => {
    // Rotate to the next unused condition type (keeps a policy from
    // holding two of the same lever). Cheap alternative to a picker.
    const current = draft.conditions[idx].type;
    const available = CONDITION_TYPES.filter(
      (t) => t === current || !usedTypes.has(t),
    );
    const pos = available.indexOf(current);
    const next = available[(pos + 1) % available.length];
    if (next === current) return;
    const value = next === "minCartAmount" ? 30000 : 5;
    updateCondition(idx, { type: next, value, productId: undefined });
  };

  const example = useMemo(() => buildExample(draft), [draft]);

  const handleSave = () => {
    const err = validateRules([draft]);
    if (err) {
      setError(err);
      return;
    }
    onSave({ ...draft, name: draft.name.trim() });
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-gray-50 rounded-t-3xl max-h-[92%] overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
                <Ionicons name="layers-outline" size={16} color={PRIMARY} />
              </View>
              <Text className="text-base font-extrabold text-gray-900">
                {isNew ? "New policy" : "Edit policy"}
              </Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text className="text-xs font-bold text-gray-700 mb-1.5">
              Policy name
            </Text>
            <TextInput
              value={draft.name}
              onChangeText={(t) => set({ name: t })}
              placeholder="e.g. Bulk buyers"
              maxLength={60}
              placeholderTextColor="#9ca3af"
              className="h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900"
            />
            <Text className="text-[11px] text-gray-400 mt-1">
              Shown to customers on the discount line at checkout.
            </Text>

            {/* Discount */}
            <Text className="text-xs font-bold text-gray-700 mb-1.5 mt-5">
              Discount
            </Text>
            <View className="flex-row gap-2">
              <DiscountTypeTile
                active={draft.discountType === "percent"}
                icon="pricetag-outline"
                label="Percentage"
                onPress={() => set({ discountType: "percent" })}
              />
              <DiscountTypeTile
                active={draft.discountType === "flat"}
                icon="cash-outline"
                label="Flat amount"
                onPress={() => set({ discountType: "flat" })}
              />
            </View>
            <View className="flex-row items-center mt-2 h-11 rounded-xl border border-gray-200 bg-white px-3.5">
              <Text className="text-sm font-bold text-gray-400 mr-2">
                {draft.discountType === "percent" ? "%" : "₦"}
              </Text>
              <TextInput
                value={
                  Number.isFinite(draft.discountValue)
                    ? String(draft.discountValue)
                    : ""
                }
                onChangeText={(t) => set({ discountValue: Number(t) || 0 })}
                keyboardType="numeric"
                className="flex-1 text-sm text-gray-900"
              />
            </View>
            {draft.discountType === "percent" && (
              <Text className="text-[11px] text-gray-400 mt-1">
                Up to {MAX_WHOLESALE_PERCENT}%.
              </Text>
            )}

            {/* Conditions */}
            <View className="flex-row items-center justify-between mb-1.5 mt-5">
              <Text className="text-xs font-bold text-gray-700">Conditions</Text>
              <Text className="text-[11px] text-gray-400">All must be met</Text>
            </View>

            {draft.conditions.map((c, idx) => (
              <ConditionRow
                key={idx}
                condition={c}
                productName={
                  c.productId
                    ? products.find((p) => p.id === c.productId)?.title
                    : undefined
                }
                canRemove={draft.conditions.length > 1}
                onCycleType={() => cycleType(idx)}
                onChangeValue={(v) => updateCondition(idx, { value: v })}
                onPickProduct={() => setProductPickerFor(idx)}
                onRemove={() => removeCondition(idx)}
              />
            ))}

            {canAdd && (
              <Pressable
                onPress={addCondition}
                className="flex-row items-center gap-1.5 mt-1"
              >
                <Ionicons name="add" size={16} color={PRIMARY} />
                <Text className="text-xs font-bold" style={{ color: PRIMARY }}>
                  Add condition
                </Text>
              </Pressable>
            )}

            {/* Example */}
            <View className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 mt-5">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Ionicons name="sparkles-outline" size={12} color="#059669" />
                <Text className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                  Example
                </Text>
              </View>
              <Text className="text-[13px] text-gray-700 leading-5">
                {example}
              </Text>
            </View>

            {error && (
              <View className="flex-row items-start gap-2 mt-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <Ionicons name="alert-circle" size={14} color="#e11d48" />
                <Text className="text-xs text-rose-700 flex-1">{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View className="flex-row gap-3 p-4 bg-white border-t border-gray-100">
            <Pressable
              onPress={onCancel}
              className="flex-1 h-11 rounded-xl border border-gray-200 items-center justify-center"
            >
              <Text className="text-sm font-bold text-gray-700">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              className="flex-1 h-11 rounded-xl items-center justify-center"
              style={{ backgroundColor: PRIMARY }}
            >
              <Text className="text-sm font-bold text-white">
                {isNew ? "Add policy" : "Save policy"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Product picker */}
      {productPickerFor !== null && (
        <ProductPickerModal
          products={products}
          selectedId={draft.conditions[productPickerFor]?.productId ?? null}
          onClose={() => setProductPickerFor(null)}
          onSelect={(id) => {
            updateCondition(productPickerFor, { productId: id });
            setProductPickerFor(null);
          }}
        />
      )}
    </Modal>
  );
}

function ConditionRow({
  condition,
  productName,
  canRemove,
  onCycleType,
  onChangeValue,
  onPickProduct,
  onRemove,
}: {
  condition: WholesaleCondition;
  productName?: string;
  canRemove: boolean;
  onCycleType: () => void;
  onChangeValue: (v: number) => void;
  onPickProduct: () => void;
  onRemove: () => void;
}) {
  const isNaira = condition.type === "minCartAmount";
  return (
    <View className="rounded-xl border border-gray-200 bg-white p-3 mb-2">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onCycleType}
          className="flex-row items-center gap-1.5 flex-1"
        >
          <Text className="text-xs font-bold text-gray-800">
            {CONDITION_LABEL[condition.type]}
          </Text>
          <Ionicons name="swap-horizontal" size={14} color="#9ca3af" />
        </Pressable>
        {canRemove && (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Ionicons name="close" size={16} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {condition.type === "minProductQty" && (
        <Pressable
          onPress={onPickProduct}
          className="flex-row items-center justify-between h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 mt-2.5"
        >
          <Text
            className={`text-xs ${productName ? "text-gray-800" : "text-gray-400"}`}
            numberOfLines={1}
          >
            {productName ?? "Select a product…"}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#9ca3af" />
        </Pressable>
      )}

      <View className="flex-row items-center h-9 rounded-lg border border-gray-200 bg-gray-50 px-2.5 mt-2.5">
        <Text className="text-xs font-bold text-gray-400 mr-2">
          {isNaira ? "₦" : "≥"}
        </Text>
        <TextInput
          value={Number.isFinite(condition.value) ? String(condition.value) : ""}
          onChangeText={(t) => onChangeValue(Number(t) || 0)}
          keyboardType="numeric"
          placeholder={isNaira ? "30000" : "5"}
          placeholderTextColor="#9ca3af"
          className="flex-1 text-xs text-gray-900"
        />
        {!isNaira && (
          <Text className="text-[11px] text-gray-400">items</Text>
        )}
      </View>
    </View>
  );
}

function DiscountTypeTile({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-2 h-11 rounded-xl border-2 ${
        active ? "bg-blue-50" : "bg-white border-gray-200"
      }`}
      style={active ? { borderColor: PRIMARY } : undefined}
    >
      <Ionicons name={icon} size={16} color={active ? PRIMARY : "#6b7280"} />
      <Text
        className="text-sm font-bold"
        style={{ color: active ? PRIMARY : "#4b5563" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProductPickerModal({
  products,
  selectedId,
  onClose,
  onSelect,
}: {
  products: ProductOption[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.title.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[80%] overflow-hidden">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <Text className="text-base font-extrabold text-gray-900">
              Select a product
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </Pressable>
          </View>
          <View className="px-5 py-3">
            <View className="flex-row items-center h-10 rounded-xl border border-gray-200 bg-gray-50 px-3">
              <Ionicons name="search" size={16} color="#9ca3af" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search products…"
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-2 text-sm text-gray-900"
              />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {filtered.length === 0 ? (
              <Text className="text-center text-sm text-gray-400 py-10">
                No products found.
              </Text>
            ) : (
              filtered.map((p) => {
                const active = p.id === selectedId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => onSelect(p.id)}
                    className="flex-row items-center justify-between px-5 py-3.5 border-b border-gray-50"
                  >
                    <Text
                      className={`text-sm flex-1 pr-3 ${
                        active ? "font-bold text-gray-900" : "text-gray-700"
                      }`}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
                    )}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View className="rounded-3xl border border-gray-100 bg-white p-8 items-center">
      <View className="w-14 h-14 rounded-2xl bg-blue-50 items-center justify-center mb-4">
        <Ionicons name="layers-outline" size={26} color={PRIMARY} />
      </View>
      <Text className="text-lg font-extrabold text-gray-900 text-center">
        No wholesale policies yet
      </Text>
      <Text className="text-sm text-gray-500 text-center mt-1.5 leading-5">
        Create your first policy to give bulk buyers an automatic discount — the
        moment their cart qualifies, the saving applies itself.
      </Text>
      <Pressable
        onPress={onAdd}
        className="flex-row items-center gap-2 rounded-full px-5 py-2.5 mt-5"
        style={{ backgroundColor: PRIMARY }}
      >
        <Ionicons name="add" size={16} color="#fff" />
        <Text className="text-sm font-bold text-white">Create a policy</Text>
      </Pressable>
    </View>
  );
}

// ── Example copy ─────────────────────────────────────────────────

function buildExample(rule: WholesaleRule): string {
  const parts = rule.conditions.map((c) => {
    if (c.type === "minCartAmount") return `spends ${formatNaira(c.value || 0)}`;
    if (c.type === "minTotalQty") return `buys ${c.value || 0}+ items`;
    return `buys ${c.value || 0}+ of the chosen product`;
  });
  const condText =
    parts.length === 0
      ? "a customer checks out"
      : parts.length === 1
        ? `a customer ${parts[0]}`
        : `a customer ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;

  const sample = 50000;
  if (rule.discountType === "percent") {
    const pct = Math.min(rule.discountValue || 0, MAX_WHOLESALE_PERCENT);
    const pay = Math.round(sample * (1 - pct / 100));
    return `When ${condText}, they get ${pct}% off. On a ${formatNaira(
      sample,
    )} cart, they'd pay ${formatNaira(pay)}.`;
  }
  const flat = rule.discountValue || 0;
  const pay = Math.max(0, sample - flat);
  return `When ${condText}, they get ${formatNaira(
    flat,
  )} off. On a ${formatNaira(sample)} cart, they'd pay ${formatNaira(pay)}.`;
}
