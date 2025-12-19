import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { SignupRequest } from '../api/auth/auth.types';
import { signup } from '../api/auth/auth.api';
import EyeIcon from '../../assets/icons/eye.svg';
import EyeOffIcon from '../../assets/icons/eye-off.svg';


type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;


export default function EmailSignUp() {

    const navigation = useNavigation<ScreenNavigationProp>();
      const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false)
   const [loading, setLoading] = useState(false);

  const isFormValid = email.trim() !== '' && 
                      password.trim() !== '' && 
                      confirmPassword.trim() !== '';
  
  const handleSignup = async () => {
    if(password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Passwords do not match',
      })
      return;
    }
    setLoading(true);

    const payload: SignupRequest = {
      email: email,
      password: password,
      otp: '',
      skipVerificationForLater: false,
    }
    try {
      const response = await signup(payload);
       console.log('Signup response:', response);
       Toast.show({
        type: 'success',
        text1: 'OTP sent',
        text2: 'Check your email for the verification code',
      });
      navigation.navigate('OtpVerification', { email, password });


    } catch(err) {
       console.error('Signup error:', err);
       let errorMessage = 'Signup failed. Please try again.';
    
    
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else if (err && typeof err === 'object' && 'message' in err) {
     
      errorMessage = String((err as any).message);
    }
    
    Toast.show({
      type: 'error',
      text1: 'Sign Up Failed',
      text2: errorMessage,
    });

    } finally {
       setLoading(false);

    }

   

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
              {Platform.OS === 'ios' ? (
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#6B7280"
              />
            ) : (
              showPassword ? (
                <EyeOffIcon
                  width={24}
                  height={24}
                  fill="#6B7280"
                />
              ) : (
                <EyeIcon
                  width={24}
                  height={24}
                  fill="#6B7280"
                />
              )
            )}
                
                      
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
            {Platform.OS === 'ios' ? (
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#6B7280"
              />
            ) : (
              showConfirmPassword ? (
                <EyeOffIcon
                  width={24}
                  height={24}
                  fill="#6B7280"
                />
              ) : (
                <EyeIcon
                  width={24}
                  height={24}
                  fill="#6B7280"
                />
              )
            )}
                                  
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
          } flex-row`}
          onPress={handleSignup}
          disabled={!isFormValid || loading} // disable during loading
          activeOpacity={0.8}
        >
          {loading && <ActivityIndicator color="#fff" size="small" className="mr-2" />}
          <Text className={`text-lg font-semibold ${
            isFormValid ? 'text-white' : 'text-[#1F2A37]'
          }`}>
            {loading ? 'Signing up...' : 'Next'}
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