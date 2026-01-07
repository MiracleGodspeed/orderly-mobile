import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ============ TYPE DEFINITIONS ============
interface ActiveSession {
  id: string;
  deviceName: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function Security() {
  const navigation = useNavigation<ScreenNavigationProp>();

  // ============ STATE MANAGEMENT ============
  const [loading, setLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isToggling2FA, setIsToggling2FA] = useState(false);

  // ============ FETCH SECURITY DATA ============
  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      // const response = await getSecuritySettings();

      // Mock data for now
      const mock2FAStatus = true;
      const mockSessions: ActiveSession[] = [
        {
          id: '1',
          deviceName: 'iPhone 15 Pro',
          location: 'San Francisco, US',
          lastActive: 'Just now',
          isCurrent: true
        },
        {
          id: '2',
          deviceName: 'MacBook Pro',
          location: 'San Francisco, US',
          lastActive: '2 days ago',
          isCurrent: false
        }
      ];

      setTwoFactorEnabled(mock2FAStatus);
      setActiveSessions(mockSessions);
    } catch (error) {
      console.error('Error fetching security data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load security settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword' as any);
  };

  const handleToggle2FA = async (value: boolean) => {
    try {
      setIsToggling2FA(true);

      

      setTwoFactorEnabled(value);

    //   Toast.show({
    //     type: 'success',
    //     text1: 'Success',
    //     text2: value 
    //       ? 'Two-Factor Authentication enabled' 
    //       : 'Two-Factor Authentication disabled',
    //   });
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update 2FA settings',
      });
      setTwoFactorEnabled(!value);
    } finally {
      setIsToggling2FA(false);
    }
  };

  const handleRevokeSession = (session: ActiveSession) => {
    if (session.isCurrent) {
      Toast.show({
        type: 'info',
        text1: 'Cannot Revoke',
        text2: 'You cannot revoke your current session',
      });
      return;
    }

    Alert.alert(
      'Revoke Session',
      `Are you sure you want to revoke access for ${session.deviceName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => confirmRevokeSession(session.id)
        }
      ]
    );
  };

  const confirmRevokeSession = async (sessionId: string) => {
    try {
     
      setActiveSessions(activeSessions.filter(s => s.id !== sessionId));

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('Error revoking session:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to revoke session',
      });
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
        <Text className="text-lg font-medium text-gray-900">Security</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="mx-4 mt-4 mb-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          
          <Pressable
            onPress={handleChangePassword}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
            android_ripple={{ color: '#f3f4f6' }}
          >
            <Text className="flex-1 text-base text-gray-900">
              Change Password
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
          </Pressable>

          <View className="px-4 py-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-base text-gray-900 mb-1">
                  Two-Factor Authentication
                </Text>
                <Text className="text-sm text-gray-500">
                  Protect your account with 2FA
                </Text>
              </View>
              
              <Switch
                value={twoFactorEnabled}
                onValueChange={handleToggle2FA}
                disabled={isToggling2FA}
                trackColor={{ false: "#d1d5db", true: "#10b981" }}
                thumbColor="#fff"
                ios_backgroundColor="#d1d5db"
              />
            </View>
          </View>
        </View>

        <View className="mx-4 mb-6 bg-white rounded-2xl p-4 shadow-sm">
          <Text className="text-xs font-semibold text-gray-500 mb-4">
            ACTIVE SESSIONS
          </Text>

          {activeSessions.map((session, index) => (
            <View 
              key={session.id}
              className={`${
                index !== activeSessions.length - 1 ? 'border-b border-gray-100 pb-4 mb-4' : ''
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Text className="text-base font-medium text-gray-900">
                      {session.deviceName}
                    </Text>
                    {session.isCurrent && (
                      <View className="ml-2 bg-teal-100 px-2 py-0.5 rounded">
                        <Text className="text-xs font-medium text-teal-700">
                          Current
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm text-gray-500">
                    {session.location} • {session.lastActive}
                  </Text>
                </View>

                {!session.isCurrent && (
                  <Pressable
                    onPress={() => handleRevokeSession(session)}
                    className="ml-3"
                  >
                    <Text className="text-red-600 font-medium">Revoke</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}