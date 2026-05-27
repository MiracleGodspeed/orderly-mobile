import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AppImage } from './AppImage';

const LOGO = require('../../assets/blackLogo.png');

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
    <View className="bg-white border-b border-gray-200 px-4 py-2">
      <View className="flex-row items-center justify-between h-11">
        <View className="flex-row items-center">
          <AppImage
            source={LOGO}
            contentFit="contain"
            style={{ width: 96, height: 32 }}
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
              // iOS-style badge: fixed-height pill that's a circle for
              // a single digit and auto-widens for "9+". The previous
              // version used `min-w-[18px]` with `px-1.5`, which left
              // ~6px of inner width — enough for "9" but not "9+", so
              // the "+" clipped against the rounded edge. Switching to
              // a 18px-tall pill with `paddingHorizontal: 5` + tabular
              // nums + a 1.5px white ring keeps both states clean and
              // also makes the badge pop against any icon underneath.
              <View
                className="absolute top-0 right-0 bg-red-500 items-center justify-center"
                style={{
                  minWidth: 15,
                  height:  unreadCount > 9 ? 15 : 18,
                  borderRadius: 9,
                  paddingHorizontal: 5,
                  borderWidth: 1.5,
                  borderColor: "#fff",
                }}
              >
                <Text
                  className="text-white font-bold"
                  style={{
                    fontSize: 11,
                    lineHeight: 12,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {unreadCount > 9 ? "" : unreadCount}
                  {/* 9+ */}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* <TouchableOpacity 
            onPress={onMenuClick} 
            className="p-2" 
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={22} color="#374151" />
          </TouchableOpacity> */}
        </View>
      </View>
    </View>
  );
}