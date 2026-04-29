import { View, Text, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface Props {
  isFetchingMore: boolean;
  hasNextPage: boolean;
  itemCount: number;
}

/**
 * Bottom-of-list footer used by infinite-scroll lists. Shows a spinner while
 * the next page loads, an "All caught up" indicator when there's nothing more,
 * and renders nothing on empty lists (the empty-state component owns that).
 */
export function EndOfList({ isFetchingMore, hasNextPage, itemCount }: Props) {
  if (itemCount === 0) return null;

  if (isFetchingMore) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  }

  if (!hasNextPage) {
    return (
      <View className="flex-row items-center justify-center gap-2 py-8">
        <Ionicons name="checkmark-done" size={14} color="#9ca3af" />
        <Text className="text-xs text-gray-400 font-medium">
          You're all caught up
        </Text>
      </View>
    );
  }

  return <View className="py-6" />;
}
