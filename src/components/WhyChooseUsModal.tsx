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
import {
  WHY_CHOOSE_US_ICONS,
  resolveWhyChooseUsIcon,
} from "../lib/whyChooseUsIcons";

/**
 * Why-choose-us pillars editor — vendor-authored promises ("Free
 * shipping", "Hand-crafted", "30-day returns") that templates render
 * as a card row right below the hero. Up to 4 pillars; each has a
 * title, body, and optional icon URL.
 *
 * Same bottom-sheet pattern as CustomerReviewsModal: list mode +
 * inline form mode toggled via the `editing` state. Saving from the
 * form persists the full array via `updateVendorSettings({ storeFrontJson })`.
 */

const MAX = 4;

export interface WhyChoosePillar {
  id: string;
  title: string;
  body: string;
  iconUrl?: string | null;
  /** Picked from the shared icon registry. Replaces the legacy
   *  iconUrl input — new edits set this; iconUrl stays for
   *  backwards compatibility with previously-saved pillars. */
  iconName?: string | null;
}

interface Draft {
  id: string;
  title: string;
  body: string;
  iconName: string;
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
    title: "",
    body: "",
    // Default to "check" so a saved pillar always has a glyph.
    iconName: "check",
  };
}

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

export default function WhyChooseUsModal({ visible, onClose }: Props) {
  const { storeData, updateVendorSettings } = useVendor();
  const [items, setItems] = useState<WhyChoosePillar[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const initial: WhyChoosePillar[] =
      (storeData as any)?.storeFrontJson?.whyChooseUs ?? [];
    setItems(initial);
    setEditing(null);
    setEditingIndex(null);
  }, [visible, storeData]);

  const persist = async (next: WhyChoosePillar[]) => {
    if (!storeData) return;
    setSaving(true);
    try {
      const merged = {
        ...(storeData as any).storeFrontJson,
        whyChooseUs: next,
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
      Alert.alert("Limit reached", `You can have up to ${MAX} pillars.`);
      return;
    }
    setEditing(newDraft());
    setEditingIndex(null);
  };

  const openEdit = (i: number) => {
    haptic();
    const p = items[i];
    setEditing({
      id: p.id,
      title: p.title,
      body: p.body,
      iconName: p.iconName ?? "check",
    });
    setEditingIndex(i);
  };

  const handleDelete = (i: number) => {
    Alert.alert("Remove this pillar?", undefined, [
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
    const title = editing.title.trim();
    const body = editing.body.trim();
    if (!title || !body) {
      Alert.alert("Missing details", "Title and body are required.");
      return;
    }
    const ready: WhyChoosePillar = {
      id: editing.id,
      title,
      body,
      iconUrl: null,
      iconName: editing.iconName.trim() || "check",
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
      title="Why choose us"
      subtitle={
        editing
          ? editingIndex != null
            ? "Edit pillar"
            : "Add a new pillar"
          : `${items.length} of ${MAX} pillars`
      }
      height="92%"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {editing ? (
          <PillarForm
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
          <PillarList
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

function PillarList({
  items,
  saving,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: WhyChoosePillar[];
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
              <Ionicons name="ribbon-outline" size={26} color="#2563eb" />
            </View>
            <Text
              className="text-[15px] text-gray-900 mb-1"
              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
            >
              No pillars yet
            </Text>
            <Text className="text-[12.5px] text-gray-500 text-center max-w-[280px] leading-[18px]">
              Pillars are short promises that build customer trust — free
              shipping, hand-crafted, easy returns. Up to {MAX} appear in a
              row below your hero.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {items.map((p, i) => (
              <View
                key={p.id}
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
                  <View className="w-9 h-9 rounded-2xl bg-blue-50 items-center justify-center">
                    <Ionicons
                      name={resolveWhyChooseUsIcon(p.iconName)}
                      size={16}
                      color="#1d4ed8"
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      className="text-[13.5px] text-gray-900"
                      numberOfLines={1}
                      style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                    >
                      {p.title}
                    </Text>
                    <Text
                      className="text-[12px] text-gray-600 leading-[17px] mt-0.5"
                      numberOfLines={2}
                    >
                      {p.body}
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
            Add
          </Text>
        </Pressable>
      </SheetFooter>
    </>
  );
}

/* ──────────────────────────── Form view ──────────────────────────── */

function PillarForm({
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
        <Field label="Title">
          <TextInput
            value={draft.title}
            onChangeText={(v) => onChange({ ...draft, title: v })}
            placeholder="Free shipping"
            placeholderTextColor="#9CA3AF"
            maxLength={40}
            className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-3 text-[14.5px] text-gray-900"
          />
        </Field>

        <Field label="Body">
          <TextInput
            value={draft.body}
            onChangeText={(v) => onChange({ ...draft, body: v })}
            placeholder="On all orders over ₦50,000"
            placeholderTextColor="#9CA3AF"
            maxLength={140}
            multiline
            textAlignVertical="top"
            className="min-h-[100px] bg-gray-50 border border-gray-200 rounded-xl p-3 text-[14.5px] text-gray-900"
          />
          <Text className="text-[11px] text-gray-400 text-right mt-1">
            {draft.body.length} / 140
          </Text>
        </Field>

        <Field label="Icon">
          <IconPicker
            value={draft.iconName}
            onChange={(name) => onChange({ ...draft, iconName: name })}
          />
          <Text className="text-[11px] text-gray-400 mt-2">
            Pick one. The default Check still renders cleanly on the
            storefront if you don&apos;t change it.
          </Text>
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

/**
 * Grid of icon tiles the vendor taps to pick. Selected tile gets a
 * blue ring + tinted background. Mirrors the web's IconPicker so a
 * vendor sees the same option in both surfaces.
 */
function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {WHY_CHOOSE_US_ICONS.map(({ name, label, ionicon }) => {
        const active = value === name;
        return (
          <Pressable
            key={name}
            onPress={() => {
              haptic();
              onChange(name);
            }}
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            className={`w-11 h-11 rounded-xl items-center justify-center border ${
              active
                ? "bg-blue-50 border-blue-500"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <Ionicons
              name={ionicon}
              size={18}
              color={active ? "#1d4ed8" : "#4b5563"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
