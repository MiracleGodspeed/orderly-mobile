import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,

} from "react-native";
import { useState, useEffect } from "react";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from 'react-native-safe-area-context';
import { createProduct, updateProduct } from '../../src/api/vendor/vendor.api';
import { CreateProductPayload, Product } from '../../src/api/vendor/vendor.types';
import { useToast } from 'react-native-toast-notifications';

import ColorPicker, { Panel1, HueSlider } from 'reanimated-color-picker';
import { runOnJS } from 'react-native-reanimated';
import KeyboardScreen from "./KeyboardScreen";

interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: 'add' | 'edit';
  productData?: Product | null;
  onProductAdded?: () => void;
}

export default function AddProductModal({ 
  visible, 
  onClose, 
  mode = 'add', 
  productData,
  onProductAdded 
}: Props) {
   const toast = useToast();
  
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [currentSize, setCurrentSize] = useState('');
  const [colors, setColors] = useState<Array<{ hex: string; name: string }>>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [features, setFeatures] = useState<string[]>([]);
  const [currentFeature, setCurrentFeature] = useState('');
  const [enableVariants, setEnableVariants] = useState(false);
  
  const [errors, setErrors] = useState({
    productName: '',
    price: '',
    stockQuantity: '',
    productDescription: ''
  });
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

 
  useEffect(() => {
    if (mode === 'edit' && productData) {
      setProductName(productData.title);
      setCategory(productData.category);
      setPrice(String(productData.price));
      setStockQuantity(String(productData.stock));
      setProductDescription(productData.description);

      const existingImages: string[] = [];
      if (productData.image) existingImages.push(productData.image);
      if (productData.image2) existingImages.push(productData.image2);
      setProductImages(existingImages);

      if (productData.sizeOptions && productData.sizeOptions.length > 0) {
        setSizes(productData.sizeOptions);
      }

      if (productData.colourOptions && productData.colourOptions.length > 0) {
        setColors(productData.colourOptions.map(hex => ({ hex, name: hex })));
      }

      if (productData.features && productData.features.length > 0) {
        setFeatures(productData.features);
      }
    }
  }, [mode, productData]);

  
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

 
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          const request = await ImagePicker.requestMediaLibraryPermissionsAsync();
          setHasPermission(request.status === "granted");
        } else {
          setHasPermission(true);
        }
      }
    })();
  }, []);

 
  const pickImage = async () => {
    if (hasPermission === false) return;
    
    if (productImages.length >= 2) {
      // Toast.show({
      //   type: 'info',
      //   text1: 'Maximum images reached',
      //   text2: 'You can only upload up to 2 images',
      //   autoHide: true
      // });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      setProductImages([...productImages, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

 
  const addSize = () => {
    if (currentSize.trim() === '') return;
    
    if (sizes.includes(currentSize.trim().toUpperCase())) {
      // Toast.show({
      //   type: 'info',
      //   text1: 'Duplicate size',
      //   text2: 'This size has already been added',
      //   autoHide: true
      // });
      return;
    }
    
    setSizes([...sizes, currentSize.trim().toUpperCase()]);
    setCurrentSize('');
  };

  const removeSize = (sizeToRemove: string) => {
    setSizes(sizes.filter(size => size !== sizeToRemove));
  };

  
  const onColorSelect = (color: any) => {
    'worklet';
    runOnJS(setSelectedColor)(color.hex);
  };

  const addColor = () => {
    if (colors.some(c => c.hex === selectedColor)) {
      // Toast.show({
      //   type: 'info',
      //   text1: 'Duplicate color',
      //   text2: 'This color has already been added',
      //   autoHide: true
      // });
      return;
    }
    
    setColors([...colors, { hex: selectedColor, name: selectedColor }]);
    setShowColorPicker(false);
  };

  const removeColor = (hexToRemove: string) => {
    setColors(colors.filter(color => color.hex !== hexToRemove));
  };

 
  const addFeature = () => {
    if (currentFeature.trim() === '') return;
    
    setFeatures([...features, currentFeature.trim()]);
    setCurrentFeature('');
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  
  const validateForm = () => {
    const newErrors = {
      productName: '',
      price: '',
      stockQuantity: '',
      productDescription: ''
    };

    let isValid = true;

    if (!productName.trim()) {
      newErrors.productName = 'Product name is required';
      isValid = false;
    }

    if (!price.trim()) {
      newErrors.price = 'Price is required';
      isValid = false;
    } else if (parseFloat(price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
      isValid = false;
    }

    if (!stockQuantity.trim()) {
      newErrors.stockQuantity = 'Stock quantity is required';
      isValid = false;
    } else if (parseInt(stockQuantity) < 0) {
      newErrors.stockQuantity = 'Stock cannot be negative';
      isValid = false;
    }

    if (!productDescription.trim()) {
      newErrors.productDescription = 'Product description is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const clearError = (field: keyof typeof errors) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

 
  const resetForm = () => {
    setProductImages([]);
    setProductName('');
    setCategory('');
    setPrice('');
    setStockQuantity('');
    setProductDescription('');
    setSizes([]);
    setColors([]);
    setFeatures([]);
    setCurrentSize('');
    setCurrentFeature('');
    setErrors({
      productName: '',
      price: '',
      stockQuantity: '',
      productDescription: ''
    });
  };

  
  const handleSave = async () => {
    if (!validateForm()) {
      // Toast.show({
      //   type: 'error',
      //   text1: 'Validation Error',
      //   text2: 'Please fill in all required fields',
      //   visibilityTime: 2000,
      //   autoHide: true
      // });
      return;
    }

    try {
      setLoading(true);

      const basePrice = parseFloat(price);

      const payload: CreateProductPayload = {
        title: productName.trim(),
        category: category.trim() || 'Uncategorized',
        description: productDescription.trim(),
        originalPrice: basePrice,
        price: basePrice,
        stock: parseInt(stockQuantity),
        sku: mode === 'edit' && productData?.sku ? productData.sku : `SKU-${Date.now()}`,
        badge: 'New',
        features: features.length > 0 ? features : undefined,
        colourOptions: colors.length > 0 ? colors.map(c => c.hex) : undefined,
        sizeOptions: sizes.length > 0 ? sizes : undefined,
      };

      console.log("Product Payload:", payload);

      if (productImages[0]) {
        if (productImages[0].startsWith('file://') || productImages[0].startsWith('content://')) {
          payload.imageFile1 = {
            uri: productImages[0],
            name: 'image1.jpg',
            type: 'image/jpeg',
          };
        }
      }

      if (productImages[1]) {
        if (productImages[1].startsWith('file://') || productImages[1].startsWith('content://')) {
          payload.imageFile2 = {
            uri: productImages[1],
            name: 'image2.jpg',
            type: 'image/jpeg',
          };
        }
      }

      if (mode === 'edit' && productData?.id) {console.log(productData?.id)
        await updateProduct(productData.id, payload);
        // Toast.show({
        //   type: 'success',
        //   text1: 'Success',
        //   text2: 'Product updated successfully!',
        //   visibilityTime: 3000,
        //   autoHide: true
        // });
      } else {
        await createProduct(payload);
        // Toast.show({
        //   type: 'success',
        //   text1: 'Success',
        //   text2: 'Product added successfully!',
        //   visibilityTime: 3000,
        //   autoHide: true
        // });
      }

      resetForm();
      onClose();
      
      if (onProductAdded) {
        onProductAdded();
      }
    } catch (error) {
      console.error('Error saving product:', error);
      // Toast.show({
      //   type: 'error',
      //   text1: 'Error',
      //   text2: error instanceof Error ? error.message : `Failed to ${mode === 'edit' ? 'update' : 'add'} product`,
      //   autoHide:  true
      // });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardScreen
   
  >
        <View className="flex-1">
         
          <View className="px-4 py-4 border-b border-gray-200">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-xl font-semibold text-gray-900">
              {mode === 'edit' ? 'Edit Product' : 'Add New Product'}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              {mode === 'edit' ? 'Update your product details' : 'Create a beautiful product listing'}
            </Text>
          </View>

          <ScrollView className="flex-1 px-4 pt-6">
         
            <Text className="text-sm text-gray-900 mb-2">Product Images</Text>
            <View className="flex-row items-center mb-6">
              {productImages.map((imageUri, index) => (
                <View key={index} className="mr-4 relative">
                  <View className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                    <Image 
                      source={{ uri: imageUri }} 
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <Pressable 
                    onPress={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}

              {productImages.length === 0 && (
                <View className="w-20 h-20 bg-gray-100 rounded-lg items-center justify-center mr-4">
                  <MaterialIcons name="image" size={32} color="#9ca3af" />
                </View>
              )}

              {productImages.length < 2 && (
                <Pressable 
                  onPress={pickImage}
                  className="flex-row items-center border border-gray-300 rounded-lg px-4 py-2"
                >
                  <MaterialIcons name="upload" size={18} color="#374151" />
                  <Text className="text-gray-900 ml-2">
                    {productImages.length === 0 ? 'Upload Image' : 'Add Another'}
                  </Text>
                </Pressable>
              )}
            </View>

         
            <Text className="text-sm text-gray-900 mb-2">
              Product Name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={productName}
              onChangeText={(text) => {
                setProductName(text);
                clearError('productName');
              }}
              className={`border ${errors.productName ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 mb-1`}
              placeholder="Enter product name"
              placeholderTextColor="#9ca3af"
            />
            {errors.productName ? (
              <Text className="text-red-500 text-xs mb-3">{errors.productName}</Text>
            ) : (
              <View className="mb-3" />
            )}

           
            <Text className="text-sm text-gray-900 mb-2">Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="e.g. Electronics, Clothing, Food"
              placeholderTextColor="#9ca3af"
            />

          
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-sm text-gray-900 mb-2">
                  Price <Text className="text-red-500">*</Text>
                </Text>
                <View className={`flex-row items-center border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3`}>
                  <Text className="text-gray-900 mr-2">₦</Text>
                  <TextInput
                    value={price}
                    onChangeText={(text) => {
                      setPrice(text);
                      clearError('price');
                    }}
                    className="flex-1"
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                </View>
                {errors.price ? (
                  <Text className="text-red-500 text-xs mt-1">{errors.price}</Text>
                ) : null}
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-sm text-gray-900 mb-2">
                  Stock Quantity <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  value={stockQuantity}
                  onChangeText={(text) => {
                    setStockQuantity(text);
                    clearError('stockQuantity');
                  }}
                  className={`border ${errors.stockQuantity ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3`}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                />
                {errors.stockQuantity ? (
                  <Text className="text-red-500 text-xs mt-1">{errors.stockQuantity}</Text>
                ) : null}
              </View>
            </View>

           
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-2">
    <View>
      <Text className="text-base font-medium text-gray-900">
        Product Variants
      </Text>
      <Text className="text-xs text-gray-500">
        Does this product come in different sizes or colors?
      </Text>
    </View>

    <Pressable
      onPress={() => setEnableVariants(prev => !prev)}
      className={`w-12 h-6 rounded-full px-1 justify-center ${
        enableVariants ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <View
        className={`w-4 h-4 rounded-full bg-white ${
          enableVariants ? 'self-end' : 'self-start'
        }`}
      />
    </Pressable>
  </View>
            {enableVariants && (
            <>
              <Text className="text-sm font-medium text-gray-700 mb-2">SIZES</Text>
              <View className="flex-row items-center mb-3">
                <TextInput
                  value={currentSize}
                  onChangeText={setCurrentSize}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 mr-2"
                  placeholder="e.g. S, M, L, XL"
                  placeholderTextColor="#9ca3af"
                  onSubmitEditing={addSize}
                />
                <Pressable 
                  onPress={addSize}
                  className="bg-blue-600 rounded-lg px-4 py-3"
                >
                  <Text className="text-white font-medium">Add</Text>
                </Pressable>
              </View>

              {sizes.length > 0 && (
                <View className="flex-row flex-wrap mb-4">
                  {sizes.map((size, index) => (
                    <View 
                      key={index} 
                      className="bg-blue-100 rounded-full px-3 py-1.5 mr-2 mb-2 flex-row items-center"
                    >
                      <Text className="text-blue-700 mr-2">{size}</Text>
                      <Pressable onPress={() => removeSize(size)}>
                        <MaterialIcons name="close" size={16} color="#1d4ed8" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

            
              <Text className="text-sm font-medium text-gray-700 mb-2">COLORS</Text>
              
              {colors.length > 0 && (
                <View className="flex-row flex-wrap mb-3">
                  {colors.map((color, index) => (
                    <View 
                      key={index} 
                      className="mr-3 mb-3 items-center"
                    >
                      <View className="relative">
                        <View 
                          className="w-12 h-12 rounded-lg border border-gray-300"
                          style={{ backgroundColor: color.hex }}
                        />
                        <Pressable 
                          onPress={() => removeColor(color.hex)}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                        >
                          <MaterialIcons name="close" size={12} color="#fff" />
                        </Pressable>
                      </View>
                      <Text className="text-xs text-gray-600 mt-1">{color.hex}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Pressable 
                onPress={() => setShowColorPicker(true)}
                className="border border-dashed border-gray-400 rounded-lg px-4 py-3 items-center mb-4"
              >
                <Text className="text-gray-600">+ Add Color</Text>
              </Pressable>

             
              {showColorPicker && (
                <Modal
                  visible={showColorPicker}
                  transparent
                  animationType="fade"
                >
                  <View className="flex-1 bg-black/50 justify-center items-center">
                    <View className="bg-white rounded-xl p-6 w-[90%]">
                      <Text className="text-lg font-semibold mb-4">Select Color</Text>
                      
                      <ColorPicker 
                        value={selectedColor} 
                        onComplete={onColorSelect}
                      >
                        <Panel1 />
                        <HueSlider />
                      </ColorPicker>

                      <View className="flex-row items-center justify-between mt-4 mb-4">
                        <Text className="text-sm text-gray-600">Selected:</Text>
                        <View className="flex-row items-center">
                          <View 
                            className="w-8 h-8 rounded border border-gray-300 mr-2"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <Text className="text-sm font-mono">{selectedColor}</Text>
                        </View>
                      </View>

                      <View className="flex-row">
                        <Pressable 
                          onPress={() => setShowColorPicker(false)}
                          className="flex-1 py-3 border border-gray-300 rounded-lg mr-2"
                        >
                          <Text className="text-center text-gray-700 font-medium">Cancel</Text>
                        </Pressable>
                        <Pressable 
                          onPress={addColor}
                          className="flex-1 py-3 bg-green-600 rounded-lg ml-2"
                        >
                          <Text className="text-center text-white font-medium">Add Color</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>
              )}
            </>
            )}
            </View>

            
            <Text className="text-sm text-gray-900 mb-2">
              Product Description <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={productDescription}
              onChangeText={(text) => {
                setProductDescription(text);
                clearError('productDescription');
              }}
              className={`border ${errors.productDescription ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 mb-1`}
              placeholder="Enter brief description for this item"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.productDescription ? (
              <Text className="text-red-500 text-xs mb-3">{errors.productDescription}</Text>
            ) : (
              <View className="mb-3" />
            )}

           
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <MaterialIcons name="star-outline" size={20} color="#6b7280" />
                <Text className="text-base font-medium text-gray-900 ml-2">Product Features</Text>
              </View>

              <View className="flex-row items-center mb-3">
                <TextInput
                  value={currentFeature}
                  onChangeText={setCurrentFeature}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 mr-2"
                  placeholder="Add a feature..."
                  placeholderTextColor="#9ca3af"
                  onSubmitEditing={addFeature}
                />
                <Pressable 
                  onPress={addFeature}
                  className="bg-green-600 rounded-full w-10 h-10 items-center justify-center"
                >
                  <MaterialIcons name="add" size={24} color="#fff" />
                </Pressable>
              </View>

              {features.length === 0 ? (
                <Text className="text-xs text-gray-400 italic">
                  No features added yet. Add features to highlight what makes your product special.
                </Text>
              ) : (
                <View>
                  {features.map((feature, index) => (
                    <View 
                      key={index} 
                      className="flex-row items-center justify-between bg-gray-50 rounded-lg px-4 py-3 mb-2"
                    >
                      <Text className="flex-1 text-gray-900">{feature}</Text>
                      <Pressable onPress={() => removeFeature(index)}>
                        <MaterialIcons name="close" size={20} color="#6b7280" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="h-8" />
          </ScrollView>

          <View className="flex-row items-center px-4 py-4 border-t border-gray-200 mb-5">
            <Pressable 
              onPress={onClose}
              className="flex-1 py-4 items-center justify-center rounded-xl border border-gray-300 mr-3"
              disabled={loading}
            >
              <Text className="text-gray-900 font-medium text-base">Cancel</Text>
            </Pressable>

            <Pressable 
              onPress={handleSave}
              className={`flex-1 py-4 items-center justify-center rounded-xl ${
                loading ? 'bg-blue-400' : 'bg-blue-600'
              }`}
              disabled={loading}
            >
              {loading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#fff" />
                  <Text className="text-white font-medium text-base ml-2">
                    {mode === 'edit' ? 'Updating...' : 'Creating...'}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <MaterialIcons name="auto-awesome" size={20} color="#fff" />
                  <Text className="text-white font-medium text-base ml-2">
                    {mode === 'edit' ? 'Update Product' : 'Create Product'}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
        </KeyboardScreen>
      </SafeAreaView>
    </Modal>
  );
}