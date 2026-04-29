import { View, Text, Pressable, Platform, Alert } from "react-native";
import { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVendor } from "../../context/VendorContext";
import { BottomSheet, BottomSheetFooter } from "./BottomSheet";
import { AppImage } from "./AppImage";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialLogo?: string | null;
}

export default function StoreLogoModal({
  visible,
  onClose,
  initialLogo,
}: Props) {
  const { updateVendorSettings, storeData, loading } = useVendor();
  const [logo, setLogo] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible) {
      setLogo(initialLogo ?? null);
    }
  }, [visible, initialLogo]);

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

  const pickLogo = async () => {
    if (hasPermission === false) return;
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
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
      setLogo(imageSource);
    }
  };

  const handleRemove = () => {
    if (Platform.OS === "ios") {
      Haptics.selectionAsync().catch(() => {});
    }
    setLogo(null);
  };

  const handleSave = async () => {
    if (!storeData) return;
    try {
      await updateVendorSettings({ logoUrl: logo });
      onClose();
    } catch (e) {
      console.error("Failed to save logo:", e);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Store Logo"
      subtitle="Upload your brand mark — used across your storefront"
      height={520}
    >
      <View className="px-5 pt-4">
        <Pressable
          onPress={pickLogo}
          className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/70 items-center justify-center overflow-hidden"
          style={{ height: 220 }}
        >
          {logo ? (
            <View className="w-full h-full">
              <AppImage
                uri={logo}
                contentFit="contain"
                style={{ width: "100%", height: "100%" }}
              />
              <View className="absolute bottom-2 right-2 flex-row gap-2">
                <Pressable
                  onPress={pickLogo}
                  className="bg-white/95 px-3 h-8 rounded-full flex-row items-center gap-1.5"
                  hitSlop={4}
                >
                  <Ionicons name="refresh-outline" size={14} color="#374151" />
                  <Text className="text-[11px] font-bold text-gray-800">
                    Replace
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleRemove}
                  className="bg-white/95 w-8 h-8 rounded-full items-center justify-center"
                >
                  <Ionicons name="trash-outline" size={14} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View className="items-center px-6">
              <View className="w-16 h-16 rounded-2xl bg-blue-50 items-center justify-center mb-3">
                <Ionicons name="cloud-upload-outline" size={28} color="#2563eb" />
              </View>
              <Text className="text-[15px] font-bold text-gray-900">
                Upload your logo
              </Text>
              <Text className="text-[12px] text-gray-500 mt-1 text-center">
                512 × 512 recommended · transparent PNG works best
              </Text>
            </View>
          )}
        </Pressable>

        {/* Quick tips */}
        <View className="mt-5 gap-2">
          {[
            { icon: "checkmark-circle", text: "Use a square image" },
            { icon: "checkmark-circle", text: "Transparent background preferred" },
            { icon: "checkmark-circle", text: "Keep file size under 2MB" },
          ].map((tip) => (
            <View key={tip.text} className="flex-row items-center gap-2">
              <Ionicons
                name={tip.icon as any}
                size={14}
                color="#10b981"
              />
              <Text className="text-[12.5px] text-gray-600">{tip.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="flex-1" />

      <BottomSheetFooter
        onCancel={onClose}
        onSave={handleSave}
        loading={loading}
      />
    </BottomSheet>
  );
}
