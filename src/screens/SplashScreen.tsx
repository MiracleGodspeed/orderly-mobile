import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withDelay,
  withSpring,
  Easing
} from 'react-native-reanimated';

export default function SplashScreen({ navigation }: any) {
 
  const imageScale = useSharedValue(0.8);
  const imageOpacity = useSharedValue(0);
  const fadeOutOpacity = useSharedValue(1);

  useEffect(() => {
   
    const animate = async () => {
     
      imageOpacity.value = withTiming(1, { 
        duration: 800,
        easing: Easing.out(Easing.cubic)
      });
      
      imageScale.value = withSpring(1, {
        damping: 12,
        stiffness: 100
      });
      
     
      fadeOutOpacity.value = withDelay(1500, withTiming(0, { 
        duration: 500 
      }));
      
    
      setTimeout(() => {
        navigation.replace('Onboarding');
      }, 2500);
    };

    animate();
  }, [navigation]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
    opacity: imageOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeOutOpacity.value,
  }));

  return (
    <Animated.View 
      style={[containerStyle, { 
        flex: 1, 
        backgroundColor: '#265CC7' 
      }]}
    >
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        
       
        <Animated.Image
          style={[imageStyle, {
            width: 200,
            height: 200,
            resizeMode: 'contain'
          }]}
          
          source={require('../../assets/orderlySplash.png')} 
          
        />
        
      </View>
    </Animated.View>
  );
}