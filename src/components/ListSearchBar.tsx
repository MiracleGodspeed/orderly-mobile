import { memo, useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable, ViewStyle, StyleProp } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface ListSearchBarProps {
  placeholder: string;
  /** Called with the trimmed search value after the debounce window. */
  onSearchChange: (value: string) => void;
  debounceMs?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Search box used inside list headers. Keeps its visible text state local
 * so the parent only re-renders on the debounced value (i.e. when we're
 * about to hit the API). React.memo + a ref-stored callback mean the input
 * never re-mounts even when the parent's data updates — keyboard stays up
 * the whole time the user is typing, even as new results stream in.
 */
function ListSearchBarBase({
  placeholder,
  onSearchChange,
  debounceMs = 400,
  containerStyle,
}: ListSearchBarProps) {
  const [value, setValue] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onSearchChange);

  // Always invoke the latest callback without re-creating handleChange
  // (which would change props and break memo).
  useEffect(() => {
    callbackRef.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (text: string) => {
    setValue(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      callbackRef.current(text);
    }, debounceMs);
  };

  const handleClear = () => {
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    callbackRef.current("");
  };

  return (
    <View
      className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 h-12"
      style={containerStyle}
    >
      <Ionicons name="search-outline" size={19} color="#9ca3af" />
      <TextInput
        value={value}
        onChangeText={handleChange}
        className="flex-1 ml-3 text-[15px] text-gray-900 h-full"
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Pressable onPress={handleClear} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color="#cbd5e1" />
        </Pressable>
      )}
    </View>
  );
}

export const ListSearchBar = memo(ListSearchBarBase);
