import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  StatusBar,
  TextInput,
  Image,
  ActivityIndicator
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
import { getProducts,deleteProduct  } from '../../src/api/vendor/vendor.api';
import { Product } from '../../src/api/vendor/vendor.types';
import Toast from 'react-native-toast-message';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProductsList() {
  const navigation = useNavigation<ScreenNavigationProp>();
  
 
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'drafts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
 
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
 
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  

  const [totalCount, setTotalCount] = useState(0);

 
  

 
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Error fetching products:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to fetch products',
        visibilityTime: 3000,
        autoHide: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

 
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductDetailsModal(true);
  };

  
  const handleEditProduct = () => {
    setShowProductDetailsModal(false);
    setShowAddProductModal(true);
  };

 
  // const handleDeleteClick = () => {
  //   setShowProductDetailsModal(false);
  //   setShowDeleteConfirmation(true);
  // };

 
  // const handleConfirmDelete = async () => {
  //   if (!selectedProduct) return;

  //   try {
  //     setDeleteLoading(true);
      
  //     // Call delete API (you'll need to create this)
  //     // await deleteProduct(selectedProduct.id);

  //     Toast.show({
  //       type: 'success',
  //       text1: 'Success',
  //       text2: 'Product deleted successfully',
  //       visibilityTime: 3000,
  //     });

  //     // Close modals and refresh list
  //     setShowDeleteConfirmation(false);
  //     setSelectedProduct(null);
  //     await fetchProducts();
      
  //   } catch (error) {
  //     console.error('Error deleting product:', error);
  //     Toast.show({
  //       type: 'error',
  //       text1: 'Error',
  //       text2: error instanceof Error ? error.message : 'Failed to delete product',
  //       visibilityTime: 3000,
  //     });
  //   } finally {
  //     setDeleteLoading(false);
  //   }
  // };

 
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
  const lowStockCount = products.filter(p => p.stock < 10 && p.stock > 0).length;

  if (loading) {
    return (
      <SafeAreaView className="bg-white flex-1" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1A56DB" />
          <Text className="text-gray-600 mt-4">Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

    const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    console.log("Deleting product:", selectedProduct.id);

    try {
      await deleteProduct(selectedProduct.id);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Product deleted successfully',
        visibilityTime: 3000,
        autoHide: true
      });
      fetchProducts();

     
      setShowProductDetailsModal(false);
      setSelectedProduct(null);
      await fetchProducts();
      
    } catch (error) {
      console.error('Error deleting product:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to delete product',
        visibilityTime: 3000,
        autoHide: true
      });
      throw error; 
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
          
          <Pressable 
            className="bg-blue-600 rounded-lg px-4 py-2 flex-row items-center" 
            onPress={() => setShowAddProductModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text className="text-white font-medium text-sm ml-1">Add New Product</Text>
          </Pressable>
        </View>

       
        <View className="flex-row items-center px-4 py-4 border-b border-gray-200">
          <View className="flex-1 items-center">
            <View className="flex-row items-center mb-1">
              <Text className="text-2xl font-bold text-gray-900 mr-2">{totalCount}</Text>
              <View className="bg-blue-100 p-1.5 rounded-full">
                <Ionicons name="cube-outline" size={16} color="#004496" />
              </View>
            </View>
            <Text className="text-xs text-gray-600">Total Products</Text>
          </View>

          <View className="w-px h-10 bg-gray-200" />

          <View className="flex-1 items-center">
            <View className="flex-row items-center mb-1">
              <Text className="text-2xl font-bold text-gray-900 mr-2">{activeProductsCount}</Text>
              <View className="bg-green-100 p-1.5 rounded-full">
                <Ionicons name="cube-outline" size={16} color="#057A55" />
              </View>
            </View>
            <Text className="text-xs text-gray-600">Active Products</Text>
          </View>

          <View className="w-px h-10 bg-gray-200" />

          <View className="flex-1 items-center">
            <View className="flex-row items-center mb-1">
              <Text className="text-2xl font-bold text-gray-900 mr-2">{lowStockCount}</Text>
              <View className="p-1.5 rounded-full">
                <Ionicons name="warning-outline" size={16} color="#E17100" />
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
          {filteredProducts.length === 0 ? (
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="cube-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-lg mt-4">No products found</Text>
              <Text className="text-gray-400 text-sm mt-2">Add your first product to get started</Text>
            </View>
          ) : (
           
            <View className="flex-row flex-wrap justify-between pb-4">
              {filteredProducts.map((product) => {
                const stockInfo = getStockDisplay(product);
                return (
                
                  <Pressable 
                    key={product.id} 
                    className="w-[48%] mb-4"
                    onPress={() => handleProductClick(product)}
                  >
                  
                    <View className="bg-gray-100 rounded-2xl mb-3 overflow-hidden aspect-square">
                      {product.image ? (
                        <Image
                          source={{ uri: product.image }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-full justify-center items-center">
                          <Ionicons name="image-outline" size={48} color="#9ca3af" />
                        </View>
                      )}
                    </View>

                   
                    <Text className="text-sm text-gray-900 font-medium mb-1" numberOfLines={1}>
                      {product.title}
                    </Text>
                    <Text className="text-base text-gray-900 font-semibold mb-2">
                      ₦{product.price.toLocaleString()}
                    </Text>

                   
                    <Text className={`text-xs ${stockInfo.color} mt-1`}>
                      {stockInfo.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

     
      <AddProductModal
        visible={showAddProductModal}
        onClose={() => {
          setShowAddProductModal(false);
          setSelectedProduct(null);
        }}
        mode={selectedProduct ? 'edit' : 'add'}
        productData={selectedProduct}
        onProductAdded={fetchProducts}
      />

    
      <ProductDetailsModal
        visible={showProductDetailsModal}
        onClose={() => {
          setShowProductDetailsModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct} 
      />

      
    </SafeAreaView>
  );
}