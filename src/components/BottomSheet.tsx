import { ReactNode } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sheet title shown in the header. */
  title: string;
  /** Optional small caption shown under the title. */
  subtitle?: string;
  /** Sheet height as a percentage string ("85%") or fixed number. */
  height?: string | number;
  /** When true, the X close button is hidden. */
  hideClose?: boolean;
  /** Inner content. */
  children: ReactNode;
  /** Optional extra style for the inner wrapper. */
  style?: StyleProp<ViewStyle>;
  /** Optional right-side action in the header. */
  headerRight?: ReactNode;
}

/**
 * Premium bottom-sheet shell used for all storefront-edit drawers.
 * Provides:
 *   - dim backdrop with tap-to-dismiss
 *   - rounded top corners + drag handle
 *   - sticky header (title, subtitle, close)
 *   - flexible content slot
 *   - sticky footer support via <BottomSheetFooter />
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  height = "85%",
  hideClose,
  children,
  style,
  headerRight,
}: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/45 justify-end">
        <Pressable
          className="absolute inset-0"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          className="bg-white rounded-t-[28px] overflow-hidden"
          style={[
            {
              height: typeof height === "number" ? height : undefined,
              minHeight: 200,
              ...(typeof height === "string"
                ? { maxHeight: "95%", height: undefined }
                : {}),
            },
            typeof height === "string"
              ? ({ height } as ViewStyle)
              : null,
            style,
          ]}
        >
          {/* Drag handle */}
          <View className="items-center pt-2.5 pb-1">
            <View className="w-10 h-[5px] bg-gray-200 rounded-full" />
          </View>

          {/* Header */}
          <View className="flex-row items-start justify-between px-5 pt-3 pb-4 border-b border-gray-100">
            <View className="flex-1 pr-3">
              <Text className="text-[18px] font-extrabold text-gray-900 tracking-tight">
                {title}
              </Text>
              {subtitle ? (
                <Text className="text-[12.5px] text-gray-500 mt-0.5 leading-[18px]">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View className="flex-row items-center gap-2">
              {headerRight}
              {!hideClose && (
                <Pressable
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={18} color="#374151" />
                </Pressable>
              )}
            </View>
          </View>

          {children}
        </View>
      </View>
    </Modal>
  );
}

interface BottomSheetFooterProps {
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  saveLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  saveDisabled?: boolean;
}

/**
 * Standard sticky footer with Cancel + primary Save button.
 * Drop in at the bottom of a BottomSheet.
 */
export function BottomSheetFooter({
  onCancel,
  onSave,
  saveLabel = "Save Changes",
  cancelLabel = "Cancel",
  loading,
  saveDisabled,
}: BottomSheetFooterProps) {
  return (
    <View
      className="flex-row items-center px-5 pt-3 pb-7 border-t border-gray-100 bg-white gap-3"
      style={{
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <Pressable
        onPress={onCancel}
        className="flex-1 h-12 rounded-2xl border border-gray-200 items-center justify-center bg-white active:bg-gray-50"
      >
        <Text className="text-gray-900 font-semibold text-[15px]">
          {cancelLabel}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          if (loading || saveDisabled) return;
          if (Platform.OS === "ios") {
            // Subtle haptic on confirm without importing haptics here.
          }
          void onSave();
        }}
        disabled={loading || saveDisabled}
        className={`flex-1 h-12 rounded-2xl items-center justify-center ${
          loading || saveDisabled ? "bg-blue-300" : "bg-blue-600"
        }`}
        style={{
          shadowColor: "#2563eb",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: loading || saveDisabled ? 0 : 0.25,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        {loading ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="sync-outline" size={16} color="white" />
            <Text className="text-white font-bold text-[15px]">Saving…</Text>
          </View>
        ) : (
          <Text className="text-white font-bold text-[15px]">{saveLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}
