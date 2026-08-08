import { View, Text, TextInput, Pressable, Modal } from "react-native";
import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

/**
 * The vendor builds their own variant types instead of being handed two
 * boxes labelled Size and Colour.
 *
 * That pairing is meaningless to most of the catalog. A baker needs
 * Flavour, Filling and Topping; a tailor needs Length, Fabric and
 * Finish; neither needs Size, and being shown it is how a vendor decides
 * the feature isn't for them and never prices a variant.
 *
 * Adding a type asks the VENDOR one question — colour or custom — and
 * that answer only decides how they fill it in and how the storefront
 * draws it. The customer is never asked anything about types; they just
 * see Flavour, Filling, Colour and tap.
 *
 * Choices carry no price of their own. Everything a vendor charges is
 * set in Variant pricing, so there is exactly one place to look and no
 * two fields that interact. `priceDelta` stays on the draft at zero
 * purely to keep the save payload's shape stable.
 */

export interface VariantOptionDraft {
  id?: string | null;
  label: string;
  priceDelta: string;
}

export interface VariantTypeDraft {
  id?: string | null;
  name: string;
  kind: "colour" | "list";
  allowMultiple: boolean;
  isRequired: boolean;
  options: VariantOptionDraft[];
}

const isLight = (hex: string): boolean => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 186;
};

