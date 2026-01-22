import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Clipboard,
  Alert,
  TouchableOpacity
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useVendor } from "../../context/VendorContext";


type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StoreInformation() {

  const navigation = useNavigation<ScreenNavigationProp>();
  const { storeData } = useVendor();

  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    if (storeData) {
      setStoreName(storeData.storeName || '');
      setStoreUrl(storeData.slugUrl ? `https://${storeData.slugUrl}.orderlystores.com` : '');
      setBusinessCategory(storeData.isServiceBased ? 'Service Based' : 'Product Based');
      setContactEmail(storeData.email || '');
      setBusinessAddress(storeData.address || '');
    }
  }, [storeData]);

  const handleCopyLink = () => {
    if (storeUrl) {
      Clipboard.setString(storeUrl);
      Alert.alert("Success", "Store link copied to clipboard");
    }
  };


  const handleFieldChange = (field: 'name' | 'category' | 'address', value: string) => {
    if (field === 'name') setStoreName(value);
    if (field === 'category') setBusinessCategory(value);
    if (field === 'address') setBusinessAddress(value);
  };

  const handleRequestChange = async () => {
    Alert.alert(
      "Request Change",
      "Are you sure you want to request these changes? They will be sent to the admin for approval.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            try {
              setIsSaving(true);

              await new Promise(resolve => setTimeout(resolve, 1500));
              Alert.alert("Success", "Your change request has been submitted and is pending admin approval.");
            } catch (error) {
              Alert.alert("Error", "Failed to submit request. Please try again.");
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Store Information</Text>

        {isSaving && (
          <View className="ml-auto">
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Store Name
          </Text>
          <TextInput
            value={storeName}
            onChangeText={(val) => handleFieldChange('name', val)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="Enter store name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Store URL
          </Text>
          <View className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 flex-row items-center justify-between">
            <Text className="text-base text-gray-500 flex-1 mr-2" numberOfLines={1} ellipsizeMode="middle">
              {storeUrl || "https://mystore.orderlystores.com"}
            </Text>
            <Pressable onPress={handleCopyLink}>
              <MaterialIcons name="content-copy" size={20} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Business Category
          </Text>
          <TextInput
            value={businessCategory}
            onChangeText={(val) => handleFieldChange('category', val)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="e.g. Electronics, Fashion, Food"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Contact Email
          </Text>
          <TextInput
            value={contactEmail}
            editable={false}
            className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-500"
            placeholder="contact@mystore.shop"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Business Address
          </Text>
          <TextInput
            value={businessAddress}
            onChangeText={(val) => handleFieldChange('address', val)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="123 Commerce St, San Francisco, CA"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        <View className="py-10">
          <TouchableOpacity
            onPress={handleRequestChange}
            disabled={isSaving}
            className={`bg-[#FFD700] py-4 rounded-xl items-center justify-center mb-6 ${isSaving ? 'opacity-50' : ''}`}
            style={{ backgroundColor: '#FCD34D' }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text className="text-gray-900 font-bold text-base">Request Change</Text>
            )}
          </TouchableOpacity>

          <View className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <Text className="text-center text-xs text-blue-800 leading-5">
              Please note: Changes to your store details are not effective immediately and are subject to verification and approval by the administration team.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}