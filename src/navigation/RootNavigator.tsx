import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import Login from '../screens/Login';
import SignupScreen from '../screens/Signup';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthOptions from '../screens/AuthOptions';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: '#265CC7',
          background: '#265CC7', 
          card: '#265CC7',
          text: '#ffffff',
          border: '#265CC7',
          notification: '#265CC7',
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: '400',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
    >
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade', 
          contentStyle: { backgroundColor: '#265CC7' }, 
        }}
      >
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{
            animation: 'none', 
          }}
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' }, 
          }}
        />
        <Stack.Screen name="AuthOptions" component={AuthOptions} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Login" component={Login} />
      
      </Stack.Navigator>
    </NavigationContainer>
  );
}