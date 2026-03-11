import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  RefreshControl
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useToast } from 'react-native-toast-notifications';
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

import { getSubscriptionHistory } from "../api/vendor/vendor.api"; 
import { SubscriptionHistory } from "../api/vendor/vendor.types";

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;


const SubscriptionSkeleton = () => (
  <SkeletonPlaceholder borderRadius={12} backgroundColor="#e1e9ee" highlightColor="#f2f8fc">
    <View style={{ paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        <View style={{ flex: 1, height: 80, marginRight: 8, borderRadius: 12 }} />
        <View style={{ flex: 1, height: 80, marginHorizontal: 4, borderRadius: 12 }} />
        <View style={{ flex: 1, height: 80, marginLeft: 8, borderRadius: 12 }} />
      </View>

      <View style={{ marginTop: 24, height: 280, borderRadius: 20 }} />

      <View style={{ marginTop: 24, padding: 16, backgroundColor: 'white', borderRadius: 20 }}>
        <View style={{ width: 120, height: 20, marginBottom: 20 }} />
        {[1, 2, 3].map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <View style={{ width: '50%', height: 14, marginBottom: 6 }} />
              <View style={{ width: '30%', height: 10 }} />
            </View>
            <View style={{ width: 60, height: 24, borderRadius: 12 }} />
          </View>
        ))}
      </View>
    </View>
  </SkeletonPlaceholder>
);

export default function SubscriptionBilling() {
  const toast = useToast();
  const navigation = useNavigation<ScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);

  const currentSub = history.length > 0 ? history[0] : null;

  const fetchSubscriptionData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const data = await getSubscriptionHistory({ pageIndex: 1, pageSize: 20 });
      setHistory(data);
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      toast.show(error.message || 'Failed to load subscription data', { type: 'danger' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSubscriptionData(true);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="bg-white flex-row items-center px-4 py-3 border-b border-gray-200">
        <Pressable className="mr-3" onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text className="text-lg font-medium text-gray-900">Subscription</Text>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3b82f6"]} tintColor="#3b82f6" />
        }
      >
        {loading ? (
          <SubscriptionSkeleton />
        ) : (
          <>
            <View className="flex-row px-4 pt-4 pb-2">
              <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm border border-gray-100">
                <Text className="text-[10px] text-gray-400 mb-1 font-bold uppercase">Plan</Text>
                <Text className="text-lg font-bold text-teal-600" numberOfLines={1}>
                  {currentSub?.subscriptionPlan.name || 'None'}
                </Text>
              </View>

              <View className="flex-1 bg-white rounded-xl p-4 mx-1 shadow-sm border border-gray-100">
                <Text className="text-[10px] text-gray-400 mb-1 font-bold uppercase">Status</Text>
                <Text className={`text-lg font-bold ${currentSub?.isActive ? 'text-green-600' : 'text-red-500'}`}>
                  {currentSub?.isActive ? 'Active' : 'Expired'}
                </Text>
              </View>

              <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm border border-gray-100">
                <Text className="text-[10px] text-gray-400 mb-1 font-bold uppercase">Remaining</Text>
                <Text className="text-lg font-bold text-orange-500">
                  {currentSub?.daysRemaining ?? 0} Days
                </Text>
              </View>
            </View>

            <View className="mx-4 mt-4 mb-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {currentSub?.subscriptionPlan.name || 'No Active Plan'}
                  </Text>
                  <Text className="text-sm text-gray-500 capitalize">
                    Billed {currentSub?.durationUnit || 'periodically'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-bold text-gray-900">
                    ₦{(currentSub?.amountPaid ?? 0).toLocaleString()}
                  </Text>
                  <Text className="text-sm text-gray-500">total</Text>
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">
                  Plan Features
                </Text>
                {currentSub?.planFeatures.map((feature, index) => (
                  <View key={index} className="flex-row items-start mb-3">
                    <MaterialIcons name="check-circle" size={18} color="#3b82f6" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text className="flex-1 text-gray-700">{feature}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => navigation.navigate('SubscriptionFlow', { 
   initialPlanName: currentSub?.subscriptionPlan.name 
})}
                className="bg-blue-600 rounded-xl py-4 items-center mb-3 active:opacity-80"
              >
                <Text className="text-white font-semibold text-base">
                  Renew Subscription
                </Text>
              </Pressable>

              <Text className="text-center text-xs text-gray-400 font-medium">
                Expires on: {formatDate(currentSub?.expiryDate || '')}
              </Text>
            </View>

            <View className="mx-4 mb-10 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Text className="text-base font-bold text-gray-900 mb-4">
                PAYMENT HISTORY
              </Text>

              {history.length > 0 ? (
                history.map((item, index) => (
                  <View 
                    key={item.paymentReference + index}
                    className={`flex-row items-center py-4 ${
                      index !== history.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <View className="w-10 h-10 bg-blue-50 rounded-lg items-center justify-center mr-3">
                      <MaterialIcons name="receipt-long" size={20} color="#3b82f6" />
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-gray-900">
                        {formatShortDate(item.createdAt)}
                      </Text>
                    </View>

                    <View className="items-end">
                      <Text className="text-sm font-bold text-gray-900 mb-1">
                        ₦{item.amountPaid.toLocaleString()}
                      </Text>
                      <View className={`px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                        <Text className="text-[10px] font-bold uppercase">
                          {item.status === 'success' ? 'Paid' : item.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-center text-gray-400 py-6 italic">No transactions found</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      
    </SafeAreaView>
  );
}
