import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useState, useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useVendor } from "../../context/VendorContext";
import { BottomSheet } from "./BottomSheet";

/**
 * Local sticky-footer wrapper. We can't use the shared
 * `<BottomSheetFooter />` here because it bakes in a Cancel + Save
 * button layout, and these screens have varied footers (a single
 * "Add review" button on the list, a Cancel+Save pair on the form).
 */
function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </View>
  );
}

/**
 * Customer reviews / testimonials editor — replaces the four
 * hard-coded testimonials on the Grace template's `testimonialsBlock`
 * with vendor-authored quotes. Up to 12 reviews; each has a headline,
 * body, customer name, and 1–5 star rating.
 *
 * UX: two modes inside the same bottom sheet — a list of existing
 * reviews with edit/delete actions, and an inline form for add/edit.
 * Saving from the form persists the entire array via
 * `updateVendorSettings({ storeFrontJson })`; no per-row API calls.
 */

const MAX = 12;

export interface Testimonial {
  id: string;
  headline: string;
  body: string;
  customerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  photoUrl?: string | null;
}

interface Draft {
  id: string;
  headline: string;
  body: string;
  customerName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  photoUrl: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

const haptic = () => {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => {});
};

function newDraft(): Draft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    headline: "",
    body: "",
    customerName: "",
    rating: 5,
    photoUrl: "",
  };
}

