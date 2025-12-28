import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  Image,
  Platform,
  Linking
} from "react-native";
import { useState, useEffect } from "react";
import HeroSectionModal from "../components/HeroSectionModal";
import AboutSectionModal from "../components/AboutSectionModal";
import FeaturedProductsModal from "../components/FeaturedProductsModal";
import StoreLogoModal from "../components/StoreLogoModal";
import TypographyModal from "../components/TypographyModal";
import BrandAssetsModal from "../components/BrandAssetsModal";
import ThemeLayoutModal from "../components/ThemeAndLayout";

import { SafeAreaView } from 'react-native-safe-area-context';
import Octicons from '@expo/vector-icons/Octicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import ContactUsSectionModal from "../components/ContactUsModal";
import { useVendor } from '../../context/VendorContext';

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
  const [showTypographyModal, setShowTypographyModal] = useState(false);
  const [showBrandAssetsModal, setShowBrandAssetsModal] = useState(false);
  const [showStoreLogoModal, setShowStoreLogoModal] = useState(false);
  const [showThemeLayoutModal, setShowThemeLayoutModal] = useState(false);
    const { storeData, checklistItems } = useVendor()



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

  // const pickLogo = async () => {
  //   if (hasPermission === false) return;

  //   const result = await ImagePicker.launchImageLibraryAsync({
  //     mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     quality: 0.9,
  //     allowsEditing: true,
  //     aspect: [1, 1],
  //   });

  //   if (!result.canceled && result.assets.length > 0) {
  //     setLogo(result.assets[0].uri);
  //   }
  // };

  const openStoreFrontLink = () => {
    if (storeData?.slugUrl) {

      //const url = `http://${storeData.slugUrl}.localhost:3000/`;//dev
      const url = `https://${storeData.slugUrl}.orderlystores.com/`;//prod

      Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }
  }

  return (
    <SafeAreaView className="bg-white flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center flex-1">
            <Pressable className="mr-3" onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <Text className="text-lg font-medium text-gray-900">Manage Store</Text>
          </View>
          
          <View className="flex-row items-center">
            <Pressable 
              className="mr-3"
              onPress={() => openStoreFrontLink()}
            >
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
              <View className="bg-white rounded-xl overflow-hidden ">
                <View className="border border-gray-300 rounded p-1 mb-2">
                  <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Hero Section" 
                  onPress={() => setHeroVisible(true)} 
                />
                </View>
                {/* <Divider /> */}
               <View className="border border-gray-300 p-1 mb-2 rounded">
                 <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="About Us" 
                  onPress={() => setShowAboutModal(true)}
                />
               </View>
                {/* <Divider /> */}
                {/* <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Featured Products" 
                  onPress={() => setShowFeaturedProductsModal(true)}
                /> */}
                {/* <Divider /> */}
                <View className="border border-gray-300 p-1 mb-2 rounded">
                  <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Contact Us" 
                  onPress={() => setShowContactUsModal(true)}
                />
                </View>
              </View>
            </View>
          )}

          {activeTab === "branding" && (
             <View className="px-4 py-4">
              <View className="bg-white rounded-xl overflow-hidden">
                <View className="border border-gray-300 p-1 mb-2 rounded">
                  <SectionItem 
                
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Theme & Layout" 
                  onPress={() => setShowThemeLayoutModal(true)} 
                />
                </View>
                {/* <Divider /> */}
                <View className="border border-gray-300 p-1 mb-2 rounded">
                  <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Store Logo" 
                  onPress={() => setShowStoreLogoModal(true)}
                />
                </View>
                {/* <Divider /> */}
                <View className="border border-gray-300 p-1 mb-2 rounded">
                  <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Brand Assets" 
                  onPress={() => setShowBrandAssetsModal(true)}
                />
                </View>
                {/* <Divider /> */}
                {/* <SectionItem 
                  icon={<MaterialIcons name="drag-indicator" size={20} color="#d1d5db" />}
                  title="Typography" 
                  onPress={() => setShowTypographyModal(true)}
                /> */}
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
        {/* <FeaturedProductsModal
          visible={showFeaturedProductsModal}
          onClose={() => setShowFeaturedProductsModal(false)}
        /> */}
        <ContactUsSectionModal
          visible={showContactUsModal}
          onClose={() => setShowContactUsModal(false)}
        />
        {/* <TypographyModal
          visible={showTypographyModal}
          onClose={() => setShowTypographyModal(false)}
        /> */}
        <BrandAssetsModal
          visible={showBrandAssetsModal}
          onClose={() => setShowBrandAssetsModal(false)}
        />
        <StoreLogoModal
          visible={showStoreLogoModal}
          onClose={() => setShowStoreLogoModal(false)}
        />
        <ThemeLayoutModal
          visible={showThemeLayoutModal}
          onClose={() => setShowThemeLayoutModal(false)}
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