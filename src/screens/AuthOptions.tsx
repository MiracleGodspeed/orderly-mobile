import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform
} from 'react-native';
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import Fontisto from '@expo/vector-icons/Fontisto';
import AntDesign from '@expo/vector-icons/AntDesign';

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
            className="w-full mt-5 py-4 border border-[#265CC7] bg-[#265CC7] rounded-full items-center justify-center flex-row space-x-8"
            activeOpacity={0.8}
             onPress={() => navigation.navigate('EmailSignUp')}
          >
            <Ionicons name="mail-outline" size={22} color="#fff" className='mr-3'/>

            <Text className="text-[#fff] text-lg font-semibold ">
              Continue with Email
            </Text>
          </TouchableOpacity>
        
          <TouchableOpacity 
          
            className="w-full mt-5 mb-5 py-4 border border-[#9CA3AF] bg-[#fff] rounded-full items-center justify-center flex-row space-x-8"
            
            activeOpacity={0.8}
          >
            
            <Image
              source={require('../../assets/Google.png')}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
              className='mr-3'
            />
            <Text className="text-[#4B5563] text-[16px] font-[500] ">
              Sign in with Google
            </Text>
          </TouchableOpacity>
          

          <View className='text-center px-5 mx-auto'>
           <Text className="text-[#6B7280] text-[16px] font-[400]">Already have an account? <Text className="text-[#1C64F2] text-[16px] font-[400]" onPress={() => navigation.navigate('Login')}>Sign In</Text> </Text>
          </View>

    </View>
    </View>
    </SafeAreaView>
  )
}

