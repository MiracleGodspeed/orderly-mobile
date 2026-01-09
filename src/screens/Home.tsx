import React, { useState, useRef, useEffect,  } from 'react';
import { View, ScrollView, StatusBar, TouchableOpacity, Text, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import MenuOverlay from '../components/MenuOverlay';
import StoreSetupProgress from '../components/StoreSetupProgress';
import { Ionicons, Feather, MaterialIcons, Octicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { getStorefrontDetails } from '../api/vendor/vendor.api';
import { useVendor } from '../../context/VendorContext';
import { getProducts,deleteProduct  } from '../../src/api/vendor/vendor.api';
import { Product } from '../../src/api/vendor/vendor.types';
import { useToast } from 'react-native-toast-notifications';

import { getPaidOrders } from "../api/vendor/vendor.api";
import { Order } from "../api/vendor/vendor.types";
import AsyncStorage from '@react-native-async-storage/async-storage';



type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;


export default function Home() {
   const toast = useToast();
   const currentSlideRef = useRef(0);

    const navigation = useNavigation<ScreenNavigationProp>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [trialModalVisible, setTrialModalVisible] = useState(false);
const [loadingTrialStatus, setLoadingTrialStatus] = useState(false);
const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const { storeData, checklistItems } = useVendor()
    const [isTrial, setIsTrial] = useState<boolean>(storeData?.storeSubscription?.isTrial || false);

     const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);

  const [totalProductCount, setTotalProductCount] = useState(0);
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(2);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);


// const fetchTrialStatus = async () => {
//   try {
//     const data = await getStorefrontDetails();

//     setIsTrial(data.storeSubscription.isTrial);
//     setDaysRemaining(data.storeSubscription.daysRemaining);

//     if (data.storeSubscription.isTrial) {
//       setTrialModalVisible(true);
//     }

//   } catch (error) {
//     console.error("Failed to fetch storefront details", error);
//   }
// };

const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data);
      setTotalProductCount(response.totalCount);
    } catch (error) {
      console.error('Error fetching products:', error);
     toast.show(error instanceof Error ? error.message : 'Failed to fetch products', { type: 'danger' });

      
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await getPaidOrders({
          pageIndex: 1,
          pageSize: 20,
        });
  
        setTotalOrderCount(res.totalCount);
      } catch (error) {
        console.error("Failed to fetch orders", error);
      } finally {
        setLoading(false);
      }
    };
  

useFocusEffect(
  React.useCallback(() => {
    fetchProducts();
    fetchOrders()
    // fetchTrialStatus();
  }, [])
);

const openSetupModal = () => {
  setSetupModalOpen(true);
};

const closeSetupModal = () => {
  setSetupModalOpen(false);
};

   const handleContinueSetup = () => {
    navigation.navigate('SetupStep1');
  };

  const slides = [
    {
      title: 'Get your store live today',
      subtitle: 'Just 3 more steps to publish your online store',
      buttonText: 'Continue setup',
      color: '#FFFFFF',
      image: require('../../assets/magic.png'),
    },
    {
      title: 'Special Discount Alert!',
      subtitle: '20% off on featured products this week',
      buttonText: 'View Offers',
      color: '#7C3AED',
      image: require('../../assets/magic.png')
    },
    {
      title: 'New Feature Released',
      subtitle: 'Check out our latest analytics dashboard',
      buttonText: 'Learn More',
      color: '#059669',
      image: require('../../assets/magic.png')
    }
  ];

 useEffect(() => {
  const timer = setInterval(() => {
    const nextSlide = (currentSlideRef.current + 1) % slides.length;
    currentSlideRef.current = nextSlide;  // Update ref
    setCurrentSlide(nextSlide);           // Update state for indicators

    scrollViewRef.current?.scrollTo({
      x: nextSlide * CARD_WIDTH,
      animated: true,
    });
  }, 4000); // 4 seconds per slide

  return () => clearInterval(timer); // clean up interval
}, []); 


  const goToStep = (screen: keyof RootStackParamList) => {
  setSetupModalOpen(false);
//   navigation.navigate(screen);
};
    const completedCount = checklistItems.filter(item => item.completed).length;
    // const progressPercentage = (completedCount / checklistItems.length) * 100;
    const progressPercentage = Math.floor((completedCount / checklistItems.length) * 100);

    // console.log(checklistItems, "checklistItems")

    const markStepCompleted = async (step: string) => {
        setCompletedSteps(prev => {
            const updated = prev.includes(step) ? prev : [...prev, step];
            AsyncStorage.setItem('store_setup_steps', JSON.stringify(updated));
            return updated;
        });
    };

