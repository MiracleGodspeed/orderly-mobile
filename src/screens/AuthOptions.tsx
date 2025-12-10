import {
  View,
  Text,
  TouchableOpacity,
 
  StatusBar,
  Platform
} from 'react-native';
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AuthOptions ()  {
    const navigation = useNavigation<ScreenNavigationProp>();
  return (
    <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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
        Create Your Orderly Account
        </Text>
    </View>
    <Text className='px-3 text-[16px] font-[400] pt-8 text-[#6B7280]'>Start your stress free business management journey here.</Text>
    <View className="space-y-4">
        <TouchableOpacity 
            className="w-full mt-5 py-4 border-2 border-[#265CC7] bg-[#265CC7] rounded-full items-center justify-center flex-row space-x-8"
            
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={22} color="#fff" className='mr-3'/>

            <Text className="text-[#fff] text-lg font-semibold ">
              Continue with Email
            </Text>
          </TouchableOpacity>


    </View>
    </View>
    </SafeAreaView>
  )
}

