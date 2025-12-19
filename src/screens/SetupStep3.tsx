import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

import { RootStackParamList } from '../navigation/types';
import ProgressBar from '../components/ProgressBar';
import { useProgress } from '../../context/ProgressContext';
import { useVendor } from '../../context/VendorContext';
import { useAuth } from '../../context/AuthContext'; 
import { getCategories, submitVendorOnboarding } from '../api/vendor/vendor.api';
import CheckIcon from '../../assets/icons/check.svg';
import PlusIcon from '../../assets/icons/plus.svg';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface Category {
  id: number;
  name: string;
}

export default function SetupStep3() {
  const navigation = useNavigation<NavProp>();
  const { setProgress } = useProgress();
  const { user } = useAuth(); // dynamic storeId from logged-in user
  const { selectedCategories, toggleCategory, businessName, description, isServiceBased } = useVendor();

  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    setProgress(0.5);

    // fetch categories from API
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data); // data = array of {id, name}
      } catch (err) {
        console.log('Failed to fetch categories', err);
      }
    };

    fetchCategories();
  }, []);

  const isValid = selectedCategories.length > 0;

  const handleContinue = async () => {
    if (!isValid || isSettingUp) return;
    if (!user?.storeId) {
      console.log('Store ID not available!');
      return;
    }

    setModalVisible(true);
    setIsSettingUp(true);
    setProgress(1);

    try {
      const response = await submitVendorOnboarding({
        storeId: user.storeId, // dynamic
        businessName,
        description,
        isServiceBased: isServiceBased ?? false,
        applicableCategories: selectedCategories, // dynamic
      });

      console.log('VENDOR ONBOARDING RESPONSE:', response);

      setModalVisible(false);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err) {
      console.log('VENDOR ONBOARDING ERROR:', err);
      setModalVisible(false);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-6 flex-1">
        <ProgressBar />

        <Text className="text-2xl font-semibold mt-6">
          Choose your categories
        </Text>
        <Text className="text-[16px] text-[#6B7280] mt-2">
          Select all that apply to help customers find you
        </Text>

        <View className="mt-6 flex-row flex-wrap">
          {categories.map(category => {
            const active = selectedCategories.includes(category.id);

            return (
             <TouchableOpacity
  key={category.id}
  onPress={() => toggleCategory(category.id)}
  className={`mr-3 mb-3 px-4 py-3 rounded-full flex-row items-center border ${
    active ? 'border-[#C27803] bg-[#FDFDEA]' : 'border-[#D1D5DB]'
  }`}
>
  <Text className={active ? 'text-[#C27803]' : 'text-[#1F2A37]'}>
    {category.name}
  </Text>

 {Platform.OS === 'ios' ? (
  active ? (
    <Ionicons
      name="checkmark"
      size={20}
      color="#C27803"
      style={{ marginLeft: 8 }}
    />
  ) : (
    <Ionicons
      name="add"
      size={20}
      color="#6B7280"
      style={{ marginLeft: 8 }}
    />
  )
) : (
  active ? (
    <CheckIcon
      width={20}
      height={20}
      style={{ marginLeft: 8 }}
    />
  ) : (
    <PlusIcon
      width={20}
      height={20}
      style={{ marginLeft: 8 }}
    />
  )
)}
</TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          disabled={!isValid || isSettingUp}
          onPress={handleContinue}
          className={`mt-auto py-4 rounded-full items-center ${
            isValid ? 'bg-[#1A56DB]' : 'bg-[#E5E7EB]'
          }`}
        >
          <Text className={`${isValid ? 'text-white' : 'text-[#1F2A37]'} font-[500] text-[16px]`}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6 h-1/2 items-center">
            <Image
              source={require('../../assets/magic.png')}
              style={{ width: 120, height: 120 }}
            />
            <Text className="mt-4 text-[14px] font-[500] text-[#1F2A37]">
              Setting up your store…
            </Text>
            <ActivityIndicator className="mt-6" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
