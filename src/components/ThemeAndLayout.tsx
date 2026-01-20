import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect } from "react";
import { useVendor } from "../../context/VendorContext";


interface Props {
  visible: boolean;
  onClose: () => void;
  initialTemplateId?: string;
}


const THEMES = [
  { id: "orderly-core", label: "Orderly Core" },
  { id: "speed-pro", label: "Speed Pro" },
  { id: "fresh-cart", label: "Fresh Cart" },
  { id: "business-exec", label: "Business Exec" },
] as const;

type ThemeOption = (typeof THEMES)[number]["id"];


export default function ThemeLayoutModal({ visible, onClose, initialTemplateId }: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [selectedTheme, setSelectedTheme] =
    useState<ThemeOption>("orderly-core");

  useEffect(() => {
    if (visible && initialTemplateId) {
      // Find theme if it matches any of the labels or IDs loosely or exactly
      const theme = THEMES.find(t => t.id === initialTemplateId);
      if (theme) {
        setSelectedTheme(theme.id);
      }
    }
  }, [visible, initialTemplateId]);

  const handleSave = async () => {
    if (!storeData) return;
    try {
      await updateVendorSettings({ templateId: selectedTheme });
      onClose();
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-2xl h-[90%]">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <View className="w-6" />
            <Text className="text-base font-semibold">Theme & Layout</Text>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#000" />
            </Pressable>
          </View>

          <View className="px-4 pt-4 pb-3">
            <Text className="text-sm text-gray-600">
              Choose a layout and website template for your storefront.
            </Text>
          </View>

          <ScrollView className="flex-1 px-4 pb-4">
            <View className="flex-row flex-wrap justify-between">
              {THEMES.map((theme) => {
                const isSelected = selectedTheme === theme.id;

                return (
                  <View key={theme.id} className="w-[48%] mb-6">
                    <Pressable
                      onPress={() => setSelectedTheme(theme.id)}
                      className={`rounded-2xl p-2 mb-3 ${isSelected
                        ? "border-2 border-blue-600"
                        : "border border-gray-200"
                        }`}
                    >
                      <View className="rounded-xl overflow-hidden aspect-[9/16] bg-gray-100">
                        <Image
                          source={require('../../assets/themeImg.png')}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setSelectedTheme(theme.id)}
                      className="flex-row items-center"
                    >
                      <View
                        className={`w-5 h-5 rounded-full border-2 mr-2 items-center justify-center ${isSelected
                          ? "border-blue-600"
                          : "border-gray-300"
                          }`}
                      >
                        {isSelected && (
                          <View className="w-3 h-3 rounded-full bg-blue-600" />
                        )}
                      </View>
                      <Text className="text-sm text-gray-900">
                        {theme.label}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-8">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 items-center justify-center rounded-lg border border-gray-300 mr-3"
            >
              <Text className="text-gray-900 font-medium text-base">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={loading}
              className={`flex-1 py-3 items-center justify-center rounded-lg ${loading ? 'bg-blue-300' : 'bg-blue-600'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-medium text-base">
                  Save Changes
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
