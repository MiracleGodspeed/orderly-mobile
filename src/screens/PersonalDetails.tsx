import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  TextInput,
  ActivityIndicator
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useVendor } from '../../context/VendorContext';
import KeyboardScreen from "../components/KeyboardScreen";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PersonalInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  jobTitle: string;
}

export default function PersonalDetails() {
  const navigation = useNavigation<ScreenNavigationProp>();
  // const { vendor } = useVendor();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    fetchPersonalDetails();
  }, []);

  const fetchPersonalDetails = async () => {
    try {
      setLoading(true);

      
      const mockData: PersonalInfo = {
        firstName:  'Sarah',
        lastName:  'Johnson',
        phoneNumber:  '+1 (555) 123-4567',
        jobTitle:  'Owner'
      };

      setFirstName(mockData.firstName);
      setLastName(mockData.lastName);
      setPhoneNumber(mockData.phoneNumber);
      setJobTitle(mockData.jobTitle);
    } catch (error) {
      console.error('Error fetching personal details:', error);
      
    } finally {
      setLoading(false);
    }
  };

 
  const handleFieldChange = (field: string, value: string) => {
    setHasChanges(true);
    
    switch(field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'phoneNumber':
        setPhoneNumber(value);
        break;
      case 'jobTitle':
        setJobTitle(value);
        break;
    }
  };

 
  const handleFieldBlur = async () => {
    if (!hasChanges) return;

    try {
      setIsSaving(true);

      const updatedData = {
        firstName,
        lastName,
        phoneNumber,
        jobTitle
      };

     

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving personal details:', error);
      
    } finally {
      setIsSaving(false);
    }
  };

 
  useEffect(() => {
    return () => {
      if (hasChanges) {
        handleFieldBlur();
      }
    };
  }, [hasChanges]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Personal Details</Text>
        
        {isSaving && (
          <View className="ml-auto">
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}
      </View>

      <View className="flex-1 px-4 pt-6">
        <KeyboardScreen>
        <View className="flex-row mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-medium text-gray-900 mb-2">
              First Name
            </Text>
            <TextInput
              value={firstName}
              onChangeText={(value) => handleFieldChange('firstName', value)}
              onBlur={handleFieldBlur}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
              placeholder="Enter first name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="flex-1 ml-2">
            <Text className="text-sm font-medium text-gray-900 mb-2">
              Last Name
            </Text>
            <TextInput
              value={lastName}
              onChangeText={(value) => handleFieldChange('lastName', value)}
              onBlur={handleFieldBlur}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
              placeholder="Enter last name"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Phone Number
          </Text>
          <TextInput
            value={phoneNumber}
            onChangeText={(value) => handleFieldChange('phoneNumber', value)}
            onBlur={handleFieldBlur}
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="+1 (555) 123-4567"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-900 mb-2">
            Job Title / Role
          </Text>
          <TextInput
            value={jobTitle}
            onChangeText={(value) => handleFieldChange('jobTitle', value)}
            onBlur={handleFieldBlur}
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
            placeholder="e.g. Owner, Manager"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View className="py-6">
          <Text className="text-center text-sm text-gray-500">
            Changes are saved automatically when you leave this screen.
          </Text>
        </View>
        </KeyboardScreen>
      </View>
    </SafeAreaView>
  );
}