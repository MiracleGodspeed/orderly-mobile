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
import Feather from '@expo/vector-icons/Feather';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

import ProgressBar from '../components/ProgressBar';
import { useProgress } from '../../context/ProgressContext';


export default function SetupStep1() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { setProgress } = useProgress();

  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');

  
  
  const isValid = businessName.trim() !== '' && description.trim() !== '';

  const handleContinue = () => {
    if (!isValid) return;
    
    navigation.navigate('SetupStep2');
    // setTimeout(() => {
      setProgress(0.25);
    // }, 50);
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
       <View className=" mt-10">
          <ProgressBar />
        </View>
        <Text className="text-[20px] font-[500] mt-6 mb-4 text-[#374151]">Setup your business</Text>
        <Text className='text-[#6B7280] text-[16px] font-[400]'>Tell us about your business so we can personalise your experience.</Text>

       <Text className=" mt-6 text-sm font-medium text-[#111928]">
          Business name <Text className="text-red-500">*</Text>
        </Text>

        <TextInput
        
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Enter business name"
          className="border border-[#D1D5DB] rounded-lg px-4 py-3 mt-2"
        />

        <Text className="mt-4 text-sm font-medium"> Business description <Text className="text-red-500">*</Text></Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Tell us about the business"
          multiline
          numberOfLines={4}
          className="border border-[#D1D5DB] rounded-lg px-4 py-3 mt-2 h-28 text-base"
        />

       
          <View className="pb-6 mt-10">
            <TouchableOpacity
              onPress={handleContinue}
              disabled={!isValid}
              activeOpacity={0.9}
              className={`w-full py-4 rounded-full items-center justify-center ${
                isValid ? 'bg-[#1A56DB]' : 'bg-[#E5E7EB]'
              }`}
              style={{
                
                borderRadius: 999,
              }}
            >
              <View className="flex-row items-center ">
                <Text className={`${isValid ? 'text-[#fff]' : 'text-[#1F2A37]'} font-[500] text-[16px]`}>
                  Continue
                </Text>
                <Ionicons name="arrow-forward" size={18} color={isValid ? '#fff' : '#1F2A37'} style={{ marginLeft: 10 }} />
              </View>
            </TouchableOpacity>
          </View>
      </View>
    </SafeAreaView>
  );
}
