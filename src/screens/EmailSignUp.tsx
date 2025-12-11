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


export default function EmailSignUp() {
    const navigation = useNavigation<ScreenNavigationProp>();
      const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false)

  const isFormValid = email.trim() !== '' && 
                      password.trim() !== '' && 
                      confirmPassword.trim() !== '';
  
  const handleNext = () => {
    // Add your navigation logic here
    console.log('Form submitted', { email, password, confirmPassword, acceptMarketing });
  };
  
    
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
        </View>
        <View className="flex-1 px-6 pt-8">
            <View className="mb-6">
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
            <View className="mb-6">
          <Text className="text-[16px] font-[500] text-gray-900 mb-2">
            Password
          </Text>
          <View className="relative">
            <TextInput
              className="border border-[#D1D5DB] bg-[#F9FAFB] rounded-lg px-4 py-3 pr-12 text-[16px]"
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="absolute right-4 top-3"
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={24} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>
        <View className="mb-6">
          <Text className="text-[16px] font-[500] text-gray-900 mb-2">
            Confirm Password
          </Text>
          <View className="relative">
            <TextInput
              className="border border-[#D1D5DB] bg-[#F9FAFB] rounded-lg px-4 py-3 pr-12 text-[16px]"
              placeholder="Re-enter your password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="absolute right-4 top-3"
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={24} 
                color="#6B7280" 
              />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity 
          className="flex-row items-center mb-6 "
          onPress={() => setAcceptMarketing(!acceptMarketing)}
          activeOpacity={0.7}
        >
          <View className={`w-5 h-5 border-2 rounded mr-3 items-center justify-center ${
            acceptMarketing ? 'bg-[#265CC7] border-[#265CC7]' : 'border-gray-400'
          }`}>
            {acceptMarketing && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
          <Text className="text-[14px] text-[#6B7280]">
            I'd like to receive marketing offers from Orderly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className={`py-4 rounded-full items-center justify-center ${
            isFormValid ? 'bg-[#1A56DB]' : 'bg-[#E5E7EB]'
          }`}
          onPress={() => navigation.navigate('OtpVerification')}

          disabled={!isFormValid}
          activeOpacity={0.8}
        >
          <Text className={`text-lg font-semibold ${
            isFormValid ? 'text-white' : 'text-[#1F2A37]'
          }`}>
            Next
          </Text>
        </TouchableOpacity>
        <View className="mt-auto pb-6 mb-6fgh">
          <Text className="text-[14px] text-center text-[#6B7280]">
            By signing up, I agree to Orderly's{' '}
            <Text className="text-[#265CC7]">Terms of Service</Text>
            {' '}and{' '}
            <Text className="text-[#265CC7]">Privacy Policy</Text>
          </Text>
        </View>

        </View>
    </SafeAreaView>
    
  )
}