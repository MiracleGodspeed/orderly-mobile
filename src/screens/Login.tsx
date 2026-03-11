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
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useVendor } from '../../context/VendorContext';
import { useToast } from 'react-native-toast-notifications';

import EyeIcon from '../../assets/icons/eye.svg';
import EyeOffIcon from '../../assets/icons/eye-off.svg';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// import { googleLogin } from 'src/api/auth/auth.api';



export type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export default function Login() {
  const toast = useToast();

  const navigation = useNavigation<ScreenNavigationProp>();
  const { login, googleLogin } = useAuth();
  const { fetchVendorData } = useVendor();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);


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

      console.log('Login pressed:', { email, password, });
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
      toast.show('Login Failed', { type: 'danger' });


    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim() !== '' &&
    password.trim() !== ''



  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View className="px-6 pt-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                className="w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center"
              >
                <Ionicons name="arrow-back" size={20} color="#111827" />
              </TouchableOpacity>

              <Image
                source={require('../../assets/blackLogo.png')}
                className="w-24 h-10"
                resizeMode="contain"
              />

              <View className="w-10 h-10" />
            </View>

            <View className="mt-8">
            <Text
                className="text-3xl text-gray-800"
                style={{
                  fontFamily: 'PlusJakartaSans_700Bold',
                }}
              >
                Welcome back
              </Text>  
              <Text className="text-gray-500 text-[15px] mt-2">
                Log in to continue managing your store.
              </Text>
            </View>
          </View>

          <View className="flex-1 px-6 pt-8 pb-10">
            <View className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Account
              </Text>

              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Email
                </Text>
                <View
                  className={`flex-row items-center rounded border px-4 bg-gray-50 ${focusedField === 'email' ? 'border-blue-600' : 'border-gray-200'
                    }`}
                >
                  <Ionicons name="mail-outline" size={18} color="#9ca3af" />
                  <TextInput
                    className="flex-1 ml-3 py-3 text-[16px] text-gray-900"
                    placeholder="you@company.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View className="mb-2">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Password
                </Text>
                <View
                  className={`flex-row items-center rounded border px-4 bg-gray-50 ${focusedField === 'password' ? 'border-blue-600' : 'border-gray-200'
                    }`}
                >
                  <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                  <TextInput
                    className="flex-1 ml-3 py-3 pr-2 text-[16px] text-gray-900"
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                    className="w-10 h-10 items-center justify-center -mr-2"
                  >
                    {Platform.OS === 'ios' ? (
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#6B7280"
                      />
                    ) : showPassword ? (
                      <EyeOffIcon width={22} height={22} fill="#6B7280" />
                    ) : (
                      <EyeIcon width={22} height={22} fill="#6B7280" />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  activeOpacity={0.7}
                  className="self-end mt-3"
                >
                  <Text className="text-blue-600 font-semibold text-sm">
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className={`mt-6 py-4 rounded-full flex-row justify-center items-center ${isFormValid ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                onPress={handleLogin}
                disabled={!isFormValid || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text className="text-[16px] font-bold text-white ml-2">
                      Logging in...
                    </Text>
                  </>
                ) : (
                  <Text
                    className={`text-[16px] font-bold ${isFormValid ? 'text-white' : 'text-gray-500'
                      }`}
                  >
                    Log in
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row items-center mt-7 mb-4">
                <View className="flex-1 h-[1px] bg-gray-200" />
                <Text className="mx-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Or
                </Text>
                <View className="flex-1 h-[1px] bg-gray-200" />
              </View>

              <TouchableOpacity
                className="w-full py-4 border border-gray-200 bg-white rounded-full items-center justify-center flex-row"
                activeOpacity={0.85}
                onPress={handleGoogleSignIn}
              >
                <Image
                  source={require('../../assets/Google.png')}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                  className="mr-3"
                />
                <Text className="text-gray-700 text-[15px] font-semibold">
                  Continue with Google
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mt-8 items-center">
              <Text className="text-[15px] text-gray-500">
                Don’t have an account?
                <Text
                  className="text-blue-600 font-semibold"
                  onPress={() => navigation.navigate('AuthOptions')}
                >
                  {' '}
                  Sign up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
