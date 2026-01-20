import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  Switch,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import AntDesign from '@expo/vector-icons/AntDesign';
import { HeroItem, useVendor } from "../../context/VendorContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialData?: HeroItem[];
}

export default function HeroSectionModal({ visible, onClose, initialData }: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [slides, setSlides] = useState<HeroItem[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible && initialData && Array.isArray(initialData)) {
      if (initialData.length > 0) {
        setSlides([...initialData]);
      } else {
        setSlides([{ title: "", subTitle: "", slideImage: null }]);
      }
    } else if (visible && (!initialData || initialData.length === 0)) {
      setSlides([{ title: "", subTitle: "", slideImage: null }]);
    }
  }, [visible, initialData]);

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

  const pickImage = async (index: number) => {
    if (hasPermission === false) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7, // Reduced quality slightly to help size
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      console.log("Hero Image Size:", asset.fileSize);

      // File size validation (2MB = 2097152 bytes)
      if (asset.fileSize && asset.fileSize > 2097152) {
        alert("Image size exceeds 2MB. Please upload a smaller image.");
        return;
      }

      const imageSource = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;

      updateSlide(index, { slideImage: imageSource });
    }
  };

  const updateSlide = (index: number, updates: Partial<HeroItem>) => {
    setSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...updates } : slide))
    );
  };

  const addSlide = () => {
    setSlides((prev) => [...prev, { title: "", subTitle: "", slideImage: null }]);
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const removeImage = (index: number) => {
    updateSlide(index, { slideImage: null });
  };

  const handleSave = async () => {
    if (!storeData) return;

    try {
      const updatedStoreFrontJson = {
        ...storeData.storeFrontJson,
        heroArr: slides,
      };

      await updateVendorSettings({
        storeFrontJson: updatedStoreFrontJson,
      });
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
    }
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
        <View className="h-[85%] bg-white rounded-t-3xl">
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <Text className="text-base font-semibold">Hero Section</Text>
            <Pressable onPress={onClose}>
              <AntDesign name="close" size={24} color="black" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-4">
            {slides.map((slide, index) => (
              <View key={index} className="mb-8 p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Slide {index + 1}
                  </Text>
                  {slides.length > 1 && (
                    <Pressable onPress={() => removeSlide(index)}>
                      <Text className="text-red-500 font-medium text-sm">Remove Slide</Text>
                    </Pressable>
                  )}
                </View>

                <Text className="text-sm text-gray-700 mb-2">Image</Text>
                <Pressable
                  onPress={slide.slideImage ? undefined : () => pickImage(index)}
                  className="h-40 border border-dashed border-gray-300 rounded-xl items-center justify-center mb-6 overflow-hidden relative bg-white"
                >
                  {slide.slideImage ? (
                    <>
                      <Image
                        source={{ uri: slide.slideImage }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                      >
                        <AntDesign name="close" size={20} color="white" />
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <AntDesign name="plus" size={24} color="#9ca3af" />
                      <Text className="text-gray-400 mt-2">
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
                  value={slide.title}
                  onChangeText={(text) => updateSlide(index, { title: text })}
                  className="border border-gray-300 rounded-lg px-3 py-3 mb-4 bg-white"
                  placeholder="Enter heading"
                />

                <Text className="text-sm text-gray-700 mb-2">Subheading</Text>
                <TextInput
                  value={slide.subTitle}
                  onChangeText={(text) => updateSlide(index, { subTitle: text })}
                  className="border border-gray-300 rounded-lg px-3 py-3 mb-2 bg-white"
                  placeholder="Enter subheading"
                  multiline
                />
              </View>
            ))}

            <Pressable
              onPress={addSlide}
              className="border border-dashed border-blue-400 rounded-lg py-4 items-center mb-6 bg-blue-50/30"
            >
              <Text className="text-blue-600 font-medium">
                ＋ Add Hero Slide
              </Text>
            </Pressable>

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
