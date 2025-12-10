import React, { useState, useRef } from 'react';
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
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentIndex(index);
  };

  const renderSlide = ({ item }: { item: any }) => (
    <View style={{ width: screenWidth }} className="px-8 items-center justify-center">
      <View className="items-center">
       
        <View className=" mb-6 items-center justify-center" style={{ width: 358, height: 280 }}>
          <Image
            source={item.image}
            className=" rounded-2xl"
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </View>
        
        
        <Text className="text-[30px] font-bold text-center text-gray-900 mb-6 leading-tight">
          {item.title}
        </Text>
        
     
        <Text className=" min-h-[120px] text-[18px] text-center text-gray-600 leading-relaxed mb-6">
          {item.description}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
       
        <View className="pt-5 px-6">
          <View className="flex-row items-center justify-center mb-10">
            <Image
              source={require('../../assets/blackLogo.png')}
              className="w-32 h-24 mr-3"
              resizeMode="contain"
            />
            
          </View>
        </View>

      
        <View className="flex-1 justify-center mb-5">
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
            decelerationRate="fast"
          />
          
        </View>
        <View className="flex-row justify-center items-center mt-2 mb-3">
            {slides.map((_, index) => (
              <View
                key={index}
                className={`w-2.5 h-2.5 rounded-full mx-1 ${
                  index === currentIndex ? 'bg-[#265CC7]' : 'bg-gray-300'
                }`}
              />
            ))}
          </View>

       
        <View className="px-6 pb-8 pt-4">
          <View className="h-px bg-gray-200 mb-3" />
          
          <View className="items-center">
           
            
            <TouchableOpacity 
              className="w-full py-4 bg-[#265CC7] rounded-full  items-center justify-center mb-4"
              onPress={() => navigation.navigate('AuthOptions')}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-semibold">
               Get started
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-full py-4 border-2 border-[#fff] rounded-xl items-center justify-center"
              // onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text className="text-[#265CC7] text-lg font-semibold">
                Log in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}