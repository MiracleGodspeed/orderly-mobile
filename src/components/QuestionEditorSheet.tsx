import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import KeyboardScreen from "./KeyboardScreen";
import ProductPickerSheet from "./ProductPickerSheet";
import type {
  QuestionFieldType,
  QuestionScope,
  SaveQuestionPayload,
  StoreQuestion,
} from "../api/vendor/customOrders.api";

/**
 * Create or edit one question, on the phone.
 *
 * Ordered the way a vendor thinks about it: what am I asking, what kind
 * of answer is it, and where should it appear. Scope comes third rather
 * than first because "Flavour" is a thought a baker has before "per
 * product", and asking it the other way round makes people abandon the
 * form.
 *
 * Mounted only while editing, so every field is just initial state
 * seeded from the draft. No copy-props-into-state effect, and no frame
 * where opening a second question shows the first one's answers.
 */

export interface QuestionDraft extends SaveQuestionPayload {
  id?: string;
}

const FIELD_TYPES: Array<{
  value: QuestionFieldType;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "text", label: "Short text", hint: "A name, a phone number", icon: "text-outline" },
  { value: "textarea", label: "Long text", hint: "Notes, instructions", icon: "reorder-four-outline" },
  { value: "number", label: "Number", hint: "How many tiers", icon: "calculator-outline" },
  { value: "date", label: "Date", hint: "Event or delivery day", icon: "calendar-outline" },
  { value: "time", label: "Time", hint: "A preferred hour", icon: "time-outline" },
  { value: "select", label: "Pick from a list", hint: "You set the choices", icon: "list-outline" },
  { value: "boolean", label: "Yes or no", hint: "Is this a gift?", icon: "checkmark-circle-outline" },
];

const SCOPES: Array<{
  value: QuestionScope;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    value: "order",
    label: "The whole order",
    hint: "Asked once at checkout, however many items they buy",
    icon: "storefront-outline",
  },
  {
    value: "all_products",
    label: "All my products",
    hint: "Asked on every product page, answered per item",
    icon: "bag-handle-outline",
  },
  {
    value: "some_products",
    label: "Only certain products",
    hint: "You pick which ones",
    icon: "cube-outline",
  },
];

const WEEKDAYS = [
  { value: 0, short: "Sun" },
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
];

