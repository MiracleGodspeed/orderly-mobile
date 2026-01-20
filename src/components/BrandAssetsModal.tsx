import {
  Modal,
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import AntDesign from '@expo/vector-icons/AntDesign';
import { useVendor } from "../../context/VendorContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialPrimary?: string | null;
  initialSecondary?: string | null;
  initialAccent?: string | null;
}

export default function BrandAssetsModal({ visible, onClose, initialPrimary, initialSecondary, initialAccent }: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#1f2937");

  useEffect(() => {
    if (visible) {
      if (initialPrimary) setPrimaryColor(initialPrimary);
      if (initialSecondary) setSecondaryColor(initialSecondary);
    }
  }, [visible, initialPrimary, initialSecondary]);

  type SelectedColor = "primary" | "secondary" | null;
  const [selectedColor, setSelectedColor] = useState<SelectedColor>(null);

  const handleSave = async () => {
    if (!storeData) return;
    try {
      await updateVendorSettings({
        primaryColor,
        secondaryColor
      });
      onClose();
    } catch (e) {
      console.error("Failed to save brand assets:", e);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-2xl px-4 pt-4 pb-6 h-[50%]">

          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-base font-semibold">Brand Assets</Text>
            <Pressable onPress={onClose}>
              <AntDesign name="close" size={24} color="black" />
            </Pressable>
          </View>

          <View className="pt-6">
            <Text className="text-sm text-gray-700 mb-3">Brand Colors</Text>

            <Pressable onPress={() => setSelectedColor("primary")}
              className={`flex-row items-center mb-4 p-4 bg-gray-50 rounded-lg ${selectedColor === "primary" ? "border-2 border-blue-600" : "border border-transparent"
                }`}>
              <View
                className="w-16 h-16 rounded-lg mr-4"
                style={{ backgroundColor: primaryColor }}
              />
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium mb-1">Primary</Text>
                <Text className="text-sm text-gray-500">{primaryColor}</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => setSelectedColor("secondary")}
              className={`flex-row items-center p-4 bg-gray-50 rounded-lg ${selectedColor === "secondary" ? "border-2 border-blue-600" : "border border-transparent"
                }`}>
              <View
                className="w-16 h-16 rounded-lg mr-4"
                style={{ backgroundColor: secondaryColor }}
              />
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium mb-1">Secondary</Text>
                <Text className="text-sm text-gray-500">{secondaryColor}</Text>
              </View>
            </Pressable>

          </View>
          <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-5 mt-5">
            <Pressable
              onPress={handleCancel}
              className="flex-1 py-3 items-center justify-center rounded-full border border-gray-300 mr-3"
            >
              <Text className="text-gray-900 font-medium text-base">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={loading}
              className={`flex-1 py-3 items-center justify-center rounded-full ${loading ? 'bg-blue-300' : 'bg-blue-600'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-medium text-base">Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}