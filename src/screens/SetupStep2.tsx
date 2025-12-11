import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  TextInput,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';


type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

import ProgressBar from '../components/ProgressBar';
import { useProgress } from '../../context/ProgressContext';

export default function SetupStep1() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { setProgress, progress } = useProgress();

  const [selectedOption, setSelectedOption] = useState<'products' | 'services' | null>(null);

  
  useEffect(() => {
    setProgress(0.25);
  }, []);

  const handleContinue = () => {
    if (!selectedOption) return;
    setProgress(0.5);
    navigation.navigate('SetupStep3'); 
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 pt-5">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="p-2"
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <View className="flex-1 px-3">
            
            <View className="flex-row items-center">
              <View className="flex-1">
                <ProgressBar />
              </View>
              <Text className="ml-3 text-sm text-gray-400">
                {Math.round((progress ?? 0) * 100)}%
              </Text>
            </View>
          </View>
        </View>

      
        <View className="mt-6">
          <Text className="text-2xl font-semibold text-[#0F172A] leading-8">
            Do you sell products or render services?
          </Text>
          <Text className="text-[#6B7280] text-[16px] mt-3">
            Choose the option that best describes your business.
          </Text>
        </View>

       
        <View className="mt-6 space-y-4">
        
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedOption('products')}
            className={`flex-row items-center  rounded-xl border ${
              selectedOption === 'products' ? 'border-[#1A56DB]' : 'border-gray-200'
            } bg-white p-4 shadow-sm`}
            style={{
         
              minHeight: 86,
            }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4 bg-[#F3F4F6]"
            >
             
              <Image
                source={require('../../assets/products.png')}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-[#111827]">I sell products</Text>
              <Text className="text-sm text-[#6B7280] mt-1">
                Physical products, like clothing or furniture
              </Text>
            </View>

            
            {selectedOption === 'products' && (
              <View className="ml-3">
                <View className="w-5 h-5 rounded-full bg-[#1C64F2] items-center justify-center">
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              </View>
            )}
          </TouchableOpacity>

         
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedOption('services')}
            className={`flex-row mt-6 items-center rounded-xl border ${
              selectedOption === 'services' ? 'border-[#A4CAFE]' : 'border-[#E5E7EB]'
            } bg-white p-4 shadow-sm`}
            style={{
              minHeight: 86,
            }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4 bg-[#F3F4F6]"
            >
             
              <Image
                source={require('../../assets/services.png')}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
            </View>

            <View className="flex-1">
              <Text className="text-base font-semibold text-[#111827]">I render services</Text>
              <Text className="text-sm text-[#6B7280] mt-1">
                Services like tutoring, landscaping, or personal training.
              </Text>
            </View>

            {selectedOption === 'services' && (
              <View className="ml-3">
                <View className="w-5 h-5 rounded-full bg-[#1C64F2] items-center justify-center">
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>

      

       
        <View className="pb-6 mt-10">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!selectedOption}
            activeOpacity={0.9}
            className={`w-full py-4 rounded-full items-center justify-center ${
              selectedOption ? 'bg-[#E6EEF9]' : 'bg-gray-200'
            }`}
            style={{
             
              borderRadius: 999,
            }}
          >
            <View className="flex-row items-center ">
              <Text className={`${selectedOption ? 'text-[#111827]' : 'text-gray-500'} font-semibold text-base`}>
                Continue
              </Text>
              <Ionicons name="arrow-forward" size={18} color={selectedOption ? '#111827' : '#9CA3AF'} style={{ marginLeft: 10 }} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
