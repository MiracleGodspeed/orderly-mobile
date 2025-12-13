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
import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

import ProgressBar from '../components/ProgressBar';
import { useProgress } from '../../context/ProgressContext';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SetupStep3() {
  const navigation = useNavigation<NavProp>();
  const { setProgress } = useProgress();

  const categories = [
    'Arts & Crafts', 'Coffee & Tea', 'Dolls', 'Board Games', 'Health & Beauty',
    'Home & Garden', 'Office Supplies', 'Pet Care', 'Puzzles', 'Outdoor Play',
    'Building Sets', 'Action Figures', 'Video Games', 'Card Games', 'RC Vehicles',
    'Fashion & Women Wears', 'Stuffed Animals', 'Creative Toys', 'Others'
  ];

  const [selected, setSelected] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // When this screen mounts, set progress to 0.5 according to your requirement
    setProgress(0.5);

    // cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const toggleCategory = (label: string) => {
    setSelected(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isValid = selected.length > 0;

  const startSetupSequence = () => {
   
    if (isSettingUp) return;

  
    setProgress(1.0);

  
    setModalVisible(true);
    setIsSettingUp(true);

    
    timerRef.current = setTimeout(() => {
      setIsSettingUp(false);
      setModalVisible(false);
      timerRef.current = null;
   
      navigation.navigate('Home');
    }, 5000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View className="p-6 flex-1">
        <View className="flex-row items-center justify-between relative">
          <TouchableOpacity 
            className="absolute left-0 p-2"
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>   
        </View>

        <View className="mt-10">
          <ProgressBar />
        </View>

        <View className="mt-4">
          <Text className="text-2xl font-semibold text-[#0F172A]">
            Choose your categories
          </Text>
          <Text className="text-[16px] text-[#6B7280] mt-2">
            Select all that apply to help customers find you
          </Text>
        </View>

        <View className="mt-6 flex-1">
          <View className="flex-row flex-wrap">
            {categories.map((label) => {
              const active = selected.includes(label);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => toggleCategory(label)}
                  activeOpacity={0.8}
                  className={`mr-3 mb-3 px-4 py-3 rounded-full flex-row items-center border ${
                    active ? 'border-[#C27803] bg-[#FDFDEA]' : 'border-[#D1D5DB] bg-[#fff]'
                  }`}
                >
                  <Text className={`text-sm ${active ? 'text-[#92400E]' : 'text-[#374151]'}`}>
                    {label}
                  </Text>

                  <View className="ml-3">
                    {active ? (
                      <Ionicons name="checkmark" size={16} color="#C27803" />
                    ) : (
                      <Text className="text-[#6B7280] text-sm">+</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="pb-6 mt-10">
          <TouchableOpacity
            onPress={() => {
              if (!isValid) return;
              startSetupSequence();
            }}
            disabled={!isValid || isSettingUp}
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

      {/* Bottom modal */}
      <Modal
        visible={modalVisible}
        transparent = {true}
        animationType="slide"
        onRequestClose={() => {
          // prevent closing while setting up
          if (!isSettingUp) setModalVisible(false);
        }}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6 h-1/2">
            <View className="items-center">
              <Image
                source={require('../../assets/magic.png')}
                style={{ width: 120, height: 120 }}
                resizeMode="contain"
              />
              <Text className="text-[14px] font-[500] mt-4 text-[#1F2A37]">Almost there!</Text>
              <Text className="text-[14px] text-[#1F2A37] mt-2 text-center">
                Hang tight while the magic happens...
              </Text>
            </View>

            <View className="mt-8 px-6">
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={isSettingUp}
                className="flex-row items-center justify-center py-4 rounded-full bg-[#1A56DB]"
                style={{ opacity: isSettingUp ? 1 : 1 }} 
              >
                <Text className="text-white text-lg font-semibold mr-3">
                  {isSettingUp ? 'Setting up...' : 'Setting up...'}
                </Text>
                {isSettingUp ? <ActivityIndicator size="small" color="#fff" /> : null}
              </TouchableOpacity>

             
              {!isSettingUp && (
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="mt-3 items-center justify-center py-3"
                >
                  <Text className="text-[#6B7280]">Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
