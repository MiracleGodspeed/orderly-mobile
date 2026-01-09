import React from 'react';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

interface HeaderProps {
  onMenuClick: () => void;
  notificationCount?: number;
  unreadCount?: number; 
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Header({ 
  onMenuClick, 
  notificationCount = 1,
  unreadCount = 2
}: HeaderProps) {
  const navigation = useNavigation<NavigationProp>();

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleSearchPress = () => {
    console.log('Search pressed');
  };

  return (
    <View className="bg-white border-b border-gray-200 px-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center justify-center">
          <Image
            source={require('../../assets/blackLogo.png')}
            className="w-32 h-24 mr-3"
            resizeMode="contain"
          />
        </View>
        
        <View className="flex-row items-center gap-3">
          <TouchableOpacity 
            className="p-2" 
            activeOpacity={0.7}
            onPress={handleSearchPress}
          >
            <Ionicons name="search" size={22} color="#374151" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="p-2 relative" 
            activeOpacity={0.7}
            onPress={handleNotificationPress}
          >
            <Ionicons name="notifications-outline" size={22} color="#374151" />
            
            {unreadCount > 0 && (
              <>
                {unreadCount > 9 ? (
                  <View className="absolute top-0 right-0 bg-red-500 rounded-full px-1.5 py-0.5 min-w-[18px] items-center">
                    <Text className="text-white text-[10px] font-semibold">9+</Text>
                  </View>
                ) : (
                  <View className="absolute top-0 right-0 bg-red-500 rounded-full px-1.5 py-0.5 min-w-[18px] items-center">
                    <Text className="text-white text-[10px] font-semibold">{unreadCount}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={onMenuClick} 
            className="p-2" 
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}