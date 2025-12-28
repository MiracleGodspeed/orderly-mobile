import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  TextInput,
  Image
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AddProductModal from "../components/AddProductModal";
import Ionicons from '@expo/vector-icons/Ionicons';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Product {
  id: string;
  name: string;
  price: string;
  image: any;
  status: 'Active' | 'Draft';
  stock: number;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
}

export default function ProductsList() {
  const navigation = useNavigation<ScreenNavigationProp>();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'drafts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);


  const products: Product[] = [
    {
      id: '1',
      name: 'Premium Wireless Headphones',
      price: '₦20,000.00',
      image: require("../../assets/haedphones.png"),
      status: 'Active',
      stock: 45,
      stockStatus: 'in-stock'
    },
    {
      id: '2',
      name: 'Classic Running Sneakers',
      price: '₦20,000.00',
      image: require('../../assets/sneakers.png'),
      status: 'Active',
      stock: 8,
      stockStatus: 'low-stock'
    },
    {
      id: '3',
      name: 'Minimalist Smart Watch',
      price: '₦20,000.00',
      image:  require('../../assets/watch.png'),
      status: 'Active',
      stock: 0,
      stockStatus: 'out-of-stock'
    },
    {
      id: '4',
      name: 'Premium Wireless Headphones',
      price: '₦20,000.00',
      image: require('../../assets/lamp.png'),
      status: 'Draft',
      stock: 45,
      stockStatus: 'in-stock'
    }
  ];

  const filteredProducts = products.filter((product) => {
  
  if (activeFilter === 'active' && product.status !== 'Active') return false;
  if (activeFilter === 'drafts' && product.status !== 'Draft') return false;

  
  if (searchQuery.trim()) {
    return product.name.toLowerCase().includes(searchQuery.toLowerCase());
  }

  return true;
});


  const getStockDisplay = (product: Product) => {
    if (product.stockStatus === 'out-of-stock') {
      return { text: `Out of Stock (${product.stock} units)`, color: 'text-red-600' };
    } else if (product.stockStatus === 'low-stock') {
      return { text: `Low Stock (${product.stock} units)`, color: 'text-orange-600' };
    } else {
      return { text: `In Stock (${product.stock} units)`, color: 'text-green-600' };
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center flex-1">
            <Pressable className="mr-3" onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <Text className="text-lg font-medium text-gray-900">Products</Text>
          </View>
          
          <Pressable className="bg-blue-600 rounded-lg px-4 py-2 flex-row items-center" onPress={() => setShowAddProductModal(true)}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text className="text-white font-medium text-sm ml-1">Add New Product</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center px-4 py-4 border-b border-gray-200">
          <View className="flex-1 items-center">
            <View className="flex-row items-center mb-1">
              <Text className="text-2xl font-bold text-gray-900 mr-2">5</Text>
              <View className="bg-blue-100 p-1.5 rounded-full">
                 <Ionicons name="cube-outline" size={16} color="#004496" />
              </View>
            </View>
            <Text className="text-xs text-gray-600">Total Products</Text>
          </View>

          <View className="w-px h-10 bg-gray-200" />

          <View className="flex-1 items-center">
            <View className="flex-row items-center mb-1">
              <Text className="text-2xl font-bold text-gray-900 mr-2">4</Text>
              <View className="bg-green-100 p-1.5 rounded-full">
                 <Ionicons name="cube-outline" size={16} color="#057A55" />

              </View>
            </View>
            <Text className="text-xs text-gray-600">Active Products</Text>
          </View>

          <View className="w-px h-10 bg-gray-200" />

          <View className="flex-1 items-center">
            <View className="flex-row items-center mb-1">
              <Text className="text-2xl font-bold text-gray-900 mr-2">1</Text>
              <View className=" p-1.5 rounded-full">
                <Ionicons name="warning-outline" size={16} color="#E17100"  />

              </View>
            </View>
            <Text className="text-xs text-gray-600">Low Stock Alert</Text>
          </View>
        </View>

        <View className="px-4 pt-4">
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

        <View className="flex-row items-center px-4 py-4">
          <Pressable
            onPress={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg mr-2 ${
              activeFilter === 'all' ? 'bg-blue-600' : 'bg-white border border-gray-300'
            }`}
          >
            <Text className={activeFilter === 'all' ? 'text-white font-medium' : 'text-gray-700'}>
              All
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('active')}
            className={`px-4 py-2 rounded-lg mr-2 ${
              activeFilter === 'active' ? 'bg-blue-600' : 'bg-white border border-gray-300'
            }`}
          >
            <Text className={activeFilter === 'active' ? 'text-white font-medium' : 'text-gray-700'}>
              Active
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('drafts')}
            className={`px-4 py-2 rounded-lg mr-auto ${
              activeFilter === 'drafts' ? 'bg-blue-600' : 'bg-white border border-gray-300'
            }`}
          >
            <Text className={activeFilter === 'drafts' ? 'text-white font-medium' : 'text-gray-700'}>
              Drafts
            </Text>
          </Pressable>

          <Pressable className="p-2">
            <MaterialIcons name="filter-list" size={24} color="#000" />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4">
          <View className="flex-row flex-wrap justify-between pb-4">
            {filteredProducts.map((product) => {
              const stockInfo = getStockDisplay(product);
              return (
                <View key={product.id} className="w-[48%] mb-4">
                  <View className="bg-gray-100 rounded-2xl mb-3 overflow-hidden aspect-square">
                    <Image
                      source={product.image }
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>

                  <Text className="text-sm text-gray-900 font-medium mb-1" numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text className="text-base text-gray-900 font-semibold mb-2">
                    {product.price}
                  </Text>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className={`px-2 py-1 rounded ${
                        product.status === 'Active' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Text className={`text-xs font-medium ${
                          product.status === 'Active' ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {product.status}
                        </Text>
                      </View>
                    </View>
                    <Pressable className="p-1">
                      <MaterialIcons name="more-vert" size={20} color="#6b7280" />
                    </Pressable>
                  </View>

                  <Text className={`text-xs ${stockInfo.color} mt-1`}>
                    {stockInfo.text}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <AddProductModal
        visible={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        mode="add"
      />
    </SafeAreaView>
  );
}