import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

interface StoreSetupProgressProps {
  progress?: number;
  onContinue: () => void;
}

export default function StoreSetupProgress({ progress = 25, onContinue }: StoreSetupProgressProps) {
  return (
    <TouchableOpacity 
      onPress={onContinue}
      className="mx-4  mb-4 p-4 bg-white rounded-lg "
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[14px] font-[400] text-gray-800">Store Setup</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-[14px] font-[500] text-[#FB2C36]">{progress}% complete</Text>
          <Text className="text-[14px] font-[500] text-[#FB2C36]">›</Text>
        </View>
      </View>
      <View className="w-full bg-[#E5E7EB] rounded-full h-1.5">
        <View 
          className="bg-[#FB2C36] h-1.5 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
    </TouchableOpacity>
  );
}
