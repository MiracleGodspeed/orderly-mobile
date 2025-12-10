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
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSignup = () => {
    console.log('Signup pressed:', { name, email, password, confirmPassword, agreeTerms });
    navigation.navigate('Login');
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
        {/* Header with back button */}
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

        {/* Form */}
        <View className="px-6">
          {/* Name Input */}
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

          {/* Confirm Password */}
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

          {/* Terms Agreement */}
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

          {/* Sign Up Button */}
          <TouchableOpacity 
            className={`py-4 rounded-xl items-center mb-6 ${agreeTerms ? 'bg-primary' : 'bg-gray-300'}`}
            onPress={handleSignup}
            disabled={!agreeTerms}
          >
            <Text className={`text-lg font-bold ${agreeTerms ? 'text-white' : 'text-gray-500'}`}>
              Create Account
            </Text>
          </TouchableOpacity>

          {/* Already have account */}
          <View className="flex-row justify-center items-center mb-10">
            <Text className="text-gray-600">Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-primary font-bold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Store Type (Optional) */}
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