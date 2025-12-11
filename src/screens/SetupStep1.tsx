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
  const { setProgress } = useProgress();

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');

  
  useEffect(() => {
    setProgress(0.25 * 0); 
  }, []);

  const isValid = businessName.trim() !== '' && description.trim() !== '';

  const handleContinue = () => {
    if (!isValid) return;
    setProgress(0.25);
    navigation.navigate('SetupStep2');
  };

  return (
    <SafeAreaView  className="flex-1 bg-white">
      <View className="pt-6 px-6">
        <View className="flex-row items-center justify-center relative">
                
                <TouchableOpacity 
                className="absolute left-0 p-2"
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                
            </View>
       <View className="flex-1 mt-10">
                <ProgressBar />
              </View>
        <Text className="text-2xl font-semibold mt-6">Setup your business</Text>
        <Text className='text-[#6B7280] text-[16px] font-[400]'>Tell us about your business so we can personalise your experience.</Text>

        <Text className="mt-6 text-sm font-medium">Business name</Text>
        <TextInput
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Enter business name"
          className="border border-gray-300 rounded-lg px-4 py-3 mt-2"
        />

        <Text className="mt-4 text-sm font-medium">Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Tell us about the business"
          multiline
          numberOfLines={4}
          className="border border-gray-300 rounded-lg px-4 py-3 mt-2 h-28 text-base"
        />

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isValid}
          className={`mt-8 py-4 rounded-full items-center ${isValid ? 'bg-[#1A56DB]' : 'bg-gray-200'}`}
        >
          <Text className={`${isValid ? 'text-white' : 'text-gray-500'} font-semibold`}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
