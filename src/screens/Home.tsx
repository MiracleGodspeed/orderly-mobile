import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StatusBar, TouchableOpacity, Text, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import MenuOverlay from '../components/MenuOverlay';
import StoreSetupProgress from '../components/StoreSetupProgress';
import { Ionicons } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Octicons from '@expo/vector-icons/Octicons';
import AntDesign from '@expo/vector-icons/AntDesign';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;


export default function Home() {
    const navigation = useNavigation<ScreenNavigationProp>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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
      const nextSlide = (currentSlide + 1) % slides.length;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * CARD_WIDTH,
        animated: true,
      });
    }, 4000);
    
    return () => clearInterval(timer);
  }, [currentSlide]);
  return (
    <SafeAreaView className="flex-1 bg-[#FFFFFF]" >
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
         <Header onMenuClick={() => setMenuOpen(true)} />
            <MenuOverlay isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
                <ScrollView className='flex-1' showsVerticalScrollIndicator={false}  contentContainerStyle={{ paddingBottom: 80 }}  >
                    <StoreSetupProgress progress={25} onContinue={handleContinueSetup} />

                    <View className="px-10 pt-2 pb-3 flex-row items-center justify-between">
                        <Text className="text-[18px] text-gray-600">Akara Ogbe Super Stores</Text>
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
                        
                        <Text className="text-4xl font-[600] text-gray-800 mb-6 text-center mt-3">₦24,500.00</Text>
                        
                        <View className="flex-row justify-between">
                            <View className="items-center">
                                <MaterialIcons name="storefront" size={24} color="#9CA3AF" />
                                <Text className="text-[24px] font-[500] text-gray-800 mt-1 mb-1">122</Text>
                                <Text className="text-[12px] text-gray-500">Visits</Text>
                            </View>
                            
                            <View className="items-center">
                                <Octicons name="stack" size={24} color="#9CA3AF" />
                                <Text className="text-2xl font-bold text-gray-800 mt-1 mb-1">48</Text>
                                <Text className="text-[12px] text-gray-500">Stocks</Text>
                            </View>
                            
                            <View className="items-center">
                                <Ionicons name="cart-outline" size={24} color="#9CA3AF"  />
                                <Text className="text-2xl font-bold text-gray-800 mb-1">6</Text>
                                <Text className="text-[12px] text-gray-500">Orders</Text>
                            </View>
                        </View>
                    </View>
                     <View className="px-4 mb-4">
                        <Text className="text-[16px] font-[400] text-gray-600 mb-4">Quick Actions</Text>
                        
                        <View className="flex-row justify-between mb-6">
                            <TouchableOpacity className="items-center" activeOpacity={0.7}>
                                <View className="relative">
                                    <View className="w-14 h-14 bg-blue-50 rounded-xl items-center justify-center mb-2">
                                    <Ionicons name="add" size={24} color="#1A56DB" />
                                    </View>
                                </View>
                                <Text className="text-xs text-[#404040] text-center w-16">
                                    Add Product
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="items-center" activeOpacity={0.7}>
                                <View className="relative">
                                    <View className="w-14 h-14 bg-blue-50 rounded-xl items-center justify-center mb-2">
                                    <Ionicons name="cube-outline" size={24} color="#1A56DB" />
                                    </View>
                                    <View className="absolute -top-1 -right-1 bg-red-500 px-1.5 py-0.5 rounded-full min-w-[20px] items-center">
                                        <Text className="text-white text-xs font-semibold">48</Text>
                                    </View>
                                </View>
                                <Text className="text-xs text-[#404040] text-center w-16" >
                                    Products
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="items-center" activeOpacity={0.7}>
                                <View className="relative">
                                    <View className="w-14 h-14 bg-blue-50 rounded-xl items-center justify-center mb-2">
                                    <Ionicons name="cart-outline" size={24} color="#1A56DB" />
                                    </View>
                                    <View className="absolute -top-1 -right-1 bg-red-500 px-1.5 py-0.5 rounded-full min-w-[20px] items-center">
                                    <Text className="text-white text-xs font-semibold">6</Text>
                                    </View>
                                </View>
                                <Text className="text-xs text-[#404040] text-center w-16">
                                    Orders
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="items-center" activeOpacity={0.7}>
                            <View className="w-14 h-14 bg-blue-50 rounded-xl items-center justify-center mb-2">
                                <AntDesign name="bar-chart" size={24} color="#1A56DB" />
                            </View>
                            <Text className="text-xs text-[#404040] text-center w-16">
                                Analytics
                            </Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View className="flex-row justify-between">
                            <TouchableOpacity className="items-center" activeOpacity={0.7}>
                                <View className="relative">
                                    <View className="w-14 h-14 bg-blue-50 rounded-xl items-center justify-center mb-2">
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
                            <View className="w-14 h-14 bg-blue-50 rounded-xl items-center justify-center mb-2">
                                <Ionicons name="globe-outline" size={24} color="#1A56DB" />
                            </View>
                            <Text className="text-xs text-[#404040] text-center w-16">
                                Website
                            </Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="items-center" activeOpacity={0.7}>
                            <View className="w-14 h-14 bg-blue-50 rounded-xl items-center justify-center mb-2">
                                <Ionicons name="car-outline" size={24} color="#1A56DB" />
                            </View>
                            <Text className="text-xs text-[#404040] text-center w-16">
                                Delivery
                            </Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="items-center" activeOpacity={0.7}>
                            <View className="w-14 h-14 bg-blue-50 rounded-xl items-center justify-center mb-2">
                                <Ionicons name="settings-outline" size={24} color="#1A56DB" />
                            </View>
                            <Text className="text-xs text-[#404040] text-center w-16">
                                Settings
                            </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View className="px-4 mb-5">
                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={(event) => {
                            const slideIndex = Math.round(event.nativeEvent.contentOffset.x / CARD_WIDTH);
                            setCurrentSlide(slideIndex);
                            }}
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
                                    <View className='flex-row'>
                                        <View className="w-20 h-20 mb-4 rounded-xl overflow-hidden">
                                            <Image 
                                                source={slide.image}
                                                className="w-[50] h-[50]"
                                                resizeMode="cover"
                                            />
                                        </View>
                                        <View>
                                            <Text className="text-[#1F2A37] font-[400] text-[16px] mb-2">{slide.title}</Text>
                                            <Text className="text-[#6B7280] text-[12px]  mb-4">{slide.subtitle}</Text>
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
      
        <BottomNav/>
    </SafeAreaView>
  )
}