import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import type { RootStackParamList } from "../navigation/types";
import { AppToast, AppToastTone } from "../components/AppToast";
import {
  createQuestion,
  deleteQuestion,
  getQuestions,
  getQuestionStarters,
  reorderQuestions,
  setQuestionsModule,
  updateQuestion,
  type QuestionStarter,
  type SaveQuestionPayload,
  type StoreQuestion,
} from "../api/vendor/customOrders.api";
import QuestionEditorSheet, {
  type QuestionDraft,
} from "../components/QuestionEditorSheet";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const haptic = (style: "light" | "success" | "error" = "light") => {
  if (Platform.OS !== "ios") return;
  if (style === "success") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  } else if (style === "error") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      () => {},
    );
  } else {
    Haptics.selectionAsync().catch(() => {});
  }
};

/** Which of the two rendered groups a question belongs to. Reordering
 *  is scoped to this, so "up" always means "up among the questions the
 *  vendor can actually see above it". */
const groupOf = (q: StoreQuestion) => (q.scope === "order" ? "order" : "product");

const TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  date: "Date",
  time: "Time",
  select: "List",
  boolean: "Yes / no",
};

/**
 * The vendor's one list of questions, on the phone.
 *
 * Grouped by where each question is asked rather than shown flat. That
 * grouping does real teaching work — a vendor sees "Asked at checkout"
 * and "Asked on each product" as two headed sections and understands the
 * model without anyone explaining it.
 *
 * Adding one opens a picker with questions already written for their
 * trade, the same full-screen search-and-tap interaction as the product
 * picker in Log order. Reordering is up/down arrows. No drag and drop:
 * dragging is miserable on a phone, and the web screen is built the same
 * way so a vendor switching between them isn't relearning anything.
 */
