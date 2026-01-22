import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVendor } from "../../context/VendorContext";
import { getBanks, validateAccount } from "../api/vendor/vendor.api";
import { Bank } from "../api/vendor/vendor.types";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { height } = Dimensions.get('window');

export default function PayoutSettings() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { storeData, updateVendorSettings } = useVendor();

  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState(storeData?.accountNumber || '');
  const [accountName, setAccountName] = useState(storeData?.accountName || '');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Bank Selection Modal
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBanks();
  }, []);

  useEffect(() => {
    if (storeData?.bank && banks.length > 0) {
      const foundBank = banks.find(b => b.name === storeData.bank);
      if (foundBank) setSelectedBank(foundBank);
    }
  }, [storeData?.bank, banks]);

  const fetchBanks = async () => {
    try {
      const bankList = await getBanks();
      setBanks(bankList);
    } catch (error) {
      console.error('Error fetching banks:', error);
    }
  };

  const handleValidateAccount = async () => {
    if (!selectedBank || !accountNumber || accountNumber.length < 10) return;

    try {
      setIsValidating(true);
      const data = await validateAccount(selectedBank.code, accountNumber);
      setAccountName(data.accountName);
    } catch (error: any) {
      console.error('Error validating account:', error);
      alert(error.message || 'Could not validate account. Please check the details.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    if (!selectedBank || !accountNumber || !accountName) return;

    try {
      setIsSaving(true);
      await updateVendorSettings({
        bank: selectedBank.name,
        accountNumber: accountNumber,
        accountName: accountName,
      });
      alert('Payment settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
      alert(error.message || 'Failed to save payment settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBanks = banks.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="bg-white px-5 py-4 flex-row items-center justify-between border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.openDrawer?.() || navigation.goBack()}>
          <Ionicons name="menu-outline" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#1e293b] flex-1 text-center">
          {storeData?.storeName}
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mt-6 bg-[#ebf5ff] mx-5 rounded-2xl p-6 flex-row items-center">
          <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
            <Ionicons name="card" size={24} color="#2563eb" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-xl font-bold text-[#1e293b]">Payment Settings</Text>
            <Text className="text-sm text-gray-500">Configure your payment methods</Text>
          </View>
        </View>

        {/* Form Body */}
        <View className="bg-white mx-5 mt-6 rounded-2xl border border-gray-100 p-6 shadow-sm mb-10">
          <Text className="text-base font-bold text-[#334155] mb-6">Bank Account Details</Text>

          {/* Bank Dropdown */}
          <View className="mb-5">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Bank</Text>
            <TouchableOpacity
              onPress={() => setBankModalVisible(true)}
              className="flex-row items-center justify-between border border-gray-200 rounded-xl px-4 py-3 bg-white"
            >
              <Text className={`text-base flex-1 ${selectedBank ? 'text-gray-900' : 'text-gray-400'}`}>
                {selectedBank ? selectedBank.name : 'Select your bank'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View className="mb-5">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Account Number</Text>
            <View className="flex-row items-center gap-3">
              <TextInput
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                placeholder="6801320832"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>
            <TouchableOpacity
              onPress={handleValidateAccount}
              disabled={!selectedBank || accountNumber.length < 10 || isValidating}
              className={`mt-4 self-start bg-[#2563eb] px-5 py-2.5 rounded-lg flex-row items-center ${(!selectedBank || accountNumber.length < 10 || isValidating) ? 'opacity-50' : ''}`}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-bold text-sm">Validate Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mb-8">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Account Name</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 font-bold"
              editable={false}
              placeholder="ACCOUNT NAME"
              placeholderTextColor="#94a3b8"
              value={accountName}
            />
          </View>

          <TouchableOpacity
            onPress={handleSavePaymentSettings}
            disabled={!selectedBank || !accountNumber || !accountName || isSaving}
            className={`flex-row items-center justify-center bg-[#2563eb] rounded-xl py-4 shadow-lg shadow-blue-200 ${(!selectedBank || !accountNumber || !accountName || isSaving) ? 'opacity-50' : ''}`}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="white" />
                <Text className="ml-2 text-white font-bold text-base">Save Payment Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View className="py-10 items-center justify-center">
          <Text className="text-sm text-gray-400">
            {storeData?.storeName} 2026 | powered by <Text className="font-bold">orderly</Text>
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={bankModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl h-[80%]">
            <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-900">Select Bank</Text>
              <TouchableOpacity onPress={() => setBankModalVisible(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </TouchableOpacity>
            </View>

            <View className="p-4">
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2">
                <Ionicons name="search-outline" size={20} color="#94a3b8" />
                <TextInput
                  className="flex-1 ml-3 h-10 text-base"
                  placeholder="Search banks..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <ScrollView className="flex-1 px-4">
              {filteredBanks.map((bank) => (
                <TouchableOpacity
                  key={bank.code}
                  onPress={() => {
                    setSelectedBank(bank);
                    setBankModalVisible(false);
                    setSearchQuery('');
                  }}
                  className={`py-4 px-2 border-b border-gray-50 flex-row items-center justify-between ${selectedBank?.code === bank.code ? 'bg-blue-50 rounded-xl' : ''}`}
                >
                  <Text className={`text-base ${selectedBank?.code === bank.code ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
                    {bank.name}
                  </Text>
                  {selectedBank?.code === bank.code && (
                    <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
                  )}
                </TouchableOpacity>
              ))}
              {filteredBanks.length === 0 && (
                <View className="items-center justify-center py-20">
                  <Text className="text-gray-400 italic">No banks found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}