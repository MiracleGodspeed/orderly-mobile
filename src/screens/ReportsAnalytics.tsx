import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { LineChart } from 'react-native-chart-kit';
import { getStorePerformanceReport } from "../api/vendor/vendor.api";
import { StorePerformanceReportData } from "../api/vendor/vendor.types";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReportsAnalytics'>;
type TabType = 'Sales' | 'Customers' | 'GrowthTrend';

interface Props {
  navigation: ScreenNavigationProp;
}

export default function ReportsAnalytics({ navigation }: Props) {
  // const navigation = useNavigation<ScreenNavigationProp>(); // Replaced with prop
  const [activeTab, setActiveTab] = useState<TabType>('Sales');
  const [data, setData] = useState<StorePerformanceReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const result = await getStorePerformanceReport(7);
      setData(result);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const renderSalesTab = () => {
    if (!data) return null;
    const { totalRevenue, totalOrders, totalCustomers } = data.sales;

    return (
      <View>
        <View className="flex-row flex-wrap justify-between -mx-1">
          <View className="w-1/2 p-1 mb-2">
            <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm min-h-[120px] justify-between">
              <View className="bg-blue-50 w-10 h-10 rounded-full items-center justify-center mb-2">
                <MaterialIcons name="attach-money" size={24} color="#2563eb" />
              </View>
              <View>
                <Text className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Revenue</Text>
                <Text className="text-gray-900 text-xl font-bold mt-1">{formatCurrency(totalRevenue)}</Text>
              </View>
            </View>
          </View>

          <View className="w-1/2 p-1 mb-2">
            <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm min-h-[120px] justify-between">
              <View className="bg-orange-50 w-10 h-10 rounded-full items-center justify-center mb-2">
                <MaterialIcons name="shopping-bag" size={24} color="#f97316" />
              </View>
              <View>
                <Text className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Orders</Text>
                <Text className="text-gray-900 text-xl font-bold mt-1">{totalOrders}</Text>
              </View>
            </View>
          </View>

          <View className="w-full p-1 mb-2">
            <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex-row items-center justify-between">
              <View>
                <Text className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Customers</Text>
                <Text className="text-gray-900 text-2xl font-bold mt-1">{totalCustomers}</Text>
                <View className="flex-row items-center mt-1">
                  <MaterialIcons name="trending-up" size={16} color="#16a34a" />
                  <Text className="text-green-600 text-xs font-medium ml-1">15.2% vs last period</Text>
                </View>
              </View>
              <View className="bg-cyan-50 w-12 h-12 rounded-full items-center justify-center">
                <MaterialIcons name="people" size={24} color="#06b6d4" />
              </View>
            </View>
          </View>
        </View>

        {/* Revenue Trend Graph */}
        <View className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-2 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-bold text-gray-900">Revenue Trend</Text>
            <Text className="text-gray-400 text-xs">Daily revenue over time</Text>
          </View>

          <LineChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                data: [15000, 22000, 18000, 24000, 21000, 45000, 32000] // Hardcoded as requested
              }]
            }}
            width={screenWidth - 64} // padding adjustment
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#2563eb' },
              propsForBackgroundLines: { strokeDasharray: "5, 5", stroke: "#e5e7eb" }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            withVerticalLines={false}
            yAxisLabel="₦"
            yAxisSuffix="k"
            // Dividing by 1000 for 'k' suffix in display if needed, but react-native-chart-kit handles labels directly
            // If data is 15000, it shows 15000 with k, so 15000k which is wrong.
            // To fix, mapping data to thousands:
            formatYLabel={(y) => `${(parseInt(y) / 1000).toFixed(0)}`}
          />
        </View>
      </View>
    );
  };

  const renderCustomersTab = () => {
    const customers = [
      { id: 1, name: 'Alice Freeman', orders: 12, spend: '₦125,500', avatar: 'https://i.pravatar.cc/150?u=a' },
      { id: 2, name: 'Michael Jordan', orders: 8, spend: '₦89,200', avatar: 'https://i.pravatar.cc/150?u=b' },
      { id: 3, name: 'Sarah Connor', orders: 5, spend: '₦45,000', avatar: 'https://i.pravatar.cc/150?u=c' },
      { id: 4, name: 'John Wick', orders: 4, spend: '₦32,150', avatar: 'https://i.pravatar.cc/150?u=d' },
    ];

    return (
      <View>
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-900">Top Performing Customers</Text>
          <Text className="text-gray-500 text-sm">Based on total spend and orders</Text>
        </View>

        {customers.map((c, i) => (
          <View key={c.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Image source={{ uri: c.avatar }} className="w-12 h-12 rounded-full bg-gray-200" />
              <View className="ml-3">
                <Text className="text-base font-semibold text-gray-900">{c.name}</Text>
                <Text className="text-sm text-gray-500">{c.orders} orders</Text>
              </View>
            </View>
            <Text className="text-base font-bold text-blue-600">{c.spend}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderGrowthTrendTab = () => {
    if (!data) return null;
    const { growthTrend } = data;

    // Helper to calculate growth percentage safely
    const getGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const renderComparisonCard = (title: string, currentLabel: string, prevLabel: string, currentVal: number, prevVal: number, isInactive: boolean) => {

      const growth = getGrowth(currentVal, prevVal);
      const isPositive = growth >= 0;

      return (
        <View className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
          <Text className="text-base font-semibold text-gray-900 mb-4">{title}</Text>

          <View className="flex-row justify-between mb-4">
            <View>
              <Text className="text-gray-500 text-xs mb-1">{currentLabel}</Text>
              <Text className="text-lg font-bold text-blue-600">
                {isInactive ? 'NO' : formatCurrency(currentVal)}
              </Text>
            </View>
            <View>
              <Text className="text-gray-500 text-xs mb-1">{prevLabel}</Text>
              <Text className="text-lg font-bold text-gray-400">
                {isInactive ? 'NO' : formatCurrency(prevVal)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm mr-2">Growth</Text>
            <View className={`flex-row items-center bg-${isPositive ? 'green' : 'red'}-50 px-2 py-1 rounded`}>
              <MaterialIcons
                name={isPositive ? "arrow-upward" : "arrow-downward"}
                size={14}
                color={isPositive ? "#16a34a" : "#dc2626"}
              />
              <Text className={`text-${isPositive ? 'green' : 'red'}-600 font-bold text-xs ml-1`}>
                {Math.abs(growth).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View>
        <Text className="text-gray-500 text-sm mb-4">Compare your performance across different periods</Text>

        {renderComparisonCard(
          "Today vs Yesterday",
          "Current", "Previous",
          growthTrend.today.totalRevenue,
          growthTrend.yesterday.totalRevenue,
          growthTrend.today.isInactive
        )}

        {renderComparisonCard(
          "This Week vs Last Week",
          "Current", "Previous",
          growthTrend.currentWeek.totalRevenue,
          growthTrend.lastWeek.totalRevenue,
          growthTrend.currentWeek.isInactive
        )}

        {renderComparisonCard(
          "This Month vs Last Month",
          "Current", "Previous",
          growthTrend.currentMonth.totalRevenue,
          growthTrend.lastMonth.totalRevenue,
          growthTrend.currentMonth.isInactive
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View className="bg-white">
        <View className="px-4 py-3 border-b border-gray-200 flex-row items-center">
          <Pressable className="mr-3" onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Reports & Analytics</Text>
        </View>

        {/* Header Card */}
        <View className="mx-4 mt-4 mb-2 bg-[#2563eb] rounded-2xl p-5 overflow-hidden relative">
          {/* Background Decoration */}
          <View className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <View className="absolute bottom-0 right-10 w-24 h-24 bg-white/10 rounded-full" />

          <View className="flex-row items-center mb-1">
            <View className="bg-white/20 p-2 rounded-lg mr-3">
              <MaterialIcons name="analytics" size={20} color="white" />
            </View>
            <Text className="text-white text-lg font-bold">Business Report</Text>
          </View>
          <Text className="text-blue-100 text-sm mt-1">Track your business performance</Text>
        </View>

        {/* Tabs */}
        <View className="flex-row px-4 py-4 space-x-2">
          {(['Sales', 'Customers', 'GrowthTrend'] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-lg border flex-row items-center justify-center ${activeTab === tab ? 'bg-white border-blue-200 shadow-sm' : 'bg-transparent border-transparent'
                }`}
              style={activeTab === tab ? { shadowColor: "#2563eb", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.1, shadowRadius: 4 } : {}}
            >
              {tab === 'Sales' && <FontAwesome5 name="coins" size={12} color={activeTab === tab ? "#2563eb" : "#64748b"} style={{ marginRight: 6 }} />}
              {tab === 'Customers' && <FontAwesome5 name="users" size={12} color={activeTab === tab ? "#2563eb" : "#64748b"} style={{ marginRight: 6 }} />}
              {tab === 'GrowthTrend' && <MaterialIcons name="trending-up" size={16} color={activeTab === tab ? "#2563eb" : "#64748b"} style={{ marginRight: 4 }} />}

              <Text className={`text-xs font-semibold ${activeTab === tab ? 'text-blue-600' : 'text-gray-500'}`}>
                {tab === 'GrowthTrend' ? 'Growth' : tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="h-60 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <View className="pb-10">
            {activeTab === 'Sales' && renderSalesTab()}
            {activeTab === 'Customers' && renderCustomersTab()}
            {activeTab === 'GrowthTrend' && renderGrowthTrendTab()}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}