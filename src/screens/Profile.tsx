import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar 
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useVendor } from '../../context/VendorContext';
import { useAuth } from '../../context/AuthContext';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  icon: string;
  title: string;
  screen?: keyof RootStackParamList; 
  action?: 'logout'; 
}

export default function Profile() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { storeData } = useVendor();
  const { logout, user } = useAuth();

 
  const getInitials = (name: string) => {
    if (!name) return 'S';
    return name.trim().charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'store-info',
      icon: 'store',
      title: 'Store Information',
      screen: 'StoreInformation'
    },
    {
      id: 'personal-details',
      icon: 'person-outline',
      title: 'Personal Details',
      screen: 'PersonalDetails'
    },
    {
      id: 'payout-settings',
      icon: 'account-balance-wallet',
      title: 'Bank Settings',
      screen: 'PayoutSettings'
    },
    {
      id: 'subscription',
      icon: 'credit-card',
      title: 'Subscription & Billing',
      screen: 'SubscriptionBilling'
    },
    {
      id: 'security',
      icon: 'shield-outline',
      title: 'Security',
      screen: 'Security'
    },
    {
      id: 'notifications',
      icon: 'notifications-none',
      title: 'Notifications',
      screen: 'NotificationProfile'
    },
    {
      id: 'help',
      icon: 'help-outline',
      title: 'Help & Support',
      screen: 'HelpSupport'
    },
    {
      id: 'legal',
      icon: 'description',
      title: 'Legal & Policies',
      screen: 'LegalPolicies'
    }
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.action === 'logout') {
      handleLogout();
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Profile</Text>
      </View>

      <ScrollView className="flex-1">
       
        <View className="items-center py-8 border-b border-gray-100">
          <View className="w-24 h-24 rounded-full bg-blue-50 items-center justify-center mb-4">
            <Text className="text-3xl font-bold text-blue-600">
              {getInitials(storeData?.storeName || 'Store')}
            </Text>
          </View>

          <Text className="text-xl font-semibold text-gray-900 mb-1">
            {storeData?.storeName || 'My Store'}
          </Text>

          <Text className="text-sm text-gray-500 mb-3">
            {user?.email || storeData?.email || 'Store Email'}
          </Text>

          <View className="bg-green-100 px-3 py-1 rounded-full">
            <Text className="text-green-700 text-sm font-medium">
              Active Account
            </Text>
          </View>
        </View>

       
        <View className="py-4">
          {menuItems.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => handleMenuPress(item)}
              className="flex-row items-center px-4 py-4 border-b border-gray-100"
              android_ripple={{ color: '#f3f4f6' }}
            >
              <View className="w-10">
                <MaterialIcons 
                  name={item.icon as any} 
                  size={24} 
                  color="#6b7280" 
                />
              </View>

              <Text className="flex-1 text-base text-gray-900 ml-3">
                {item.title}
              </Text>

              <MaterialIcons 
                name="chevron-right" 
                size={24} 
                color="#9ca3af" 
              />
            </Pressable>
          ))}
        </View>

        <View className="px-4 py-6">
          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center py-3"
          >
            <MaterialIcons name="logout" size={20} color="#dc2626" />
            <Text className="text-red-600 font-medium text-base ml-2">
              Log Out
            </Text>
          </Pressable>
        </View>

       
        <View className="items-center pb-8">
          <Text className="text-xs text-gray-400">
            Version 2.4.0 (Build 1042)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}