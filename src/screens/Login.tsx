import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = () => {
    console.log('Login pressed:', { email, password, rememberMe });
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
        {/* Header */}
        <View className="px-6 pt-10 pb-8">
          <Text className="text-3xl font-bold text-text">
            Welcome Back
          </Text>
          <Text className="text-gray-500 mt-2">
            Sign in to manage your store
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Email Input */}
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

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-gray-700 font-medium mb-2">
              Password
            </Text>
            <View className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center">
              <TextInput
                className="flex-1 text-text text-base"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#8E8E93"
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                className="ml-2"
              >
                <Text className="text-primary font-medium">
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View className={`w-5 h-5 rounded-md border-2 mr-2 items-center justify-center
                ${rememberMe ? 'bg-primary border-primary' : 'border-gray-300'}`}
              >
                {rememberMe && (
                  <Text className="text-white text-xs">✓</Text>
                )}
              </View>
              <Text className="text-gray-700">Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text className="text-primary font-medium">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            className="bg-primary py-4 rounded-xl items-center mb-6"
            onPress={handleLogin}
          >
            <Text className="text-white text-lg font-bold">
              Sign In
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-4 text-gray-500">Or continue with</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* Social Login Buttons */}
          <TouchableOpacity 
            className="bg-gray-100 py-4 rounded-xl items-center mb-4"
            onPress={() => console.log('Google login')}
          >
            <Text className="text-text font-medium">Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-gray-100 py-4 rounded-xl items-center mb-8"
            onPress={() => console.log('Apple login')}
          >
            <Text className="text-text font-medium">Continue with Apple</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View className="px-6 pb-10 mt-auto">
          <View className="flex-row justify-center items-center">
            <Text className="text-gray-600">Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text className="text-primary font-bold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}