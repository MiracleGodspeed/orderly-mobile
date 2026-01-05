import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { verifyOtp } from '../api/auth/auth.api';
import { OtpVerificationRequest } from '../api/auth/auth.types';
import Toast from 'react-native-toast-message';

type OtpNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OtpVerification'>;
type OtpRouteProp = RouteProp<RootStackParamList, 'OtpVerification'>;

interface Props {
  navigation: OtpNavigationProp;
  route: OtpRouteProp;
}

export default function OtpVerification({ route, navigation }: Props) {
  const { email, password } = route.params;
  const { setAuthData } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    const digits = text.replace(/[^0-9]/g, '');

    // Handle paste of multiple digits
    if (digits.length > 1) {
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newOtp[index + i] = digits[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(5, index + digits.length);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    if (digits.length === 0) {
      // User deleted - clear current field
      newOtp[index] = '';
      setOtp(newOtp);
      // Stay in current field for easy correction
    } else {
      // User entered a digit - replace current value
      newOtp[index] = digits[0];
      setOtp(newOtp);
      // Auto-advance to next field
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    const key = e.nativeEvent.key;

    if (key === 'Backspace') {
      // If current field is empty, move back to previous field
      if (otp[index] === '' && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 0);
      }
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join('');

    if (enteredOtp.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Incomplete OTP',
        text2: 'Please enter all 6 digits.',
        position: 'top',
        visibilityTime: 3000,
        autoHide: true
      });
      return;
    }

    setLoading(true);
    const payload: OtpVerificationRequest = {
      email: email,
      password: password,
      otp: enteredOtp,
      skipVerificationForLater: false,
    };

    try {
      const response = await verifyOtp(payload);
      console.log(response, 'OTP verification response');
      const { token, userId, fullName, storeId, email: userEmail } = response;
      console.log('OTP verification successful:', response);

      if (!token) throw new Error('Token missing in response');
  if (!storeId) throw new Error('Store ID missing in response');

      
      const user = {
        id: userId,
        email: userEmail,
        name: fullName ?? undefined,
         storeId,
         
      };

     setAuthData(token, {
        id: userId,
        email: userEmail,
        name: fullName ?? undefined,
        storeId,
      });

      Toast.show({
        type: 'success',
        text1: 'Verification Successful',
        text2: 'Redirecting...',
        position: 'top',
        visibilityTime: 2000,
        autoHide: true
      });

      navigation.navigate('OtpSuccess');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.error ||
        error?.message || 
        'Verification failed. Please try again.';

      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: errorMessage,
        position: 'top',
        visibilityTime: 4000,
        autoHide:  true
      });
      
      
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    
    Toast.show({
      type: 'info',
      text1: 'OTP Resent',
      text2: 'A new code has been sent to your email.',
      position: 'top',
      visibilityTime: 3000,
      autoHide: true
    });
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Toast />
      <View className="pt-5 px-6">
        <View className="flex-row items-center justify-center relative">
          <TouchableOpacity
            className="absolute left-0 p-2"
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View className="p-3">
            <Image
              source={require('../../assets/lock.png')}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
          </View>
        </View>
        <View className="flex-col items-center justify-center">
          <Text className="px-3 text-[20px] font-[500] pt-8 text-[#374151]">
            Secure Verification
          </Text>
          <Text className="px-3 text-[16px] font-[400] pt-4 text-[#6B7280] text-center">
            A one-time 6-digit code has been sent to{' '}
            <Text className="font-[500] text-[#6B7280]">{email}</Text>. Please
            enter it to confirm
          </Text>
        </View>
        <View className="flex-row justify-center mb-10 mt-8">
          {[...Array(6)].map((_, index) => (
            <View
              key={index}
              className={`border-2 rounded-xl w-12 h-16 items-center justify-center mx-1 ${
                otp[index] ? 'border-[#1A56DB]' : 'border-gray-300'
              }`}
            >
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                className="text-2xl font-bold text-center w-full h-full"
                keyboardType="number-pad"
                maxLength={1}
                value={otp[index]}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
                autoFocus={index === 0}
                editable={!loading}
              />
            </View>
          ))}
        </View>
        <View className="items-center mb-10">
          <Text className="text-gray-600 mb-2">
            Didn't receive the code?{' '}
            <Text
              className="text-lg font-medium text-[#265CC7]"
              onPress={handleResendOtp}
            >
              Resend
            </Text>
          </Text>
        </View>
        <TouchableOpacity
          className={`w-full py-4 rounded-full items-center justify-center flex-row ${
            isOtpComplete && !loading ? 'bg-[#1A56DB]' : 'bg-gray-300'
          }`}
          onPress={handleVerify}
          disabled={!isOtpComplete || loading}
          activeOpacity={isOtpComplete ? 0.8 : 1}
        >
          {loading && (
            <ActivityIndicator color="#fff" size="small" className="mr-2" />
          )}
          <Text
            className={`text-lg font-semibold ${
              isOtpComplete && !loading ? 'text-white' : 'text-gray-500'
            }`}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}