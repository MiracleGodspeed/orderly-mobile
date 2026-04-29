import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { HeroItem, useVendor } from "../../context/VendorContext";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";
import { AppImage } from "./AppImage";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialData?: HeroItem[];
}

const blankSlide = (): HeroItem => ({
  title: "",
  subTitle: "",
  slideImage: null,
});

export default function HeroSectionModal({
  visible,
  onClose,
  initialData,
}: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [slides, setSlides] = useState<HeroItem[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialData && Array.isArray(initialData) && initialData.length > 0) {
        setSlides([...initialData]);
      } else {
        setSlides([blankSlide()]);
      }
    }
  }, [visible, initialData]);

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
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 2097152) {
        Alert.alert(
          "Image too large",
          "Please choose an image smaller than 2MB."
        );
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
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setSlides((prev) => [...prev, blankSlide()]);
  };

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!storeData) return;
    try {
      const updatedStoreFrontJson = {
        ...storeData.storeFrontJson,
        heroArr: slides,
      };
      await updateVendorSettings({ storeFrontJson: updatedStoreFrontJson });
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Hero Section"
      subtitle="Showcase what visitors see first when they land"
      height="92%"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        {slides.map((slide, index) => (
          <View
            key={index}
            className="bg-white rounded-3xl border border-gray-100 mt-4 overflow-hidden"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-full bg-blue-50 items-center justify-center">
                  <Text className="text-[12px] font-extrabold text-blue-600">
                    {index + 1}
                  </Text>
                </View>
                <Text className="text-[13px] font-bold text-gray-900">
                  Slide {index + 1}
                </Text>
              </View>
              {slides.length > 1 && (
                <Pressable
                  onPress={() => removeSlide(index)}
                  className="flex-row items-center gap-1 px-2 py-1 rounded-full active:bg-rose-50"
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={14} color="#dc2626" />
                  <Text className="text-[12px] font-semibold text-rose-600">
                    Remove
                  </Text>
                </Pressable>
              )}
            </View>

            <View className="px-4 pb-4">
              {/* Image picker */}
              <Pressable
                onPress={() => pickImage(index)}
                className="rounded-2xl overflow-hidden bg-gray-50 border border-dashed border-gray-200 mb-4"
                style={{ aspectRatio: 16 / 9 }}
              >
                {slide.slideImage ? (
                  <View className="w-full h-full">
                    <AppImage
                      uri={slide.slideImage}
                      style={{ width: "100%", height: "100%" }}
                    />
                    <View className="absolute inset-0 bg-black/20" />
                    <View className="absolute bottom-2 right-2 flex-row gap-2">
                      <Pressable
                        onPress={() => pickImage(index)}
                        className="bg-white/95 px-2.5 h-8 rounded-full flex-row items-center gap-1.5"
                      >
                        <Ionicons
                          name="refresh-outline"
                          size={14}
                          color="#374151"
                        />
                        <Text className="text-[11px] font-bold text-gray-800">
                          Replace
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => updateSlide(index, { slideImage: null })}
                        className="bg-white/95 w-8 h-8 rounded-full items-center justify-center"
                      >
                        <Ionicons name="close" size={16} color="#dc2626" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="flex-1 items-center justify-center px-4">
                    <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-3">
                      <Ionicons
                        name="image-outline"
                        size={22}
                        color="#2563eb"
                      />
                    </View>
                    <Text className="text-[14px] font-semibold text-gray-900">
                      Upload banner image
                    </Text>
                    <Text className="text-[11.5px] text-gray-500 mt-1 text-center">
                      1200 × 600 recommended · Max 2MB
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Heading */}
              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2">
                Heading
              </Text>
              <TextInput
                value={slide.title}
                onChangeText={(text) => updateSlide(index, { title: text })}
                className="border border-gray-200 rounded-2xl px-4 h-12 mb-4 bg-white text-[15px] text-gray-900"
                placeholder="e.g. Premium Hair, Delivered Fast"
                placeholderTextColor="#9ca3af"
              />

              <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-[1.2px] mb-2">
                Subheading
              </Text>
              <TextInput
                value={slide.subTitle}
                onChangeText={(text) =>
                  updateSlide(index, { subTitle: text })
                }
                className="border border-gray-200 rounded-2xl px-4 py-3 bg-white text-[15px] text-gray-900"
                style={{ minHeight: 80, textAlignVertical: "top" }}
                placeholder="A short line that gets visitors curious enough to scroll"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>
          </View>
        ))}

        <Pressable
          onPress={addSlide}
          className="mt-5 h-14 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
          <Text className="text-[14px] font-bold text-blue-700">
            Add another slide
          </Text>
        </Pressable>
      </ScrollView>

      <BottomSheetFooter
        onCancel={onClose}
        onSave={handleSave}
        loading={loading}
      />
    </BottomSheet>
  );
}
