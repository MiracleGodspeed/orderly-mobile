import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,

} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useVendor } from '../../context/VendorContext';
import Toast from 'react-native-toast-message';
import EyeIcon from '../../assets/icons/eye.svg';
import EyeOffIcon from '../../assets/icons/eye-off.svg';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// import { googleLogin } from 'src/api/auth/auth.api';



export type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export default function Login() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const {login} = useAuth()
  const { fetchVendorData } = useVendor();
  const { googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


    const handleGoogleSignIn = async () => {
        try {
          await GoogleSignin.hasPlayServices();
          const userInfo = await GoogleSignin.signIn();
          if (userInfo.data?.idToken) {
  
            const payload = {
              "email": "",
              "idToken": userInfo.data.idToken,
              "role": 2
            }
            // console.log(payload, "payload")
            await googleLogin(payload);
             await fetchVendorData();
          } else {
             Alert.alert("Error", "No ID token received from Google");
          }
        } catch (error: any) {
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log("Cancelled");
          } else if (error.code === statusCodes.IN_PROGRESS) {
             console.log("In Progress");
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
             Alert.alert("Error", "Google Play Services not available");
          } else {
            console.error(error);
            Alert.alert("Error", "Google Sign In failed: " + error.message);
          }
        }
      };
  const handleLogin = async () => {
   try {
    setLoading(true);

     console.log('Login pressed:', { email, password,  });
    const data = await login(email, password);
    console.log("LOGIN API RESPONSE:", data);

    await fetchVendorData();
   } catch (err) {
    console.log("Login error:", err);
    let errorMessage = 'Signup failed. Please try again.';
        
        
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
         
          errorMessage = String((err as any).message);
        }
        
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: errorMessage,
        });
   } finally {
    setLoading(false);
   }
  };

    const isFormValid = email.trim() !== '' && 
                      password.trim() !== '' 
    
                      

  return (
    <SafeAreaView className="flex-1 bg-white">
           <StatusBar barStyle="dark-content" backgroundColor="#fff" />
           <View className="pt-5 px-6">
               <View className="flex-row items-center justify-center relative">
           
                   
                   <Text className="text-[20px] font-[500] text-gray-900">
                   Login or sign up
                   </Text>
               </View>
           </View>
           <View className="flex-1 px-6 pt-8">
               <View className="mb-6">
                   <Text className="text-[16px] font-[500] text-gray-900 mb-2">
                       Email
                   </Text>
                   <TextInput
                       className="border border-[#D1D5DB] bg-[#F9FAFB] rounded-lg px-4 py-3 text-[16px]"
                       placeholder="Enter your email"
                       placeholderTextColor="#9CA3AF"
                       value={email}
                       onChangeText={setEmail}
                       keyboardType="email-address"
                       autoCapitalize="none"
                       autoCorrect={false}
                   />
               </View>
               <View className="mb-6">
                  <Text className="text-[16px] font-[500] text-gray-900 mb-2">
                    Password
                  </Text>
                  <View className="relative">
                    <TextInput
                      className="border border-[#D1D5DB] bg-[#F9FAFB] rounded-lg px-4 py-3 pr-12 text-[16px]"
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <TouchableOpacity
                      className="absolute right-4 top-3"
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                    >
                      {Platform.OS === 'ios' ? (
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#6B7280"
              />
            ) : (
              showPassword ? (
                <EyeOffIcon
                  width={24}
                  height={24}
                  fill="#6B7280"
                />
              ) : (
                <EyeIcon
                  width={20}
                  height={20}
                  fill="#6B7280"
                />
              )
            )}
                      

                    </TouchableOpacity>

                  </View>
                </View>
           
          
           <TouchableOpacity
              className={`py-4 rounded-full flex-row justify-center items-center ${
                isFormValid ? 'bg-[#1A56DB]' : 'bg-[#E5E7EB]'
              }`}
              onPress={handleLogin}
              disabled={!isFormValid || loading} 
              activeOpacity={0.8}
            >
              {loading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" className="mr-2" />
                  <Text className="text-lg font-semibold text-white">Logging in...</Text>
                </>
              ) : (
                <Text className={`text-lg font-semibold ${isFormValid ? 'text-white' : 'text-[#1F2A37]'}`}>
                  Login
                </Text>
              )}
            </TouchableOpacity>
           <Text className='text-center mt-5 text-[#6B7280] text-[16px] ' onPress={() => navigation.navigate('ForgotPassword')}>Forgot password?</Text>
           <View className="flex-row items-center my-4 mt-8">
              <View className="flex-1 h-[1px] bg-gray-300" />
              <Text className="mx-2 text-gray-500">or</Text>
              <View className="flex-1 h-[1px] bg-gray-300" />
            </View>
            <TouchableOpacity 
              className="w-full mt-5 mb-5 py-4 border border-[#9CA3AF] bg-[#fff] rounded-full items-center justify-center flex-row space-x-8"
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
            >  
              <Image
                source={require('../../assets/Google.png')}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
                className='mr-3'
              />
              <Text className="text-[#4B5563] text-[16px] font-[500] ">
                Continue with Google
              </Text>
            </TouchableOpacity>
           <View className=" pb-6 mt-10">
             <Text className="text-[16px] text-center text-[#6B7280]">
              Don’t have an account? 
               <Text className="text-[#265CC7]" onPress={() => navigation.navigate('AuthOptions')}> Sign Up</Text>
               
              
             </Text>
           </View>
   
           </View>
       </SafeAreaView>
  );
}