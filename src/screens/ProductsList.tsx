import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Modal
} from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AddProductModal from "../components/AddProductModal";
import ProductDetailsModal from "../components/ProductDetailsModal";
import Ionicons from '@expo/vector-icons/Ionicons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getProducts, deleteProduct } from '../../src/api/vendor/vendor.api';
import { Product } from '../../src/api/vendor/vendor.types';
import { useToast } from 'react-native-toast-notifications';

import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import AsyncStorage from '@react-native-async-storage/async-storage';



type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductsList() {
   const toast = useToast();
  const navigation = useNavigation<ScreenNavigationProp>();
  
  // STATES
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'drafts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [configureFeeModalOpen, setConfigureFeeModalOpen] = useState(false);
  const [selectedFeeOption, setSelectedFeeOption] = useState<'vendor' | 'customer' | 'included'>('customer');
  const [applyDiscountModalOpen, setApplyDiscountModalOpen] = useState(false);
const [discountValue, setDiscountValue] = useState('');


  const fetchProducts = async (force = false) => {
    try {
      setLoading(true);
      if (!force) {
      const cached = await AsyncStorage.getItem('products_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setProducts(parsed.data);
        setTotalCount(parsed.totalCount);
        setLoading(false);
        return;
      }
    }
      const response = await getProducts();
      setProducts(response.data);
      setTotalCount(response.totalCount);
       await AsyncStorage.setItem('products_cache', JSON.stringify(response))
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.show(error instanceof Error ? error.message : 'Failed to fetch products', { type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetailsModal(true);
  };

  const handleEditProduct = () => {
    setShowProductDetailsModal(false);
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      await deleteProduct(selectedProduct.id);
       toast.show('Product deleted successfully', { type: 'success' });
      setShowProductDetailsModal(false);
      setSelectedProduct(null);
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
     toast.show(error instanceof Error ? error.message : 'Failed to delete product', { type: 'danger' });
    }
  };

  const openFeeModal = () => setConfigureFeeModalOpen(true);
  const closeFeeModal = () => setConfigureFeeModalOpen(false);

  const handleSaveFeeConfiguration = () => {
    console.log('Saving fee configuration:', selectedFeeOption);
     toast.show('fee configuration  saved!!!', { type: 'success' });
    closeFeeModal();
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    if (activeFilter === 'active' && product.status !== 1) return false;
    if (activeFilter === 'drafts' && product.status === 1) return false;
    if (searchQuery.trim()) {
      return product.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getStockDisplay = (product: Product) => {
    if (product.stock === 0) {
      return { text: `Out of Stock (${product.stock} units)`, color: 'text-red-600' };
    } else if (product.stock < 10) {
      return { text: `Low Stock (${product.stock} units)`, color: 'text-orange-600' };
    } else {
      return { text: `In Stock (${product.stock} units)`, color: 'text-green-600' };
    }
  };

  const activeProductsCount = products.filter(p => p.status === 1).length;
  const inactiveCount = products.filter(p => p.status !== 1).length;

  if (loading) {
    return (
      <SafeAreaView className="bg-gray-50 flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView className="px-4 pt-6">
        <SkeletonPlaceholder>
          <View className="mb-6 bg-gray-200 rounded-2xl h-24 w-full" />
          <View className="flex-row flex-wrap justify-between">
            {[1,2,3,4].map((_, i) => (
              <View key={i} className="w-[48%] mb-4 bg-gray-200 rounded-2xl h-60" />
            ))}
          </View>
        </SkeletonPlaceholder>
      </ScrollView>
    </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-gray-50 flex-1" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView className="flex-1">
        <View className="bg-white px-4 py-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={28} color="#1f2937" />
            </Pressable>
            {/* <Text className="text-xl font-semibold text-gray-900">Ogboski Ventures</Text> */}
            <View className="w-7" />
          </View>
        </View>

        <View className="px-4">
          <View className="bg-[#194eb8] rounded-2xl p-6 mb-6 shadow-lg">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-blue-500/30 rounded-2xl items-center justify-center mr-4">
                <Ionicons name="bag-outline" size={32} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold mb-1">Product Management</Text>
                <Text className="text-blue-100 text-sm">Manage your products</Text>
              </View>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm flex-row justify-between">
            <View className="flex-1 items-center">
              <View className="w-10 h-10 bg-[#4660ed] rounded-xl items-center justify-center mb-3">
                <Ionicons name="cube-outline" size={24} color="white" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">{totalCount}</Text>
              <Text className="text-xs text-gray-500 uppercase tracking-wide">Total</Text>
            </View>

            <View className="flex-1 items-center">
              <View className="w-10 h-10 bg-[#23ad62] rounded-xl items-center justify-center mb-3">
                <Ionicons name="star-outline" size={24} color="white" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">{activeProductsCount}</Text>
              <Text className="text-xs text-gray-500 uppercase tracking-wide">Active</Text>
            </View>

            <View className="flex-1 items-center">
              <View className="w-10 h-10 bg-[#747b88] rounded-xl items-center justify-center mb-3">
                <AntDesign name="exclamation-circle" size={24} color="white" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-1">{inactiveCount}</Text>
              <Text className="text-xs text-gray-500 uppercase tracking-wide">Inactive</Text>
            </View>
          </View>

          <View className="flex-row gap-3 mb-6">
            <Pressable className="flex-1 bg-yellow-400 rounded-xl p-3 flex-row items-center justify-center" onPress={openFeeModal}>
              <MaterialIcons name="settings" size={16} color="#000" />
              <Text className="text-gray-900 font-semibold text-sm ml-2">Configure Fees</Text>
            </Pressable>

            <Pressable className="bg-blue-600 rounded-xl px-5 flex-row items-center justify-center" onPress={() => setApplyDiscountModalOpen(true)}>
              <Text className="text-white font-semibold text-base mr-2">Apply Discount</Text>
            </Pressable>

            <Pressable className="bg-blue-600 rounded-xl py-3.5 px-5 flex-row items-center justify-center" onPress={() => setShowAddProductModal(true)}>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text className="text-white font-semibold text-base ml-1">Add</Text>
            </Pressable>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-sm">
              <MaterialIcons name="search" size={22} color="#9ca3af" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-3 text-base text-gray-900"
                placeholder="search products..."
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {filteredProducts.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="cube-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-lg mt-4">No products found</Text>
              <Text className="text-gray-400 text-sm mt-2">Add your first product to get started</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between pb-6">
              {filteredProducts.map((product) => {
                const stockInfo = getStockDisplay(product);
                return (
                  <Pressable key={product.id} className="w-[48%] mb-4" onPress={() => handleProductClick(product)}>
                    <View className="bg-white rounded-xl overflow-hidden shadow-sm px-2 py-2 card border border-gray-200">
                      <View className="absolute top-4 left-3 z-10 bg-red-500 rounded-full px-3 py-1">
                        <Text className="text-white text-xs font-semibold">New</Text>
                      </View>
                      <View className="bg-gray-100 aspect-square mt-1 rounded-2xl">
                        {product.image ? (
                          <Image source={{ uri: product.image }} className="w-full h-full rounded-xl" resizeMode="cover" />
                        ) : (
                          <View className="w-full h-full justify-center items-center">
                            <Ionicons name="image-outline" size={48} color="#9ca3af" />
                          </View>
                        )}
                      </View>
                      <View className="p-3">
                        <View className="flex-row items-center mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <MaterialIcons key={star} name="star-outline" size={14} color="#d1d5db" />
                          ))}
                          <Text className="text-gray-400 text-xs ml-1">(0)</Text>
                        </View>
                        <Text className="text-gray-900 font-semibold text-base mb-1" numberOfLines={1}>
                          {product.title}
                        </Text>
                        {product.description && (
                          <Text className="text-gray-500 text-xs mb-2" numberOfLines={1}>
                            • {product.description}
                          </Text>
                        )}
                        <Text className="text-gray-900 font-bold text-lg">
                          ₦{product.price.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <AddProductModal
        visible={showAddProductModal}
        onClose={() => { setShowAddProductModal(false); setSelectedProduct(null); }}
        mode={selectedProduct ? 'edit' : 'add'}
        productData={selectedProduct}
        onProductAdded={fetchProducts}
      />

      <ProductDetailsModal
        visible={showProductDetailsModal}
        onClose={() => { setShowProductDetailsModal(false); setSelectedProduct(null); }}
        product={selectedProduct}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
      />

      <Modal
        visible={configureFeeModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeFeeModal}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 32,
            maxHeight: '90%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={closeFeeModal} style={{ padding: 10 }}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                Transaction Fee Configuration
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#4b5563', fontSize: 14, marginBottom: 4 }}>
                This is the small processing fee charged whenever a customer pays for an order.
              </Text>
              <Text style={{ color: '#4b5563', fontSize: 14 }}>
                Choose who will bear this transaction cost — you or your customer
              </Text>
            </View>

            {/* Options */}
            <ScrollView style={{ marginBottom: 20 }}>
              {['vendor', 'customer', 'included'].map((option) => {
                const labels: Record<string, string> = {
                  vendor: 'Vendor (Me)',
                  customer: 'Customer',
                  included: 'Included in Product Price',
                };
                const descriptions: Record<string, string> = {
                  vendor: 'Fees are deducted from your earnings.',
                  customer: "Fees are added to the customer's total.",
                  included: 'The charge is added into the product price.',
                };
                const selected = selectedFeeOption === option;

                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.7}
                    onPress={() => setSelectedFeeOption(option as 'vendor' | 'customer' | 'included')}
                    style={{
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? '#2563eb' : '#d1d5db',
                      backgroundColor: selected ? '#eff6ff' : 'white',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        marginRight: 12,
                        borderWidth: 2,
                        borderColor: selected ? '#2563eb' : '#d1d5db',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {selected && (
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb' }} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{labels[option]}</Text>
                          {selected && (
                            <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                              <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>SELECTED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, color: '#6b7280' }}>{descriptions[option]}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Buttons */}
            <View style={{ gap: 12 }}>
              <Pressable
                style={{ backgroundColor: '#facc15', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
                onPress={handleSaveFeeConfiguration}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Save Configuration</Text>
              </Pressable>

              <Pressable onPress={closeFeeModal} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#6b7280' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
  visible={applyDiscountModalOpen}
  transparent
  animationType="fade"
  onRequestClose={() => setApplyDiscountModalOpen(false)}
>
  <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center' }}>
    <View style={{ width:'85%', backgroundColor:'white', borderRadius:20, padding:20 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <Text style={{ fontSize:18, fontWeight:'600', color:'#111827' }}>Apply Discount to All Products</Text>
        <TouchableOpacity onPress={() => setApplyDiscountModalOpen(false)} style={{ padding:5 }}>
          <MaterialIcons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize:14, color:'#4b5563', marginBottom:10 }}>
        Enter a percentage between 1 and 90
      </Text>

      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:20 }}>
        <TextInput
          value={discountValue}
          onChangeText={setDiscountValue}
          placeholder="Discount (%)"
          keyboardType="numeric"
          style={{
            flex:1,
            borderWidth:1,
            borderColor:'#d1d5db',
            borderRadius:12,
            paddingHorizontal:12,
            paddingVertical:8,
            fontSize:16
          }}
        />
        <Pressable
          onPress={() => {
            console.log('Apply discount:', discountValue);
            setApplyDiscountModalOpen(false);
          }}
          style={{
            marginLeft:10,
            backgroundColor:'#2563eb',
            paddingHorizontal:16,
            paddingVertical:10,
            borderRadius:12
          }}
        >
          <Text style={{ color:'white', fontWeight:'600' }}>Apply</Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>

    </SafeAreaView>
  );
}