export default function VariantTypeBuilder({
  value,
  onChange,
  presetColors,
  /** Opens the app's existing colour wheel and hands the chosen hex
   *  back. Owned by the product editor so the builder doesn't have to
   *  carry the picker's state — and so vendors keep the custom-shade
   *  flow they already have. */
  onRequestCustomColour,
}: {
  value: VariantTypeDraft[];
  onChange: (next: VariantTypeDraft[]) => void;
  presetColors: string[];
  onRequestCustomColour: (apply: (hex: string) => void) => void;
}) {
  const [kindPickerOpen, setKindPickerOpen] = useState(false);

  const hasColour = value.some((t) => t.kind === "colour");

  const update = (index: number, patch: Partial<VariantTypeDraft>) =>
    onChange(value.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addColour = () => {
    setKindPickerOpen(false);
    onChange([
      ...value,
      {
        name: "Colour",
        kind: "colour",
        // A colour axis is always pick-one — two colours on one garment
        // isn't a thing, and swatches have no multi-select state.
        allowMultiple: false,
        isRequired: false,
        options: [],
      },
    ]);
  };

  const addCustom = () => {
    setKindPickerOpen(false);
    onChange([
      ...value,
      {
        name: "",
        kind: "list",
        allowMultiple: false,
        isRequired: false,
        options: [{ label: "", priceDelta: "" }],
      },
    ]);
  };

  return (
    <View>
      {value.length === 0 ? (
        <View className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-4 py-7 items-center mb-3">
          <Text
            className="text-[13px] text-gray-900"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Nothing added yet
          </Text>
          <Text className="text-[12px] text-gray-500 mt-1 text-center leading-4">
            Add the choices customers make on this product. Colour, flavour,
            length, whatever fits what you sell.
          </Text>
        </View>
      ) : (
        value.map((type, index) => (
          <TypeCard
            key={type.id ?? `new-${index}`}
            type={type}
            index={index}
            total={value.length}
            presetColors={presetColors}
            onChange={(patch) => update(index, patch)}
            onRemove={() => remove(index)}
            onMove={(direction) => move(index, direction)}
            onRequestCustomColour={onRequestCustomColour}
          />
        ))
      )}

      <Pressable
        onPress={() => setKindPickerOpen(true)}
        className="flex-row items-center justify-center bg-white border border-dashed border-gray-300 rounded-2xl py-3 active:bg-gray-50"
      >
        <Ionicons name="add" size={17} color="#374151" />
        <Text
          className="text-[13px] text-gray-700 ml-1.5"
          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
        >
          Add an option type
        </Text>
      </Pressable>

      {kindPickerOpen && (
        <KindPicker
          hasColour={hasColour}
          onColour={addColour}
          onCustom={addCustom}
          onClose={() => setKindPickerOpen(false)}
        />
      )}
    </View>
  );
}

/**
 * The one question asked when a type is created.
 *
 * This has to be a real `Modal`. An `absolute inset-0` View positions
 * itself against its nearest parent, not the screen, so inside a
 * scrolling product form it rendered as a card wedged between the fields
 * — dimming a slice of the form, clipped by the section it sat in, and
 * scrolling away with the page. It read as part of the form rather than
 * as something on top of it.
 *
 * A bottom sheet rather than a centred dialog: it lands under the thumb,
 * it matches Variant pricing & stock, and a sheet sliding up from the
 * edge of the screen can't be mistaken for form content the way a
 * floating card can.
 */
function KindPicker({
  hasColour,
  onColour,
  onCustom,
  onClose,
}: {
  hasColour: boolean;
  onColour: () => void;
  onCustom: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/50">
        {/* Everything above the sheet dismisses it. */}
        <Pressable className="flex-1" onPress={onClose} />

        <View className="bg-white rounded-t-3xl">
          <View className="w-9 h-1 rounded-full bg-gray-200 self-center mt-2.5" />

          <View className="flex-row items-start px-5 pt-4 pb-4">
            <View className="flex-1 pr-3">
              <Text
                className="text-[15px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                What kind of option is this?
              </Text>
              <Text className="text-[12.5px] text-gray-500 mt-0.5 leading-[17px]">
                This only changes how you fill it in.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center"
            >
              <Ionicons name="close" size={17} color="#6b7280" />
            </Pressable>
          </View>

          {/* pb-8 clears the home indicator without pulling in insets —
              the sheet is edge-anchored, so this is the one place the
              gesture bar can collide with a tap target. */}
          <View className="border-t border-gray-100 px-5 pt-4 pb-8">
            <Pressable
              onPress={onColour}
              disabled={hasColour}
              className={`flex-row items-start rounded-2xl border px-4 py-4 ${
                hasColour
                  ? "bg-gray-50 border-gray-100"
                  : "border-gray-200 active:bg-gray-50"
              }`}
            >
              <View
                className={`w-9 h-9 rounded-xl items-center justify-center ${
                  hasColour ? "bg-gray-100" : "bg-violet-50"
                }`}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={18}
                  color={hasColour ? "#9ca3af" : "#7c3aed"}
                />
              </View>
              <View className="flex-1 min-w-0 ml-3">
                <Text
                  className={`text-[13.5px] ${
                    hasColour ? "text-gray-400" : "text-gray-900"
                  }`}
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Colour
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5 leading-[17px]">
                  {hasColour
                    ? "You've already got a colour option on this product"
                    : "Pick shades from a palette. Customers see swatches."}
                </Text>
              </View>
              {!hasColour && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#d1d5db"
                  style={{ marginTop: 2 }}
                />
              )}
            </Pressable>

            <Pressable
              onPress={onCustom}
              className="flex-row items-start rounded-2xl border border-gray-200 px-4 py-4 mt-2.5 active:bg-gray-50"
            >
              <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center">
                <Ionicons name="create-outline" size={18} color="#2563eb" />
              </View>
              <View className="flex-1 min-w-0 ml-3">
                <Text
                  className="text-[13.5px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Custom
                </Text>
                <Text className="text-[12px] text-gray-500 mt-0.5 leading-[17px]">
                  Size, Flavour, Length, Material. You name it and list the
                  choices.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="#d1d5db"
                style={{ marginTop: 2 }}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function TypeCard({
  type,
  index,
  total,
  presetColors,
  onChange,
  onRemove,
  onMove,
  onRequestCustomColour,
}: {
  type: VariantTypeDraft;
  index: number;
  total: number;
  presetColors: string[];
  onChange: (patch: Partial<VariantTypeDraft>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onRequestCustomColour: (apply: (hex: string) => void) => void;
}) {
  const isColour = type.kind === "colour";

  const setOption = (i: number, patch: Partial<VariantOptionDraft>) =>
    onChange({
      options: type.options.map((o, oi) => (oi === i ? { ...o, ...patch } : o)),
    });

  const toggleColour = (hex: string) => {
    const H = hex.toUpperCase();
    const existing = type.options.find((o) => o.label.toUpperCase() === H);
    if (existing) {
      onChange({
        options: type.options.filter((o) => o.label.toUpperCase() !== H),
      });
      return;
    }
    onChange({ options: [...type.options, { label: H, priceDelta: "" }] });
  };

  const chosenColours = type.options.map((o) => o.label.toUpperCase());

  return (
    <View className="bg-white border border-gray-100 rounded-2xl mb-3 overflow-hidden">
      <View className="flex-row items-center border-b border-gray-50 px-3 py-2.5">
        <View
          className={`w-8 h-8 rounded-lg items-center justify-center ${
            isColour ? "bg-violet-50" : "bg-gray-50"
          }`}
        >
          <Ionicons
            name={isColour ? "color-palette-outline" : "create-outline"}
            size={16}
            color={isColour ? "#7c3aed" : "#6b7280"}
          />
        </View>

        {isColour ? (
          <Text
            className="flex-1 text-[13.5px] text-gray-900 ml-2.5"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Colour
          </Text>
        ) : (
          <TextInput
            value={type.name}
            onChangeText={(v) => onChange({ name: v })}
            placeholder="Name this option"
            placeholderTextColor="#9ca3af"
            maxLength={60}
            className={`flex-1 text-[13.5px] text-gray-900 ml-2 px-2.5 h-9 rounded-lg border ${
              type.name.trim() === ""
                ? "border-amber-300 bg-amber-50/40"
                : "border-gray-200 bg-white"
            }`}
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          />
        )}

        <Pressable
          onPress={() => onMove(-1)}
          disabled={index === 0}
          hitSlop={6}
          className="w-7 h-7 items-center justify-center"
          style={{ opacity: index === 0 ? 0.25 : 1 }}
        >
          <Ionicons name="arrow-up" size={14} color="#9ca3af" />
        </Pressable>
        <Pressable
          onPress={() => onMove(1)}
          disabled={index === total - 1}
          hitSlop={6}
          className="w-7 h-7 items-center justify-center"
          style={{ opacity: index === total - 1 ? 0.25 : 1 }}
        >
          <Ionicons name="arrow-down" size={14} color="#9ca3af" />
        </Pressable>
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          className="w-7 h-7 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={14} color="#9ca3af" />
        </Pressable>
      </View>

      <View className="px-3 py-3">
        {isColour ? (
          <>
            <View className="flex-row flex-wrap gap-2">
              {presetColors.map((hex) => {
                const active = chosenColours.includes(hex.toUpperCase());
                return (
                  <Pressable
                    key={hex}
                    onPress={() => toggleColour(hex)}
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: hex,
                      borderWidth: isLight(hex) || active ? 2 : 0,
                      borderColor: active ? "#111827" : "#e5e7eb",
                    }}
                  >
                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color={isLight(hex) ? "#111827" : "#ffffff"}
                      />
                    )}
                  </Pressable>
                );
              })}

              {/* Keeps the wheel picker vendors already use, rather than
                  quietly dropping custom shades on mobile. */}
              <Pressable
                onPress={() => onRequestCustomColour((hex) => toggleColour(hex))}
                className="w-9 h-9 rounded-full items-center justify-center border border-dashed border-gray-300"
              >
                <Ionicons name="add" size={16} color="#6b7280" />
              </Pressable>
            </View>

            {/* Any custom shades already picked, so they can be removed
                even though they aren't in the preset row. */}
            {chosenColours.filter(
              (hex) => !presetColors.map((p) => p.toUpperCase()).includes(hex),
            ).length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-2">
                {chosenColours
                  .filter(
                    (hex) =>
                      !presetColors.map((p) => p.toUpperCase()).includes(hex),
                  )
                  .map((hex) => (
                    <Pressable
                      key={hex}
                      onPress={() => toggleColour(hex)}
                      className="w-9 h-9 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: hex,
                        borderWidth: 2,
                        borderColor: "#111827",
                      }}
                    >
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color={isLight(hex) ? "#111827" : "#ffffff"}
                      />
                    </Pressable>
                  ))}
              </View>
            )}
          </>
        ) : (
          <>
            {type.name.trim() === "" && (
              <View className="bg-amber-50 rounded-lg px-2.5 py-1.5 mb-2">
                <Text className="text-[11.5px] text-amber-800 leading-[16px]">
                  Give this a name. Until you do it won&apos;t save, and it
                  can&apos;t be used in variant pricing below.
                </Text>
              </View>
            )}

            {type.options.map((option, i) => (
              <View key={option.id ?? `opt-${i}`} className="flex-row items-center mb-2">
                <TextInput
                  value={option.label}
                  onChangeText={(v) => setOption(i, { label: v })}
                  placeholder={`Choice ${i + 1}`}
                  placeholderTextColor="#9ca3af"
                  maxLength={120}
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 h-10 text-[13px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                />
                {type.options.length > 1 && (
                  <Pressable
                    onPress={() =>
                      onChange({
                        options: type.options.filter((_, oi) => oi !== i),
                      })
                    }
                    hitSlop={6}
                    className="w-8 h-8 items-center justify-center ml-1"
                  >
                    <Ionicons name="close" size={15} color="#9ca3af" />
                  </Pressable>
                )}
              </View>
            ))}

            <Pressable
              onPress={() =>
                onChange({
                  options: [...type.options, { label: "", priceDelta: "" }],
                })
              }
              className="flex-row items-center mt-1"
            >
              <Ionicons name="add" size={15} color="#2563eb" />
              <Text
                className="text-[12.5px] text-blue-600 ml-1"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Add a choice
              </Text>
            </Pressable>
          </>
        )}

        <View className="flex-row flex-wrap gap-1.5 border-t border-gray-50 pt-3 mt-3">
          <Toggle
            on={type.isRequired}
            onPress={() => onChange({ isRequired: !type.isRequired })}
          >
            Must choose
          </Toggle>
          {/* Colour is pick-one by definition, so the control isn't shown
              rather than shown-and-disabled. */}
          {!isColour && (
            <Toggle
              on={type.allowMultiple}
              onPress={() => onChange({ allowMultiple: !type.allowMultiple })}
            >
              Can pick several
            </Toggle>
          )}
        </View>
      </View>
    </View>
  );
}

function Toggle({
  on,
  onPress,
  children,
}: {
  on: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-2.5 py-1.5 rounded-lg ${
        on ? "bg-gray-900" : "bg-white border border-gray-200"
      }`}
    >
      {on && (
        <Ionicons
          name="checkmark"
          size={12}
          color="#ffffff"
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        className={`text-[12px] ${on ? "text-white" : "text-gray-600"}`}
        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
