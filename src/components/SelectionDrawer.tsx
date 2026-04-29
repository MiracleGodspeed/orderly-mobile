import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";

export interface SelectionOption {
  value: string;
  label: string;
}

interface BaseProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  searchPlaceholder?: string;
  options: SelectionOption[];
  emptyMessage?: string;
}

interface SingleProps extends BaseProps {
  multiSelect?: false;
  onSelect: (value: string) => void;
  selectedValues?: never;
  onApply?: never;
  applyLabel?: never;
}

interface MultiProps extends BaseProps {
  multiSelect: true;
  selectedValues?: string[];
  onApply: (values: string[]) => void;
  applyLabel?: string;
  onSelect?: never;
}

type Props = SingleProps | MultiProps;

/**
 * Searchable selection drawer used for the State picker (single-select)
 * and the LGA / Areas picker (multi-select).
 */
export function SelectionDrawer(props: Props) {
  const {
    visible,
    onClose,
    title,
    searchPlaceholder = "Search...",
    options,
    emptyMessage = "Nothing to show.",
  } = props;
  const isMulti = props.multiSelect === true;

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) {
      setQuery("");
      return;
    }
    if (isMulti) {
      setDraft(new Set(props.selectedValues ?? []));
    }
  }, [visible, isMulti, props.selectedValues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const haptic = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const handlePick = (value: string) => {
    haptic();
    if (isMulti) {
      setDraft((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    } else {
      props.onSelect(value);
      onClose();
    }
  };

  const handleApply = () => {
    if (!isMulti) return;
    props.onApply(Array.from(draft));
    onClose();
  };

  const allSelectedInFiltered =
    isMulti && filtered.length > 0 && filtered.every((o) => draft.has(o.value));

  const toggleSelectAll = () => {
    if (!isMulti) return;
    haptic();
    setDraft((prev) => {
      const next = new Set(prev);
      if (allSelectedInFiltered) {
        filtered.forEach((o) => next.delete(o.value));
      } else {
        filtered.forEach((o) => next.add(o.value));
      }
      return next;
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={
        isMulti
          ? `${draft.size} selected · tap to toggle`
          : "Tap to choose"
      }
      height="85%"
    >
      <View className="px-5 pt-3 pb-3">
        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-11">
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            className="flex-1 ml-2 text-[14px] text-gray-900 h-full"
            placeholder={searchPlaceholder}
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              className="p-1"
            >
              <Ionicons name="close-circle" size={16} color="#cbd5e1" />
            </Pressable>
          )}
        </View>

        {isMulti && filtered.length > 1 && (
          <Pressable
            onPress={toggleSelectAll}
            className="self-start flex-row items-center gap-1.5 mt-3 px-3 h-8 rounded-full bg-blue-50 border border-blue-100"
          >
            <Ionicons
              name={allSelectedInFiltered ? "remove-circle" : "checkmark-done"}
              size={14}
              color="#2563eb"
            />
            <Text className="text-[12px] font-bold text-blue-700">
              {allSelectedInFiltered
                ? `Deselect ${filtered.length}`
                : `Select all ${filtered.length}`}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
      >
        {filtered.length === 0 ? (
          <View className="items-center py-12">
            <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mb-3">
              <Ionicons name="search-outline" size={22} color="#9ca3af" />
            </View>
            <Text className="text-[14px] font-semibold text-gray-700 mb-1">
              No results
            </Text>
            <Text className="text-[12px] text-gray-500 text-center">
              {query ? `No matches for "${query}"` : emptyMessage}
            </Text>
          </View>
        ) : (
          filtered.map((option) => {
            const checked = isMulti && draft.has(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => handlePick(option.value)}
                className={`flex-row items-center px-3 py-3 rounded-2xl mb-1.5 border ${
                  checked
                    ? "border-blue-200 bg-blue-50/60"
                    : "border-transparent bg-transparent"
                }`}
              >
                {isMulti ? (
                  <View
                    className={`w-5 h-5 rounded-md border-2 mr-3 items-center justify-center ${
                      checked
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {checked && (
                      <Ionicons name="checkmark" size={12} color="white" />
                    )}
                  </View>
                ) : (
                  <View className="w-5 h-5 rounded-full border-2 border-gray-200 mr-3" />
                )}
                <Text
                  className={`flex-1 text-[14px] ${
                    checked
                      ? "font-bold text-gray-900"
                      : "font-medium text-gray-800"
                  }`}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                {!isMulti && (
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {isMulti && (
        <BottomSheetFooter
          onCancel={onClose}
          onSave={handleApply}
          saveLabel={props.applyLabel ?? "Done"}
        />
      )}
    </BottomSheet>
  );
}
