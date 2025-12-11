import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  TextInput,

} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ResetLink() {
    const navigation = useNavigation<ScreenNavigationProp>();
    
  return (
    <SafeAreaView className="flex-1 bg-white">
        <View className="pt-5 px-6">
            <View className="flex-row items-center justify-center relative">
                <TouchableOpacity 
                className="absolute left-0 p-2"
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                >
                <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-[20px] font-[500] text-gray-900">
                    Forgot Password
                </Text>
            </View>
            <View className='flex-row items-center justify-center mt-10'>
                <Image
                source={require('../../assets/resetImg.png')}
                resizeMode="contain"
                className='w-100 h-100'
                />
            </View>
            <View className='flex-col items-center justify-center mt-6'>
                <Text className='px-3 text-[24px] font-[700] pt-8 text-[#1F2A37]'>Reset link sent!</Text>
                <Text className='px-3 text-[18px] font-[400] pt-4 text-[#6B7280]' onPress={() => navigation.navigate('ResetPassword')}>We sent a link to to***i@example.com, follow the link to reset your password.</Text>
            </View>
        </View>
    </SafeAreaView>
    
  )
}