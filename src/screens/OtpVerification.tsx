import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import React, { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OtpVerification() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  
  const handleChange = (text: string, index: number) => {
    const digits = text.replace(/[^0-9]/g, '');

    // If user pasted multiple digits, distribute them across inputs
    if (digits.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newOtp[index + i] = digits[i];
      }
      setOtp(newOtp);
      // focus the next empty input or last
      const nextIndex = Math.min(5, index + digits.length);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Normal single-digit input
    const digit = digits.slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // move forward when user types a digit
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }, index: number) => {
    if (nativeEvent.key === 'Backspace') {
      // If current field is already empty, go to previous and clear it
      if (otp[index] === '') {
        if (index > 0) {
          const newOtp = [...otp];
          newOtp[index - 1] = '';
          setOtp(newOtp);
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // If it has a value, just clear this one (onKeyPress fires before onChangeText on some platforms)
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };
  
 
const handleVerify = () => {
  console.log('handleVerify called');
  
  const enteredOtp = otp.join('');
  console.log('Entered OTP:', enteredOtp);
  
  if (enteredOtp.length !== 6) {
    Alert.alert('Incomplete OTP', 'Please enter all 6 digits.');
    return;
  }
  
  console.log('Attempting to navigate to OtpSuccess...');
  
  // Try navigation directly
  try {
    navigation.navigate('OtpSuccess');
    console.log('Navigation command sent');
  } catch (error) {
    console.error('Navigation error:', error);
  }
};
  
  const handleResendOtp = () => {
    // Clear OTP inputs
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    Alert.alert('OTP Resent', 'New code sent!');
  };

  // Check if all OTP digits are filled
  const isOtpComplete = otp.every(digit => digit !== '');

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
          <View className='p-3'>
            <Image
              source={require('../../assets/lock.png')}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
          </View>
        </View>
        <View className='flex-col items-center justify-center'>
          <Text className='px-3 text-[20px] font-[500] pt-8 text-[#374151]'>Secure Verification</Text>
          <Text className='px-3 text-[16px] font-[400] pt-4 text-[#6B7280]'>A one-time 6-digit code has been sent to <Text className='font-[500]  text-[#6B7280]'>you@example.com.</Text>  Please enter it to confirm</Text>
        </View>
        <View className="flex-row justify-center mb-10 mt-8">
          {[...Array(6)].map((_, index) => (
            <View
              key={index}
              className="border-2 border-gray-300 rounded-xl w-12 h-16 items-center justify-center mx-1"
            >
              <TextInput
                ref={(ref) => { inputRefs.current[index] = ref; }}
                className="text-2xl font-bold text-center w-full h-full"
                keyboardType="number-pad"
                maxLength={1}
                value={otp[index]}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            </View>
          ))}
        </View>
        <View className="items-center mb-10">
          <Text className="text-gray-600 mb-2">
            Didn't receive the code? <Text className="text-lg font-medium text-[#265CC7]">
              Resend in 00:05
            </Text>
          </Text>
        </View>
        <TouchableOpacity 
          className={`w-full py-4 rounded-full items-center justify-center ${
            isOtpComplete ? 'bg-[#1A56DB]' : 'bg-gray-300'
          }`}
          onPress={handleVerify}  
          disabled={!isOtpComplete}
          activeOpacity={isOtpComplete ? 0.8 : 1}
        >
          <Text className={`text-lg font-semibold ${
            isOtpComplete ? 'text-white' : 'text-gray-500'
          }`}>
            Verify
          </Text>
        </TouchableOpacity> 
      </View>
    </SafeAreaView>
  );
}