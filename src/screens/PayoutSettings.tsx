import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  routingNumber: string;
  currency: string;
  payoutSchedule: string;
  isVerified: boolean;
}

export default function PayoutSettings() {
  const navigation = useNavigation<ScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editAccountHolder, setEditAccountHolder] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editRoutingNumber, setEditRoutingNumber] = useState('');
  const [editPayoutSchedule, setEditPayoutSchedule] = useState('');

  useEffect(() => {
    fetchBankAccount();
  }, []);

  const fetchBankAccount = async () => {
    try {
      setLoading(true);

     
      const mockAccount: BankAccount = {
        id: '1',
        bankName: 'Access Bank',
        accountNumber: '•••• •••• 1234',
        accountHolder: 'My Awesome Store LLC',
        routingNumber: '•••• 5678',
        currency: 'NGN',
        payoutSchedule: 'Weekly (Every Monday)',
        isVerified: true
      };

      setBankAccount(mockAccount);
    } catch (error) {
      console.error('Error fetching bank account:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load bank account details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = () => {
    if (!bankAccount) return;

    setEditAccountHolder(bankAccount.accountHolder);
    setEditAccountNumber(bankAccount.accountNumber.replace(/[•\s]/g, ''));
    setEditRoutingNumber(bankAccount.routingNumber.replace(/[•\s]/g, ''));
    setEditPayoutSchedule(bankAccount.payoutSchedule);

    setShowEditModal(true);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);

     
      if (bankAccount) {
        setBankAccount({
          ...bankAccount,
          accountHolder: editAccountHolder,
          accountNumber: `•••• •••• ${editAccountNumber.slice(-4)}`,
          routingNumber: `•••• ${editRoutingNumber.slice(-4)}`,
          payoutSchedule: editPayoutSchedule
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Bank account details updated',
      });

      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating bank account:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update bank account',
      });
    } finally {
      setSaving(false);
    }
  };

  const maskAccountNumber = (number: string) => {
    return number.replace(/\d(?=\d{4})/g, '•');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="bg-white flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Payout Settings</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="mx-4 mt-4 mb-4 bg-white rounded-2xl p-4 shadow-sm">
          
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-start flex-1">
              <View className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center mr-3">
                <MaterialIcons name="account-balance" size={24} color="#3b82f6" />
              </View>

              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  {bankAccount?.bankName}
                </Text>
                <Text className="text-sm text-gray-500">
                  Ending in {bankAccount?.accountNumber.slice(-4)}
                </Text>
              </View>
            </View>

            {bankAccount?.isVerified && (
              <View className="bg-green-100 px-2 py-1 rounded-full flex-row items-center">
                <MaterialIcons name="check-circle" size={14} color="#10b981" />
                <Text className="text-xs font-medium text-green-700 ml-1">
                  Verified
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row mb-4">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">CURRENCY</Text>
              <Text className="text-base text-gray-900 font-medium">
                {bankAccount?.currency}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">SCHEDULE</Text>
              <Text className="text-base text-gray-900 font-medium">
                {bankAccount?.payoutSchedule.split(' ')[0]}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleEditDetails}
            className="border-t border-gray-100 pt-4"
          >
            <Text className="text-center text-blue-600 font-medium">
              Edit Details
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
            <Pressable className="mr-3" onPress={() => setShowEditModal(false)}>
              <MaterialIcons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <Text className="text-lg font-medium text-gray-900">Payout Settings</Text>
          </View>

          <ScrollView className="flex-1">
            <View className="mx-4 mt-4 mb-4 bg-white rounded-2xl p-4 border border-gray-200">
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-row items-start flex-1">
                  <View className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center mr-3">
                    <MaterialIcons name="account-balance" size={24} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900 mb-1">
                      {bankAccount?.bankName}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      Ending in {bankAccount?.accountNumber.slice(-4)}
                    </Text>
                  </View>
                </View>
                {bankAccount?.isVerified && (
                  <View className="bg-green-100 px-2 py-1 rounded-full flex-row items-center">
                    <MaterialIcons name="check-circle" size={14} color="#10b981" />
                    <Text className="text-xs font-medium text-green-700 ml-1">
                      Verified
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">CURRENCY</Text>
                  <Text className="text-base text-gray-900 font-medium">
                    {bankAccount?.currency}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">SCHEDULE</Text>
                  <Text className="text-base text-gray-900 font-medium">
                    {bankAccount?.payoutSchedule.split(' ')[0]}
                  </Text>
                </View>
              </View>
            </View>

            <View className="px-4">
              <Text className="text-xs font-semibold text-gray-500 mb-4">
                BANK ACCOUNT DETAILS
              </Text>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  Account Holder Name
                </Text>
                <TextInput
                  value={editAccountHolder}
                  onChangeText={setEditAccountHolder}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base"
                  placeholder="Enter account holder name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  Account Number / IBAN
                </Text>
                <TextInput
                  value={editAccountNumber}
                  onChangeText={setEditAccountNumber}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base font-mono"
                  placeholder="•••• •••• 1234"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  Routing Number / SWIFT
                </Text>
                <TextInput
                  value={editRoutingNumber}
                  onChangeText={setEditRoutingNumber}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-base font-mono"
                  placeholder="•••• 5678"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  secureTextEntry
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  Payout Schedule
                </Text>
                <Pressable className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex-row items-center justify-between">
                  <Text className="text-base text-gray-900">
                    {editPayoutSchedule}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color="#6b7280" />
                </Pressable>
                <Text className="text-xs text-gray-500 mt-2">
                  Choose how often you want your earnings to be deposited.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View className="flex-row px-4 py-4 border-t border-gray-200">
            <Pressable
              onPress={() => setShowEditModal(false)}
              disabled={saving}
              className="flex-1 py-4 items-center justify-center rounded-xl border border-gray-300 mr-2"
            >
              <Text className="text-gray-900 font-medium">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSaveChanges}
              disabled={saving}
              className={`flex-1 py-4 items-center justify-center rounded-xl ml-2 ${
                saving ? 'bg-blue-400' : 'bg-blue-600'
              }`}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-medium">Save Changes</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}