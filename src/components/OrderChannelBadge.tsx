import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { resolveChannel } from "../lib/orderChannels";

interface Props {
  /** Raw channel string from the order payload. Null/empty renders
   *  nothing — storefront orders don't need a tag. */
  channel: string | null | undefined;
  /** Compact density for list rows; use `default` for the order
   *  details header where there's more breathing room. */
  size?: "compact" | "default";
}

/**
 * Tiny coloured pill that tags an order with its sales channel
 * (WhatsApp, Instagram, walk-in, etc). Returns null when the order
 * has no channel so storefront orders render as before.
 */
export function OrderChannelBadge({ channel, size = "compact" }: Props) {
  const meta = resolveChannel(channel);
  if (!meta) return null;

  const isCompact = size === "compact";

  return (
    <View
      className={`flex-row items-center rounded-full ${
        isCompact ? "gap-1 px-2 py-0.5" : "gap-1.5 px-2.5 py-1"
      }`}
      style={{ backgroundColor: meta.bg }}
    >
      <Ionicons
        name={meta.icon}
        size={isCompact ? 9 : 11}
        color={meta.accent}
      />
      <Text
        className={`font-extrabold ${
          isCompact ? "text-[9.5px]" : "text-[11px]"
        }`}
        style={{ color: meta.accent, letterSpacing: 0.2 }}
        numberOfLines={1}
      >
        {meta.short}
      </Text>
    </View>
  );
}
