import React, { useEffect, useRef } from 'react';
import { View, Animated, Text } from 'react-native';
import { useProgress } from '../../context/ProgressContext';

export default function ProgressBar({ height = 8 }: { height?: number }) {
  const { progress } = useProgress();
  const anim = useRef(new Animated.Value(progress)).current; 

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 400, 
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="w-full">
      <View className="w-full flex-row items-center">
        <View className="flex-1 bg-gray-200 rounded-full overflow-hidden" style={{ height }}>
          <Animated.View
            style={{
              height,
              width: widthInterpolated,
              backgroundColor: '#1A56DB',
              borderRadius: 999,  // Add borderRadius here instead of className
            }}
          />
        </View>

        <Text className="text-xs text-gray-500 ml-2">
          {Math.round(progress * 100)}%
        </Text>
      </View>
    </View>
  );
}