export default function CustomerReviewsModal({ visible, onClose }: Props) {
  const { storeData, updateVendorSettings } = useVendor();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const initial: Testimonial[] =
      (storeData as any)?.storeFrontJson?.testimonials ?? [];
    setItems(initial);
    setEditing(null);
    setEditingIndex(null);
  }, [visible, storeData]);

  const persist = async (next: Testimonial[]) => {
    if (!storeData) return;
    setSaving(true);
    try {
      const merged = {
        ...(storeData as any).storeFrontJson,
        testimonials: next,
      };
      await updateVendorSettings({ storeFrontJson: merged });
      setItems(next);
    } catch (e) {
      Alert.alert("Couldn't save", "Please try again.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    haptic();
    if (items.length >= MAX) {
      Alert.alert("Limit reached", `You can have up to ${MAX} reviews.`);
      return;
    }
    setEditing(newDraft());
    setEditingIndex(null);
  };

  const openEdit = (i: number) => {
    haptic();
    const t = items[i];
    setEditing({
      id: t.id,
      headline: t.headline,
      body: t.body,
      customerName: t.customerName,
      rating: t.rating,
      photoUrl: t.photoUrl ?? "",
    });
    setEditingIndex(i);
  };

  const handleDelete = (i: number) => {
    Alert.alert("Remove this review?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const next = items.filter((_, idx) => idx !== i);
          persist(next);
        },
      },
    ]);
  };

  const handleSaveDraft = async () => {
    if (!editing) return;
    const headline = editing.headline.trim();
    const body = editing.body.trim();
    const customerName = editing.customerName.trim();
    if (!headline || !body || !customerName) {
      Alert.alert(
        "Missing details",
        "Headline, review body, and customer name are required.",
      );
      return;
    }
    const ready: Testimonial = {
      id: editing.id,
      headline,
      body,
      customerName,
      rating: editing.rating,
      photoUrl: editing.photoUrl.trim() || null,
    };
    const next = [...items];
    if (editingIndex != null) next[editingIndex] = ready;
    else next.push(ready);
    await persist(next);
    setEditing(null);
    setEditingIndex(null);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Customer reviews"
      subtitle={
        editing
          ? editingIndex != null
            ? "Edit review"
            : "Add a new review"
          : `${items.length} of ${MAX} reviews`
      }
      height="92%"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {editing ? (
          <ReviewForm
            draft={editing}
            saving={saving}
            onChange={setEditing}
            onCancel={() => {
              setEditing(null);
              setEditingIndex(null);
            }}
            onSave={handleSaveDraft}
          />
        ) : (
          <ReviewList
            items={items}
            saving={saving}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

/* ──────────────────────────── List view ──────────────────────────── */

function ReviewList({
  items,
  saving,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: Testimonial[];
  saving: boolean;
  onAdd: () => void;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View className="items-center py-12">
            <View className="w-16 h-16 rounded-2xl bg-blue-50 items-center justify-center mb-4">
              <Ionicons name="chatbubble-ellipses" size={26} color="#2563eb" />
            </View>
            <Text
              className="text-[15px] text-gray-900 mb-1"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              No reviews yet
            </Text>
            <Text className="text-[12.5px] text-gray-500 text-center max-w-[280px] leading-[18px]">
              Add quotes from happy customers. They&apos;ll appear in the
              Customer Reviews block on your storefront.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {items.map((t, i) => (
              <View
                key={t.id}
                className="bg-white rounded-2xl border border-gray-100 p-4"
                style={{
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-start gap-3">
                  <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center">
                    <Text
                      className="text-blue-700 text-[13px]"
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      {(t.customerName || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text
                        className="text-[13.5px] text-gray-900 flex-1"
                        numberOfLines={1}
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        {t.headline}
                      </Text>
                      <Stars value={t.rating} />
                    </View>
                    <Text
                      className="text-[12px] text-gray-600 leading-[17px]"
                      numberOfLines={2}
                    >
                      {t.body}
                    </Text>
                    <Text className="text-[11px] text-gray-500 mt-1.5 font-bold">
                      — {t.customerName}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-50">
                  <Pressable
                    onPress={() => onEdit(i)}
                    className="flex-1 flex-row items-center justify-center gap-1.5 h-9 rounded-xl bg-gray-50 active:bg-gray-100"
                  >
                    <Ionicons name="pencil-outline" size={14} color="#374151" />
                    <Text className="text-[12.5px] font-bold text-gray-700">
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(i)}
                    className="w-11 h-9 rounded-xl bg-rose-50 items-center justify-center active:bg-rose-100"
                  >
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <SheetFooter>
        <Pressable
          onPress={onAdd}
          disabled={saving || items.length >= MAX}
          className={`h-12 rounded-2xl items-center justify-center flex-row gap-2 ${
            items.length >= MAX || saving ? "bg-gray-200" : "bg-blue-600"
          }`}
          style={
            items.length < MAX
              ? {
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }
              : undefined
          }
        >
          <Ionicons name="add" size={16} color="white" />
          <Text
            className="text-white text-[14.5px]"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Add review
          </Text>
        </Pressable>
      </SheetFooter>
    </>
  );
}

/* ──────────────────────────── Form view ──────────────────────────── */

function ReviewForm({
  draft,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Draft;
  saving: boolean;
  onChange: (next: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Headline">
          <TextInput
            value={draft.headline}
            onChangeText={(v) => onChange({ ...draft, headline: v })}
            placeholder="Alukas is my favourite store"
            placeholderTextColor="#9CA3AF"
            maxLength={80}
            className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[14.5px] text-gray-900"
          />
        </Field>

        <Field label="Review body">
          <TextInput
            value={draft.body}
            onChangeText={(v) => onChange({ ...draft, body: v })}
            placeholder="What the customer said about your store"
            placeholderTextColor="#9CA3AF"
            maxLength={280}
            multiline
            textAlignVertical="top"
            className="min-h-[110px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-[14.5px] text-gray-900"
          />
          <Text className="text-[11px] text-gray-400 text-right mt-1">
            {draft.body.length} / 280
          </Text>
        </Field>

        <Field label="Customer name">
          <TextInput
            value={draft.customerName}
            onChangeText={(v) => onChange({ ...draft, customerName: v })}
            placeholder="Niamh Oxley"
            placeholderTextColor="#9CA3AF"
            maxLength={60}
            className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[14.5px] text-gray-900"
          />
        </Field>

        <Field label="Rating">
          <RatingPicker
            value={draft.rating}
            onChange={(v) => onChange({ ...draft, rating: v })}
          />
        </Field>

        <Field label="Photo URL (optional)">
          <TextInput
            value={draft.photoUrl}
            onChangeText={(v) => onChange({ ...draft, photoUrl: v })}
            placeholder="https://…"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[14.5px] text-gray-900"
          />
        </Field>
      </ScrollView>

      <SheetFooter>
        <View className="flex-row gap-2">
          <Pressable
            onPress={onCancel}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl border border-gray-200 bg-white items-center justify-center"
          >
            <Text
              className="text-gray-700 text-[14.5px]"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={onSave}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl bg-blue-600 items-center justify-center"
            style={{
              shadowColor: "#2563eb",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              className="text-white text-[14.5px]"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              {saving ? "Saving…" : "Save"}
            </Text>
          </Pressable>
        </View>
      </SheetFooter>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text
        className="text-[10.5px] font-extrabold text-gray-500 uppercase mb-1.5"
        style={{ letterSpacing: 1.2 }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <View className="flex-row items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= value ? "star" : "star-outline"}
          size={11}
          color={n <= value ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </View>
  );
}

function RatingPicker({
  value,
  onChange,
}: {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <View className="flex-row items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => {
            haptic();
            onChange(n as 1 | 2 | 3 | 4 | 5);
          }}
          hitSlop={6}
          className="p-1"
        >
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={28}
            color={n <= value ? "#f59e0b" : "#d1d5db"}
          />
        </Pressable>
      ))}
    </View>
  );
}