const handleMomentumScrollEnd = (event: any) => {
  const slideIndex = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
  currentSlideRef.current = slideIndex; // keep ref in sync
  setCurrentSlide(slideIndex);          // update indicator
};

  return (
      <SafeAreaView className="flex-1 bg-[#f4f4f5]" >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
         <Header onMenuClick={() => setMenuOpen(true)} unreadCount={unreadNotificationsCount} />
            <MenuOverlay isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
                <ScrollView className='flex-1' showsVerticalScrollIndicator={false}  contentContainerStyle={{ paddingBottom: 80 }}  >
              <StoreSetupProgress progress={progressPercentage == 0 ? 25 : progressPercentage} onContinue={openSetupModal} />

                    <View className="px-10 mt-2 pb-3 flex-row items-center justify-between">

                        <Text className="text-[17px] text-gray-600 font-semibold">{storeData?.storeName || '[store_name]'}</Text>
                        <TouchableOpacity className="p-2" activeOpacity={0.7}>
                        <Ionicons name="share-social-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <View className="mx-4 mb-4 p-6 bg-white rounded-2xl border border-gray-100">
                        <Text className="text-base font-medium text-gray-700 mb-4">Store Overview</Text>
                        
                        <TouchableOpacity className="flex-row items-center justify-center gap-2 mb-4" activeOpacity={0.7}>
                            <Text className="text-[16px] text-gray-600 font-[400]">Sales this month</Text>
                            <Feather name="chevron-down" size={15} color="black" />
                        </TouchableOpacity>
                        
                        <Text className="text-4xl font-[600] text-gray-800 mb-6 text-center mt-3">
                            {/* ₦24,500.00 */}
                            0.00
                            </Text>
                        
                        <View className="flex-row justify-between">
                            <View className="items-center">
                                <MaterialIcons name="storefront" size={24} color="#9CA3AF" />
                                <Text className="text-[24px] font-[500] text-gray-800 mt-1 mb-1">122</Text>
                                <Text className="text-[12px] text-gray-500">Visits</Text>
                            </View>
                            
                            <View className="items-center">
                                <Octicons name="stack" size={24} color="#9CA3AF" />
                                <Text className="text-2xl font-bold text-gray-800 mt-1 mb-1">{totalProductCount}</Text>
                                <Text className="text-[12px] text-gray-500">Stocks</Text>
                            </View>
                            
                            <View className="items-center">
                                <Ionicons name="cart-outline" size={24} color="#9CA3AF"  />
                                <Text className="text-2xl font-bold text-gray-800 mb-1">{totalOrderCount}</Text>
                                <Text className="text-[12px] text-gray-500">Orders</Text>
                            </View>
                        </View>
                    </View>
              <View className="mb-4 mx-4 bg-[#fff] px-3 py-3 rounded-2xl border border-gray-100">
                 
                      <Text className="text-[16px] font-[400] text-gray-600 mb-4">Quick Actions</Text>
                  <View className='' >
                      <View className="flex-row justify-between mb-6 ">
                          <TouchableOpacity className="items-center" activeOpacity={0.7}>
                              <View className="relative">
                                  <View className="w-[60px] h-[60px] bg-blue-50 rounded-xl items-center justify-center mb-2">
                                      <Ionicons name="add" size={24} color="#1A56DB" />
                                  </View>
                              </View>
                              <Text className="text-xs text-[#404040] text-center w-16">
                                  Add Product
                              </Text>
                          </TouchableOpacity>

                          <TouchableOpacity className="items-center" activeOpacity={0.7} onPress={() => navigation.navigate('ProductsList')}>
                              <View className="relative">
                                  <View className="w-[60px] h-[60px] bg-blue-50 rounded-xl items-center justify-center mb-2">
                                      <Ionicons name="cube-outline" size={24} color="#1A56DB" />
                                  </View>
                                  <View className="absolute -top-1 -right-1 bg-red-500 px-1.5 py-0.5 rounded-full min-w-[20px] items-center">
                                      <Text className="text-white text-xs font-semibold">{totalProductCount}</Text>
                                  </View>
                              </View>
                              <Text className="text-xs text-[#404040] text-center w-16" >
                                  Products
                              </Text>
                          </TouchableOpacity>

                          <TouchableOpacity className="items-center" activeOpacity={0.7} onPress={() => navigation.navigate('Orders')}>
                              <View className="relative">
                                  <View className="w-[60px] h-[60px] bg-blue-50 rounded-xl items-center justify-center mb-2">
                                      <Ionicons name="cart-outline" size={24} color="#1A56DB" />
                                  </View>
                                  <View className="absolute -top-1 -right-1 bg-red-500 px-1.5 py-0.5 rounded-full min-w-[20px] items-center">
                                      <Text className="text-white text-xs font-semibold">{totalOrderCount}</Text>
                                  </View>
                              </View>
                              <Text className="text-xs text-[#404040] text-center w-16">
                                  Orders
                              </Text>
                          </TouchableOpacity>

                          <TouchableOpacity className="items-center" activeOpacity={0.7}>
                              <View className="w-[60px] h-[60px] bg-blue-50 rounded-xl items-center justify-center mb-2">
                                  <Ionicons name="bar-chart-outline" size={24} color="#1A56DB" />
                              </View>
                              <Text className="text-xs text-[#404040] text-center w-16">
                                  Analytics
                              </Text>
                          </TouchableOpacity>
                      </View>

                      <View className="flex-row justify-between">
                          <TouchableOpacity className="items-center" activeOpacity={0.7}>
                              <View className="relative">
                                  <View className="w-[60px] h-[60px] bg-blue-50 rounded-xl items-center justify-center mb-2">
                                      <Ionicons name="people-outline" size={24} color="#1A56DB" />
                                  </View>
                                  <View className="absolute -top-1 -right-1 bg-red-500 px-1.5 py-0.5 rounded-full min-w-[20px] items-center">
                                      <Text className="text-white text-xs font-semibold">122</Text>
                                  </View>
                              </View>
                              <Text className="text-xs text-[#404040] text-center w-16">
                                  Customers
                              </Text>
                          </TouchableOpacity>

                          <TouchableOpacity className="items-center" activeOpacity={0.7}>
                              <View className="w-[60px] h-[60px] bg-blue-50 rounded-xl items-center justify-center mb-2">
                                  <Ionicons name="globe-outline" size={24} color="#1A56DB" />
                              </View>
                              <Text className="text-xs text-[#404040] text-center w-16">
                                  Website
                              </Text>
                          </TouchableOpacity>

                          <TouchableOpacity className="items-center" activeOpacity={0.7} onPress={() => navigation.navigate('LocationManagement')}>
                              <View className="w-[60px] h-[60px] bg-blue-50 rounded-xl items-center justify-center mb-2">
                                  <Ionicons name="car-outline" size={24} color="#1A56DB" />
                              </View>
                              <Text className="text-xs text-[#404040] text-center w-16">
                                  Delivery
                              </Text>
                          </TouchableOpacity>

                          <TouchableOpacity className="items-center" activeOpacity={0.7}>
                              <View className="w-[60px] h-[60px] bg-blue-50 rounded-xl items-center justify-center mb-2">
                                  <Ionicons name="settings-outline" size={24} color="#1A56DB" />
                              </View>
                              <Text className="text-xs text-[#404040] text-center w-16">
                                  Settings
                              </Text>
                          </TouchableOpacity>
                      </View>
                        </View>
                    </View>
                   <View className="px-4 mb-5">
  <ScrollView
    ref={scrollViewRef}
    horizontal
    pagingEnabled
    showsHorizontalScrollIndicator={false}
    onMomentumScrollEnd={handleMomentumScrollEnd}
  >
    {slides.map((slide, index) => (
      <View 
        key={index}
        className="p-6 rounded-2xl flex-row items-center"
        style={{ 
          width: CARD_WIDTH,
          backgroundColor: "#fff"
        }}
      >
        <View className="flex-1">
          <View className="flex-row mb-4 items-center gap-3">
            <View className="w-20 h-20 rounded-xl overflow-hidden">
              <Image 
                source={slide.image}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View className="flex-1">
              <Text className="text-[#1F2A37] font-[400] text-[16px] mb-1">{slide.title}</Text>
              <Text className="text-[#6B7280] text-[12px]">{slide.subtitle}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleContinueSetup}
            className="bg-[#1A56DB] px-6 py-2.5 rounded-full self-start flex-row items-center gap-2"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-sm">{slide.buttonText}</Text>
            <Text className="text-white">→</Text>
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </ScrollView>

  <View className="flex-row justify-center gap-1.5 mt-3">
    {slides.map((_, index) => (
      <View
        key={index}
        className={`h-1.5 rounded-full ${
          index === currentSlide ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300'
        }`}
      />
    ))}
  </View>
</View>

                </ScrollView>

                <Modal
  isVisible={setupModalOpen}
  onBackdropPress={closeSetupModal}
  useNativeDriver
  hideModalContentWhileAnimating={false}
  animationIn="slideInUp"
  animationOut="slideOutDown"
  animationInTiming={200}
  animationOutTiming={150}
  backdropTransitionInTiming={0}
  backdropTransitionOutTiming={0}
  style={{ justifyContent: 'flex-end', margin: 0 }}
>
  <View className="bg-white rounded-t-3xl px-5 pt-4 pb-6">

    {/* Header */}
    <View className="flex-row items-center justify-between mb-4">
      <View />
      <Text className="text-[#1F2A37] text-[16px]">Account Setup</Text>
      <TouchableOpacity onPress={closeSetupModal}>
        <Ionicons name="close" size={22} color="#111827" />
      </TouchableOpacity>
    </View>

    <Text className="text-[24px] font-[400] text-gray-900 mb-2 text-center">
      Complete Your Store Setup
    </Text>

    <Text className="text-sm text-gray-500 mb-4">
      You're almost there! Finish these steps to get your store ready to sell
      and start accepting orders.
    </Text>

    {/* Progress */}
    <View className="flex-row items-center justify-between mb-2">
      <Text className="text-xs text-gray-500">
        Step {completedSteps.length + 1} of 3
      </Text>
      <Text className="text-xs text-blue-600 font-medium">
        {Math.round((completedSteps.length / 3) * 100)}% complete
      </Text>
    </View>

    <View className="w-full h-1.5 bg-gray-200 rounded-full mb-5">
      <View
        className="h-1.5 bg-blue-600 rounded-full"
        style={{ width: `${(completedSteps.length / 3) * 100}%` }}
      />
    </View>

    {/* STEP 1 */}
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        markStepCompleted('customize-store');
        closeSetupModal();
        navigation.navigate('ManageStore');
      }}
      className="flex-row items-start justify-between p-4 border border-gray-200 rounded-xl mb-3"
    >
      <View className="flex-row gap-3 flex-1">
        <View
          className={`w-5 h-5 rounded-full mt-1 items-center justify-center ${
            completedSteps.includes('customize-store')
              ? 'bg-blue-600'
              : 'border border-gray-400'
          }`}
        >
          {completedSteps.includes('customize-store') && (
            <Ionicons name="checkmark" size={14} color="white" />
          )}
        </View>

        <View className="flex-1">
          <Text
            className={`text-sm font-medium mb-1 ${
              completedSteps.includes('customize-store')
                ? 'text-blue-600'
                : 'text-gray-900'
            }`}
          >
            Customize Your Storefront
          </Text>
          <Text className="text-xs text-gray-500">
            Add your logo, brand colors, and layout to make your store look
            professional and on-brand.
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#2563EB" />
    </TouchableOpacity>

    {/* STEP 2 */}
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        markStepCompleted('add-product');
        closeSetupModal();
        navigation.navigate('ProductsList', {
          openAddProduct: true,
        });
      }}
      className="flex-row items-start justify-between p-4 border border-gray-200 rounded-xl mb-3"
    >
      <View className="flex-row gap-3 flex-1">
        <View
          className={`w-5 h-5 rounded-full mt-1 items-center justify-center ${
            completedSteps.includes('add-product')
              ? 'bg-blue-600'
              : 'border border-gray-400'
          }`}
        >
          {completedSteps.includes('add-product') && (
            <Ionicons name="checkmark" size={14} color="white" />
          )}
        </View>

        <View className="flex-1">
          <Text
            className={`text-sm font-medium mb-1 ${
              completedSteps.includes('add-product')
                ? 'text-blue-600'
                : 'text-gray-900'
            }`}
          >
            Add Your First Product
          </Text>
          <Text className="text-xs text-gray-500">
            Upload product photos, set prices, and organise your inventory so
            customers can start shopping.
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#2563EB" />
    </TouchableOpacity>

    {/* STEP 3 (placeholder – logic later) */}
    <TouchableOpacity
      activeOpacity={0.7}
      className="flex-row items-start justify-between p-4 border border-gray-200 rounded-xl mb-6"
    >
      <View className="flex-row gap-3 flex-1">
        <View className="w-5 h-5 border border-gray-400 rounded-full mt-1" />
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900 mb-1">
            Set Up Your Payment Method
          </Text>
          <Text className="text-xs text-gray-500">
            Connect your bank or payment provider to start receiving payments
            securely.
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#2563EB" />
    </TouchableOpacity>

  </View>
                </Modal>


          
                <Modal
                    isVisible={trialModalVisible}
                    onBackdropPress={() => setTrialModalVisible(false)}
                    useNativeDriver
                    hideModalContentWhileAnimating={false}
                    animationIn="slideInUp"
                    animationOut="slideOutDown"
                    animationInTiming={200}
                    animationOutTiming={150}
                    backdropTransitionInTiming={0}
                    backdropTransitionOutTiming={0}
                    style={{ justifyContent: "flex-end", margin: 0 }}
                    >
                    <View className="bg-white rounded-t-3xl px-5 pt-4 pb-10 py-6">
                        
                        <View className="flex-row items-center justify-between mb-4">
                            <View></View>
                        <Text className="text-[16px]  text-gray-800">Subscription</Text>
                        <TouchableOpacity onPress={() => setIsTrial(false)}>
                            <Ionicons name="close" size={22} color="#111827" />
                        </TouchableOpacity>
                        </View>

                        <Text className="text-[24px] font-[400] text-gray-900 text-center mb-4">
                        Welcome to Your 5-Day{'\n'}Free Trial on us.
                        </Text>

                        <View className="items-center mb-5">
                        <View className="w-48 h-48 bg-[#EBF5FF] rounded-full items-center justify-center">
                            <Image
                            source={require('../../assets/hourglass.png')} 
                            className="w-36 h-36"
                            resizeMode="contain"
                            />
                        </View>
                        </View>

                        <Text className="text-[14px] text-gray-900 text-center font-[300] mb-3 px-2">
                        You're all set! Your store is now live in trial mode. Explore all premium
                        features, customise your storefront, and start adding your products or
                        services.
                        </Text>

                        <Text className="text-[12px] text-gray-500 text-center mb-8 px-4">
                        Your trial includes unlimited access to the website builder, product
                        management, analytics, and customer tools.
                        </Text>

                        <Text className="text-sm text-red-500 text-center mb-4">
                        Trial Ends: January 28, 2025
                        </Text>

                        <TouchableOpacity
                        activeOpacity={0.8}
                        className="bg-blue-600 py-3 rounded-full items-center mb-5"
                        onPress={() => {
                            setTrialModalVisible(false);
                        }}
                        >
                        <Text className="text-white font-semibold text-base">
                            Choose a Plan
                        </Text>
                        </TouchableOpacity>

                        <Text className="text-[12px] text-gray-500 text-center mb-6">
                        No charges today. Upgrade anytime to keep your store live after your trial.
                        </Text>

                    </View>
                </Modal>


      
        <BottomNav/>
    </SafeAreaView>
  )
}