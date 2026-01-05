import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ResetPassword() {
  const navigation = useNavigation<ScreenNavigationProp>();

  const [currentPassword, setcurrentPassword] = useState('');
  const [newPassword, setnewPassword] = useState('');
  const [confirmPassword, setconfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isFormValid =
    currentPassword.trim() !== '' &&
    newPassword.trim() !== '' &&
    confirmPassword.trim() !== '';

  const openResetModal = () => {
    setModalVisible(true);
  };

  const handleResetPassword = () => {
    if (isResetting) return;

    setIsResetting(true);

   
    setTimeout(() => {
      setIsResetting(false);
      setModalVisible(false);

    
      Toast.show({
        type: 'success',
        text1: 'Password updated',
        text2: 'Your password has been successfully updated.',
        position: 'top',
        autoHide: true
      });

      
      // setconfirmPassword('');
    }, 5000);
  };

 
useEffect(() => {
  let timer: number = setTimeout(() => {}, 5000);

  if (modalVisible) {
   
    setIsResetting(true);

   
    timer = setTimeout(() => {
      setIsResetting(false);
      setModalVisible(false);

     
      Toast.show({
        type: 'success',
        text1: 'Password updated',
        text2: 'Your password has been reset successfully.',
        position: 'bottom',
        visibilityTime: 3000,
        autoHide: true
      });
    }, 5000);
  } else {
   
    setIsResetting(false);
  }

  return () => {
    if (timer) clearTimeout(timer);
  };
}, [modalVisible]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View className="pt-5 px-6">
        <View className="flex-row items-center justify-center relative">
          <Text className="text-[20px] font-[500] text-gray-900">Reset Password</Text>
        </View>

        <View className="mb-6 mt-10">
          <Text className="text-[16px] font-[500] text-[#111928] mb-2">Current password</Text>
          <View className="relative">
            <TextInput
              className="border border-[#D1D5DB] bg-[#F9FAFB] rounded-lg px-4 py-4 pr-12 text-[16px]"
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={currentPassword}
              onChangeText={setcurrentPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="absolute right-4 top-3"
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6 mt-3">
          <Text className="text-[16px] font-[500] text-[#111928] mb-2">New password</Text>
          <View className="relative">
            <TextInput
              className="border border-[#D1D5DB] bg-[#F9FAFB] rounded-lg px-4 py-4 pr-12 text-[16px]"
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={setnewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="absolute right-4 top-3"
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-6 mt-3">
          <Text className="text-[16px] font-[500] text-[#111928] mb-2">Confirm your new password</Text>
          <View className="relative mb-2">
            <TextInput
              className="border border-[#D1D5DB] bg-[#F9FAFB] rounded-lg px-4 py-4 pr-12 text-[16px]"
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setconfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className="absolute right-4 top-3 "
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

         
          <TouchableOpacity
            className={`py-4 rounded-full items-center justify-center mt-5 ${isFormValid ? 'bg-[#1A56DB]' : 'bg-[#E5E7EB]'}`}
            onPress={openResetModal}
            disabled={!isFormValid}
            activeOpacity={0.8}
          >
            <Text className={`text-lg font-semibold ${isFormValid ? 'text-white' : 'text-[#1F2A37]'}`}>
              Change Password
            </Text>
          </TouchableOpacity>
        </View>
      </View>

     
          <Modal
            visible={modalVisible}
            transparent = {true}
            animationType="slide"
            onRequestClose={() => !isResetting && setModalVisible(false)}
            >
            <View className="flex-1 justify-end bg-black/40">
                <View className="bg-white rounded-t-3xl p-6 h-1/2">
                <View className="items-center">
                    <Image
                    source={require('../../assets/lock.png')}
                    style={{ width: 120, height: 120 }}
                    resizeMode="contain"
                    />
                    <Text className="text-[14px] font-[400] mt-4 text-[#1F2A37]">We're updating your password</Text>
                </View>

                <View className="mt-8 px-6">
                    <TouchableOpacity
                    // onPress={handleResetPassword}           
                    activeOpacity={0.9}
                    disabled={isResetting}
                    className="flex-row items-center justify-center py-4 rounded-full bg-[#1A56DB]"
                    >
                    <Text className="text-white text-lg font-semibold mr-3">Resetting your password</Text>
                    {isResetting ? <ActivityIndicator size="small" color="#fff" /> : null}
                    </TouchableOpacity>

                    
                </View>
                </View>
            </View>
        </Modal>

    </SafeAreaView>
  );
}
