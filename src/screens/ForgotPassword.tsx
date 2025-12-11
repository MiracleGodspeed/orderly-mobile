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


export default function ForgotPassword() {
    const navigation = useNavigation<ScreenNavigationProp>();
      const [email, setEmail] = useState('');
    
       const isFormValid = email.trim() !== '' 
    
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
                    Forgot Password
                </Text>
            </View>
            <View className="mb-6 mt-6">
                <Text className="text-[16px] font-[500] text-gray-900 mb-2">
                    Email
                </Text>
                <TextInput
                    className="border border-[#D1D5DB] bg-[#F9FAFB] rounded-lg px-4 py-3 text-[16px]"
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>
            <TouchableOpacity 
                className={`py-4 rounded-full items-center justify-center ${
                isFormValid ? 'bg-[#1A56DB]' : 'bg-[#E5E7EB]'
                }`}
                onPress={() => navigation.navigate('ResetLink')}
    
                disabled={!isFormValid}
                activeOpacity={0.8}
            >
                <Text className={`text-lg font-semibold ${
                isFormValid ? 'text-white' : 'text-[#1F2A37]'
                }`}>
                Send link
                </Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
    
  )
}