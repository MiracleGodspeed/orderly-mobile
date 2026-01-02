import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  Dimensions
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { LineChart } from 'react-native-chart-kit';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type TimeFilter = 'Today' | '7 Days' | '30 Days' | 'Custom';

export default function ReportsAnalytics() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('7 Days');
  const [chartTab, setChartTab] = useState<'Revenue' | 'Orders'>('Revenue');

  const screenWidth = Dimensions.get('window').width;

  const TIME_FILTERS: TimeFilter[] = ['Today', '7 Days', '30 Days', 'Custom'];


  return (
    <SafeAreaView className="bg-white flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View className="flex-1">
        <View className="px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center">
            <Pressable className="mr-3" onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <Text className="text-lg font-medium text-gray-900">Report & Analytics</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-4">
           <View className="flex-row py-4">
          {TIME_FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full mr-2 ${
                activeFilter === filter ? 'bg-blue-600' : 'bg-gray-100'
              }`}
            >
              <Text className={`text-sm font-medium ${
                activeFilter === filter ? 'text-white' : 'text-gray-700'
              }`}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </View>
          <View className="mb-4">
            <Text className="text-[14px] font-[400] text-[#6A7282] mb-1">Total Revenue</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-[24px] font-[600] text-[#101828]">₦5,440</Text>
              <View className="flex-row items-center">
                <MaterialIcons name="trending-up" size={16} color="#10b981" />
                <Text className="text-[14px] font-[400] text-[#00A63E] ml-1">12.5%</Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[14px] font-[400] text-[#6A7282] mb-1">Total Orders</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-[24px] font-[600] text-[#101828]">98</Text>
              <View className="flex-row items-center">
                <MaterialIcons name="trending-up" size={16} color="#10b981" />
                <Text className="text-[14px] font-[400] text-[#00A63E] ml-1">8.2%</Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-[14px] font-[400] text-[#6A7282] mb-1">Average Order Value</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-[24px] font-[600] text-[#101828]">₦55.51</Text>
              <View className="flex-row items-center">
                <MaterialIcons name="trending-down" size={16} color="#E7000B" />
                <Text className="ext-[14px] font-[400] text-[#E7000B] ml-1">2.1%</Text>
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[14px] font-[400] text-[#6A7282] mb-1">Conversion Rate</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-[24px] font-[600] text-[#101828]">3.4%</Text>
              <View className="flex-row items-center">
                <MaterialIcons name="trending-up" size={16} color="#10b981" />
                <Text className="text-[14px] font-[400] text-[#00A63E] ml-1">1.8%</Text>
              </View>
            </View>
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-semibold text-gray-900">Sales Trend</Text>
              <View className="flex-row">
                <Pressable
                  onPress={() => setChartTab('Revenue')}
                  className="mr-4"
                >
                  <Text className={`text-sm font-medium ${
                    chartTab === 'Revenue' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    Revenue
                  </Text>
                </Pressable>
                <Pressable onPress={() => setChartTab('Orders')}>
                  <Text className={`text-sm font-medium ${
                    chartTab === 'Orders' ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    Orders
                  </Text>
                </Pressable>
              </View>
            </View>

            <LineChart
              data={{
                labels: ['Dec 24', 'Dec 25', 'Dec 26', 'Dec 27', 'Dec 28', 'Dec 30'],
                datasets: [{
                  data: [350, 400, 380, 750, 650, 1050]
                }]
              }}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#2563eb'
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-4">Sales by Product</Text>
            
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-gray-900">Premium Wireless Headphones</Text>
                <Text className="text-sm font-semibold text-gray-900">₦7199.76</Text>
              </View>
              <Text className="text-xs text-gray-500">24 units sold</Text>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-gray-900">Minimalist Smart Watch</Text>
                <Text className="text-sm font-semibold text-gray-900">₦8099.82</Text>
              </View>
              <Text className="text-xs text-gray-500">18 units sold</Text>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-gray-900">Ceramic Coffee Mug Set</Text>
                <Text className="text-sm font-semibold text-gray-900">₦1799.55</Text>
              </View>
              <Text className="text-xs text-gray-500">45 units sold</Text>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-gray-900">Modern Desk Lamp</Text>
                <Text className="text-sm font-semibold text-gray-900">₦989.89</Text>
              </View>
              <Text className="text-xs text-gray-500">11 units sold</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-4">Sales by Channel</Text>
            
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-gray-900">Website</Text>
                <Text className="text-sm font-semibold text-gray-900">₦4120.00</Text>
              </View>
              <Text className="text-xs text-gray-500">72 orders</Text>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-gray-900">Social Media</Text>
                <Text className="text-sm font-semibold text-gray-900">₦980.00</Text>
              </View>
              <Text className="text-xs text-gray-500">18 orders</Text>
            </View>

            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm text-gray-900">Manual Orders</Text>
                <Text className="text-sm font-semibold text-gray-900">$340.00</Text>
              </View>
              <Text className="text-xs text-gray-500">8 orders</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-4">Discount Impact</Text>
            
            <View className="mb-4 p-4 bg-gray-50 rounded-lg">
              <Text className="text-sm font-semibold text-gray-900 mb-3">SUMMER15</Text>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">Before</Text>
                <Text className="text-sm text-gray-900">₦3599.85</Text>
              </View>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">After</Text>
                <Text className="text-sm text-gray-900">₦3059.87</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-600">Customer Savings</Text>
                <Text className="text-sm font-semibold text-green-600">₦539.98</Text>
              </View>
            </View>

            <View className="mb-4 p-4 bg-gray-50 rounded-lg">
              <Text className="text-sm font-semibold text-gray-900 mb-3">HOLIDAY20</Text>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">Before</Text>
                <Text className="text-sm text-gray-900">₦1999.80</Text>
              </View>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs text-gray-600">After</Text>
                <Text className="text-sm text-gray-900">₦1599.84</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-600">Customer Savings</Text>
                <Text className="text-sm font-semibold text-green-600">₦399.96</Text>
              </View>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-4">Insights</Text>
            
            <View className="mb-3">
              <Text className="text-sm text-gray-700 leading-5">
                • Best-selling product this week: Premium Wireless Headphones
              </Text>
            </View>

            <View className="mb-3">
              <Text className="text-sm text-gray-700 leading-5">
                • Revenue up 12.5% vs last period
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-sm text-gray-700 leading-5">
                • Average order value decreased 2.1% — consider upselling
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}