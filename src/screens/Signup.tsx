import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useVendor } from '../../context/VendorContext';


export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const { googleLogin } = useAuth();
  const { fetchVendorData } = useVendor();

  const handleSignup = () => {
    console.log('Signup pressed:', { name, email, password, confirmPassword, agreeTerms });
    navigation.navigate('Login');
  };
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
             navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
             });
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
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="px-6 pt-6 pb-4 flex-row items-center">
          <TouchableOpacity 
            className="mr-4"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-text">
            Create Account
          </Text>
        </View>

        <Text className="text-gray-500 px-6 mb-8">
          Set up your store management account
        </Text>

        <View className="px-6">
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Full Name
            </Text>
            <View className="bg-gray-100 rounded-xl px-4 py-3">
              <TextInput
                className="text-text text-base"
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#8E8E93"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Email Address
            </Text>
            <View className="bg-gray-100 rounded-xl px-4 py-3">
              <TextInput
                className="text-text text-base"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#8E8E93"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">
              Password
            </Text>
            <View className="bg-gray-100 rounded-xl px-4 py-3">
              <TextInput
                className="text-text text-base"
                placeholder="Create a strong password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#8E8E93"
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">
              Confirm Password
            </Text>
            <View className="bg-gray-100 rounded-xl px-4 py-3">
              <TextInput
                className="text-text text-base"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor="#8E8E93"
              />
            </View>
          </View>

          <TouchableOpacity 
            className="flex-row items-start mb-8"
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            <View className={`w-5 h-5 rounded-md border-2 mr-3 mt-1 items-center justify-center
              ${agreeTerms ? 'bg-primary border-primary' : 'border-gray-300'}`}
            >
              {agreeTerms && (
                <Text className="text-white text-xs">✓</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-gray-700">
                I agree to the{' '}
                <Text className="text-primary">Terms of Service</Text>
                {' '}and{' '}
                <Text className="text-primary">Privacy Policy</Text>
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            className={`py-4 rounded-xl items-center mb-6 ${agreeTerms ? 'bg-primary' : 'bg-gray-300'}`}
            onPress={handleSignup}
            disabled={!agreeTerms}
          >
            <Text className={`text-lg font-bold ${agreeTerms ? 'text-white' : 'text-gray-500'}`}>
              Create Account
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center items-center mb-10">
            <Text className="text-gray-600">Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-primary font-bold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 mb-10">
          <Text className="text-gray-700 font-medium mb-4">
            What type of store do you have?
          </Text>
          
          <View className="flex-row flex-wrap -mx-2">
            {['Retail', 'E-commerce', 'Grocery', 'Clothing', 'Other'].map((type) => (
              <TouchableOpacity 
                key={type}
                className="w-1/3 px-2 mb-4"
              >
                <View className="bg-gray-100 rounded-xl py-3 items-center">
                  <Text className="text-gray-700">{type}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}