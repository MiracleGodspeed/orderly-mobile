import {
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

interface Props {
  /** 1-based current page. */
  page: number;
  /** Total page count derived from the API response. */
  totalPages: number;
  /** Total item count — shown as a small caption ("12 of 248"). */
  totalCount: number;
  /** 1-based index of the first item on this page. */
  rangeStart: number;
  /** 1-based index of the last item on this page. */
  rangeEnd: number;
  /** Disables both buttons while a fetch is in flight. */
  isFetching?: boolean;
  onPageChange: (next: number) => void;
}

const haptic = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync().catch(() => {});
  }
};

/**
 * Returns a compact list of pages to render — current ± 1 plus first/last,
 * with `null` entries representing ellipses. Keeps the strip readable on
 * mobile regardless of page count.
 */
function buildPageList(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | null)[] = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(totalPages - 1, page + 1);
  if (left > 2) items.push(null);
  for (let p = left; p <= right; p++) items.push(p);
  if (right < totalPages - 1) items.push(null);
  items.push(totalPages);
  return items;
}

export function Pagination({
  page,
  totalPages,
  totalCount,
  rangeStart,
  rangeEnd,
  isFetching,
  onPageChange,
}: Props) {
  if (totalCount === 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const canPrev = page > 1 && !isFetching;
  const canNext = page < safeTotalPages && !isFetching;
  const pages = buildPageList(page, safeTotalPages);

  const go = (next: number) => {
    if (next < 1 || next > safeTotalPages || next === page) return;
    haptic();
    onPageChange(next);
  };

  return (
    <View className="px-5 mt-2">
      <View
        className="bg-white border border-gray-100 rounded-2xl px-3 py-3"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => go(page - 1)}
            disabled={!canPrev}
            hitSlop={6}
            className={`flex-row items-center gap-1 h-9 px-2.5 rounded-xl ${
              canPrev ? "bg-gray-50 active:bg-gray-100" : "bg-gray-50/60"
            }`}
          >
            <Ionicons
              name="chevron-back"
              size={14}
              color={canPrev ? "#111827" : "#cbd5e1"}
            />
            <Text
              className={`text-[12.5px] font-extrabold ${
                canPrev ? "text-gray-900" : "text-gray-300"
              }`}
            >
              Prev
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-1.5 flex-1 justify-center">
            {pages.map((p, idx) =>
              p === null ? (
                <Text
                  key={`ellipsis-${idx}`}
                  className="text-gray-400 text-[13px] font-bold px-1"
                >
                  …
                </Text>
              ) : (
                <Pressable
                  key={p}
                  onPress={() => go(p)}
                  disabled={isFetching || p === page}
                  className={`min-w-[34px] h-9 px-2 rounded-xl items-center justify-center ${
                    p === page
                      ? "bg-blue-600"
                      : "bg-gray-50 active:bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-[13px] font-extrabold ${
                      p === page ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {p}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <Pressable
            onPress={() => go(page + 1)}
            disabled={!canNext}
            hitSlop={6}
            className={`flex-row items-center gap-1 h-9 px-2.5 rounded-xl ${
              canNext ? "bg-gray-50 active:bg-gray-100" : "bg-gray-50/60"
            }`}
          >
            <Text
              className={`text-[12.5px] font-extrabold ${
                canNext ? "text-gray-900" : "text-gray-300"
              }`}
            >
              Next
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={canNext ? "#111827" : "#cbd5e1"}
            />
          </Pressable>
        </View>

        <View className="h-px bg-gray-100 mt-3 mb-2.5" />

        <View className="flex-row items-center justify-center gap-1.5">
          {isFetching && (
            <ActivityIndicator size="small" color="#2563eb" />
          )}
          <Text className="text-[11.5px] text-gray-500 text-center">
            {isFetching ? (
              "Loading…"
            ) : (
              <>
                Showing{" "}
                <Text className="text-gray-900 font-extrabold">
                  {rangeStart}–{rangeEnd}
                </Text>{" "}
                of{" "}
                <Text className="text-gray-900 font-extrabold">{totalCount}</Text>
                {" · "}
                Page{" "}
                <Text className="text-gray-900 font-extrabold">{page}</Text> of{" "}
                <Text className="text-gray-900 font-extrabold">
                  {safeTotalPages}
                </Text>
              </>
            )}
          </Text>
        </View>
      </View>
    </View>
  );
}
