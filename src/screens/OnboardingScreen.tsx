import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  FlatList,
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';


const { width: screenWidth } = Dimensions.get('window');

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const slides = [
  {
    id: '1',
    title: 'Build Your Online Store \nin Minutes',
    description: 'Create a professional store with ease.\nCustomize your layout, showcase products, \nand start selling quickly.',
    image: require('../../assets/slide1.png')
  },
  {
    id: '2',
    title: 'Track Your Inventory \nEffortlessly',
    description: 'Add products, categorize items, and \nmonitor stock levels in real time.',
    image: require('../../assets/slide2.png')
  },
  {
    id: '3',
    title: "Stay On Top of \nSales",
    description: 'Track orders, view sales analytics, and make data-driven decisions to grow your business.',
    image: require('../../assets/slide3.png')
  }
];

export default function OnboardingScreen() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const flatListRef = useRef<FlatList<any>>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const kickoff = setTimeout(() => {
      startAutoScroll();
    }, 700);
    
    return () => {
      clearTimeout(kickoff);
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, []);

  const startAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }

    autoScrollTimer.current = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % slides.length;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      try {
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
          viewPosition: 0,
        });
      } catch {
        flatListRef.current?.scrollToOffset({
          offset: screenWidth * nextIndex,
          animated: true,
        });
      }
    }, 4000);
  };


  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    
    if (index !== currentIndex) {
      currentIndexRef.current = index;
      setCurrentIndex(index);
    }
  };

  const handleScrollBeginDrag = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
  };

  const handleScrollEndDrag = () => {
    startAutoScroll();
  };

  const renderSlide = ({ item }: { item: any }) => (
    <View style={{ width: screenWidth }} className="px-6">
      <View className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <View className="px-6 pt-6">
          <View
            className="bg-blue-50 rounded-2xl overflow-hidden items-center justify-center"
            style={{ width: '100%', height: Math.min(280, Math.max(210, (screenWidth - 48) * 0.62)) }}
          >
            <Image
              source={item.image}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          <Text className="text-[25px] font-extrabold text-center text-gray-800 mt-7 leading-tight"
            style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
            }}
          >
            {item.title}
          </Text>

          <Text className="min-h-[110px] text-[15px] text-center text-gray-600 leading-relaxed mt-4 mb-7">
            {item.description}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
       
        <View className="pt-4 px-6">
          <View className="flex-row items-center mb-6">
            <View className="w-16" />
            <View className="flex-1 items-center">
            <Image
              source={require('../../assets/blackLogo.png')}
              className="w-28 h-10"
              resizeMode="contain"
            />
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('AuthOptions')}
              activeOpacity={0.8}
              className="px-3 py-2 rounded-full bg-white border border-gray-200"
            >
              <Text className="text-sm font-semibold text-gray-700">Skip</Text>
            </TouchableOpacity>
          </View>
        </View>

      
        <View className="flex-1 justify-center">
          <FlatList
            ref={flatListRef}
            data={slides}
            renderItem={renderSlide}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
          />
          
        </View>
        <View className="flex-row justify-center items-center mt-5 mb-4">
            {slides.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full mx-1 ${index === currentIndex ? 'w-7 bg-blue-600' : 'w-2 bg-gray-300'}`}
              />
            ))}
          </View>

       
        <View className="px-6 pb-10">
          <View className="bg-white border border-gray-100 rounded-3xl shadow-sm p-4">
            <TouchableOpacity 
              className="w-full py-4 bg-blue-600 rounded-full items-center justify-center"
              onPress={() => navigation.navigate('AuthOptions')}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-semibold">
                Get started
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-full py-3.5 border border-gray-200 rounded-full items-center justify-center mt-3"
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text className="text-blue-600 text-base font-semibold">
                Log in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
