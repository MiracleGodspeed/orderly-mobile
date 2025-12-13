import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { ProgressProvider } from '../../context/ProgressContext';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import Login from '../screens/Login';
import SignupScreen from '../screens/Signup';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthOptions from '../screens/AuthOptions';
import EmailSignUp from '../screens/EmailSignUp';
import OtpVerification from '../screens/OtpVerification';
import OtpSuccess from '../screens/OtpSuccess';
import ForgotPassword from '../screens/ForgotPassword'
import ResetLink from '../screens/ResetLink'
import ResetPassword from '../screens/ResetPassword'
import SetupStep1 from '../screens/SetupStep1';
import SetupStep2 from '../screens/SetupStep2';
import SetupStep3 from '../screens/SetupStep3';
import Home from '../screens/Home';


const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <ProgressProvider>
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
        <Stack.Screen name="EmailSignUp" component={EmailSignUp} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="OtpVerification" component={OtpVerification} />
        <Stack.Screen name="OtpSuccess" component={OtpSuccess} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        <Stack.Screen name="ResetLink" component={ResetLink} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} />
        <Stack.Screen name="SetupStep1" component={SetupStep1} />
        <Stack.Screen name="SetupStep2" component={SetupStep2} />
        <Stack.Screen name="SetupStep3" component={SetupStep3} />
        <Stack.Screen name="Home" component={Home} />



        <Stack.Screen name="Login" component={Login} />
      </Stack.Navigator>
    </NavigationContainer>
    </ProgressProvider>
    
  );
}