export default function QuestionEditorSheet({
  draft,
  siblings,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  draft: QuestionDraft;
  /** Other live questions, used to offer a conditional trigger. */
  siblings: StoreQuestion[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: SaveQuestionPayload, id?: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [label, setLabel] = useState(draft.label ?? "");
  const [helpText, setHelpText] = useState(draft.helpText ?? "");
  const [fieldType, setFieldType] = useState<QuestionFieldType>(
    draft.fieldType ?? "text",
  );
  const [scope, setScope] = useState<QuestionScope>(draft.scope ?? "order");
  const [isRequired, setIsRequired] = useState(draft.isRequired ?? false);
  const [choices, setChoices] = useState<string[]>(
    draft.choices?.length ? draft.choices : [""],
  );
  const [minNoticeDays, setMinNoticeDays] = useState(
    draft.minNoticeDays == null ? "" : String(draft.minNoticeDays),
  );
  const [closedDays, setClosedDays] = useState<number[]>(draft.closedDays ?? []);
  const [productIds, setProductIds] = useState<string[]>(draft.productIds ?? []);
  const [showWhenQuestionId, setShowWhenQuestionId] = useState<string>(
    draft.showWhenQuestionId ?? "",
  );
  const [showWhenValue, setShowWhenValue] = useState<string>(
    draft.showWhenValue ?? "",
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  // Only questions that can sensibly gate another, and never the one
  // being edited — a self-reference would hide it forever.
  const triggerCandidates = useMemo(
    () =>
      siblings.filter(
        (q) =>
          q.id !== draft.id &&
          q.scope === scope &&
          (q.fieldType === "boolean" || q.fieldType === "select"),
      ),
    [siblings, draft.id, scope],
  );

  const triggerQuestion = triggerCandidates.find(
    (q) => q.id === showWhenQuestionId,
  );

  const cleanChoices = choices.map((c) => c.trim()).filter(Boolean);

  const problem = (() => {
    if (!label.trim()) return "Give the question a name.";
    if (fieldType === "select" && cleanChoices.length < 2)
      return "Add at least two choices.";
    if (scope === "some_products" && productIds.length === 0)
      return "Pick at least one product.";
    return null;
  })();

  const submit = () => {
    if (problem || saving) return;
    onSave(
      {
        label: label.trim(),
        helpText: helpText.trim() || null,
        fieldType,
        scope,
        isRequired,
        choices: fieldType === "select" ? cleanChoices : null,
        minNoticeDays:
          fieldType === "date" && minNoticeDays.trim() !== ""
            ? Number(minNoticeDays)
            : null,
        closedDays: fieldType === "date" && closedDays.length ? closedDays : null,
        showWhenQuestionId: showWhenQuestionId || null,
        showWhenValue: showWhenQuestionId ? showWhenValue || null : null,
        productIds: scope === "some_products" ? productIds : null,
      },
      draft.id,
    );
  };

  return (
    <View className="absolute inset-0 bg-white">
      <KeyboardScreen>
        <SafeAreaView edges={["top"]} className="flex-1">
          <View className="bg-white px-5 py-3 border-b border-gray-100 flex-row items-center">
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-10 h-10 rounded-full items-center justify-center bg-gray-50 mr-3 active:bg-gray-100"
            >
              <Ionicons name="close" size={20} color="#111827" />
            </Pressable>
            <View className="flex-1 min-w-0">
              <Text
                className="text-[16px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {draft.id ? "Edit question" : "New question"}
              </Text>
              <Text className="text-[11.5px] text-gray-500">
                Customers see this exactly as you write it
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── What you're asking ────────────────────────── */}
            <FieldLabel>What are you asking?</FieldLabel>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="When do you need it?"
              placeholderTextColor="#9ca3af"
              maxLength={160}
              className="bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-[14px] text-gray-900 mb-2"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            />
            <TextInput
              value={helpText}
              onChangeText={setHelpText}
              placeholder="Add a hint (optional)"
              placeholderTextColor="#9ca3af"
              maxLength={400}
              className="bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-[13px] text-gray-700 mb-6"
              style={{ fontFamily: "PlusJakartaSans_500Medium" }}
            />

            {/* ── Answer type ───────────────────────────────── */}
            <FieldLabel>What kind of answer?</FieldLabel>
            <View className="mb-6">
              {FIELD_TYPES.map((type) => {
                const active = fieldType === type.value;
                return (
                  <Pressable
                    key={type.value}
                    onPress={() => setFieldType(type.value)}
                    className={`flex-row items-center rounded-xl border px-3.5 py-3 mb-2 ${
                      active
                        ? "bg-blue-50 border-blue-500"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name={type.icon}
                      size={17}
                      color={active ? "#2563eb" : "#9ca3af"}
                    />
                    <View className="flex-1 min-w-0 ml-3">
                      <Text
                        className={`text-[13.5px] ${
                          active ? "text-blue-900" : "text-gray-900"
                        }`}
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        {type.label}
                      </Text>
                      <Text className="text-[11.5px] text-gray-500 mt-0.5">
                        {type.hint}
                      </Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* ── Choices, for a list ───────────────────────── */}
            {fieldType === "select" && (
              <View className="mb-6">
                <FieldLabel>What can they pick from?</FieldLabel>
                {choices.map((choice, index) => (
                  <View key={index} className="flex-row items-center mb-2">
                    <TextInput
                      value={choice}
                      onChangeText={(v) => {
                        const next = [...choices];
                        next[index] = v;
                        setChoices(next);
                      }}
                      placeholder={`Choice ${index + 1}`}
                      placeholderTextColor="#9ca3af"
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-[13.5px] text-gray-900"
                      style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                    />
                    {choices.length > 1 && (
                      <Pressable
                        onPress={() =>
                          setChoices(choices.filter((_, i) => i !== index))
                        }
                        hitSlop={8}
                        className="w-9 h-9 items-center justify-center ml-1"
                      >
                        <Ionicons name="close" size={16} color="#9ca3af" />
                      </Pressable>
                    )}
                  </View>
                ))}
                <Pressable
                  onPress={() => setChoices([...choices, ""])}
                  className="flex-row items-center mt-1"
                >
                  <Ionicons name="add" size={15} color="#2563eb" />
                  <Text
                    className="text-[13px] text-blue-600 ml-1"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Add a choice
                  </Text>
                </Pressable>
              </View>
            )}

            {/* ── Date rules ────────────────────────────────── */}
            {fieldType === "date" && (
              <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
                <Text
                  className="text-[13px] text-amber-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Stop orders you can&apos;t fulfil
                </Text>
                <Text className="text-[12px] text-amber-800 mt-0.5 leading-4">
                  Customers won&apos;t be able to pick a day inside your notice
                  window, or a day you&apos;re closed.
                </Text>

                <Text className="text-[10.5px] text-amber-700 uppercase mt-4 mb-1.5 tracking-wider font-semibold">
                  How much notice do you need?
                </Text>
                <View className="flex-row items-center">
                  <TextInput
                    value={minNoticeDays}
                    onChangeText={setMinNoticeDays}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#d1a054"
                    className="w-20 bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-[13.5px] text-gray-900"
                    style={{ fontFamily: "PlusJakartaSans_500Medium" }}
                  />
                  <Text className="text-[13px] text-amber-900 ml-2">
                    {minNoticeDays === "1" ? "day" : "days"}
                  </Text>
                </View>

                <Text className="text-[10.5px] text-amber-700 uppercase mt-4 mb-1.5 tracking-wider font-semibold">
                  Which days are you closed?
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const active = closedDays.includes(day.value);
                    return (
                      <Pressable
                        key={day.value}
                        onPress={() =>
                          setClosedDays(
                            active
                              ? closedDays.filter((d) => d !== day.value)
                              : [...closedDays, day.value],
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-lg ${
                          active
                            ? "bg-amber-600"
                            : "bg-white border border-amber-200"
                        }`}
                      >
                        <Text
                          className={`text-[12px] ${
                            active ? "text-white" : "text-amber-900"
                          }`}
                          style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                        >
                          {day.short}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Where to ask ──────────────────────────────── */}
            <FieldLabel>Where should this be asked?</FieldLabel>
            <View className="mb-3">
              {SCOPES.map((option) => {
                const active = scope === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setScope(option.value)}
                    className={`flex-row items-start rounded-xl border px-3.5 py-3 mb-2 ${
                      active
                        ? "bg-blue-50 border-blue-500"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name={option.icon}
                      size={17}
                      color={active ? "#2563eb" : "#9ca3af"}
                      style={{ marginTop: 1 }}
                    />
                    <View className="flex-1 min-w-0 ml-3">
                      <Text
                        className={`text-[13.5px] ${
                          active ? "text-blue-900" : "text-gray-900"
                        }`}
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                      >
                        {option.label}
                      </Text>
                      <Text className="text-[11.5px] text-gray-500 mt-0.5 leading-4">
                        {option.hint}
                      </Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {scope === "some_products" && (
              <Pressable
                onPress={() => setPickerOpen(true)}
                className="flex-row items-center justify-between bg-white border border-gray-200 rounded-xl px-3.5 py-3 mb-6 active:bg-gray-50"
              >
                <View className="flex-row items-center">
                  <Ionicons name="layers-outline" size={17} color="#9ca3af" />
                  <Text
                    className="text-[13.5px] text-gray-900 ml-2.5"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {productIds.length === 0
                      ? "Pick products"
                      : `${productIds.length} product${
                          productIds.length === 1 ? "" : "s"
                        } selected`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </Pressable>
            )}

            {/* ── Required ──────────────────────────────────── */}
            <Pressable
              onPress={() => setIsRequired(!isRequired)}
              className="flex-row items-center justify-between bg-white border border-gray-200 rounded-xl px-3.5 py-3 mb-6"
            >
              <View className="flex-1 min-w-0 pr-3">
                <Text
                  className="text-[13.5px] text-gray-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  They must answer this
                </Text>
                <Text className="text-[11.5px] text-gray-500 mt-0.5">
                  They can&apos;t pay until it&apos;s filled in
                </Text>
              </View>
              <View
                className={`w-11 h-6 rounded-full justify-center px-0.5 ${
                  isRequired ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <View
                  className="w-5 h-5 rounded-full bg-white"
                  style={{ transform: [{ translateX: isRequired ? 20 : 0 }] }}
                />
              </View>
            </Pressable>

            {/* ── Conditional ───────────────────────────────── */}
            {triggerCandidates.length > 0 && (
              <View className="mb-6">
                <FieldLabel>Only show this sometimes?</FieldLabel>
                <Pressable
                  onPress={() => {
                    setShowWhenQuestionId("");
                    setShowWhenValue("");
                  }}
                  className={`rounded-xl border px-3.5 py-3 mb-2 ${
                    !showWhenQuestionId
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className="text-[13.5px] text-gray-900"
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    Always show it
                  </Text>
                </Pressable>

                {triggerCandidates.map((candidate) => {
                  const active = showWhenQuestionId === candidate.id;
                  return (
                    <Pressable
                      key={candidate.id}
                      onPress={() => {
                        setShowWhenQuestionId(candidate.id);
                        setShowWhenValue("");
                      }}
                      className={`rounded-xl border px-3.5 py-3 mb-2 ${
                        active
                          ? "bg-blue-50 border-blue-500"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <Text
                        className="text-[13.5px] text-gray-900"
                        style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                        numberOfLines={1}
                      >
                        Only after &ldquo;{candidate.label}&rdquo;
                      </Text>
                    </Pressable>
                  );
                })}

                {triggerQuestion && (
                  <View className="bg-gray-50 rounded-xl p-3 mt-1">
                    <Text className="text-[10.5px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
                      Show it when they answer
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {(triggerQuestion.fieldType === "boolean"
                        ? [
                            { value: "true", label: "Yes" },
                            { value: "false", label: "No" },
                          ]
                        : (triggerQuestion.choices ?? []).map((c) => ({
                            value: c,
                            label: c,
                          }))
                      ).map((option) => {
                        const active = showWhenValue === option.value;
                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => setShowWhenValue(option.value)}
                            className={`px-3 py-1.5 rounded-lg ${
                              active
                                ? "bg-gray-900"
                                : "bg-white border border-gray-200"
                            }`}
                          >
                            <Text
                              className={`text-[12.5px] ${
                                active ? "text-white" : "text-gray-700"
                              }`}
                              style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}

            {draft.id && onDelete && (
              <Pressable
                onPress={() => onDelete(draft.id!)}
                className="flex-row items-center"
              >
                <Ionicons name="trash-outline" size={15} color="#dc2626" />
                <Text
                  className="text-[13px] text-red-600 ml-1.5"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Remove this question
                </Text>
              </Pressable>
            )}
          </ScrollView>

          <View className="bg-white px-5 py-4 border-t border-gray-100">
            {problem && (
              <Text className="text-[12.5px] text-amber-700 mb-2">{problem}</Text>
            )}
            <Pressable
              onPress={submit}
              disabled={!!problem || saving}
              className={`flex-row items-center justify-center rounded-xl py-3.5 ${
                problem || saving ? "bg-gray-200" : "bg-gray-900 active:bg-gray-800"
              }`}
            >
              {saving && (
                <ActivityIndicator
                  size="small"
                  color="#9ca3af"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                className={`text-[14px] ${
                  problem || saving ? "text-gray-400" : "text-white"
                }`}
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {draft.id ? "Save changes" : "Add question"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardScreen>

      {pickerOpen && (
        <ProductPickerSheet
          selectedIds={productIds}
          onClose={() => setPickerOpen(false)}
          onChange={setProductIds}
        />
      )}
    </View>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[10.5px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
      {children}
    </Text>
  );
}
