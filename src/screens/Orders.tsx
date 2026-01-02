import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  TextInput
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type OrderStatus = 'Paid' | 'Pending' | 'Shipped' | 'Completed' | 'Cancelled';
type FilterType = 'all' | 'pending' | 'paid' | 'shipped';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: string;
  status: OrderStatus;
  date: string;
  dateGroup: 'Today' | 'Yesterday' | 'Earlier';
  image: any;
}

export default function Orders() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const orders: Order[] = [
    {
      id: '1',
      orderNumber: '#1043',
      customerName: 'Lydia Seiyefa',
      amount: '₦2,500.99',
      status: 'Paid',
      date: '2024-01-10',
      dateGroup: 'Today',
      image: require('../../assets/haedphones.png'),
    },
    {
      id: '2',
      orderNumber: '#1042',
      customerName: 'Victoria Adekola',
      amount: '₦450.99',
      status: 'Shipped',
      date: '2024-01-10',
      dateGroup: 'Today',
       image: require('../../assets/sneakers.png')
    },
    {
      id: '3',
      orderNumber: '#1041',
      customerName: 'Naomi Nwanze',
      amount: '₦5,400.99',
      status: 'Completed',
      date: '2024-01-09',
      dateGroup: 'Yesterday',
       image: require('../../assets/watch.png')
    },
    {
      id: '4',
      orderNumber: '#1040',
      customerName: 'Grace Nwabueze',
      amount: '₦100.19',
      status: 'Pending',
      date: '2024-01-09',
      dateGroup: 'Yesterday',
      image: require('../../assets/haedphones.png')

    },
    {
      id: '5',
      orderNumber: '#1039',
      customerName: 'Abubakar Idris',
      amount: '₦1,400.50',
      status: 'Shipped',
      date: '2024-01-08',
      dateGroup: 'Earlier',
       image: require('../../assets/lamp.png')
    },
    {
      id: '6',
      orderNumber: '#1038',
      customerName: 'Ngoebi Amiesimaka',
      amount: '₦3,500.00',
      status: 'Cancelled',
      date: '2024-01-08',
      dateGroup: 'Earlier',
      image: require('../../assets/watch.png')
    }
  ];

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Paid':
        return 'text-blue-600';
      case 'Pending':
        return 'text-orange-600';
      case 'Shipped':
        return 'text-purple-600';
      case 'Completed':
        return 'text-green-600';
      case 'Cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      activeFilter === 'all' ? true :
      activeFilter === 'pending' ? order.status === 'Pending' :
      activeFilter === 'paid' ? order.status === 'Paid' :
      activeFilter === 'shipped' ? order.status === 'Shipped' : true;
    
    return matchesSearch && matchesFilter;
  });

  const groupedOrders = filteredOrders.reduce((groups, order) => {
    const group = order.dateGroup;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(order);
    return groups;
  }, {} as Record<string, Order[]>);

  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View className="flex-1">
        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center mb-4">
            <Pressable className="mr-3" onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <Text className="text-lg font-medium text-gray-900">Orders</Text>
          </View>

          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-3">
            <MaterialIcons name="search" size={20} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-base"
              placeholder="Search products"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              onPress={() => setActiveFilter('all')}
              className={`flex-row items-center px-4 py-2 rounded-full mr-2 ${
                activeFilter === 'all' ? 'bg-blue-600' : 'bg-gray-100'
              }`}
            >
              <Text className={`font-medium ${
                activeFilter === 'all' ? 'text-white' : 'text-gray-700'
              }`}>
                All orders
              </Text>
              {activeFilter === 'all' && (
                <MaterialIcons name="close" size={16} color="#fff" className="ml-2" />
              )}
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('pending')}
              className={`px-4 py-2 rounded-full mr-2 ${
                activeFilter === 'pending' ? 'bg-blue-600' : 'bg-gray-100'
              }`}
            >
              <Text className={`font-medium ${
                activeFilter === 'pending' ? 'text-white' : 'text-gray-700'
              }`}>
                Pending
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('paid')}
              className={`px-4 py-2 rounded-full mr-2 ${
                activeFilter === 'paid' ? 'bg-blue-600' : 'bg-gray-100'
              }`}
            >
              <Text className={`font-medium ${
                activeFilter === 'paid' ? 'text-white' : 'text-gray-700'
              }`}>
                Paid
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('shipped')}
              className={`px-4 py-2 rounded-full ${
                activeFilter === 'shipped' ? 'bg-blue-600' : 'bg-gray-100'
              }`}
            >
              <Text className={`font-medium ${
                activeFilter === 'shipped' ? 'text-white' : 'text-gray-700'
              }`}>
                Shipped
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        <ScrollView className="flex-1 px-4">
          {Object.entries(groupedOrders).map(([dateGroup, groupOrders]) => (
            <View key={dateGroup}>
              <Text className="text-sm text-gray-500 font-medium mt-4 mb-3">
                {dateGroup}
              </Text>

              {groupOrders.map((order) => (
                <Pressable
                  key={order.id}
                 onPress={() =>
  navigation.navigate("OrderDetails", {order})
}
                  className="bg-white rounded-xl p-4 mb-3 border border-gray-200"
                >
                  <View className="flex-row items-start">
                    <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                      <MaterialIcons name="inventory-2" size={20} color="#6b7280" />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-base font-semibold text-gray-900">
                          {order.customerName}
                        </Text>
                        <Text className="text-base font-bold text-gray-900">
                          {order.amount}
                        </Text>
                      </View>

                      <View className="flex-row items-center justify-between">
                        <Text className={`text-sm ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Text>
                        <Text className="text-sm text-gray-500">
                          {order.orderNumber}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}

          {filteredOrders.length === 0 && (
            <View className="flex-1 items-center justify-center py-12">
              <MaterialIcons name="receipt-long" size={64} color="#d1d5db" />
              <Text className="text-gray-500 text-base mt-4">No orders found</Text>
              <Text className="text-gray-400 text-sm mt-1">
                {searchQuery ? 'Try a different search term' : 'No orders in this category'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}