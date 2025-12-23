import {
  Modal,
  View,
  Text,
  Pressable,
} from "react-native";
import { useState } from "react";
import AntDesign from '@expo/vector-icons/AntDesign';


interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TypographyModal({ visible, onClose }: Props) {
  const [selectedTypography, setSelectedTypography] = useState<string>("Modern");

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
        <View className="bg-white rounded-t-2xl px-4 pt-4 pb-6 h-[45%]">
         
           <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
                <Text className="text-base font-semibold">Typography</Text>

            <Pressable>
             <AntDesign name="close" size={24} color="black" onPress={onClose}/>
            </Pressable>
          </View>


          <View className="pt-6">
            <Text className="text-sm text-gray-700 mb-3">Select Font Style</Text>
            
            <View className="flex-row flex-wrap">
              <Pressable 
                onPress={() => setSelectedTypography("Modern")}
                className={`${
                  selectedTypography === "Modern" 
                    ? "border-2 border-blue-600" 
                    : "border border-gray-300"
                } rounded-lg px-8 py-4 mr-3 mb-3`}
              >
                <Text className={`${
                  selectedTypography === "Modern" 
                    ? "text-blue-600" 
                    : "text-gray-700"
                } font-medium text-base`}>Modern</Text>
              </Pressable>

              <Pressable 
                onPress={() => setSelectedTypography("Classic")}
                className={`${
                  selectedTypography === "Classic" 
                    ? "border-2 border-blue-600" 
                    : "border border-gray-300"
                } rounded-lg px-8 py-4 mr-3 mb-3`}
              >
                <Text className={`${
                  selectedTypography === "Classic" 
                    ? "text-blue-600" 
                    : "text-gray-700"
                } font-medium text-base`}>Classic</Text>
              </Pressable>

              <Pressable 
                onPress={() => setSelectedTypography("Elegant")}
                className={`${
                  selectedTypography === "Elegant" 
                    ? "border-2 border-blue-600" 
                    : "border border-gray-300"
                } rounded-lg px-8 py-4 mr-3 mb-3`}
              >
                <Text className={`${
                  selectedTypography === "Elegant" 
                    ? "text-blue-600" 
                    : "text-gray-700"
                } font-medium text-base`}>Elegant</Text>
              </Pressable>

              <Pressable 
                onPress={() => setSelectedTypography("Bold")}
                className={`${
                  selectedTypography === "Bold" 
                    ? "border-2 border-blue-600" 
                    : "border border-gray-300"
                } rounded-lg px-8 py-4 mb-3`}
              >
                <Text className={`${
                  selectedTypography === "Bold" 
                    ? "text-blue-600" 
                    : "text-gray-700"
                } font-medium text-base`}>Bold</Text>
              </Pressable>
            </View>
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