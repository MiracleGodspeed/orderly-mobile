import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { navigationRef } from './NavigationService';
import { AppProviders } from '../../context/AppProviders';
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
import ManageStoreScreen from '../screens/ManageStore';
import ProductsDashboard from '../screens/ProductDashboard';
import ProductsList from '../screens/ProductsList';
import Orders from '../screens/Orders';
import OrderDetails from '../screens/OrderDetails';
import ReportsAnalytics from '../screens/ReportsAnalytics';
import Profile from '../screens/Profile';
import StoreInformation from '../screens/StoreInformation';
import SubscriptionBilling from '../screens/SubscriptionBilling';
import Security from '../screens/Security';
import PayoutSettings from '../screens/PayoutSettings';
import PersonalDetails from '../screens/PersonalDetails';
import NotificationProfile from '../screens/NotificationProfile';
import HelpSupport from '../screens/HelpSupport';
import LegalPolicies from '../screens/LegalPolicies';
import Notifications from '../screens/Notifications';
import LocationManagement from '../screens/LocationManagement';
import SubscriptionFlowScreen from '../screens/SubscriptionFlowScreen';
import CustomDomain from '../screens/CustomDomain';
import Customers from '../screens/Customers';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <AppProviders>
        <NavigationContainer
      ref={navigationRef}
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
        <Stack.Screen name="ManageStore" component={ManageStoreScreen} />
        <Stack.Screen name="ProductsDashboard" component={ProductsDashboard} />
        <Stack.Screen name="ProductsList" component={ProductsList} />
        <Stack.Screen name="Orders" component={Orders} />
        <Stack.Screen name="OrderDetails" component={OrderDetails} />
        <Stack.Screen name="ReportsAnalytics" component={ReportsAnalytics} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="StoreInformation" component={StoreInformation} />
        <Stack.Screen name="SubscriptionBilling" component={SubscriptionBilling} />
        <Stack.Screen name="Security" component={Security} />
        <Stack.Screen name="PayoutSettings" component={PayoutSettings} />
        <Stack.Screen name="PersonalDetails" component={PersonalDetails} />
        <Stack.Screen name="NotificationProfile" component={NotificationProfile} />
        <Stack.Screen name="HelpSupport" component={HelpSupport} />
        <Stack.Screen name="LegalPolicies" component={LegalPolicies} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="LocationManagement" component={LocationManagement} />
        <Stack.Screen name="CustomDomain" component={CustomDomain} />
        <Stack.Screen name="Customers" component={Customers} />
        <Stack.Screen 
  name="SubscriptionFlow" 
  component={SubscriptionFlowScreen} 
  // options={{ presentation: 'modal', headerShown: false }} 
/>
      </Stack.Navigator>
    </NavigationContainer>
    </AppProviders>
    
  );
}