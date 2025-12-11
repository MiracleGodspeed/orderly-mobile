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

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SetupStep3() {
  const navigation = useNavigation<NavProp>();
  const { setProgress } = useProgress();

  const categories = [
    'Arts & Crafts', 'Coffee & Tea', 'Dolls', 'Board Games', 'Health & Beauty',
    'Home & Garden', 'Office Supplies', 'Pet Care', 'Puzzles', 'Outdoor Play',
    'Building Sets', 'Action Figures', 'Video Games', 'Card Games', 'RC Vehicles',
    'Fashion & Women Wears', 'Stuffed Animals', 'Creative Toys', 'Others'
  ];

  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setProgress(0.5);
  }, []);

  const toggleCategory = (label: string) => {
    setSelected(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isValid = selected.length > 0;

  const handleContinue = () => {
    if (!isValid) return;
    setProgress(0.75);
    navigation.navigate('SetupStep4');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View className="p-6 flex-1">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View className="mt-2">
          <ProgressBar />
        </View>

        <View className="mt-4">
          <Text className="text-2xl font-semibold text-[#0F172A]">
            Choose your categories
          </Text>
          <Text className="text-[16px] text-[#6B7280] mt-2">
            Select all that apply to help customers find you
          </Text>
        </View>

        <View className="mt-6 flex-1">
          <View className="flex-row flex-wrap">
            {categories.map((label) => {
              const active = selected.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => toggleCategory(label)}
                  activeOpacity={0.8}
                  className={`mr-3 mb-3 px-4 py-3 rounded-full flex-row items-center border ${
                    active ? 'border-[#F59E0B] bg-[#FFFBEB]' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text className={`text-sm ${active ? 'text-[#92400E]' : 'text-[#374151]'}`}>
                    {label}
                  </Text>

                  <View className="ml-3">
                    {active ? (
                      <Ionicons name="checkmark" size={16} color="#92400E" />
                    ) : (
                      <Text className="text-[#6B7280] text-sm">+</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="pb-6">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!isValid}
            activeOpacity={0.9}
            className={`py-4 rounded-full items-center justify-center ${
              isValid ? 'bg-[#1A56DB]' : 'bg-gray-200'
            }`}
            style={{ width: '100%' }}
          >
            <Text className={`${isValid ? 'text-white' : 'text-gray-600'} font-semibold`}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
