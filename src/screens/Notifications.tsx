import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  ActivityIndicator,
  FlatList
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useToast } from 'react-native-toast-notifications';


type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Notification {
  id: string;
  type: 'order' | 'stock' | 'payout' | 'performance' | 'subscription';
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
}

export default function Notifications() {
   const toast = useToast();

  const navigation = useNavigation<ScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'order',
          icon: 'shopping-bag',
          iconColor: '#14b8a6',
          iconBg: '#ccfbf1',
          title: 'New Order #1044',
          description: '$129.99 from Sarah Johnson',
          timestamp: '2 mins ago',
          isRead: false
        },
        {
          id: '2',
          type: 'stock',
          icon: 'warning',
          iconColor: '#f59e0b',
          iconBg: '#fef3c7',
          title: 'Low Stock Warning',
          description: 'Premium Wireless Headphones is down to 2 items',
          timestamp: '1 hour ago',
          isRead: false
        },
        {
          id: '3',
          type: 'payout',
          icon: 'check-circle',
          iconColor: '#10b981',
          iconBg: '#d1fae5',
          title: 'Payout Scheduled',
          description: '$1,240.50 will be sent to your bank account tomorrow',
          timestamp: '4 hours ago',
          isRead: true
        },
        {
          id: '4',
          type: 'performance',
          icon: 'info',
          iconColor: '#3b82f6',
          iconBg: '#dbeafe',
          title: 'Store Performance',
          description: 'Your store views are up 24% this week!',
          timestamp: '1 day ago',
          isRead: true
        },
        {
          id: '5',
          type: 'order',
          icon: 'shopping-bag',
          iconColor: '#14b8a6',
          iconBg: '#ccfbf1',
          title: 'New Order #1043',
          description: '$49.99 from Mike Smith',
          timestamp: '1 day ago',
          isRead: true
        },
        {
          id: '6',
          type: 'subscription',
          icon: 'warning',
          iconColor: '#f59e0b',
          iconBg: '#fef3c7',
          title: 'Subscription Renewed',
          description: 'Your Pro Plan has been renewed successfully',
          timestamp: '2 days ago',
          isRead: true
        }
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    //   Toast.show({
    //     type: 'error',
    //     text1: 'Error',
    //     text2: 'Failed to load notifications',
    //   });
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'unread') {
      return !notification.isRead;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);

     
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));

    //   Toast.show({
    //     type: 'success',
    //     text1: 'Success',
    //     text2: 'All notifications marked as read',
    //   });
    } catch (error) {
      console.error('Error marking all as read:', error);
    //   Toast.show({
    //     type: 'error',
    //     text1: 'Error',
    //     text2: 'Failed to mark notifications as read',
    //   });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      setNotifications(
        notifications.map(n =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
      
      
    }

    switch (notification.type) {
      case 'order':
        // Toast.show({
        //   type: 'info',
        //   text1: 'Order Details',
        //   text2: 'Order details screen coming soon',
        // });
        break;
      case 'stock':
        navigation.navigate('ProductsList');
        break;
      case 'payout':
        navigation.navigate('PayoutSettings');
        break;
      case 'performance':
        // Toast.show({
        //   type: 'info',
        //   text1: 'Analytics',
        //   text2: 'Analytics screen coming soon',
        // });
        break;
      case 'subscription':
        navigation.navigate('SubscriptionBilling');
        break;
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => handleNotificationPress(item)}
      className={`flex-row px-4 py-4 border-b border-gray-100 ${
        !item.isRead ? 'bg-blue-50' : 'bg-white'
      }`}
      android_ripple={{ color: '#f3f4f6' }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3 mt-0.5"
        style={{ backgroundColor: item.iconBg }}
      >
        <MaterialIcons name={item.icon as any} size={20} color={item.iconColor} />
      </View>

      <View className="flex-1 mr-2">
        <View className="flex-row items-start justify-between mb-1">
          <Text className={`text-base flex-1 ${item.isRead ? 'text-gray-900' : 'text-gray-900 font-semibold'}`}>
            {item.title}
          </Text>
          <Text className="text-xs text-gray-500 ml-2">{item.timestamp}</Text>
        </View>
        <Text className="text-sm text-gray-600 leading-5">
          {item.description}
        </Text>
      </View>

      {!item.isRead && (
        <View className="w-2 h-2 bg-teal-500 rounded-full mt-2" />
      )}
    </Pressable>
  );

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

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center flex-1">
          <Pressable className="mr-3" onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </Pressable>
          <Text className="text-lg font-medium text-gray-900">Notifications</Text>
        </View>

        {unreadCount > 0 && (
          <Pressable 
            onPress={handleMarkAllRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text className="text-blue-600 font-medium">Mark all read</Text>
            )}
          </Pressable>
        )}
      </View>

      <View className="flex-row px-4 py-3 border-b border-gray-100">
        <Pressable
          onPress={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-full mr-2 ${
            activeFilter === 'all' ? 'bg-gray-900' : 'bg-white border border-gray-300'
          }`}
        >
          <Text className={`font-medium ${activeFilter === 'all' ? 'text-white' : 'text-gray-700'}`}>
            All
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveFilter('unread')}
          className={`flex-row items-center px-4 py-2 rounded-full ${
            activeFilter === 'unread' ? 'bg-gray-900' : 'bg-white border border-gray-300'
          }`}
        >
          <Text className={`font-medium ${activeFilter === 'unread' ? 'text-white' : 'text-gray-700'}`}>
            Unread
          </Text>
          {unreadCount > 0 && (
            <View className={`ml-2 px-2 py-0.5 rounded-full ${
              activeFilter === 'unread' ? 'bg-red-600' : 'bg-red-500'
            }`}>
              <Text className="text-white text-xs font-semibold">{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {filteredNotifications.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <MaterialIcons name="notifications-none" size={64} color="#9ca3af" />
          <Text className="text-gray-500 text-lg mt-4">No notifications</Text>
          <Text className="text-gray-400 text-sm mt-2 text-center">
            {activeFilter === 'unread' 
              ? "You're all caught up!" 
              : "You don't have any notifications yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}