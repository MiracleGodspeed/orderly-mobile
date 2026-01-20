import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Switch,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import AntDesign from '@expo/vector-icons/AntDesign';
import { useVendor } from "../../context/VendorContext";


interface Props {
  visible: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialBody?: string;
}

export default function AboutSectionModal({ visible, onClose, initialTitle, initialBody }: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (visible) {
      setHeading(initialTitle || "");
      setSubheading(initialBody || "");
    }
  }, [visible, initialTitle, initialBody]);

  const handleSave = async () => {
    if (!storeData) return;
    try {
      const updatedStoreFrontJson = {
        ...storeData.storeFrontJson,
        aboutTitle: heading,
        aboutBody: subheading,
      };
      await updateVendorSettings({ storeFrontJson: updatedStoreFrontJson });
      onClose();
    } catch (e) {
      console.error("Failed to save about section:", e);
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
        <View className="bg-white rounded-t-3xl h-[85%]">

          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-base font-semibold">About Section</Text>
            <Pressable onPress={onClose}>
              <AntDesign name="close" size={24} color="black" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-6">
            <Text className="text-sm text-gray-700 mb-2">Heading</Text>
            <TextInput
              value={heading}
              onChangeText={setHeading}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-4 bg-white"
              placeholder="Enter heading"
            />

            <Text className="text-sm text-gray-700 mb-2">Subheading</Text>
            <TextInput
              value={subheading}
              onChangeText={setSubheading}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-6 bg-white min-h-[100px]"
              placeholder="Enter subheading"
              multiline
              textAlignVertical="top"
            />

            {/* <View className="flex-row items-center gap-3 mb-10">
              <Switch value={enabled} onValueChange={setEnabled} />
              <Text className="text-gray-900">Show on Homepage</Text>
            </View> */}
          </ScrollView>

          <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-6 bg-white">
            <Pressable
              onPress={handleCancel}
              className="flex-1 py-4 items-center justify-center rounded-full border border-gray-300 mr-3"
            >
              <Text className="text-gray-900 font-medium text-base">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={loading}
              className={`flex-1 py-4 items-center justify-center rounded-full ${loading ? 'bg-blue-300' : 'bg-blue-600'}`}
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
