import {
  Modal,
  View,
  Text,
  Pressable,
} from "react-native";
import { useState } from "react";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BrandAssetsModal({ visible, onClose }: Props) {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#1f2937");
type SelectedColor = "primary" | "secondary" | null;

  const [selectedColor, setSelectedColor] = useState<SelectedColor>(null);

   const handleSave = () => {
    onClose();
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
            <Pressable>
             <AntDesign name="close" size={24} color="black" onPress={onClose}/>
            </Pressable>
          </View>

          <View className="pt-6">
            <Text className="text-sm text-gray-700 mb-3">Brand Colors</Text>
            
            <Pressable onPress={() => setSelectedColor("primary")}
              className={`flex-row items-center mb-4 p-4 bg-gray-50 rounded-lg ${
                selectedColor === "primary" ? "border-2 border-blue-600" : "border border-transparent"
              }`}>
              <View 
                className="w-16 h-16 rounded-lg mr-4"
                style={{ backgroundColor: primaryColor }}
              />
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium mb-1">Primary</Text>
                <Text className="text-sm text-gray-500">{primaryColor}</Text>
              </View>
              {/* <Pressable className="p-2">
                <MaterialIcons name="edit" size={20} color="#6b7280" />
              </Pressable> */}
            </Pressable>

            <Pressable onPress={() => setSelectedColor("secondary")}
              className={`flex-row items-center p-4 bg-gray-50 rounded-lg ${
                selectedColor === "secondary" ? "border-2 border-blue-600" : "border border-transparent"
              }`}>
              <View 
                className="w-16 h-16 rounded-lg mr-4"
                style={{ backgroundColor: secondaryColor }}
              />
              <View className="flex-1">
                <Text className="text-base text-gray-900 font-medium mb-1">Secondary</Text>
                <Text className="text-sm text-gray-500">{secondaryColor}</Text>
              </View>
              {/* <Pressable className="p-2">
                <MaterialIcons name="edit" size={20} color="#6b7280" />
              </Pressable> */}
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
              className="flex-1 py-3 items-center justify-center rounded-full bg-blue-600"
            >
              <Text className="text-white font-medium text-base">Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}