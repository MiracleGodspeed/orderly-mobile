import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  Switch,
  ActivityIndicator
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useToast } from 'react-native-toast-notifications';


type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NotificationSettings {
  pushNotifications: {
    newOrders: boolean;
    lowStockAlerts: boolean;
  };
  emailNotifications: {
    dailySummary: boolean;
    marketingTips: boolean;
  };
}

export default function NotificationProfile() {
   const toast = useToast();

  const navigation = useNavigation<ScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: {
      newOrders: true,
      lowStockAlerts: true,
    },
    emailNotifications: {
      dailySummary: true,
      marketingTips: false,
    }
  });

  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchNotificationSettings();
  }, []);

  const fetchNotificationSettings = async () => {
    try {
      setLoading(true);

      
      const mockSettings: NotificationSettings = {
        pushNotifications: {
          newOrders: true,
          lowStockAlerts: true,
        },
        emailNotifications: {
          dailySummary: true,
          marketingTips: false,
        }
      };

      setSettings(mockSettings);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
     toast.show(error instanceof Error ? error.message : 'Failed to load notification settings', { type: 'danger' });

      
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (
    category: 'pushNotifications' | 'emailNotifications',
    setting: string,
    value: boolean
  ) => {
    const toggleKey = `${category}.${setting}`;
    
    try {
      setToggling(toggleKey);

      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [setting]: value
        }
      }));

     
    } catch (error) {
      console.error('Error updating notification setting:', error);
      
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [setting]: !value
        }
      }));
      
     toast.show(error instanceof Error ? error.message : 'Failed to update notification setting', { type: 'danger' });

      
    } finally {
      setToggling(null);
    }
  };

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
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="bg-white flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Notifications</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="mt-4 px-4">
          <Text className="text-xs font-semibold text-gray-500 mb-3">
            PUSH NOTIFICATIONS
          </Text>

          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-medium text-gray-900 mb-1">
                    New Orders
                  </Text>
                  <Text className="text-sm text-gray-500">
                    Get alerts for incoming orders
                  </Text>
                </View>
                
                <Switch
                  value={settings.pushNotifications.newOrders}
                  onValueChange={(value) => 
                    handleToggle('pushNotifications', 'newOrders', value)
                  }
                  disabled={toggling === 'pushNotifications.newOrders'}
                  trackColor={{ false: "#d1d5db", true: "#10b981" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d5db"
                />
              </View>
            </View>

            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-medium text-gray-900 mb-1">
                    Low Stock Alerts
                  </Text>
                  <Text className="text-sm text-gray-500">
                    Notify when products run low
                  </Text>
                </View>
                
                <Switch
                  value={settings.pushNotifications.lowStockAlerts}
                  onValueChange={(value) => 
                    handleToggle('pushNotifications', 'lowStockAlerts', value)
                  }
                  disabled={toggling === 'pushNotifications.lowStockAlerts'}
                  trackColor={{ false: "#d1d5db", true: "#10b981" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d5db"
                />
              </View>
            </View>
          </View>
        </View>

        <View className="mt-6 px-4 mb-6">
          <Text className="text-xs font-semibold text-gray-500 mb-3">
            EMAIL NOTIFICATIONS
          </Text>

          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Daily Summary */}
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-medium text-gray-900 mb-1">
                    Daily Summary
                  </Text>
                  <Text className="text-sm text-gray-500">
                    Morning report of yesterday's sales
                  </Text>
                </View>
                
                <Switch
                  value={settings.emailNotifications.dailySummary}
                  onValueChange={(value) => 
                    handleToggle('emailNotifications', 'dailySummary', value)
                  }
                  disabled={toggling === 'emailNotifications.dailySummary'}
                  trackColor={{ false: "#d1d5db", true: "#10b981" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d5db"
                />
              </View>
            </View>

            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-medium text-gray-900 mb-1">
                    Marketing & Tips
                  </Text>
                  <Text className="text-sm text-gray-500">
                    News and growth tips
                  </Text>
                </View>
                
                <Switch
                  value={settings.emailNotifications.marketingTips}
                  onValueChange={(value) => 
                    handleToggle('emailNotifications', 'marketingTips', value)
                  }
                  disabled={toggling === 'emailNotifications.marketingTips'}
                  trackColor={{ false: "#d1d5db", true: "#10b981" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d5db"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}