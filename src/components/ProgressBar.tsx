// src/components/ProgressBar.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, Text } from 'react-native';
import { useProgress } from '../../context/ProgressContext';

export default function ProgressBar({ height = 8 }: { height?: number }) {
  const { progress } = useProgress();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 350,
      useNativeDriver: false, // width animation - don't use native driver
    }).start();
  }, [progress]);

  // width interpolation from 0..1 -> 0..100%
  const widthInterpolated = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="w-full" style={{ paddingHorizontal: 0 }}>
      <View className="w-full bg-gray-200 rounded-full" style={{ height }}>
        <Animated.View
          style={{
            height,
            borderRadius: 999,
            width: widthInterpolated,
            backgroundColor: '#1A56DB',
          }}
        />
      </View>
      <Text className="text-xs text-gray-500 mt-2">{Math.round(progress * 100)}% complete</Text>
    </View>
  );
}
