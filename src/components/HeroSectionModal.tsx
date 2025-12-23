import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  Switch,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import AntDesign from '@expo/vector-icons/AntDesign';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function HeroSectionModal({ visible, onClose }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [heading, setHeading] = useState("");
  const [subheading, setSubheading] = useState(
    ""
  );
  const [enabled, setEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Ask for permission ONCE (prevents iOS + Hermes crash) 
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.getMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          const request =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          setHasPermission(request.status === "granted");
        } else {
          setHasPermission(true);
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    if (hasPermission === false) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="h-[75%] bg-white rounded-t-3xl">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            

            <Text className="text-base font-semibold">Hero Section</Text>

            <Pressable>
             <AntDesign name="close" size={24} color="black" onPress={onClose}/>
            </Pressable>
          </View>

          <View className="px-4 pt-6">
            <Text className="text-sm text-gray-700 mb-2">Image</Text>

            <Pressable
              onPress={pickImage}
              className="h-40 border border-dashed border-gray-300 rounded-xl items-center justify-center mb-6 overflow-hidden"
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <>
                  <Text className="text-gray-400">
                    Upload a banner image
                  </Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    1200 × 600 recommended
                  </Text>
                </>
              )}
            </Pressable>

            <Text className="text-sm text-gray-700 mb-2">Heading</Text>
            <TextInput
              value={heading}
              onChangeText={setHeading}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
              placeholder="Enter heading"
            />

            <Text className="text-sm text-gray-700 mb-2">Subheading</Text>
            <TextInput
              value={subheading}
              onChangeText={setSubheading}
              className="border border-gray-300 rounded-lg px-3 py-3 mb-6"
              placeholder="Enter subheading"
            />

            <Pressable className="border border-dashed border-blue-400 rounded-lg py-4 items-center mb-6">
              <Text className="text-blue-600 font-medium">
                ＋ Add Hero Slide
              </Text>
            </Pressable>

            <View className="flex-row items-center gap-3">
              <Switch value={enabled} onValueChange={setEnabled} />
                
              <Text className="text-gray-900">Show on Homepage</Text>
            </View>
            <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-10 mt-5">
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
      </View>
    </Modal>
  );
}
