import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  ActivityIndicator
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SubscriptionData {
  plan: string;
  status: string;
  trialDaysLeft: number;
  amount: number;
  billingCycle: string;
  features: string[];
  nextRenewal: string;
}

interface PaymentHistory {
  id: string;
  date: string;
  invoiceNumber: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed';
}

export default function SubscriptionBilling() {
  const navigation = useNavigation<ScreenNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);

      
      const mockSubscription: SubscriptionData = {
        plan: 'Pro',
        status: 'Active',
        trialDaysLeft: 12,
        amount: 29000,
        billingCycle: 'monthly',
        features: [
          'Unlimited Products',
          'Advanced Analytics & Reports',
          'Priority 24/7 Support',
          '0% Transaction Fees',
          'Custom Domain Connection'
        ],
        nextRenewal: 'January 29, 2026'
      };

      const mockPayments: PaymentHistory[] = [
        {
          id: '1',
          date: 'Dec 29, 2025',
          invoiceNumber: '#INV-2025-012',
          amount: 29000,
          status: 'Paid'
        },
        {
          id: '2',
          date: 'Nov 29, 2025',
          invoiceNumber: '#INV-2025-011',
          amount: 29000,
          status: 'Paid'
        },
        {
          id: '3',
          date: 'Oct 29, 2025',
          invoiceNumber: '#INV-2025-010',
          amount: 29000,
          status: 'Paid'
        }
      ];

      setSubscription(mockSubscription);
      setPaymentHistory(mockPayments);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load subscription data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = async () => {
    // try {
    //   Toast.show({
    //     type: 'info',
    //     text1: 'Coming Soon',
    //     text2: 'Subscription renewal will be available soon',
    //   });
    // } catch (error) {
    //   console.error('Error renewing subscription:', error);
    // }
  };

  const handleDownloadAll = async () => {
    // try {
    //   Toast.show({
    //     type: 'info',
    //     text1: 'Coming Soon',
    //     text2: 'Download feature will be available soon',
    //   });
    // } catch (error) {
    //   console.error('Error downloading invoices:', error);
    // }
  };

  const handleViewFullHistory = () => {
    // Navigate to full payment history screen
    Toast.show({
      type: 'info',
      text1: 'Coming Soon',
      text2: 'Full history view will be available soon',
      autoHide: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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
        <Text className="text-lg font-medium text-gray-900">Subscription</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="flex-row px-4 pt-4 pb-2">
          <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm">
            <Text className="text-xs text-gray-500 mb-1">PLAN</Text>
            <Text className="text-xl font-bold text-teal-600">
              {subscription?.plan}
            </Text>
          </View>

          <View className="flex-1 bg-white rounded-xl p-4 mx-1 shadow-sm">
            <Text className="text-xs text-gray-500 mb-1">STATUS</Text>
            <Text className="text-xl font-bold text-green-600">
              {subscription?.status}
            </Text>
          </View>

          <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm">
            <Text className="text-xs text-gray-500 mb-1">TRIAL</Text>
            <Text className="text-xl font-bold text-orange-500">
              {subscription?.trialDaysLeft} Days
            </Text>
          </View>
        </View>

        <View className="mx-4 mt-4 mb-4 bg-white rounded-2xl p-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                {subscription?.plan} Plan
              </Text>
              <Text className="text-sm text-gray-500">
                Billed {subscription?.billingCycle}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-2xl font-bold text-gray-900">
                ₦{subscription?.amount.toLocaleString()}.00
              </Text>
              <Text className="text-sm text-gray-500">per month</Text>
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-xs font-semibold text-gray-500 mb-3">
              INCLUDED FEATURES
            </Text>
            {subscription?.features.map((feature, index) => (
              <View key={index} className="flex-row items-start mb-3">
                <MaterialIcons 
                  name="check" 
                  size={20} 
                  color="#3b82f6" 
                  style={{ marginRight: 8 }}
                />
                <Text className="flex-1 text-gray-700">{feature}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={handleRenewSubscription}
            className="bg-blue-600 rounded-xl py-4 items-center mb-3"
          >
            <Text className="text-white font-semibold text-base">
              Renew Subscription
            </Text>
          </Pressable>

          <Text className="text-center text-sm text-gray-500">
            Next auto-renewal: {subscription?.nextRenewal}
          </Text>
        </View>

        <View className="mx-4 mb-6 bg-white rounded-2xl p-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-bold text-gray-900">
              PAYMENT HISTORY
            </Text>
            <Pressable onPress={handleDownloadAll}>
              <Text className="text-blue-600 font-medium text-sm">
                Download All
              </Text>
            </Pressable>
          </View>

          {paymentHistory.map((payment, index) => (
            <View 
              key={payment.id}
              className={`flex-row items-center py-4 ${
                index !== paymentHistory.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
                <MaterialIcons name="description" size={20} color="#6b7280" />
              </View>

              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900 mb-1">
                  {payment.date}
                </Text>
                <Text className="text-sm text-gray-500">
                  {payment.invoiceNumber}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-base font-bold text-gray-900 mb-1">
                  ₦{payment.amount.toLocaleString()}.00
                </Text>
                <View className={`px-3 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                  <Text className="text-xs font-medium">
                    {payment.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <Pressable 
            onPress={handleViewFullHistory}
            className="mt-4 pt-4 border-t border-gray-100"
          >
            <Text className="text-center text-blue-600 font-medium">
              View Full History
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}