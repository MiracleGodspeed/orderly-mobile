// src/components/BottomNav.tsx - COMPLETE UPDATED VERSION
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TabConfig {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  screen: keyof RootStackParamList;
}

export default function BottomNav() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const tabs: TabConfig[] = [
    { id: 'home', icon: 'home', label: 'Home', screen: 'Home' },
    { id: 'orders', icon: 'receipt', label: 'Orders', screen: 'Orders' },
    { id: 'store', icon: 'storefront', label: 'Store', screen: 'Store' },
    { id: 'reports', icon: 'document-text', label: 'Reports', screen: 'Reports' },
    { id: 'profile', icon: 'person', label: 'Profile', screen: 'Profile' }
  ];

  const isActiveTab = (screenName: string) => {
    return route.name === screenName;
  };

  const handleTabPress = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <View className="absolute bottom-10 left-0 right-0 bg-white border-t border-gray-200">
      <View className="flex-row h-16">
        {tabs.map((tab) => {
          const isActive = isActiveTab(tab.screen);
          
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => handleTabPress(tab.screen)}
              className="flex-1 items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isActive ? tab.icon : `${tab.icon}-outline` as any}
                size={24} 
                color={isActive ? '#2563EB' : '#6B7280'} 
              />
              <Text 
                className={`text-xs font-medium mt-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}