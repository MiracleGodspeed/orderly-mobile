import {
  Modal,
  View,
  Text,
  Pressable,
  Image,
  Platform
} from "react-native";
import { useState, useEffect } from "react";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from "expo-image-picker";
import AntDesign from '@expo/vector-icons/AntDesign';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function StoreLogoModal({ visible, onClose }: Props) {
  const [logo, setLogo] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          const request = await ImagePicker.requestMediaLibraryPermissionsAsync();
          setHasPermission(request.status === "granted");
        } else {
          setHasPermission(true);
        }
      }
    })();
  }, []);

  const pickLogo = async () => {
    if (hasPermission === false) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      setLogo(result.assets[0].uri);
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
      animationType="slide"
      transparent
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-2xl px-4 pt-4 pb-6 h-[50%]">
          
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-base font-semibold">Store Logo</Text>
            <Pressable>
             <AntDesign name="close" size={24} color="black" onPress={onClose}/>
            </Pressable>
          </View>

          <View className="pt-6">
            <Text className="text-sm text-gray-700 mb-3">Select a transparent logo for your store front.</Text>
            <Pressable 
              onPress={pickLogo}
              className="bg-white rounded-xl p-12 items-center justify-center border border-gray-200"
            >
              {logo ? (
                <Image 
                  source={{ uri: logo }} 
                  className="w-32 h-32 rounded-lg"
                  resizeMode="cover"
                />
              ) : (
                <>
                  <MaterialIcons name="image" size={64} color="#d1d5db" />
                  <Text className="text-gray-500 text-sm mt-3">Upload your Logo</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Recommended: 512 × 512 px
                  </Text>
                </>
              )}
            </Pressable>
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
    </Modal>
  );
}