import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useState } from "react";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ContactUsSectionModal({ visible, onClose }: Props) {
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState(
    ""
  );
  const [buttonText, setButtonText] = useState("");

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
        <View className="bg-white rounded-t-2xl h-[60%]">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">

            <Text className="text-base font-semibold">Contact Us</Text>

            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#000" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-6">
            <Text className="text-sm text-gray-700 mb-2">Heading</Text>
            <TextInput
              value={heading}
              onChangeText={setHeading}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-4 text-base"
              placeholder="Enter heading"
            />

            <Text className="text-sm text-gray-700 mb-2">Subheading</Text>
            <TextInput
              value={subheading}
              onChangeText={setSubheading}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-4 text-base"
              placeholder="Enter subheading"
              multiline
              numberOfLines={2}
            />

            <Text className="text-sm text-gray-700 mb-2">Button Text (CTA)</Text>
            <TextInput
              value={buttonText}
              onChangeText={setButtonText}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-6 text-base"
              placeholder="Enter button text"
            />
          </ScrollView>

          <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-10">
            <Pressable 
              onPress={handleCancel}
              className="flex-1 py-3 items-center justify-center rounded-lg border border-gray-300 mr-3"
            >
              <Text className="text-gray-900 font-medium text-base">Cancel</Text>
            </Pressable>

            <Pressable 
              onPress={handleSave}
              className="flex-1 py-3 items-center justify-center rounded-lg bg-blue-600"
            >
              <Text className="text-white font-medium text-base">Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}