export default function OrderQuestions() {
  const navigation = useNavigation<Nav>();

  const [questions, setQuestions] = useState<StoreQuestion[]>([]);
  const [starters, setStarters] = useState<QuestionStarter[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: AppToastTone } | null>(
    null,
  );

  const notify = (msg: string, tone: AppToastTone = "success") =>
    setToast({ msg, tone });

  const load = useCallback(async () => {
    try {
      const data = await getQuestions();
      setQuestions(data.questions);
      setEnabled(data.enabled);
      setCanEdit(data.canEdit);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Couldn't load your questions.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void getQuestionStarters().then(setStarters);
  }, [load]);

  const orderQuestions = useMemo(
    () => questions.filter((q) => q.scope === "order"),
    [questions],
  );
  const productQuestions = useMemo(
    () => questions.filter((q) => q.scope !== "order"),
    [questions],
  );
  const usedLabels = useMemo(
    () => new Set(questions.map((q) => q.label.toLowerCase())),
    [questions],
  );

  const toggleModule = async (next: boolean) => {
    haptic();
    // Optimistic: the switch should move under the thumb, not after a
    // round trip. Rolled back below if the server disagrees.
    setEnabled(next);
    try {
      await setQuestionsModule(next);
      notify(
        next
          ? "Your questions are now live on your storefront"
          : "Questions switched off. Your storefront looks as it did before.",
      );
    } catch (err) {
      setEnabled(!next);
      notify(
        err instanceof Error ? err.message : "Couldn't update that setting.",
        "error",
      );
    }
  };

  const save = async (payload: SaveQuestionPayload, id?: string) => {
    setSaving(true);
    try {
      if (id) await updateQuestion(id, payload);
      else await createQuestion(payload);
      setDraft(null);
      haptic("success");
      notify(id ? "Question saved" : "Question added");
      await load();
    } catch (err) {
      haptic("error");
      notify(
        err instanceof Error ? err.message : "Couldn't save the question.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    try {
      await deleteQuestion(id);
      setDraft(null);
      notify("Question removed");
      await load();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Couldn't remove the question.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Moves a question past its neighbour WITHIN ITS OWN GROUP.
   *
   * Swapping with the adjacent element of the flat list would be wrong:
   * the two groups interleave in that list, so a question sitting next
   * to one of the other scope would swap with something the vendor
   * can't see and the visible order wouldn't change at all — the arrow
   * would silently do nothing.
   */
  const move = async (id: string, direction: -1 | 1) => {
    const index = questions.findIndex((q) => q.id === id);
    if (index < 0) return;

    const key = groupOf(questions[index]);
    const slots = questions.reduce<number[]>((acc, q, i) => {
      if (groupOf(q) === key) acc.push(i);
      return acc;
    }, []);

    const position = slots.indexOf(index);
    const target = position + direction;
    if (position < 0 || target < 0 || target >= slots.length) return;

    haptic();
    const next = [...questions];
    const [from, to] = [slots[position], slots[target]];
    [next[from], next[to]] = [next[to], next[from]];
    setQuestions(next);

    try {
      await reorderQuestions(next.map((q) => q.id));
    } catch {
      notify("Couldn't save the new order.", "error");
      await load();
    }
  };

  const openStarter = (starter: QuestionStarter) => {
    setPickerOpen(false);
    setDraft({
      label: starter.label,
      helpText: starter.helpText,
      fieldType: starter.fieldType,
      scope: starter.scope,
      isRequired: starter.isRequired,
      choices: starter.choices,
      minNoticeDays: starter.minNoticeDays,
      closedDays: null,
      productIds: null,
    });
  };

  const openBlank = () => {
    setPickerOpen(false);
    setDraft({
      label: "",
      helpText: null,
      fieldType: "text",
      scope: "order",
      isRequired: false,
      choices: null,
      minNoticeDays: null,
      closedDays: null,
      productIds: null,
    });
  };

  // No KeyboardScreen here. It IS a KeyboardAwareScrollView, and its own
  // docs say to wrap form content only. Nesting this screen's `flex-1`
  // SafeAreaView and ScrollView inside a scroll container leaves them
  // with no height to fill — both collapse to their content, and the
  // app's root background shows through as a blue slab under the last
  // card. Nothing at this level takes text input anyway; the two sheets
  // that do are full-screen overlays that handle their own keyboard.
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-50">
      <View className="bg-white px-5 py-3 border-b border-gray-100 flex-row items-center">
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          className="w-10 h-10 rounded-full items-center justify-center bg-gray-50 mr-3 active:bg-gray-100"
        >
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
        <View className="flex-1 min-w-0">
          <Text
            className="text-[16px] text-gray-900"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            Order questions
          </Text>
          <Text className="text-[11.5px] text-gray-500">
            Ask customers what you need to know
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {!canEdit && (
            <View className="flex-row items-start bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 mb-4">
              <Ionicons name="lock-closed" size={16} color="#d97706" />
              <View className="ml-2.5 flex-1 min-w-0">
                <Text
                  className="text-[13px] text-amber-900"
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  Editing is on a higher plan
                </Text>
                <Text className="text-[12px] text-amber-800 mt-0.5 leading-4">
                  Your questions are still live and still collecting answers
                  on every order. Upgrade to change them.
                </Text>
              </View>
            </View>
          )}

          {/* ── Live switch ────────────────────────────────── */}
          <Pressable
            onPress={() => canEdit && toggleModule(!enabled)}
            disabled={!canEdit && !enabled}
            className={`flex-row items-center rounded-2xl border px-4 py-4 mb-5 ${
              enabled
                ? "bg-emerald-50 border-emerald-200"
                : "bg-white border-gray-100"
            }`}
          >
            <View
              className={`w-10 h-10 rounded-xl items-center justify-center ${
                enabled ? "bg-emerald-100" : "bg-gray-100"
              }`}
            >
              <Ionicons
                name="sparkles"
                size={18}
                color={enabled ? "#059669" : "#9ca3af"}
              />
            </View>
            <View className="flex-1 min-w-0 ml-3">
              <Text
                className={`text-[14px] ${
                  enabled ? "text-emerald-900" : "text-gray-900"
                }`}
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                {enabled ? "Live on your storefront" : "Not live yet"}
              </Text>
              <Text className="text-[12px] text-gray-600 mt-0.5 leading-4">
                {enabled
                  ? "Customers are being asked these when they order."
                  : "Turn this on when you're ready. Until then nothing changes."}
              </Text>
            </View>
            <View
              className={`w-12 h-7 rounded-full justify-center px-0.5 ${
                enabled ? "bg-emerald-600" : "bg-gray-200"
              }`}
            >
              <View
                className="w-6 h-6 rounded-full bg-white"
                style={{
                  transform: [{ translateX: enabled ? 20 : 0 }],
                }}
              />
            </View>
          </Pressable>

          {questions.length === 0 ? (
            <View className="items-center bg-white border border-dashed border-gray-200 rounded-3xl px-6 py-12">
              <View className="w-14 h-14 rounded-2xl bg-gray-50 items-center justify-center">
                <Ionicons name="chatbox-ellipses-outline" size={24} color="#9ca3af" />
              </View>
              <Text
                className="text-[15px] text-gray-900 mt-4"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Nothing asked yet
              </Text>
              <Text className="text-[13px] text-gray-500 mt-1.5 text-center leading-5">
                We&apos;ve already written a set for your kind of business.
                Tap the ones you need and you&apos;re done in two minutes.
              </Text>
            </View>
          ) : (
            <>
              <QuestionGroup
                title="Asked at checkout"
                caption="Once per order, however many items they buy"
                icon="storefront-outline"
                questions={orderQuestions}
                allQuestions={questions}
                canEdit={canEdit}
                onEdit={setDraft}
                onMove={move}
              />
              <QuestionGroup
                title="Asked on each product"
                caption="Answered separately for every item in the bag"
                icon="bag-handle-outline"
                questions={productQuestions}
                allQuestions={questions}
                canEdit={canEdit}
                onEdit={setDraft}
                onMove={move}
              />
            </>
          )}

          {canEdit && (
            <Pressable
              onPress={() => {
                haptic();
                setPickerOpen(true);
              }}
              className="flex-row items-center justify-center bg-white border border-dashed border-gray-300 rounded-2xl py-3.5 mt-2 active:bg-gray-50"
            >
              <Ionicons name="add" size={18} color="#374151" />
              <Text
                className="text-[13.5px] text-gray-700 ml-1.5"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Add a question
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {pickerOpen && (
        <StarterPicker
          starters={starters}
          usedLabels={usedLabels}
          onClose={() => setPickerOpen(false)}
          onPick={openStarter}
          onWriteOwn={openBlank}
        />
      )}

      {draft && (
        <QuestionEditorSheet
          // Keyed so switching between two questions remounts rather
          // than reconciling one form's state onto another.
          key={draft.id ?? "new"}
          draft={draft}
          siblings={questions}
          saving={saving}
          onClose={() => setDraft(null)}
          onSave={save}
          onDelete={remove}
        />
      )}

      <AppToast
        visible={toast !== null}
        title={toast?.msg ?? ""}
        tone={toast?.tone}
        onHide={() => setToast(null)}
      />
    </SafeAreaView>
  );
}

function QuestionGroup({
  title,
  caption,
  icon,
  questions,
  allQuestions,
  canEdit,
  onEdit,
  onMove,
}: {
  title: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  questions: StoreQuestion[];
  allQuestions: StoreQuestion[];
  canEdit: boolean;
  onEdit: (draft: QuestionDraft) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  if (questions.length === 0) return null;

  return (
    <View className="mb-5">
      <View className="flex-row items-center mb-2 pl-1">
        <Ionicons name={icon} size={14} color="#9ca3af" />
        <View className="ml-2 flex-1 min-w-0">
          <Text
            className="text-[13px] text-gray-900"
            style={{ fontFamily: "PlusJakartaSans_700Bold" }}
          >
            {title}
          </Text>
          <Text className="text-[11px] text-gray-500">{caption}</Text>
        </View>
      </View>

      {questions.map((question, index) => {
        const trigger = question.showWhenQuestionId
          ? allQuestions.find((q) => q.id === question.showWhenQuestionId)
          : null;

        return (
          <View
            key={question.id}
            className="flex-row items-stretch bg-white border border-gray-100 rounded-2xl mb-2 overflow-hidden"
          >
            <Pressable
              disabled={!canEdit}
              onPress={() =>
                onEdit({
                  id: question.id,
                  label: question.label,
                  helpText: question.helpText,
                  fieldType: question.fieldType,
                  scope: question.scope,
                  isRequired: question.isRequired,
                  choices: question.choices,
                  minNoticeDays: question.minNoticeDays,
                  closedDays: question.closedDays,
                  showWhenQuestionId: question.showWhenQuestionId,
                  showWhenValue: question.showWhenValue,
                  productIds: question.productIds,
                })
              }
              className="flex-1 min-w-0 px-4 py-3.5 active:bg-gray-50"
            >
              <View className="flex-row items-center">
                <Text
                  className="text-[13.5px] text-gray-900 flex-shrink"
                  numberOfLines={1}
                  style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                >
                  {question.label}
                </Text>
              </View>

              <View className="flex-row flex-wrap items-center gap-1.5 mt-1.5">
                <Chip>{TYPE_LABELS[question.fieldType] ?? question.fieldType}</Chip>
                {question.isRequired && (
                  <Text
                    className="text-[11.5px] text-rose-600"
                    style={{ fontFamily: "PlusJakartaSans_600SemiBold" }}
                  >
                    Required
                  </Text>
                )}
                {question.scope === "some_products" && (
                  <Chip>
                    {question.productCount} product
                    {question.productCount === 1 ? "" : "s"}
                  </Chip>
                )}
                {question.fieldType === "date" &&
                (question.minNoticeDays ?? 0) > 0 ? (
                  <Chip>
                    {question.minNoticeDays} day
                    {question.minNoticeDays === 1 ? "" : "s"} notice
                  </Chip>
                ) : null}
                {trigger && <Chip>after &ldquo;{trigger.label}&rdquo;</Chip>}
              </View>
            </Pressable>

            {canEdit && questions.length > 1 && (
              <View className="justify-center pr-2">
                <Pressable
                  onPress={() => onMove(question.id, -1)}
                  disabled={index === 0}
                  hitSlop={6}
                  className="w-7 h-7 items-center justify-center rounded-md"
                  style={{ opacity: index === 0 ? 0.25 : 1 }}
                >
                  <Ionicons name="arrow-up" size={14} color="#9ca3af" />
                </Pressable>
                <Pressable
                  onPress={() => onMove(question.id, 1)}
                  disabled={index === questions.length - 1}
                  hitSlop={6}
                  className="w-7 h-7 items-center justify-center rounded-md"
                  style={{
                    opacity: index === questions.length - 1 ? 0.25 : 1,
                  }}
                >
                  <Ionicons name="arrow-down" size={14} color="#9ca3af" />
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-gray-100 px-1.5 py-0.5 rounded-md">
      <Text className="text-[10.5px] font-semibold text-gray-600">
        {children}
      </Text>
    </View>
  );
}

/**
 * The "Add a question" picker.
 *
 * Same interaction as the product picker in Log order: a full screen, a
 * search box, a list of rows, tap one and it's added. A vendor never
 * faces a blank builder — a baker opens this and Event date, Delivery
 * date and Message on the cake are already written.
 */
function StarterPicker({
  starters,
  usedLabels,
  onClose,
  onPick,
  onWriteOwn,
}: {
  starters: QuestionStarter[];
  usedLabels: Set<string>;
  onClose: () => void;
  onPick: (starter: QuestionStarter) => void;
  onWriteOwn: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return starters;
    return starters.filter((s) => s.label.toLowerCase().includes(q));
  }, [starters, query]);

  return (
    <View className="absolute inset-0 bg-white">
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
              Add a question
            </Text>
            <Text className="text-[11.5px] text-gray-500">
              Tap one we&apos;ve written, or write your own
            </Text>
          </View>
        </View>

        {starters.length > 6 && (
          <View className="px-4 pt-3">
            <View className="flex-row items-center bg-white rounded-2xl border border-gray-100 px-3 py-2.5">
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search questions"
                placeholderTextColor="#9ca3af"
                autoCorrect={false}
                className="flex-1 ml-2 text-[14px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_500Medium" }}
              />
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.map((starter) => {
            const taken = usedLabels.has(starter.label.toLowerCase());
            return (
              <Pressable
                key={starter.key}
                disabled={taken}
                onPress={() => onPick(starter)}
                className={`flex-row items-center rounded-2xl border px-3 py-3 mb-2 ${
                  taken
                    ? "bg-gray-50 border-gray-100"
                    : "bg-white border-gray-100 active:bg-gray-50"
                }`}
              >
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center ${
                    taken ? "bg-gray-100" : "bg-gray-50"
                  }`}
                >
                  <Text className="text-[17px]">{starter.icon ?? "❓"}</Text>
                </View>
                <View className="flex-1 min-w-0 ml-3">
                  <Text
                    className={`text-[13.5px] ${
                      taken ? "text-gray-400" : "text-gray-900"
                    }`}
                    numberOfLines={1}
                    style={{ fontFamily: "PlusJakartaSans_700Bold" }}
                  >
                    {starter.label}
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5">
                    {taken
                      ? "Already on your list"
                      : starter.scope === "order"
                        ? "Asked once at checkout"
                        : "Asked on each product"}
                  </Text>
                </View>
                {!taken && (
                  <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-900">
                    <Ionicons name="add" size={16} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}

          <Pressable
            onPress={onWriteOwn}
            className="flex-row items-center rounded-2xl border border-dashed border-gray-300 px-3 py-3 mt-1 active:bg-gray-50"
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center bg-gray-50">
              <Ionicons name="create-outline" size={18} color="#6b7280" />
            </View>
            <View className="flex-1 min-w-0 ml-3">
              <Text
                className="text-[13.5px] text-gray-900"
                style={{ fontFamily: "PlusJakartaSans_700Bold" }}
              >
                Write my own question
              </Text>
              <Text className="text-[12px] text-gray-500 mt-0.5">
                Anything not on the list
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
