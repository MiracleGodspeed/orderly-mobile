import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar 
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AddProductModal from "../components/AddProductModal";
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductsDashboard() {
  const navigation = useNavigation<ScreenNavigationProp>();
    const [showAddProductModal, setShowAddProductModal] = useState(false);

  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View className="flex-1">
        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <Pressable className="mr-3" onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back" size={24} color="#000" />
              </Pressable>
              <Text className="text-[18px] font-[500] text-gray-700">Products Dashboard</Text>
            </View>
            
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-[#1F2A37] text-[12px] font-[500]">Published</Text>
            </View>
          </View>

          <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-2">
            <Text className="text-[#4A5565] text-[14px] flex-1">mystore.orderly</Text>
            <Pressable className="">
              <MaterialIcons name="content-copy" size={18} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-4">
          <View className="bg-[#F0F7FD] rounded-2xl p-4 mb-4 border border-[#969FF7]">
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-[#4A5565] font-[500] text-[14px]">Total Revenue</Text>
              <View className="bg-blue-200 p-2 rounded-full">
                <MaterialIcons name="attach-money" size={20} color="#2563eb" />
              </View>
            </View>
            <Text className="text-[#0A0A0A] text-[24px] font-[600]">$18,913.578</Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4 border border-[#E5E7EB]">
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-[#4A5565] font-[500] text-[14px]">Total Products</Text>
              <View className="bg-[#F3F4F6] p-2 rounded-full">
               <Ionicons name="cube-outline" size={24} color="black" />
              </View>
            </View>
            <Text className="text-[#0A0A0A] text-[24px] font-[600]">5</Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4 border border-[#E5E7EB]">
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-[#4A5565] font-[500] text-[14px]">Active Products</Text>
              <View className="bg-[#F3F4F6] p-2 rounded-full">
                <Feather name="eye" size={20} color="#4A5565" />
              </View>
            </View>
            <Text className="text-[#0A0A0A] text-[24px] font-[600]">4</Text>
          </View>

          <View className="bg-yellow-50 rounded-2xl p-4 mb-4 border border-[#FEE685]">
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-[#4A5565] font-[500] text-[14px]">Low Stock Alerts</Text>
              <View className="bg-[#FEF3C6] p-2 rounded-full">
                <Ionicons name="warning-outline" size={20} color="#E17100"  />
              </View>
            </View>
            <Text className="text-[#0A0A0A] text-[24px] font-[600]">1</Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4 border border-[#E5E7EB]">
            <View className="flex-row items-start justify-between mb-2">
              <Text className="text-[#4A5565] font-[500] text-[14px]">Active Discounts</Text>
              <View className="bg-[#F3F4F6] p-2 rounded-full">
                <Feather name="tag" size={20} color="#4A5565" />
              </View>
            </View>
            <Text className="text-[#0A0A0A] text-[24px] font-[600]">2</Text>
          </View>

          <Pressable className="bg-blue-600 rounded-xl py-4 items-center mb-3 flex-row justify-center" onPress={() => setShowAddProductModal(true)}>
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text className="text-white font-semibold text-base ml-1">Add New Product</Text>
          </Pressable>

          <Pressable className="bg-white border border-[#D1D5DC] rounded-xl py-4 items-center mb-4 flex-row justify-center"  onPress={() => navigation.navigate('ProductsList')}>
            <Text className="text-gray-900 font-medium text-base mr-2">View Products</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#000" />
          </Pressable>
        </ScrollView>
        <AddProductModal
        visible={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        mode="add"
      />
      </View>
      
    </SafeAreaView>
  );
}