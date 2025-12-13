

import React from 'react';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  onMenuClick: () => void;
  notificationCount?: number;
}

export default function Header({ onMenuClick, notificationCount = 1 }: HeaderProps) {
  return (
    <View className="bg-white border-b border-gray-200 px-4">
      <View className="flex-row items-center justify-between">
       <View className="flex-row items-center justify-center ">
        <Image
            source={require('../../assets/blackLogo.png')}
            className="w-32 h-24 mr-3"
            resizeMode="contain"
        />
        
        </View>
        
        <View className="flex-row items-center gap-3">
          <TouchableOpacity className="p-2" activeOpacity={0.7}>
            <Ionicons name="search" size={22} color="#374151" />
          </TouchableOpacity>
          
          <TouchableOpacity className="p-2 relative" activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color="#374151" />
            {notificationCount > 0 && (
              <View className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onMenuClick} className="p-2" activeOpacity={0.7}>
            <Ionicons name="menu" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}