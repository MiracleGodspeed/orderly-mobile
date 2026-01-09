import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  Linking
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useToast } from 'react-native-toast-notifications';


type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ============ MENU ITEM INTERFACE ============
interface SupportOption {
  id: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  action: () => void;
  rightIcon: 'external-link' | 'chevron';
}

export default function HelpSupport() {
   const toast = useToast();

  const navigation = useNavigation<ScreenNavigationProp>();

  // ============ HANDLE HELP CENTER ============
  // Opens help center URL in browser
  const handleHelpCenter = async () => {
    try {
      const url = 'https://help.orderlystores.com'; // Replace with actual URL
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
      toast.show('Could not open help center', { type: 'danger' });

        
      }
    } catch (error) {
      console.error('Error opening help center:', error);
      toast.show('Could not open help center', { type: 'danger' });

     
    }
  };

  // ============ HANDLE CONTACT SUPPORT ============
  // Opens contact support screen or form
  const handleContactSupport = () => {
    // TODO: Navigate to contact support screen or open email
     toast.show('Coming Soon!!!', { type: 'normal' });

    
  };

  // ============ HANDLE SEND FEEDBACK ============
  // Opens feedback form
  const handleSendFeedback = () => {
    // TODO: Navigate to feedback form
        toast.show('Coming Soon!!!', { type: 'normal' });

  };

  // ============ SUPPORT OPTIONS CONFIGURATION ============
  const supportOptions: SupportOption[] = [
    {
      id: 'help-center',
      icon: 'help-outline',
      iconColor: '#14b8a6',
      iconBg: '#ccfbf1',
      title: 'Help Center',
      action: handleHelpCenter,
      rightIcon: 'external-link'
    },
    {
      id: 'contact-support',
      icon: 'chat-bubble-outline',
      iconColor: '#14b8a6',
      iconBg: '#ccfbf1',
      title: 'Contact Support',
      action: handleContactSupport,
      rightIcon: 'chevron'
    },
    {
      id: 'send-feedback',
      icon: 'mail-outline',
      iconColor: '#14b8a6',
      iconBg: '#ccfbf1',
      title: 'Send Feedback',
      action: handleSendFeedback,
      rightIcon: 'chevron'
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ============ HEADER ============ */}
      <View className="bg-white flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Help & Support</Text>
      </View>

      <ScrollView className="flex-1">
        {/* ============ SUPPORT OPTIONS CARD ============ */}
        <View className="mx-4 mt-4 mb-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          {supportOptions.map((option, index) => (
            <Pressable
              key={option.id}
              onPress={option.action}
              className={`flex-row items-center px-4 py-4 ${
                index !== supportOptions.length - 1 ? 'border-b border-gray-100' : ''
              }`}
              android_ripple={{ color: '#f3f4f6' }}
            >
              {/* Icon Circle */}
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: option.iconBg }}
              >
                <MaterialIcons 
                  name={option.icon as any} 
                  size={24} 
                  color={option.iconColor} 
                />
              </View>

              {/* Title */}
              <Text className="flex-1 text-base text-gray-900">
                {option.title}
              </Text>

              {/* Right Icon */}
              {option.rightIcon === 'external-link' ? (
                <MaterialIcons 
                  name="open-in-new" 
                  size={20} 
                  color="#9ca3af" 
                />
              ) : (
                <MaterialIcons 
                  name="chevron-right" 
                  size={24} 
                  color="#9ca3af" 
                />
              )}
            </Pressable>
          ))}
        </View>

        {/* ============ URGENT HELP INFO CARD ============ */}
        <View className="mx-4 mb-6 bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <Text className="text-base font-semibold text-blue-900 mb-2">
            Need urgent help?
          </Text>
          <Text className="text-sm text-blue-700 leading-5">
            Our support team is available 24/7. Priority support is included in your plan.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}