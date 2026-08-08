import { View, Text, TextInput, Pressable, ScrollView, Modal } from "react-native";
import { useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { VariantTypeDraft } from "./VariantTypeBuilder";

/**
 * Prices and counts specific choices: a particular size in a particular
 * colour at its own price and stock, or just one colour on its own.
 *
 * Deliberately NOT a generated grid. Enumerating every pairing puts a
 * wall of empty inputs in front of a vendor who wanted to price one
 * thing, and three axes of four choices is sixty-four rows of nothing.
 * The table starts empty and grows only as they add to it, so every row
 * is a decision they made.
 *
 * A row may name ANY subset of the pick-one options. Leaving one alone
 * means "any", so "all Blue is ₦45,000" is one row rather than one per
 * length. At checkout the most specific matching row wins, which is the
 * same precedence the old size-and-colour resolver used.
 *
 * A pinned price REPLACES the base price rather than adjusting it,
 * because "this one costs ₦45,000" is a statement about the finished
 * article.
 *
 * Rows are held by NAME, not position, so reordering options can't
 * silently re-point a row at the wrong choice. A row whose option was
 * renamed away is flagged rather than quietly pricing something else.
 */

export interface CombinationEntry {
  parts: Array<{ typeName: string; optionLabel: string }>;
  price: string;
  stock: string;
}

export type CombinationValue = CombinationEntry[];

/** Names for the curated swatches. A vendor pairing a colour with a
 *  length should not have to read "#EF4444". */
const COLOUR_NAMES: Record<string, string> = {
  "#000000": "Black",
  "#FFFFFF": "White",
  "#6B7280": "Grey",
  "#EF4444": "Red",
  "#F97316": "Orange",
  "#F59E0B": "Amber",
  "#EAB308": "Yellow",
  "#84CC16": "Lime",
  "#10B981": "Emerald",
  "#06B6D4": "Cyan",
  "#2563EB": "Blue",
  "#6366F1": "Indigo",
  "#8B5CF6": "Violet",
  "#EC4899": "Pink",
  "#A16207": "Brown",
  "#FCD34D": "Gold",
};

export const colourName = (hex: string): string =>
  COLOUR_NAMES[hex.trim().toUpperCase()] ?? hex.trim();

/** Pick-one, named, with at least one choice. A pick-many axis has no
 *  fixed choices to pin, which is why its extras stay additive. */
export function combinableTypes(types: VariantTypeDraft[]): VariantTypeDraft[] {
  return types.filter(
    (t) =>
      !t.allowMultiple &&
      t.name.trim() !== "" &&
      t.options.some((o) => o.label.trim() !== ""),
  );
}

const rowKey = (parts: CombinationEntry["parts"]): string =>
  [...parts]
    .map(
      (p) =>
        `${p.typeName.trim().toLowerCase()}:${p.optionLabel.trim().toLowerCase()}`,
    )
    .sort()
    .join("__");

const resolves = (entry: CombinationEntry, types: VariantTypeDraft[]): boolean =>
  entry.parts.every((part) => {
    const type = types.find(
      (t) => t.name.trim().toLowerCase() === part.typeName.trim().toLowerCase(),
    );
    if (!type) return false;
    return type.options.some(
      (o) =>
        o.label.trim().toLowerCase() === part.optionLabel.trim().toLowerCase(),
    );
  });

const money = (value: number) => `₦${value.toLocaleString("en-NG")}`;

const BOLD = { fontFamily: "PlusJakartaSans_700Bold" } as const;
const SEMI = { fontFamily: "PlusJakartaSans_600SemiBold" } as const;

export default function VariantPricingTable({
  types,
  basePrice,
  value,
  onChange,
}: {
  types: VariantTypeDraft[];
  basePrice: number;
  value: CombinationValue;
  onChange: (next: CombinationValue) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const usable = useMemo(() => combinableTypes(types), [types]);
  const taken = new Set(value.map((entry) => rowKey(entry.parts)));

  /**
   * An example built from the vendor's OWN options rather than a
   * hardcoded one. A fixed "5X5 Closure + Blue" reads as nonsense to
   * someone selling perfume, and an example that doesn't match what you
   * sell is worse than none: it makes the feature look like it's for a
   * different shop.
   */
  const example = useMemo(() => {
    const parts = usable
      .slice(0, 2)
      .map((type) => {
        const first = type.options.find((o) => o.label.trim() !== "");
        if (!first) return null;
        return type.kind === "colour"
          ? colourName(first.label)
          : first.label.trim();
      })
      .filter((p): p is string => !!p);
    return parts.length >= 2 ? parts.join(" + ") : null;
  }, [usable]);

  const isColourType = (typeName: string) =>
    types.some(
      (t) =>
        t.kind === "colour" &&
        t.name.trim().toLowerCase() === typeName.trim().toLowerCase(),
    );

  const upsert = (entry: CombinationEntry) => {
    if (editingIndex != null) {
      onChange(value.map((row, i) => (i === editingIndex ? entry : row)));
    } else {
      onChange([...value, entry]);
    }
    setModalOpen(false);
    setEditingIndex(null);
  };

  const openAdd = () => {
    setEditingIndex(null);
    setModalOpen(true);
  };

  return (
    <View className="bg-white border border-gray-100 rounded-2xl overflow-hidden mt-3">
      <View className="flex-row items-start border-b border-gray-50 px-3.5 py-3">
        <View className="w-7 h-7 rounded-lg bg-indigo-50 items-center justify-center mt-0.5">
          <Ionicons name="layers-outline" size={14} color="#4f46e5" />
        </View>
        <View className="flex-1 ml-2.5">
          <Text className="text-[13px] text-gray-900" style={BOLD}>
            Variant pricing & stock
          </Text>
          <Text className="text-[11.5px] text-gray-500 leading-[16px] mt-0.5">
            {usable.length > 1
              ? `Price or count specific choices${
                  example ? `, like ${example}` : ""
                }. Anything not listed uses the base price.`
              : `Price or count each ${
                  usable[0]?.name.trim().toLowerCase() || "choice"
                } on its own. This is also the only place to set stock per choice.`}
          </Text>
        </View>
      </View>

      {usable.length === 0 ? (
        // Never disappear silently. A section that isn't ready should say
        // what it's waiting for, or it's indistinguishable from broken.
        <View className="px-4 py-6 items-center">
          <Text className="text-[12.5px] text-gray-900" style={SEMI}>
            Add an option first
          </Text>
          <Text className="text-[11.5px] text-gray-500 leading-[16px] mt-1 text-center">
            Name an option type above and give it at least one choice.
            Then you can price and count each one here.
          </Text>
        </View>
      ) : value.length === 0 ? (
        <View className="px-4 py-6 items-center">
          <Text className="text-[12.5px] text-gray-900" style={SEMI}>
            Nothing priced specifically
          </Text>
          <Text className="text-[11.5px] text-gray-500 leading-[16px] mt-1 text-center">
            {usable.length > 1
              ? "Add one when a pairing costs a different amount, or when you hold stock of it separately."
              : "Add one to set how many you have of a particular choice, or to give it its own price."}
          </Text>
          <Pressable
            onPress={openAdd}
            className="flex-row items-center bg-gray-900 rounded-xl px-3.5 py-2.5 mt-3.5 active:opacity-80"
          >
            <Ionicons name="add" size={15} color="#ffffff" />
            <Text className="text-[12.5px] text-white ml-1.5" style={BOLD}>
              Add variant pricing
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {value.map((entry, index) => {
            const ok = resolves(entry, types);
            const soldOut = entry.stock === "0";
            const named = new Set(
              entry.parts.map((p) => p.typeName.trim().toLowerCase()),
            );
            // Axes this row doesn't name apply to all of them. Saying so
            // is the difference between "Blue" meaning one pairing and
            // meaning every length in blue.
            const anyOf = usable.filter(
              (t) => !named.has(t.name.trim().toLowerCase()),
            );

            return (
              <View
                key={`${rowKey(entry.parts)}-${index}`}
                className="px-3.5 py-3 border-b border-gray-50"
              >
                <View className="flex-row flex-wrap items-center">
                  {entry.parts.map((part, i) => {
                    const colour = isColourType(part.typeName);
                    return (
                      <View
                        key={`${part.typeName}-${i}`}
                        className="flex-row items-center bg-gray-100 rounded-md px-1.5 py-0.5 mr-1 mb-1"
                      >
                        {colour && (
                          <View
                            className="w-2.5 h-2.5 rounded-full mr-1 border border-black/10"
                            style={{ backgroundColor: part.optionLabel }}
                          />
                        )}
                        <Text
                          className="text-[11.5px] text-gray-700"
                          style={SEMI}
                          numberOfLines={1}
                        >
                          {colour ? colourName(part.optionLabel) : part.optionLabel}
                        </Text>
                      </View>
                    );
                  })}

                  {anyOf.map((t) => (
                    <View
                      key={`any-${t.name}`}
                      className="border border-dashed border-gray-200 rounded-md px-1.5 py-0.5 mr-1 mb-1"
                    >
                      <Text className="text-[11.5px] text-gray-400">
                        Any {t.name.trim().toLowerCase()}
                      </Text>
                    </View>
                  ))}

                  {soldOut && (
                    <View className="bg-rose-50 rounded-md px-1.5 py-0.5 mr-1 mb-1">
                      <Text className="text-[10px] text-rose-600" style={BOLD}>
                        SOLD OUT
                      </Text>
                    </View>
                  )}

                  {!ok && (
                    <View className="flex-row items-center bg-amber-50 rounded-md px-1.5 py-0.5 mr-1 mb-1">
                      <Ionicons name="warning-outline" size={10} color="#b45309" />
                      <Text className="text-[10px] text-amber-700 ml-1" style={BOLD}>
                        CHECK
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center mt-2">
                  <View className="flex-row items-baseline mr-4">
                    <Text className="text-[10.5px] text-gray-400 mr-1.5" style={BOLD}>
                      PRICE
                    </Text>
                    <Text className="text-[12.5px] text-gray-900" style={SEMI}>
                      {entry.price === ""
                        ? "—"
                        : money(Number(entry.price) || 0)}
                    </Text>
                  </View>

                  <View className="flex-row items-baseline">
                    <Text className="text-[10.5px] text-gray-400 mr-1.5" style={BOLD}>
                      STOCK
                    </Text>
                    <Text className="text-[12.5px] text-gray-600">
                      {entry.stock === "" ? "—" : entry.stock}
                    </Text>
                  </View>

                  <View className="flex-row items-center ml-auto">
                    <Pressable
                      onPress={() => {
                        setEditingIndex(index);
                        setModalOpen(true);
                      }}
                      hitSlop={8}
                      className="w-9 h-9 items-center justify-center rounded-lg active:bg-gray-100"
                    >
                      <Ionicons name="pencil" size={14} color="#6b7280" />
                    </Pressable>
                    <Pressable
                      onPress={() => onChange(value.filter((_, i) => i !== index))}
                      hitSlop={8}
                      className="w-9 h-9 items-center justify-center rounded-lg active:bg-red-50"
                    >
                      <Ionicons name="trash-outline" size={14} color="#6b7280" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}

          <Pressable
            onPress={openAdd}
            className="flex-row items-center px-3.5 py-3 active:opacity-70"
          >
            <Ionicons name="add" size={15} color="#2563eb" />
            <Text className="text-[12.5px] text-blue-600 ml-1.5" style={BOLD}>
              Add another
            </Text>
          </Pressable>
        </>
      )}

      {modalOpen && (
        <VariantPricingModal
          types={usable}
          allTypes={types}
          excluded={types.filter(
            (t) =>
              !t.allowMultiple &&
              !usable.includes(t) &&
              t.options.some((o) => o.label.trim() !== ""),
          )}
          basePrice={basePrice}
          taken={taken}
          initial={editingIndex != null ? value[editingIndex] : null}
          isColourType={isColourType}
          onCancel={() => {
            setModalOpen(false);
            setEditingIndex(null);
          }}
          onSave={upsert}
        />
      )}
    </View>
  );
}

/**
 * Pick which choices this applies to, then price it.
 *
 * Choices are tappable pills rather than a picker wheel: the point is
 * seeing what's available while deciding, and a vendor pairing a length
 * with a colour shouldn't have to open two menus to do it.
 */
function VariantPricingModal({
  types,
  allTypes,
  excluded,
  basePrice,
  taken,
  initial,
  isColourType,
  onCancel,
  onSave,
}: {
  types: VariantTypeDraft[];
  allTypes: VariantTypeDraft[];
  excluded: VariantTypeDraft[];
  basePrice: number;
  taken: Set<string>;
  initial: CombinationEntry | null;
  isColourType: (typeName: string) => boolean;
  onCancel: () => void;
  onSave: (entry: CombinationEntry) => void;
}) {
  const [picked, setPicked] = useState<Record<string, string>>(() =>
    initial
      ? Object.fromEntries(initial.parts.map((p) => [p.typeName, p.optionLabel]))
      : {},
  );
  const [price, setPrice] = useState(initial?.price ?? "");
  const [stock, setStock] = useState(initial?.stock ?? "");

  // One choice is enough. Anything left alone means "any".
  const complete = types.some((t) => picked[t.name] !== undefined);

  const parts = types
    .filter((t) => picked[t.name] !== undefined)
    .map((t) => ({ typeName: t.name, optionLabel: picked[t.name] }));

  const additive = useMemo(() => {
    let sum = basePrice;
    for (const part of parts) {
      const type = allTypes.find((t) => t.name === part.typeName);
      const option = type?.options.find((o) => o.label === part.optionLabel);
      sum += Number(option?.priceDelta || 0) || 0;
    }
    return sum;
  }, [parts, allTypes, basePrice]);

  const duplicate =
    complete &&
    taken.has(rowKey(parts)) &&
    (!initial || rowKey(initial.parts) !== rowKey(parts));

  const problem = !complete
    ? "Pick at least one choice to continue."
    : duplicate
      ? "You've already got a row for exactly that."
      : price === "" && stock === ""
        ? "Set a price, a stock count, or both."
        : null;

  const toggle = (typeName: string, label: string) =>
    setPicked((prev) => {
      if (prev[typeName] === label) {
        const next = { ...prev };
        delete next[typeName];
        return next;
      }
      return { ...prev, [typeName]: label };
    });

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onCancel} />

        <View className="bg-white rounded-t-3xl max-h-[88%]">
          <View className="w-9 h-1 rounded-full bg-gray-200 self-center mt-2.5" />

          <View className="flex-row items-start px-5 pt-4 pb-3">
            <View className="flex-1">
              <Text className="text-[15px] text-gray-900" style={BOLD}>
                {initial ? "Edit variant" : "Add variant pricing"}
              </Text>
              <Text className="text-[12px] text-gray-500 mt-0.5 leading-[16px]">
                Pick what this applies to. Leave an option alone to cover
                all of them.
              </Text>
            </View>
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center"
            >
              <Ionicons name="close" size={17} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView
            className="border-t border-gray-100 px-5"
            keyboardShouldPersistTaps="handled"
          >
            {excluded.length > 0 && (
              <View className="flex-row items-start bg-amber-50 rounded-xl px-3 py-2.5 mt-4">
                <Ionicons name="warning-outline" size={14} color="#d97706" />
                <Text className="flex-1 text-[11.5px] text-amber-800 leading-[16px] ml-2">
                  {excluded.length === 1
                    ? "One of your options has no name yet, so it can't be included here. Name it above and it'll appear."
                    : `${excluded.length} of your options have no name yet, so they can't be included here. Name them above and they'll appear.`}
                </Text>
              </View>
            )}

            {types.map((type) => {
              const colour = isColourType(type.name);
              const options = type.options.filter((o) => o.label.trim() !== "");
              return (
                <View key={type.name} className="mt-4">
                  <View className="flex-row items-baseline justify-between mb-1.5">
                    <Text className="text-[10.5px] text-gray-400" style={BOLD}>
                      {type.name.toUpperCase()}
                    </Text>
                    {picked[type.name] === undefined ? (
                      <Text className="text-[10.5px] text-gray-400" style={SEMI}>
                        Any {type.name.toLowerCase()}
                      </Text>
                    ) : (
                      <Pressable
                        onPress={() =>
                          setPicked((prev) => {
                            const next = { ...prev };
                            delete next[type.name];
                            return next;
                          })
                        }
                        hitSlop={8}
                      >
                        <Text className="text-[10.5px] text-blue-600" style={SEMI}>
                          Clear
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <View className="flex-row flex-wrap">
                    {options.map((option) => {
                      const active = picked[type.name] === option.label;
                      return (
                        <Pressable
                          key={option.label}
                          onPress={() => toggle(type.name, option.label)}
                          className={`flex-row items-center rounded-lg border px-3 py-2 mr-1.5 mb-1.5 min-h-[38px] ${
                            active
                              ? "bg-gray-900 border-gray-900"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          {colour && (
                            <View
                              className="w-3 h-3 rounded-full mr-1.5 border border-black/10"
                              style={{ backgroundColor: option.label }}
                            />
                          )}
                          <Text
                            className={`text-[12.5px] ${
                              active ? "text-white" : "text-gray-700"
                            }`}
                            style={SEMI}
                            numberOfLines={1}
                          >
                            {colour ? colourName(option.label) : option.label}
                          </Text>
                          {active && (
                            <Ionicons
                              name="checkmark"
                              size={13}
                              color="#ffffff"
                              style={{ marginLeft: 6 }}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <View className="flex-row border-t border-gray-100 pt-4 mt-4 mb-4">
              <View className="flex-1 mr-2.5">
                <Text className="text-[10.5px] text-gray-400 mb-1.5" style={BOLD}>
                  PRICE
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl px-2.5 h-11">
                  <Text className="text-[12.5px] text-gray-400 mr-1" style={SEMI}>
                    ₦
                  </Text>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="number-pad"
                    placeholder={complete ? String(additive) : "0"}
                    placeholderTextColor="#d1d5db"
                    className="flex-1 text-[13px] text-gray-900"
                  />
                </View>
                <Text className="text-[11px] text-gray-400 mt-1 leading-[15px]">
                  {complete
                    ? `Leave blank to keep ${money(additive)}`
                    : "Replaces the base price"}
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-[10.5px] text-gray-400 mb-1.5" style={BOLD}>
                  STOCK
                </Text>
                <View className="flex-row items-center border border-gray-200 rounded-xl px-2.5 h-11">
                  <TextInput
                    value={stock}
                    onChangeText={setStock}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor="#d1d5db"
                    className="flex-1 text-[13px] text-gray-900"
                  />
                </View>
                <Text className="text-[11px] text-gray-400 mt-1 leading-[15px]">
                  Blank means don&apos;t track it
                </Text>
              </View>
            </View>
          </ScrollView>

          <View className="border-t border-gray-100 px-5 pt-3 pb-7">
            {problem && (
              <Text className="text-[12px] text-amber-700 mb-2.5">{problem}</Text>
            )}
            <View className="flex-row items-center">
              <Pressable
                onPress={onCancel}
                className="border border-gray-200 rounded-xl px-4 py-3 mr-2.5 active:bg-gray-50"
              >
                <Text className="text-[13.5px] text-gray-700" style={SEMI}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => !problem && onSave({ parts, price, stock })}
                disabled={!!problem}
                className={`flex-1 rounded-xl px-4 py-3 items-center ${
                  problem ? "bg-gray-200" : "bg-gray-900 active:opacity-80"
                }`}
              >
                <Text
                  className={`text-[13.5px] ${
                    problem ? "text-gray-400" : "text-white"
                  }`}
                  style={BOLD}
                >
                  {initial ? "Save variant" : "Add variant"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
