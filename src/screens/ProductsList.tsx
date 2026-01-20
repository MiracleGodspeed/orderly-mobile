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
    //   if (!force) {
    //   const cached = await AsyncStorage.getItem('products_cache');
    //   if (cached) {
    //     const parsed = JSON.parse(cached);
    //     setProducts(parsed.data);
    //     setTotalCount(parsed.totalCount);
    //     setLoading(false);
    //     return;
    //   }
    // }
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
      
      {/* Header */}
      <View className="px-5 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between sticky top-0 z-10">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2 rounded-full active:bg-gray-100">
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Products</Text>
        </View>
        <View className="flex-row gap-3">
             <Pressable onPress={openFeeModal} className="p-2 rounded-full bg-gray-50 border border-gray-200">
                 <MaterialIcons name="settings" size={20} color="#374151" />
             </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        <View className="flex-row px-5 py-5 gap-3">
           <View className="flex-1 bg-blue-600 rounded-xl p-3 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                 <View className="bg-blue-500/30 p-1.5 rounded-lg">
                    <Ionicons name="cube-outline" size={16} color="white" />
                 </View>
              </View>
              <Text className="text-2xl font-bold text-white mb-0.5" numberOfLines={1} adjustsFontSizeToFit>{totalCount}</Text>
              <Text className="text-blue-100 text-xs font-medium" numberOfLines={1} adjustsFontSizeToFit>Total</Text>
           </View>

           <View className="flex-1 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                 <View className="bg-green-100 p-1.5 rounded-lg">
                    <Ionicons name="radio-button-on" size={16} color="#16a34a" />
                 </View>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-0.5" numberOfLines={1} adjustsFontSizeToFit>{activeProductsCount}</Text>
              <Text className="text-gray-500 text-xs font-medium" numberOfLines={1} adjustsFontSizeToFit>Active</Text>
           </View>

           <View className="flex-1 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                 <View className="bg-gray-100 p-1.5 rounded-lg">
                    <Ionicons name="pause-circle-outline" size={16} color="#4b5563" />
                 </View>
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-0.5" numberOfLines={1} adjustsFontSizeToFit>{inactiveCount}</Text>
              <Text className="text-gray-500 text-xs font-medium" numberOfLines={1} adjustsFontSizeToFit>Drafts</Text>
           </View>
        </View>

        <View className="px-5">
            {/* Action Bar & Search */}
            <View className="flex-row gap-3 mb-6">
                <View className="flex-1 flex-row items-center bg-white border border-gray-200 rounded-xl px-4 h-12 shadow-sm">
                    <Ionicons name="search-outline" size={20} color="#9ca3af" />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 ml-3 text-base text-gray-900 h-full"
                        placeholder="Search products..."
                        placeholderTextColor="#9ca3af"
                    />
                </View>
                 <Pressable 
                    className="w-12 h-12 bg-white border border-gray-200 rounded-xl items-center justify-center shadow-sm"
                    onPress={() => setApplyDiscountModalOpen(true)}
                 >
                    <MaterialIcons name="local-offer" size={20} color="#374151" />
                 </Pressable>
            </View>

          {filteredProducts.length === 0 ? (
            <View className="items-center py-20 px-6">
               <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="cube-outline" size={40} color="#9ca3af" />
               </View>
              <Text className="text-gray-900 text-lg font-semibold mb-2">No products found</Text>
              <Text className="text-gray-500 text-center text-sm max-w-xs">
                {searchQuery ? "Try adjusting your search terms" : "Start building your inventory by adding your first product"}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between pb-32 px-1">
              {filteredProducts.map((product) => {
                const stockInfo = getStockDisplay(product);
                const isLowStock = product.stock < 10;
                
                return (
                  <Pressable 
                    key={product.id} 
                    className="w-[48%] bg-white rounded-3xl mb-4 shadow-sm active:scale-[0.98] transition-transform overflow-hidden"
                    onPress={() => handleProductClick(product)}
                    style={{
                      shadowColor: "#9ca3af",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 12,
                      elevation: 4,
                    }}
                  >
                    {/* Image Section - Prominent Top */}
                    <View className="h-44 bg-gray-50 relative">
                        {product.image ? (
                          <Image source={{ uri: product.image }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <View className="w-full h-full items-center justify-center bg-gray-50">
                            <Ionicons name="image-outline" size={32} color="#e5e7eb" />
                          </View>
                        )}
                        
                        {/* Status Badge Overlay */}
                         {product.status !== 1 && (
                            <View className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
                                <Text className="text-gray-900 text-[10px] font-bold tracking-wider uppercase">Draft</Text>
                            </View>
                        )}

                         {/* More Options Overlay */}
                         <View className="absolute top-3 right-3">
                            <View className="bg-white/90 w-8 h-8 rounded-full items-center justify-center shadow-sm backdrop-blur-md">
                                <MaterialIcons name="more-horiz" size={18} color="#1f2937" />
                            </View>
                         </View>
                    </View>
                    
                    {/* Content Section */}
                    <View className="p-3.5">
                         <Text className="text-gray-900 font-bold text-[15px] leading-snug mb-1.5 h-10" numberOfLines={2}>
                            {product.title}
                         </Text>
                         
                         <View className="flex-row items-baseline gap-2 mb-3">
                             <Text className="text-gray-900 font-extrabold text-lg">
                                ₦{product.price.toLocaleString()}
                             </Text>
                             <Text className="text-gray-400 text-xs line-through font-medium decoration-gray-400">
                                ₦34,000
                             </Text>
                         </View>

                         <View className="flex-row items-center justify-between border-t border-gray-50 pt-3">
                             <View className={`px-2 py-1 rounded-md flex-row items-center gap-1.5 ${isLowStock ? 'bg-red-50' : 'bg-gray-100'}`}>
                                <View className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-gray-500'}`} />
                                <Text className={`text-[10px] font-bold ${isLowStock ? 'text-red-600' : 'text-gray-600'}`}>
                                    {product.stock} left
                                </Text>
                             </View>
                             
                             {/* Mini Stats */}
                             <View className="flex-row items-center gap-1 opacity-60">
                                <Ionicons name="eye-outline" size={14} color="#6b7280" />
                                <Text className="text-[10px] text-gray-600 font-medium">0</Text>
                             </View>
                         </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View className="absolute bottom-8 right-6">
          <Pressable 
            onPress={() => setShowAddProductModal(true)}
            className="bg-blue-600 w-14 h-14 rounded-full shadow-lg shadow-blue-500/40 items-center justify-center"
          >
              <MaterialIcons name="add" size={30} color="white" />
          </Pressable>
      </View>

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

      {/* Fee Modal - Simplified Design */}
      <Modal
        visible={configureFeeModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closeFeeModal}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={closeFeeModal}>
            <Pressable 
                onPress={e => e.stopPropagation()}
                style={{
                    marginTop: 'auto',
                    backgroundColor: 'white',
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    padding: 24,
                    maxHeight: '85%',
                }}
            >
            <View className="items-center mb-6">
                 <View className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
                 <Text className="text-xl font-bold text-gray-900 text-center">Fee Configuration</Text>
                 <Text className="text-gray-500 text-center mt-2 px-4">
                    Choose who covers the transaction fee for orders
                 </Text>
            </View>

            <ScrollView className="mb-6">
              {['vendor', 'customer', 'included'].map((option) => {
                const labels: Record<string, string> = {
                  vendor: 'Vendor (Me)',
                  customer: 'Customer',
                  included: 'Product Price',
                };
                const descriptions: Record<string, string> = {
                  vendor: 'Deducted from your earnings',
                  customer: "Added to customer's total",
                  included: 'Inclusive in product price',
                };
                const selected = selectedFeeOption === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setSelectedFeeOption(option as 'vendor' | 'customer' | 'included')}
                    className={`flex-row items-center p-4 rounded-xl mb-3 border ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                     <View className={`w-5 h-5 rounded-full border-2 mr-4 items-center justify-center ${selected ? 'border-blue-600' : 'border-gray-300'}`}>
                        {selected && <View className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                     </View>
                     <View>
                        <Text className={`font-semibold text-base ${selected ? 'text-blue-900' : 'text-gray-900'}`}>{labels[option]}</Text>
                        <Text className="text-gray-500 text-sm">{descriptions[option]}</Text>
                     </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
                className="bg-blue-600 py-4 rounded-xl items-center shadow-md shadow-blue-500/20"
                onPress={handleSaveFeeConfiguration}
              >
                <Text className="text-white font-bold text-lg">Save Changes</Text>
              </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Discount Modal - Simplified */}
      <Modal
        visible={applyDiscountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setApplyDiscountModalOpen(false)}
      >
         <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }} onPress={() => setApplyDiscountModalOpen(false)}>
            <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 shadow-xl">
                 <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-bold text-gray-900">Apply Discount</Text>
                    <Pressable onPress={() => setApplyDiscountModalOpen(false)} className="bg-gray-100 p-2 rounded-full">
                        <MaterialIcons name="close" size={20} color="#6b7280" />
                    </Pressable>
                 </View>
                 
                 <Text className="text-gray-500 mb-4">Enter percentage discount (1-90%) to apply to all products.</Text>
                 
                 <View className="flex-row gap-3">
                    <TextInput
                        value={discountValue}
                        onChangeText={setDiscountValue}
                        placeholder="%"
                        keyboardType="numeric"
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-lg font-medium text-gray-900"
                        autoFocus
                    />
                    <Pressable
                        onPress={() => {
                            console.log('Apply discount:', discountValue);
                            setApplyDiscountModalOpen(false);
                        }}
                        className="bg-blue-600 px-6 justify-center rounded-xl"
                    >
                        <Text className="text-white font-bold">Apply</Text>
                    </Pressable>
                 </View>
            </Pressable>
         </Pressable>
      </Modal>

    </SafeAreaView>
  );
}
