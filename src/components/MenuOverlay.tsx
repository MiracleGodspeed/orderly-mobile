// src/components/MenuOverlay.tsx
import React from 'react';
import { View, TouchableOpacity, Text, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: string;
  onPress?: () => void;
}

const MenuItem = ({ icon, label, badge, onPress }: MenuItemProps) => (
  <TouchableOpacity 
    onPress={onPress}
    className="flex-row items-center justify-between px-4 py-3 rounded-lg active:bg-gray-100"
    activeOpacity={0.7}
  >
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={22} color="#6B7280" />
      <Text className="text-gray-900 font-medium">{label}</Text>
    </View>
    {badge && (
      <View className="bg-red-500 px-2 py-1 rounded-full min-w-[24px] items-center">
        <Text className="text-white text-xs font-semibold">{badge}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export default function MenuOverlay({ isOpen, onClose }: MenuOverlayProps) {
  return (
    <Modal
      visible={isOpen}
      transparent = {true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 mt-10">
        <TouchableOpacity 
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl">
          <View className="p-6">
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-xl font-bold text-gray-900">Menu</Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <View className="space-y-1">
              
              <MenuItem icon="settings-outline" label="Settings" />
            </View>
            
          
              <MenuItem icon="person-outline" label="Profile" />
              <MenuItem icon="globe-outline" label="Help & Support" />
            
          </View>
        </View>
      </View>
    </Modal>
  );
}
