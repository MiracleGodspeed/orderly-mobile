import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  Image,
  Platform
} from "react-native";
import { useState, useEffect } from "react";
import HeroSectionModal from "../components/HeroSectionModal";
import AboutSectionModal from "../components/AboutSectionModal";
import FeaturedProductsModal from "../components/FeaturedProductsModal";
import { SafeAreaView } from 'react-native-safe-area-context';
import Octicons from '@expo/vector-icons/Octicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import ContactUsSectionModal from "../components/ContactUsModal";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;


export default function ManageStoreScreen() {
    const navigation = useNavigation<ScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<"sections" | "branding">("sections");
  const [heroVisible, setHeroVisible] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFeaturedProductsModal, setShowFeaturedProductsModal] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [selectedTypography, setSelectedTypography] = useState<string>("Modern");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showContactUsModal, setShowContactUsModal] = useState(false);



  // Request permission once 
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

  return (
    <SafeAreaView className="bg-white flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center flex-1">
            <Pressable className="mr-3" onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <Text className="text-lg font-medium text-gray-900">My Store</Text>
          </View>
          
          <View className="flex-row items-center">
            <Pressable className="mr-3">
              <Text className="text-blue-600 font-medium text-base">Preview Store</Text>
            </Pressable>
            <Pressable>
              <MaterialIcons name="more-vert" size={24} color="#000" />
            </Pressable>
          </View>
        </View>
        <View className="flex-row border-b border-gray-200">
          <Pressable
            onPress={() => setActiveTab("sections")}
            className={`flex-1 flex-row items-center justify-center py-4 ${
              activeTab === "sections" ? "border-b-2 border-blue-600" : ""
            }`}
          >
            <Octicons 
              name="stack" 
              size={18} 
              color={activeTab === "sections" ? "#2563eb" : "#6b7280"} 
              style={{ marginRight: 6 }}
            />
            <Text className={activeTab === "sections" ? "text-blue-600 font-semibold" : "text-gray-500"}>
              Store Sections
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("branding")}
            className={`flex-1 flex-row items-center justify-center py-4 ${
              activeTab === "branding" ? "border-b-2 border-blue-600" : ""
            }`}
          >
            <MaterialIcons 
              name="palette" 
              size={18} 
              color={activeTab === "branding" ? "#2563eb" : "#6b7280"} 
              style={{ marginRight: 6 }}
            />
            <Text className={activeTab === "branding" ? "text-blue-600 font-semibold" : "text-gray-500"}>
              Branding
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <View className="flex-row items-center flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 mr-3">
            <Text className="text-gray-600 text-sm flex-1">mystore.orderly/preview</Text>
            <Pressable className="ml-2">
              <MaterialIcons name="content-copy" size={18} color="#6b7280" />
            </Pressable>
          </View>
          <Pressable className="bg-white border border-gray-300 rounded-lg px-4 py-2">
            <Text className="text-gray-900 font-medium text-sm">Visit Store</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 bg-gray-50">
          {activeTab === "sections" && (
            <View className="px-4 py-4">
              <View className="bg-white rounded-xl overflow-hidden">
                <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Hero Section" 
                  onPress={() => setHeroVisible(true)} 
                />
                <Divider />
                <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="About Us" 
                  onPress={() => setShowAboutModal(true)}
                />
                <Divider />
                <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Featured Products" 
                  onPress={() => setShowFeaturedProductsModal(true)}
                />
                <Divider />
                <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Contact Us" 
                  onPress={() => setShowContactUsModal(true)}
                />
              </View>
            </View>
          )}

          {activeTab === "branding" && (
            <View className="px-4 py-4">
              <Text className="text-sm text-gray-700 mb-3">Store Logo</Text>
              <Pressable 
                onPress={pickLogo}
                className="bg-white rounded-xl p-8 mb-6 items-center justify-center border border-gray-200"
              >
                {logo ? (
                  <Image 
                    source={{ uri: logo }} 
                    className="w-24 h-24 rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <MaterialIcons name="image" size={48} color="#d1d5db" />
                    <Text className="text-gray-500 text-sm mt-3">Upload your Logo</Text>
                  </>
                )}
              </Pressable>

              <Text className="text-sm text-gray-700 mb-3">Brand Colors</Text>
              <View className="bg-white rounded-xl p-4 mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-12 h-12 rounded-lg bg-blue-500 mr-4" />
                  <View className="flex-1">
                    <Text className="text-base text-gray-900 font-medium mb-1">Primary</Text>
                    <Text className="text-sm text-gray-500">#3b82f6</Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-lg bg-gray-800 mr-4" />
                  <View className="flex-1">
                    <Text className="text-base text-gray-900 font-medium mb-1">Secondary</Text>
                    <Text className="text-sm text-gray-500">#3b82f6</Text>
                  </View>
                </View>
              </View>

              <Text className="text-sm text-gray-700 mb-3">Typography</Text>
              <View className="bg-white rounded-xl p-4 mb-6">
                <View className="flex-row flex-wrap">
                  <Pressable 
                    onPress={() => setSelectedTypography("Modern")}
                    className={`${
                      selectedTypography === "Modern" 
                        ? "border-2 border-blue-600" 
                        : "border border-gray-300"
                    } rounded-lg px-6 py-3 mr-3 mb-3`}
                  >
                    <Text className={`${
                      selectedTypography === "Modern" 
                        ? "text-blue-600" 
                        : "text-gray-700"
                    } font-medium`}>Modern</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => setSelectedTypography("Classic")}
                    className={`${
                      selectedTypography === "Classic" 
                        ? "border-2 border-blue-600" 
                        : "border border-gray-300"
                    } rounded-lg px-6 py-3 mr-3 mb-3`}
                  >
                    <Text className={`${
                      selectedTypography === "Classic" 
                        ? "text-blue-600" 
                        : "text-gray-700"
                    } font-medium`}>Classic</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => setSelectedTypography("Elegant")}
                    className={`${
                      selectedTypography === "Elegant" 
                        ? "border-2 border-blue-600" 
                        : "border border-gray-300"
                    } rounded-lg px-6 py-3 mr-3 mb-3`}
                  >
                    <Text className={`${
                      selectedTypography === "Elegant" 
                        ? "text-blue-600" 
                        : "text-gray-700"
                    } font-medium`}>Elegant</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => setSelectedTypography("Bold")}
                    className={`${
                      selectedTypography === "Bold" 
                        ? "border-2 border-blue-600" 
                        : "border border-gray-300"
                    } rounded-lg px-6 py-3 mb-3`}
                  >
                    <Text className={`${
                      selectedTypography === "Bold" 
                        ? "text-blue-600" 
                        : "text-gray-700"
                    } font-medium`}>Bold</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View className="px-4 py-3 bg-white border-t border-gray-200 mb-10">
          <Pressable className="bg-blue-600 rounded-xl py-4 items-center">
            <Text className="text-white font-semibold text-base">Publish Store</Text>
          </Pressable>
        </View>

        <HeroSectionModal
          visible={heroVisible}
          onClose={() => setHeroVisible(false)}
        />
        <AboutSectionModal
          visible={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />
        <FeaturedProductsModal
          visible={showFeaturedProductsModal}
          onClose={() => setShowFeaturedProductsModal(false)}
        />
        <ContactUsSectionModal
          visible={showContactUsModal}
          onClose={() => setShowContactUsModal(false)}
        />
      </View>
    </SafeAreaView>
  );
}

function SectionItem({
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-4"
    >
      <View className="flex-row items-center flex-1">
        {icon}
        <Text className="text-base text-gray-900 ml-3">{title}</Text>
      </View>
      <MaterialIcons name="visibility" size={20} color="#9ca3af" />
    </Pressable>
  );
}

function Divider() {
  return <View className="h-px bg-gray-200 mx-4" />;
}