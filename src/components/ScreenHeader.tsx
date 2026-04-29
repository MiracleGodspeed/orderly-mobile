import { ReactNode } from "react";
import { View, Text, Pressable, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

interface ScreenHeaderProps {
  /** Title shown next to the back button. */
  title: string;
  /** Hide the back button (e.g. for top-level screens). */
  showBack?: boolean;
  /** Override the default `navigation.goBack()` behavior. */
  onBack?: () => void;
  /** Optional content rendered on the right side (icons, action buttons). */
  right?: ReactNode;
}

/**
 * Standard inner-screen header used across Orders, ProductsList, OrderDetails,
 * etc. Bleeds white into the device's top safe-area so the bar visually kisses
 * the notch / status bar instead of leaving a gray sliver. Compact 44pt height
 * (iOS native navbar size) so it never feels chunky.
 *
 * The Home dashboard intentionally uses a different, branded header.
 */
export function ScreenHeader({
  title,
  showBack = true,
  onBack,
  right,
}: ScreenHeaderProps) {
  const navigation = useNavigation();

  const handleBack = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#fff" }}>
        <View className="bg-white border-b border-gray-100 px-4 py-2">
          <View className="flex-row items-center justify-between h-11">
            <View className="flex-row items-center flex-1 min-w-0">
              {showBack && (
                <Pressable
                  onPress={handleBack}
                  className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100"
                  hitSlop={8}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#111827" />
                </Pressable>
              )}
              <Text
                className="text-xl font-bold text-gray-900 flex-1"
                numberOfLines={1}
              >
                {title}
              </Text>
            </View>
            {right ? (
              <View className="flex-row items-center gap-2 ml-2">{right}</View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
