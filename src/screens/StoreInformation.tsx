import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  TextInput,
  ActivityIndicator
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useToast } from 'react-native-toast-notifications';


type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StoreInformation() {
     const toast = useToast();
  
  const navigation = useNavigation<ScreenNavigationProp>();
  const { vendor, updateVendorData } = useVendor();

  // ============ STATE MANAGEMENT ============
  // Local state for form fields - syncs with vendor context
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ============ POPULATE FIELDS FROM VENDOR CONTEXT ============
  // When component mounts or vendor data changes, populate the form
  useEffect(() => {
    if (vendor) {
      setStoreName(vendor.storeName || '');
      setStoreUrl(vendor.storeUrl || '');
      setBusinessCategory(vendor.businessCategory || '');
      setContactEmail(vendor.email || '');
      setBusinessAddress(vendor.businessAddress || '');
    }
  }, [vendor]);

  // ============ TRACK CHANGES ============
  // Marks that user has made edits (for auto-save indication)
  const handleFieldChange = (field: string, value: string) => {
    setHasChanges(true);
    
    switch(field) {
      case 'storeName':
        setStoreName(value);
        break;
      case 'storeUrl':
        setStoreUrl(value);
        break;
      case 'businessCategory':
        setBusinessCategory(value);
        break;
      case 'contactEmail':
        setContactEmail(value);
        break;
      case 'businessAddress':
        setBusinessAddress(value);
        break;
    }
  };

  // ============ AUTO-SAVE ON BLUR ============
  // Saves data when user finishes editing a field
  const handleFieldBlur = async () => {
    if (!hasChanges) return;

    try {
      setIsSaving(true);

      // Prepare updated vendor data
      const updatedData = {
        storeName,
        storeUrl,
        businessCategory,
        email: contactEmail,
        businessAddress
      };

      // Call API to update vendor information
      // await updateVendorData(updatedData);

      // Show success message silently (or you can skip this)
      // Changes are auto-saved, so no need for intrusive toast

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving store information:', error);
     toast.show( 'Failed to save changes. Please try again.', { type: 'danger' });

     
    } finally {
      setIsSaving(false);
    }
  };

  // ============ SAVE ON SCREEN LEAVE ============
  // Auto-saves when user navigates away from screen
  useEffect(() => {
    return () => {
      // Cleanup: save any pending changes when leaving screen
      if (hasChanges) {
        handleFieldBlur();
      }
    };
  }, [hasChanges]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ============ HEADER ============ */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Store Information</Text>
        
        {/* Loading indicator when saving */}
        {isSaving && (
          <View className="ml-auto">
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        {/* ============ STORE NAME FIELD ============ */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Store Name
          </Text>
          <TextInput
            value={storeName}
            onChangeText={(value) => handleFieldChange('storeName', value)}
            onBlur={handleFieldBlur}
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="Enter store name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* ============ STORE URL FIELD ============ */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Store URL
          </Text>
          <View className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex-row items-center">
            <Text className="text-gray-500 mr-1">https://</Text>
            <TextInput
              value={storeUrl}
              onChangeText={(value) => handleFieldChange('storeUrl', value)}
              onBlur={handleFieldBlur}
              className="flex-1 text-base text-gray-900"
              placeholder="mystore.shop"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* ============ BUSINESS CATEGORY FIELD ============ */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Business Category
          </Text>
          <TextInput
            value={businessCategory}
            onChangeText={(value) => handleFieldChange('businessCategory', value)}
            onBlur={handleFieldBlur}
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="e.g. Electronics, Fashion, Food"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* ============ CONTACT EMAIL FIELD ============ */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Contact Email
          </Text>
          <TextInput
            value={contactEmail}
            onChangeText={(value) => handleFieldChange('contactEmail', value)}
            onBlur={handleFieldBlur}
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="contact@mystore.shop"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* ============ BUSINESS ADDRESS FIELD ============ */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Business Address
          </Text>
          <TextInput
            value={businessAddress}
            onChangeText={(value) => handleFieldChange('businessAddress', value)}
            onBlur={handleFieldBlur}
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="123 Commerce St, San Francisco, CA"
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {/* ============ AUTO-SAVE INFO MESSAGE ============ */}
        <View className="py-6">
          <Text className="text-center text-sm text-gray-500">
            Changes are saved automatically when you leave this screen.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}